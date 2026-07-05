'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getClerkToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  try { return await (window as any).Clerk?.session?.getToken() ?? null; } catch { return null; }
}

interface SurveyModalProps {
  userId: string;
  section: string;
  resultId?: string;
  onClose: () => void;
}

const STARS = [1, 2, 3, 4, 5];
const LABELS: Record<number, string> = {
  1: 'Très difficile 😞',
  2: 'Difficile 😕',
  3: 'Correct 😐',
  4: 'Bien 🙂',
  5: 'Excellent ! 🎉',
};
const SECTION_NAMES: Record<string, string> = {
  CO: 'Compréhension Orale',
  CE: 'Compréhension Écrite',
  EE: 'Expression Écrite',
  EO: 'Expression Orale',
};

export default function SurveyModal({ userId, section, resultId, onClose }: SurveyModalProps) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const active = hovered || selected;

  async function handleSubmit() {
    if (!selected) return;
    setSubmitting(true);
    try {
      const token = await getClerkToken();
      await fetch(`${BASE}/api/surveys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ userId, section, resultId, rating: selected, comment: comment.trim() || undefined }),
      });
      // Marquer en localStorage pour ne plus afficher pour cette session
      if (resultId) localStorage.setItem(`survey_${resultId}`, '1');
      setDone(true);
      setTimeout(onClose, 2000);
    } catch {
      setSubmitting(false);
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <motion.div
          className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 text-center"
          initial={{ scale: 0.9, y: 20, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.9, y: 20, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          {done ? (
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="py-4">
              <div className="text-5xl mb-3">🎉</div>
              <h3 className="text-xl font-black text-slate-800">Merci pour votre retour !</h3>
              <p className="text-slate-500 text-sm mt-2">Votre avis nous aide à améliorer RéussirTCF.</p>
            </motion.div>
          ) : (
            <>
              {/* Header */}
              <button onClick={onClose} className="absolute top-4 right-4 text-slate-300 hover:text-slate-500 transition-colors text-xl">✕</button>
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg">
                ⭐
              </div>
              <h3 className="text-xl font-black text-slate-800 mb-1">Comment s&apos;est passée votre session ?</h3>
              <p className="text-slate-400 text-sm mb-6">
                Section <span className="font-bold text-slate-600">{SECTION_NAMES[section] ?? section}</span> · 30 secondes
              </p>

              {/* Étoiles */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {STARS.map(n => (
                  <motion.button
                    key={n}
                    whileHover={{ scale: 1.25 }}
                    whileTap={{ scale: 0.9 }}
                    onMouseEnter={() => setHovered(n)}
                    onMouseLeave={() => setHovered(0)}
                    onClick={() => setSelected(n)}
                    className="focus:outline-none"
                  >
                    <span className={`text-4xl transition-all duration-100 ${n <= active ? 'opacity-100' : 'opacity-25'}`}>
                      ★
                    </span>
                  </motion.button>
                ))}
              </div>

              {/* Label */}
              <AnimatePresence mode="wait">
                {active > 0 && (
                  <motion.p
                    key={active}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    className="text-sm font-bold text-indigo-600 mb-5 h-5"
                  >
                    {LABELS[active]}
                  </motion.p>
                )}
                {active === 0 && <div className="mb-5 h-5" />}
              </AnimatePresence>

              {/* Commentaire */}
              <textarea
                value={comment}
                onChange={e => setComment(e.target.value)}
                placeholder="Un commentaire ? (optionnel)"
                rows={2}
                maxLength={500}
                className="w-full text-sm bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 resize-none outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 placeholder-slate-400"
              />

              {/* Actions */}
              <div className="flex gap-3 mt-4">
                <button onClick={onClose} className="flex-1 text-sm font-bold text-slate-400 border border-slate-200 py-3 rounded-xl hover:bg-slate-50 transition-all">
                  Plus tard
                </button>
                <motion.button
                  whileHover={{ scale: selected ? 1.02 : 1 }}
                  whileTap={{ scale: selected ? 0.98 : 1 }}
                  onClick={handleSubmit}
                  disabled={!selected || submitting}
                  className="flex-1 text-sm font-black py-3 rounded-xl transition-all text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
                >
                  {submitting ? '…' : 'Envoyer'}
                </motion.button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
