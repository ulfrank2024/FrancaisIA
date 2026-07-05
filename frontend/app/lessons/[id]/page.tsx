'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../components/Spinner';
import { api, LessonWithAssignments } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';

const SECTION_META: Record<string, { color: string; icon: string; label: string }> = {
  CO: { color: 'from-sky-400 to-cyan-500',     icon: '🎧', label: 'Compréhension Orale' },
  CE: { color: 'from-violet-400 to-purple-500', icon: '📖', label: 'Compréhension Écrite' },
  EE: { color: 'from-emerald-400 to-teal-500',  icon: '✍️', label: 'Expression Écrite' },
  EO: { color: 'from-rose-400 to-pink-500',     icon: '🎤', label: 'Expression Orale' },
};

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-2xl font-black text-slate-800 mt-6 mb-3">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-xl font-black text-slate-700 mt-5 mb-2">{line.slice(3)}</h2>;
    if (line.startsWith('### ')) return <h3 key={i} className="text-base font-black text-slate-700 mt-4 mb-1">{line.slice(4)}</h3>;
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="text-slate-700 ml-6 text-base leading-relaxed list-disc">{line.slice(2)}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-3" />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-slate-700 text-base leading-relaxed">
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-slate-900">{p}</strong> : p)}
      </p>
    );
  });
}

export default function LessonViewPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();
  const [lesson, setLesson] = useState<LessonWithAssignments | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const token = await getToken().catch(() => null);
      const { lesson: l } = await api.lessons.get(id, token ?? undefined);
      setLesson(l);
    };
    load().catch(() => {}).finally(() => setLoading(false));
  }, [user, id]);

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;
  if (!lesson) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-slate-400">
      <div className="text-5xl">📚</div>
      <p>Cours introuvable ou accès refusé.</p>
      <Link href="/dashboard" className="text-sm text-indigo-500 hover:underline">Retour au dashboard</Link>
    </div>
  );

  const meta = SECTION_META[lesson.section] ?? { color: 'from-slate-300 to-slate-400', icon: '📄', label: lesson.section };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-slate-100 px-4 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">← Retour</button>
        <div className="flex-1 flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center text-white text-xs flex-shrink-0`}>
            {meta.icon}
          </div>
          <span className="text-sm font-bold text-slate-800 truncate">{lesson.title}</span>
        </div>
        <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white flex-shrink-0`}>
          {lesson.section}
        </span>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">

          {/* Hero */}
          <div className={`bg-gradient-to-r ${meta.color} px-8 py-10 text-white`}>
            <div className="text-4xl mb-3">{meta.icon}</div>
            <div className="text-sm font-bold opacity-80 mb-1">{meta.label}</div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight">{lesson.title}</h1>
            <p className="text-sm opacity-70 mt-2">
              Cours de ton professeur · {new Date(lesson.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Contenu */}
          <div className="px-6 sm:px-10 py-8 space-y-1">
            {renderContent(lesson.content)}
          </div>

          {/* Footer */}
          <div className="px-6 sm:px-10 py-5 border-t border-slate-50 bg-slate-50/50 flex items-center justify-between">
            <p className="text-xs text-slate-400">Cours créé par ton professeur</p>
            <Link href={`/practice/${lesson.section.toLowerCase()}`}
              className={`text-xs font-bold bg-gradient-to-r ${meta.color} text-white px-4 py-2 rounded-xl hover:shadow-md transition-shadow`}>
              S'entraîner en {lesson.section} →
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
