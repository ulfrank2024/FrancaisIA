'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, Subscription } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';


const PLAN_META: Record<string, { label: string; color: string; badge: string; mthPrice: number }> = {
  free:   { label: 'Gratuit', color: 'from-slate-500 to-slate-600',     badge: 'bg-slate-800 text-slate-400 border-slate-700',           mthPrice: 0 },
  bronze: { label: 'Bronze',  color: 'from-orange-400 to-amber-500',   badge: 'bg-orange-900/60 text-orange-400 border-orange-800',     mthPrice: 0 },
  silver: { label: 'Silver',  color: 'from-indigo-500 to-violet-500',  badge: 'bg-indigo-900/60 text-indigo-400 border-indigo-800',     mthPrice: 29.99 },
  gold:   { label: 'Gold',    color: 'from-yellow-400 to-amber-400',   badge: 'bg-yellow-900/60 text-yellow-400 border-yellow-800',     mthPrice: 0 },
  pro:    { label: 'Pro (legacy)',   color: 'from-indigo-500 to-violet-500', badge: 'bg-indigo-900/60 text-indigo-400 border-indigo-800', mthPrice: 9.99 },
  annual: { label: 'Annuel (legacy)', color: 'from-emerald-500 to-teal-500', badge: 'bg-emerald-900/60 text-emerald-400 border-emerald-800', mthPrice: 79.99 / 12 },
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  active:          { label: 'Actif',           color: 'text-emerald-400 bg-emerald-950/40 border-emerald-900' },
  cancelled:       { label: 'Annulé',          color: 'text-slate-400 bg-slate-800 border-slate-700' },
  expired:         { label: 'Expiré',          color: 'text-red-400 bg-red-950/40 border-red-900' },
  payment_failed:  { label: 'Paiement échoué', color: 'text-orange-400 bg-orange-950/40 border-orange-900' },
};

function daysUntil(dateStr: string): number {
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);
}

export default function AdminSubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subs, setSubs]         = useState<Subscription[]>([]);
  const [loading, setLoading]   = useState(true);
  const [showAdd, setShowAdd]   = useState(false);
  const [filterPlan, setFilterPlan]     = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [form, setForm]         = useState({ userId: '', email: '', plan: 'pro', expiresAt: '' });
  const [saving, setSaving]     = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user && user.role !== undefined && user.role !== 'admin') router.push('/dashboard');
  }, [user, authLoading, router]);

  const load = () => {
    if (!user) return;
    adminApi.subscriptions().then(r => setSubs(r.subscriptions)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (user && user.role === 'admin') load(); }, [user]);

  async function handleSave() {
    if (!form.userId || !form.email) return;
    setSaving(true);
    try {
      await adminApi.upsertSubscription(form);
      setShowAdd(false);
      setForm({ userId: '', email: '', plan: 'pro', expiresAt: '' });
      load();
    } catch {} finally { setSaving(false); }
  }

  async function handleRevoke(s: Subscription) {
    if (!confirm(`Révoquer l'abonnement de ${s.email} ?`)) return;
    setRevokingId(s.id);
    try {
      await adminApi.revokeSubscription(s.userId);
      setSubs(prev => prev.filter(x => x.id !== s.id));
    } catch {} finally { setRevokingId(null); }
  }

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  // Métriques financières
  const active     = subs.filter(s => s.status === 'active');
  const proPaid    = active.filter(s => s.plan === 'pro');
  const annualPaid = active.filter(s => s.plan === 'annual');
  const mrr        = proPaid.length * 9.99 + annualPaid.length * (79.99 / 12);
  const arr        = mrr * 12;
  const expiringIn7 = active.filter(s => s.expiresAt && daysUntil(s.expiresAt) <= 7 && daysUntil(s.expiresAt) >= 0);
  const failed     = subs.filter(s => (s.status as string) === 'payment_failed');

  // Filtre
  const filtered = subs.filter(s => {
    const matchPlan   = !filterPlan   || s.plan === filterPlan;
    const matchStatus = !filterStatus || s.status === filterStatus;
    return matchPlan && matchStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Abonnements 💳</h1>
            <p className="text-slate-400 text-sm mt-0.5">{subs.length} abonnements · {active.length} actifs</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
            + Ajouter / modifier
          </button>
        </div>

        {/* Alertes */}
        {(expiringIn7.length > 0 || failed.length > 0) && (
          <div className="space-y-2">
            {expiringIn7.length > 0 && (
              <div className="flex items-center gap-3 bg-amber-950/40 border border-amber-800 rounded-xl px-4 py-3">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="text-sm">
                  <span className="font-black text-amber-300">{expiringIn7.length} abonnement{expiringIn7.length > 1 ? 's' : ''}</span>
                  <span className="text-amber-500"> expire{expiringIn7.length > 1 ? 'nt' : ''} dans moins de 7 jours :</span>
                  <span className="text-amber-600 text-xs ml-1">{expiringIn7.map(s => s.email).join(', ')}</span>
                </div>
              </div>
            )}
            {failed.length > 0 && (
              <div className="flex items-center gap-3 bg-red-950/40 border border-red-800 rounded-xl px-4 py-3">
                <span className="text-xl flex-shrink-0">❌</span>
                <div className="text-sm">
                  <span className="font-black text-red-300">{failed.length} paiement{failed.length > 1 ? 's' : ''} échoué{failed.length > 1 ? 's' : ''}</span>
                  <span className="text-red-500"> — à relancer manuellement.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* KPIs revenus */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'MRR',             value: mrr.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }),    icon: '📈', color: 'from-indigo-400 to-violet-500', sub: 'Revenu mensuel récurrent' },
            { label: 'ARR',             value: arr.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 }),    icon: '🏆', color: 'from-emerald-400 to-teal-500', sub: 'Revenu annuel récurrent' },
            { label: 'Pro actifs',      value: proPaid.length,    icon: '💎', color: 'from-violet-400 to-purple-500', sub: `${(9.99 * proPaid.length).toFixed(0)} $/mois` },
            { label: 'Annuels actifs',  value: annualPaid.length, icon: '🌟', color: 'from-amber-400 to-orange-500', sub: `${annualPaid.length} × 79,99 $` },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className="text-xs text-slate-500 mb-1">{s.icon} {s.label}</div>
              <div className={`text-xl font-black bg-gradient-to-r ${s.color} bg-clip-text text-transparent`}>{s.value}</div>
              <div className="text-xs text-slate-700 mt-0.5">{s.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Répartition par plan */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
          <h2 className="text-sm font-black text-slate-300 mb-4">Répartition des plans</h2>
          <div className="space-y-3">
            {(['pro', 'annual', 'free'] as const).map(plan => {
              const count = active.filter(s => s.plan === plan).length;
              const total = active.length || 1;
              const pct   = Math.round((count / total) * 100);
              const meta  = PLAN_META[plan];
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-300 font-bold">{meta.label}</span>
                    <span className="text-slate-400">{count} abonné{count !== 1 ? 's' : ''} · <span className="font-black text-white">{pct}%</span></span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7 }}
                      className={`h-full rounded-full bg-gradient-to-r ${meta.color}`} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Form ajout */}
        <AnimatePresence>
          {showAdd && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
              <h2 className="font-black text-indigo-400">Ajouter / modifier un abonnement</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { field: 'userId', label: 'Clerk User ID *', placeholder: 'user_...' },
                  { field: 'email',  label: 'Email *',         placeholder: 'user@exemple.com' },
                ].map(f => (
                  <div key={f.field}>
                    <label className="block text-xs font-bold text-slate-400 mb-1">{f.label}</label>
                    <input value={form[f.field as 'userId' | 'email']}
                      onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Plan</label>
                  <select value={form.plan} onChange={e => setForm(p => ({ ...p, plan: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500">
                    <option value="free">Gratuit</option>
                    <option value="bronze">🥉 Bronze — 14,99 $ (unique)</option>
                    <option value="silver">🥈 Silver — 29,99 $/mois</option>
                    <option value="gold">🥇 Gold — 49,99 $/2 mois</option>
                    <option value="pro">Pro (legacy)</option>
                    <option value="annual">Annuel (legacy)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1">Expire le (optionnel)</label>
                  <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowAdd(false)} className="text-sm text-slate-500 border border-slate-700 px-4 py-2 rounded-xl hover:text-slate-300 transition-colors">Annuler</button>
                <button onClick={handleSave} disabled={!form.userId || !form.email || saving}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
                  {saving ? <Spinner size={14} color="#fff" /> : '💾'} Enregistrer
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtres liste */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {([['', 'Tous'], ['bronze', 'Bronze'], ['silver', 'Silver'], ['gold', 'Gold'], ['free', 'Gratuit']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterPlan(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterPlan === val ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
          <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
            {([['', 'Tous statuts'], ['active', 'Actif'], ['cancelled', 'Annulé'], ['expired', 'Expiré'], ['payment_failed', 'Échec']] as const).map(([val, label]) => (
              <button key={val} onClick={() => setFilterStatus(val)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === val ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Liste abonnements */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden divide-y divide-slate-800/60">
          {filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-4xl mb-3">💳</div>
              <p className="text-slate-600">Aucun abonnement trouvé</p>
            </div>
          ) : filtered.map((s, i) => {
            const planMeta   = PLAN_META[s.plan] ?? PLAN_META.free;
            const statusMeta = STATUS_META[s.status] ?? STATUS_META.active;
            const days       = s.expiresAt ? daysUntil(s.expiresAt) : null;
            const expiringSoon = days !== null && days <= 7 && days >= 0;
            const expired     = days !== null && days < 0;

            return (
              <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.025, 0.3) }}
                className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-800/20 transition-colors">

                {/* Identité */}
                <div className="flex items-center gap-3 min-w-0">
                  <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${s.email}`} className="w-9 h-9 rounded-xl border border-slate-700 flex-shrink-0" alt="" />
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">{s.email}</div>
                    <div className="text-xs text-slate-600 font-mono truncate">{s.userId}</div>
                  </div>
                </div>

                {/* Badges + expiry */}
                <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${planMeta.badge}`}>
                    {planMeta.label}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${statusMeta.color}`}>
                    {statusMeta.label}
                  </span>
                  {s.expiresAt && (
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      expired        ? 'text-red-400 border-red-900 bg-red-950/30' :
                      expiringSoon   ? 'text-amber-400 border-amber-900 bg-amber-950/30' :
                      'text-slate-600 border-slate-800'
                    }`}>
                      {expired
                        ? `Expiré il y a ${Math.abs(days!)}j`
                        : expiringSoon
                          ? `Expire dans ${days}j ⚠️`
                          : `exp. ${new Date(s.expiresAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}`
                      }
                    </span>
                  )}
                </div>

                {/* Action */}
                {s.status === 'active' && (
                  <button onClick={() => handleRevoke(s)} disabled={revokingId === s.id}
                    className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-900 text-red-500 hover:bg-red-950/40 transition-colors disabled:opacity-50 flex-shrink-0">
                    {revokingId === s.id ? <Spinner size={12} /> : '✕'} Révoquer
                  </button>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
