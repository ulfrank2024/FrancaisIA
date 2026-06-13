'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import SophieAvatar from '../../components/SophieAvatar';

// ── Données officielles TCF Canada (source : France Éducation International) ─
type SectionCode = 'CO' | 'CE' | 'EE' | 'EO';

type ScoreTarget = {
  min: number;
  max: number;
  unit: string;
  nclc: number;
};

type ProgramData = {
  label: string;
  shortLabel: string;
  icon: string;
  nclcMin: number | null;
  description: string;
  detail: string;
  scores: Record<SectionCode, ScoreTarget> | null;
  color: string;
};

const PROGRAMS: Record<string, ProgramData> = {
  fsw: {
    label: 'Entrée Express — Travailleurs qualifiés fédéraux (FSW)',
    shortLabel: 'Entrée Express FSW',
    icon: '🌟',
    nclcMin: 7,
    description: 'Programme des travailleurs qualifiés fédéraux — le plus populaire pour la résidence permanente.',
    detail: 'NCLC 7 obligatoire dans les 4 compétences. Chaque point au-dessus booste ton score CRS.',
    color: 'from-indigo-500 to-violet-500',
    scores: {
      CO: { min: 458, max: 699, unit: '/699', nclc: 7 },
      CE: { min: 453, max: 699, unit: '/699', nclc: 7 },
      EE: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
      EO: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
    },
  },
  cec_ab: {
    label: 'Entrée Express — Expérience canadienne (CEC) NOC 0/A',
    shortLabel: 'Entrée Express CEC NOC 0/A',
    icon: '🍁',
    nclcMin: 7,
    description: 'Classe de l\'expérience canadienne pour les postes de gestion et professionnels.',
    detail: 'NCLC 7 dans les 4 compétences. Idéal si tu as déjà de l\'expérience de travail au Canada.',
    color: 'from-red-500 to-rose-500',
    scores: {
      CO: { min: 458, max: 699, unit: '/699', nclc: 7 },
      CE: { min: 453, max: 699, unit: '/699', nclc: 7 },
      EE: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
      EO: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
    },
  },
  cec_b: {
    label: 'Entrée Express — Expérience canadienne (CEC) NOC B',
    shortLabel: 'Entrée Express CEC NOC B',
    icon: '🔧',
    nclcMin: 5,
    description: 'Classe de l\'expérience canadienne pour les métiers spécialisés.',
    detail: 'NCLC 5 suffit dans les 4 compétences — objectif plus accessible.',
    color: 'from-orange-500 to-amber-500',
    scores: {
      CO: { min: 369, max: 699, unit: '/699', nclc: 5 },
      CE: { min: 375, max: 699, unit: '/699', nclc: 5 },
      EE: { min: 6,   max: 20,  unit: '/20',  nclc: 5 },
      EO: { min: 6,   max: 20,  unit: '/20',  nclc: 5 },
    },
  },
  pnp: {
    label: 'Programme des Candidats des Provinces (PNP)',
    shortLabel: 'PNP Provincial',
    icon: '🏙️',
    nclcMin: 4,
    description: 'Chaque province a ses propres critères de sélection.',
    detail: 'Minimum NCLC 4 (varie selon la province). Consulte le programme de ta province cible.',
    color: 'from-teal-500 to-cyan-500',
    scores: {
      CO: { min: 331, max: 699, unit: '/699', nclc: 4 },
      CE: { min: 342, max: 699, unit: '/699', nclc: 4 },
      EE: { min: 4,   max: 20,  unit: '/20',  nclc: 4 },
      EO: { min: 4,   max: 20,  unit: '/20',  nclc: 4 },
    },
  },
  peq: {
    label: 'Québec — Programme de l\'expérience québécoise (PEQ)',
    shortLabel: 'Québec PEQ',
    icon: '🌺',
    nclcMin: 7,
    description: 'Programme spécifique au Québec pour les travailleurs temporaires et étudiants.',
    detail: 'NCLC 7 en compréhension et expression orales. La compréhension écrite n\'est pas exigée.',
    color: 'from-sky-500 to-blue-500',
    scores: {
      CO: { min: 458, max: 699, unit: '/699', nclc: 7 },
      CE: { min: 453, max: 699, unit: '/699', nclc: 7 },
      EE: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
      EO: { min: 10,  max: 20,  unit: '/20',  nclc: 7 },
    },
  },
  family: {
    label: 'Regroupement familial',
    shortLabel: 'Regroupement familial',
    icon: '👨‍👩‍👧',
    nclcMin: null,
    description: 'Rejoindre un membre de ta famille déjà résident permanent ou citoyen canadien.',
    detail: 'Aucun score minimum requis. Le TCF Canada n\'est généralement pas obligatoire pour ce programme.',
    color: 'from-pink-500 to-rose-500',
    scores: null,
  },
};

const GOALS = [
  { key: 'immigration', icon: '🛂', label: 'Immigration au Canada', sub: 'Résidence permanente', color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'citizenship', icon: '🏛️', label: 'Citoyenneté canadienne', sub: 'CLB 4 oral seulement', color: 'from-red-500 to-rose-500', bg: 'bg-red-50', border: 'border-red-200' },
  { key: 'studies',     icon: '🎓', label: 'Études au Canada',       sub: 'Université / Collège', color: 'from-emerald-500 to-teal-500', bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'work',        icon: '💼', label: 'Trouver un emploi',       sub: 'Permis de travail', color: 'from-amber-500 to-orange-500', bg: 'bg-amber-50', border: 'border-amber-200' },
  { key: 'general',     icon: '📚', label: 'Améliorer mon français',  sub: 'Objectif personnel', color: 'from-slate-400 to-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
];

const SECTION_META: Record<SectionCode, { label: string; icon: string; desc: string; duration: string; questions: string }> = {
  CO: { label: 'Compréhension Orale',  icon: '🎧', desc: '39 QCM — 35 min', duration: '35 min', questions: '39 QCM' },
  CE: { label: 'Compréhension Écrite', icon: '📖', desc: '39 QCM — 60 min', duration: '60 min', questions: '39 QCM' },
  EE: { label: 'Expression Écrite',    icon: '✍️', desc: '3 tâches — 60 min', duration: '60 min', questions: '3 tâches' },
  EO: { label: 'Expression Orale',     icon: '🎤', desc: '3 tâches — 12 min', duration: '12 min', questions: '3 tâches' },
};

const SECTION_COLORS: Record<SectionCode, string> = {
  CO: 'from-sky-400 to-cyan-500',
  CE: 'from-violet-400 to-purple-500',
  EE: 'from-emerald-400 to-teal-500',
  EO: 'from-rose-400 to-pink-500',
};

type Step = 'goal' | 'program' | 'result';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useUser();
  const [step, setStep] = useState<Step>('goal');
  const [goal, setGoal] = useState<string | null>(null);
  const [program, setProgram] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedProgram = program ? PROGRAMS[program] : null;

  // Scores pour citoyenneté (seulement oral)
  const citizenshipScores: Record<SectionCode, ScoreTarget | null> = {
    CO: { min: 331, max: 699, unit: '/699', nclc: 4 },
    CE: null,
    EE: null,
    EO: { min: 4, max: 20, unit: '/20', nclc: 4 },
  };

  async function handleGoalSelect(g: string) {
    setGoal(g);
    if (g === 'immigration') {
      setStep('program');
    } else {
      setStep('result');
    }
  }

  async function handleFinish() {
    setSaving(true);
    try {
      await user?.update({
        unsafeMetadata: {
          ...(user.unsafeMetadata ?? {}),
          goal,
          program: goal === 'immigration' ? program : null,
          completedOnboarding: true,
        },
      });
    } catch {}
    router.push('/dashboard');
  }

  const getResultScores = (): Record<SectionCode, ScoreTarget | null> | null => {
    if (goal === 'immigration' && selectedProgram) return selectedProgram.scores;
    if (goal === 'citizenship') return citizenshipScores;
    return null;
  };

  const resultScores = getResultScores();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">

        {/* Logo */}
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">FrançaisIA</span>
          <div className="flex justify-center gap-2 mt-4">
            {(['goal', 'program', 'result'] as Step[]).map((s, i) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  s === 'program' && goal !== 'immigration' ? 'hidden' :
                  step === s ? 'w-10 bg-indigo-600' :
                  (['goal', 'program', 'result'].indexOf(step) > i) ? 'w-6 bg-indigo-300' : 'w-6 bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">

          {/* ── ÉTAPE 1 : Objectif ─────────────────────────── */}
          {step === 'goal' && (
            <motion.div
              key="goal"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <SophieAvatar mood="idle" size="sm" showMessage={false} />
                <div className="text-center">
                  <h1 className="text-2xl font-black text-slate-900">Bienvenue ! Je suis Sophie 👋</h1>
                  <p className="text-slate-500 mt-2">Dis-moi ton objectif pour personnaliser ta préparation</p>
                </div>
              </div>

              <div className="grid gap-3">
                {GOALS.map(g => (
                  <motion.button
                    key={g.key}
                    onClick={() => handleGoalSelect(g.key)}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className={`flex items-center gap-4 w-full text-left ${g.bg} border-2 ${g.border} rounded-2xl px-5 py-4 hover:shadow-md transition-all group`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center text-xl shadow flex-shrink-0`}>
                      {g.icon}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">{g.label}</div>
                      <div className="text-sm text-slate-500">{g.sub}</div>
                    </div>
                    <span className="text-slate-300 group-hover:text-indigo-500 transition-colors text-xl">→</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── ÉTAPE 2 : Type d'immigration ───────────────── */}
          {step === 'program' && (
            <motion.div
              key="program"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <SophieAvatar mood="explain" size="sm" showMessage={false} />
                <div className="text-center">
                  <h1 className="text-2xl font-black text-slate-900">Quel programme vises-tu ?</h1>
                  <p className="text-slate-500 mt-2">Je vais calculer tes scores TCF minimum à atteindre</p>
                </div>
              </div>

              <div className="grid gap-3">
                {Object.entries(PROGRAMS).map(([key, prog]) => (
                  <motion.button
                    key={key}
                    onClick={() => { setProgram(key); setStep('result'); }}
                    whileHover={{ scale: 1.02, x: 4 }}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-4 w-full text-left bg-white border-2 border-slate-100 rounded-2xl px-5 py-4 hover:border-indigo-300 hover:shadow-md transition-all group"
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${prog.color} flex items-center justify-center text-xl shadow flex-shrink-0`}>
                      {prog.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-slate-800 text-sm leading-tight">{prog.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{prog.description}</div>
                    </div>
                    {prog.nclcMin && (
                      <div className="text-xs font-black text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full flex-shrink-0">
                        NCLC {prog.nclcMin}+
                      </div>
                    )}
                  </motion.button>
                ))}
              </div>

              <button onClick={() => setStep('goal')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors w-full text-center">
                ← Retour
              </button>
            </motion.div>
          )}

          {/* ── ÉTAPE 3 : Résultat + scores cibles ─────────── */}
          {step === 'result' && (
            <motion.div
              key="result"
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="space-y-6"
            >
              <div className="flex flex-col items-center gap-4">
                <SophieAvatar mood="celebrate" size="sm" showMessage={false} />
                <div className="text-center">
                  <h1 className="text-2xl font-black text-slate-900">Ton plan de préparation TCF</h1>
                  {selectedProgram && (
                    <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5 mt-2">
                      <span>{selectedProgram.icon}</span>
                      <span className="text-sm text-indigo-700 font-semibold">{selectedProgram.shortLabel}</span>
                    </div>
                  )}
                  {goal === 'citizenship' && (
                    <div className="inline-flex items-center gap-2 bg-red-50 border border-red-100 rounded-full px-4 py-1.5 mt-2">
                      <span>🏛️</span>
                      <span className="text-sm text-red-700 font-semibold">Citoyenneté canadienne</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Structure officielle de l'examen */}
              <div className="bg-slate-900 rounded-2xl p-5 text-white">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Structure officielle TCF Canada</div>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(SECTION_META) as SectionCode[]).map(code => {
                    const meta = SECTION_META[code];
                    return (
                      <div key={code} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_COLORS[code]} flex items-center justify-center text-sm flex-shrink-0`}>
                          {meta.icon}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white">{code} — {meta.duration}</div>
                          <div className="text-xs text-slate-400">{meta.questions}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-slate-700 flex justify-between text-xs text-slate-400">
                  <span>⏱ Durée totale : ~2h47</span>
                  <span>📅 Validité : 2 ans</span>
                </div>
              </div>

              {/* Scores cibles */}
              {resultScores ? (
                <div>
                  <div className="text-sm font-bold text-slate-700 mb-3">
                    {selectedProgram ? `Scores minimum NCLC ${selectedProgram.nclcMin} requis` : 'Scores NCLC 4 requis (oral uniquement)'}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {(Object.keys(SECTION_META) as SectionCode[]).map(code => {
                      const target = resultScores[code];
                      const meta = SECTION_META[code];
                      return (
                        <div
                          key={code}
                          className={`rounded-2xl p-4 border-2 ${
                            target
                              ? 'bg-white border-indigo-100'
                              : 'bg-slate-50 border-slate-100 opacity-50'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_COLORS[code]} flex items-center justify-center text-sm`}>
                              {meta.icon}
                            </div>
                            <div>
                              <div className="text-xs font-black text-slate-800">{code}</div>
                              <div className="text-xs text-slate-400">{meta.label.split(' ')[1] ?? ''}</div>
                            </div>
                          </div>
                          {target ? (
                            <>
                              <div className="text-2xl font-black text-indigo-700">
                                {target.min}<span className="text-sm text-slate-400 font-normal">{target.unit}</span>
                              </div>
                              <div className="text-xs text-slate-500 mt-0.5">
                                NCLC {target.nclc} minimum
                              </div>
                              {/* Barre de progression visuelle */}
                              <div className="mt-2 h-1.5 bg-slate-100 rounded-full">
                                <div
                                  className={`h-1.5 bg-gradient-to-r ${SECTION_COLORS[code]} rounded-full`}
                                  style={{ width: `${(target.min / target.max) * 100}%` }}
                                />
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                Objectif : {Math.round((target.min / target.max) * 100)}% du score max
                              </div>
                            </>
                          ) : (
                            <div className="text-xs text-slate-400 italic mt-2">Non requis pour ce programme</div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {selectedProgram && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mt-3">
                      <div className="text-xs font-bold text-amber-800 mb-1">💡 Conseil Sophie</div>
                      <p className="text-xs text-amber-700">{selectedProgram.detail}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 text-center">
                  <div className="text-3xl mb-2">
                    {goal === 'studies' ? '🎓' : goal === 'work' ? '💼' : '📚'}
                  </div>
                  <div className="font-bold text-slate-800 mb-1">
                    {goal === 'studies' ? 'Score selon ton établissement cible' :
                     goal === 'work' ? 'Score selon ton employeur' :
                     'Progression à ton rythme'}
                  </div>
                  <p className="text-sm text-slate-500">
                    {goal === 'studies' ? 'La plupart des universités canadiennes exigent B2 (score 400+). Sophie t\'entraîne jusqu\'à C1.' :
                     goal === 'work' ? 'Les permis de travail nécessitent généralement B1-B2. Sophie adapte ton entraînement.' :
                     'Pratique les 4 compétences à ton rythme. Sophie suit ta progression.'}
                  </p>
                </div>
              )}

              {goal === 'immigration' && !program && (
                <button onClick={() => setStep('program')} className="text-sm text-slate-400 hover:text-slate-600 transition-colors w-full text-center">
                  ← Choisir un autre programme
                </button>
              )}

              <motion.button
                onClick={handleFinish}
                disabled={saving}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-black py-4 rounded-2xl shadow-lg hover:shadow-xl transition-all text-base disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <><span className="animate-spin">⏳</span> Enregistrement...</>
                ) : (
                  <>🚀 Commencer l&apos;entraînement avec Sophie</>
                )}
              </motion.button>

              <p className="text-xs text-center text-slate-400">
                Tu pourras modifier ton objectif à tout moment depuis ton profil
              </p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
