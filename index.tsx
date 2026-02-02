
import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { WordData, ClozeExerciseData, AppView, MCQData, ClozeTestData, ClozeTestBlank, AISettings, AIProvider, ClozeItem, AI_PRESETS, MimicPassage, MimicFeedback } from './types';
import { 
  generateVocabularyWord, generateVocabularyImage, generateClozeExercise, 
  generateConfusingDetail, generateMultipleChoice, generateClozeTest, 
  getAISettings, generateMimicPassage, playPassageTTS, evaluateMimic 
} from './services/geminiService';

// --- Settings View ---
const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const [settings, setSettings] = useState<AISettings>(getAISettings());

  const handlePresetChange = (name: string) => {
    const preset = AI_PRESETS[name];
    if (preset) {
      setSettings({
        ...settings,
        ...preset,
        presetName: name,
      });
    }
  };

  const save = () => {
    if (!settings.apiKey) {
      alert('请填写 API Key');
      return;
    }
    localStorage.setItem('ai_settings', JSON.stringify(settings));
    alert('设置已保存');
    onBack();
    window.location.reload();
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white flex flex-col">
      <NavBar title="AI 服务设置" onBack={onBack} />
      <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar pb-32">
        <section>
          <label className="block text-sm font-bold text-gray-700 mb-2">快速配置预设</label>
          <select 
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 transition-all"
            value={settings.presetName}
            onChange={e => handlePresetChange(e.target.value)}
          >
            {Object.keys(AI_PRESETS).map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-400">选择预设后将自动填充地址和模型名称。</p>
        </section>

        <div className="h-px bg-slate-100 my-2"></div>

        <section>
          <label className="block text-sm font-bold text-gray-700 mb-2">API Key <span className="text-rose-500">*</span></label>
          <input 
            type="password"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 transition-all"
            placeholder="请输入您的 API Key"
            value={settings.apiKey}
            onChange={e => setSettings({...settings, apiKey: e.target.value})}
          />
          <p className="mt-2 text-[10px] text-gray-400">我们不会保存您的 Key，它仅存储在您本地的浏览器中。</p>
        </section>

        <section>
          <label className="block text-sm font-bold text-gray-700 mb-2">接口地址 (Base URL)</label>
          <input 
            type="text"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 transition-all"
            placeholder="https://..."
            value={settings.baseUrl}
            onChange={e => setSettings({...settings, baseUrl: e.target.value})}
          />
        </section>

        <section>
          <label className="block text-sm font-bold text-gray-700 mb-2">模型名称 (Model ID)</label>
          <input 
            type="text"
            className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 ring-indigo-500 transition-all"
            placeholder="如: deepseek-chat"
            value={settings.modelName}
            onChange={e => setSettings({...settings, modelName: e.target.value})}
          />
        </section>
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom border-t border-slate-100">
        <button onClick={save} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl active:scale-95 transition-all">保存设置</button>
      </div>
    </div>
  );
};

// --- Selection Menu ---
const SelectionMenu = () => {
  const [selection, setSelection] = useState<string | null>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const handleSelection = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim();
      if (text && text.length > 0 && text.length < 30 && /^[a-zA-Z\s-]+$/.test(text)) {
        const range = sel!.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setPos({
          top: rect.top + window.scrollY - 50,
          left: rect.left + window.scrollX + rect.width / 2,
        });
        setSelection(text);
      } else {
        setSelection(null);
      }
    };

    document.addEventListener('mouseup', handleSelection);
    document.addEventListener('touchend', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
      document.removeEventListener('touchend', handleSelection);
    };
  }, []);

  const addToVococab = async () => {
    if (!selection) return;
    setAdding(true);
    try {
      const details = await generateVocabularyWord(selection);
      const saved = JSON.parse(localStorage.getItem('new_words') || '[]');
      if (!saved.some((w: any) => w.word.toLowerCase() === details.word.toLowerCase())) {
        saved.push(details);
        localStorage.setItem('new_words', JSON.stringify(saved));
      }
      setToast(`已添加: ${selection}`);
      setTimeout(() => setToast(null), 2000);
      window.getSelection()?.removeAllRanges();
      setSelection(null);
    } catch (e) {
      alert("添加失败，请检查 AI 配置");
    } finally {
      setAdding(false);
    }
  };

  if (toast) return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-2 rounded-full shadow-lg font-bold animate-bounce">
      {toast}
    </div>
  );

  if (!selection) return null;

  return (
    <div 
      className="fixed z-50 -translate-x-1/2 flex items-center gap-2 bg-gray-900/90 backdrop-blur-md text-white px-3 py-2 rounded-xl shadow-2xl border border-white/20 animate-in fade-in zoom-in duration-200"
      style={{ top: pos.top, left: pos.left }}
    >
      <span className="text-sm font-bold truncate max-w-[100px]">{selection}</span>
      <button 
        onClick={addToVococab}
        disabled={adding}
        className="bg-indigo-500 hover:bg-indigo-600 active:scale-90 px-3 py-1 rounded-lg text-xs font-black transition-all flex items-center gap-1"
      >
        {adding ? '处理中...' : '➕ 添加'}
      </button>
    </div>
  );
};

// --- Components ---
const Loader = ({ text = "正在加载..." }) => (
  <div className="flex flex-col justify-center items-center h-[60vh]">
    <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div>
    <p className="text-indigo-600 mt-4 font-medium animate-pulse">{text}</p>
  </div>
);

const NavBar = ({ title, onBack }: { title: string, onBack?: () => void }) => (
  <div className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
    <div className="flex items-center gap-2">
      {onBack && (
        <button onClick={onBack} className="p-2 -ml-2 text-gray-600 active:bg-gray-100 rounded-full transition-colors">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/></svg>
        </button>
      )}
      <h1 className="text-xl font-bold text-gray-900">{title}</h1>
    </div>
  </div>
);

// --- Landing ---
const Landing = ({ onSelectMode }: { onSelectMode: (mode: AppView) => void }) => {
  const settings = getAISettings();
  
  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col p-6">
      <div className="flex justify-between items-start mt-8 mb-10">
        <div>
          <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-1">天津中考英语通</h2>
          <h1 className="text-3xl font-extrabold text-gray-900">学而时习之</h1>
        </div>
        <button 
          onClick={() => onSelectMode(AppView.SETTINGS)}
          className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-500 active:scale-90 transition-all flex flex-col items-center gap-1"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
          <span className="text-[10px] font-bold">配置</span>
        </button>
      </div>

      <div className="bg-white/50 border border-indigo-50 p-4 rounded-3xl mb-6 flex items-center gap-4">
        <div className={`w-3 h-3 rounded-full ${settings.provider === 'gemini' ? 'bg-blue-400' : 'bg-emerald-400'} shadow-[0_0_8px_rgba(52,211,153,0.5)]`}></div>
        <div>
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">当前 AI 服务</p>
          <p className="text-xs font-black text-gray-700">{settings.presetName || '自定义配置'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <button onClick={() => onSelectMode(AppView.VOCABULARY)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">趣味记单词</h3><p className="text-xs text-gray-500">AI绘图联想记忆</p></div>
        </button>

        <button onClick={() => onSelectMode(AppView.MIMIC)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">模仿朗读</h3><p className="text-xs text-gray-500">人机对话 speaking 专项</p></div>
        </button>

        <button onClick={() => onSelectMode(AppView.MCQ)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">语法单选题</h3><p className="text-xs text-gray-500">基础巩固专项练习</p></div>
        </button>

        <button onClick={() => onSelectMode(AppView.CLOZE_TEST)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-purple-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">完形填空</h3><p className="text-xs text-gray-500">综合语境四选一</p></div>
        </button>

        <button onClick={() => onSelectMode(AppView.CLOZE)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center text-emerald-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">首字母填空</h3><p className="text-xs text-gray-500">天津特色必考题型</p></div>
        </button>

        <button onClick={() => onSelectMode(AppView.NEW_WORDS)} className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex items-center gap-4 active:scale-95 transition-all">
          <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-600 shrink-0"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"/></svg></div>
          <div className="text-left flex-1"><h3 className="font-bold text-gray-900">生词本</h3><p className="text-xs text-gray-500">我的错题与生词</p></div>
        </button>
      </div>
    </div>
  );
};

// --- Mimic View (模仿朗读) ---
const MimicView = ({ onBack }: { onBack: () => void }) => {
  const [passage, setPassage] = useState<MimicPassage | null>(null);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);
  const [feedback, setFeedback] = useState<MimicFeedback | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const fetchData = async () => {
    setLoading(true);
    setFeedback(null);
    try {
      const p = await generateMimicPassage();
      setPassage(p);
    } catch (e) {
      alert("加载失败，请检查 AI 配置");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const startRecording = async () => {
    setFeedback(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/pcm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          setEvaluating(true);
          try {
            const res = await evaluateMimic(passage!.contentEN, base64Audio);
            setFeedback(res);
          } catch (e) {
            alert("评分失败");
          } finally {
            setEvaluating(false);
          }
        };
      };
      mediaRecorder.start();
      setRecording(true);
    } catch (e) {
      alert("无法访问麦克风");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  if (loading) return <div className="min-h-screen bg-white"><NavBar title="模仿朗读" onBack={onBack} /><Loader text="AI 正在为你准备短文..." /></div>;
  if (!passage) return null;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col pb-32">
      <NavBar title="模仿朗读" onBack={onBack} />
      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-gray-900">{passage.title}</h2>
            <button onClick={() => playPassageTTS(passage.contentEN)} className="p-3 bg-indigo-50 text-indigo-600 rounded-full active:scale-90 transition-all">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
            </button>
          </div>
          <p className="text-lg leading-relaxed text-gray-800 font-medium mb-4">{passage.contentEN}</p>
          <p className="text-sm text-gray-400 italic mb-4">{passage.contentCN}</p>
          <div className="flex flex-wrap gap-2">
            {passage.keywords.map((k, i) => (
              <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-500 rounded-full text-xs font-bold">#{k}</span>
            ))}
          </div>
        </div>

        {evaluating && <div className="p-6 bg-white rounded-3xl border border-gray-100 text-center animate-pulse text-indigo-600 font-bold">AI 正在听你的录音并评分...</div>}

        {feedback && (
          <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-emerald-100 space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0 font-black text-2xl">{feedback.score}</div>
              <div>
                <h4 className="font-bold text-gray-900">朗读反馈</h4>
                <p className="text-xs text-gray-500">流利度: {feedback.fluency} | 准确性: {feedback.accuracy}</p>
              </div>
            </div>
            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-sm text-emerald-800 leading-relaxed italic">
              {feedback.suggestions}
            </div>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom flex gap-3">
        <button 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          className={`flex-1 py-4 rounded-2xl font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${recording ? 'bg-rose-500 text-white scale-95' : 'bg-indigo-600 text-white'}`}
        >
          {recording ? (
            <>
              <span className="w-3 h-3 bg-white rounded-full animate-ping"></span>
              松开结束录音
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
              长按开始模仿
            </>
          )}
        </button>
        <button onClick={fetchData} className="w-16 bg-white border border-gray-100 text-gray-500 rounded-2xl flex items-center justify-center shadow-sm">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
        </button>
      </div>
    </div>
  );
};

// --- Vocabulary View ---
const VocabularyView = ({ onBack, onGoConfusing }: { onBack: () => void, onGoConfusing: (w: string, s: string) => void }) => {
  const [word, setWord] = useState<WordData | null>(null);
  const [loading, setLoading] = useState(true);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const fetchWord = async () => {
    setLoading(true);
    setImageUrl(null);
    try {
      const data = await generateVocabularyWord();
      setWord(data);
    } catch (e) {
      alert("加载单词失败，请检查 AI 配置");
    } finally {
      setLoading(false);
    }
  };

  const generateImage = async () => {
    if (!word) return;
    setImageLoading(true);
    try {
      const url = await generateVocabularyImage(word.word, word.exampleSentence);
      setImageUrl(url);
    } catch (e) {
      alert("生成图片失败，该模型可能不支持图像生成");
    } finally {
      setImageLoading(false);
    }
  };

  useEffect(() => { fetchWord(); }, []);

  if (loading) return <div className="min-h-screen bg-white"><NavBar title="趣味记单词" onBack={onBack} /><Loader text="正在联想新单词..." /></div>;
  if (!word) return null;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white flex flex-col pb-24">
      <NavBar title="趣味记单词" onBack={onBack} />
      <div className="p-6 space-y-6 overflow-y-auto no-scrollbar">
        <div className="bg-indigo-50 p-8 rounded-[2.5rem] text-center border-2 border-indigo-100/50">
          <h2 className="text-4xl font-black text-indigo-600 mb-2 tracking-tight">{word.word}</h2>
          <p className="text-indigo-400 font-mono text-lg">{word.phonetic}</p>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h3 className="font-black text-xl text-gray-900">核心释义</h3>
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100">
            <p className="text-lg font-bold text-gray-800 mb-1">{word.definitionCN}</p>
            <p className="text-sm text-gray-500 leading-relaxed italic">{word.definitionEN}</p>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
              <h3 className="font-black text-xl text-gray-900">情境记忆</h3>
            </div>
            {!imageUrl && !imageLoading && (
              <button 
                onClick={generateImage}
                className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-full font-bold flex items-center gap-1 shadow-md active:scale-90 transition-transform"
              >
                ✨ AI 生图
              </button>
            )}
          </div>
          <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-3">
            <div className="min-h-[100px] flex items-center justify-center bg-white/50 rounded-2xl overflow-hidden border border-dashed border-slate-200">
              {imageLoading ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent animate-spin rounded-full"></div>
                  <span className="text-xs text-indigo-400 font-bold">AI 正在绘制联想图...</span>
                </div>
              ) : imageUrl ? (
                <img src={imageUrl} alt="word visual" className="w-full h-auto object-cover rounded-xl shadow-inner" />
              ) : (
                <div className="text-center p-4">
                  <p className="text-slate-400 text-sm">点击按钮生成联想插图</p>
                </div>
              )}
            </div>
            <p className="text-lg font-medium text-gray-800 leading-snug">{word.exampleSentence}</p>
            <p className="text-sm text-gray-500">{word.exampleTranslation}</p>
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            <h3 className="font-black text-xl text-gray-900">记忆秘诀</h3>
          </div>
          <div className="bg-indigo-50/50 p-5 rounded-3xl border border-indigo-100/30">
            <p className="text-gray-700 leading-relaxed text-sm font-medium">{word.mnemonics}</p>
          </div>
        </section>

        {word.confusingWordsSnippet && (
          <button 
            onClick={() => onGoConfusing(word.word, word.confusingWordsSnippet!)}
            className="w-full py-4 px-6 bg-amber-50 border border-amber-100 rounded-3xl flex items-center justify-between text-amber-700 active:scale-95 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🤔</span>
              <div className="text-left">
                <p className="font-bold text-sm">易混淆词辨析</p>
                <p className="text-xs opacity-70">点击查看与相似词的区别</p>
              </div>
            </div>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"/></svg>
          </button>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom flex gap-3">
        <button onClick={fetchWord} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg active:scale-95 transition-all">下一个单词</button>
      </div>
    </div>
  );
};

// --- New Words View ---
const NewWordsView = ({ onBack }: { onBack: () => void }) => {
  const [words, setWords] = useState<WordData[]>([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem('new_words') || '[]');
    setWords(saved);
  }, []);

  const clear = () => {
    if (confirm('确定清空生词本吗？')) {
      localStorage.removeItem('new_words');
      setWords([]);
    }
  };

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col">
      <NavBar title="生词本" onBack={onBack} />
      <div className="flex-1 p-6 space-y-4 overflow-y-auto no-scrollbar">
        {words.length === 0 ? (
          <div className="text-center py-20">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-gray-400 font-bold">还没有生词呢</h3>
            <p className="text-xs text-gray-300 mt-2">在阅读或单词页通过长按选择添加</p>
          </div>
        ) : (
          words.map((w, i) => (
            <div key={i} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm animate-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-black text-indigo-600">{w.word}</h3>
                <span className="text-xs font-mono text-gray-400">{w.phonetic}</span>
              </div>
              <p className="font-bold text-gray-800 mb-2">{w.definitionCN}</p>
              <p className="text-sm text-gray-500 leading-relaxed italic bg-slate-50 p-3 rounded-xl">{w.exampleSentence}</p>
            </div>
          ))
        )}
      </div>
      {words.length > 0 && (
        <div className="p-6">
          <button onClick={clear} className="w-full text-gray-400 text-sm font-bold py-3">清空所有记录</button>
        </div>
      )}
    </div>
  );
};

// --- MCQ View ---
const MCQView = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<MCQData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const fetchQuestions = async () => {
    setLoading(true);
    setShowResult(false);
    setUserAnswers({});
    try {
      const q = await generateMultipleChoice();
      setData(q);
    } catch (e) {
      alert("出题失败，请检查 AI 配置");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchQuestions(); }, []);

  if (loading) return <div className="min-h-screen bg-white"><NavBar title="语法单选题" onBack={onBack} /><Loader text="AI 正在出题中..." /></div>;
  if (!data) return null;

  const score = data.questions.filter((q, i) => userAnswers[i] === q.answer).length;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-slate-50 flex flex-col pb-24">
      <NavBar title="语法单选题" onBack={onBack} />
      <div className="p-6 space-y-8 overflow-y-auto no-scrollbar">
        {data.questions.map((q, i) => (
          <div key={i} className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-sm">{i + 1}</span>
              <p className="text-lg font-bold text-gray-900 pt-0.5">{q.question}</p>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {q.options.map((opt, optIdx) => {
                const isSelected = userAnswers[i] === opt;
                const isCorrect = opt === q.answer;
                let bgColor = "bg-slate-50 border-slate-100";
                if (showResult) {
                  if (isCorrect) bgColor = "bg-emerald-50 border-emerald-200 text-emerald-700";
                  else if (isSelected) bgColor = "bg-rose-50 border-rose-200 text-rose-700";
                } else if (isSelected) {
                  bgColor = "bg-indigo-50 border-indigo-200 text-indigo-700";
                }

                return (
                  <button 
                    key={optIdx}
                    disabled={showResult}
                    onClick={() => setUserAnswers({...userAnswers, [i]: opt})}
                    className={`text-left p-4 rounded-2xl border transition-all font-medium ${bgColor}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
            {showResult && (
              <div className="mt-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
                <p className="text-xs font-bold text-indigo-500 uppercase tracking-widest mb-1">解析</p>
                <p className="text-sm text-gray-700 leading-relaxed">{q.analysis}</p>
              </div>
            )}
          </div>
        ))}
        {showResult && (
          <div className="bg-indigo-600 text-white p-8 rounded-[2.5rem] text-center shadow-xl">
            <h4 className="text-lg opacity-80 mb-1">本次练习得分</h4>
            <p className="text-5xl font-black mb-2">{score} <span className="text-xl">/ {data.questions.length}</span></p>
            <p className="text-sm font-medium">{score === data.questions.length ? "太棒了！全对！" : "再接再厉，查漏补缺！"}</p>
          </div>
        )}
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom flex gap-3">
        {!showResult ? (
          <button 
            disabled={Object.keys(userAnswers).length < data.questions.length}
            onClick={() => setShowResult(true)} 
            className="flex-1 bg-indigo-600 disabled:bg-gray-300 text-white py-4 rounded-2xl font-bold shadow-lg transition-all"
          >
            提交并查看结果
          </button>
        ) : (
          <button onClick={fetchQuestions} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">换一批题目</button>
        )}
      </div>
    </div>
  );
};

// --- Cloze View ---
const ClozeView = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<ClozeExerciseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userInputs, setUserInputs] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const fetchCloze = async () => {
    setLoading(true);
    setShowResult(false);
    setUserInputs({});
    try {
      const d = await generateClozeExercise();
      setData(d);
    } catch (e) {
      alert("出题失败，请检查 AI 配置");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCloze(); }, []);

  if (loading) return <div className="min-h-screen bg-white"><NavBar title="首字母填空" onBack={onBack} /><Loader text="AI 正在生成文章..." /></div>;
  if (!data) return null;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white flex flex-col pb-24">
      <NavBar title="首字母填空" onBack={onBack} />
      <div className="p-8 overflow-y-auto no-scrollbar">
        <h2 className="text-2xl font-black text-gray-900 mb-8 text-center">{data.title}</h2>
        <div className="text-lg leading-[2.5] text-gray-800 tracking-wide text-justify">
          {data.segments.map((seg, i) => {
            if (typeof seg === 'string') return <span key={i}>{seg}</span>;
            const isCorrect = userInputs[seg.id]?.toLowerCase().trim() === seg.word.toLowerCase();
            return (
              <span key={i} className="inline-block mx-1">
                <input 
                  type="text"
                  disabled={showResult}
                  placeholder={seg.display}
                  className={`w-24 text-center border-b-2 outline-none transition-all font-mono font-bold
                    ${showResult ? (isCorrect ? 'text-emerald-500 border-emerald-500' : 'text-rose-500 border-rose-500') : 'text-indigo-600 border-indigo-200 focus:border-indigo-600'}
                    ${showResult && !isCorrect ? 'line-through opacity-50' : ''}`}
                  value={userInputs[seg.id] || ''}
                  onChange={e => setUserInputs({...userInputs, [seg.id]: e.target.value})}
                />
                {showResult && !isCorrect && (
                  <span className="ml-1 text-emerald-500 font-bold font-mono underline decoration-wavy">{seg.word}</span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom">
        {!showResult ? (
          <button onClick={() => setShowResult(true)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">检查答案</button>
        ) : (
          <button onClick={fetchCloze} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">下一篇练习</button>
        )}
      </div>
    </div>
  );
};

// --- Cloze Test View ---
const ClozeTestView = ({ onBack }: { onBack: () => void }) => {
  const [data, setData] = useState<ClozeTestData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userAnswers, setUserAnswers] = useState<Record<number, string>>({});
  const [showResult, setShowResult] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setShowResult(false);
    setUserAnswers({});
    try {
      const d = await generateClozeTest();
      setData(d);
    } catch (e) {
      alert("出题失败，请检查 AI 配置");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return <div className="min-h-screen bg-white"><NavBar title="完形填空" onBack={onBack} /><Loader text="AI 正在构思文章..." /></div>;
  if (!data) return null;

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white flex flex-col pb-24">
      <NavBar title="完形填空" onBack={onBack} />
      <div className="p-8 space-y-8 overflow-y-auto no-scrollbar">
        <h2 className="text-2xl font-black text-gray-900 mb-4 text-center">{data.title}</h2>
        <div className="text-lg leading-[2.2] text-gray-800 tracking-wide text-justify mb-10">
          {data.segments.map((seg, i) => {
            if (typeof seg === 'string') return <span key={i}>{seg}</span>;
            const blank = data.blanks[(seg as {blankId: number}).blankId];
            const blankId = (seg as {blankId: number}).blankId;
            const isCorrect = userAnswers[blankId] === blank.answer;
            return (
              <span key={i} className={`mx-1 inline-flex items-center justify-center min-w-[2rem] h-8 border-b-2 font-black 
                ${showResult ? (isCorrect ? 'text-emerald-500 border-emerald-500' : 'text-rose-500 border-rose-500') : 'text-indigo-600 border-indigo-200'}`}>
                ({blankId}) {userAnswers[blankId] || "___"}
              </span>
            );
          })}
        </div>

        <div className="space-y-6">
          {Object.entries(data.blanks).map(([id, b]) => {
            const blank = b as ClozeTestBlank;
            return (
              <div key={id} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <span className="w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center text-xs">{id}</span>
                  选择最佳选项:
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {blank.options.map((opt, idx) => {
                    const isSelected = userAnswers[parseInt(id)] === opt;
                    const isCorrect = opt === blank.answer;
                    let btnClass = "bg-white border-slate-200 text-gray-700";
                    if (showResult) {
                      if (isCorrect) btnClass = "bg-emerald-50 border-emerald-200 text-emerald-700";
                      else if (isSelected) btnClass = "bg-rose-50 border-rose-200 text-rose-700";
                    } else if (isSelected) {
                      btnClass = "bg-indigo-50 border-indigo-600 text-indigo-700";
                    }

                    return (
                      <button 
                        key={idx}
                        disabled={showResult}
                        onClick={() => setUserAnswers({...userAnswers, [parseInt(id)]: opt})}
                        className={`p-3 rounded-2xl border transition-all text-sm font-bold ${btnClass}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {showResult && (
                  <div className="mt-4 pt-4 border-t border-slate-200">
                    <p className="text-xs font-bold text-indigo-500 mb-1">解析</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{blank.analysis}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto p-6 bg-white/90 backdrop-blur-md safe-bottom">
        {!showResult ? (
          <button onClick={() => setShowResult(true)} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">提交结果</button>
        ) : (
          <button onClick={fetchData} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg">下一篇练习</button>
        )}
      </div>
    </div>
  );
};

// --- Confusing Detail View ---
const ConfusingDetailView = ({ word, snippet, onBack }: { word: string, snippet: string, onBack: () => void }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await generateConfusingDetail(word, snippet);
        setContent(res);
      } catch (e) {
        setContent("详情加载失败，请检查 AI 配置");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [word, snippet]);

  return (
    <div className="min-h-screen max-w-md mx-auto bg-white flex flex-col">
      <NavBar title="词义辨析" onBack={onBack} />
      <div className="flex-1 p-8 overflow-y-auto no-scrollbar">
        {loading ? (
          <Loader text="AI 正在查阅文献..." />
        ) : (
          <div className="prose prose-indigo max-w-none">
            {content.split('\n').map((line, i) => (
              <p key={i} className="mb-4 text-gray-700 leading-relaxed text-lg">{line}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// --- Main App ---
const App = () => {
  const [view, setView] = useState<AppView>(AppView.LANDING);
  const [confusingData, setConfusingData] = useState<{w: string, s: string} | null>(null);

  const handleGoConfusing = (w: string, s: string) => {
    setConfusingData({w, s});
    setView(AppView.CONFUSING_DETAIL);
  };

  return (
    <main className="min-h-screen bg-slate-100">
      <SelectionMenu />
      {view === AppView.LANDING && <Landing onSelectMode={setView} />}
      {view === AppView.SETTINGS && <SettingsView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.VOCABULARY && <VocabularyView onBack={() => setView(AppView.LANDING)} onGoConfusing={handleGoConfusing} />}
      {view === AppView.MIMIC && <MimicView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.CLOZE && <ClozeView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.MCQ && <MCQView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.CLOZE_TEST && <ClozeTestView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.NEW_WORDS && <NewWordsView onBack={() => setView(AppView.LANDING)} />}
      {view === AppView.CONFUSING_DETAIL && confusingData && <ConfusingDetailView word={confusingData.w} snippet={confusingData.s} onBack={() => setView(AppView.VOCABULARY)} />}
    </main>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
