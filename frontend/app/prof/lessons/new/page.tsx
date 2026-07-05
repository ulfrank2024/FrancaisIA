'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProfNav from '../../../../components/ProfNav';
import Spinner from '../../../../components/Spinner';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

const SECTIONS = [
  { key: 'CO', label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', desc: 'Documents audio, écoute active, compréhension...' },
  { key: 'CE', label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', desc: 'Lecture, analyse de textes, vocabulaire...' },
  { key: 'EE', label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', desc: 'Rédaction, lettres, courriels, essais...' },
  { key: 'EO', label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', desc: 'Exposé, description, argumentation...' },
];

export default function NewLessonPage() {
  const { user, getToken } = useAuth();
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [section, setSection] = useState('');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!user || !title.trim() || !section || !content.trim()) return;
    setSaving(true);
    setError('');
    try {
      const token = await getToken().catch(() => null);
      const { lesson } = await api.lessons.create(
        { professorId: user.id, title: title.trim(), section, content: content.trim() },
        token ?? undefined
      );
      router.push(`/prof/lessons/${lesson.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
      setSaving(false);
    }
  }

  const canSave = title.trim().length > 0 && section !== '' && content.trim().length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-3xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-3 block">← Retour aux cours</button>
          <h1 className="text-2xl font-black text-slate-800">Créer un cours</h1>
          <p className="text-sm text-slate-400 mt-1">Rédige le contenu et assigne-le ensuite à tes apprenants</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 sm:p-8 space-y-6">

          {/* Titre */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Titre du cours *</label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="ex : Les connecteurs logiques en CE"
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
            />
          </div>

          {/* Section */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-3">Compétence TCF *</label>
            <div className="grid grid-cols-2 gap-3">
              {SECTIONS.map(s => (
                <button key={s.key} onClick={() => setSection(s.key)}
                  className={`text-left p-4 rounded-2xl border-2 transition-all ${
                    section === s.key
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-sm`}>
                      {s.icon}
                    </div>
                    <span className="font-bold text-slate-800 text-sm">{s.key}</span>
                    {section === s.key && <span className="ml-auto text-emerald-500 text-xs">✓</span>}
                  </div>
                  <div className="text-xs text-slate-500">{s.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Contenu */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">Contenu du cours *</label>
            <p className="text-xs text-slate-400 mb-2">Explications, exemples, exercices, conseils... L'étudiant lira ce contenu.</p>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Écris ici le contenu de ton cours. Tu peux utiliser **gras**, des listes, des exemples..."
              rows={14}
              className="w-full border-2 border-slate-200 rounded-2xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-y font-mono"
            />
            <div className="text-right text-xs text-slate-300 mt-1">{content.length} caractères</div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

          <motion.button
            onClick={handleCreate}
            disabled={!canSave || saving}
            whileHover={{ scale: canSave ? 1.01 : 1 }} whileTap={{ scale: canSave ? 0.99 : 1 }}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-4 rounded-2xl shadow disabled:opacity-40 flex items-center justify-center gap-2 transition-all">
            {saving ? <><Spinner size={18} color="#fff" /> Création...</> : '📚 Créer le cours'}
          </motion.button>
        </motion.div>
      </div>
    </div>
  );
}
