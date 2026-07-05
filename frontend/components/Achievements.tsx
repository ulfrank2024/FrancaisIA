'use client';
import { DashboardData, HistoryItem } from '../lib/api';

export type Badge = {
  id: string;
  icon: string;
  label: string;
  desc: string;
  color: string;        // Tailwind gradient classes
  textColor: string;
};

export const BADGES: Badge[] = [
  { id: 'first_session',  icon: '🚀', label: 'Premier pas',    desc: 'Première session complétée',                   color: 'from-sky-400 to-cyan-500',      textColor: 'text-sky-700'    },
  { id: 'sessions_5',     icon: '🔥', label: 'En feu',         desc: '5 sessions complétées',                        color: 'from-orange-400 to-amber-500',   textColor: 'text-orange-700' },
  { id: 'sessions_10',    icon: '💪', label: 'Habitué',        desc: '10 sessions complétées',                       color: 'from-violet-400 to-purple-500',  textColor: 'text-violet-700' },
  { id: 'sessions_25',    icon: '🏅', label: 'Assidu',         desc: '25 sessions complétées',                       color: 'from-indigo-400 to-blue-500',    textColor: 'text-indigo-700' },
  { id: 'explorer',       icon: '🗺️', label: 'Explorateur',    desc: 'A pratiqué les 4 sections au moins une fois',  color: 'from-teal-400 to-emerald-500',   textColor: 'text-teal-700'   },
  { id: 'precision',      icon: '🎯', label: 'Précision',      desc: 'Score ≥ 80 % sur une session',                 color: 'from-rose-400 to-pink-500',      textColor: 'text-rose-700'   },
  { id: 'excellence',     icon: '⭐', label: 'Excellence',     desc: 'Score ≥ 90 % sur une session',                 color: 'from-yellow-400 to-amber-500',   textColor: 'text-yellow-700' },
  { id: 'streak_3',       icon: '📆', label: 'Régulier',       desc: '3 jours consécutifs de pratique',              color: 'from-lime-400 to-green-500',     textColor: 'text-lime-700'   },
  { id: 'streak_7',       icon: '🔆', label: 'Discipline',     desc: '7 jours consécutifs de pratique',              color: 'from-emerald-400 to-teal-500',   textColor: 'text-emerald-700'},
  { id: 'co_master',      icon: '🎧', label: 'Maître CO',      desc: 'Score moyen CO ≥ 70 %',                        color: 'from-sky-400 to-cyan-500',       textColor: 'text-sky-700'    },
  { id: 'ce_master',      icon: '📖', label: 'Maître CE',      desc: 'Score moyen CE ≥ 70 %',                        color: 'from-violet-400 to-purple-500',  textColor: 'text-violet-700' },
  { id: 'ee_master',      icon: '✍️', label: 'Maître EE',      desc: 'Score moyen EE ≥ 70 %',                        color: 'from-emerald-400 to-teal-500',   textColor: 'text-emerald-700'},
  { id: 'eo_master',      icon: '🎤', label: 'Maître EO',      desc: 'Score moyen EO ≥ 70 %',                        color: 'from-rose-400 to-pink-500',      textColor: 'text-rose-700'   },
  { id: 'tcf_ready',      icon: '🎓', label: 'TCF Ready',      desc: 'Score global moyen ≥ 75 %',                    color: 'from-indigo-500 to-violet-600',  textColor: 'text-indigo-700' },
];

export function getStreak(history: HistoryItem[]): number {
  if (!history.length) return 0;
  const days = [...new Set(history.map(h => new Date(h.createdAt).toDateString()))];
  const sorted = days.map(d => new Date(d)).sort((a, b) => b.getTime() - a.getTime());
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let streak = 0;
  let cursor = today;
  for (const day of sorted) {
    const diff = Math.round((cursor.getTime() - day.getTime()) / 86400000);
    if (diff > 1) break;
    streak++;
    cursor = day;
  }
  return streak;
}

export function getUnlockedBadgeIds(history: HistoryItem[], dashboard: DashboardData | null): Set<string> {
  const unlocked = new Set<string>();
  const total = history.length;
  if (total === 0) return unlocked;

  if (total >= 1)  unlocked.add('first_session');
  if (total >= 5)  unlocked.add('sessions_5');
  if (total >= 10) unlocked.add('sessions_10');
  if (total >= 25) unlocked.add('sessions_25');

  const sections = new Set(history.map(h => h.section));
  if (['CO','CE','EE','EO'].every(s => sections.has(s))) unlocked.add('explorer');

  if (history.some(h => h.score >= 80)) unlocked.add('precision');
  if (history.some(h => h.score >= 90)) unlocked.add('excellence');

  const streak = getStreak(history);
  if (streak >= 3) unlocked.add('streak_3');
  if (streak >= 7) unlocked.add('streak_7');

  if (dashboard) {
    const avg = (s: string) => dashboard.stats.find(x => x.section === s)?.averageScore ?? null;
    if ((avg('CO') ?? 0) >= 70) unlocked.add('co_master');
    if ((avg('CE') ?? 0) >= 70) unlocked.add('ce_master');
    if ((avg('EE') ?? 0) >= 70) unlocked.add('ee_master');
    if ((avg('EO') ?? 0) >= 70) unlocked.add('eo_master');
    if ((dashboard.globalAverage ?? 0) >= 75) unlocked.add('tcf_ready');
  }

  return unlocked;
}

export function getUnlockedBadges(history: HistoryItem[], dashboard: DashboardData | null): Badge[] {
  const ids = getUnlockedBadgeIds(history, dashboard);
  return BADGES.filter(b => ids.has(b.id));
}

export function getNewlyUnlocked(
  prevIds: string[],
  history: HistoryItem[],
  dashboard: DashboardData | null,
): Badge[] {
  const current = getUnlockedBadgeIds(history, dashboard);
  return BADGES.filter(b => current.has(b.id) && !prevIds.includes(b.id));
}

const LS_KEY = 'reussirtcf_badges';

export function loadSavedBadgeIds(): string[] {
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? '[]'); } catch { return []; }
}

export function saveBadgeIds(ids: string[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(ids)); } catch {}
}
