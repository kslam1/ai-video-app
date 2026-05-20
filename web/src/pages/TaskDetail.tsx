import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api, VideoTask } from '../lib/api';
import { Loader2, Download, ArrowLeft, RefreshCw, Play } from 'lucide-react';

export default function TaskDetail() {
  const { id } = useParams<{ id: string }>();
  const [task, setTask] = useState<VideoTask | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTask();
    // Poll if task is processing
    const interval = setInterval(() => {
      if (task && ['generating_audio', 'composing'].includes(task.status)) {
        loadTask();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [id, task?.status]);

  const loadTask = async () => {
    if (!id) return;
    try {
      const { task: t } = await api.getTask(id);
      setTask(t);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-dark-400">任务不存在</h2>
        <Link to="/my-videos" className="text-primary-400 mt-4 inline-block">返回我的视频</Link>
      </div>
    );
  }

  const isProcessing = ['generating_audio', 'composing'].includes(task.status);

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link to="/my-videos" className="text-dark-400 hover:text-white transition">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold flex-1 truncate">{task.title || '未命名视频'}</h1>
        {isProcessing && (
          <div className="flex items-center gap-2 text-yellow-400 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            处理中...
          </div>
        )}
      </div>

      {/* Status */}
      {task.status === 'failed' && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-5 py-4 rounded-xl mb-6">
          <div className="font-medium mb-1">生成失败</div>
          <div className="text-sm opacity-80">{task.error || '未知错误'}</div>
        </div>
      )}

      {/* Video preview */}
      {task.video_url && (
        <div className="mb-8">
          <div className="bg-dark-800 rounded-2xl overflow-hidden border border-dark-700">
            <video
              src={task.video_url}
              controls
              className="w-full max-h-[500px]"
              poster=""
            />
          </div>
          <div className="flex gap-3 mt-4">
            <a
              href={task.video_url}
              download
              className="flex-1 bg-primary-600 hover:bg-primary-700 text-white py-3 rounded-xl font-medium text-center flex items-center justify-center gap-2 transition"
            >
              <Download className="w-5 h-5" /> 下载视频
            </a>
          </div>
        </div>
      )}

      {/* Audio preview (if no video yet) */}
      {task.audio_url && !task.video_url && (
        <div className="mb-8 bg-dark-800 rounded-xl border border-dark-700 p-5">
          <div className="text-sm text-dark-400 mb-3">配音预览</div>
          <audio src={task.audio_url} controls className="w-full" />
          {task.duration_sec && (
            <div className="text-dark-500 text-sm mt-2">时长：{Math.round(task.duration_sec)} 秒</div>
          )}
        </div>
      )}

      {/* Processing animation */}
      {isProcessing && (
        <div className="bg-dark-800 rounded-xl border border-dark-700 p-10 text-center mb-8">
          <div className="relative w-20 h-20 mx-auto mb-6">
            <div className="absolute inset-0 rounded-full border-4 border-dark-600"></div>
            <div className="absolute inset-0 rounded-full border-4 border-primary-500 border-t-transparent animate-spin"></div>
            <Play className="absolute inset-0 m-auto w-8 h-8 text-primary-400" />
          </div>
          <h3 className="font-bold text-lg mb-2">
            {task.status === 'generating_audio' ? 'AI 配音中...' : '视频合成中...'}
          </h3>
          <p className="text-dark-400 text-sm">通常需要 30-60 秒，请耐心等待</p>
          <button onClick={loadTask} className="mt-4 text-primary-400 text-sm flex items-center gap-1 mx-auto hover:text-primary-300">
            <RefreshCw className="w-3.5 h-3.5" /> 刷新状态
          </button>
        </div>
      )}

      {/* Task info */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 divide-y divide-dark-700">
        <div className="p-5">
          <div className="text-dark-400 text-sm mb-1">选题</div>
          <div>{task.topic}</div>
        </div>
        {task.script && (
          <div className="p-5">
            <div className="text-dark-400 text-sm mb-2">脚本</div>
            <div className="text-dark-300 text-sm whitespace-pre-wrap leading-relaxed">
              {task.script}
            </div>
          </div>
        )}
        <div className="p-5 flex items-center justify-between">
          <div className="text-dark-400 text-sm">创建时间</div>
          <div className="text-sm">{new Date(task.created_at).toLocaleString('zh-CN')}</div>
        </div>
      </div>
    </div>
  );
}
