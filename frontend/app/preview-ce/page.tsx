'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ExamWatermark, ExamSignature, useExamProtection } from '../../components/ExamProtection';

const QUESTION = {
  level: 'C2',
  theme: 'culture',
  passage: `Treize jeunes cinéastes, achevant leur formation dans les plus prestigieuses écoles d'animation, ont planché sur quelques vers de Paul Éluard, livrant leur vision originale de son univers poétique.

S'inscrivant dans la suite des programmes de courts-métrages dédiés à Prévert et Apollinaire, ce nouveau florilège de la série « En sortant de l'école » met en lumière l'œuvre d'un « apparent surréaliste » dont la notoriété est souvent, hélas, réduite au seul - et incontournable - poème Liberté… Sa délicatesse, en amour comme en fantaisie, s'avère un combustible merveilleux pour de jeunes cinéastes.`,
  question: `Selon cette critique, quel est l'apport de ce dernier ensemble de courts-métrages ?`,
  options: {
    a: "Il constitue une **création artistique** novatrice.",
    b: "Il établit des **ponts** avec d'autres auteurs.",
    c: "Il fait **connaître les travaux** d'un écrivain.",
    d: "Il ouvre la voie à de **prochaines réalisations**.",
  },
  answer: 'c',
  explanation: "Le texte indique que la série « met en lumière l'œuvre » de Paul Éluard — ce qui correspond à faire connaître les travaux d'un écrivain.",
};

function renderBold(text: string) {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-black text-slate-900">{part}</strong>
      : part
  );
}

type Phase = 'question' | 'result';

export default function PreviewCE() {
  const [selected, setSelected]     = useState<string | null>(null);
  const [phase, setPhase]           = useState<Phase>('question');
  const [showPassage, setShowPassage] = useState(true);

  // Protection anti-plagiat sur toute la zone de contenu
  const protectedRef = useExamProtection(true);

  const isCorrect = selected === QUESTION.answer;

  function handleSubmit() { if (selected) setPhase('result'); }
  function reset() { setSelected(null); setPhase('question'); setShowPassage(true); }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header simulé */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-2.5 flex items-center gap-3">
          <button className="text-slate-400 text-sm font-medium flex items-center gap-1">← Séries</button>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 text-white text-xs font-bold flex items-center gap-1.5">
            <span>📖</span><span>CE · Compréhension Écrite</span>
          </div>
          <div className="flex-1" />
          <div className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl font-mono font-black text-base">
            ⏱ 59:47
          </div>
          <span className="hidden sm:inline text-xs font-bold text-red-400 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
            Quitter l&apos;examen
          </span>
        </div>
      </div>

      {/* Badge prévisualisation */}
      <div className="bg-violet-600 text-white text-xs font-bold text-center py-1.5 tracking-wide select-none">
        👁 PRÉVISUALISATION — Question telle qu&apos;elle apparaîtra aux étudiants
      </div>

      <div className="max-w-5xl mx-auto px-3 sm:px-4 py-5 flex gap-5">

        {/* Zone protégée */}
        <div
          ref={protectedRef}
          className="flex-1 min-w-0 space-y-4"
          style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Sophie */}
          <div className="flex justify-center">
            <div className="flex items-center gap-3 bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-100">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center text-white font-black text-sm flex-shrink-0">S</div>
              <p className="text-xs text-slate-600 font-medium select-none">
                {phase === 'question'
                  ? 'Lisez attentivement le texte avant de répondre.'
                  : isCorrect
                    ? 'Excellente réponse ! Très bonne analyse du texte.'
                    : "Pas tout à fait — relisez l'objectif de la série."}
              </p>
            </div>
          </div>

          {/* Carte question — position relative pour le filigrane */}
          <motion.div layout className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">

            {/* ── Filigrane ── */}
            <ExamWatermark />

            {/* En-tête */}
            <div className="bg-gradient-to-r from-violet-400 to-purple-500 px-5 py-3 flex items-center justify-between relative z-20">
              <div className="flex items-center gap-2">
                <span className="text-white font-black text-sm">Question 1</span>
                <span className="text-white/60 text-xs">/ 39</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{QUESTION.level}</span>
                {selected && phase === 'question' && (
                  <span className="bg-white/30 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">✓ Répondue</span>
                )}
              </div>
            </div>

            {/* Thème */}
            <div className="px-5 pt-4 text-xs text-slate-400 font-semibold uppercase tracking-wider relative z-20 select-none">
              📄 {QUESTION.theme}
            </div>

            {/* Passage de lecture */}
            <div className="px-5 pt-3 relative z-20">
              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-violet-600 uppercase tracking-wider select-none">📖 Texte de lecture</span>
                  <button onClick={() => setShowPassage(v => !v)}
                    className="text-xs text-violet-400 hover:text-violet-600 transition-colors font-medium">
                    {showPassage ? 'Réduire ▲' : 'Lire le texte ▼'}
                  </button>
                </div>
                <AnimatePresence>
                  {showPassage && (
                    <motion.p
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="text-sm text-slate-700 leading-relaxed whitespace-pre-line overflow-hidden select-none"
                      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                    >
                      {QUESTION.passage}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Question */}
            <div className="px-5 py-4 relative z-20">
              <p
                className="text-slate-800 font-semibold text-base leading-relaxed select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
              >
                {QUESTION.question}
              </p>
            </div>

            {/* Options */}
            <div className="px-5 pb-3 grid grid-cols-2 gap-2.5 relative z-20">
              {Object.entries(QUESTION.options).map(([key, val]) => {
                const isSelected = selected === key;
                const isAnswer   = key === QUESTION.answer;

                let style = 'border-slate-200 bg-white hover:border-violet-300 hover:bg-violet-50/40 text-slate-700';
                if (phase === 'result') {
                  if (isAnswer)              style = 'border-emerald-500 bg-emerald-50 text-emerald-800';
                  else if (isSelected)       style = 'border-red-400 bg-red-50 text-red-700';
                  else                       style = 'border-slate-100 bg-slate-50 text-slate-400';
                } else if (isSelected) {
                  style = 'border-violet-500 bg-violet-50 text-violet-700';
                }

                let keyStyle = 'bg-slate-100 text-slate-600';
                if (phase === 'result') {
                  if (isAnswer)              keyStyle = 'bg-emerald-500 text-white';
                  else if (isSelected)       keyStyle = 'bg-red-400 text-white';
                } else if (isSelected) {
                  keyStyle = 'bg-violet-500 text-white';
                }

                return (
                  <motion.button key={key}
                    onClick={() => phase === 'question' && setSelected(key)}
                    whileHover={phase === 'question' ? { scale: 1.005 } : {}}
                    whileTap={phase === 'question' ? { scale: 0.998 } : {}}
                    className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all flex items-start gap-3 text-sm select-none ${style} ${phase === 'result' ? 'cursor-default' : 'cursor-pointer'}`}
                    style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
                  >
                    <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${keyStyle}`}>
                      {phase === 'result' && isAnswer ? '✓' : phase === 'result' && isSelected ? '✗' : key.toUpperCase()}
                    </span>
                    <span className="leading-snug">{renderBold(val)}</span>
                  </motion.button>
                );
              })}
            </div>

            {/* ── Signature URL ── */}
            <div className="relative z-20">
              <ExamSignature />
            </div>
          </motion.div>

          {/* Boutons navigation */}
          <div className="flex items-center justify-between gap-3">
            <button disabled className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-300 font-bold text-sm cursor-not-allowed">
              ← Précédent
            </button>
            <div className="text-xs text-slate-500 text-center">
              <span className="font-black text-emerald-600">{selected && phase === 'result' ? 1 : 0}</span>
              <span className="text-slate-400"> / 1 répondue</span>
            </div>
            {phase === 'question' ? (
              <button onClick={handleSubmit} disabled={!selected}
                className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold text-sm shadow transition-all
                  ${selected ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-slate-300 cursor-not-allowed'}`}>
                {selected ? '✓ Valider ma réponse' : 'Choisissez une option →'}
              </button>
            ) : (
              <button onClick={reset}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm shadow transition-all">
                ↩ Recommencer
              </button>
            )}
          </div>
        </div>

        {/* Panneau navigation desktop */}
        <div className="hidden lg:block w-64 flex-shrink-0">
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
            <h3 className="font-black text-slate-800 text-sm mb-3">Navigation des questions</h3>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4 text-slate-500">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-violet-500 inline-block" />Actuelle</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Répondue</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Non rép.</div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-4">
              {Array.from({ length: 39 }, (_, i) => (
                <button key={i}
                  className={`w-7 h-7 rounded text-xs font-bold transition-all
                    ${i === 0
                      ? selected && phase === 'result'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-violet-500 text-white ring-2 ring-violet-300 ring-offset-1'
                      : 'bg-slate-100 text-slate-400'}`}>
                  {i + 1}
                </button>
              ))}
            </div>
            <div className="border-t border-slate-100 pt-3 mb-4 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-500"><span>Répondues</span><span className="font-black text-emerald-600">{selected && phase === 'result' ? 1 : 0}</span></div>
              <div className="flex justify-between text-slate-500"><span>Non répondues</span><span className="font-black">{selected && phase === 'result' ? 38 : 39}</span></div>
              <div className="flex justify-between text-slate-500"><span>Total</span><span className="font-black">39</span></div>
            </div>
            <button className="w-full py-3 rounded-xl text-white font-black text-sm bg-slate-300 cursor-not-allowed mb-2">
              Soumettre (0/39)
            </button>
            <button className="w-full py-2 rounded-xl text-red-400 font-bold text-xs border border-red-200 hover:bg-red-50 transition-all">
              Quitter l&apos;examen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
