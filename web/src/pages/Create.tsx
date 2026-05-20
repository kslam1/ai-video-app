import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, Voice } from '../lib/api';
import { Sparkles, Mic, Play, Loader2, ChevronRight, Wand2, Edit3 } from 'lucide-react';

type Step = 'topic' | 'script' | 'voice' | 'generate';

export default function Create() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('topic');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState<'short' | 'medium' | 'long'>('medium');
  const [script, setScript] = useState('');
  const [voices, setVoices] = useState<Voice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState('male-qn-qingse');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [taskId, setTaskId] = useState('');
  const [generateStatus, setGenerateStatus] = useState('');

  useEffect(() => {
    api.getVoices().then(({ voices }) => setVoices(voices)).catch(() => {});
  }, []);

  const steps: { key: Step; label: string }[] = [
    { key: 'topic', label: '选题' },
    { key: 'script', label: '脚本' },
    { key: 'voice', label: '配音' },
    { key: 'generate', label: '生成' },
  ];

  const currentIndex = steps.findIndex((s) => s.key === step);

  // Step 1: Generate script
  const handleGenerateScript = async () => {
    if (!topic.trim()) return;
    setLoading(true);
    setError('');
    try {
      const { script: s } = await api.generateScript(topic, undefined, duration);
      setScript(s);
      setStep('script');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Create task + generate audio + compose
  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    setGenerateStatus('创建任务...');
    try {
      const { taskId: id } = await api.createTask({
        topic,
        script,
        voiceId: selectedVoice,
        title: topic.slice(0, 50),
      });
      setTaskId(id);

      setGenerateStatus('AI 配音中...');
      await api.generateAudio(id);

      setGenerateStatus('合成视频中...');
      await api.composeVideo(id, { resolution: '1080x1920' });

      navigate(`/task/${id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Step indicator */}
      <div className="flex items-center justify-center gap-2 mb-12">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition ${
                i < currentIndex ? 'step-done' : i === currentIndex ? 'step-active' : 'step-pending'
              }`}
            >
              {i < currentIndex ? '✓' : i + 1}
            </div>
            <span className={`ml-2 text-sm hidden sm:inline ${i === currentIndex ? 'text-white' : 'text-dark-500'}`}>
              {s.label}
            </span>
            {i < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-dark-600 mx-3" />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      {/* Step 1: Topic */}
      {step === 'topic' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">你想做什么视频？</h1>
            <p className="text-dark-400">输入选题或关键词，AI 帮你写脚本</p>
          </div>

          <textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="例如：5 个提升工作效率的方法&#10;例如：为什么年轻人开始喜欢逛菜市场&#10;例如：粘贴一段你想改编的文章..."
            rows={5}
            className="w-full bg-dark-800 border border-dark-600 rounded-xl px-5 py-4 text-white placeholder:text-dark-500 focus:outline-none focus:border-primary-500 transition resize-none text-lg"
          />

          <div>
            <label className="block text-sm text-dark-400 mb-3">视频时长</label>
            <div className="flex gap-3">
              {[
                { value: 'short' as const, label: '短 (30-60秒)', desc: '适合抖音' },
                { value: 'medium' as const, label: '中 (1-2分钟)', desc: '适合小红书' },
                { value: 'long' as const, label: '长 (2-3分钟)', desc: '适合B站' },
              ].map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDuration(d.value)}
                  className={`flex-1 p-4 rounded-xl border text-left transition ${
                    duration === d.value
                      ? 'border-primary-500 bg-primary-500/10'
                      : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                  }`}
                >
                  <div className="font-medium text-sm">{d.label}</div>
                  <div className="text-dark-500 text-xs mt-1">{d.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleGenerateScript}
            disabled={!topic.trim() || loading}
            className="w-full bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 text-white py-4 rounded-xl font-medium text-lg transition flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> AI 正在写脚本...</>
            ) : (
              <><Wand2 className="w-5 h-5" /> 生成脚本</>
            )}
          </button>

          {/* Quick templates */}
          <div>
            <div className="text-sm text-dark-500 mb-3">热门选题参考：</div>
            <div className="flex flex-wrap gap-2">
              {[
                '月薪 3 万和月薪 3 千的人差距在哪',
                '30 岁前一定要明白的 5 件事',
                '为什么建议你每天早起一小时',
                '一个人在家怎么做出好吃的意面',
                'iPhone 隐藏功能大揭秘',
              ].map((t) => (
                <button
                  key={t}
                  onClick={() => setTopic(t)}
                  className="text-sm bg-dark-800 text-dark-300 hover:text-white px-3 py-1.5 rounded-lg border border-dark-700 hover:border-dark-500 transition"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Script editing */}
      {step === 'script' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">编辑脚本</h1>
            <p className="text-dark-400">AI 已生成脚本，你可以直接用或修改</p>
          </div>

          <div className="relative">
            <textarea
              value={script}
              onChange={(e) => setScript(e.target.value)}
              rows={12}
              className="w-full bg-dark-800 border border-dark-600 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-primary-500 transition resize-none leading-relaxed"
            />
            <div className="absolute bottom-3 right-3 text-dark-500 text-xs">
              {script.length} 字 · 约 {Math.round(script.length / 4)} 秒
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('topic')}
              className="px-6 py-3 border border-dark-600 rounded-xl text-dark-300 hover:text-white transition"
            >
              返回修改选题
            </button>
            <button
              onClick={handleGenerateScript}
              disabled={loading}
              className="px-6 py-3 border border-dark-600 rounded-xl text-dark-300 hover:text-white transition flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              重新生成
            </button>
            <button
              onClick={() => setStep('voice')}
              disabled={!script.trim()}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 text-white py-3 rounded-xl font-medium transition"
            >
              下一步：选择配音
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Voice selection */}
      {step === 'voice' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">选择配音风格</h1>
            <p className="text-dark-400">选一个适合你视频内容的声音</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {voices.map((v) => (
              <button
                key={v.id}
                onClick={() => setSelectedVoice(v.id)}
                className={`p-5 rounded-xl border text-left transition ${
                  selectedVoice === v.id
                    ? 'border-primary-500 bg-primary-500/10'
                    : 'border-dark-600 bg-dark-800 hover:border-dark-500'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">{v.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    v.gender === 'male' ? 'bg-blue-500/20 text-blue-400' : 'bg-pink-500/20 text-pink-400'
                  }`}>
                    {v.gender === 'male' ? '男' : '女'}
                  </span>
                </div>
                <div className="text-dark-400 text-sm">{v.style}</div>
              </button>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('script')}
              className="px-6 py-3 border border-dark-600 rounded-xl text-dark-300 hover:text-white transition"
            >
              返回编辑
            </button>
            <button
              onClick={() => setStep('generate')}
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium transition"
            >
              下一步：生成视频
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Generate */}
      {step === 'generate' && (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2">确认生成</h1>
            <p className="text-dark-400">检查以下信息，确认无误后开始生成</p>
          </div>

          <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
            <div className="p-5">
              <div className="text-dark-400 text-sm mb-1">选题</div>
              <div className="font-medium">{topic}</div>
            </div>
            <div className="p-5">
              <div className="text-dark-400 text-sm mb-1">脚本（{script.length} 字）</div>
              <div className="text-dark-300 text-sm line-clamp-3">{script}</div>
            </div>
            <div className="p-5">
              <div className="text-dark-400 text-sm mb-1">配音</div>
              <div className="font-medium">{voices.find((v) => v.id === selectedVoice)?.name || selectedVoice}</div>
            </div>
            <div className="p-5">
              <div className="text-dark-400 text-sm mb-1">视频格式</div>
              <div className="font-medium">竖屏 1080×1920（适合抖音/小红书）</div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setStep('voice')}
              disabled={loading}
              className="px-6 py-3 border border-dark-600 rounded-xl text-dark-300 hover:text-white transition"
            >
              返回
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-dark-600 text-white py-4 rounded-xl font-medium text-lg transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> {generateStatus}</>
              ) : (
                <><Sparkles className="w-5 h-5" /> 开始生成</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
