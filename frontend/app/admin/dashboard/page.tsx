'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AdminNav from '../../../components/AdminNav';
import Spinner from '../../../components/Spinner';
import { adminApi, AdminStats, AdminQuestion, AdminUser, BankQuestion, BankQuestionInput, BankSession, BankSessionInput, EeSerieRaw, EoSerieRaw, CeSerieRaw } from '../../../lib/admin-api';
import { useAuth } from '../../../lib/auth-context';


function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-black text-white">{part}</strong> : part
  );
}

function renderBoldMultiline(text: string): React.ReactNode {
  return text.split('\n').map((line, i, arr) => (
    <span key={i}>{renderBold(line)}{i < arr.length - 1 && <br />}</span>
  ));
}

const SECTION_META: Record<string, { label: string; icon: string; color: string; bg: string }> = {
  CO: { label: 'Compréhension Orale',  icon: '🎧', color: 'from-sky-500 to-cyan-500',      bg: 'bg-sky-950/40' },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-500 to-purple-500',  bg: 'bg-violet-950/40' },
  EE: { label: 'Expression Écrite',    icon: '✍️', color: 'from-emerald-500 to-teal-500',   bg: 'bg-emerald-950/40' },
  EO: { label: 'Expression Orale',     icon: '🎤', color: 'from-rose-500 to-pink-500',      bg: 'bg-rose-950/40' },
};

const LEVEL_COLORS: Record<string, string> = {
  A1: 'bg-slate-700 text-slate-200',
  A2: 'bg-sky-900 text-sky-300',
  B1: 'bg-indigo-900 text-indigo-300',
  B2: 'bg-violet-900 text-violet-300',
  C1: 'bg-rose-900 text-rose-300',
  C2: 'bg-amber-900 text-amber-300',
};

const EMPTY_FORM: BankQuestionInput = {
  section: 'CE', level: 'B1',
  question: '', explanation: '', theme: '',
  options: { a: '', b: '', c: '', d: '' },
  answer: 'a', active: false,
};

const EMPTY_CO_FORM: BankQuestionInput = {
  section: 'CO', level: 'B1',
  question: '', explanation: '', theme: '',
  options: { a: '', b: '', c: '', d: '' },
  answer: 'a', transcript: '', audioUrl: null, imageUrl: null, active: false,
};

const TASK_TIME: Record<number, number> = { 1: 2, 2: 3, 3: 4 };
const EO_GROUPS = ['EO-S01','EO-S02','EO-S03','EO-S04','EO-S05','EO-S06','EO-S07','EO-S08'];
const TASK_LABELS: Record<number, string> = { 1: 'Tâche 1 — Présentation', 2: 'Tâche 2 — Interaction', 3: 'Tâche 3 — Argumentation' };
const TASK_COLORS: Record<number, string> = { 1: 'bg-sky-900 text-sky-300', 2: 'bg-violet-900 text-violet-300', 3: 'bg-rose-900 text-rose-300' };

const EMPTY_EO_FORM: BankSessionInput = {
  section: 'EO', question: '', explanation: '',
  theme: '', taskNumber: 1, sessionGroup: 'EO-S01', timeLimitMin: 2, active: false,
};

// ── Constantes EE ─────────────────────────────────────────────
const EE_TASK_LABELS: Record<number, string> = {
  1: 'Tâche 1 — Message court (60-120 mots)',
  2: 'Tâche 2 — Narration (120-150 mots)',
  3: 'Tâche 3 — Texte argumentatif (120-180 mots)',
};
const EE_TASK_TIME: Record<number, number> = { 1: 10, 2: 20, 3: 30 };
const EE_TASK_WORDS: Record<number, [number, number]> = { 1: [60, 120], 2: [120, 150], 3: [120, 180] };
const EMPTY_EE_FORM: BankSessionInput = {
  section: 'EE', level: 'B1', question: '', explanation: '',
  theme: '', taskNumber: 1, sessionGroup: '', timeLimitMin: 10,
  wordCountMin: 60, wordCountMax: 120, active: false,
};

function StatCard({ label, value, icon, color, href, sub }: { label: string; value: string | number; icon: string; color: string; href?: string; sub?: string }) {
  const inner = (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 h-full ${href ? 'hover:border-slate-600 transition-colors group cursor-pointer' : ''}`}>
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-lg mb-3`}>{icon}</div>
      <div className="text-3xl font-black text-white">{typeof value === 'number' ? value.toLocaleString('fr-CA') : value}</div>
      <div className={`text-xs mt-0.5 ${href ? 'text-slate-400 group-hover:text-slate-300 transition-colors' : 'text-slate-500'}`}>
        {label}{href ? ' →' : ''}
      </div>
      {sub && <div className="text-xs text-slate-600 mt-1">{sub}</div>}
    </div>
  );
  return <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="h-full">
    {href ? <Link href={href}>{inner}</Link> : inner}
  </motion.div>;
}

export default function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // ── État global ──────────────────────────────────────────────
  const [adminTab, setAdminTab] = useState<'overview' | 'banque-co' | 'banque-ce' | 'banque-eo' | 'banque-ee' | 'formation' | 'acces'>('overview');
  const [stats, setStats]         = useState<AdminStats | null>(null);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading]     = useState(true);

  // ── État banque CE ───────────────────────────────────────────
  const [bankQuestions, setBankQuestions] = useState<BankQuestion[]>([]);
  const [bankLoading, setBankLoading]     = useState(false);
  const [bankLoaded, setBankLoaded]       = useState(false);
  const [showModal, setShowModal]         = useState(false);
  const [editingQ, setEditingQ]           = useState<BankQuestion | null>(null);
  const [form, setForm]                   = useState<BankQuestionInput>(EMPTY_FORM);
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [bankFilter, setBankFilter]       = useState<string>('');
  const [bankLevelFilter, setBankLevelFilter] = useState<string>('');
  const [expandedId, setExpandedId]       = useState<string | null>(null);

  // ── État banque CO ───────────────────────────────────────────
  const [bankCoQuestions, setBankCoQuestions] = useState<BankQuestion[]>([]);
  const [bankCoLoading, setBankCoLoading]     = useState(false);
  const [bankCoLoaded, setBankCoLoaded]       = useState(false);
  const [showCoModal, setShowCoModal]         = useState(false);
  const [editingCo, setEditingCo]             = useState<BankQuestion | null>(null);
  const [coForm, setCoForm]                   = useState<BankQuestionInput>(EMPTY_CO_FORM);
  const [coSaving, setCoSaving]               = useState(false);
  const [coDeleting, setCoDeleting]           = useState<string | null>(null);
  const [coFilter, setCoFilter]               = useState<string>('');
  const [coLevelFilter, setCoLevelFilter]     = useState<string>('');
  const [coExpandedId, setCoExpandedId]       = useState<string | null>(null);
  const [togglingCoId, setTogglingCoId]       = useState<string | null>(null);

  // ── État banque EO ───────────────────────────────────────────
  const [eoSessions, setEoSessions]         = useState<BankSession[]>([]);
  const [eoLoading, setEoLoading]           = useState(false);
  const [showEoModal, setShowEoModal]       = useState(false);
  const [editingEo, setEditingEo]           = useState<BankSession | null>(null);
  const [eoForm, setEoForm]                 = useState<BankSessionInput>(EMPTY_EO_FORM);
  const [eoSaving, setEoSaving]             = useState(false);
  const [eoDeleting, setEoDeleting]         = useState<string | null>(null);
  const [eoFilter, setEoFilter]             = useState<string>('');
  const [eoGroupFilter, setEoGroupFilter]   = useState<string>('');
  const [eoTaskFilter, setEoTaskFilter]     = useState<string>('');
  const [eoExpandedId, setEoExpandedId]     = useState<string | null>(null);
  const [eoLoaded, setEoLoaded]             = useState(false);

  // ── État banque EE ───────────────────────────────────────────
  const [eeSessions, setEeSessions]         = useState<BankSession[]>([]);
  const [eeLoading, setEeLoading]           = useState(false);
  const [showEeModal, setShowEeModal]       = useState(false);
  const [editingEe, setEditingEe]           = useState<BankSession | null>(null);
  const [eeForm, setEeForm]                 = useState<BankSessionInput>(EMPTY_EE_FORM);
  const [eeSaving, setEeSaving]             = useState(false);
  const [eeDeleting, setEeDeleting]         = useState<string | null>(null);
  const [eeFilter, setEeFilter]             = useState<string>('');
  const [eeLevelFilter, setEeLevelFilter]   = useState<string>('');
  const [eeTaskFilter, setEeTaskFilter]     = useState<string>('');
  const [eeExpandedId, setEeExpandedId]     = useState<string | null>(null);
  const [eeLoaded, setEeLoaded]             = useState(false);
  const [togglingEeId, setTogglingEeId]     = useState<string | null>(null);

  // ── État Formation des épreuves ──────────────────────────────
  const formationLoadingRef = useRef(false);
  const [formationSection, setFormationSection] = useState<'EE' | 'CE' | 'EO' | 'CO'>('EE');
  const [generatedEe, setGeneratedEe] = useState<EeSerieGenerated[]>([]);
  const [generatedEo, setGeneratedEo] = useState<EoSerieGenerated[]>([]);
  const [generatedCe, setGeneratedCe] = useState<CeSerieGenerated[]>([]);
  const [generatedCo, setGeneratedCo] = useState<CoSerieGenerated[]>([]);
  const [previewCoSerie, setPreviewCoSerie] = useState<CoSerieGenerated | null>(null);
  const [generating, setGenerating] = useState(false);
  const [ceInvalidCount, setCeInvalidCount] = useState(0);
  const [ceInvalidIds, setCeInvalidIds]     = useState<string[]>([]);
  const [deletingInvalid, setDeletingInvalid] = useState(false);
  const [formationLoaded, setFormationLoaded] = useState(false);
  const [previewCeSerie, setPreviewCeSerie] = useState<CeSerieGenerated | null>(null);
  const [savingFormation, setSavingFormation] = useState(false);
  const [savedFormationSections, setSavedFormationSections] = useState<('EE' | 'CE' | 'EO' | 'CO')[]>([]);

  // ── Onglet Accès — gestion des permissions utilisateurs ──────
  const [users, setUsers]             = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersLoaded, setUsersLoaded] = useState(false);
  const [userSearch, setUserSearch]     = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'professor' | 'student'>('all');
  const [grantingId, setGrantingId]   = useState<string | null>(null);
  const [revokingId, setRevokingId]   = useState<string | null>(null);

  // ── Toggle rapide active/inactive ────────────────────────────
  const [togglingCeId, setTogglingCeId] = useState<string | null>(null);
  const [togglingEoId, setTogglingEoId] = useState<string | null>(null);

  // ── Auth guard ───────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && !user) { router.push('/login'); return; }
    if (!authLoading && user && user.role !== undefined && user.role !== 'admin') { router.push('/dashboard'); return; }
  }, [user, authLoading, router]);

  // ── Chargement initial ───────────────────────────────────────
  useEffect(() => {
    if (!user || !(user.role === 'admin')) return;
    (async () => {
      const [statsData, qData] = await Promise.allSettled([
        adminApi.stats(),
        adminApi.questions(),
      ]);
      if (statsData.status === 'fulfilled') setStats(statsData.value);
      if (qData.status === 'fulfilled') setQuestions(qData.value.questions);
      setLoading(false);
    })();
  }, [user]);

  // ── Chargement banque CE ─────────────────────────────────────
  const loadBank = useCallback(async () => {
    setBankLoading(true);
    try {
      const data = await adminApi.bank.list({ section: 'CE' });
      setBankQuestions(data.questions);
    } catch {}
    finally { setBankLoading(false); setBankLoaded(true); }
  }, []);

  useEffect(() => {
    if (adminTab === 'banque-ce' && !bankLoaded && !bankLoading) {
      loadBank();
    }
  }, [adminTab, bankLoaded, bankLoading, loadBank]);

  // ── Chargement banque CO ─────────────────────────────────────
  const loadBankCo = useCallback(async () => {
    setBankCoLoading(true);
    try {
      const data = await adminApi.bank.list({ section: 'CO' });
      setBankCoQuestions(data.questions);
    } catch {}
    finally { setBankCoLoading(false); setBankCoLoaded(true); }
  }, []);

  useEffect(() => {
    if (adminTab === 'banque-co' && !bankCoLoaded && !bankCoLoading) {
      loadBankCo();
    }
  }, [adminTab, bankCoLoaded, bankCoLoading, loadBankCo]);

  // ── Chargement banque EO ─────────────────────────────────────
  const loadEoSessions = useCallback(async () => {
    setEoLoading(true);
    try {
      const data = await adminApi.sessions.list({ section: 'EO' });
      setEoSessions(data.sessions);
    } catch {}
    finally { setEoLoading(false); setEoLoaded(true); }
  }, []);

  useEffect(() => {
    if (adminTab === 'banque-eo' && !eoLoaded && !eoLoading) {
      loadEoSessions();
    }
  }, [adminTab, eoLoaded, eoLoading, loadEoSessions]);

  // ── Chargement banque EE ──────────────────────────────────────
  const loadEeSessions = useCallback(async () => {
    setEeLoading(true);
    try {
      const data = await adminApi.sessions.list({ section: 'EE' });
      setEeSessions(data.sessions);
    } catch {}
    finally { setEeLoading(false); setEeLoaded(true); }
  }, []);

  useEffect(() => {
    if (adminTab === 'banque-ee' && !eeLoaded && !eeLoading) {
      loadEeSessions();
    }
  }, [adminTab, eeLoaded, eeLoading, loadEeSessions]);

  // ── Chargement banque CE quand la formation CE est ouverte ──
  useEffect(() => {
    if (adminTab === 'formation' && formationSection === 'CE' && !bankLoaded && !bankLoading) {
      loadBank();
    }
  }, [adminTab, formationSection, bankLoaded, bankLoading, loadBank]);

  // ── Chargement banque CO quand la formation CO est ouverte ──
  useEffect(() => {
    if (adminTab === 'formation' && formationSection === 'CO' && bankCoQuestions.length === 0 && !bankCoLoading) {
      loadBankCo();
    }
  }, [adminTab, formationSection, bankCoQuestions.length, bankCoLoading, loadBankCo]);

  // ── Chargement données formation ─────────────────────────────
  useEffect(() => {
    if (adminTab === 'formation' && !formationLoaded && !formationLoadingRef.current) {
      formationLoadingRef.current = true;
      const loadAll = async () => {
        let localEe = eeSessions;
        let localEo = eoSessions;
        let localCe = bankQuestions;
        let localCo = bankCoQuestions;

        const tasks: Promise<void>[] = [];
        if (!bankLoaded && !bankLoading) {
          tasks.push(adminApi.bank.list({ section: 'CE' }).then(d => { setBankQuestions(d.questions); setBankLoaded(true); localCe = d.questions; }).catch(err => { console.error('[Formation] Chargement banque CE échoué:', err); }));
        }
        if (bankCoQuestions.length === 0 && !bankCoLoading) {
          tasks.push(adminApi.bank.list({ section: 'CO' }).then(d => { setBankCoQuestions(d.questions); setBankCoLoaded(true); localCo = d.questions; }).catch(err => { console.error('[Formation] Chargement banque CO échoué:', err); }));
        }
        if (!eeLoaded && !eeLoading) {
          tasks.push(adminApi.sessions.list({ section: 'EE' }).then(d => { setEeSessions(d.sessions); localEe = d.sessions; setEeLoaded(true); }).catch(err => { console.error('[Formation] Chargement sessions EE échoué:', err); }));
        }
        if (!eoLoaded && !eoLoading) {
          tasks.push(adminApi.sessions.list({ section: 'EO' }).then(d => { setEoSessions(d.sessions); localEo = d.sessions; setEoLoaded(true); }).catch(err => { console.error('[Formation] Chargement sessions EO échoué:', err); }));
        }
        await Promise.all(tasks);

        // ── Restaurer les séries déjà sauvegardées ────────────────
        const newSaved: ('EE' | 'CE' | 'EO' | 'CO')[] = [];
        console.log('[Formation] Restauration — localEe.length:', localEe.length, 'localCe.length:', localCe.length);

        // Restauration EE — indépendante de CE
        try {
          const eeConf = await adminApi.examSeries.get('EE');
          console.log('[Formation] eeConf.config:', eeConf.config ? `${(eeConf.config.series as unknown[]).length} séries` : 'null');
          if (eeConf.config && localEe.length > 0) {
            const sessionMap = Object.fromEntries(localEe.map(s => [s.id, s]));
            const raw = eeConf.config.series as EeSerieRaw[];
            const restored = raw
              .map(r => ({ id: r.id, t1: sessionMap[r.t1Id], t2: sessionMap[r.t2Id], t3: sessionMap[r.t3Id] }))
              .filter(r => r.t1 && r.t2 && r.t3) as EeSerieGenerated[];
            console.log('[Formation] EE restauré:', restored.length, '/ 50');
            if (restored.length > 0) { setGeneratedEe(restored); newSaved.push('EE'); }
          }
        } catch (err) {
          console.error('[Formation] Erreur restauration EE:', err);
        }

        // Restauration CE — indépendante de EE
        try {
          const ceConf = await adminApi.examSeries.get('CE');
          if (ceConf.config && localCe.length > 0) {
            const qMap = Object.fromEntries(localCe.map(q => [q.id, q]));
            const raw = ceConf.config.series as CeSerieRaw[];
            const restored = raw
              .map(r => ({ id: r.id, questions: r.questionIds.map(id => qMap[id]).filter(Boolean) as BankQuestion[] }))
              .filter(r => r.questions.length > 0) as CeSerieGenerated[];
            if (restored.length > 0) { setGeneratedCe(restored); newSaved.push('CE'); }
          }
        } catch (err) {
          console.error('[Formation] Erreur restauration CE:', err);
        }

        // Restauration EO — indépendante
        try {
          const eoConf = await adminApi.examSeries.get('EO');
          if (eoConf.config && localEo.length > 0) {
            const sessionMap = Object.fromEntries(localEo.map(s => [s.id, s]));
            const raw = eoConf.config.series as EoSerieRaw[];
            const restored = raw
              .map(r => ({ id: r.id, t1: sessionMap[r.t1Id], t2: sessionMap[r.t2Id], t3: sessionMap[r.t3Id] }))
              .filter(r => r.t1 && r.t2 && r.t3) as EoSerieGenerated[];
            if (restored.length > 0) { setGeneratedEo(restored); newSaved.push('EO'); }
          }
        } catch (err) {
          console.error('[Formation] Erreur restauration EO:', err);
        }

        // Restauration CO — depuis examSeriesConfig (50 séries × questionIds)
        try {
          const coConf = await adminApi.examSeries.get('CO');
          if (coConf.config && localCo.length > 0) {
            const qMap = Object.fromEntries(localCo.map(q => [q.id, q]));
            const raw = coConf.config.series as CeSerieRaw[];
            const restored: CoSerieGenerated[] = raw
              .map(r => ({ id: r.id, questions: r.questionIds.map(id => qMap[id]).filter(Boolean) as BankQuestion[] }))
              .filter(r => r.questions.length > 0);
            if (restored.length > 0) { setGeneratedCo(restored); newSaved.push('CO'); }
          }
        } catch (err) {
          console.error('[Formation] Erreur restauration CO:', err);
        }

        if (newSaved.length > 0) setSavedFormationSections(newSaved);

        setFormationLoaded(true);
        formationLoadingRef.current = false;
      };
      loadAll().catch(() => { formationLoadingRef.current = false; });
    }
  }, [adminTab, formationLoaded, bankQuestions.length, bankLoading, eeLoaded, eeLoading, eoLoaded, eoLoading]);

  // ── Chargement utilisateurs (onglet Accès) ────────────────────
  useEffect(() => {
    if (adminTab === 'acces' && !usersLoaded && !usersLoading) {
      setUsersLoading(true);
      adminApi.users()
        .then(r => { setUsers(r.users); setUsersLoaded(true); })
        .catch(() => {})
        .finally(() => setUsersLoading(false));
    }
  }, [adminTab, usersLoaded, usersLoading]);

  async function handleGrantAccess(u: AdminUser) {
    setGrantingId(u.id);
    try {
      await adminApi.upsertSubscription({ userId: u.id, email: u.email, plan: 'pro' });
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan: 'pro' } : x));
    } catch {} finally { setGrantingId(null); }
  }

  async function handleRevokeAccess(u: AdminUser) {
    setRevokingId(u.id);
    try {
      await adminApi.revokeSubscription(u.id);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, plan: 'free' } : x));
    } catch {} finally { setRevokingId(null); }
  }

  // ── Toggle rapide active ──────────────────────────────────────
  async function handleToggleCo(q: BankQuestion) {
    setTogglingCoId(q.id);
    try {
      const { question } = await adminApi.bank.update(q.id, { active: !q.active });
      setBankCoQuestions(prev => prev.map(x => x.id === q.id ? question : x));
    } catch {} finally { setTogglingCoId(null); }
  }

  async function handleToggleCe(q: BankQuestion) {
    setTogglingCeId(q.id);
    try {
      const { question } = await adminApi.bank.update(q.id, { active: !q.active });
      setBankQuestions(prev => prev.map(x => x.id === q.id ? question : x));
    } catch {} finally { setTogglingCeId(null); }
  }

  async function handleToggleEo(s: BankSession) {
    setTogglingEoId(s.id);
    try {
      const { session } = await adminApi.sessions.update(s.id, { active: !s.active });
      setEoSessions(prev => prev.map(x => x.id === s.id ? session : x));
    } catch {} finally { setTogglingEoId(null); }
  }

  async function handleToggleEe(s: BankSession) {
    setTogglingEeId(s.id);
    try {
      const { session } = await adminApi.sessions.update(s.id, { active: !s.active });
      setEeSessions(prev => prev.map(x => x.id === s.id ? session : x));
    } catch {} finally { setTogglingEeId(null); }
  }

  // ── CRUD banque EE ────────────────────────────────────────────
  function openCreateEe() {
    setEditingEe(null);
    setEeForm({ ...EMPTY_EE_FORM });
    setShowEeModal(true);
  }

  function openEditEe(s: BankSession) {
    setEditingEe(s);
    setEeForm({
      section: 'EE',
      level: s.level ?? 'B1',
      question: s.question,
      explanation: s.explanation ?? '',
      theme: s.theme ?? '',
      taskNumber: s.taskNumber,
      sessionGroup: s.sessionGroup,
      timeLimitMin: s.timeLimitMin ?? EE_TASK_TIME[s.taskNumber] ?? 10,
      wordCountMin: s.wordCountMin ?? EE_TASK_WORDS[s.taskNumber]?.[0] ?? 60,
      wordCountMax: s.wordCountMax ?? EE_TASK_WORDS[s.taskNumber]?.[1] ?? 120,
      active: s.active,
    });
    setShowEeModal(true);
  }

  async function handleSaveEe() {
    if (!eeForm.question.trim() || !eeForm.sessionGroup.trim()) return;
    setEeSaving(true);
    try {
      if (editingEe) {
        const { session } = await adminApi.sessions.update(editingEe.id, eeForm);
        setEeSessions(prev => prev.map(s => s.id === editingEe.id ? session : s));
      } else {
        const { session } = await adminApi.sessions.create(eeForm);
        setEeSessions(prev => [session, ...prev]);
      }
      setShowEeModal(false);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally { setEeSaving(false); }
  }

  async function handleDeleteEe(id: string) {
    if (!confirm('Supprimer définitivement cette tâche EE ?')) return;
    setEeDeleting(id);
    try {
      await adminApi.sessions.delete(id);
      setEeSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
    finally { setEeDeleting(null); }
  }

  // ── Export JSON banque CE ─────────────────────────────────────
  function handleExportCe(questions: BankQuestion[]) {
    const data = questions.map(q => ({
      id: q.id, level: q.level, theme: q.theme, question: q.question,
      options: q.options, answer: q.answer, explanation: q.explanation, active: q.active,
    }));
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `banque-ce-${new Date().toISOString().slice(0, 10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  }

  // ── CRUD banque CO ────────────────────────────────────────────
  function openCreateCo() {
    setEditingCo(null);
    setCoForm({ ...EMPTY_CO_FORM });
    setShowCoModal(true);
  }

  function openEditCo(q: BankQuestion) {
    setEditingCo(q);
    setCoForm({
      section: 'CO', level: q.level,
      question: q.question,
      options: q.options ?? { a: '', b: '', c: '', d: '' },
      answer: q.answer ?? 'a',
      explanation: q.explanation ?? '',
      theme: q.theme ?? '',
      transcript: q.transcript ?? '',
      audioUrl: q.audioUrl ?? null,
      imageUrl: q.imageUrl ?? null,
      active: q.active,
    });
    setShowCoModal(true);
  }

  async function handleSaveCo() {
    if (!coForm.question.trim()) return;
    setCoSaving(true);
    try {
      if (editingCo) {
        const { question } = await adminApi.bank.update(editingCo.id, coForm);
        setBankCoQuestions(prev => prev.map(q => q.id === editingCo.id ? question : q));
      } else {
        const { question } = await adminApi.bank.create(coForm);
        setBankCoQuestions(prev => [question, ...prev]);
      }
      setShowCoModal(false);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally { setCoSaving(false); }
  }

  async function handleDeleteCo(id: string) {
    if (!confirm('Supprimer définitivement cette question CO ?')) return;
    setCoDeleting(id);
    try {
      await adminApi.bank.delete(id);
      setBankCoQuestions(prev => prev.filter(q => q.id !== id));
    } catch {}
    finally { setCoDeleting(null); }
  }

  // ── CRUD banque EO ────────────────────────────────────────────
  function openCreateEo() {
    setEditingEo(null);
    setEoForm({ ...EMPTY_EO_FORM });
    setShowEoModal(true);
  }

  function openEditEo(s: BankSession) {
    setEditingEo(s);
    setEoForm({
      section: 'EO',
      question: s.question,
      explanation: s.explanation ?? '',
      theme: s.theme ?? '',
      taskNumber: s.taskNumber,
      sessionGroup: s.sessionGroup,
      timeLimitMin: s.timeLimitMin ?? TASK_TIME[s.taskNumber] ?? 2,
      active: s.active,
    });
    setShowEoModal(true);
  }

  async function handleSaveEo() {
    if (!eoForm.question.trim()) return;
    setEoSaving(true);
    try {
      if (editingEo) {
        const { session } = await adminApi.sessions.update(editingEo.id, eoForm);
        setEoSessions(prev => prev.map(s => s.id === editingEo.id ? session : s));
      } else {
        const { session } = await adminApi.sessions.create(eoForm);
        setEoSessions(prev => [session, ...prev]);
      }
      setShowEoModal(false);
    } catch (e) {
      alert('Erreur : ' + (e instanceof Error ? e.message : String(e)));
    } finally { setEoSaving(false); }
  }

  async function handleDeleteEo(id: string) {
    if (!confirm('Supprimer définitivement cette tâche ?')) return;
    setEoDeleting(id);
    try {
      await adminApi.sessions.delete(id);
      setEoSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
    finally { setEoDeleting(null); }
  }

  // ── CRUD banque ───────────────────────────────────────────────
  function openCreate() {
    setEditingQ(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(q: BankQuestion) {
    setEditingQ(q);
    setForm({
      section: q.section, level: q.level,
      question: q.question,
      options: q.options ?? { a: '', b: '', c: '', d: '' },
      answer: q.answer ?? 'a',
      explanation: q.explanation ?? '',
      theme: q.theme ?? '',
      active: q.active,
    });
    setShowModal(true);
  }

  async function handleSave() {
    if (!form.question.trim()) return;
    setSaving(true);
    try {
      if (editingQ) {
        const { question } = await adminApi.bank.update(editingQ.id, form);
        setBankQuestions(prev => prev.map(q => q.id === editingQ.id ? question : q));
      } else {
        const { question } = await adminApi.bank.create(form);
        setBankQuestions(prev => [question, ...prev]);
      }
      setShowModal(false);
    } catch (e) {
      alert('Erreur lors de la sauvegarde : ' + (e instanceof Error ? e.message : String(e)));
    }
    finally { setSaving(false); }
  }

  async function handleDeleteInvalid() {
    if (!confirm(`Supprimer définitivement les ${ceInvalidCount} exercices CE invalides de la banque ?`)) return;
    setDeletingInvalid(true);
    try {
      await Promise.all(ceInvalidIds.map(id => adminApi.bank.delete(id)));
      setBankQuestions(prev => prev.filter(q => !ceInvalidIds.includes(q.id)));
      setCeInvalidCount(0);
      setCeInvalidIds([]);
      setGeneratedCe([]);
    } catch {}
    finally { setDeletingInvalid(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm('Supprimer définitivement cette question ?')) return;
    setDeleting(id);
    try {
      await adminApi.bank.delete(id);
      setBankQuestions(prev => prev.filter(q => q.id !== id));
    } catch {}
    finally { setDeleting(null); }
  }

  // ── Filtrage banques ──────────────────────────────────────────
  const filteredCo = bankCoQuestions.filter(q => {
    const matchText = !coFilter || q.question.toLowerCase().includes(coFilter.toLowerCase()) || (q.theme ?? '').toLowerCase().includes(coFilter.toLowerCase());
    const matchLevel = !coLevelFilter || q.level === coLevelFilter;
    return matchText && matchLevel;
  });

  const filteredBank = bankQuestions.filter(q => {
    const matchText = !bankFilter || q.question.toLowerCase().includes(bankFilter.toLowerCase()) || (q.theme ?? '').toLowerCase().includes(bankFilter.toLowerCase());
    const matchLevel = !bankLevelFilter || q.level === bankLevelFilter;
    return matchText && matchLevel;
  });

  const filteredEo = eoSessions.filter(s => {
    const matchText = !eoFilter || s.question.toLowerCase().includes(eoFilter.toLowerCase()) || (s.theme ?? '').toLowerCase().includes(eoFilter.toLowerCase());
    const matchGroup = !eoGroupFilter || s.sessionGroup === eoGroupFilter;
    const matchTask = !eoTaskFilter || String(s.taskNumber) === eoTaskFilter;
    return matchText && matchGroup && matchTask;
  });

  const filteredEe = eeSessions.filter(s => {
    const matchText = !eeFilter || s.question.toLowerCase().includes(eeFilter.toLowerCase()) || (s.theme ?? '').toLowerCase().includes(eeFilter.toLowerCase());
    const matchTask = !eeTaskFilter || String(s.taskNumber) === eeTaskFilter;
    return matchText && matchTask;
  });

  // ── Génération aléatoire des épreuves ────────────────────────
  type EeSerieGenerated = { id: number; t1: BankSession; t2: BankSession; t3: BankSession };
  type EoSerieGenerated = { id: number; t1: BankSession; t2: BankSession; t3: BankSession };
  type CeSerieGenerated  = { id: number; questions: BankQuestion[] };
  type CoSerieGenerated  = { id: number; questions: BankQuestion[] };

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  const CE_DISTRIB: Record<string, number> = { A1: 3, A2: 6, B1: 7, B2: 8, C1: 8, C2: 7 };
  const CO_DISTRIB: Record<string, number> = { A1: 4, A2: 6, B1: 9, B2: 10, C1: 6, C2: 4 };

  function buildEeSeries(count: number): EeSerieGenerated[] {
    const t1 = eeSessions.filter(s => s.taskNumber === 1 && s.active);
    const t2 = eeSessions.filter(s => s.taskNumber === 2 && s.active);
    const t3 = eeSessions.filter(s => s.taskNumber === 3 && s.active);
    if (!t1.length || !t2.length || !t3.length) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      t1: t1[Math.floor(Math.random() * t1.length)],
      t2: t2[Math.floor(Math.random() * t2.length)],
      t3: t3[Math.floor(Math.random() * t3.length)],
    }));
  }

  function buildEoSeries(count: number): EoSerieGenerated[] {
    const t1 = eoSessions.filter(s => s.taskNumber === 1 && s.active);
    const t2 = eoSessions.filter(s => s.taskNumber === 2 && s.active);
    const t3 = eoSessions.filter(s => s.taskNumber === 3 && s.active);
    if (!t1.length || !t2.length || !t3.length) return [];
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      t1: t1[Math.floor(Math.random() * t1.length)],
      t2: t2[Math.floor(Math.random() * t2.length)],
      t3: t3[Math.floor(Math.random() * t3.length)],
    }));
  }

  function ceQuestionIsValid(question: string): boolean {
    const paragraphs = question.split(/\n+/).map(p => p.trim()).filter(Boolean);
    const last = paragraphs[paragraphs.length - 1] ?? '';
    return last.endsWith('?');
  }

  function buildCoSeries(count: number): CoSerieGenerated[] {
    const allCo = bankCoQuestions.filter(q => q.active);
    const byLevel: Record<string, BankQuestion[]> = {};
    for (const q of allCo) {
      if (!byLevel[q.level]) byLevel[q.level] = [];
      byLevel[q.level].push(q);
    }
    const levelOrder = Object.keys(CO_DISTRIB);
    return Array.from({ length: count }, (_, i) => {
      const picked: BankQuestion[] = [];
      for (const [level, target] of Object.entries(CO_DISTRIB)) {
        picked.push(...shuffle(byLevel[level] ?? []).slice(0, target));
      }
      picked.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
      return { id: i + 1, questions: picked };
    });
  }

  function buildCeSeries(count: number): CeSerieGenerated[] {
    const allCe = bankQuestions.filter(q => q.section === 'CE');
    const invalid = allCe.filter(q => !ceQuestionIsValid(q.question));
    setCeInvalidCount(invalid.length);
    setCeInvalidIds(invalid.map(q => q.id));
    const valid = allCe.filter(q => ceQuestionIsValid(q.question));
    const byLevel: Record<string, BankQuestion[]> = {};
    for (const q of valid) {
      if (!byLevel[q.level]) byLevel[q.level] = [];
      byLevel[q.level].push(q);
    }
    return Array.from({ length: count }, (_, i) => {
      const picked: BankQuestion[] = [];
      for (const [level, target] of Object.entries(CE_DISTRIB)) {
        picked.push(...shuffle(byLevel[level] ?? []).slice(0, target));
      }
      return { id: i + 1, questions: shuffle(picked) };
    });
  }

  function handleGenerate() {
    setGenerating(true);
    setSavedFormationSections(prev => prev.filter(s => s !== formationSection));

    if (formationSection === 'CO') {
      const run = async () => {
        let coQuestions = bankCoQuestions;
        if (coQuestions.length === 0) {
          try {
            const data = await adminApi.bank.list({ section: 'CO' });
            setBankCoQuestions(data.questions);
            setBankCoLoaded(true);
            coQuestions = data.questions;
          } catch (err) {
            console.error('[CO] Erreur chargement banque:', err);
          }
        }
        const allCo = coQuestions.filter(q => q.active);
        const byLevel: Record<string, BankQuestion[]> = {};
        for (const q of allCo) {
          if (!byLevel[q.level]) byLevel[q.level] = [];
          byLevel[q.level].push(q);
        }
        const levelOrder = Object.keys(CO_DISTRIB);
        const series: CoSerieGenerated[] = Array.from({ length: 50 }, (_, i) => {
          const picked: BankQuestion[] = [];
          for (const [level, target] of Object.entries(CO_DISTRIB)) {
            picked.push(...shuffle(byLevel[level] ?? []).slice(0, Number(target)));
          }
          picked.sort((a, b) => levelOrder.indexOf(a.level) - levelOrder.indexOf(b.level));
          return { id: i + 1, questions: picked };
        });
        setGeneratedCo(series);
        setGenerating(false);
      };
      run();
      return;
    }

    setTimeout(() => {
      if (formationSection === 'EE') setGeneratedEe(buildEeSeries(50));
      else if (formationSection === 'EO') setGeneratedEo(buildEoSeries(50));
      else setGeneratedCe(buildCeSeries(50));
      setGenerating(false);
    }, 300);
  }

  async function handleSaveFormation() {
    setSavingFormation(true);
    try {
      if (formationSection === 'EE') {
        const raw: EeSerieRaw[] = generatedEe.map(s => ({ id: s.id, t1Id: s.t1.id, t2Id: s.t2.id, t3Id: s.t3.id }));
        await adminApi.examSeries.save({ section: 'EE', series: raw });
      } else if (formationSection === 'EO') {
        const raw: EoSerieRaw[] = generatedEo.map(s => ({ id: s.id, t1Id: s.t1.id, t2Id: s.t2.id, t3Id: s.t3.id }));
        await adminApi.examSeries.save({ section: 'EO', series: raw });
      } else if (formationSection === 'CO') {
        const raw: CeSerieRaw[] = generatedCo.map(s => ({ id: s.id, questionIds: s.questions.map(q => q.id) }));
        await adminApi.examSeries.save({ section: 'CO', series: raw });
      } else {
        const raw: CeSerieRaw[] = generatedCe.map(s => ({ id: s.id, questionIds: s.questions.map(q => q.id) }));
        await adminApi.examSeries.save({ section: 'CE', series: raw });
      }
      setSavedFormationSections(prev => [...new Set([...prev, formationSection])]);
    } catch (err) {
      console.error('Erreur sauvegarde séries:', err);
    } finally {
      setSavingFormation(false);
    }
  }

  function exportJson() {
    const data = formationSection === 'EE' ? generatedEe : formationSection === 'EO' ? generatedEo : generatedCe;
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `epreuves-${formationSection.toLowerCase()}-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Calculs globaux ───────────────────────────────────────────
  const qBySection = questions.reduce<Record<string, number>>((acc, q) => { acc[q.section] = (acc[q.section] ?? 0) + 1; return acc; }, {});
  const qByLevel = questions.reduce<Record<string, number>>((acc, q) => { acc[q.level] = (acc[q.level] ?? 0) + 1; return acc; }, {});
  const subTotal = stats ? Object.values(stats.subscriptions).reduce((a, b) => a + b, 0) : 0;
  const planLabels: Record<string, string> = { free: 'Gratuit', bronze: 'Bronze', silver: 'Silver', gold: 'Gold', pro: 'Pro', annual: 'Annuel' };
  const planColors: Record<string, string> = { free: 'bg-slate-600', bronze: 'bg-amber-500', silver: 'bg-slate-400', gold: 'bg-yellow-400', pro: 'bg-indigo-500', annual: 'bg-emerald-500' };

  if (authLoading || loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Spinner size={40} /></div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminNav />
      <div className="flex-1 min-w-0 px-4 sm:px-8 py-8 space-y-8">

        {/* Header + Onglets */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-black">RéussirTCF Admin ⚡</h1>
              <p className="text-slate-400 mt-1 text-sm">Tableau de bord administrateur</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Services actifs
            </div>
          </div>

          {/* Onglets */}
          <div className="flex gap-1 bg-slate-900/60 border border-slate-800 rounded-xl p-1 overflow-x-auto max-w-full [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
            {[
              { key: 'overview',   label: 'Vue d\'ensemble', icon: '📊' },
              { key: 'banque-co',  label: 'Banque CO',       icon: '🎧' },
              { key: 'banque-ce',  label: 'Banque CE',       icon: '📖' },
              { key: 'banque-ee',  label: 'Banque EE',       icon: '✍️' },
              { key: 'banque-eo',  label: 'Banque EO',       icon: '🎤' },
              { key: 'formation',  label: 'Épreuves',        icon: '🎲' },
              { key: 'acces',      label: 'Accès',           icon: '🔑' },
            ].map(tab => (
              <button key={tab.key} onClick={() => setAdminTab(tab.key as typeof adminTab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all flex-shrink-0
                  ${adminTab === tab.key
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                {tab.icon} {tab.label}
                {tab.key === 'banque-co' && bankCoQuestions.length > 0 && (
                  <span className="bg-sky-500/40 text-sky-200 text-xs px-2 py-0.5 rounded-full">{bankCoQuestions.length}</span>
                )}
                {tab.key === 'banque-ce' && bankQuestions.length > 0 && (
                  <span className="bg-violet-500/40 text-violet-200 text-xs px-2 py-0.5 rounded-full">{bankQuestions.length}</span>
                )}
                {tab.key === 'banque-ee' && eeSessions.length > 0 && (
                  <span className="bg-emerald-500/40 text-emerald-200 text-xs px-2 py-0.5 rounded-full">{eeSessions.length}</span>
                )}
                {tab.key === 'banque-eo' && eoSessions.length > 0 && (
                  <span className="bg-rose-500/40 text-rose-200 text-xs px-2 py-0.5 rounded-full">{eoSessions.length}</span>
                )}
                {tab.key === 'acces' && users.filter(u => u.plan !== 'free').length > 0 && (
                  <span className="bg-emerald-500/40 text-emerald-200 text-xs px-2 py-0.5 rounded-full">{users.filter(u => u.plan !== 'free').length}</span>
                )}
              </button>
            ))}
          </div>
        </motion.div>

        {/* ════════════════════════════ VUE D'ENSEMBLE ══════════════════════════ */}
        {adminTab === 'overview' && (
          <>
            {/* Métriques */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Utilisateurs actifs',   value: stats?.totalUsers ?? 0,         icon: '👥', color: 'from-indigo-500 to-violet-500', href: '/admin/users' },
                { label: 'Sessions TCF totales',   value: stats?.totalSessions ?? 0,      icon: '📊', color: 'from-sky-500 to-cyan-500' },
                { label: 'Professeurs approuvés',  value: stats?.approvedProfessors ?? 0, icon: '👨‍🏫', color: 'from-emerald-500 to-teal-500', href: '/admin/professors' },
                { label: 'Classes actives',        value: stats?.totalClasses ?? 0,       icon: '🏫', color: 'from-amber-500 to-orange-500' },
              ].map((s, i) => (
                <motion.div key={s.label} transition={{ delay: i * 0.07 }}>
                  <StatCard {...s} />
                </motion.div>
              ))}
            </div>

            {/* Banque + Activité */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h2 className="font-black text-lg">Banque de questions 📚</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{questions.length} questions en base</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setAdminTab('banque-co')}
                      className="text-xs text-sky-400 hover:text-sky-300 bg-sky-950/40 border border-sky-800 px-3 py-1.5 rounded-lg transition-colors">
                      Gérer CO →
                    </button>
                    <button onClick={() => setAdminTab('banque-eo')}
                      className="text-xs text-rose-400 hover:text-rose-300 bg-rose-950/40 border border-rose-800 px-3 py-1.5 rounded-lg transition-colors">
                      Gérer EO →
                    </button>
                    <button onClick={() => setAdminTab('banque-ee')}
                      className="text-xs text-emerald-400 hover:text-emerald-300 bg-emerald-950/40 border border-emerald-800 px-3 py-1.5 rounded-lg transition-colors">
                      Gérer EE →
                    </button>
                    <button onClick={() => setAdminTab('banque-ce')}
                      className="text-xs text-violet-400 hover:text-violet-300 bg-violet-950/40 border border-violet-800 px-3 py-1.5 rounded-lg transition-colors">
                      Gérer CE →
                    </button>
                  </div>
                </div>
                <div className="space-y-3 mb-5">
                  {['CO', 'CE', 'EE', 'EO'].map(section => {
                    const count = qBySection[section] ?? 0;
                    const max = section === 'CO' || section === 'CE' ? 40 : section === 'EE' ? 18 : 15;
                    const pct = Math.round((count / max) * 100);
                    const meta = SECTION_META[section];
                    return (
                      <div key={section}>
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="flex items-center gap-1.5 text-slate-300">
                            <span>{meta.icon}</span><span className="font-bold">{section}</span>
                            <span className="text-slate-500">{meta.label}</span>
                          </span>
                          <span className="text-slate-400 font-bold">{count} / {max}</span>
                        </div>
                        <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                          <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.7, delay: 0.2 }}
                            className={`h-full rounded-full bg-gradient-to-r ${meta.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="border-t border-slate-800 pt-4">
                  <p className="text-xs text-slate-500 mb-2">Répartition par niveau</p>
                  <div className="flex flex-wrap gap-2">
                    {['A2', 'B1', 'B2', 'C1', 'C2'].map(level => (
                      <div key={level} className="flex items-center gap-1.5 bg-slate-800 rounded-lg px-3 py-1.5">
                        <span className="text-xs font-black text-white">{level}</span>
                        <span className="text-xs text-slate-400">{qByLevel[level] ?? 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="font-black text-lg mb-5">Activité par section 📈</h2>
                {stats?.sessionsBySection && Object.keys(stats.sessionsBySection).length > 0 ? (
                  <div className="space-y-3">
                    {['CO', 'CE', 'EE', 'EO'].map(section => {
                      const count = stats.sessionsBySection?.[section] ?? 0;
                      const avg = stats.avgScoresBySection?.[section] ?? 0;
                      const maxCount = Math.max(...Object.values(stats.sessionsBySection ?? {}), 1);
                      const pct = Math.round((count / maxCount) * 100);
                      const meta = SECTION_META[section];
                      return (
                        <div key={section} className={`${meta.bg} border border-slate-800 rounded-xl p-4`}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold flex items-center gap-2">{meta.icon} {section}
                              <span className="text-xs text-slate-400 font-normal">{meta.label}</span>
                            </span>
                            <div className="flex items-center gap-3 text-xs">
                              <span className="text-slate-400">{count} sessions</span>
                              {avg > 0 && <span className="font-black text-white">moy. {avg}/100</span>}
                            </div>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                              className={`h-full rounded-full bg-gradient-to-r ${meta.color}`} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                    <span className="text-4xl mb-3">📊</span>
                    <p className="text-sm">Aucune session enregistrée pour l&apos;instant.</p>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Abonnements + Profs */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-lg">Abonnements 💳</h2>
                  <Link href="/admin/subscriptions" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Gérer →</Link>
                </div>
                {subTotal > 0 ? (
                  <div className="space-y-3">
                    {Object.entries(stats?.subscriptions ?? {}).map(([plan, count]) => {
                      const pct = Math.round((count / subTotal) * 100);
                      return (
                        <div key={plan}>
                          <div className="flex items-center justify-between text-sm mb-1.5">
                            <span className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${planColors[plan] ?? 'bg-slate-500'}`} />
                              <span className="text-slate-300 font-medium">{planLabels[plan] ?? plan}</span>
                            </span>
                            <span className="text-white font-black">{count} <span className="text-slate-500 font-normal text-xs">({pct}%)</span></span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }}
                              className={`h-full rounded-full ${planColors[plan] ?? 'bg-slate-500'}`} />
                          </div>
                        </div>
                      );
                    })}
                    <div className="pt-2 border-t border-slate-800 text-xs text-slate-500 flex justify-between">
                      <span>Total abonnés</span><span className="font-black text-white">{subTotal}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-slate-600">
                    <span className="text-4xl mb-3">💳</span>
                    <p className="text-sm">Aucun abonnement actif</p>
                    <Link href="/admin/subscriptions" className="mt-3 text-xs text-indigo-400 hover:underline">Attribuer manuellement →</Link>
                  </div>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-black text-lg">Demandes prof 👨‍🏫</h2>
                  <Link href="/admin/professors" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Gérer →</Link>
                </div>
                {(stats?.pendingProfRequests ?? 0) > 0 ? (
                  <div className="flex items-center gap-4 bg-amber-950/50 border border-amber-800 rounded-xl p-4">
                    <span className="text-3xl">⏳</span>
                    <div>
                      <p className="font-black text-amber-300 text-lg">{stats?.pendingProfRequests} en attente</p>
                      <Link href="/admin/professors" className="text-xs text-amber-400 hover:underline mt-1 inline-block">Voir et approuver →</Link>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-900 rounded-xl p-4">
                    <span className="text-2xl">✅</span>
                    <div>
                      <p className="font-bold text-emerald-400 text-sm">Aucune demande en attente</p>
                      <p className="text-xs text-slate-500 mt-0.5">{stats?.approvedProfessors ?? 0} professeur(s) approuvé(s)</p>
                    </div>
                  </div>
                )}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Link href="/admin/professors" className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl px-4 py-3 text-xs font-bold text-slate-300">
                    📧 Inviter un prof
                  </Link>
                  <Link href="/admin/users" className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 transition-colors rounded-xl px-4 py-3 text-xs font-bold text-slate-300">
                    👥 Voir les users
                  </Link>
                </div>
              </motion.div>
            </div>

            {/* Sessions récentes */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="font-black text-lg mb-5">Sessions récentes 🕐</h2>
              {stats?.recentSessions && stats.recentSessions.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-800 text-left">
                        {['Section', 'Score', 'Résultat', 'Durée', 'Date'].map(h => (
                          <th key={h} className="pb-3 text-xs text-slate-500 font-bold uppercase tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {stats.recentSessions.map((s, i) => {
                        const meta = SECTION_META[s.section];
                        const dur = s.durationSeconds ? `${Math.floor(s.durationSeconds / 60)}m ${s.durationSeconds % 60}s` : '—';
                        const date = new Date(s.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
                        const scoreColor = s.score >= 70 ? 'text-emerald-400' : s.score >= 50 ? 'text-amber-400' : 'text-red-400';
                        return (
                          <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                            <td className="py-3 pr-4">
                              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-gradient-to-r ${meta?.color ?? 'from-slate-600 to-slate-700'} text-white`}>
                                {meta?.icon} {s.section}
                              </span>
                            </td>
                            <td className={`py-3 pr-4 font-black ${scoreColor}`}>{s.score}/100</td>
                            <td className="py-3 pr-4 text-slate-400">{s.correct}/{s.total} correctes</td>
                            <td className="py-3 pr-4 text-slate-500">{dur}</td>
                            <td className="py-3 text-slate-600 text-xs">{date}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-slate-600">
                  <span className="text-4xl mb-3">🕐</span>
                  <p className="text-sm">Aucune session enregistrée pour l&apos;instant.</p>
                </div>
              )}
            </motion.div>

            {/* Actions rapides */}
            <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="font-black text-lg mb-4">Actions rapides ⚡</h2>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { label: 'Ajouter CO', icon: '🎧', color: 'hover:border-sky-700 hover:bg-sky-950/30', action: () => { setAdminTab('banque-co'); setTimeout(openCreateCo, 50); } },
                  { label: 'Ajouter CE', icon: '📖', color: 'hover:border-violet-700 hover:bg-violet-950/30', action: () => { setAdminTab('banque-ce'); setTimeout(openCreate, 50); } },
                  { label: 'Ajouter EE', icon: '✍️', color: 'hover:border-emerald-700 hover:bg-emerald-950/30', action: () => { setAdminTab('banque-ee'); setTimeout(openCreateEe, 50); } },
                  { label: 'Ajouter EO', icon: '🎤', color: 'hover:border-rose-700 hover:bg-rose-950/30', action: () => { setAdminTab('banque-eo'); setTimeout(openCreateEo, 50); } },
                  { label: 'Aperçu CE', icon: '📖', color: 'hover:border-sky-700 hover:bg-sky-950/30', action: () => window.open('/admin/preview-ce', '_blank') },
                  { label: 'Audio CO', icon: '🎵', color: 'hover:border-sky-700 hover:bg-sky-950/30', action: () => window.open('/admin/bank-co', '_blank') },
                ].map(a => (
                  <button key={a.label} onClick={a.action}
                    className={`flex flex-col items-center justify-center gap-2 bg-slate-800/60 border border-slate-700 rounded-xl py-4 px-3 text-center transition-all ${a.color}`}>
                    <span className="text-2xl">{a.icon}</span>
                    <span className="text-xs font-bold text-slate-300 leading-tight">{a.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </>
        )}

        {/* ══════════════════════════════ BANQUE EE ══════════════════════════════ */}
        {adminTab === 'banque-ee' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Barre outils */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">✍️ Banque de tâches — EE
                  <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">{filteredEe.length} tâche{filteredEe.length !== 1 ? 's' : ''}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">3 tâches par session · T1 = Message court · T2 = Narration · T3 = Argumentatif</p>
              </div>
              <button onClick={openCreateEe}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow text-sm flex-shrink-0">
                + Ajouter une tâche
              </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Rechercher..." value={eeFilter}
                onChange={e => setEeFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 min-w-[200px]" />
              <select value={eeTaskFilter} onChange={e => setEeTaskFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-emerald-500">
                <option value="">Toutes les tâches</option>
                <option value="1">Tâche 1 — Message court</option>
                <option value="2">Tâche 2 — Narration</option>
                <option value="3">Tâche 3 — Argumentatif</option>
              </select>
              {(eeFilter || eeTaskFilter) && (
                <button onClick={() => { setEeFilter(''); setEeTaskFilter(''); }}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-colors">
                  Effacer ✕
                </button>
              )}
            </div>

            {/* Liste */}
            {eeLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size={36} /></div>
            ) : filteredEe.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <span className="text-5xl mb-4">✍️</span>
                <p className="text-sm font-bold text-slate-500">Aucune tâche EE en base</p>
                <p className="text-xs mt-1 mb-5">Insérez vos questions via SQL ou le formulaire ci-dessus.</p>
                <button onClick={openCreateEe} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  + Ajouter la première tâche
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEe.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors">

                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setEeExpandedId(eeExpandedId === s.id ? null : s.id)}>
                      {/* Badge tâche */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0 mt-0.5">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${TASK_COLORS[s.taskNumber] ?? 'bg-slate-800 text-slate-400'}`}>
                          T{s.taskNumber}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {s.sessionGroup && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full font-mono">{s.sessionGroup}</span>}
                          {s.theme && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full capitalize">{s.theme}</span>}
                          {(s.wordCountMin || s.wordCountMax) && (
                            <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
                              ✎ {s.wordCountMin ?? '?'}–{s.wordCountMax ?? '?'} mots
                            </span>
                          )}
                          {s.timeLimitMin && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">⏱ {s.timeLimitMin} min</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                            {s.active ? '● Actif' : '○ Banque'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">{s.question}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleEe(s); }}
                          disabled={togglingEeId === s.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border disabled:opacity-50
                            ${s.active
                              ? 'bg-emerald-900/40 border-emerald-800 text-emerald-400 hover:bg-red-900/40 hover:border-red-800 hover:text-red-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-emerald-900/40 hover:border-emerald-800 hover:text-emerald-400'}`}>
                          {togglingEeId === s.id ? '…' : s.active ? '● Actif' : '○ Activer'}
                        </button>
                        <a href={`/admin/preview-ee?group=${s.sessionGroup}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-emerald-700">
                          👁 Aperçu
                        </a>
                        <button onClick={e => { e.stopPropagation(); openEditEe(s); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-emerald-900/60 hover:text-emerald-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-emerald-700">
                          ✏️ Modifier
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteEe(s.id); }} disabled={eeDeleting === s.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-red-700 disabled:opacity-50">
                          {eeDeleting === s.id ? '...' : '🗑 Suppr.'}
                        </button>
                        <span className="text-slate-600 text-xs">{eeExpandedId === s.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {eeExpandedId === s.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-800 overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{EE_TASK_LABELS[s.taskNumber]}</p>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-xl p-3 whitespace-pre-line">{s.question}</p>
                            </div>
                            {s.explanation && (
                              <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Critères d&apos;évaluation</p>
                                <p className="text-sm text-slate-300 bg-amber-950/30 border border-amber-900 rounded-xl p-3 leading-relaxed">{s.explanation}</p>
                              </div>
                            )}
                            <div className="text-xs text-slate-600">
                              Session: <span className="font-mono text-slate-500">{s.sessionGroup}</span> ·
                              ID: <span className="font-mono text-slate-500">{s.id}</span> ·
                              Ajouté le {new Date(s.createdAt).toLocaleDateString('fr-CA')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button onClick={() => { setEeLoaded(false); loadEeSessions(); }} disabled={eeLoading}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors border border-slate-700 disabled:opacity-50">
                {eeLoading ? <Spinner size={14} /> : '↻'} Actualiser la liste
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════ BANQUE EO ══════════════════════════════ */}
        {adminTab === 'banque-eo' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Barre outils */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">🎤 Banque de sessions — EO
                  <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">{filteredEo.length} tâche{filteredEo.length !== 1 ? 's' : ''}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">3 tâches par session (EO-S01…EO-S08) · Pas de niveau évalué en expression orale</p>
              </div>
              <button onClick={openCreateEo}
                className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow text-sm flex-shrink-0">
                + Ajouter une tâche
              </button>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Rechercher..." value={eoFilter}
                onChange={e => setEoFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 min-w-[200px]" />
              <select value={eoGroupFilter} onChange={e => setEoGroupFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-rose-500">
                <option value="">Toutes les sessions</option>
                {EO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
              <select value={eoTaskFilter} onChange={e => setEoTaskFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-rose-500">
                <option value="">Toutes les tâches</option>
                <option value="1">Tâche 1 — Présentation</option>
                <option value="2">Tâche 2 — Interaction</option>
                <option value="3">Tâche 3 — Argumentation</option>
              </select>
              {(eoFilter || eoGroupFilter || eoTaskFilter) && (
                <button onClick={() => { setEoFilter(''); setEoGroupFilter(''); setEoTaskFilter(''); }}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-colors">
                  Effacer ✕
                </button>
              )}
            </div>

            {/* Liste */}
            {eoLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size={36} /></div>
            ) : filteredEo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <span className="text-5xl mb-4">🎤</span>
                <p className="text-sm font-bold text-slate-500">Aucune tâche EO en base</p>
                <p className="text-xs mt-1 mb-5">Ajoutez vos sessions via SQL ou le formulaire ci-dessus.</p>
                <button onClick={openCreateEo} className="bg-rose-600 hover:bg-rose-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  + Ajouter la première tâche
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEo.map((s, i) => (
                  <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors">

                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setEoExpandedId(eoExpandedId === s.id ? null : s.id)}>
                      {/* Session + Tâche badges */}
                      <div className="flex flex-col gap-1.5 flex-shrink-0 mt-0.5">
                        <span className="text-xs font-black px-2.5 py-1 rounded-lg bg-slate-700 text-slate-200">{s.sessionGroup}</span>
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${TASK_COLORS[s.taskNumber] ?? 'bg-slate-800 text-slate-400'}`}>
                          T{s.taskNumber}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {s.theme && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full capitalize">{s.theme}</span>}
                          {s.timeLimitMin && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">⏱ {s.timeLimitMin} min</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.active ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                            {s.active ? '● Actif' : '○ Banque'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">{s.question}</p>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={`/admin/preview-eo?group=${s.sessionGroup}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-sky-700">
                          👁 Aperçu
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleEo(s); }}
                          disabled={togglingEoId === s.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border disabled:opacity-50
                            ${s.active
                              ? 'bg-emerald-900/40 border-emerald-800 text-emerald-400 hover:bg-red-900/40 hover:border-red-800 hover:text-red-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-emerald-900/40 hover:border-emerald-800 hover:text-emerald-400'}`}>
                          {togglingEoId === s.id ? '…' : s.active ? '● Actif' : '○ Activer'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEditEo(s); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 hover:text-rose-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-rose-700">
                          ✏️ Modifier
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteEo(s.id); }} disabled={eoDeleting === s.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-red-700 disabled:opacity-50">
                          {eoDeleting === s.id ? '...' : '🗑 Suppr.'}
                        </button>
                        <span className="text-slate-600 text-xs">{eoExpandedId === s.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {eoExpandedId === s.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-800 overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">{TASK_LABELS[s.taskNumber]}</p>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-xl p-3">{s.question}</p>
                            </div>
                            {s.explanation && (
                              <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Exemple de réponse</p>
                                <p className="text-sm text-slate-300 bg-amber-950/30 border border-amber-900 rounded-xl p-3 leading-relaxed">{s.explanation}</p>
                              </div>
                            )}
                            <div className="text-xs text-slate-600">
                              ID: <span className="font-mono text-slate-500">{s.id}</span> · Ajouté le {new Date(s.createdAt).toLocaleDateString('fr-CA')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button onClick={() => { setEoLoaded(false); loadEoSessions(); }} disabled={eoLoading}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors border border-slate-700 disabled:opacity-50">
                {eoLoading ? <Spinner size={14} /> : '↻'} Actualiser la liste
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════ BANQUE CO ══════════════════════════════ */}
        {adminTab === 'banque-co' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Barre outils */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">🎧 Banque d&apos;exercices — CO
                  <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">{filteredCo.length} question{filteredCo.length !== 1 ? 's' : ''}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Questions QCM audio — séries CO groupées par sessionGroup</p>
              </div>
              <div className="flex items-center gap-2">
                <a href="/admin/bank-co" target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-3 py-2.5 rounded-xl transition-colors text-sm flex-shrink-0">
                  🎵 Gérer l&apos;audio
                </a>
                <button onClick={openCreateCo}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow text-sm flex-shrink-0">
                  + Ajouter une question
                </button>
              </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3">
              <input type="text" placeholder="Rechercher..." value={coFilter}
                onChange={e => setCoFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 min-w-[200px]" />
              <select value={coLevelFilter} onChange={e => setCoLevelFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-sky-500">
                <option value="">Tous les niveaux</option>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {(coFilter || coLevelFilter) && (
                <button onClick={() => { setCoFilter(''); setCoLevelFilter(''); }}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-colors">
                  Effacer ✕
                </button>
              )}
            </div>

            {/* Progression audio */}
            {bankCoQuestions.length > 0 && (() => {
              const withAudio = bankCoQuestions.filter(q => q.audioUrl).length;
              const pct = Math.round((withAudio / bankCoQuestions.length) * 100);
              return (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400">Progression audio</span>
                    <span className={`text-xs font-black ${pct === 100 ? 'text-emerald-400' : pct > 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {withAudio}/{bankCoQuestions.length} configurés ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-500' : pct > 50 ? 'bg-amber-400' : 'bg-sky-500'}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })()}

            {/* Liste */}
            {bankCoLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size={36} /></div>
            ) : filteredCo.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <span className="text-5xl mb-4">🎧</span>
                <p className="text-sm font-bold text-slate-500">Aucune question dans la banque CO</p>
                <p className="text-xs mt-1 mb-5">Ajoutez vos premières questions via SQL ou le formulaire ci-dessus.</p>
                <button onClick={openCreateCo} className="bg-sky-600 hover:bg-sky-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  + Ajouter la première question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCo.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors">

                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setCoExpandedId(coExpandedId === q.id ? null : q.id)}>
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg ${LEVEL_COLORS[q.level] ?? 'bg-slate-700 text-slate-200'}`}>
                          {q.level}
                        </span>
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {q.theme && <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full capitalize">{q.theme}</span>}
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${q.audioUrl ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-red-900/30 text-red-400 border border-red-800'}`}>
                            {q.audioUrl ? '🎵 Audio OK' : '🔇 TTS fallback'}
                          </span>
                          {q.imageUrl && <span className="text-xs text-blue-400 bg-blue-900/30 border border-blue-800 px-2 py-0.5 rounded-full">🖼 Image</span>}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.active ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                            {q.active ? '● Actif' : '○ Banque'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">{q.question}</p>
                        {q.options && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(q.options).map(([k, v]) => (
                              <span key={k} className={`text-xs px-2 py-0.5 rounded-lg border ${q.answer === k ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300 font-bold' : 'border-slate-700 text-slate-500'}`}>
                                <span className="font-black uppercase mr-1">{k})</span>
                                {(v as string).slice(0, 35)}{(v as string).length > 35 ? '…' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href="/admin/bank-co" target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-sky-700">
                          🎵 Audio
                        </a>
                        <button onClick={e => { e.stopPropagation(); handleToggleCo(q); }} disabled={togglingCoId === q.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border disabled:opacity-50
                            ${q.active ? 'bg-emerald-900/40 border-emerald-800 text-emerald-400 hover:bg-red-900/40 hover:border-red-800 hover:text-red-400' : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-emerald-900/40 hover:border-emerald-800 hover:text-emerald-400'}`}>
                          {togglingCoId === q.id ? '…' : q.active ? '● Actif' : '○ Activer'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEditCo(q); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-sky-700">
                          ✏️ Modifier
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDeleteCo(q.id); }} disabled={coDeleting === q.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-red-700 disabled:opacity-50">
                          {coDeleting === q.id ? '...' : '🗑 Suppr.'}
                        </button>
                        <span className="text-slate-600 text-xs">{coExpandedId === q.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {coExpandedId === q.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-800 overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Texte question</p>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-xl p-3">{q.question}</p>
                            </div>
                            {q.transcript && (
                              <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Transcript audio</p>
                                <p className="text-sm text-slate-300 bg-sky-950/30 border border-sky-900 rounded-xl p-3 leading-relaxed">{q.transcript}</p>
                              </div>
                            )}
                            {q.audioUrl && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-bold">Audio :</span>
                                <a href={q.audioUrl} target="_blank" rel="noreferrer"
                                  className="text-xs text-sky-400 hover:underline font-mono truncate max-w-xs">{q.audioUrl}</a>
                              </div>
                            )}
                            {q.imageUrl && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500 font-bold">Image :</span>
                                <a href={q.imageUrl} target="_blank" rel="noreferrer"
                                  className="text-xs text-blue-400 hover:underline font-mono truncate max-w-xs">{q.imageUrl}</a>
                              </div>
                            )}
                            <div className="text-xs text-slate-600">
                              {q.sessionGroup && <span>Série : <span className="font-mono text-slate-500">{q.sessionGroup}</span> · </span>}
                              ID : <span className="font-mono text-slate-500">{q.id}</span> · Ajouté le {new Date(q.createdAt).toLocaleDateString('fr-CA')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            <div className="flex justify-center pt-2">
              <button onClick={() => { setBankCoLoaded(false); loadBankCo(); }} disabled={bankCoLoading}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors border border-slate-700 disabled:opacity-50">
                {bankCoLoading ? <Spinner size={14} /> : '↻'} Actualiser la liste
              </button>
            </div>
          </motion.div>
        )}

        {/* ══════════════════════════════ BANQUE CE ══════════════════════════════ */}
        {adminTab === 'banque-ce' && (
          <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">

            {/* Barre outils */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black flex items-center gap-2">📖 Banque d&apos;exercices — CE
                  <span className="text-sm font-normal text-slate-400 bg-slate-800 px-2.5 py-0.5 rounded-full">{filteredBank.length} question{filteredBank.length !== 1 ? 's' : ''}</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Questions en banque — non visibles des étudiants. Seront assemblées en épreuves TCF.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleExportCe(filteredBank)} disabled={filteredBank.length === 0}
                  className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold px-3 py-2.5 rounded-xl transition-colors text-sm flex-shrink-0 disabled:opacity-40">
                  ↓ JSON
                </button>
                <button onClick={openCreate}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-bold px-4 py-2.5 rounded-xl transition-colors shadow text-sm flex-shrink-0">
                  + Ajouter une question
                </button>
              </div>
            </div>

            {/* Filtres */}
            <div className="flex flex-wrap gap-3">
              <input
                type="text" placeholder="Rechercher..." value={bankFilter}
                onChange={e => setBankFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-4 py-2 text-sm outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 min-w-[200px]"
              />
              <select value={bankLevelFilter} onChange={e => setBankLevelFilter(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white rounded-xl px-4 py-2 text-sm outline-none focus:border-violet-500">
                <option value="">Tous les niveaux</option>
                {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
              </select>
              {(bankFilter || bankLevelFilter) && (
                <button onClick={() => { setBankFilter(''); setBankLevelFilter(''); }}
                  className="text-xs text-slate-400 hover:text-white bg-slate-800 px-3 py-2 rounded-xl transition-colors">
                  Effacer ✕
                </button>
              )}
            </div>

            {/* Liste */}
            {bankLoading ? (
              <div className="flex items-center justify-center py-20"><Spinner size={36} /></div>
            ) : filteredBank.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-600 bg-slate-900/50 border border-slate-800 rounded-2xl">
                <span className="text-5xl mb-4">📭</span>
                <p className="text-sm font-bold text-slate-500">Aucune question dans la banque CE</p>
                <p className="text-xs mt-1 mb-5">Ajoutez vos premières questions via SQL ou le formulaire ci-dessus.</p>
                <button onClick={openCreate} className="bg-violet-600 hover:bg-violet-500 text-white font-bold px-5 py-2.5 rounded-xl text-sm transition-colors">
                  + Ajouter la première question
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredBank.map((q, i) => (
                  <motion.div key={q.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl overflow-hidden transition-colors">

                    {/* En-tête ligne */}
                    <div className="flex items-start gap-3 p-4 cursor-pointer" onClick={() => setExpandedId(expandedId === q.id ? null : q.id)}>
                      <div className="flex-shrink-0 mt-0.5">
                        <span className={`inline-block text-xs font-black px-2.5 py-1 rounded-lg ${LEVEL_COLORS[q.level] ?? 'bg-slate-700 text-slate-200'}`}>
                          {q.level}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          {q.theme && (
                            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full capitalize">{q.theme}</span>
                          )}
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${q.active ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-800' : 'bg-slate-800 text-slate-500'}`}>
                            {q.active ? '● Actif' : '○ Banque'}
                          </span>
                        </div>
                        <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">{renderBold(q.question.replace(/\n/g, ' '))}</p>
                        {q.options && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {Object.entries(q.options).map(([k, v]) => (
                              <span key={k} className={`text-xs px-2 py-0.5 rounded-lg border transition-colors
                                ${q.answer === k
                                  ? 'border-emerald-600 bg-emerald-900/40 text-emerald-300 font-bold'
                                  : 'border-slate-700 text-slate-500'}`}>
                                <span className="font-black uppercase mr-1">{k})</span>
                                {(v as string).replace(/\*\*/g, '').slice(0, 40)}{(v as string).length > 40 ? '…' : ''}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <a href={`/admin/preview-ce?id=${q.id}`} target="_blank" rel="noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-sky-900/60 hover:text-sky-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-sky-700">
                          👁 Aperçu
                        </a>
                        <button
                          onClick={e => { e.stopPropagation(); handleToggleCe(q); }}
                          disabled={togglingCeId === q.id}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors border disabled:opacity-50
                            ${q.active
                              ? 'bg-emerald-900/40 border-emerald-800 text-emerald-400 hover:bg-red-900/40 hover:border-red-800 hover:text-red-400'
                              : 'bg-slate-800 border-slate-700 text-slate-500 hover:bg-emerald-900/40 hover:border-emerald-800 hover:text-emerald-400'}`}>
                          {togglingCeId === q.id ? '…' : q.active ? '● Actif' : '○ Activer'}
                        </button>
                        <button onClick={e => { e.stopPropagation(); openEdit(q); }}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-violet-900/60 hover:text-violet-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-violet-700">
                          ✏️ Modifier
                        </button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(q.id); }} disabled={deleting === q.id}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-red-900/60 hover:text-red-300 text-slate-400 text-xs font-bold transition-colors border border-slate-700 hover:border-red-700 disabled:opacity-50">
                          {deleting === q.id ? '...' : '🗑 Suppr.'}
                        </button>
                        <span className="text-slate-600 text-xs">{expandedId === q.id ? '▲' : '▼'}</span>
                      </div>
                    </div>

                    {/* Détail dépliable */}
                    <AnimatePresence>
                      {expandedId === q.id && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                          className="border-t border-slate-800 overflow-hidden">
                          <div className="p-4 space-y-3">
                            <div>
                              <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Texte complet</p>
                              <p className="text-sm text-slate-300 leading-relaxed bg-slate-800/50 rounded-xl p-3">{renderBoldMultiline(q.question)}</p>
                            </div>
                            {q.explanation && (
                              <div>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Explication</p>
                                <p className="text-sm text-slate-300 bg-emerald-950/30 border border-emerald-900 rounded-xl p-3">{renderBold(q.explanation ?? '')}</p>
                              </div>
                            )}
                            <div className="text-xs text-slate-600">
                              ID: <span className="font-mono text-slate-500">{q.id}</span> · Ajouté le {new Date(q.createdAt).toLocaleDateString('fr-CA')}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Bouton refresh */}
            <div className="flex justify-center pt-2">
              <button onClick={loadBank} disabled={bankLoading}
                className="flex items-center gap-2 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-xl transition-colors border border-slate-700 disabled:opacity-50">
                {bankLoading ? <Spinner size={14} /> : '↻'} Actualiser la liste
              </button>
            </div>
          </motion.div>
        )}

      {/* ══════════════════════ MODAL CRUD ══════════════════════ */}
      <AnimatePresence>
        {showModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowModal(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-4"
              onClick={e => e.stopPropagation()}>

              {/* Header modal */}
              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="font-black text-lg text-white">
                  {editingQ ? '✏️ Modifier la question' : '+ Nouvelle question CE'}
                </h3>
                <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
              </div>

              {/* Corps modal */}
              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Niveau + Thème */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Niveau *</label>
                    <select value={form.level} onChange={e => setForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Thème</label>
                    <input type="text" placeholder="culture, immigration, travail..." value={form.theme ?? ''}
                      onChange={e => setForm(f => ({ ...f, theme: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500" />
                  </div>
                </div>

                {/* Texte question */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Texte de lecture + Question * <span className="text-slate-600 font-normal normal-case">(séparés par une ligne vide)</span>
                  </label>
                  <textarea rows={8} value={form.question}
                    onChange={e => setForm(f => ({ ...f, question: e.target.value }))}
                    placeholder={"Lisez ce texte :\n\n[Votre passage ici...]\n\n[Votre question ici]"}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500 resize-none font-mono" />
                </div>

                {/* Options A B C D */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Options *</label>
                  <div className="space-y-2">
                    {['a', 'b', 'c', 'd'].map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 uppercase transition-colors
                          ${form.answer === k ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {k}
                        </span>
                        <input type="text" placeholder={`Option ${k.toUpperCase()} — utiliser **mot** pour le gras`}
                          value={(form.options as Record<string, string>)?.[k] ?? ''}
                          onChange={e => setForm(f => ({ ...f, options: { ...(f.options as Record<string, string>), [k]: e.target.value } }))}
                          className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-violet-500" />
                        <button onClick={() => setForm(f => ({ ...f, answer: k }))}
                          className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors flex-shrink-0
                            ${form.answer === k
                              ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300'
                              : 'border-slate-700 text-slate-500 hover:border-emerald-700 hover:text-emerald-400'}`}>
                          {form.answer === k ? '✓ Correct' : 'Correct ?'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-slate-600 mt-2">Cliquez &quot;Correct ?&quot; pour marquer la bonne réponse. Lettre surlignée en vert = réponse correcte.</p>
                </div>

                {/* Explication */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Explication (optionnelle)</label>
                  <textarea rows={3} value={form.explanation ?? ''}
                    onChange={e => setForm(f => ({ ...f, explanation: e.target.value }))}
                    placeholder="Explication de la bonne réponse..."
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-violet-500 resize-none" />
                </div>

                {/* Statut */}
                <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <input type="checkbox" id="activeCheck" checked={form.active ?? false}
                    onChange={e => setForm(f => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-violet-500" />
                  <label htmlFor="activeCheck" className="text-sm text-slate-300 cursor-pointer">
                    <span className="font-bold">Rendre active</span>
                    <span className="text-slate-500 text-xs ml-2">(visible dans les épreuves étudiants — à ne cocher qu'une fois l'épreuve assemblée)</span>
                  </label>
                </div>
              </div>

              {/* Footer modal */}
              <div className="flex items-center justify-between p-5 border-t border-slate-800 gap-3">
                <button onClick={() => setShowModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleSave} disabled={saving || !form.question.trim()}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-black px-6 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {saving ? <><Spinner size={16} color="#fff" /> Sauvegarde...</> : editingQ ? '✓ Enregistrer les modifications' : '+ Ajouter à la banque'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* ══════════════════════ MODAL EO ══════════════════════ */}
      <AnimatePresence>
        {showEoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowEoModal(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-4"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="font-black text-lg text-white">
                  {editingEo ? '✏️ Modifier la tâche EO' : '+ Nouvelle tâche EO'}
                </h3>
                <button onClick={() => setShowEoModal(false)} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
              </div>

              <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">

                {/* Session + Tâche */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Session *</label>
                    <select value={eoForm.sessionGroup}
                      onChange={e => setEoForm(f => ({ ...f, sessionGroup: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500">
                      {EO_GROUPS.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Tâche *</label>
                    <select value={eoForm.taskNumber}
                      onChange={e => {
                        const t = Number(e.target.value);
                        setEoForm(f => ({ ...f, taskNumber: t, timeLimitMin: TASK_TIME[t] }));
                      }}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500">
                      <option value={1}>Tâche 1 — Présentation (2 min)</option>
                      <option value={2}>Tâche 2 — Interaction (3 min)</option>
                      <option value={3}>Tâche 3 — Argumentation (4 min 30 s)</option>
                    </select>
                  </div>
                </div>

                {/* Thème */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Thème</label>
                  <input type="text" placeholder="loisirs, famille, technologie..." value={eoForm.theme ?? ''}
                    onChange={e => setEoForm(f => ({ ...f, theme: e.target.value }))}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500" />
                </div>

                {/* Consigne / scénario */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    {eoForm.taskNumber === 1 ? 'Consigne (fixe pour toutes les sessions)' :
                     eoForm.taskNumber === 2 ? 'Scénario d\'interaction *' : 'Sujet d\'argumentation *'}
                  </label>
                  <textarea rows={5} value={eoForm.question}
                    onChange={e => setEoForm(f => ({ ...f, question: e.target.value }))}
                    placeholder={
                      eoForm.taskNumber === 1 ? 'Présentez-vous brièvement...' :
                      eoForm.taskNumber === 2 ? 'Je suis votre collègue. J\'organise...' :
                      'Avec l\'augmentation des ventes en ligne...'
                    }
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500 resize-none" />
                </div>

                {/* Exemple de réponse */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    {eoForm.taskNumber === 2 ? 'Exemples de questions (séparées par |)' : 'Exemple de réponse'}
                    <span className="text-slate-600 font-normal normal-case ml-1">(optionnel)</span>
                  </label>
                  <textarea rows={eoForm.taskNumber === 3 ? 6 : 4} value={eoForm.explanation ?? ''}
                    onChange={e => setEoForm(f => ({ ...f, explanation: e.target.value }))}
                    placeholder={eoForm.taskNumber === 2 ? 'Où faites-vous les courses ?|À quelle heure ?|...' : 'À mon avis...'}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-rose-500 resize-none" />
                </div>

                {/* Statut */}
                <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <input type="checkbox" id="eoActiveCheck" checked={eoForm.active ?? false}
                    onChange={e => setEoForm(f => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-rose-500" />
                  <label htmlFor="eoActiveCheck" className="text-sm text-slate-300 cursor-pointer">
                    <span className="font-bold">Rendre active</span>
                    <span className="text-slate-500 text-xs ml-2">(visible dans les épreuves étudiants)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 border-t border-slate-800 gap-3">
                <button onClick={() => setShowEoModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveEo} disabled={eoSaving || !eoForm.question.trim()}
                  className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-black px-6 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {eoSaving ? <><Spinner size={16} color="#fff" /> Sauvegarde...</> : editingEo ? '✓ Enregistrer' : '+ Ajouter à la banque'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ MODAL EE ══════════════════════ */}
      <AnimatePresence>
        {showEeModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowEeModal(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-4"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="font-black text-lg text-white">
                  {editingEe ? '✏️ Modifier la tâche EE' : '+ Nouvelle tâche EE'}
                </h3>
                <button onClick={() => setShowEeModal(false)} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

                {/* Niveau + Session Group */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Niveau *</label>
                    <select value={eeForm.level ?? 'B1'} onChange={e => setEeForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                      {['A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                      Session * <span className="text-slate-600 font-normal normal-case">(ex: ee-b1-immigration-01)</span>
                    </label>
                    <input type="text" placeholder="ee-b1-logement-02" value={eeForm.sessionGroup}
                      onChange={e => setEeForm(f => ({ ...f, sessionGroup: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 font-mono" />
                  </div>
                </div>

                {/* Tâche + Thème */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Tâche *</label>
                    <select value={eeForm.taskNumber} onChange={e => {
                      const t = Number(e.target.value);
                      const [wMin, wMax] = EE_TASK_WORDS[t] ?? [60, 120];
                      setEeForm(f => ({ ...f, taskNumber: t, timeLimitMin: EE_TASK_TIME[t], wordCountMin: wMin, wordCountMax: wMax }));
                    }}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500">
                      <option value={1}>T1 — Message court (10 min, 60-120 mots)</option>
                      <option value={2}>T2 — Narration (20 min, 120-150 mots)</option>
                      <option value={3}>T3 — Argumentatif (30 min, 120-180 mots)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Thème</label>
                    <input type="text" placeholder="logement, travail, immigration..." value={eeForm.theme ?? ''}
                      onChange={e => setEeForm(f => ({ ...f, theme: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                </div>

                {/* Mots min/max + Temps (auto, modifiables) */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Mots min</label>
                    <input type="number" value={eeForm.wordCountMin ?? ''} onChange={e => setEeForm(f => ({ ...f, wordCountMin: Number(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Mots max</label>
                    <input type="number" value={eeForm.wordCountMax ?? ''} onChange={e => setEeForm(f => ({ ...f, wordCountMax: Number(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Temps (min)</label>
                    <input type="number" value={eeForm.timeLimitMin ?? ''} onChange={e => setEeForm(f => ({ ...f, timeLimitMin: Number(e.target.value) }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500" />
                  </div>
                </div>

                {/* Consigne */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Consigne * <span className="text-slate-600 font-normal normal-case">(le texte complet que l&apos;étudiant lit)</span>
                  </label>
                  <textarea rows={7} value={eeForm.question}
                    onChange={e => setEeForm(f => ({ ...f, question: e.target.value }))}
                    placeholder={"Tâche 1 — Message court (60-120 mots)\n\nVotre consigne ici..."}
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none whitespace-pre-wrap" />
                </div>

                {/* Critères */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Critères d&apos;évaluation <span className="text-slate-600 font-normal normal-case">(optionnel)</span>
                  </label>
                  <textarea rows={3} value={eeForm.explanation ?? ''}
                    onChange={e => setEeForm(f => ({ ...f, explanation: e.target.value }))}
                    placeholder="Critères : ton adapté, informations claires, structure..."
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-emerald-500 resize-none" />
                </div>

                {/* Statut */}
                <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <input type="checkbox" id="eeActiveCheck" checked={eeForm.active ?? false}
                    onChange={e => setEeForm(f => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-emerald-500" />
                  <label htmlFor="eeActiveCheck" className="text-sm text-slate-300 cursor-pointer">
                    <span className="font-bold">Rendre active</span>
                    <span className="text-slate-500 text-xs ml-2">(visible aux étudiants dans les épreuves)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 border-t border-slate-800 gap-3">
                <button onClick={() => setShowEeModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveEe} disabled={eeSaving || !eeForm.question.trim() || !eeForm.sessionGroup.trim()}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black px-6 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {eeSaving ? <><Spinner size={16} color="#fff" /> Sauvegarde...</> : editingEe ? '✓ Enregistrer' : '+ Ajouter à la banque'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════════════ MODAL CO ══════════════════════ */}
      <AnimatePresence>
        {showCoModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-start justify-center p-4 sm:p-8 bg-black/70 backdrop-blur-sm overflow-y-auto"
            onClick={() => setShowCoModal(false)}>
            <motion.div initial={{ scale: 0.93, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.93, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 28 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl my-4"
              onClick={e => e.stopPropagation()}>

              <div className="flex items-center justify-between p-5 border-b border-slate-800">
                <h3 className="font-black text-lg text-white">
                  {editingCo ? '✏️ Modifier la question CO' : '+ Nouvelle question CO'}
                </h3>
                <button onClick={() => setShowCoModal(false)} className="text-slate-500 hover:text-white text-xl transition-colors">✕</button>
              </div>

              <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">

                {/* Niveau + Thème */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Niveau *</label>
                    <select value={coForm.level} onChange={e => setCoForm(f => ({ ...f, level: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Thème</label>
                    <input type="text" placeholder="actualité, vie quotidienne..." value={coForm.theme ?? ''}
                      onChange={e => setCoForm(f => ({ ...f, theme: e.target.value }))}
                      className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500" />
                  </div>
                </div>

                {/* Question (texte affiché à l'étudiant) */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Question *
                  </label>
                  <textarea rows={3} value={coForm.question}
                    onChange={e => setCoForm(f => ({ ...f, question: e.target.value }))}
                    placeholder="Quel est le sujet principal de cette conversation ?"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 resize-none" />
                </div>

                {/* Options A B C D */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-2">Options *</label>
                  <div className="space-y-2">
                    {['a', 'b', 'c', 'd'].map(k => (
                      <div key={k} className="flex items-center gap-2">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 uppercase transition-colors
                          ${coForm.answer === k ? 'bg-sky-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
                          {k}
                        </span>
                        <input type="text" placeholder={`Option ${k.toUpperCase()}`}
                          value={(coForm.options as Record<string, string>)?.[k] ?? ''}
                          onChange={e => setCoForm(f => ({ ...f, options: { ...(f.options as Record<string, string>), [k]: e.target.value } }))}
                          className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2 text-sm outline-none focus:border-sky-500" />
                        <button onClick={() => setCoForm(f => ({ ...f, answer: k }))}
                          className={`text-xs font-bold px-3 py-2 rounded-xl border transition-colors flex-shrink-0
                            ${coForm.answer === k ? 'bg-emerald-900/60 border-emerald-700 text-emerald-300' : 'border-slate-700 text-slate-500 hover:border-sky-700 hover:text-sky-400'}`}>
                          {coForm.answer === k ? '✓ Correct' : 'Correct ?'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Transcript */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    Transcript audio <span className="text-slate-600 font-normal normal-case">(texte lu dans l&apos;audio — fallback TTS si audioUrl manquant)</span>
                  </label>
                  <textarea rows={5} value={coForm.transcript ?? ''}
                    onChange={e => setCoForm(f => ({ ...f, transcript: e.target.value }))}
                    placeholder="Le texte exact qui est lu dans le fichier audio..."
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 resize-none" />
                </div>

                {/* Audio URL */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    URL Audio <span className="text-slate-600 font-normal normal-case">(MP3 sur CDN — optionnel si transcript fourni)</span>
                  </label>
                  <input type="url" value={coForm.audioUrl ?? ''}
                    onChange={e => setCoForm(f => ({ ...f, audioUrl: e.target.value || null }))}
                    placeholder="https://cdn.reussir-tcf.ca/audio/co-s1-q01.mp3"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-sky-500" />
                </div>

                {/* Image URL */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">
                    URL Image <span className="text-slate-600 font-normal normal-case">(optionnel — pour questions avec support visuel)</span>
                  </label>
                  <input type="url" value={coForm.imageUrl ?? ''}
                    onChange={e => setCoForm(f => ({ ...f, imageUrl: e.target.value || null }))}
                    placeholder="https://cdn.reussir-tcf.ca/img/co-s1-q01.jpg"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm font-mono outline-none focus:border-sky-500" />
                </div>

                {/* Explication */}
                <div>
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Explication <span className="text-slate-600 font-normal normal-case">(optionnelle)</span></label>
                  <textarea rows={2} value={coForm.explanation ?? ''}
                    onChange={e => setCoForm(f => ({ ...f, explanation: e.target.value }))}
                    placeholder="Explication de la bonne réponse..."
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-600 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-sky-500 resize-none" />
                </div>

                {/* Statut */}
                <div className="flex items-center gap-3 bg-slate-800/60 border border-slate-700 rounded-xl p-3">
                  <input type="checkbox" id="coActiveCheck" checked={coForm.active ?? false}
                    onChange={e => setCoForm(f => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 accent-sky-500" />
                  <label htmlFor="coActiveCheck" className="text-sm text-slate-300 cursor-pointer">
                    <span className="font-bold">Rendre active</span>
                    <span className="text-slate-500 text-xs ml-2">(visible dans les épreuves étudiants)</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-between p-5 border-t border-slate-800 gap-3">
                <button onClick={() => setShowCoModal(false)} className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 hover:text-white font-bold text-sm transition-colors">
                  Annuler
                </button>
                <button onClick={handleSaveCo} disabled={coSaving || !coForm.question.trim()}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white font-black px-6 py-2.5 rounded-xl shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm">
                  {coSaving ? <><Spinner size={16} color="#fff" /> Sauvegarde...</> : editingCo ? '✓ Enregistrer les modifications' : '+ Ajouter à la banque'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ════════════════════════ FORMATION DES ÉPREUVES ═════════════════════ */}
      {adminTab === 'formation' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* Header */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black flex items-center gap-2">
                Formation des épreuves
                <span className="text-base">🎲</span>
              </h2>
              <p className="text-slate-500 text-sm mt-0.5">Génère 50 séries aléatoires indépendantes de l'ordre d'insertion</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {savedFormationSections.includes(formationSection) && (
                <span className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-emerald-950/70 border border-emerald-800/60 text-emerald-400">
                  ✅ En ligne
                </span>
              )}
              {((formationSection === 'EE' && generatedEe.length > 0) || (formationSection === 'EO' && generatedEo.length > 0) || (formationSection === 'CE' && generatedCe.length > 0)) && (
                <button onClick={exportJson}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors">
                  ⬇ JSON
                </button>
              )}
            </div>
          </div>

          {/* Sélecteur de section */}
          <div className="flex flex-wrap gap-2 bg-slate-900/60 border border-slate-800 rounded-xl p-1 w-fit">
            {(['EE', 'EO', 'CE', 'CO'] as const).map(s => (
              <button key={s} onClick={() => { setFormationSection(s); if (!savedFormationSections.includes(s)) { if (s === 'EE') setGeneratedEe([]); else if (s === 'EO') setGeneratedEo([]); else if (s === 'CE') setGeneratedCe([]); } }}
                className={`px-5 py-2 rounded-lg text-sm font-black transition-all ${
                  formationSection === s
                    ? s === 'EE' ? 'bg-emerald-600 text-white shadow' : s === 'EO' ? 'bg-rose-600 text-white shadow' : s === 'CE' ? 'bg-violet-600 text-white shadow' : 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}>
                {s === 'EE' ? '✍️ Expression Écrite' : s === 'EO' ? '🎤 Expression Orale' : s === 'CE' ? '📖 Compréhension Écrite' : '🎧 Compréhension Orale'}
              </button>
            ))}
          </div>

          {/* ── Statistiques de la banque ── */}
          {formationSection === 'EE' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([1, 2, 3] as const).map(n => {
                const pool = eeSessions.filter(s => s.taskNumber === n);
                const active = pool.filter(s => s.active);
                const m = { 1: { icon: '✉️', label: 'Message court', color: 'from-emerald-400 to-teal-500' }, 2: { icon: '📖', label: 'Narration', color: 'from-sky-400 to-cyan-500' }, 3: { icon: '💬', label: 'Argumentatif', color: 'from-violet-400 to-purple-500' } }[n];
                return (
                  <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className={`inline-flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-lg bg-gradient-to-r ${m.color} text-white mb-3`}>
                      {m.icon} Tâche {n} — {m.label}
                    </div>
                    <div className="text-3xl font-black text-white">{active.length}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{active.length}/{pool.length} actives dans la banque</div>
                    {active.length === 0 && (
                      <div className="mt-3 text-xs text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg px-3 py-2">
                        ⚠ Aucune tâche active — ajoutez du contenu dans Banque EE
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : formationSection === 'EO' ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {([1, 2, 3] as const).map(n => {
                const pool = eoSessions.filter(s => s.taskNumber === n);
                const active = pool.filter(s => s.active);
                const m = { 1: { icon: '🗣️', label: 'Présentation', color: 'from-rose-400 to-pink-500' }, 2: { icon: '🤝', label: 'Interaction', color: 'from-orange-400 to-amber-500' }, 3: { icon: '💬', label: 'Argumentation', color: 'from-violet-400 to-purple-500' } }[n];
                return (
                  <div key={n} className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                    <div className={`inline-flex items-center gap-2 text-xs font-black px-3 py-1.5 rounded-lg bg-gradient-to-r ${m.color} text-white mb-3`}>
                      {m.icon} Tâche {n} — {m.label}
                    </div>
                    <div className="text-3xl font-black text-white">{active.length}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{active.length}/{pool.length} actives dans la banque</div>
                    {active.length === 0 && (
                      <div className="mt-3 text-xs text-amber-400 bg-amber-950/40 border border-amber-800 rounded-lg px-3 py-2">
                        ⚠ Aucune tâche active — ajoutez du contenu dans Banque EO
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : formationSection === 'CO' ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(CO_DISTRIB).map(([level, target]) => {
                const pool = bankCoQuestions.filter(q => q.active && q.level === level);
                return (
                  <div key={level} className={`bg-slate-900 border rounded-2xl p-4 ${pool.length >= target ? 'border-slate-800' : 'border-amber-800/60'}`}>
                    <div className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block mb-2 ${LEVEL_COLORS[level] ?? 'bg-slate-700 text-slate-200'}`}>{level}</div>
                    <div className="text-2xl font-black text-white">{pool.length}</div>
                    <div className="text-xs text-slate-500">/{target} requis</div>
                    {pool.length < target && (
                      <div className="mt-2 text-xs text-amber-400">⚠ manque {target - pool.length}</div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : bankLoading ? (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(CE_DISTRIB).map(([level]) => (
                <div key={level} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 animate-pulse">
                  <div className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block mb-2 ${LEVEL_COLORS[level] ?? 'bg-slate-700 text-slate-200'}`}>{level}</div>
                  <div className="text-2xl font-black text-slate-600">—</div>
                  <div className="text-xs text-slate-600">chargement…</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {Object.entries(CE_DISTRIB).map(([level, target]) => {
                const pool = bankQuestions.filter(q => q.section === 'CE' && q.level === level);
                return (
                  <div key={level} className={`bg-slate-900 border rounded-2xl p-4 ${pool.length >= target ? 'border-slate-800' : 'border-amber-800/60'}`}>
                    <div className={`text-xs font-black px-2 py-0.5 rounded-lg inline-block mb-2 ${LEVEL_COLORS[level] ?? 'bg-slate-700 text-slate-200'}`}>{level}</div>
                    <div className="text-2xl font-black text-white">{pool.length}</div>
                    <div className="text-xs text-slate-500">/{target} requis</div>
                    {pool.length < target && (
                      <div className="mt-2 text-xs text-amber-400">⚠ manque {target - pool.length}</div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Barre d'action */}
          <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
            formationSection === 'EE' ? 'bg-emerald-950/20 border-emerald-900/40'
            : formationSection === 'EO' ? 'bg-rose-950/20 border-rose-900/40'
            : formationSection === 'CO' ? 'bg-sky-950/20 border-sky-900/40'
            : 'bg-violet-950/20 border-violet-900/40'}`}>
            <div className="flex-1 min-w-0">
              {formationSection === 'CO' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-white">50 séries CO</span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-sky-400 font-bold">A1</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-cyan-400 font-bold">A2</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-teal-400 font-bold">B1</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-green-400 font-bold">B2</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-violet-400 font-bold">C1</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-purple-400 font-bold">C2</span>
                  <span className="text-xs text-slate-500">· {(() => { const total = Object.entries(CO_DISTRIB).reduce((acc, [l, t]) => { const pool = bankCoQuestions.filter(q => q.active && q.level === l).length; return acc * Math.max(1, pool >= t ? pool : 0); }, 1); return `${bankCoQuestions.filter(q => q.active).length} questions disponibles`; })()}</span>
                </div>
              ) : formationSection === 'EE' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-white">50 séries EE</span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-emerald-400 font-bold">T1</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-sky-400 font-bold">T2</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-violet-400 font-bold">T3</span>
                  <span className="text-xs text-slate-500">· {(() => { const t1 = eeSessions.filter(s => s.taskNumber === 1 && s.active).length; const t2 = eeSessions.filter(s => s.taskNumber === 2 && s.active).length; const t3 = eeSessions.filter(s => s.taskNumber === 3 && s.active).length; return `${(t1*t2*t3).toLocaleString('fr-CA')} combinaisons possibles`; })()}</span>
                </div>
              ) : formationSection === 'EO' ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-white">50 séries EO</span>
                  <span className="text-xs text-slate-500">·</span>
                  <span className="text-xs text-rose-400 font-bold">T1</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-orange-400 font-bold">T2</span><span className="text-xs text-slate-600">×</span>
                  <span className="text-xs text-violet-400 font-bold">T3</span>
                  <span className="text-xs text-slate-500">· {(() => { const t1 = eoSessions.filter(s => s.taskNumber === 1 && s.active).length; const t2 = eoSessions.filter(s => s.taskNumber === 2 && s.active).length; const t3 = eoSessions.filter(s => s.taskNumber === 3 && s.active).length; return `${(t1*t2*t3).toLocaleString('fr-CA')} combinaisons possibles`; })()}</span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-black text-white">50 séries CE</span>
                  <span className="text-xs text-slate-500">· 39 questions A1→C2 par série</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {(
              <button onClick={handleGenerate} disabled={generating ||
                (formationSection === 'EE' && (eeSessions.filter(s => s.taskNumber === 1 && s.active).length === 0 || eeSessions.filter(s => s.taskNumber === 2 && s.active).length === 0 || eeSessions.filter(s => s.taskNumber === 3 && s.active).length === 0)) ||
                (formationSection === 'EO' && (eoSessions.filter(s => s.taskNumber === 1 && s.active).length === 0 || eoSessions.filter(s => s.taskNumber === 2 && s.active).length === 0 || eoSessions.filter(s => s.taskNumber === 3 && s.active).length === 0)) ||
                (formationSection === 'CE' && bankQuestions.filter(q => q.section === 'CE').length < 10)
              }
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                  formationSection === 'EE' ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/30'
                  : formationSection === 'EO' ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/30'
                  : formationSection === 'CO' ? 'bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-900/30'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-900/30'}`}>
                {generating ? <Spinner size={14} color="#fff" /> : '🎲'}
                {generating ? 'Génération…' : 'Créer 50 séries'}
              </button>
              )}

              {((formationSection === 'EE' && generatedEe.length > 0) || (formationSection === 'EO' && generatedEo.length > 0) || (formationSection === 'CE' && generatedCe.length > 0) || (formationSection === 'CO' && generatedCo.length > 0)) && (
                <button onClick={handleSaveFormation} disabled={savingFormation || savedFormationSections.includes(formationSection)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white">
                  {savingFormation ? <Spinner size={14} color="#fff" /> : savedFormationSections.includes(formationSection) ? '✅' : '💾'}
                  {savingFormation ? 'Sauvegarde…' : savedFormationSections.includes(formationSection) ? 'Sauvegardé' : 'Sauvegarder'}
                </button>
              )}
            </div>
          </div>

          {/* ── Résultats EE ── */}
          {formationSection === 'EE' && generatedEe.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {/* Header du tableau */}
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-black text-white">{generatedEe.length} séries</span>
                  {savedFormationSections.includes('EE') && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">
                      ✅ sauvegardées
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"/>T1 — 10 min</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-sky-500 inline-block"/>T2 — 20 min</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>T3 — 30 min</span>
                </div>
              </div>

              {/* Tableau */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/80">
                      <th className="px-4 py-3 text-left w-10">
                        <span className="text-xs font-bold text-slate-600">#</span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5">✉️ T1 — Message court</span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-black text-sky-400 flex items-center gap-1.5">📖 T2 — Narration</span>
                      </th>
                      <th className="px-4 py-3 text-left">
                        <span className="text-xs font-black text-violet-400 flex items-center gap-1.5">💬 T3 — Argumentatif</span>
                      </th>
                      <th className="px-3 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedEe.map((serie, idx) => (
                      <motion.tr key={serie.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.008, 0.35) }}
                        className={`border-b border-slate-800/40 hover:bg-white/[0.03] transition-colors group ${idx % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                        {/* Numéro */}
                        <td className="px-4 py-3.5">
                          <span className="text-xs font-black text-slate-600 w-6 inline-block text-center">{serie.id}</span>
                        </td>
                        {/* T1 */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 capitalize max-w-[200px] truncate">
                            {serie.t1.theme || 'thème'}
                          </span>
                        </td>
                        {/* T2 */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-950/60 border border-sky-800/50 text-sky-300 capitalize max-w-[200px] truncate">
                            {serie.t2.theme || 'thème'}
                          </span>
                        </td>
                        {/* T3 */}
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-950/60 border border-violet-800/50 text-violet-300 capitalize max-w-[200px] truncate">
                            {serie.t3.theme || 'thème'}
                          </span>
                        </td>
                        {/* Action */}
                        <td className="px-3 py-3.5">
                          <a href={`/admin/preview-ee?t1=${serie.t1.id}&t2=${serie.t2.id}&t3=${serie.t3.id}`}
                            target="_blank" rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all whitespace-nowrap">
                            👁 Voir
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Résultats EO ── */}
          {formationSection === 'EO' && generatedEo.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-black text-white">{generatedEo.length} séries</span>
                  {savedFormationSections.includes('EO') && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-emerald-400">✅ sauvegardées</span>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-500">
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-rose-500 inline-block"/>T1 — Présentation</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-500 inline-block"/>T2 — Interaction</span>
                  <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-violet-500 inline-block"/>T3 — Argumentation</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800/80">
                      <th className="px-4 py-3 text-left w-10"><span className="text-xs font-bold text-slate-600">#</span></th>
                      <th className="px-4 py-3 text-left"><span className="text-xs font-black text-rose-400">🗣️ T1 — Présentation</span></th>
                      <th className="px-4 py-3 text-left"><span className="text-xs font-black text-orange-400">🤝 T2 — Interaction</span></th>
                      <th className="px-4 py-3 text-left"><span className="text-xs font-black text-violet-400">💬 T3 — Argumentation</span></th>
                      <th className="px-3 py-3 w-20"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {generatedEo.map((serie, idx) => (
                      <motion.tr key={serie.id}
                        initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(idx * 0.008, 0.35) }}
                        className={`border-b border-slate-800/40 hover:bg-white/[0.03] transition-colors group ${idx % 2 === 0 ? '' : 'bg-slate-800/10'}`}>
                        <td className="px-4 py-3.5"><span className="text-xs font-black text-slate-600 w-6 inline-block text-center">{serie.id}</span></td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-rose-950/60 border border-rose-800/50 text-rose-300 capitalize max-w-[200px] truncate">
                            {serie.t1.theme || serie.t1.sessionGroup || 'thème'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-950/60 border border-orange-800/50 text-orange-300 capitalize max-w-[200px] truncate">
                            {serie.t2.theme || serie.t2.sessionGroup || 'thème'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-950/60 border border-violet-800/50 text-violet-300 capitalize max-w-[200px] truncate">
                            {serie.t3.theme || serie.t3.sessionGroup || 'thème'}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">
                          <a href={`/admin/preview-eo?t1=${serie.t1.id}&t2=${serie.t2.id}&t3=${serie.t3.id}`}
                            target="_blank" rel="noreferrer"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all whitespace-nowrap">
                            👁 Voir
                          </a>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Résultats CE ── */}
          {formationSection === 'CE' && generatedCe.length > 0 && (
            <>
            {ceInvalidCount > 0 && (
              <div className="flex items-start gap-3 bg-amber-950 border border-amber-700 rounded-2xl px-5 py-4">
                <span className="text-xl flex-shrink-0">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-amber-400 text-sm">
                    {ceInvalidCount} exercice{ceInvalidCount > 1 ? 's' : ''} exclu{ceInvalidCount > 1 ? 's' : ''} — pas de question détectée
                  </p>
                  <p className="text-amber-600 text-xs mt-0.5">
                    Ces exercices n&apos;ont pas de dernier paragraphe se terminant par <span className="font-black text-amber-400">?</span>.
                    Corrige-les dans la banque puis régénère.
                  </p>
                </div>
                <button
                  onClick={handleDeleteInvalid}
                  disabled={deletingInvalid}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-black px-3 py-2 rounded-xl bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors">
                  {deletingInvalid ? '⏳ Suppression…' : `🗑 Supprimer les ${ceInvalidCount}`}
                </button>
              </div>
            )}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <span className="font-black text-sm">50 séries générées ✅</span>
                <span className="text-xs text-slate-500">ordre aléatoire par série</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-2.5 text-slate-500 font-bold w-10">#</th>
                      {Object.keys(CE_DISTRIB).map(l => (
                        <th key={l} className="px-3 py-2.5 font-bold text-center">
                          <span className={`px-2 py-0.5 rounded ${LEVEL_COLORS[l]}`}>{l}</span>
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-slate-400 font-bold text-center">Total</th>
                      <th className="px-4 py-2.5 text-slate-500 font-bold">Ordre</th>
                      <th className="px-4 py-2.5 text-slate-500 font-bold w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {generatedCe.map(serie => {
                      const byLevel = serie.questions.reduce<Record<string, number>>((acc, q) => { acc[q.level] = (acc[q.level] ?? 0) + 1; return acc; }, {});
                      const firstLevels = serie.questions.slice(0, 6).map(q => q.level);
                      return (
                        <motion.tr key={serie.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(serie.id * 0.01, 0.4) }}
                          className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-black text-slate-500">{serie.id}</td>
                          {Object.keys(CE_DISTRIB).map(l => (
                            <td key={l} className="px-3 py-3 text-center font-bold text-slate-300">{byLevel[l] ?? 0}</td>
                          ))}
                          <td className="px-4 py-3 text-center font-black text-emerald-400">{serie.questions.length}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {firstLevels.map((l, i) => (
                                <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-bold ${LEVEL_COLORS[l] ?? ''}`}>{l}</span>
                              ))}
                              {serie.questions.length > 6 && <span className="text-slate-600">…</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setPreviewCeSerie(serie)}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-violet-900/40 border border-violet-800 text-violet-400 hover:bg-violet-900/70 transition-colors whitespace-nowrap">
                              👁 Voir
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            </>
          )}

          {/* ── Modal preview CE ── */}
          <AnimatePresence>
            {previewCeSerie && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
                onClick={() => setPreviewCeSerie(null)}>
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">

                  {/* Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1.5">
                        📖 CE · Compréhension Écrite
                      </div>
                      <span className="text-sm font-black text-white">Série #{previewCeSerie.id}</span>
                      <span className="text-xs text-slate-500">{previewCeSerie.questions.length} questions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800 px-3 py-1.5 rounded-lg font-bold">
                        👁 PRÉVISUALISATION ADMIN
                      </div>
                      <button onClick={() => setPreviewCeSerie(null)} className="text-slate-400 hover:text-white transition-colors text-xl font-black">✕</button>
                    </div>
                  </div>

                  {/* Corps — liste des questions comme l'étudiant les verrait */}
                  <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    {previewCeSerie.questions.map((q, i) => (
                      <motion.div key={q.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.015 }}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          {/* Numéro + niveau */}
                          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-black text-slate-400 w-6 text-center">{i + 1}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${LEVEL_COLORS[q.level] ?? 'bg-slate-700 text-slate-200'}`}>
                              {q.level}
                            </span>
                          </div>
                          {/* Enoncé */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-slate-200 leading-relaxed">{q.question}</p>
                            {q.theme && (
                              <p className="text-xs text-slate-500 mt-1.5">🏷 {q.theme}</p>
                            )}
                            {/* Options (simulées) */}
                            {q.options && Object.keys(q.options).length > 0 && (
                              <div className="mt-3 grid grid-cols-2 gap-2">
                                {Object.entries(q.options).map(([k, v]) => (
                                  <div key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${
                                    k === q.answer
                                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                                      : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                                    <span className="font-black uppercase">{k}.</span>
                                    <span>{v as string}</span>
                                    {k === q.answer && <span className="ml-auto text-emerald-400">✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Cliquez en dehors pour fermer</span>
                    <span className="font-bold text-slate-400">Réponses correctes visibles en vert — admin only</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Modal preview CO ── */}
          <AnimatePresence>
            {previewCoSerie && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4"
                onClick={() => setPreviewCoSerie(null)}>
                <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 24 }}
                  onClick={e => e.stopPropagation()}
                  className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8">
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                      <div className="px-3 py-1 rounded-full bg-gradient-to-r from-sky-500 to-cyan-500 text-white text-xs font-bold flex items-center gap-1.5">
                        🎧 CO · Compréhension Orale
                      </div>
                      <span className="text-sm font-black text-white">Série #{previewCoSerie.id}</span>
                      <span className="text-xs text-slate-500">{previewCoSerie.questions.length} questions</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-xs text-amber-400 bg-amber-950/40 border border-amber-800 px-3 py-1.5 rounded-lg font-bold">
                        👁 PRÉVISUALISATION ADMIN
                      </div>
                      <button onClick={() => setPreviewCoSerie(null)} className="text-slate-400 hover:text-white transition-colors text-xl font-black">✕</button>
                    </div>
                  </div>
                  <div className="p-6 space-y-3 max-h-[70vh] overflow-y-auto">
                    {previewCoSerie.questions.map((q, i) => (
                      <motion.div key={q.id}
                        initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.01 }}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                            <span className="text-xs font-black text-slate-400 w-6 text-center">{i + 1}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-lg ${LEVEL_COLORS[q.level] ?? 'bg-slate-700 text-slate-200'}`}>{q.level}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-2">
                              {q.theme && <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded">{q.theme}</span>}
                              {q.audioUrl && <span className="text-xs font-bold text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">🎵 Audio</span>}
                              {q.imageUrl && <span className="text-xs font-bold text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded border border-blue-800/40">🖼 Image</span>}
                            </div>
                            <p className="text-sm text-slate-300 font-medium">{q.question}</p>
                            {q.options && Object.values(q.options).some(v => v) && (
                              <div className="mt-2 grid grid-cols-2 gap-1.5">
                                {Object.entries(q.options).map(([k, v]) => (
                                  <div key={k} className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 ${k === q.answer ? 'bg-emerald-950/60 border border-emerald-800/60 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                                    <span className="font-black">{k.toUpperCase()}.</span>
                                    <span>{v as string}</span>
                                    {k === q.answer && <span className="ml-auto text-emerald-400">✓</span>}
                                  </div>
                                ))}
                              </div>
                            )}
                            {q.options && !Object.values(q.options).some(v => v) && (
                              <div className="mt-2 flex gap-1.5">
                                {['A','B','C','D'].map(l => (
                                  <span key={l} className={`text-xs font-black px-2.5 py-1.5 rounded-lg border ${l === (q.answer ?? '').toUpperCase() ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>{l}</span>
                                ))}
                                <span className="text-xs text-slate-600 ml-1 self-center">← réponse dans l'audio</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                  <div className="px-6 py-4 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                    <span>Cliquez en dehors pour fermer</span>
                    <span className="font-bold text-slate-400">Réponse correcte en vert — admin only</span>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Tableau CO ── */}
          {formationSection === 'CO' && generatedCo.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-black text-sm">{generatedCo.length} séries générées</span>
                  {savedFormationSections.includes('CO') && (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-sky-950/80 border border-sky-800/60 text-sky-400">✅ sauvegardées</span>
                  )}
                </div>
                <span className="text-xs text-slate-500">39 questions A1→C2 par série</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-left">
                      <th className="px-4 py-2.5 text-slate-500 font-bold w-10">#</th>
                      {Object.keys(CO_DISTRIB).map(l => (
                        <th key={l} className="px-3 py-2.5 font-bold text-center">
                          <span className={`px-2 py-0.5 rounded ${LEVEL_COLORS[l]}`}>{l}</span>
                        </th>
                      ))}
                      <th className="px-4 py-2.5 text-slate-400 font-bold text-center">Total</th>
                      <th className="px-4 py-2.5 text-slate-500 font-bold">Ordre</th>
                      <th className="px-4 py-2.5 text-slate-500 font-bold w-24"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {generatedCo.map(serie => {
                      const byLevel = serie.questions.reduce<Record<string, number>>((acc, q) => { acc[q.level] = (acc[q.level] ?? 0) + 1; return acc; }, {});
                      const firstLevels = serie.questions.slice(0, 6).map(q => q.level);
                      return (
                        <motion.tr key={serie.id}
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                          transition={{ delay: Math.min(serie.id * 0.01, 0.4) }}
                          className="hover:bg-slate-800/30 transition-colors">
                          <td className="px-4 py-3 font-black text-slate-500">{serie.id}</td>
                          {Object.keys(CO_DISTRIB).map(l => (
                            <td key={l} className="px-3 py-3 text-center font-bold text-slate-300">{byLevel[l] ?? 0}</td>
                          ))}
                          <td className="px-4 py-3 text-center font-black text-sky-400">{serie.questions.length}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-1">
                              {firstLevels.map((l, i) => (
                                <span key={i} className={`text-xs px-1.5 py-0.5 rounded font-bold ${LEVEL_COLORS[l] ?? ''}`}>{l}</span>
                              ))}
                              {serie.questions.length > 6 && <span className="text-slate-600">…</span>}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => setPreviewCoSerie(serie)}
                              className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg bg-sky-900/40 border border-sky-800 text-sky-400 hover:bg-sky-900/70 transition-colors whitespace-nowrap">
                              👁 Voir
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </motion.div>
      )}

      {/* ════════════════════════════ ONGLET ACCÈS ════════════════════════════ */}
      {adminTab === 'acces' && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

          {/* En-tête */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black text-white">Gestion des accès</h2>
              <p className="text-slate-400 text-sm mt-0.5">
                Accordez ou révoquez l'accès complet à toutes les épreuves sans paiement.
              </p>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="bg-emerald-950/60 border border-emerald-800 rounded-xl px-4 py-2 text-emerald-400 font-bold">
                {users.filter(u => u.plan !== 'free').length} accès actifs
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-slate-400">
                {users.length} utilisateurs
              </div>
            </div>
          </div>

          {/* Recherche + filtres */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-base pointer-events-none">🔍</span>
              <input
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                placeholder="Rechercher par nom ou email..."
                className="w-full bg-slate-900 border border-slate-800 text-white placeholder-slate-600 rounded-xl pl-11 pr-4 py-3 text-sm outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              {([['all', 'Tous'], ['professor', 'Profs'], ['student', 'Étudiants']] as const).map(([val, label]) => (
                <button key={val} onClick={() => setUserRoleFilter(val)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${userRoleFilter === val ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Liste utilisateurs */}
          {usersLoading ? (
            <div className="flex justify-center py-12"><Spinner size={36} /></div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              {users.length === 0 ? (
                <div className="p-12 text-center text-slate-600">Aucun utilisateur trouvé</div>
              ) : (() => {
                const filtered = users
                  .filter(u => {
                    const q = userSearch.toLowerCase();
                    const matchText = !q || u.email.toLowerCase().includes(q) || u.fullName.toLowerCase().includes(q);
                    const matchRole = userRoleFilter === 'all' || u.role === userRoleFilter;
                    return matchText && matchRole;
                  })
                  .sort((a, b) => {
                    if (a.plan !== 'free' && b.plan === 'free') return -1;
                    if (a.plan === 'free' && b.plan !== 'free') return 1;
                    return b.createdAt - a.createdAt;
                  });
                return filtered.length === 0 ? (
                  <div className="p-10 text-center text-slate-600 text-sm">Aucun résultat pour &quot;{userSearch}&quot;</div>
                ) : filtered.map((u, i) => {
                  const isPro = u.plan !== 'free';
                  const isGranting = grantingId === u.id;
                  const isRevoking = revokingId === u.id;
                  return (
                    <motion.div key={u.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className="flex items-center justify-between gap-4 px-5 py-4 border-b border-slate-800/60 last:border-0 hover:bg-slate-800/20 transition-colors">

                      {/* Avatar + infos */}
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={`https://api.dicebear.com/9.x/personas/svg?seed=${u.email}`}
                          className="w-10 h-10 rounded-full border border-slate-700 flex-shrink-0"
                          alt=""
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-white truncate">{u.fullName || '—'}</div>
                          <div className="text-xs text-slate-500 truncate">{u.email}</div>
                          <div className="text-xs text-slate-700 mt-0.5">
                            Inscrit le {new Date(u.createdAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </div>

                      {/* Plan + action */}
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {/* Badge rôle */}
                        {u.role === 'professor' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-800">Prof</span>
                        )}
                        {u.role === 'admin' && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-900/60 text-amber-300 border border-amber-800">Admin</span>
                        )}
                        {/* Badge plan */}
                        <span className={`text-xs font-black px-3 py-1 rounded-full ${
                          isPro
                            ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-800'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}>
                          {isPro ? 'Accès complet' : 'Gratuit'}
                        </span>

                        {/* Bouton action */}
                        {isPro ? (
                          <button
                            onClick={() => handleRevokeAccess(u)}
                            disabled={isRevoking}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border border-red-800 text-red-400 hover:bg-red-950/40 transition-colors disabled:opacity-50">
                            {isRevoking ? <Spinner size={12} /> : '✕'} Révoquer
                          </button>
                        ) : (
                          <button
                            onClick={() => handleGrantAccess(u)}
                            disabled={isGranting}
                            className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white transition-colors disabled:opacity-50 shadow">
                            {isGranting ? <Spinner size={12} color="#fff" /> : '✓'} Accorder accès
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                });
              })()}
            </div>
          )}

          {/* Légende */}
          <div className="bg-slate-900/50 border border-slate-800/50 rounded-xl px-5 py-4 text-xs text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-400">Comment ça fonctionne :</span> Cliquer sur
            &quot;Accorder accès&quot; active immédiatement le plan Pro pour cet utilisateur — il peut pratiquer
            toutes les épreuves sans payer. L&apos;accès est synchronisé en temps réel avec son compte.
            &quot;Révoquer&quot; remet l&apos;utilisateur sur le plan gratuit.
          </div>
        </motion.div>
      )}

      </div>
    </div>
  );
}
