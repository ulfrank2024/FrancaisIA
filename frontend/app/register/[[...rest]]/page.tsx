'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SignUp } from '@clerk/nextjs';
import SophieAvatar from '../../../components/SophieAvatar';

export default function RegisterPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <Link href="/" className="text-3xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            FrançaisIA
          </Link>
          <p className="text-slate-500 text-sm mt-2">Rejoins la communauté TCF Canada</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-6">
          <SophieAvatar mood="happy" size="sm" showMessage={false} />
          <SignUp
            forceRedirectUrl="/onboarding"
            appearance={{
              elements: {
                card: 'shadow-xl border border-slate-100 rounded-3xl w-full',
                headerTitle: 'text-2xl font-black text-slate-800',
                headerSubtitle: 'text-slate-500',
                formButtonPrimary: 'bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-90 transition-opacity',
                footerActionLink: 'text-indigo-600 font-semibold hover:underline',
              },
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
