'use client';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';
import ProfNav from '../../../../components/ProfNav';
import Spinner from '../../../../components/Spinner';
import { api, LessonWithAssignments, ClassDetail } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';

const SECTION_META: Record<string, { color: string; icon: string; label: string }> = {
  CO: { color: 'from-sky-400 to-cyan-500',     icon: '🎧', label: 'Compréhension Orale' },
  CE: { color: 'from-violet-400 to-purple-500', icon: '📖', label: 'Compréhension Écrite' },
  EE: { color: 'from-emerald-400 to-teal-500',  icon: '✍️', label: 'Expression Écrite' },
  EO: { color: 'from-rose-400 to-pink-500',     icon: '🎤', label: 'Expression Orale' },
};

function renderContent(text: string) {
  return text.split('\n').map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={i} className="text-xl font-black text-slate-800 mt-4 mb-2">{line.slice(2)}</h1>;
    if (line.startsWith('## ')) return <h2 key={i} className="text-lg font-black text-slate-700 mt-3 mb-1">{line.slice(3)}</h2>;
    if (line.startsWith('- ') || line.startsWith('• ')) {
      return <li key={i} className="text-slate-700 ml-4 text-sm list-disc">{line.slice(2)}</li>;
    }
    if (line.trim() === '') return <div key={i} className="h-2" />;
    const parts = line.split(/\*\*(.*?)\*\*/g);
    return (
      <p key={i} className="text-slate-700 text-sm leading-relaxed">
        {parts.map((p, j) => j % 2 === 1 ? <strong key={j}>{p}</strong> : p)}
      </p>
    );
  });
}

export default function LessonDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading, getToken } = useAuth();
  const router = useRouter();

  const [lesson, setLesson] = useState<LessonWithAssignments | null>(null);
  const [classes, setClasses] = useState<ClassDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [showAssign, setShowAssign] = useState(false);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [assigning, setAssigning] = useState(false);
  const [assignMsg, setAssignMsg] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [tab, setTab] = useState<'preview' | 'edit'>('preview');

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const token = await getToken().catch(() => null);
      const [{ lesson: l }, profClasses] = await Promise.all([
        api.lessons.get(id, token ?? undefined),
        api.classes.listByProf(user.id, token ?? undefined).catch(() => ({ classes: [] as { id: string }[] })),
      ]);
      const classDetails = await Promise.all(
        profClasses.classes.map((c: { id: string }) => api.classes.get(c.id, token ?? undefined).catch(() => null))
      );
      setLesson(l);
      setEditTitle(l.title);
      setEditContent(l.content);
      setClasses(classDetails.filter(Boolean) as ClassDetail[]);
    };
    load().catch(() => {}).finally(() => setLoading(false));
  }, [user, id]);

  const currentClass = classes.find(c => c.id === selectedClass);
  const assignedIds = new Set(lesson?.assignments.map(a => a.studentId) ?? []);

  function toggleStudent(sid: string) {
    setSelectedStudents(prev => {
      const next = new Set(prev);
      if (next.has(sid)) next.delete(sid); else next.add(sid);
      return next;
    });
  }

  async function handleSave() {
    if (!lesson) return;
    setSaving(true);
    try {
      const token = await getToken().catch(() => null);
      const { lesson: updated } = await api.lessons.update(lesson.id, { title: editTitle, content: editContent }, token ?? undefined);
      setLesson({ ...lesson, ...updated });
      setEditing(false);
      setTab('preview');
    } catch {}
    setSaving(false);
  }

  async function handleAssign() {
    if (!lesson || !selectedClass || selectedStudents.size === 0) return;
    setAssigning(true);
    setAssignMsg('');
    try {
      const token = await getToken().catch(() => null);
      const assignments = Array.from(selectedStudents).map(sid => ({ studentId: sid, classId: selectedClass }));
      const { lesson: updated } = await api.lessons.assign(lesson.id, assignments, token ?? undefined);
      setLesson(updated);
      setAssignMsg(`✅ Cours assigné à ${selectedStudents.size} apprenant(s) !`);
      setSelectedStudents(new Set());
      setTimeout(() => { setAssignMsg(''); setShowAssign(false); }, 2500);
    } catch (e: unknown) {
      setAssignMsg(e instanceof Error ? e.message : 'Erreur');
    }
    setAssigning(false);
  }

  async function handleUnassign(studentId: string) {
    if (!lesson) return;
    const token = await getToken().catch(() => null);
    await api.lessons.unassign(lesson.id, studentId, token ?? undefined).catch(() => {});
    setLesson({ ...lesson, assignments: lesson.assignments.filter(a => a.studentId !== studentId) });
  }

  async function handleDelete() {
    if (!lesson || !confirm('Supprimer ce cours définitivement ?')) return;
    setDeleting(true);
    const token = await getToken().catch(() => null);
    await api.lessons.delete(lesson.id, token ?? undefined).catch(() => {});
    router.push('/prof/lessons');
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;
  if (!lesson) return <div className="min-h-screen flex items-center justify-center text-slate-400">Cours introuvable</div>;

  const meta = SECTION_META[lesson.section] ?? { color: 'from-slate-300 to-slate-400', icon: '📄', label: lesson.section };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 mb-3 block">← Retour aux cours</button>
          <div className="flex items-start gap-4">
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-2xl flex-shrink-0 shadow-md`}>
              {meta.icon}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-xs font-black px-2.5 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white`}>{lesson.section}</span>
                <span className="text-xs text-slate-400">{meta.label}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-800">{lesson.title}</h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Créé le {new Date(lesson.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'long', year: 'numeric' })}
                · {lesson.assignments.length} apprenant(s) assigné(s)
              </p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={() => { setEditing(!editing); setTab(editing ? 'preview' : 'edit'); }}
                className="text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold px-3 py-2 rounded-xl transition-colors">
                {editing ? '✕ Annuler' : '✏️ Modifier'}
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="text-xs bg-red-50 hover:bg-red-100 text-red-600 font-bold px-3 py-2 rounded-xl transition-colors">
                🗑 Supprimer
              </button>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Contenu */}
          <div className="lg:col-span-2 space-y-4">
            {editing && (
              <div className="flex gap-2">
                {(['preview', 'edit'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`text-xs font-bold px-4 py-1.5 rounded-full transition-all ${
                      tab === t ? 'bg-slate-800 text-white' : 'bg-white text-slate-500 border border-slate-200'
                    }`}>
                    {t === 'preview' ? '👁 Aperçu' : '✏️ Édition'}
                  </button>
                ))}
              </div>
            )}

            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl shadow-md border border-slate-100 p-6 sm:p-8">

              {editing && tab === 'edit' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Titre</label>
                    <input value={editTitle} onChange={e => setEditTitle(e.target.value)}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-400" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">Contenu</label>
                    <textarea value={editContent} onChange={e => setEditContent(e.target.value)} rows={18}
                      className="w-full border-2 border-slate-200 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-400 resize-y font-mono" />
                  </div>
                  <button onClick={handleSave} disabled={saving}
                    className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                    {saving ? <><Spinner size={16} color="#fff" /> Sauvegarde...</> : '💾 Sauvegarder'}
                  </button>
                </div>
              ) : (
                <div className="prose prose-sm max-w-none space-y-1">
                  <h2 className="text-lg font-black text-slate-800 mb-4 pb-3 border-b border-slate-100">{lesson.title}</h2>
                  {renderContent(editing ? editContent : lesson.content)}
                </div>
              )}
            </motion.div>
          </div>

          {/* Panneau d'assignation */}
          <div className="space-y-4">
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="bg-white rounded-3xl shadow-md border border-slate-100 p-5">
              <h2 className="text-base font-black text-slate-800 mb-4">Assigner le cours</h2>

              {classes.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Aucune classe créée.<br />Crée une classe d'abord.</p>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1.5">Choisir une classe</label>
                    <select value={selectedClass} onChange={e => { setSelectedClass(e.target.value); setSelectedStudents(new Set()); }}
                      className="w-full border-2 border-slate-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-emerald-400">
                      <option value="">-- Sélectionner --</option>
                      {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.members.length})</option>)}
                    </select>
                  </div>

                  {currentClass && (
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-2">
                        Choisir l'apprenant(s)
                        <button onClick={() => {
                          const allIds = currentClass.members.map(m => m.studentId);
                          setSelectedStudents(selectedStudents.size === allIds.length ? new Set() : new Set(allIds));
                        }} className="ml-2 text-indigo-500 hover:text-indigo-700 font-bold normal-case">
                          {selectedStudents.size === currentClass.members.length ? 'Tout désélect.' : 'Tout sélect.'}
                        </button>
                      </label>
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {currentClass.members.map(m => {
                          const isAssigned = assignedIds.has(m.studentId);
                          const isSelected = selectedStudents.has(m.studentId);
                          return (
                            <label key={m.studentId}
                              className={`flex items-center gap-2.5 p-2.5 rounded-xl cursor-pointer transition-colors ${
                                isSelected ? 'bg-emerald-50 border border-emerald-200' : 'bg-slate-50 border border-transparent hover:bg-slate-100'
                              }`}>
                              <input type="checkbox" checked={isSelected} onChange={() => toggleStudent(m.studentId)}
                                className="rounded accent-emerald-500" />
                              <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${m.studentId}`} className="w-7 h-7 rounded-full border border-white shadow-sm" alt="" />
                              <div className="flex-1 min-w-0">
                                <div className="text-xs font-bold text-slate-700 truncate">
                                  Apprenant {m.studentId.slice(-6).toUpperCase()}
                                </div>
                                {isAssigned && <div className="text-xs text-emerald-600 font-semibold">✓ déjà assigné</div>}
                              </div>
                            </label>
                          );
                        })}
                      </div>

                      <button onClick={handleAssign} disabled={selectedStudents.size === 0 || assigning}
                        className="mt-3 w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-2.5 rounded-xl text-sm disabled:opacity-40 flex items-center justify-center gap-2">
                        {assigning ? <><Spinner size={14} color="#fff" /> Assignation...</> : `📤 Assigner à ${selectedStudents.size || '...'}`}
                      </button>

                      {assignMsg && (
                        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          className="text-xs text-center mt-2 text-emerald-600 font-bold">{assignMsg}</motion.p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </motion.div>

            {/* Assignations actuelles */}
            {lesson.assignments.length > 0 && (
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-white rounded-3xl shadow-md border border-slate-100 p-5">
                <h2 className="text-sm font-black text-slate-800 mb-3">Déjà assigné à</h2>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lesson.assignments.map(a => (
                    <div key={a.studentId} className="flex items-center gap-2.5 p-2 rounded-xl bg-slate-50 group">
                      <img src={`https://api.dicebear.com/9.x/personas/svg?seed=${a.studentId}`} className="w-7 h-7 rounded-full border border-white shadow-sm" alt="" />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-slate-700">Apprenant {a.studentId.slice(-6).toUpperCase()}</div>
                        <div className="text-xs text-slate-400">{new Date(a.assignedAt).toLocaleDateString('fr-CA')}</div>
                      </div>
                      <button onClick={() => handleUnassign(a.studentId)}
                        className="text-red-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-xs font-bold px-2 py-1 rounded-lg hover:bg-red-50">
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
