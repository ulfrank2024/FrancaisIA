'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Spinner from '../../components/Spinner';
import { api, ExerciseSubmission } from '../../lib/api';
import { useAuth } from '../../lib/auth-context';

const SECTION_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  EE: { label: 'Expression Écrite', icon: '✍️', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' },
  EO: { label: 'Expression Orale',  icon: '🎤', color: 'text-rose-600',    bg: 'bg-rose-50 border-rose-200' },
};

function StatusBadge({ status }: { status: 'pending' | 'corrected' }) {
  return status === 'corrected'
    ? <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">✓ Corrigé</span>
    : <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">⏳ En attente</span>;
}

function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) return null;
  const color = score >= 70 ? 'text-emerald-700 bg-emerald-50' : score >= 50 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-sm font-black ${color}`}>
      {score}/100
    </span>
  );
}

function SubmissionCard({ sub, onSelect, selected }: { sub: ExerciseSubmission; onSelect: () => void; selected: boolean }) {
  const meta = SECTION_META[sub.section] ?? SECTION_META.EE;
  const date = new Date(sub.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-2xl border transition-all cursor-pointer ${selected ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}
      onClick={onSelect}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className={`w-8 h-8 rounded-lg border flex items-center justify-center text-base ${meta.bg}`}>{meta.icon}</span>
            <div>
              <span className={`text-xs font-bold ${meta.color}`}>{meta.label}</span>
              <p className="text-xs text-slate-400">{date}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <ScoreBadge score={sub.score} />
            <StatusBadge status={sub.status} />
          </div>
        </div>
        <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{sub.question}</p>
        {sub.classId && (
          <div className="mt-2 text-xs text-indigo-500 font-medium flex items-center gap-1">
            🏫 {sub.className ?? 'Classe'}
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DetailPanel({ sub, onClose }: { sub: ExerciseSubmission; onClose: () => void }) {
  const meta = SECTION_META[sub.section] ?? SECTION_META.EE;
  const date = new Date(sub.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <motion.div key={sub.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className={`w-9 h-9 rounded-xl border flex items-center justify-center text-lg ${meta.bg}`}>{meta.icon}</span>
          <div>
            <p className="font-black text-slate-800 text-sm">{meta.label}</p>
            <p className="text-xs text-slate-400">{date}</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors text-lg">✕</button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {/* Score */}
        {sub.score !== undefined && sub.score !== null && (
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
            <div className={`text-3xl font-black ${sub.score >= 70 ? 'text-emerald-600' : sub.score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {sub.score}<span className="text-base font-medium text-slate-400">/100</span>
            </div>
            <div>
              <StatusBadge status={sub.status} />
              {sub.correctedAt && (
                <p className="text-xs text-slate-400 mt-1">Corrigé le {new Date(sub.correctedAt).toLocaleDateString('fr-CA')}</p>
              )}
            </div>
          </div>
        )}

        {/* Question */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Consigne</h3>
          <p className="text-sm text-slate-700 leading-relaxed bg-indigo-50 rounded-xl p-4">{sub.question}</p>
        </div>

        {/* Réponse */}
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Votre réponse</h3>
          <div className="text-sm text-slate-700 leading-relaxed bg-slate-50 rounded-xl p-4 whitespace-pre-wrap">{sub.answer}</div>
        </div>

        {/* Feedback */}
        {sub.feedback && (
          <div>
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Commentaire du professeur</h3>
            <div className="text-sm text-slate-700 leading-relaxed bg-amber-50 border border-amber-200 rounded-xl p-4">{sub.feedback}</div>
          </div>
        )}

        {/* Points forts */}
        {sub.strengths?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-emerald-600 uppercase tracking-wider mb-2">Points forts</h3>
            <ul className="space-y-1.5">
              {sub.strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-emerald-500 mt-0.5 flex-shrink-0">✓</span>{s}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Erreurs */}
        {sub.errors?.length > 0 && (
          <div>
            <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Points à améliorer</h3>
            <ul className="space-y-1.5">
              {sub.errors.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="text-red-400 mt-0.5 flex-shrink-0">→</span>{e}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* En attente */}
        {sub.status === 'pending' && (
          <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <span className="text-2xl">⏳</span>
            <div>
              <p className="text-sm font-bold text-amber-700">Correction en attente</p>
              <p className="text-xs text-amber-600">Votre professeur va corriger cette soumission prochainement.</p>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default function SubmissionsPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [submissions, setSubmissions] = useState<ExerciseSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ExerciseSubmission | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'corrected'>('all');

  useEffect(() => {
    if (!user) { router.push('/login'); return; }
    // Marquer les corrections comme vues
    if (typeof window !== 'undefined') {
      localStorage.setItem('reussirtcf_corrections_seen', Date.now().toString());
    }
    (async () => {
      try {
        const token = await getToken();
        const data = await api.submissions.listForStudent(user.id, token ?? undefined);
        setSubmissions(data.submissions);
      } catch {} finally { setLoading(false); }
    })();
  }, [user, router, getToken]);

  const filtered = submissions.filter(s => filter === 'all' || s.status === filter);
  const correctedCount = submissions.filter(s => s.status === 'corrected').length;
  const pendingCount   = submissions.filter(s => s.status === 'pending').length;
  const avgScore = submissions.filter(s => s.score != null).length
    ? Math.round(submissions.filter(s => s.score != null).reduce((a, b) => a + (b.score ?? 0), 0) / submissions.filter(s => s.score != null).length)
    : null;

  if (!user || loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={40} />
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-500 hover:text-indigo-600 text-sm font-medium flex items-center gap-1 transition-colors">
            ← Tableau de bord
          </Link>
          <span className="text-slate-300">|</span>
          <h1 className="font-black text-slate-800 text-sm">Mes Soumissions</h1>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Total',    value: submissions.length, icon: '📋', color: 'text-slate-700' },
            { label: 'Corrigés', value: correctedCount,     icon: '✅', color: 'text-emerald-600' },
            { label: 'En attente', value: pendingCount,     icon: '⏳', color: 'text-amber-600' },
            { label: 'Score moy.', value: avgScore != null ? `${avgScore}/100` : '—', icon: '🏆', color: 'text-indigo-600' },
          ].map(stat => (
            <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <div className="text-2xl mb-1">{stat.icon}</div>
              <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-400 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Filtres */}
        <div className="flex items-center gap-2 mb-6">
          {(['all', 'corrected', 'pending'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${filter === f ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'}`}>
              {f === 'all' ? 'Tout' : f === 'corrected' ? 'Corrigées' : 'En attente'}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h2 className="font-black text-slate-700 text-lg mb-2">Aucune soumission</h2>
            <p className="text-slate-400 text-sm mb-6">
              {filter === 'all' ? "Vous n'avez encore soumis aucun exercice à un professeur." : `Aucune soumission avec le statut "${filter === 'corrected' ? 'corrigé' : 'en attente'}".`}
            </p>
            <Link href="/practice/EE" className="inline-flex items-center gap-2 bg-indigo-600 text-white font-bold px-6 py-3 rounded-full text-sm hover:bg-indigo-700 transition-colors">
              Commencer un exercice
            </Link>
          </div>
        ) : (
          <div className="flex gap-6">
            {/* Liste */}
            <div className={`flex-1 space-y-3 ${selected ? 'hidden lg:block lg:max-w-[420px]' : ''}`}>
              <AnimatePresence mode="popLayout">
                {filtered.map(sub => (
                  <SubmissionCard key={sub.id} sub={sub}
                    selected={selected?.id === sub.id}
                    onSelect={() => setSelected(selected?.id === sub.id ? null : sub)} />
                ))}
              </AnimatePresence>
            </div>

            {/* Détail */}
            <AnimatePresence>
              {selected && (
                <div className="flex-1 min-h-[600px]">
                  <DetailPanel sub={selected} onClose={() => setSelected(null)} />
                </div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
