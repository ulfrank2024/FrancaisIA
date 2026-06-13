'use client';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import ProfNav from '../../../../components/ProfNav';
import Spinner from '../../../../components/Spinner';
import ScoreRing from '../../../../components/ScoreRing';
import { api, ClassDetail, StudentStat } from '../../../../lib/api';
import { useAuth } from '../../../../lib/auth-context';
import { useUser } from '@clerk/nextjs';

const SECTION_META: Record<string, { color: string; icon: string }> = {
  CO: { color: 'from-sky-400 to-cyan-500',      icon: '🎧' },
  CE: { color: 'from-violet-400 to-purple-500',  icon: '📖' },
  EE: { color: 'from-emerald-400 to-teal-500',   icon: '✍️' },
  EO: { color: 'from-rose-400 to-pink-500',      icon: '🎤' },
};

function weakSections(student: StudentStat): string[] {
  return student.stats
    .filter(s => s.averageScore !== null && s.averageScore < 60)
    .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0))
    .map(s => s.section);
}

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const { user: clerkUser } = useUser();
  const router = useRouter();
  const [cls, setCls] = useState<ClassDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || !id) return;
    api.classes.get(id).then(setCls).catch(() => {}).finally(() => setLoading(false));
  }, [user, id]);

  function copyCode() {
    if (!cls) return;
    navigator.clipboard.writeText(cls.inviteCode).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); });
  }

  if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center"><Spinner size={40} /></div>;
  if (!cls) return <div className="min-h-screen flex items-center justify-center text-slate-400">Classe introuvable</div>;

  const avgClass = cls.studentStats.length
    ? Math.round(cls.studentStats.filter(s => s.globalAverage !== null).reduce((sum, s) => sum + (s.globalAverage ?? 0), 0) /
        cls.studentStats.filter(s => s.globalAverage !== null).length) || null
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-emerald-50">
      <ProfNav />
      <div className="max-w-6xl mx-auto px-3 sm:px-6 py-6 sm:py-10 space-y-8">

        {/* Header classe */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl p-5 sm:p-7 shadow-md border border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <button onClick={() => router.back()} className="text-xs text-slate-400 hover:text-slate-600 transition-colors mb-2 block">← Retour</button>
              <h1 className="text-2xl font-black text-slate-800">{cls.name}</h1>
              {cls.description && <p className="text-sm text-slate-500 mt-1">{cls.description}</p>}
            </div>
            <div className="flex flex-col sm:items-end gap-2">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2">
                <span className="text-xs text-slate-500">Code d'invitation</span>
                <span className="font-black text-slate-800 font-mono tracking-widest text-lg">{cls.inviteCode}</span>
                <button onClick={copyCode} className="text-indigo-500 hover:text-indigo-700 text-xs font-semibold transition-colors ml-1">
                  {copied ? '✓ Copié !' : '📋'}
                </button>
              </div>
              <p className="text-xs text-slate-400 text-right">Partage ce code à tes apprenants</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-5 pt-5 border-t border-slate-50 text-sm text-slate-600">
            <span>👥 <strong>{cls.members.length}</strong> apprenant(s)</span>
            {avgClass && <span>📊 Score moyen classe : <strong>{avgClass}/100</strong></span>}
            {cls.studentStats.filter(s => s.totalAttempts === 0).length > 0 && (
              <span className="text-orange-500">⚠️ {cls.studentStats.filter(s => s.totalAttempts === 0).length} n'a pas encore pratiqué</span>
            )}
          </div>
        </motion.div>

        {/* Tableau des apprenants */}
        <div>
          <h2 className="text-xl font-black text-slate-800 mb-4">Apprenants de la classe</h2>
          {cls.studentStats.length === 0 ? (
            <div className="bg-white rounded-3xl border-2 border-dashed border-slate-200 p-12 text-center">
              <div className="text-5xl mb-4">👥</div>
              <p className="font-bold text-slate-700">Aucun apprenant pour l'instant</p>
              <p className="text-slate-400 text-sm mt-1">Partage le code <strong className="font-mono text-slate-700">{cls.inviteCode}</strong> à tes apprenants</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {cls.studentStats.map((student, i) => {
                const weak = weakSections(student);
                return (
                  <motion.div key={student.studentId}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
                    <Link href={`/prof/classes/${cls.id}/students/${student.studentId}`}
                      className="block bg-white rounded-2xl p-5 shadow-sm border border-slate-100 hover:shadow-md hover:border-emerald-200 transition-all group">
                      <div className="flex items-center gap-4">
                        {/* Avatar DiceBear */}
                        <img
                          src={`https://api.dicebear.com/9.x/avataaars-neutral/svg?seed=${student.studentId}&backgroundColor=b6e3f4`}
                          className="w-12 h-12 rounded-full border-2 border-white shadow flex-shrink-0"
                          alt="avatar"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition-colors">
                            Apprenant {student.studentId.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-xs text-slate-400">
                            {student.totalAttempts} exercice(s) · rejoint le {new Date(student.joinedAt!).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                          </div>
                          {weak.length > 0 && (
                            <div className="flex gap-1 mt-1 flex-wrap">
                              {weak.map(s => (
                                <span key={s} className="text-xs bg-red-50 text-red-600 px-2 py-0.5 rounded-full font-semibold">
                                  {SECTION_META[s]?.icon} {s} lacune
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="hidden sm:flex gap-2">
                            {['CO', 'CE', 'EE', 'EO'].map(s => {
                              const st = student.stats.find(x => x.section === s);
                              return (
                                <div key={s} className="text-center">
                                  <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${SECTION_META[s].color} flex items-center justify-center text-white text-xs font-black`}>{s}</div>
                                  <div className="text-xs text-slate-500 mt-0.5">{st?.averageScore ?? '–'}</div>
                                </div>
                              );
                            })}
                          </div>
                          {student.globalAverage !== null ? (
                            <ScoreRing score={student.globalAverage} size={52} />
                          ) : (
                            <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-300">–</div>
                          )}
                          <span className="text-slate-300 group-hover:text-emerald-500 transition-colors">→</span>
                        </div>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
