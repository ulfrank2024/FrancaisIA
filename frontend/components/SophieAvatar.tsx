'use client';
import { motion, AnimatePresence } from 'framer-motion';

export type AvatarMood = 'idle' | 'thinking' | 'happy' | 'celebrate' | 'encourage' | 'explain';

const MOOD_COLORS: Record<AvatarMood, string> = {
  idle:      'from-indigo-400 to-violet-500',
  thinking:  'from-amber-400 to-orange-500',
  happy:     'from-emerald-400 to-teal-500',
  celebrate: 'from-pink-400 to-rose-500',
  encourage: 'from-sky-400 to-cyan-500',
  explain:   'from-purple-400 to-indigo-500',
};

const MOOD_MESSAGES: Record<AvatarMood, string> = {
  idle:      'Bonjour ! Je suis Sophie, ta tutrice IA. 👋',
  thinking:  'Je réfléchis à ta réponse...',
  happy:     'Excellent ! C\'est parfait ! 🎉',
  celebrate: 'Bravo ! Tu progresses super bien ! 🏆',
  encourage: 'Continue, tu y es presque ! 💪',
  explain:   'Laisse-moi t\'expliquer ça...',
};

const FACE_EXPRESSIONS: Record<AvatarMood, { eyes: string; mouth: string }> = {
  idle:      { eyes: '● ●', mouth: '‿' },
  thinking:  { eyes: '◉ ●', mouth: '—' },
  happy:     { eyes: '^ ^', mouth: '◡' },
  celebrate: { eyes: '★ ★', mouth: '◡' },
  encourage: { eyes: '● ●', mouth: '‿' },
  explain:   { eyes: '● ◉', mouth: '—' },
};

interface SophieAvatarProps {
  mood?: AvatarMood;
  size?: 'sm' | 'md' | 'lg';
  showMessage?: boolean;
  className?: string;
}

export default function SophieAvatar({
  mood = 'idle',
  size = 'md',
  showMessage = true,
  className = '',
}: SophieAvatarProps) {
  const sizes = { sm: 64, md: 96, lg: 128 };
  const px = sizes[size];
  const face = FACE_EXPRESSIONS[mood];

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Avatar flottant */}
      <motion.div
        className="relative"
        animate={mood === 'celebrate'
          ? { y: [0, -16, 0, -12, 0], rotate: [0, -5, 5, -3, 0] }
          : mood === 'thinking'
          ? { rotate: [0, -3, 3, 0] }
          : { y: [0, -6, 0] }
        }
        transition={
          mood === 'celebrate'
            ? { duration: 0.8, repeat: 1 }
            : mood === 'thinking'
            ? { duration: 1.5, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 3, repeat: Infinity, ease: 'easeInOut' }
        }
      >
        {/* Halo animé */}
        {mood === 'celebrate' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/30"
            animate={{ scale: [1, 1.6, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Corps de l'avatar */}
        <motion.div
          style={{ width: px, height: px }}
          className={`rounded-full bg-gradient-to-br ${MOOD_COLORS[mood]} shadow-xl flex flex-col items-center justify-center relative overflow-hidden cursor-default select-none`}
          animate={{ scale: mood === 'happy' || mood === 'celebrate' ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Reflet */}
          <div className="absolute top-2 left-3 w-1/3 h-1/4 bg-white/20 rounded-full blur-sm" />

          {/* Visage */}
          <div className="flex flex-col items-center gap-1 z-10">
            <div
              style={{ fontSize: px * 0.18 }}
              className="text-white font-bold tracking-widest"
            >
              {face.eyes}
            </div>
            <div
              style={{ fontSize: px * 0.22 }}
              className="text-white font-bold leading-none"
            >
              {face.mouth}
            </div>
          </div>

          {/* Particules celebrate */}
          {mood === 'celebrate' && (
            <>
              {['✨', '⭐', '🌟'].map((s, i) => (
                <motion.span
                  key={i}
                  className="absolute text-base"
                  style={{ top: `${20 + i * 20}%`, left: i % 2 === 0 ? '5%' : '75%' }}
                  animate={{ y: [-10, -30], opacity: [1, 0], scale: [1, 1.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.3 }}
                >
                  {s}
                </motion.span>
              ))}
            </>
          )}
        </motion.div>

        {/* Indicateur "thinking" */}
        {mood === 'thinking' && (
          <motion.div
            className="absolute -top-2 -right-2 bg-amber-400 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ...
          </motion.div>
        )}
      </motion.div>

      {/* Badge nom */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${MOOD_COLORS[mood]} shadow`} />
        <span className="text-xs font-semibold text-slate-600">Sophie · Tutrice IA</span>
      </div>

      {/* Bulle de message */}
      <AnimatePresence mode="wait">
        {showMessage && (
          <motion.div
            key={mood}
            initial={{ opacity: 0, y: 6, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.95 }}
            transition={{ duration: 0.3 }}
            className="max-w-xs text-center text-sm text-slate-600 bg-white rounded-2xl px-4 py-2 shadow-md border border-slate-100"
          >
            {MOOD_MESSAGES[mood]}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
