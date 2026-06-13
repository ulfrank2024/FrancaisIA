const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function getToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}

export const api = {
  auth: {
    register: (body: { email: string; password: string; fullName: string }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/api/auth/register', {
        method: 'POST', body: JSON.stringify(body),
      }),
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; refreshToken: string; user: User }>('/api/auth/login', {
        method: 'POST', body: JSON.stringify(body),
      }),
    logout: () =>
      request('/api/auth/logout', { method: 'POST' }),
  },
  questions: {
    list: (params?: { section?: string; level?: string; limit?: number }) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ questions: Question[]; total: number }>(`/api/questions${q ? `?${q}` : ''}`);
    },
    mockExam: () =>
      request<{ exam: Record<string, Question[]>; totalQuestions: number }>('/api/questions/mock-exam'),
  },
  ai: {
    correct: (body: { text: string; section: string; prompt?: string }) =>
      request<CorrectionResult>('/api/ai/correct', { method: 'POST', body: JSON.stringify(body) }),
    explain: (topic: string) =>
      request<{ explanation: string }>('/api/ai/explain', {
        method: 'POST', body: JSON.stringify({ topic }),
      }),
    chatStream: async (messages: ChatMessage[], onChunk: (text: string) => void) => {
      const token = getToken();
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const lines = decoder.decode(value).split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') return;
            try {
              const { text } = JSON.parse(payload);
              if (text) onChunk(text);
            } catch {}
          }
        }
      }
    },
  },
  progress: {
    save: (body: ProgressResult) =>
      request<{ resultId: string }>('/api/progress/results', {
        method: 'POST', body: JSON.stringify(body),
      }),
    dashboard: (userId: string) =>
      request<DashboardData>(`/api/progress/dashboard/${userId}`),
    history: (userId: string) =>
      request<{ history: HistoryItem[] }>(`/api/progress/history/${userId}`),
  },
};

export type User = { id: string; email: string; full_name: string; level?: string };
export type Question = {
  id: string; section: string; level: string; question: string;
  options?: Record<string, string> | null; answer?: string | null;
  explanation?: string; audio_url?: string;
};
export type CorrectionResult = {
  score: number; strengths: string[]; errors: { text: string; correction: string; rule: string }[];
  correctedVersion: string; tips: string[];
};
export type ChatMessage = { role: 'user' | 'assistant'; content: string };
export type ProgressResult = {
  userId: string; section: string; score: number;
  total: number; correct: number; details?: object[]; durationSeconds?: number;
};
export type DashboardData = {
  stats: { section: string; averageScore: number | null; attempts: number }[];
  globalAverage: number | null; totalAttempts: number;
};
export type HistoryItem = {
  id: string; section: string; score: number; total: number;
  correct: number; duration_s: number; created_at: string;
};
