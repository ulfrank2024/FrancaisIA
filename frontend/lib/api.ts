const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  // Clerk expose le token via window.Clerk après initialisation
  try {
    // @ts-ignore
    return await window.Clerk?.session?.getToken() ?? null;
  } catch {
    return null;
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const authToken = token ?? await getClerkToken();
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...options.headers,
    },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur réseau');
  return data;
}

export const api = {
  questions: {
    list: (params?: { section?: string; level?: string; limit?: number }, token?: string) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ questions: Question[]; total: number }>(`/api/questions${q ? `?${q}` : ''}`, {}, token);
    },
    mockExam: (token?: string) =>
      request<{ exam: Record<string, Question[]>; totalQuestions: number }>('/api/questions/mock-exam', {}, token),
  },
  ai: {
    correct: (body: { text: string; section: string; prompt?: string }, token?: string) =>
      request<CorrectionResult>('/api/ai/correct', { method: 'POST', body: JSON.stringify(body) }, token),
    explain: (topic: string, token?: string) =>
      request<{ explanation: string }>('/api/ai/explain', { method: 'POST', body: JSON.stringify({ topic }) }, token),
    chatStream: async (messages: ChatMessage[], onChunk: (text: string) => void, token?: string) => {
      const authToken = token ?? await getClerkToken();
      const res = await fetch(`${BASE}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages }),
      });
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) return;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ')) {
            const payload = line.slice(6);
            if (payload === '[DONE]') return;
            try { const { text } = JSON.parse(payload); if (text) onChunk(text); } catch {}
          }
        }
      }
    },
  },
  progress: {
    save: (body: ProgressResult, token?: string) =>
      request<{ resultId: string }>('/api/progress/results', { method: 'POST', body: JSON.stringify(body) }, token),
    dashboard: (userId: string, token?: string) =>
      request<DashboardData>(`/api/progress/dashboard/${userId}`, {}, token),
    history: (userId: string, token?: string) =>
      request<{ history: HistoryItem[] }>(`/api/progress/history/${userId}`, {}, token),
  },
};

export type Question = {
  id: string; section: string; level: string; question: string;
  options?: Record<string, string> | null; answer?: string | null;
  explanation?: string; audioUrl?: string;
};
export type CorrectionResult = {
  score: number; strengths: string[];
  errors: { text: string; correction: string; rule: string }[];
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
  correct: number; durationS: number; createdAt: string;
};
