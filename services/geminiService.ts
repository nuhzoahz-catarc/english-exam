
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { WordData, ClozeExerciseData, ClozeItem, MCQData, ClozeTestData, AISettings, MimicPassage, MimicFeedback } from "../types";

export const getAISettings = (): AISettings => {
  const saved = localStorage.getItem('ai_settings');
  if (saved) return JSON.parse(saved);
  return {
    provider: 'gemini',
    baseUrl: '',
    apiKey: '',
    modelName: 'gemini-3-flash-preview',
    presetName: 'Google Gemini (原生)'
  };
};

// 获取有效的 API Key (优先用户设置，其次环境变量)
const getEffectiveApiKey = (config: AISettings): string => {
  const key = config.apiKey || process.env.API_KEY;
  if (!key) {
    throw new Error("API Key 未配置。请在设置页面右上角输入您的 API Key。");
  }
  return key;
};

// Helper for decoding base64 audio
function decode(base64: string) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}

const requestAI = async (params: { 
  prompt: string, 
  responseMimeType?: string,
  responseSchema?: any 
}) => {
  const config = getAISettings();

  if (config.provider === 'gemini') {
    const apiKey = getEffectiveApiKey(config);
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: config.modelName || 'gemini-3-flash-preview',
      contents: params.prompt,
      config: {
        responseMimeType: params.responseMimeType as any,
        responseSchema: params.responseSchema
      }
    });
    return response.text;
  } 

  // For OpenAI compatible providers
  const apiKey = getEffectiveApiKey(config);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`
  };

  let finalPrompt = params.prompt;
  if (params.responseMimeType === 'application/json' && !finalPrompt.toLowerCase().includes('json')) {
    finalPrompt += " (Please output strictly in valid JSON format)";
  }

  const body: any = {
    model: config.modelName,
    messages: [{ role: 'user', content: finalPrompt }],
    temperature: 0.7
  };

  if (params.responseMimeType === 'application/json') {
    body.response_format = { type: 'json_object' };
  }

  const baseUrl = config.baseUrl ? config.baseUrl.replace(/\/$/, '') : 'https://api.openai.com/v1';
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`AI 请求失败 (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
};

export const generateVocabularyWord = async (specificWord?: string): Promise<WordData> => {
  const prompt = specificWord 
    ? `Generate detailed dictionary info for the specific English word: "${specificWord}". Suitable for Chinese middle school students. Return JSON.`
    : "Generate a random English vocabulary word suitable for a Chinese student preparing for the Tianjin Zhongkao. Return JSON.";

  const text = await requestAI({
    prompt,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        word: { type: Type.STRING },
        phonetic: { type: Type.STRING },
        definitionCN: { type: Type.STRING },
        definitionEN: { type: Type.STRING },
        exampleSentence: { type: Type.STRING },
        exampleTranslation: { type: Type.STRING },
        mnemonics: { type: Type.STRING },
        collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
        confusingWordsSnippet: { type: Type.STRING },
      },
      required: ["word", "phonetic", "definitionCN", "definitionEN", "exampleSentence", "exampleTranslation", "mnemonics", "collocations", "confusingWordsSnippet"],
    }
  });
  return JSON.parse(text.trim()) as WordData;
};

export const generateConfusingDetail = async (word: string, snippet: string): Promise<string> => {
  const text = await requestAI({
    prompt: `Compare "${word}" based on: "${snippet}". Use Markdown. Language: Chinese.`
  });
  return text || "无法加载详情";
};

export const generateVocabularyImage = async (word: string, sentence: string): Promise<string | null> => {
  const config = getAISettings();
  if (config.provider !== 'gemini') return null;
  
  try {
    const apiKey = getEffectiveApiKey(config);
    const ai = new GoogleGenAI({ apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: [{ text: `Cute vector educational illustration for "${word}". Context: ${sentence}.` }] },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
    }
    return null;
  } catch (e) { return null; }
};

export const generateMultipleChoice = async (): Promise<MCQData> => {
  const text = await requestAI({
    prompt: "Generate 5 English multiple choice questions for Tianjin Zhongkao students. Return JSON.",
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING },
              analysis: { type: Type.STRING }
            },
            required: ["question", "options", "answer", "analysis"]
          }
        }
      },
      required: ["questions"]
    }
  });
  return JSON.parse(text.trim()) as MCQData;
};

export const generateClozeTest = async (): Promise<ClozeTestData> => {
  const text = await requestAI({
    prompt: `Generate a 10-blank English cloze test for Tianjin Zhongkao. Return JSON.`,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        passage: { type: Type.STRING },
        blanks: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.INTEGER },
              options: { type: Type.ARRAY, items: { type: Type.STRING } },
              answer: { type: Type.STRING },
              analysis: { type: Type.STRING }
            },
            required: ["id", "options", "answer", "analysis"]
          }
        }
      },
      required: ["title", "passage", "blanks"]
    }
  });

  const raw = JSON.parse(text.trim());
  const segments: (string | { blankId: number })[] = [];
  const regex = /\{\{(\d+)\}\}/g;
  let lastIndex = 0, match;
  while ((match = regex.exec(raw.passage)) !== null) {
    if (match.index > lastIndex) segments.push(raw.passage.substring(lastIndex, match.index));
    segments.push({ blankId: parseInt(match[1]) });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.passage.length) segments.push(raw.passage.substring(lastIndex));

  const blanksRecord: Record<number, any> = {};
  raw.blanks.forEach((b: any) => { blanksRecord[b.id] = b; });
  return { title: raw.title, segments, blanks: blanksRecord };
};

export const generateClozeExercise = async (): Promise<ClozeExerciseData> => {
  const text = await requestAI({
    prompt: `Generate a short English passage for Tianjin Zhongkao "First Letter Fill in the Blanks". Return JSON.`,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        taggedContent: { type: Type.STRING }
      },
      required: ["title", "taggedContent"]
    }
  });
  const rawData = JSON.parse(text.trim());
  return parseClozeContent(rawData.title, rawData.taggedContent);
};

const parseClozeContent = (title: string, taggedContent: string): ClozeExerciseData => {
  const segments: (string | ClozeItem)[] = [];
  const regex = /\[\[([a-zA-Z]+)\]\]/g;
  let lastIndex = 0, match, idCounter = 1;
  while ((match = regex.exec(taggedContent)) !== null) {
    if (match.index > lastIndex) segments.push(taggedContent.substring(lastIndex, match.index));
    const fullWord = match[1];
    segments.push({
      id: idCounter++, word: fullWord, display: fullWord.charAt(0) + "_".repeat(fullWord.length - 1),
      prefix: fullWord.charAt(0), suffix: fullWord.slice(1),
      contextBefore: "", contextAfter: "", userAnswer: ""
    });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < taggedContent.length) segments.push(taggedContent.substring(lastIndex));
  return { title, content: taggedContent.replace(/\[\[|\]\]/g, ""), segments };
};

export const generateMimicPassage = async (): Promise<MimicPassage> => {
  const text = await requestAI({
    prompt: `Generate an English passage for "Mimicking/Reading Aloud" (80-100 words). Topic: School life, travel, or festivals. Suitable for Tianjin Zhongkao. Return JSON.`,
    responseMimeType: "application/json",
    responseSchema: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        contentEN: { type: Type.STRING },
        contentCN: { type: Type.STRING },
        keywords: { type: Type.ARRAY, items: { type: Type.STRING } }
      },
      required: ["title", "contentEN", "contentCN", "keywords"]
    }
  });
  return JSON.parse(text.trim()) as MimicPassage;
};

export const playPassageTTS = async (text: string) => {
  const config = getAISettings();
  const apiKey = getEffectiveApiKey(config);
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: `Say clearly: ${text}` }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
      },
    },
  });
  const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (base64Audio) {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
    const audioBuffer = await decodeAudioData(decode(base64Audio), ctx, 24000, 1);
    const source = ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(ctx.destination);
    source.start();
  }
};

export const evaluateMimic = async (passage: string, audioBase64: string): Promise<MimicFeedback> => {
  const config = getAISettings();
  const apiKey = getEffectiveApiKey(config);
  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: {
      parts: [
        { text: `Evaluate the user's reading of this passage: "${passage}". Compare the audio with the text. Provide score (0-100), fluency, accuracy, and suggestions in Chinese. Return JSON.` },
        { inlineData: { data: audioBase64, mimeType: 'audio/pcm;rate=16000' } }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          fluency: { type: Type.STRING },
          accuracy: { type: Type.STRING },
          suggestions: { type: Type.STRING }
        },
        required: ["score", "fluency", "accuracy", "suggestions"]
      }
    }
  });
  return JSON.parse(response.text.trim()) as MimicFeedback;
};
