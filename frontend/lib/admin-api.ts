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
  subscriptions: () => adminRequest<{ subscriptions: Subscription[] }>('/subscriptions'),
  upsertSubscription: (body: { userId: string; email: string; plan: string; expiresAt?: string }) =>
    adminRequest<Subscription>('/subscriptions', { method: 'POST', body: JSON.stringify(body) }),
};

export type AdminStats = {
  totalUsers: number;
  totalSessions: number;
  pendingProfRequests: number;
  approvedProfessors: number;
  totalClasses: number;
  subscriptions: Record<string, number>;
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
