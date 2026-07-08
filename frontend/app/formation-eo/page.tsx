'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '../../lib/auth-context';
import Spinner from '../../components/Spinner';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

type EoTask = {
  id: string; question: string; taskNumber: number; theme?: string | null;
  timeLimitMin?: number | null; sessionGroup?: string | null; level?: string;
};

type EoSerie = { id: number; t1: EoTask; t2: EoTask; t3: EoTask };

type EoConfig = {
  section: string;
  series: EoSerie[];
  savedAt: string | null;
};

const TASK_META = {
  1: { label: 'Présentation',  icon: '👤', color: 'text-rose-600',   bg: 'bg-rose-50',   border: 'border-rose-200',   badge: 'bg-rose-100 text-rose-700',     duration: '2 min',      points: '3 pts' },
  2: { label: 'Interaction',   icon: '💬', color: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-200', badge: 'bg-orange-100 text-orange-700', duration: '3 min 30 s', points: '7 pts' },
  3: { label: 'Argumentation', icon: '🗣️', color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200', badge: 'bg-violet-100 text-violet-700', duration: '4 min 30 s', points: '10 pts' },
} as const;

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try { return await (window as any).Clerk?.session?.getToken() ?? null; } catch { return null; }
}

const FREE_SERIES_COUNT = 2;

export default function FormationEoPage() {
  const { user, loading: authLoading, userPlan } = useAuth();
  const isPaid = userPlan !== 'free';
  const [config, setConfig] = useState<EoConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) { setLoading(false); return; }
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getClerkToken();
        const res = await fetch(`${BASE}/api/questions/exam-series?section=EO`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erreur');
        setConfig(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [authLoading, user]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Hero */}
        <div className="bg-white border-b border-slate-100">
          <div className="max-w-4xl mx-auto px-4 py-12 sm:py-16 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold mb-5">
              🎤 Expression Orale — TCF Canada
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 mb-4 leading-tight">
              Prépare ton Expression Orale<br />TCF Canada
            </h1>
            <p className="text-slate-500 text-base sm:text-lg max-w-xl mx-auto mb-8">
              Sujets officiels reproduits à l&apos;identique. 3 tâches de production orale par série avec feedback IA personnalisé et grille d&apos;évaluation NCLC officielle.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/register" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl transition-colors shadow-sm">
                Commencer gratuitement →
              </Link>
              <Link href="/login" className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 transition-colors">
                Se connecter
              </Link>
            </div>
          </div>
        </div>

        {/* 3 tâches EO */}
        <div className="max-w-4xl mx-auto px-4 py-10">
          <h2 className="text-lg font-black text-slate-800 mb-5 text-center">Les 3 tâches de l&apos;épreuve EO TCF Canada</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: '🗣️', label: 'Tâche 1 — Monologue', desc: 'Présenter un sujet de façon structurée pendant 2-3 minutes à partir d\'une image ou d\'un thème.', color: 'border-rose-200 bg-rose-50', badge: 'bg-rose-100 text-rose-700', duration: '2–3 min' },
              { icon: '💬', label: 'Tâche 2 — Interaction', desc: 'Échanger avec l\'examinateur, demander et donner des informations dans une situation de la vie courante.', color: 'border-orange-200 bg-orange-50', badge: 'bg-orange-100 text-orange-700', duration: '3–4 min' },
              { icon: '🎯', label: 'Tâche 3 — Point de vue', desc: 'Exprimer et défendre son opinion sur un sujet de société face à l\'examinateur.', color: 'border-pink-200 bg-pink-50', badge: 'bg-pink-100 text-pink-700', duration: '3–4 min' },
            ].map(t => (
              <div key={t.label} className={`rounded-2xl border p-5 ${t.color}`}>
                <div className="text-2xl mb-3">{t.icon}</div>
                <div className="font-black text-slate-800 text-sm mb-2">{t.label}</div>
                <p className="text-slate-500 text-xs leading-relaxed mb-3">{t.desc}</p>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${t.badge}`}>{t.duration}</span>
              </div>
            ))}
          </div>
        </div>

        {/* CTA bas */}
        <div className="max-w-4xl mx-auto px-4 pb-16 text-center">
          <div className="bg-gradient-to-r from-rose-600 to-pink-600 rounded-2xl p-8 text-white">
            <p className="font-black text-xl mb-2">2 épreuves complètes gratuites</p>
            <p className="text-rose-100 text-sm mb-5">Inscris-toi en 30 secondes — aucune carte bancaire requise</p>
            <Link href="/register" className="inline-block bg-white text-rose-700 font-black px-8 py-3 rounded-xl hover:bg-rose-50 transition-colors shadow">
              Créer mon compte →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (error || !config || config.series.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3 max-w-sm px-4">
          <div className="text-5xl">🎤</div>
          <h2 className="text-xl font-black text-slate-800">Aucune série disponible</h2>
          <p className="text-slate-500 text-sm">
            L&apos;administrateur n&apos;a pas encore généré les séries de formation EO. Revenez plus tard.
          </p>
          <Link href="/dashboard" className="inline-block mt-4 px-6 py-3 bg-white border border-slate-200 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm">
            ← Retour au tableau de bord
          </Link>
        </div>
      </div>
    );
  }

  const filtered = config.series.filter(s => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.t1.theme ?? s.t1.sessionGroup ?? '').toLowerCase().includes(q) ||
      (s.t2.theme ?? s.t2.sessionGroup ?? '').toLowerCase().includes(q) ||
      (s.t3.theme ?? s.t3.sessionGroup ?? '').toLowerCase().includes(q) ||
      String(s.id).includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-2">
            <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 text-sm font-medium transition-colors flex items-center gap-1">
              ← Tableau de bord
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2.5 mb-0.5">
                <div className="px-3 py-1 rounded-full bg-gradient-to-r from-rose-400 to-pink-500 text-white text-xs font-bold flex items-center gap-1.5">
                  <span>🎤</span><span>EO · Expression Orale</span>
                </div>
              </div>
              <h1 className="text-xl font-black text-slate-900">Épreuves officielles TCF Canada</h1>
              <p className="text-slate-500 text-xs mt-0.5">
                {config.series.length} épreuves complètes · Conditions réelles d&apos;examen · T1 × T2 × T3
                {config.savedAt && (
                  <span className="text-slate-400"> · Mise à jour le {new Date(config.savedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                )}
              </p>
            </div>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher par thème…"
              className="w-full sm:w-60 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Liste des séries */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-3">
        {/* Badge info abonnement */}
        {!isPaid && (
          <div className="flex items-center justify-between bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 mb-2">
            <div className="flex items-center gap-2 text-sm text-rose-700">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <span className="font-bold">{FREE_SERIES_COUNT} épreuves gratuites</span>
              <span className="text-rose-400">· le reste est réservé aux abonnés</span>
            </div>
            <a href="/pricing" className="text-xs font-black text-rose-600 hover:text-rose-800 whitespace-nowrap transition-colors">
              Voir les plans →
            </a>
          </div>
        )}

        {filtered.length === 0 && (
          <div className="text-center py-16 text-slate-400">
            <p className="text-lg font-medium">Aucune série ne correspond à &ldquo;{search}&rdquo;</p>
          </div>
        )}

        <AnimatePresence>
          {filtered.map((serie, idx) => {
            const isFree = serie.id <= FREE_SERIES_COUNT;
            const canAccess = isFree || isPaid;

            return (
              <motion.div key={serie.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.012, 0.5) }}>

                {canAccess ? (
                  <a
                    href={`/practice/EO?t1=${serie.t1.id}&t2=${serie.t2.id}&t3=${serie.t3.id}&serie=${serie.id}`}
                    className="flex items-center gap-3 px-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-rose-300 hover:bg-rose-50/30 transition-all cursor-pointer">

                    {/* Numéro */}
                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">
                      {serie.id}
                    </div>

                    {/* T1 T2 T3 résumé */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0">
                      {([1, 2, 3] as const).map(n => {
                        const task = n === 1 ? serie.t1 : n === 2 ? serie.t2 : serie.t3;
                        const m = TASK_META[n];
                        return (
                          <div key={n} className="min-w-0">
                            <div className={`text-xs font-black ${m.color} mb-0.5`}>{m.icon} T{n} — {m.label}</div>
                            <div className="text-sm font-bold text-slate-700 truncate">
                              {task.theme || task.sessionGroup || `Tâche ${n}`}
                            </div>
                            <div className="text-xs text-slate-400">{m.points} · {m.duration}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isFree && (
                        <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 mr-1">FREE</span>
                      )}
                      <div className="flex items-center gap-1.5 text-xs font-black px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors whitespace-nowrap shadow-sm">
                        🎤 Pratiquer
                      </div>
                    </div>
                  </a>
                ) : (
                  /* Carte verrouillée */
                  <a href="/pricing"
                    className="flex items-center gap-3 px-4 py-4 bg-gradient-to-r from-rose-50 to-pink-50 border-2 border-rose-100 hover:border-rose-300 rounded-2xl shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-rose-200/30 to-pink-200/30 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />

                    {/* Numéro */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-300 to-pink-400 flex items-center justify-center text-xs font-black text-white/80 flex-shrink-0 shadow">
                      {serie.id}
                    </div>

                    {/* T1 T2 T3 résumé (flouté) */}
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-2 min-w-0 opacity-50 select-none">
                      {([1, 2, 3] as const).map(n => {
                        const task = n === 1 ? serie.t1 : n === 2 ? serie.t2 : serie.t3;
                        const m = TASK_META[n];
                        return (
                          <div key={n} className="min-w-0">
                            <div className="text-xs font-black text-slate-500 mb-0.5">{m.icon} T{n} — {m.label}</div>
                            <div className="text-sm font-bold text-slate-500 truncate">
                              {task.theme || task.sessionGroup || `Tâche ${n}`}
                            </div>
                            <div className="text-xs text-slate-400">{m.points} · {m.duration}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA verrouillé */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs font-black bg-gradient-to-r from-rose-500 to-pink-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">Premium</span>
                      <span className="text-xs font-black text-rose-600 group-hover:text-pink-700 flex items-center gap-1 transition-colors whitespace-nowrap">
                        🔒 S&apos;abonner <span className="group-hover:translate-x-1 transition-transform">→</span>
                      </span>
                    </div>
                  </a>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Bannière upsell après les séries gratuites */}
        {!isPaid && filtered.length > FREE_SERIES_COUNT && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
            className="mt-4 bg-gradient-to-r from-rose-500 to-pink-600 rounded-2xl p-5 text-center text-white shadow-lg">
            <p className="font-black text-base mb-1">🔓 Déverrouillez toutes les épreuves EO</p>
            <p className="text-rose-100 text-sm mb-4">{filtered.length - FREE_SERIES_COUNT} épreuves supplémentaires · Coaching IA · Accès illimité</p>
            <a href="/pricing" className="inline-block bg-white text-rose-700 font-black px-6 py-2.5 rounded-xl text-sm hover:bg-rose-50 transition-colors shadow">
              Voir les abonnements →
            </a>
          </motion.div>
        )}
      </div>
    </div>
  );
}
