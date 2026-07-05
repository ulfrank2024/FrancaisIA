'use client';
import { motion, AnimatePresence } from 'framer-motion';

export type AvatarMood = 'idle' | 'thinking' | 'happy' | 'celebrate' | 'encourage' | 'explain';

const MOOD_RING: Record<AvatarMood, string> = {
  idle:      'ring-indigo-400',
  thinking:  'ring-amber-400',
  happy:     'ring-emerald-400',
  celebrate: 'ring-pink-400',
  encourage: 'ring-sky-400',
  explain:   'ring-purple-400',
};

const MOOD_BG: Record<AvatarMood, string> = {
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

// Avatar humain Sophie via DiceBear avataaars
const SOPHIE_AVATAR = 'https://api.dicebear.com/9.x/personas/svg?seed=SophieTCF';

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
  const ringSize = size === 'lg' ? 'ring-4' : 'ring-[3px]';

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {/* Avatar */}
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
        {/* Halo celebrate */}
        {mood === 'celebrate' && (
          <motion.div
            className="absolute inset-0 rounded-full bg-yellow-300/40"
            animate={{ scale: [1, 1.7, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
        )}

        {/* Image humaine */}
        <motion.div
          style={{ width: px, height: px }}
          className={`rounded-full overflow-hidden bg-gradient-to-br ${MOOD_BG[mood]} ${ringSize} ${MOOD_RING[mood]} ring-offset-2 shadow-xl`}
          animate={{ scale: mood === 'happy' || mood === 'celebrate' ? [1, 1.05, 1] : 1 }}
          transition={{ duration: 0.4 }}
        >
          <img
            src={SOPHIE_AVATAR}
            alt="Sophie"
            style={{ width: px, height: px }}
            className="object-cover"
          />
        </motion.div>

        {/* Indicateur thinking */}
        {mood === 'thinking' && (
          <motion.div
            className="absolute -top-2 -right-2 bg-amber-400 rounded-full px-2 py-0.5 text-xs font-bold text-white shadow"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            ...
          </motion.div>
        )}

        {/* Particules celebrate */}
        {mood === 'celebrate' && (
          <>
            {['✨', '⭐', '🌟'].map((s, i) => (
              <motion.span
                key={i}
                className="absolute text-base pointer-events-none"
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

      {/* Badge nom */}
      <div className="flex items-center gap-1.5">
        <div className={`w-2 h-2 rounded-full bg-gradient-to-br ${MOOD_BG[mood]} shadow`} />
        <span className="text-xs font-semibold text-slate-600">Sophie · Tutrice IA</span>
      </div>

      {/* Bulle message */}
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
