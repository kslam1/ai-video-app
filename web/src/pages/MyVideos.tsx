import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, VideoTask } from '../lib/api';
import { Plus, Video, Loader2, Trash2, Clock, CheckCircle2, XCircle } from 'lucide-react';

export default function MyVideos() {
  const [tasks, setTasks] = useState<VideoTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const { tasks } = await api.listTasks();
      setTasks(tasks);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确认删除这条视频？')) return;
    await api.deleteTask(id);
    setTasks(tasks.filter((t) => t.id !== id));
  };

  const statusMap: Record<string, { label: string; color: string; icon: any }> = {
    draft: { label: '草稿', color: 'text-dark-400', icon: Clock },
    generating_audio: { label: '配音中', color: 'text-yellow-400', icon: Loader2 },
    audio_ready: { label: '待合成', color: 'text-blue-400', icon: Clock },
    composing: { label: '合成中', color: 'text-yellow-400', icon: Loader2 },
    completed: { label: '已完成', color: 'text-green-400', icon: CheckCircle2 },
    failed: { label: '失败', color: 'text-red-400', icon: XCircle },
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">我的视频</h1>
        <Link
          to="/create"
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition"
        >
          <Plus className="w-4 h-4" /> 创建新视频
        </Link>
      </div>

      {tasks.length === 0 ? (
        <div className="text-center py-20">
          <Video className="w-16 h-16 text-dark-600 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-dark-400 mb-2">还没有视频</h2>
          <p className="text-dark-500 mb-6">创建你的第一条 AI 短视频吧</p>
          <Link to="/create" className="bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg inline-flex items-center gap-2 transition">
            <Plus className="w-4 h-4" /> 立即创建
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const st = statusMap[task.status] || statusMap.draft;
            const Icon = st.icon;
            return (
              <Link
                key={task.id}
                to={`/task/${task.id}`}
                className="block bg-dark-800 border border-dark-700 hover:border-dark-600 rounded-xl p-5 transition"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{task.title || '未命名视频'}</h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-dark-400">
                      <span className={`flex items-center gap-1 ${st.color}`}>
                        <Icon className={`w-3.5 h-3.5 ${task.status.includes('ing') ? 'animate-spin' : ''}`} />
                        {st.label}
                      </span>
                      {task.duration_sec && <span>{Math.round(task.duration_sec)}秒</span>}
                      <span>{new Date(task.created_at).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.preventDefault(); handleDelete(task.id); }}
                    className="text-dark-500 hover:text-red-400 p-2 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
