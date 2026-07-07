'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Spinner from '../../../components/Spinner';
import { adminApi, BankQuestion } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';


function formatGroupName(key: string): string {
  const match = key.match(/co-serie-(\d+)/i);
  if (match) return `Série ${match[1]}`;
  return key;
}

type EditState = { audioUrl: string; imageUrl: string; transcript: string };

function BankCOInner() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState<BankQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, EditState>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saveErrors, setSaveErrors] = useState<Record<string, string>>({});
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.role !== undefined && user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await adminApi.bank.list({ section: 'CO' });
      setQuestions(data.questions);
      const init: Record<string, EditState> = {};
      data.questions.forEach(q => {
        init[q.id] = {
          audioUrl: q.audioUrl ?? '',
          imageUrl: q.imageUrl ?? '',
          transcript: q.transcript ?? '',
        };
      });
      setEdits(init);
    } catch (e: unknown) {
      setLoadError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && user.role === 'admin') load();
  }, [user, load]);

  async function handleSave(id: string) {
    if (saving) return;
    setSaving(id);
    setSaveErrors(prev => { const s = { ...prev }; delete s[id]; return s; });
    try {
      const edit = edits[id];
      const res = await adminApi.bank.update(id, {
        audioUrl: edit.audioUrl.trim() || null,
        imageUrl: edit.imageUrl.trim() || null,
        transcript: edit.transcript.trim() || undefined,
      });
      setQuestions(prev => prev.map(q => q.id === id ? res.question : q));
      setEdits(prev => ({
        ...prev,
        [id]: {
          audioUrl: res.question.audioUrl ?? '',
          imageUrl: res.question.imageUrl ?? '',
          transcript: res.question.transcript ?? '',
        },
      }));
      setSavedIds(prev => new Set([...prev, id]));
      setTimeout(() => setSavedIds(prev => { const s = new Set(prev); s.delete(id); return s; }), 3000);
    } catch (e: unknown) {
      setSaveErrors(prev => ({ ...prev, [id]: e instanceof Error ? e.message : 'Erreur de sauvegarde' }));
    } finally {
      setSaving(null);
    }
  }

  const groups = questions.reduce<Record<string, BankQuestion[]>>((acc, q) => {
    const key = q.sessionGroup ?? 'co-serie-1';
    if (!acc[key]) acc[key] = [];
    acc[key].push(q);
    return acc;
  }, {});

  const withAudio = questions.filter(q => q.audioUrl).length;
  const total = questions.length;
  const pct = total > 0 ? Math.round((withAudio / total) * 100) : 0;

  if (authLoading || loading) {
    return (
      <div className="flex-1 min-h-screen bg-slate-50 flex items-center justify-center">
        <Spinner size={40} />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-screen bg-slate-50">

      {/* Flag stripe */}
      <div className="flex h-1 w-full flex-shrink-0">
        <div className="w-1/4 bg-red-600" />
        <div className="w-1/2 bg-white" />
        <div className="w-1/4 bg-red-600" />
      </div>

      {/* Sticky header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/admin/dashboard"
            className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors flex items-center gap-1">
            ← Admin
          </Link>
          <div className="px-3 py-1 rounded-full bg-gradient-to-r from-red-600 to-rose-600 text-white text-xs font-bold flex items-center gap-1.5">
            <span>🎧</span><span>CO · Compréhension Orale</span>
          </div>
          <div className="flex-1" />
          <div className={`text-xs font-bold px-3 py-1.5 rounded-xl ${
            pct === 100 ? 'bg-emerald-100 text-emerald-700' :
            pct > 50 ? 'bg-amber-100 text-amber-700' :
            'bg-red-100 text-red-700'
          }`}>
            {withAudio}/{total} audio configurés
          </div>
          <button onClick={load}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors">
            ↻ Actualiser
          </button>
        </div>
      </div>

      {/* Admin banner */}
      <div className="bg-red-600 text-white text-xs font-bold text-center py-1.5 tracking-wide select-none">
        🎧 GESTION BANQUE CO — Configurez les fichiers audio et les transcripts
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Progress card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="font-black text-slate-800 text-lg">Progression Audio CO</h2>
              <p className="text-sm text-slate-500 mt-0.5">
                {withAudio} sur {total} questions ont un fichier audio lié
                {withAudio === 0 && <span className="ml-2 text-xs text-amber-600 font-bold">(TTS actif en fallback)</span>}
              </p>
            </div>
            <div className={`text-3xl font-black ${pct === 100 ? 'text-emerald-500' : pct > 50 ? 'text-amber-500' : 'text-red-500'}`}>
              {pct}%
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className={`h-full rounded-full ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-red-500'}`}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
              {withAudio} audio configurés
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400 inline-block" />
              {total - withAudio} audio manquants (TTS fallback)
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-400 inline-block" />
              {questions.filter(q => q.transcript).length} transcripts rédigés
            </div>
          </div>
        </div>

        {/* Load error */}
        {loadError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-5 py-4 rounded-2xl text-sm font-medium flex items-center gap-3">
            <span>⚠️</span>
            <span>{loadError}</span>
          </div>
        )}

        {/* Questions by group */}
        {Object.entries(groups).map(([groupKey, groupQs]) => {
          const groupWithAudio = groupQs.filter(q => q.audioUrl).length;

          return (
            <div key={groupKey} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

              {/* Group header */}
              <div className="bg-gradient-to-r from-red-600 to-rose-600 px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-white font-black text-sm">🎧 {formatGroupName(groupKey)}</span>
                  <span className="text-white/60 text-xs font-mono">{groupKey}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    groupWithAudio === groupQs.length
                      ? 'bg-emerald-500/30 text-white'
                      : 'bg-white/20 text-white'
                  }`}>
                    {groupWithAudio}/{groupQs.length} audio
                  </span>
                  <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">
                    {groupQs.length} questions
                  </span>
                </div>
              </div>

              {/* Questions */}
              <div className="divide-y divide-slate-100">
                {groupQs.map((q, idx) => {
                  const hasAudio = !!q.audioUrl;
                  const hasImage = !!q.imageUrl;
                  const hasTranscript = !!q.transcript;
                  const isExpanded = expandedId === q.id;
                  const isSaving = saving === q.id;
                  const wasSaved = savedIds.has(q.id);
                  const saveErr = saveErrors[q.id];
                  const edit = edits[q.id] ?? { audioUrl: '', imageUrl: '', transcript: '' };

                  return (
                    <div key={q.id}>
                      {/* Row */}
                      <div
                        className={`px-5 py-3.5 flex items-center gap-3 cursor-pointer transition-colors ${
                          isExpanded ? 'bg-red-50/60' : 'hover:bg-slate-50'
                        }`}
                        onClick={() => setExpandedId(isExpanded ? null : q.id)}
                      >
                        {/* Index */}
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 ${
                          hasAudio ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Audio indicator */}
                        <div className="flex-shrink-0">
                          {hasAudio
                            ? <span className="text-emerald-500 text-base" title="Audio configuré">🎵</span>
                            : <span className="text-red-400 text-base" title="Audio manquant">🔇</span>}
                        </div>

                        {/* Question text */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 font-medium truncate">{q.question}</p>
                          {q.theme && (
                            <p className="text-xs text-slate-400 mt-0.5 truncate">{q.theme}</p>
                          )}
                        </div>

                        {/* Badges */}
                        <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
                          {hasImage && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">🖼 Image</span>
                          )}
                          {hasTranscript && (
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">📄 Script</span>
                          )}
                          {wasSaved && (
                            <motion.span
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                              ✓ Sauvegardé
                            </motion.span>
                          )}
                        </div>

                        {/* Chevron */}
                        <span className={`text-slate-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}>
                          ▼
                        </span>
                      </div>

                      {/* Expanded form */}
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 py-5 bg-slate-50/80 border-t border-red-100 space-y-4">

                              {/* Question preview */}
                              <div className="bg-white rounded-xl p-4 border border-slate-200 space-y-3">
                                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Question complète</p>
                                <p className="text-sm text-slate-800 font-medium leading-relaxed">{q.question}</p>
                                {q.options && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {Object.entries(q.options).map(([key, val]) => (
                                      <div key={key}
                                        className={`text-xs px-3 py-2 rounded-lg border flex items-start gap-2 ${
                                          q.answer === key
                                            ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 bg-slate-50 text-slate-600'
                                        }`}>
                                        <span className="font-black flex-shrink-0">{key.toUpperCase()}.</span>
                                        <span>{String(val)}</span>
                                        {q.answer === key && <span className="ml-auto flex-shrink-0 font-black">✓</span>}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Audio URL + Player */}
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                  🎵 URL Audio
                                  <span className="ml-1.5 text-slate-400 font-normal">(MP3, WAV, OGG)</span>
                                </label>
                                <input
                                  type="url"
                                  value={edit.audioUrl}
                                  onChange={e => setEdits(prev => ({ ...prev, [q.id]: { ...edit, audioUrl: e.target.value } }))}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="/audio/co/co-s1-q01.mp3"
                                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all bg-white"
                                />
                                {edit.audioUrl && (
                                  <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-bold text-slate-500 mb-2">▶ Lecteur de test</p>
                                    <audio
                                      key={edit.audioUrl}
                                      controls
                                      className="w-full h-10"
                                    >
                                      <source src={edit.audioUrl} />
                                      Votre navigateur ne supporte pas l&apos;audio.
                                    </audio>
                                  </div>
                                )}
                              </div>

                              {/* Image URL + Preview */}
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                  🖼 URL Image
                                  <span className="ml-1.5 text-slate-400 font-normal">(optionnel — support visuel)</span>
                                </label>
                                <input
                                  type="url"
                                  value={edit.imageUrl}
                                  onChange={e => setEdits(prev => ({ ...prev, [q.id]: { ...edit, imageUrl: e.target.value } }))}
                                  onClick={e => e.stopPropagation()}
                                  placeholder="/images/co/co-s1-q01.png"
                                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-mono outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all bg-white"
                                />
                                {edit.imageUrl && (
                                  <div className="mt-2 bg-white border border-slate-200 rounded-xl p-3" onClick={e => e.stopPropagation()}>
                                    <p className="text-xs font-bold text-slate-500 mb-2">🖼 Aperçu image</p>
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                      src={edit.imageUrl}
                                      alt="Aperçu"
                                      className="max-h-48 rounded-lg object-contain border border-slate-100"
                                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                    />
                                  </div>
                                )}
                              </div>

                              {/* Transcript */}
                              <div>
                                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                                  📄 Transcript
                                  <span className="ml-1.5 text-slate-400 font-normal">(texte exact lu dans l'audio — utilisé comme fallback TTS)</span>
                                </label>
                                <textarea
                                  value={edit.transcript}
                                  onChange={e => setEdits(prev => ({ ...prev, [q.id]: { ...edit, transcript: e.target.value } }))}
                                  onClick={e => e.stopPropagation()}
                                  rows={4}
                                  placeholder="Le texte audio qui sera lu à l'étudiant..."
                                  className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none bg-white"
                                />
                              </div>

                              {/* Save error */}
                              {saveErr && (
                                <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-4 py-2.5 rounded-xl font-medium">
                                  ⚠️ {saveErr}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="flex items-center justify-between pt-1" onClick={e => e.stopPropagation()}>
                                <div className="text-xs text-slate-400 font-mono">
                                  {q.id}
                                  {q.level && (
                                    <span className="ml-2 bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-bold not-italic">{q.level}</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => setExpandedId(null)}
                                    className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors">
                                    Fermer
                                  </button>
                                  <button
                                    onClick={() => handleSave(q.id)}
                                    disabled={!!isSaving}
                                    className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-sm transition-colors disabled:opacity-50">
                                    {isSaving
                                      ? <><Spinner size={14} color="#fff" /> Sauvegarde...</>
                                      : '💾 Sauvegarder'}
                                  </button>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Empty state */}
        {questions.length === 0 && !loadError && (
          <div className="text-center py-20">
            <span className="text-5xl block mb-4">🎧</span>
            <p className="font-black text-slate-600 text-lg">Aucune question CO en banque</p>
            <p className="text-sm text-slate-400 mt-2">Les questions CO apparaîtront ici une fois ajoutées avec section=CO</p>
            <Link href="/admin/dashboard"
              className="mt-6 inline-block bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-xl text-sm transition-colors">
              ← Retour au dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default function BankCOPage() {
  return <BankCOInner />;
}
