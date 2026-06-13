'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, ProfRequest, ProfessorWithClasses } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(userId: string) { return userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

export default function AdminProfessorsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<'pending' | 'approved'>(searchParams.get('tab') === 'pending' ? 'pending' : 'approved');
  const [requests, setRequests] = useState<ProfRequest[]>([]);
  const [professors, setProfessors] = useState<ProfessorWithClasses[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(searchParams.get('action') === 'invite');
  const [invite, setInvite] = useState({ email: '', fullName: '', message: '' });
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  const load = () => {
    if (!user) return;
    setLoading(true);
    Promise.all([
      adminApi.profRequests('pending'),
      adminApi.professors(),
    ]).then(([r, p]) => { setRequests(r.requests); setProfessors(p.professors); })
      .catch(() => {}).finally(() => setLoading(false));
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

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminNav />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8">

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

        {/* Liste demandes en attente */}
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
                  <img src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${r.email}&backgroundColor=b6e3f4`}
                    className="w-12 h-12 rounded-full border-2 border-slate-700 flex-shrink-0" alt="" />
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

        {/* Liste profs approuvés */}
        {tab === 'approved' && (
          <div className="space-y-3">
            {professors.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-3">👨‍🏫</div>
                <p className="text-slate-400">Aucun professeur approuvé pour l'instant</p>
              </div>
            ) : professors.map((p, i) => (
              <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <img src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${p.email}&backgroundColor=b6e3f4`}
                      className="w-12 h-12 rounded-full border-2 border-emerald-800 flex-shrink-0" alt="" />
                    <div>
                      <div className="font-bold flex items-center gap-2">
                        {p.fullName}
                        <span className="text-xs bg-emerald-900 text-emerald-400 px-2 py-0.5 rounded-full">Professeur</span>
                      </div>
                      <div className="text-sm text-slate-400">{p.email}</div>
                      <div className="text-xs text-slate-600 mt-0.5">
                        Approuvé le {p.reviewedAt ? new Date(p.reviewedAt).toLocaleDateString('fr-CA') : '–'}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleRevoke(p.userId, p.fullName)}
                    className="text-xs text-red-500 hover:text-red-400 border border-red-900 px-3 py-1.5 rounded-lg transition-colors flex-shrink-0">
                    Révoquer
                  </button>
                </div>
                {p.classes.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 mb-2">{p.classes.length} classe(s)</div>
                    <div className="flex flex-wrap gap-2">
                      {p.classes.map(c => (
                        <div key={c.id} className="flex items-center gap-2 bg-slate-800 rounded-lg px-3 py-1.5 text-xs">
                          <span className="font-bold text-white">{c.name}</span>
                          <span className="text-slate-500">·</span>
                          <span className="text-slate-400">{c._count.members} élève(s)</span>
                          <span className="font-mono text-slate-600">{c.inviteCode}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
