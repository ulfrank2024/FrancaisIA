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
    session: (params: { section: 'EE' | 'EO'; level?: string }, token?: string) => {
      const q = new URLSearchParams(params as Record<string, string>).toString();
      return request<{ session: EpreuvSession }>(`/api/questions/session?${q}`, {}, token);
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
  classes: {
    create: (body: { name: string; description?: string; professorId: string }, token?: string) =>
      request<ClassData>('/api/classes', { method: 'POST', body: JSON.stringify(body) }, token),
    listByProf: (professorId: string, token?: string) =>
      request<{ classes: ClassSummary[] }>(`/api/classes/prof/${professorId}`, {}, token),
    get: (id: string, token?: string) =>
      request<ClassDetail>(`/api/classes/${id}`, {}, token),
    delete: (id: string, token?: string) =>
      request<{ ok: boolean }>(`/api/classes/${id}`, { method: 'DELETE' }, token),
    join: (body: { inviteCode: string; studentId: string }, token?: string) =>
      request<{ class: ClassData; membership: object }>('/api/classes/join', { method: 'POST', body: JSON.stringify(body) }, token),
    listByStudent: (studentId: string, token?: string) =>
      request<{ classes: ClassData[] }>(`/api/classes/student/${studentId}`, {}, token),
  },
  submissions: {
    submit: (body: SubmissionInput, token?: string) =>
      request<ExerciseSubmission>('/api/classes/submissions', { method: 'POST', body: JSON.stringify(body) }, token),
    listForProf: (professorId: string, status?: 'pending' | 'corrected', token?: string) => {
      const q = status ? `?status=${status}` : '';
      return request<{ submissions: ExerciseSubmission[] }>(`/api/classes/submissions/prof/${professorId}${q}`, {}, token);
    },
    listForStudent: (studentId: string, token?: string) =>
      request<{ submissions: ExerciseSubmission[] }>(`/api/classes/submissions/student/${studentId}`, {}, token),
    correct: (id: string, body: CorrectionInput, token?: string) =>
      request<ExerciseSubmission>(`/api/classes/submissions/${id}/correct`, { method: 'PATCH', body: JSON.stringify(body) }, token),
  },
};

export type Question = {
  id: string; section: string; level: string; question: string;
  options?: Record<string, string> | null; answer?: string | null;
  explanation?: string; audioUrl?: string; transcript?: string;
  theme?: string; imageUrl?: string; timeLimitMin?: number;
  taskNumber?: number; sessionGroup?: string;
  wordCountMin?: number; wordCountMax?: number;
};
export type EpreuvSession = {
  group: string; level: string; theme: string;
  tasks: Question[];
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
export type ClassData = {
  id: string; name: string; description?: string;
  inviteCode: string; professorId: string; createdAt: string;
};
export type ClassSummary = ClassData & {
  members: { studentId: string; joinedAt: string }[];
  _count: { submissions: number };
};
export type StudentStat = {
  studentId: string; globalAverage: number | null; totalAttempts: number;
  joinedAt: string;
  stats: { section: string; averageScore: number | null; attempts: number }[];
};
export type ClassDetail = ClassData & {
  members: { studentId: string; joinedAt: string }[];
  studentStats: StudentStat[];
};
export type ExerciseSubmission = {
  id: string; studentId: string; classId?: string; section: string;
  question: string; answer: string; status: 'pending' | 'corrected';
  score?: number; feedback?: string; strengths: string[]; errors: string[];
  correctedBy?: string; correctedAt?: string; createdAt: string;
  className?: string;
};
export type SubmissionInput = {
  studentId: string; classId?: string; section: 'EE' | 'EO';
  question: string; answer: string;
};
export type CorrectionInput = {
  score: number; feedback: string;
  strengths: string[]; errors: string[]; correctedBy: string;
};
