'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { SignIn } from '@clerk/nextjs';

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-slate-50 flex flex-col">
      {/* Bande drapeau */}
      <div className="flex h-1.5 w-full flex-shrink-0">
        <div className="w-1/4 bg-red-600" />
        <div className="w-1/2 bg-white" />
        <div className="w-1/4 bg-red-600" />
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-md">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2 text-3xl font-black text-slate-900">
              <span className="text-red-600">🍁</span>
              RéussirTCF
            </Link>
            <p className="text-slate-500 text-sm mt-2">Prépare ton TCF Canada avec Sophie 🎓</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SignIn
              forceRedirectUrl="/redirect"
              signUpUrl="/register"
              appearance={{
                elements: {
                  card: 'shadow-xl border border-slate-100 rounded-3xl w-full',
                  headerTitle: 'text-2xl font-black text-slate-800',
                  headerSubtitle: 'text-slate-500',
                  formButtonPrimary: 'bg-red-600 hover:bg-red-700 transition-colors',
                  footerActionLink: 'text-red-600 font-semibold hover:underline',
                },
              }}
            />
          </motion.div>

          <p className="text-center text-xs text-slate-400 mt-6">
            Pas encore de compte ?{' '}
            <Link href="/register" className="text-red-600 font-semibold hover:underline">Créer un compte gratuit</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
