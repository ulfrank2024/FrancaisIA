'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from './Achievements';

type Props = { badges: Badge[]; onDone: () => void };

export default function AchievementToast({ badges, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  const current = badges[index];

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(() => {
        if (index + 1 < badges.length) { setIndex(i => i + 1); setVisible(true); }
        else onDone();
      }, 400);
    }, 3500);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, index]);

  if (!current) return null;

  return (
    <div className="fixed top-5 right-5 z-[200] pointer-events-none">
      <AnimatePresence mode="wait">
        {visible && (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="bg-white rounded-2xl shadow-2xl border border-slate-100 px-5 py-4 flex items-center gap-4 min-w-[260px] max-w-xs pointer-events-auto"
          >
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${current.color} flex items-center justify-center text-2xl flex-shrink-0 shadow`}>
              {current.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-0.5">
                🏆 Badge débloqué !
              </div>
              <div className="font-black text-slate-800 text-sm leading-tight">{current.label}</div>
              <div className="text-xs text-slate-500 mt-0.5 leading-snug">{current.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
