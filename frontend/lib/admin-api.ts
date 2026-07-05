const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try {
    // @ts-ignore
    return await window.Clerk?.session?.getToken() ?? null;
  } catch { return null; }
}

async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getClerkToken();
  const res = await fetch(`${BASE}/api/admin${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers },
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Erreur admin');
  return data;
}

export const adminApi = {
  stats: () => adminRequest<AdminStats>('/stats'),
  users: () => adminRequest<{ users: AdminUser[] }>('/users'),
  profRequests: (status?: string) => adminRequest<{ requests: ProfRequest[] }>(`/prof-requests${status ? `?status=${status}` : ''}`),
  inviteProf: (body: { email: string; fullName: string; message?: string }) =>
    adminRequest<{ directlyApproved: boolean; message: string }>('/prof-requests', { method: 'POST', body: JSON.stringify(body) }),
  approveProf: (id: string) => adminRequest<{ request: ProfRequest }>(`/prof-requests/${id}/approve`, { method: 'PATCH' }),
  rejectProf: (id: string, reason?: string) =>
    adminRequest<{ request: ProfRequest }>(`/prof-requests/${id}/reject`, { method: 'PATCH', body: JSON.stringify({ reason }) }),
  professors: () => adminRequest<{ professors: ProfessorWithClasses[] }>('/professors'),
  revokeProf: (userId: string) => adminRequest<{ ok: boolean }>(`/professors/${userId}/revoke`, { method: 'PATCH' }),
  questions: () => adminRequest<{ questions: AdminQuestion[]; total: number }>('/questions'),
  subscriptions: () => adminRequest<{ subscriptions: Subscription[] }>('/subscriptions'),
  upsertSubscription: (body: { userId: string; email: string; plan: string; expiresAt?: string }) =>
    adminRequest<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
  revokeSubscription: (userId: string) =>
    adminRequest<{ ok: boolean }>(`/subscriptions/${userId}`, { method: 'DELETE' }),

  // ── Sessions EO/EE (CRUD) ─────────────────────────────────────
  sessions: {
    list: (params?: { section?: string; level?: string }) => {
      const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
      return adminRequest<{ sessions: BankSession[]; total: number }>(`/questions/sessions${qs}`);
    },
    create: (body: BankSessionInput) =>
      adminRequest<{ session: BankSession }>('/questions/sessions', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<BankSessionInput>) =>
      adminRequest<{ session: BankSession }>(`/questions/sessions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) =>
      adminRequest<{ ok: boolean; id: string }>(`/questions/sessions/${id}`, { method: 'DELETE' }),
  },

  // ── Séries d'épreuves générées ───────────────────────────────────
  examSeries: {
    save: (body: { section: 'EE' | 'CE' | 'EO' | 'CO'; series: EeSerieRaw[] | EoSerieRaw[] | CeSerieRaw[] }) =>
      adminRequest<{ ok: boolean }>('/questions/exam-series', { method: 'POST', body: JSON.stringify(body) }),
    get: (section: 'EE' | 'CE' | 'EO' | 'CO') =>
      adminRequest<{ config: ExamSeriesConfigData | null }>(`/questions/exam-series?section=${section}`),
  },

  // ── Banque d'exercices (CRUD) ──────────────────────────────────
  bank: {
    list: (params?: { section?: string; level?: string }) => {
      const qs = params ? '?' + new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([, v]) => v))).toString() : '';
      return adminRequest<{ questions: BankQuestion[]; total: number }>(`/questions/bank${qs}`);
    },
    create: (body: BankQuestionInput) =>
      adminRequest<{ question: BankQuestion }>('/questions/bank', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<BankQuestionInput>) =>
      adminRequest<{ question: BankQuestion }>(`/questions/bank/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    delete: (id: string) =>
      adminRequest<{ ok: boolean; id: string }>(`/questions/bank/${id}`, { method: 'DELETE' }),
  },
};

export type AdminStats = {
  totalUsers: number;
  totalSessions: number;
  pendingProfRequests: number;
  approvedProfessors: number;
  totalClasses: number;
  subscriptions: Record<string, number>;
  recentSessions: { userId: string; section: string; score: number; correct: number; total: number; durationSeconds: number; createdAt: string }[];
  sessionsBySection: Record<string, number>;
  avgScoresBySection: Record<string, number>;
};

export type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  createdAt: number;
  plan: string;
};

export type ProfRequest = {
  id: string;
  userId: string;
  email: string;
  fullName: string;
  message?: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedAt?: string;
  createdAt: string;
};

export type ProfessorWithClasses = ProfRequest & {
  classes: { id: string; name: string; inviteCode: string; _count: { members: number; submissions: number } }[];
};

export type Subscription = {
  id: string;
  userId: string;
  email: string;
  plan: 'free' | 'pro' | 'annual';
  status: 'active' | 'cancelled' | 'expired';
  startedAt: string;
  expiresAt?: string;
};

export type AdminQuestion = {
  id: string;
  section: string;
  level: string;
  theme?: string;
  question: string;
};

export type BankQuestion = {
  id: string;
  section: string;
  level: string;
  question: string;
  options?: Record<string, string>;
  answer?: string;
  explanation?: string;
  theme?: string;
  transcript?: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
  sessionGroup?: string;
  orderNumber?: number | null;
  tags: string[];
  active: boolean;
  createdAt: string;
};

export type BankQuestionInput = {
  section: string;
  level: string;
  question: string;
  options?: Record<string, string>;
  answer?: string;
  explanation?: string;
  theme?: string;
  transcript?: string;
  audioUrl?: string | null;
  imageUrl?: string | null;
  tags?: string[];
  active?: boolean;
};

export type BankSession = {
  id: string;
  section: 'EE' | 'EO';
  level: string;
  question: string;
  explanation?: string;
  theme?: string;
  taskNumber: number;
  sessionGroup: string;
  timeLimitMin?: number;
  wordCountMin?: number;
  wordCountMax?: number;
  active: boolean;
  createdAt: string;
};

export type BankSessionInput = {
  section: 'EE' | 'EO';
  level?: string;
  question: string;
  explanation?: string;
  theme?: string;
  taskNumber: number;
  sessionGroup: string;
  timeLimitMin?: number;
  wordCountMin?: number;
  wordCountMax?: number;
  active?: boolean;
};

// ── Séries d'épreuves ─────────────────────────────────────────────
export type EeSerieRaw  = { id: number; t1Id: string; t2Id: string; t3Id: string };
export type EoSerieRaw  = { id: number; t1Id: string; t2Id: string; t3Id: string };
export type CeSerieRaw  = { id: number; questionIds: string[] };
export type ExamSeriesConfigData = {
  id: string; section: string; series: EeSerieRaw[] | EoSerieRaw[] | CeSerieRaw[];
  savedAt: string; updatedAt: string;
};
