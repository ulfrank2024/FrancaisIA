'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import ProfNav from '../../../../components/ProfNav';
import { api } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

export default function NewClassPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!name.trim() || !user) return;
    setSaving(true);
    setError('');
    try {
      const cls = await api.classes.create({ name: name.trim(), description: description.trim() || undefined, professorId: user.id });
      router.push(`/prof/classes/${cls.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création');
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-xl mx-auto px-4 py-10">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-6 sm:p-8 shadow-md border border-slate-100 space-y-6">
          <div>
            <h1 className="text-2xl font-black text-slate-800">Créer une nouvelle classe</h1>
            <p className="text-slate-500 text-sm mt-1">Un code d'invitation unique sera généré automatiquement</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Nom de la classe *</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="ex : Session TCF Été 2026 · Groupe A"
                maxLength={80}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1.5">Description <span className="text-slate-400 font-normal">(optionnel)</span></label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Détails de la session, niveau visé, horaires..."
                rows={3}
                maxLength={300}
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 transition-all resize-none"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 px-4 py-2 rounded-xl">{error}</p>}

          <div className="flex gap-3">
            <button onClick={() => router.back()} className="flex-1 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors">
              Annuler
            </button>
            <motion.button
              onClick={handleCreate}
              disabled={!name.trim() || saving}
              whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-3 rounded-xl shadow disabled:opacity-50 transition-all flex items-center justify-center gap-2"
            >
              {saving ? <><span className="animate-spin">⏳</span> Création...</> : '🏫 Créer la classe'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
