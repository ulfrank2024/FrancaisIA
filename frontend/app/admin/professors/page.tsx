'use client';
import { useEffect, useState, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, ProfRequest, ProfessorWithClasses, Subscription } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(userId: string) { return userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

// Simulation d'un taux journalier fictif (pas de tracking réel par prof pour l'instant)
const PLAN_PRICE: Record<string, number> = { pro: 9.99, annual: 79.99 / 12, free: 0 };

function ProfCard({ p, subs, onRevoke }: {
  p: ProfessorWithClasses;
  subs: Subscription[];
  onRevoke: (userId: string, name: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const totalStudents  = p.classes.reduce((n, c) => n + c._count.members, 0);
  const totalSubs      = p.classes.reduce((n, c) => n + c._count.submissions, 0);
  const approvedDate   = p.reviewedAt
    ? new Date(p.reviewedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })
    : '–';

  // Abonnements de la plateforme (global — on ne peut pas les attribuer par prof sans member IDs)
  const paidSubs    = subs.filter(s => s.plan !== 'free' && s.status === 'active');
  const totalRevMth = paidSubs.reduce((n, s) => n + (PLAN_PRICE[s.plan] ?? 0), 0);

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">

      {/* ── En-tête prof ── */}
      <div className="p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

          {/* Avatar + identité */}
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${p.email}`} className="w-14 h-14 rounded-2xl border-2 border-emerald-700" alt="" />
              <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
            </div>
            <div>
              <div className="font-black text-base text-white flex items-center gap-2 flex-wrap">
                {p.fullName}
                <span className="text-xs bg-emerald-900/70 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded-full">Professeur</span>
              </div>
              <div className="text-sm text-slate-400 mt-0.5">{p.email}</div>
              <div className="text-xs text-slate-600 mt-0.5">Approuvé le {approvedDate}</div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => setExpanded(v => !v)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors">
              {expanded ? '▲ Réduire' : '▼ Détails'}
            </button>
            <button onClick={() => onRevoke(p.userId, p.fullName)}
              className="text-xs font-bold px-3 py-1.5 rounded-xl border border-red-900 text-red-500 hover:bg-red-950/40 transition-colors">
              Révoquer
            </button>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[
            { icon: '🏫', label: 'Classes',      value: p.classes.length,  color: 'from-violet-500 to-purple-600' },
            { icon: '👥', label: 'Élèves',        value: totalStudents,     color: 'from-sky-500 to-cyan-600' },
            { icon: '📝', label: 'Soumissions',   value: totalSubs,         color: 'from-emerald-500 to-teal-600' },
          ].map(s => (
            <div key={s.label} className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-3 text-center">
              <div className={`text-2xl font-black bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{s.icon} {s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Section dépliable ── */}
      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="border-t border-slate-800 overflow-hidden">
            <div className="p-5 sm:p-6 space-y-6">

              {/* Classes détaillées */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Classes ({p.classes.length})
                </h3>
                {p.classes.length === 0 ? (
                  <div className="text-sm text-slate-600 bg-slate-800/40 rounded-xl p-4 text-center">
                    Aucune classe créée pour l'instant
                  </div>
                ) : (
                  <div className="space-y-2">
                    {p.classes.map(c => {
                      const subsPct = c._count.members > 0
                        ? Math.min(100, Math.round((c._count.submissions / Math.max(c._count.members * 3, 1)) * 100))
                        : 0;
                      return (
                        <div key={c.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-base">🏫</span>
                              <div>
                                <div className="text-sm font-black text-white">{c.name}</div>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                                  <span>👥 {c._count.members} élève{c._count.members !== 1 ? 's' : ''}</span>
                                  <span>·</span>
                                  <span>📝 {c._count.submissions} soumission{c._count.submissions !== 1 ? 's' : ''}</span>
                                </div>
                              </div>
                            </div>
                            <span className="font-mono text-xs bg-slate-700 text-slate-300 px-2 py-1 rounded-lg flex-shrink-0">
                              {c.inviteCode}
                            </span>
                          </div>

                          {/* Barre d'activité */}
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5">
                              <span>Activité élèves</span>
                              <span className={subsPct >= 60 ? 'text-emerald-500' : subsPct >= 30 ? 'text-amber-500' : 'text-slate-500'}>
                                {subsPct}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${subsPct}%` }} transition={{ duration: 0.6 }}
                                className={`h-full rounded-full ${subsPct >= 60 ? 'bg-emerald-500' : subsPct >= 30 ? 'bg-amber-500' : 'bg-slate-500'}`} />
                            </div>
                          </div>

                          {/* Statut */}
                          <div className="mt-2 flex items-center gap-2">
                            {c._count.members === 0 && (
                              <span className="text-xs text-amber-500 bg-amber-950/40 border border-amber-900 px-2 py-0.5 rounded-full">
                                En attente d'élèves
                              </span>
                            )}
                            {c._count.members > 0 && c._count.submissions === 0 && (
                              <span className="text-xs text-sky-400 bg-sky-950/40 border border-sky-900 px-2 py-0.5 rounded-full">
                                Classe active — aucune soumission
                              </span>
                            )}
                            {c._count.submissions > 0 && (
                              <span className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-900 px-2 py-0.5 rounded-full">
                                En cours
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Financement */}
              <div>
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
                  Financement plateforme
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-xl p-4">
                    <div className="text-xs text-emerald-600 mb-1">Abonnés actifs (total plateforme)</div>
                    <div className="text-2xl font-black text-emerald-400">{paidSubs.length}</div>
                    <div className="text-xs text-emerald-700 mt-0.5">utilisateurs payants</div>
                  </div>
                  <div className="bg-indigo-950/30 border border-indigo-900/50 rounded-xl p-4">
                    <div className="text-xs text-indigo-600 mb-1">Revenu mensuel estimé</div>
                    <div className="text-2xl font-black text-indigo-400">
                      {totalRevMth.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
                    </div>
                    <div className="text-xs text-indigo-700 mt-0.5">toute plateforme</div>
                  </div>
                </div>
                <p className="text-xs text-slate-700 mt-2">
                  Attribution par professeur en cours de développement — données globales plateforme pour l'instant.
                </p>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function AdminProfessorsPageInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'pending' | 'approved'>(searchParams.get('tab') === 'pending' ? 'pending' : 'approved');
  const [requests, setRequests]       = useState<ProfRequest[]>([]);
  const [professors, setProfessors]   = useState<ProfessorWithClasses[]>([]);
  const [subs, setSubs]               = useState<Subscription[]>([]);
  const [loading, setLoading]         = useState(true);
  const [showInvite, setShowInvite]   = useState(searchParams.get('action') === 'invite');
  const [invite, setInvite]           = useState({ email: '', fullName: '', message: '' });
  const [inviting, setInviting]       = useState(false);
  const [inviteResult, setInviteResult] = useState('');
  const [actionId, setActionId]       = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      adminApi.profRequests('pending'),
      adminApi.professors(),
      adminApi.subscriptions(),
    ]).then(([r, p, s]) => {
      setRequests(r.requests);
      setProfessors(p.professors);
      setSubs(s.subscriptions);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (user && isAdmin(user.id)) load(); }, [user]);

  async function handleApprove(id: string) {
    setActionId(id);
    try { await adminApi.approveProf(id); load(); } catch {} finally { setActionId(null); }
  }

  async function handleReject(id: string) {
    if (!confirm('Rejeter cette demande ?')) return;
    setActionId(id);
    try { await adminApi.rejectProf(id); load(); } catch {} finally { setActionId(null); }
  }

  async function handleRevoke(userId: string, name: string) {
    if (!confirm(`Révoquer l'accès prof de ${name} ?`)) return;
    try { await adminApi.revokeProf(userId); load(); } catch {}
  }

  async function handleInvite() {
    if (!invite.email || !invite.fullName) return;
    setInviting(true);
    setInviteResult('');
    try {
      const res = await adminApi.inviteProf(invite);
      setInviteResult(res.directlyApproved
        ? `✅ ${invite.fullName} est maintenant professeur.`
        : `📧 Invitation créée. ${invite.fullName} sera auto-approuvé(e) à l'inscription.`
      );
      setInvite({ email: '', fullName: '', message: '' });
      load();
    } catch (e: unknown) {
      setInviteResult(`❌ ${e instanceof Error ? e.message : 'Erreur'}`);
    } finally { setInviting(false); }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  const totalStudents = professors.reduce((n, p) => n + p.classes.reduce((m, c) => m + c._count.members, 0), 0);
  const totalClasses  = professors.reduce((n, p) => n + p.classes.length, 0);
  const totalSubsAll  = professors.reduce((n, p) => n + p.classes.reduce((m, c) => m + c._count.submissions, 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Gestion des professeurs 👨‍🏫</h1>
            <p className="text-slate-400 text-sm mt-0.5">Inviter, valider et révoquer les accès professeurs</p>
          </div>
          <button onClick={() => setShowInvite(v => !v)}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
            + Inviter un prof
          </button>
        </div>

        {/* KPIs globaux */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { icon: '👨‍🏫', label: 'Professeurs',   value: professors.length, color: 'from-emerald-500 to-teal-600' },
            { icon: '🏫',  label: 'Classes totales', value: totalClasses,      color: 'from-violet-500 to-purple-600' },
            { icon: '👥',  label: 'Élèves inscrits', value: totalStudents,     color: 'from-sky-500 to-cyan-600' },
            { icon: '📝',  label: 'Soumissions',     value: totalSubsAll,      color: 'from-rose-500 to-pink-600' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-center">
              <div className={`text-2xl font-black bg-gradient-to-br ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1">{s.icon} {s.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Panel invitation */}
        <AnimatePresence>
          {showInvite && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 space-y-4">
              <h2 className="font-black text-emerald-400">📧 Inviter ou promouvoir un professeur</h2>
              <p className="text-slate-400 text-xs">Si l'utilisateur a déjà un compte, il sera directement promu. Sinon, une invitation est créée.</p>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Email *</label>
                  <input value={invite.email} onChange={e => setInvite(p => ({ ...p, email: e.target.value }))}
                    placeholder="email@exemple.com" type="email"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Nom complet *</label>
                  <input value={invite.fullName} onChange={e => setInvite(p => ({ ...p, fullName: e.target.value }))}
                    placeholder="Marie Dupont"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Message (optionnel)</label>
                <textarea value={invite.message} onChange={e => setInvite(p => ({ ...p, message: e.target.value }))}
                  placeholder="Note interne ou message pour le prof..."
                  rows={2} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none" />
              </div>
              {inviteResult && (
                <p className={`text-sm px-4 py-2 rounded-xl ${inviteResult.startsWith('✅') ? 'bg-emerald-900/50 text-emerald-300' : inviteResult.startsWith('📧') ? 'bg-indigo-900/50 text-indigo-300' : 'bg-red-900/50 text-red-300'}`}>
                  {inviteResult}
                </p>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowInvite(false)} className="text-sm text-slate-500 hover:text-slate-300 border border-slate-700 px-4 py-2 rounded-xl">Annuler</button>
                <button onClick={handleInvite} disabled={!invite.email || !invite.fullName || inviting}
                  className="flex-1 sm:flex-none sm:w-48 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50 flex items-center justify-center gap-2">
                  {inviting ? <><Spinner size={16} color="#fff" /> Traitement...</> : '📧 Envoyer l\'invitation'}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('pending')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'pending' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            ⏳ En attente
            {requests.length > 0 && <span className="bg-white/20 text-white text-xs px-1.5 rounded-full">{requests.length}</span>}
          </button>
          <button onClick={() => setTab('approved')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${tab === 'approved' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
            ✅ Approuvés <span className="bg-white/20 text-white text-xs px-1.5 rounded-full">{professors.length}</span>
          </button>
        </div>

        {/* Demandes en attente */}
        {tab === 'pending' && (
          <div className="space-y-3">
            {requests.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-slate-400">Aucune demande en attente</p>
              </div>
            ) : requests.map((r, i) => (
              <motion.div key={r.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${r.email}`} className="w-12 h-12 rounded-full border-2 border-slate-700 flex-shrink-0" alt="" />
                  <div>
                    <div className="font-bold">{r.fullName}</div>
                    <div className="text-sm text-slate-400">{r.email}</div>
                    {r.message && <div className="text-xs text-slate-500 mt-1 italic">"{r.message}"</div>}
                    <div className="text-xs text-slate-600 mt-0.5">
                      Demande le {new Date(r.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  <button onClick={() => handleReject(r.id)} disabled={actionId === r.id}
                    className="px-4 py-2 text-sm font-bold text-red-400 border border-red-900 rounded-xl hover:bg-red-900/30 transition-colors disabled:opacity-50">
                    ✕ Refuser
                  </button>
                  <button onClick={() => handleApprove(r.id)} disabled={actionId === r.id}
                    className="px-5 py-2 text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-colors disabled:opacity-50 flex items-center gap-1.5">
                    {actionId === r.id ? <Spinner size={14} color="#fff" /> : '✓'} Approuver
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Profs approuvés */}
        {tab === 'approved' && (
          <div className="space-y-4">
            {professors.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-3">👨‍🏫</div>
                <p className="text-slate-400">Aucun professeur approuvé pour l'instant</p>
              </div>
            ) : professors.map(p => (
              <ProfCard key={p.id} p={p} subs={subs} onRevoke={handleRevoke} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AdminProfessorsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" /></div>}>
      <AdminProfessorsPageInner />
    </Suspense>
  );
}
