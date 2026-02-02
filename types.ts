
export interface WordData {
  word: string;
  phonetic: string;
  definitionCN: string;
  definitionEN: string;
  exampleSentence: string;
  exampleTranslation: string;
  mnemonics: string;
  collocations: string[];
  confusingWordsSnippet?: string;
}

export interface ClozeItem {
  id: number;
  word: string;
  display: string;
  prefix: string;
  suffix: string;
  contextBefore: string;
  contextAfter: string;
  userAnswer: string;
  isCorrect?: boolean;
}

export interface ClozeExerciseData {
  title: string;
  content: string;
  segments: (string | ClozeItem)[];
}

export interface MCQQuestion {
  question: string;
  options: string[];
  answer: string;
  analysis: string;
}

export interface MCQData {
  questions: MCQQuestion[];
}

export interface ClozeTestBlank {
  id: number;
  options: string[];
  answer: string;
  analysis: string;
}

export interface ClozeTestData {
  title: string;
  segments: (string | { blankId: number })[];
  blanks: Record<number, ClozeTestBlank>;
}

export interface MimicPassage {
  title: string;
  contentEN: string;
  contentCN: string;
  keywords: string[];
}

export interface MimicFeedback {
  score: number;
  fluency: string;
  accuracy: string;
  suggestions: string;
}

export type AIProvider = 'gemini' | 'openai-compatible';

export interface AISettings {
  provider: AIProvider;
  baseUrl: string;
  apiKey: string;
  modelName: string;
  presetName?: string;
}

export enum AppView {
  LANDING = 'LANDING',
  VOCABULARY = 'VOCABULARY',
  CLOZE = 'CLOZE',
  NEW_WORDS = 'NEW_WORDS',
  CONFUSING_DETAIL = 'CONFUSING_DETAIL',
  MCQ = 'MCQ',
  CLOZE_TEST = 'CLOZE_TEST',
  MIMIC = 'MIMIC',
  SETTINGS = 'SETTINGS'
}

export const AI_PRESETS: Record<string, Partial<AISettings>> = {
  'DeepSeek (中国)': {
    provider: 'openai-compatible',
    baseUrl: 'https://api.deepseek.com',
    modelName: 'deepseek-chat'
  },
  'Moonshot Kimi (中国)': {
    provider: 'openai-compatible',
    baseUrl: 'https://api.moonshot.cn/v1',
    modelName: 'moonshot-v1-8k'
  },
  '通义千问 Qwen (中国)': {
    provider: 'openai-compatible',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    modelName: 'qwen-turbo'
  },
  '智谱 GLM (中国)': {
    provider: 'openai-compatible',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4/',
    modelName: 'glm-4'
  },
  'Google Gemini (原生)': {
    provider: 'gemini',
    baseUrl: '',
    modelName: 'gemini-3-flash-preview'
  },
  'OpenAI GPT-4o': {
    provider: 'openai-compatible',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o'
  },
  'Groq (极速推理)': {
    provider: 'openai-compatible',
    baseUrl: 'https://api.groq.com/openai/v1',
    modelName: 'llama-3.1-70b-versatile'
  },
  '自定义代理/其他': {
    provider: 'openai-compatible',
    baseUrl: '',
    modelName: ''
  }
};
