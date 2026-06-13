'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, Subscription } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(id: string) { return id === process.env.NEXT_PUBLIC_ADMIN_USER_ID; }

const PLAN_META = {
  free:   { label: 'Gratuit',  color: 'bg-slate-800 text-slate-400',   price: '0 $' },
  pro:    { label: 'Pro',      color: 'bg-indigo-900 text-indigo-400',  price: '9,99 $/mois' },
  annual: { label: 'Annuel',   color: 'bg-emerald-900 text-emerald-400', price: '79,99 $/an' },
};

export default function AdminSubscriptionsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ userId: '', email: '', plan: 'pro', expiresAt: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user && !isAdmin(user.id)) router.push('/dashboard');
  }, [user, authLoading, router]);

  const load = () => {
    if (!user) return;
    adminApi.subscriptions().then(r => setSubs(r.subscriptions)).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { if (user && isAdmin(user.id)) load(); }, [user]);

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

  if (authLoading || loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>;

  const revenue = {
    pro: subs.filter(s => s.plan === 'pro' && s.status === 'active').length * 9.99,
    annual: subs.filter(s => s.plan === 'annual' && s.status === 'active').length * 79.99,
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <AdminNav />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black">Abonnements 💳</h1>
            <p className="text-slate-400 text-sm mt-0.5">{subs.length} abonnements enregistrés</p>
          </div>
          <button onClick={() => setShowAdd(v => !v)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-4 py-2 rounded-xl text-sm transition-colors">
            + Ajouter / modifier
          </button>
        </div>

        {/* Revenus estimés */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pro actifs', count: subs.filter(s => s.plan === 'pro' && s.status === 'active').length, revenue: revenue.pro, color: 'from-indigo-500 to-violet-500' },
            { label: 'Annuels actifs', count: subs.filter(s => s.plan === 'annual' && s.status === 'active').length, revenue: revenue.annual, color: 'from-emerald-500 to-teal-500' },
            { label: 'Revenu mensuel estimé', count: null, revenue: revenue.pro + revenue.annual / 12, color: 'from-yellow-500 to-orange-500' },
          ].map((m, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <div className={`text-2xl font-black bg-gradient-to-r ${m.color} bg-clip-text text-transparent`}>
                {m.count !== null ? m.count : ''}{m.count !== null ? ' · ' : ''}{m.revenue.toLocaleString('fr-CA', { style: 'currency', currency: 'CAD', maximumFractionDigits: 0 })}
              </div>
              <div className="text-xs text-slate-500 mt-0.5">{m.label}</div>
            </div>
          ))}
        </div>

        {/* Form ajout */}
        {showAdd && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-6 space-y-4">
            <h2 className="font-black text-indigo-400">Ajouter / modifier un abonnement</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { field: 'userId', label: 'Clerk User ID *', placeholder: 'user_...' },
                { field: 'email', label: 'Email *', placeholder: 'user@exemple.com' },
              ].map(f => (
                <div key={f.field}>
                  <label className="block text-xs font-bold text-slate-400 mb-1">{f.label}</label>
                  <input value={form[f.field as keyof typeof form]}
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
                  <option value="pro">Pro (9,99 $/mois)</option>
                  <option value="annual">Annuel (79,99 $/an)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">Expire le (optionnel)</label>
                <input type="date" value={form.expiresAt} onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-indigo-500" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowAdd(false)} className="text-sm text-slate-500 border border-slate-700 px-4 py-2 rounded-xl">Annuler</button>
              <button onClick={handleSave} disabled={!form.userId || !form.email || saving}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-5 py-2 rounded-xl text-sm disabled:opacity-50 flex items-center gap-2">
                {saving ? <Spinner size={14} color="#fff" /> : '💾'} Enregistrer
              </button>
            </div>
          </motion.div>
        )}

        {/* Liste */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          {subs.length === 0 ? (
            <div className="p-12 text-center text-slate-600">Aucun abonnement enregistré</div>
          ) : subs.map((s, i) => (
            <motion.div key={s.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
              className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/50 last:border-0 hover:bg-slate-800/20">
              <div className="flex items-center gap-3">
                <img src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${s.email}&backgroundColor=b6e3f4`}
                  className="w-9 h-9 rounded-full border border-slate-700" alt="" />
                <div>
                  <div className="text-sm font-semibold">{s.email}</div>
                  <div className="text-xs text-slate-600 font-mono">{s.userId}</div>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PLAN_META[s.plan]?.color ?? ''}`}>
                  {PLAN_META[s.plan]?.label ?? s.plan}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'active' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {s.status}
                </span>
                {s.expiresAt && (
                  <span className="text-xs text-slate-600">
                    exp. {new Date(s.expiresAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
