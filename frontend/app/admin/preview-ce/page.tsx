'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../components/Spinner';
import { adminApi, BankQuestion } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';

function isAdmin(userId: string) {
  return userId === process.env.NEXT_PUBLIC_ADMIN_USER_ID;
}

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-emerald-100 text-emerald-700',
  A2: 'bg-teal-100 text-teal-700',
  B1: 'bg-sky-100 text-sky-700',
  B2: 'bg-blue-100 text-blue-700',
  C1: 'bg-violet-100 text-violet-700',
  C2: 'bg-rose-100 text-rose-700',
};

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-black text-slate-900">{part}</strong> : part
  );
}

function PreviewCEInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading]     = useState(true);
  const [currentQ, setCurrentQ]   = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && !isAdmin(user.id)) { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.bank.list({ section: 'CE' });
      const sorted = [...data.questions].sort((a, b) => {
        const lvls = ['A1','A2','B1','B2','C1','C2'];
        return (lvls.indexOf(a.level) - lvls.indexOf(b.level)) || a.createdAt.localeCompare(b.createdAt);
      });
      setQuestions(sorted);

      // Sauter à la question demandée via ?id=
      const targetId = searchParams.get('id');
      if (targetId) {
        const idx = sorted.findIndex(q => q.id === targetId);
        if (idx >= 0) setCurrentQ(idx);
      }
    } catch {}
    finally { setLoading(false); }
  }, [searchParams]);

  useEffect(() => {
    if (user && isAdmin(user.id)) load();
  }, [user, load]);

  // Reset "show answer" quand on change de question
  useEffect(() => { setShowAnswer(false); }, [currentQ]);

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Spinner size={40} /></div>
  );

  const q = questions[currentQ];

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header simulé — comme côté client */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <Link href="/admin/dashboard" className="text-slate-400 text-sm font-medium flex items-center gap-1 hover:text-slate-600 transition-colors">
            ← Admin
          </Link>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 text-white text-xs font-bold flex items-center gap-1.5">
            <span>📖</span><span>CE · Compréhension Écrite</span>
          </div>
          <div className="flex-1" />
          {q && (
            <div className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-xl text-xs font-black">
              {currentQ + 1} / {questions.length}
            </div>
          )}
          <span className="hidden sm:inline text-xs font-bold text-red-400 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            Quitter l&apos;examen
          </span>
        </div>
      </div>

      {/* Bandeau admin */}
      <div className="bg-violet-600 text-white text-xs font-bold text-center py-1.5 tracking-wide select-none">
        👁 PRÉVISUALISATION ADMIN — Questions telles qu&apos;elles apparaissent aux étudiants
      </div>

      {questions.length === 0 ? (
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <span className="text-5xl block mb-4">📖</span>
          <p className="font-bold text-slate-600">Aucune question CE en banque</p>
          <Link href="/admin/dashboard" className="mt-4 inline-block bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
            Gérer la banque CE →
          </Link>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 flex gap-5">

          {/* Zone principale — réplique exacte du client */}
          <div className="flex-1 min-w-0 space-y-4">

            {/* Sophie simulée */}
            <div className="flex justify-center">
              <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">S</div>
                <p className="text-xs text-slate-600 font-medium">
                  Lisez attentivement chaque question et choisissez la meilleure réponse parmi les options proposées.
                </p>
              </div>
            </div>

            {/* Carte question — fidèle au client */}
            <AnimatePresence mode="wait">
              {q && (
                <motion.div key={q.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                  {/* En-tête question */}
                  <div className="bg-gradient-to-r from-violet-400 to-purple-500 px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white font-black text-sm">Question {currentQ + 1}</span>
                      <span className="text-white/60 text-xs">/ {questions.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {q.level && (
                        <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{q.level}</span>
                      )}
                      <span className="bg-black/10 text-white/70 text-xs px-2.5 py-0.5 rounded-full">Non répondue</span>
                    </div>
                  </div>

                  {/* Thème */}
                  {q.theme && (
                    <div className="px-5 pt-4 text-xs text-slate-400 font-semibold uppercase tracking-wider">
                      📄 {q.theme}
                    </div>
                  )}

                  {/* Texte question */}
                  <div className="px-5 py-4">
                    <p className="text-slate-800 font-medium text-base leading-relaxed whitespace-pre-line">
                      {q.question}
                    </p>
                  </div>

                  {/* Options QCM — grille 2 colonnes comme le client */}
                  {q.options && (
                    <div className="px-5 pb-4 grid grid-cols-2 gap-2.5">
                      {Object.entries(q.options).map(([key, val]) => {
                        const isCorrect = q.answer === key;
                        return (
                          <div key={key}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium flex items-start gap-3 text-sm
                              ${showAnswer && isCorrect
                                ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-white text-slate-700'}`}>
                            <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 mt-0.5
                              ${showAnswer && isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {key.toUpperCase()}
                            </span>
                            <span className="leading-snug">{renderBold(String(val))}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bandeau admin — réponse correcte */}
                  <div className="border-t border-slate-100 px-5 py-3 bg-amber-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-amber-600 font-bold">🔒 Admin</span>
                      {showAnswer && q.answer && (
                        <span className="text-xs text-emerald-700 font-black bg-emerald-100 px-2.5 py-1 rounded-lg">
                          ✓ Réponse correcte : {q.answer.toUpperCase()}
                        </span>
                      )}
                      {showAnswer && q.explanation && (
                        <span className="text-xs text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg max-w-md truncate">
                          {q.explanation}
                        </span>
                      )}
                    </div>
                    <button onClick={() => setShowAnswer(v => !v)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-colors border ${
                        showAnswer
                          ? 'bg-amber-200 text-amber-800 border-amber-300'
                          : 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200'
                      }`}>
                      {showAnswer ? 'Masquer la réponse' : '👁 Voir la réponse'}
                    </button>
                  </div>

                  {/* Explication complète dépliée */}
                  <AnimatePresence>
                    {showAnswer && q.explanation && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="border-t border-amber-100 overflow-hidden">
                        <div className="px-5 py-3 bg-amber-50/50">
                          <p className="text-xs text-amber-700 font-bold uppercase tracking-wider mb-1">Explication</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{q.explanation}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Navigation Précédent / Suivant */}
            <div className="flex items-center justify-between gap-3">
              <button onClick={() => setCurrentQ(i => Math.max(0, i - 1))} disabled={currentQ === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold hover:border-violet-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                ← Précédent
              </button>
              <div className="text-xs text-slate-500 text-center">
                <span className="font-black text-violet-600">{currentQ + 1}</span>
                <span className="text-slate-400"> / {questions.length} questions</span>
              </div>
              <button onClick={() => setCurrentQ(i => Math.min(questions.length - 1, i + 1))} disabled={currentQ === questions.length - 1}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                Suivant →
              </button>
            </div>
          </div>

          {/* Panneau navigation desktop */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20 space-y-4">

              <h3 className="font-black text-slate-800 text-sm">Navigation des questions</h3>

              {/* Légende */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500 inline-block" />Actuelle</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Autre</div>
              </div>

              {/* Grille */}
              <div className="grid grid-cols-7 gap-1 max-h-72 overflow-y-auto">
                {questions.map((qn, i) => (
                  <button key={qn.id} onClick={() => setCurrentQ(i)} title={`${qn.level} — ${qn.theme ?? ''}`}
                    className={`w-7 h-7 rounded text-xs font-bold transition-all
                      ${i === currentQ
                        ? 'bg-violet-500 text-white ring-2 ring-violet-300 ring-offset-1'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>

              {/* Infos question */}
              {q && (
                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Niveau</span>
                    <span className={`font-black px-2 py-0.5 rounded ${LEVEL_COLORS[q.level] ?? 'text-slate-700'}`}>{q.level}</span>
                  </div>
                  {q.theme && (
                    <div className="flex justify-between text-slate-500">
                      <span>Thème</span>
                      <span className="font-bold text-slate-600 max-w-[130px] truncate text-right">{q.theme}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-500">
                    <span>Options</span>
                    <span className="font-black">{Object.keys(q.options ?? {}).length} choix</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>ID</span>
                    <span className="font-mono text-slate-400 text-[10px] max-w-[120px] truncate">{q.id}</span>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <Link href={`/admin/dashboard?tab=banque-ce&highlight=${q?.id ?? ''}`}
                  className="block w-full py-2.5 rounded-xl text-white font-black text-xs bg-violet-600 hover:bg-violet-700 transition-colors text-center">
                  ✏️ Modifier cette question
                </Link>
                <Link href="/admin/dashboard"
                  className="block w-full py-2 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-100 transition-colors text-center border border-slate-200">
                  ← Retour Admin
                </Link>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default function PreviewCE() {
  return <Suspense fallback={null}><PreviewCEInner /></Suspense>;
}
