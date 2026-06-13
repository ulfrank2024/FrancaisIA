'use client';
import { motion } from 'framer-motion';

export default function Spinner({ size = 24, color = '#4f46e5' }: { size?: number; color?: string }) {
  return (
    <motion.div
      style={{ width: size, height: size, border: `3px solid ${color}30`, borderTop: `3px solid ${color}`, borderRadius: '50%' }}
      animate={{ rotate: 360 }}
      transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
    />
  );
}
