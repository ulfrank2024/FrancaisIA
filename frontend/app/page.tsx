'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import SophieAvatar from '../components/SophieAvatar';

const SECTIONS = [
  { code: 'CO', label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500' },
  { code: 'CE', label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500' },
  { code: 'EE', label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500' },
  { code: 'EO', label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500' },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-white/60 bg-white/70 backdrop-blur-md sticky top-0 z-50">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2"
        >
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
            FrançaisIA
          </span>
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-semibold">TCF Canada</span>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-3"
        >
          <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600 transition-colors">
            Connexion
          </Link>
          <Link
            href="/register"
            className="text-sm font-semibold bg-gradient-to-r from-indigo-600 to-cyan-500 text-white px-4 py-2 rounded-full shadow hover:shadow-md transition-all"
          >
            Commencer gratuitement
          </Link>
        </motion.div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 flex flex-col lg:flex-row items-center gap-12">
        <motion.div
          className="flex-1 space-y-6"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 rounded-full px-4 py-1.5">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm text-indigo-700 font-medium">Communauté Camerounaise & Diaspora Canada</span>
          </div>
          <h1 className="text-4xl lg:text-6xl font-black text-slate-800 leading-tight">
            Réussis ton{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-cyan-500 bg-clip-text text-transparent">
              TCF Canada
            </span>{' '}
            avec l'IA
          </h1>
          <p className="text-lg text-slate-500 max-w-xl leading-relaxed">
            Pratique les 4 compétences du TCF Canada avec Sophie, ta tutrice IA.
            Corrections instantanées, examens simulés et suivi de progression personnalisé.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              href="/register"
              className="group inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-cyan-500 text-white font-bold px-8 py-4 rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
            >
              Commencer maintenant
              <motion.span animate={{ x: [0, 4, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}>→</motion.span>
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 font-bold px-8 py-4 rounded-2xl hover:border-indigo-300 hover:bg-indigo-50 transition-all"
            >
              J'ai déjà un compte
            </Link>
          </div>
          <div className="flex items-center gap-6 pt-2">
            {[['🎯', 'Score officiel TCF'], ['⚡', 'Correction IA instantanée'], ['📊', 'Suivi de progression']].map(([icon, label]) => (
              <div key={label} className="flex items-center gap-1.5 text-sm text-slate-500">
                <span>{icon}</span><span>{label}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Avatar Sophie */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <SophieAvatar mood="idle" size="lg" showMessage={true} />
        </motion.div>
      </section>

      {/* Sections TCF */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <motion.h2
          className="text-3xl font-black text-slate-800 text-center mb-12"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
        >
          Les 4 compétences du TCF Canada
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {SECTIONS.map((s, i) => (
            <motion.div
              key={s.code}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="bg-white rounded-2xl p-6 shadow-md border border-slate-100 flex flex-col items-center gap-3 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-2xl shadow`}>
                {s.icon}
              </div>
              <div className="text-center">
                <div className="font-black text-slate-800 text-lg">{s.code}</div>
                <div className="text-sm text-slate-500">{s.label}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA bas */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="bg-gradient-to-br from-indigo-600 to-cyan-500 rounded-3xl p-12 shadow-2xl text-white"
        >
          <h2 className="text-3xl font-black mb-4">Prêt à réussir ton TCF ?</h2>
          <p className="text-indigo-100 mb-8 text-lg">Rejoins des centaines d'apprenants de la diaspora camerounaise.</p>
          <Link
            href="/register"
            className="inline-block bg-white text-indigo-600 font-black px-10 py-4 rounded-2xl shadow hover:shadow-lg hover:-translate-y-1 transition-all"
          >
            Créer mon compte gratuit
          </Link>
        </motion.div>
      </section>
    </main>
  );
}
