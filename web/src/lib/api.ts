const BASE = '';

// Mock mode for demo
const DEMO_MODE = true;

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  if (DEMO_MODE) {
    // Return mock data for demo
    return mockRequest(path, options) as T;
  }

  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${BASE}${path}`, { ...options, headers: { ...headers, ...options?.headers } });

  if (res.status === 401) {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
    throw new Error('Unauthorized');
  }

  const data = await res.json();
  if (!res.ok) throw new Error((data as any).error || 'Request failed');
  return data as T;
}

// Mock responses for demo
function mockRequest(path: string, options?: RequestInit): any {
  console.log('Mock request:', path, options?.method || 'GET');

  if (path === '/auth/register' || path === '/auth/login') {
    return {
      token: 'demo-token-' + Date.now(),
      user: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: '演示用户',
        balance: 10,
        free_credits: 3,
        plan: 'free',
      },
    };
  }

  if (path === '/auth/me') {
    return {
      user: {
        id: 'demo-user',
        email: 'demo@example.com',
        name: '演示用户',
        balance: 10,
        free_credits: 3,
        plan: 'free',
      },
    };
  }

  if (path === '/video/voices') {
    return {
      voices: [
        { id: 'male-qn-qingse', name: '青涩男声', gender: 'male', style: '年轻清新' },
        { id: 'female-shaonv', name: '少女音', gender: 'female', style: '甜美活泼' },
      ],
    };
  }

  if (path === '/video/script') {
    return {
      script: '大家好，今天给大家分享5个提升工作效率的方法。\n\n第一，使用番茄工作法，25分钟专注工作，5分钟休息。\n\n第二，每天早上列出3件最重要的事，优先完成。\n\n第三，关闭所有通知，减少干扰。\n\n第四，学会说不，拒绝不重要的事情。\n\n第五，定期复盘，总结经验教训。\n\n以上就是今天的分享，记得点赞关注哦！',
    };
  }

  if (path === '/video/tasks' && options?.method === 'POST') {
    return { taskId: 'demo-task-' + Date.now(), status: 'draft' };
  }

  if (path.includes('/video/tasks/') && path.includes('/generate-audio')) {
    return {
      status: 'audio_ready',
      audioUrl: '/demo-audio.mp3',
      subtitleUrl: '/demo-subtitle.vtt',
      durationSec: 45,
    };
  }

  if (path.includes('/video/tasks/') && !path.includes('/')) {
    return {
      task: {
        id: 'demo-task',
        title: '演示视频',
        topic: '5个提升效率的方法',
        script: '演示脚本内容...',
        status: 'completed',
        video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
        duration_sec: 45,
        created_at: new Date().toISOString(),
      },
    };
  }

  if (path === '/video/tasks') {
    return {
      tasks: [
        {
          id: 'demo-1',
          title: '演示视频 1',
          topic: '测试选题',
          status: 'completed',
          video_url: 'https://www.w3schools.com/html/mov_bbb.mp4',
          duration_sec: 30,
          created_at: new Date().toISOString(),
        },
      ],
    };
  }

  return {};
}

// Auth
export const api = {
  register: (email: string, password: string, name?: string) =>
    request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  getMe: () => request<{ user: User }>('/auth/me'),

  // Video
  getVoices: () => request<{ voices: Voice[] }>('/video/voices'),

  generateScript: (topic: string, style?: string, duration?: string) =>
    request<{ script: string }>('/video/script', {
      method: 'POST',
      body: JSON.stringify({ topic, style, duration }),
    }),

  createTask: (data: { topic: string; script: string; voiceId?: string; title?: string }) =>
    request<{ taskId: string }>('/video/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  generateAudio: (taskId: string) =>
    request<{ status: string; audioUrl: string; subtitleUrl: string; durationSec: number }>(
      `/video/tasks/${taskId}/generate-audio`,
      { method: 'POST' }
    ),

  composeVideo: (taskId: string, options?: { resolution?: string; backgroundColor?: string }) =>
    request<{ status: string }>(`/video/tasks/${taskId}/compose`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    }),

  getTask: (taskId: string) => request<{ task: VideoTask }>(`/video/tasks/${taskId}`),

  listTasks: (limit = 20, offset = 0) =>
    request<{ tasks: VideoTask[] }>(`/video/tasks?limit=${limit}&offset=${offset}`),

  deleteTask: (taskId: string) =>
    request<{ success: boolean }>(`/video/tasks/${taskId}`, { method: 'DELETE' }),
};

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  balance: number;
  free_credits: number;
  plan: string;
}

export interface Voice {
  id: string;
  name: string;
  gender: 'male' | 'female';
  style: string;
}

export interface VideoTask {
  id: string;
  title: string;
  topic: string;
  script?: string;
  voice_id?: string;
  status: string;
  audio_url?: string;
  subtitle_url?: string;
  video_url?: string;
  duration_sec?: number;
  error?: string;
  created_at: string;
  updated_at: string;
}
