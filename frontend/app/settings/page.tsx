'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUser } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../components/Spinner';

type SectionCode = 'CO' | 'CE' | 'EE' | 'EO';
type ScoreTarget = { min: number; max: number; unit: string; nclc: number };

const PROGRAMS: Record<string, { label: string; icon: string; color: string; nclcMin: number | null; scores: Record<SectionCode, ScoreTarget> | null }> = {
  fsw:    { label: 'Entrée Express FSW',      icon: '🌟', color: 'from-indigo-500 to-violet-500', nclcMin: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_ab: { label: 'Entrée Express CEC NOC 0/A', icon: '🍁', color: 'from-red-500 to-rose-500',    nclcMin: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  cec_b:  { label: 'Entrée Express CEC NOC B',   icon: '🔧', color: 'from-orange-500 to-amber-500', nclcMin: 5, scores: { CO: { min: 369, max: 699, unit: '/699', nclc: 5 }, CE: { min: 375, max: 699, unit: '/699', nclc: 5 }, EE: { min: 6,  max: 20, unit: '/20', nclc: 5 }, EO: { min: 6,  max: 20, unit: '/20', nclc: 5 } } },
  pnp:    { label: 'PNP Provincial',             icon: '🏙️', color: 'from-teal-500 to-cyan-500',   nclcMin: 4, scores: { CO: { min: 331, max: 699, unit: '/699', nclc: 4 }, CE: { min: 342, max: 699, unit: '/699', nclc: 4 }, EE: { min: 4,  max: 20, unit: '/20', nclc: 4 }, EO: { min: 4,  max: 20, unit: '/20', nclc: 4 } } },
  peq:    { label: 'Québec PEQ',                 icon: '🌺', color: 'from-sky-500 to-blue-500',    nclcMin: 7, scores: { CO: { min: 458, max: 699, unit: '/699', nclc: 7 }, CE: { min: 453, max: 699, unit: '/699', nclc: 7 }, EE: { min: 10, max: 20, unit: '/20', nclc: 7 }, EO: { min: 10, max: 20, unit: '/20', nclc: 7 } } },
  family: { label: 'Regroupement familial',      icon: '👨‍👩‍👧', color: 'from-pink-500 to-rose-500',  nclcMin: null, scores: null },
};

const GOALS = [
  { key: 'immigration', icon: '🛂', label: 'Immigration au Canada',   sub: 'Résidence permanente',  color: 'from-indigo-500 to-violet-500', bg: 'bg-indigo-50', border: 'border-indigo-200' },
  { key: 'citizenship', icon: '🏛️', label: 'Citoyenneté canadienne', sub: 'CLB 4 oral seulement',   color: 'from-red-500 to-rose-500',       bg: 'bg-red-50',    border: 'border-red-200' },
  { key: 'studies',     icon: '🎓', label: 'Études au Canada',        sub: 'Université / Collège',  color: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-50', border: 'border-emerald-200' },
  { key: 'work',        icon: '💼', label: 'Trouver un emploi',       sub: 'Permis de travail',     color: 'from-amber-500 to-orange-500',   bg: 'bg-amber-50',  border: 'border-amber-200' },
  { key: 'general',     icon: '📚', label: 'Améliorer mon français',  sub: 'Objectif personnel',    color: 'from-slate-400 to-slate-600',    bg: 'bg-slate-50',  border: 'border-slate-200' },
];

export default function SettingsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const meta = (user?.unsafeMetadata ?? {}) as { role?: string; goal?: string; program?: string; completedOnboarding?: boolean };

  const [goal, setGoal] = useState<string>(meta.goal ?? '');
  const [program, setProgram] = useState<string>(meta.program ?? '');
  const [section, setSection] = useState<'goal' | 'program' | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isLoaded) return <div className="min-h-screen flex items-center justify-center"><Spinner size={36} /></div>;

  async function save(updates: object) {
    setSaving(true);
    setSaved(false);
    try {
      await user?.update({ unsafeMetadata: { ...meta, ...updates } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } finally {
      setSaving(false);
    }
  }

  async function handleGoalSave(g: string) {
    setGoal(g);
    setSection(null);
    if (g !== 'immigration') setProgram('');
    await save({ goal: g, program: g !== 'immigration' ? null : program });
  }

  async function handleProgramSave(p: string) {
    setProgram(p);
    setSection(null);
    await save({ program: p });
  }

  const currentGoal = GOALS.find(g => g.key === goal);
  const currentProgram = program ? PROGRAMS[program] : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 pb-12">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <Link href="/dashboard" className="text-slate-400 hover:text-indigo-600 transition-colors text-sm">← Dashboard</Link>
          <span className="text-slate-200">|</span>
          <h1 className="font-black text-slate-800 text-base">Paramètres du profil</h1>
          {saving && <Spinner size={16} />}
          {saved && <span className="text-emerald-500 text-xs font-bold animate-fade-in">✓ Sauvegardé</span>}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-8 space-y-4">

        {/* Infos compte */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 flex items-center gap-4">
          <img src={user?.imageUrl || `https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${user?.id}&backgroundColor=b6e3f4`}
            className="w-14 h-14 rounded-full border-2 border-indigo-100" alt="Avatar" />
          <div>
            <div className="font-black text-slate-800">{user?.fullName || user?.firstName || 'Utilisateur'}</div>
            <div className="text-sm text-slate-500">{user?.primaryEmailAddress?.emailAddress}</div>
            <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 text-xs font-bold px-2 py-0.5 rounded-full mt-1 capitalize">
              {meta.role === 'apprenant' ? '🎓 Apprenant(e)' : meta.role === 'professeur' ? '👨‍🏫 Professeur(e)' : meta.role ?? '?'}
            </div>
          </div>
        </motion.div>

        {/* Objectif actuel */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
            <div>
              <div className="font-black text-slate-800 text-sm">Ton objectif TCF</div>
              <div className="text-xs text-slate-400 mt-0.5">
                {currentGoal ? <span className="flex items-center gap-1">{currentGoal.icon} {currentGoal.label}</span> : 'Non défini'}
              </div>
            </div>
            <button onClick={() => setSection(section === 'goal' ? null : 'goal')}
              className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
              {section === 'goal' ? 'Annuler' : 'Modifier'}
            </button>
          </div>

          <AnimatePresence>
            {section === 'goal' && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden">
                <div className="p-4 space-y-2">
                  {GOALS.map(g => (
                    <button key={g.key} onClick={() => handleGoalSave(g.key)}
                      className={`flex items-center gap-3 w-full text-left ${g.bg} border-2 rounded-xl px-4 py-3 transition-all
                        ${goal === g.key ? g.border + ' shadow-sm' : 'border-transparent hover:border-slate-200'}`}>
                      <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${g.color} flex items-center justify-center text-base shadow flex-shrink-0`}>
                        {g.icon}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-bold text-slate-800 text-sm">{g.label}</div>
                        <div className="text-xs text-slate-500">{g.sub}</div>
                      </div>
                      {goal === g.key && <span className="text-emerald-500 font-black text-sm">✓</span>}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Programme (seulement si immigration) */}
        {goal === 'immigration' && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-50">
              <div>
                <div className="font-black text-slate-800 text-sm">Programme d'immigration</div>
                <div className="text-xs text-slate-400 mt-0.5">
                  {currentProgram ? <span className="flex items-center gap-1">{currentProgram.icon} {currentProgram.label}</span> : 'Non défini'}
                </div>
              </div>
              <button onClick={() => setSection(section === 'program' ? null : 'program')}
                className="text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors">
                {section === 'program' ? 'Annuler' : 'Modifier'}
              </button>
            </div>

            <AnimatePresence>
              {section === 'program' && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden">
                  <div className="p-4 space-y-2">
                    {Object.entries(PROGRAMS).map(([key, prog]) => (
                      <button key={key} onClick={() => handleProgramSave(key)}
                        className={`flex items-center gap-3 w-full text-left bg-slate-50 border-2 rounded-xl px-4 py-3 transition-all
                          ${program === key ? 'border-indigo-300 bg-indigo-50' : 'border-transparent hover:border-slate-200'}`}>
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${prog.color} flex items-center justify-center text-base shadow flex-shrink-0`}>
                          {prog.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-bold text-slate-800 text-sm">{prog.label}</div>
                          {prog.nclcMin && <div className="text-xs text-slate-500">NCLC {prog.nclcMin} minimum</div>}
                        </div>
                        {program === key && <span className="text-emerald-500 font-black text-sm">✓</span>}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Scores cibles (résumé) */}
        {(currentProgram?.scores || goal === 'citizenship') && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            className="bg-slate-900 rounded-2xl p-5 text-white">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Scores TCF cibles actuels</div>
            <div className="grid grid-cols-2 gap-3">
              {(['CO', 'CE', 'EE', 'EO'] as SectionCode[]).map(code => {
                const scores = currentProgram?.scores ?? {
                  CO: { min: 331, max: 699, unit: '/699', nclc: 4 },
                  CE: null, EE: null,
                  EO: { min: 4, max: 20, unit: '/20', nclc: 4 },
                } as Record<SectionCode, ScoreTarget | null>;
                const t = scores[code];
                return (
                  <div key={code} className={`rounded-xl p-3 ${t ? 'bg-white/10' : 'bg-white/5 opacity-40'}`}>
                    <div className="text-xs font-black text-white">{code}</div>
                    {t ? (
                      <>
                        <div className="text-lg font-black text-indigo-300">{t.min}<span className="text-xs text-slate-400 font-normal">{t.unit}</span></div>
                        <div className="text-xs text-slate-400">NCLC {t.nclc}</div>
                      </>
                    ) : (
                      <div className="text-xs text-slate-500 mt-1">Non requis</div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Danger zone */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
          className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5 space-y-3">
          <div className="text-sm font-black text-slate-700">Autres actions</div>
          <button
            onClick={() => { setSection(null); router.push('/dashboard'); }}
            className="w-full text-left text-sm text-slate-600 hover:text-indigo-600 flex items-center gap-2 py-2 transition-colors">
            📊 Retour au dashboard
          </button>
          <button
            onClick={async () => {
              if (!confirm('Réinitialiser ton profil ? Tu devras refaire la configuration.')) return;
              await user?.update({ unsafeMetadata: { role: null, goal: null, program: null, completedOnboarding: false } });
              router.push('/onboarding');
            }}
            className="w-full text-left text-sm text-red-400 hover:text-red-600 flex items-center gap-2 py-2 transition-colors">
            🔄 Réinitialiser mon profil
          </button>
        </motion.div>

      </div>
    </div>
  );
}
