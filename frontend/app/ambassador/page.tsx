'use client';
import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { motion, AnimatePresence } from 'framer-motion';

interface AmbassadorInfo {
  id: string; code: string; fullName: string; email: string;
  commissionPct: number; paymentInfo: string | null; status: string;
}
interface Referral {
  id: string; referredEmail: string; referredName: string | null;
  status: string; plan: string | null; createdAt: string; subscribedAt: string | null;
}
interface Commission {
  id: string; amount: number; planAmount: number; pct: number;
  plan: string | null; status: string; createdAt: string; paidAt: string | null;
}
interface Stats {
  totalReferrals: number; subscribers: number;
  pendingAmount: number; paidAmount: number; conversionRate: number;
}
interface DashboardData {
  ambassador: AmbassadorInfo; stats: Stats;
  referrals: Referral[]; commissions: Commission[];
}

const STATUS_LABEL: Record<string, string> = {
  registered: 'Inscrit', subscribed: 'Abonné', churned: 'Parti',
};
const STATUS_COLOR: Record<string, string> = {
  registered: 'bg-blue-100 text-blue-700',
  subscribed:  'bg-green-100 text-green-700',
  churned:     'bg-gray-100 text-gray-500',
};
const COM_COLOR: Record<string, string> = {
  pending:   'bg-amber-100 text-amber-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
};

function fmt(d: string) {
  return new Date(d).toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Icônes ───────────────────────────────────────────────────────
function WhatsAppIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.261 5.632 5.903-5.632Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );
}

// ── Boutons de partage ────────────────────────────────────────────
function ShareButtons({ link, code }: { link: string; code: string }) {
  const msg = `Prépare le TCF Canada avec RéussirTCF — la plateforme #1 ! Utilise mon lien pour t'inscrire : `;
  const waUrl = `https://wa.me/?text=${encodeURIComponent(msg + link)}`;
  const xUrl  = `https://x.com/intent/tweet?text=${encodeURIComponent(msg)}&url=${encodeURIComponent(link)}`;

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3">
      <span className="text-xs text-red-200">Partager :</span>
      <a
        href={waUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-red-800/40 hover:bg-green-700/60 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <WhatsAppIcon /> WhatsApp
      </a>
      <a
        href={xUrl} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-1.5 bg-red-800/40 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
      >
        <XIcon /> X (Twitter)
      </a>
      <span className="ml-auto text-xs text-red-300 hidden sm:block">Code : <strong className="text-white">{code}</strong></span>
    </div>
  );
}

// ── Panneau infos de paiement ─────────────────────────────────────
function PaymentInfoPanel({
  current, onSave,
}: { current: string | null; onSave: (val: string) => void }) {
  const [open, setOpen]       = useState(false);
  const [value, setValue]     = useState(current ?? '');
  const [saving, setSaving]   = useState(false);
  const [success, setSuccess] = useState(false);
  const [err, setErr]         = useState('');

  const save = async () => {
    if (!value.includes('@')) { setErr('Adresse courriel invalide'); return; }
    setSaving(true); setErr('');
    try {
      const r = await fetch('/api/ambassador/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentInfo: value }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error ?? 'Erreur serveur'); return; }
      onSave(value);
      setSuccess(true);
      setTimeout(() => { setSuccess(false); setOpen(false); }, 1500);
    } catch {
      setErr('Erreur réseau');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-slate-800 rounded-2xl px-5 py-5 text-white">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Comment tu es payé(e)</p>
          <p className="text-sm text-slate-200 leading-relaxed">
            Les commissions en attente sont payées via <strong>Interac</strong> à{' '}
            <strong className="text-white">{current ?? 'l\'adresse courriel de ton compte'}</strong>.
            Paiement manuel chaque fin de mois.
          </p>
        </div>
        <button
          onClick={() => { setOpen(o => !o); setValue(current ?? ''); setErr(''); setSuccess(false); }}
          className="shrink-0 text-xs font-bold text-slate-400 hover:text-white bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-lg transition-colors"
        >
          {open ? 'Fermer' : 'Modifier'}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-4 space-y-3 pt-4 border-t border-slate-700">
              <label className="block text-xs font-semibold text-slate-400">Nouvel email Interac</label>
              <input
                type="email"
                value={value}
                onChange={e => { setValue(e.target.value); setErr(''); }}
                placeholder="ton@email.com"
                className="w-full bg-slate-700 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              {err     && <p className="text-red-400 text-xs">{err}</p>}
              {success && <p className="text-green-400 text-xs">✓ Sauvegardé !</p>}
              <div className="flex gap-2">
                <button
                  onClick={save} disabled={saving}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-bold py-2.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {saving && <div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
                  {saving ? 'Sauvegarde…' : 'Sauvegarder'}
                </button>
                <button
                  onClick={() => setOpen(false)}
                  className="px-4 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm font-bold rounded-xl transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────
export default function AmbassadorPage() {
  const { userId, isLoaded } = useAuth();
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [copied, setCopied]   = useState(false);
  const [tab, setTab]         = useState<'referrals' | 'commissions'>('referrals');

  useEffect(() => {
    if (!isLoaded || !userId) return;
    fetch('/api/ambassador/dashboard')
      .then(r => {
        if (r.status === 404) throw new Error('not_found');
        if (!r.ok) throw new Error('server_error');
        return r.json();
      })
      .then(setData)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [isLoaded, userId]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-red-200 border-t-red-600 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Chargement…</p>
        </div>
      </div>
    );
  }

  if (error === 'not_found') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-10 max-w-md text-center">
          <div className="text-5xl mb-4">🤝</div>
          <h1 className="text-2xl font-bold text-slate-900 mb-3">Devenir ambassadeur</h1>
          <p className="text-slate-500 text-sm leading-relaxed mb-6">
            Tu n&apos;es pas encore ambassadeur RéussirTCF. Pour rejoindre le programme et gagner des commissions sur chaque abonnement parrainé, contacte-nous.
          </p>
          <a
            href="mailto:noreply@reussir-tcf.ca?subject=Demande ambassadeur RéussirTCF"
            className="inline-block bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-sm hover:bg-red-700 transition-colors"
          >
            Contacter l&apos;équipe →
          </a>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { ambassador, stats, referrals, commissions } = data;
  const refLink = `https://reussir-tcf.ca/register?ref=${ambassador.code}`;

  const copyLink = () => {
    navigator.clipboard.writeText(refLink).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="text-slate-400 hover:text-slate-600 transition-colors">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="font-bold text-slate-900 text-lg leading-tight">Espace ambassadeur</h1>
              <p className="text-xs text-slate-400">Bonjour {ambassador.fullName} 👋</p>
            </div>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ambassador.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            {ambassador.status === 'active' ? '✓ Actif' : ambassador.status}
          </span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Lien de parrainage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-600 to-red-700 rounded-2xl p-6 text-white shadow-lg"
        >
          <p className="text-red-200 text-xs font-semibold uppercase tracking-wide mb-1">Ton lien de parrainage</p>
          <div className="flex items-center gap-3 bg-red-800/40 rounded-xl px-4 py-3 mt-2">
            <span className="text-sm font-mono flex-1 truncate text-red-100">{refLink}</span>
            <button
              onClick={copyLink}
              className="shrink-0 bg-white text-red-700 text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
            >
              {copied ? '✓ Copié !' : 'Copier'}
            </button>
          </div>
          <ShareButtons link={refLink} code={ambassador.code} />
          <p className="text-red-200 text-xs mt-3">
            Commission : <span className="font-bold text-white">{ambassador.commissionPct}%</span> par abonnement parrainé
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Filleuls inscrits',   value: stats.totalReferrals,                  color: 'text-slate-900' },
            { label: 'Abonnés',              value: stats.subscribers,                     color: 'text-green-600' },
            { label: 'Taux conversion',      value: `${stats.conversionRate}%`,             color: 'text-blue-600' },
            { label: 'En attente (CAD)',      value: `${stats.pendingAmount.toFixed(2)} $`,  color: 'text-amber-600' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
              className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm"
            >
              <p className="text-xs text-slate-400 mb-1">{s.label}</p>
              <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Paiement reçu */}
        {stats.paidAmount > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4 flex items-center gap-3">
            <div className="w-9 h-9 bg-green-600 rounded-full flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="text-green-800 font-bold text-sm">Total reçu : {stats.paidAmount.toFixed(2)} $</p>
              <p className="text-green-600 text-xs">Payé via Interac sur {ambassador.paymentInfo ?? 'ton courriel'}</p>
            </div>
          </div>
        )}

        {/* Tabs filleuls / commissions */}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
          <div className="flex border-b border-slate-100">
            {(['referrals', 'commissions'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-3.5 text-sm font-semibold transition-colors ${tab === t ? 'bg-slate-50 text-slate-900 border-b-2 border-red-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {t === 'referrals' ? `Filleuls (${referrals.length})` : `Commissions (${commissions.length})`}
              </button>
            ))}
          </div>

          {tab === 'referrals' && (
            <div className="divide-y divide-slate-50">
              {referrals.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">🔗</p>
                  <p className="text-slate-500 text-sm">Partage ton lien pour voir tes filleuls ici.</p>
                </div>
              ) : referrals.map(r => (
                <div key={r.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center shrink-0 font-bold text-slate-500 text-sm">
                    {(r.referredName ?? r.referredEmail)[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{r.referredName ?? r.referredEmail}</p>
                    <p className="text-xs text-slate-400 truncate">{r.referredEmail} · {fmt(r.createdAt)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${STATUS_COLOR[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[r.status] ?? r.status}
                    </span>
                    {r.plan && <span className="text-xs text-slate-400 capitalize">{r.plan}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'commissions' && (
            <div className="divide-y divide-slate-50">
              {commissions.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-4xl mb-3">💸</p>
                  <p className="text-slate-500 text-sm">Tes commissions apparaîtront ici dès qu&apos;un filleul s&apos;abonne.</p>
                </div>
              ) : commissions.map(c => (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1">
                    <p className="font-semibold text-slate-800 text-sm">
                      {c.amount.toFixed(2)} $ <span className="text-slate-400 font-normal text-xs">({c.pct}% sur {c.planAmount.toFixed(2)} $)</span>
                    </p>
                    <p className="text-xs text-slate-400">{c.plan ? c.plan.charAt(0).toUpperCase() + c.plan.slice(1) : '—'} · {fmt(c.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${COM_COLOR[c.status] ?? 'bg-gray-100'}`}>
                      {c.status === 'pending' ? 'En attente' : c.status === 'paid' ? 'Payé' : 'Annulé'}
                    </span>
                    {c.paidAt && <p className="text-xs text-slate-400 mt-0.5">{fmt(c.paidAt)}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infos de paiement modifiables */}
        <PaymentInfoPanel
          current={ambassador.paymentInfo}
          onSave={(val) => setData(d => d ? { ...d, ambassador: { ...d.ambassador, paymentInfo: val } } : d)}
        />

      </div>
    </div>
  );
}
