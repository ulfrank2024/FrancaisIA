'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import SophieAvatar, { AvatarMood } from '../../../components/SophieAvatar';
import ScoreRing from '../../../components/ScoreRing';
import Spinner from '../../../components/Spinner';
import { ExamWatermark, ExamSignature, useExamProtection } from '../../../components/ExamProtection';
import { api, Question, EpreuvSession, CorrectionResult, ClassData } from '../../../lib/api';
import { useAuth } from '../../../lib/auth-context';
import AchievementToast from '../../../components/AchievementToast';
import { getNewlyUnlocked, loadSavedBadgeIds, saveBadgeIds } from '../../../components/Achievements';
import type { Badge } from '../../../components/Achievements';
import SurveyModal from '../../../components/SurveyModal';
import { trackEvent, EVENTS } from '../../../lib/analytics';

// ── Parser T3 EE : sujet + deux documents (POUR / CONTRE) ────────
const OPPOSITION_RE = /\.\s+(Cependant[,\s]|Toutefois[,\s]|Néanmoins[,\s]|En revanche[,\s]|Pourtant[,\s]|Or[,\s]|Mais |À l['']opposé|D['']un autre côté|D['']une autre perspective|En opposition|Par contre[,\s])/;

function parseT3(text: string): { sujet: string; docs: string[] } {
  const t = text.trim();

  // Strategy 1 : marqueurs explicites « Document 1 / Document 2 »
  const d1M = /Document\s+1\s*(?:\([^)]*\))?\s*:/i.exec(t);
  const d2M = /Document\s+2\s*(?:\([^)]*\))?\s*:/i.exec(t);

  if (d1M && d2M) {
    const beforeD1 = t.slice(0, d1M.index).trim();
    const doc1Raw  = t.slice(d1M.index, d2M.index).trim();
    const afterD2  = t.slice(d2M.index);

    // Séparer doc2 de la consigne après le dernier guillemet fermant
    const lastGuill = afterD2.lastIndexOf('»');
    let doc2Raw: string;
    let consigne: string;
    if (lastGuill !== -1 && lastGuill < afterD2.length - 2) {
      doc2Raw  = afterD2.slice(0, lastGuill + 1).trim();
      consigne = afterD2.slice(lastGuill + 1).trim();
    } else {
      const splitM = /\n+(Résumez|Rédigez|Donnez|Exprimez|Analysez|En vous|À partir|Vous devez)/i.exec(afterD2);
      doc2Raw  = splitM ? afterD2.slice(0, splitM.index).trim() : afterD2.trim();
      consigne = splitM ? afterD2.slice(splitM.index).trim() : '';
    }

    const strip = (s: string) => s.replace(/^Document\s+\d+\s*(?:\([^)]*\))?\s*:\s*/i, '').trim();
    return { sujet: beforeD1 || consigne, docs: [strip(doc1Raw), strip(doc2Raw)] };
  }

  // Strategy 2 : ? + \n\n
  const qIdx = t.indexOf('?');
  const sujet = qIdx !== -1 ? t.slice(0, qIdx + 1).trim() : '';
  const body  = qIdx !== -1 ? t.slice(qIdx + 1).trim() : t;
  const parts = body.split(/\n\n+/).map(s => s.trim()).filter(Boolean);
  if (parts.length >= 2) return { sujet, docs: parts.slice(0, 2) };

  // Strategy 3 : connecteur rhétorique
  const m = body.match(OPPOSITION_RE);
  if (m && m.index !== undefined) {
    return { sujet, docs: [body.slice(0, m.index + 1).trim(), body.slice(m.index + 1).trim()] };
  }

  return { sujet, docs: [] };
}

// ── Métadonnées des sections ──────────────────────────────────────
const SECTION_META: Record<string, { label: string; icon: string; color: string; gradient: string; isWritten: boolean }> = {
  CO: { label: 'Compréhension Orale', icon: '🎧', color: 'from-sky-400 to-cyan-500', gradient: 'from-sky-50 to-cyan-50', isWritten: false },
  CE: { label: 'Compréhension Écrite', icon: '📖', color: 'from-violet-400 to-purple-500', gradient: 'from-violet-50 to-purple-50', isWritten: false },
  EE: { label: 'Expression Écrite', icon: '✍️', color: 'from-emerald-400 to-teal-500', gradient: 'from-emerald-50 to-teal-50', isWritten: true },
  EO: { label: 'Expression Orale', icon: '🎤', color: 'from-rose-400 to-pink-500', gradient: 'from-rose-50 to-pink-50', isWritten: true },
};

const EO_TASK_META: Record<number, { label: string; icon: string; gradient: string; color: string; bgColor: string; borderColor: string; consigneLabel: string; duration: string; prep?: string; points: string }> = {
  1: { label: 'Présentation personnelle',     icon: '👤', gradient: 'from-sky-400 to-cyan-500',     color: 'text-sky-700',    bgColor: 'bg-sky-50',    borderColor: 'border-sky-100',    consigneLabel: '📋 Consigne',                 duration: '2 min',      points: '3 pts' },
  2: { label: 'Exercice en interaction',      icon: '💬', gradient: 'from-violet-400 to-purple-500', color: 'text-violet-700', bgColor: 'bg-violet-50', borderColor: 'border-violet-100', consigneLabel: '🎭 Scénario',                 duration: '3 min 30 s', prep: '2 min de préparation', points: '7 pts' },
  3: { label: "Expression d'un point de vue", icon: '🗣', gradient: 'from-rose-400 to-pink-500',     color: 'text-rose-700',   bgColor: 'bg-rose-50',   borderColor: 'border-rose-100',   consigneLabel: "💭 Sujet d'argumentation", duration: '4 min 30 s', points: '10 pts' },
};

// Durée en secondes pour le timer
const SECTION_DURATION: Record<string, number> = {
  CO: 35 * 60,
  CE: 60 * 60,
  EE: 60 * 60,
  EO: 12 * 60,
};

const LEVEL_ORDER: Record<string, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
const LEVEL_PTS: Record<string, number>   = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };
const LEVEL_CLR: Record<string, { bg: string; border: string; text: string }> = {
  A1: { bg: 'bg-slate-100',  border: 'border-slate-200',  text: 'text-slate-600' },
  A2: { bg: 'bg-sky-100',    border: 'border-sky-200',    text: 'text-sky-700' },
  B1: { bg: 'bg-indigo-100', border: 'border-indigo-200', text: 'text-indigo-700' },
  B2: { bg: 'bg-violet-100', border: 'border-violet-200', text: 'text-violet-700' },
  C1: { bg: 'bg-rose-100',   border: 'border-rose-200',   text: 'text-rose-700' },
  C2: { bg: 'bg-amber-100',  border: 'border-amber-200',  text: 'text-amber-700' },
};

const SECTION_STRATEGIC_TIPS: Record<string, string[]> = {
  CE: [
    "Les questions augmentent en difficulté : A1 → A2 → B1 → B2 → C1 → C2",
    "Lisez d'abord les questions avant de lire le texte pour cibler les informations clés.",
    "Concentrez-vous sur les 20 dernières questions — ce sont celles qui rapportent le plus de points.",
    "Allouez environ 1 min 30 par question pour ne pas manquer de temps.",
  ],
  CO: [
    "Les enregistrements ne sont joués qu'une seule fois — concentrez-vous dès le départ.",
    "Lisez les options avant d'écouter pour anticiper les informations à repérer.",
    "Les questions augmentent en difficulté : A1 → A2 → B1 → B2 → C1 → C2",
    "En cas de doute, passez à la suivante — ne bloquez pas sur une question.",
  ],
  EE: [
    "Planifiez 3 à 5 minutes avant d'écrire pour organiser vos idées.",
    "Respectez le nombre de mots indiqué — trop court ou trop long enlève des points.",
    "Structurez votre texte : introduction claire, développement, conclusion.",
    "Relisez votre production pour corriger les fautes de grammaire et d'orthographe.",
  ],
  EO: [
    "Prenez 30 secondes pour organiser vos idées avant de commencer à parler.",
    "Parlez clairement et à vitesse modérée — la qualité prime sur la quantité.",
    "Utilisez des connecteurs logiques : d'abord, ensuite, enfin, cependant...",
    "Si vous hésitez, utilisez des formules naturelles en français pour gagner du temps.",
  ],
};

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function renderBold(text: string): React.ReactNode {
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, i) =>
    i % 2 === 1 ? <strong key={i} className="font-black text-slate-900">{part}</strong> : part
  );
}

// ── Contenu sections ──────────────────────────────────────────────
type SectionOverview = {
  description: string; duration: string; questionsLabel: string;
  questionsCount: string; maxScore: string; unit: string;
  freeSeriesCount: number; totalSeries: number;
  learningObjectives: { icon: string; title: string; desc: string }[];
  programSteps: { icon: string; title: string; desc: string }[];
};

const SECTION_OVERVIEW: Record<string, SectionOverview> = {
  CE: {
    description: "Maîtrisez les techniques essentielles pour réussir la section compréhension écrite de l'examen TCF Canada avec nos modules interactifs et des textes authentiques.",
    duration: '60 min', questionsLabel: 'Questions', questionsCount: '39', maxScore: '699', unit: 'pts max',
    freeSeriesCount: 2, totalSeries: 50,
    learningObjectives: [
      { icon: '📰', title: 'Compréhension de textes variés', desc: 'Articles de presse, documents administratifs, emails professionnels et textes littéraires.' },
      { icon: '🎯', title: 'Stratégies de lecture efficace', desc: "Techniques pour identifier les informations clés et répondre aux questions rapidement." },
      { icon: '📚', title: 'Vocabulaire et grammaire', desc: "Développez vos connaissances linguistiques à travers des contextes d'examen réels." },
      { icon: '⏱️', title: "Pratique d'examen complète", desc: "Tests chronométrés simulant les conditions réelles de l'examen TCF Canada." },
    ],
    programSteps: [
      { icon: '📖', title: 'Modules théoriques', desc: "Concepts fondamentaux et stratégies pour exceller en compréhension écrite." },
      { icon: '🔢', title: 'Exercices progressifs', desc: 'Progressez du niveau débutant au niveau avancé avec des questions adaptées.' },
      { icon: '🎯', title: 'Conditions réelles', desc: "Évaluation exactement comme le jour de l'examen." },
    ],
  },
  CO: {
    description: "Développez votre oreille française et apprenez à comprendre des dialogues, annonces et documents audio authentiques du quotidien canadien.",
    duration: '35 min', questionsLabel: 'Questions', questionsCount: '39', maxScore: '699', unit: 'pts max',
    freeSeriesCount: 3, totalSeries: 50,
    learningObjectives: [
      { icon: '🗣️', title: 'Dialogues authentiques', desc: 'Conversations du quotidien, annonces publiques et émissions radio canadiennes.' },
      { icon: '🔑', title: 'Identification des informations clés', desc: "Repérez rapidement les informations essentielles dans un document oral." },
      { icon: '🍁', title: 'Accents et registres canadiens', desc: 'Familiarisez-vous avec les variétés du français canadien et québécois.' },
      { icon: '🎧', title: 'Audio TTS intégré', desc: "Écoute synthétisée pour simuler les conditions d'écoute de l'examen." },
    ],
    programSteps: [
      { icon: '👂', title: 'Écoute active', desc: 'Développez votre capacité à saisir le sens global et les détails importants.' },
      { icon: '🔢', title: 'QCM progressifs', desc: "Du document simple au document complexe, progression en paliers de difficulté." },
      { icon: '⏱️', title: 'Conditions chronométrées', desc: "Entraînement avec les mêmes contraintes de temps que l'examen officiel." },
    ],
  },
  EE: {
    description: "Maîtrisez l'art de la rédaction en français avec nos modules complets : méthodologie, sujets d'actualités et astuces pour exceller dans votre examen TCF Canada.",
    duration: '60 min', questionsLabel: 'Tâches', questionsCount: '3', maxScore: '20', unit: 'pts max',
    freeSeriesCount: 2, totalSeries: 12,
    learningObjectives: [
      { icon: '✍️', title: 'Rédaction de textes structurés', desc: "Apprenez à rédiger des textes cohérents et bien structurés." },
      { icon: '💬', title: 'Argumentation convaincante', desc: 'Développez des arguments solides et pertinents pour défendre votre point de vue.' },
      { icon: '📖', title: 'Vocabulaire riche et varié', desc: "Enrichissez votre vocabulaire avec des expressions idiomatiques." },
      { icon: '⏱️', title: "Gestion du temps d'écriture", desc: "Maîtrisez la gestion du temps pour produire des textes de qualité dans les délais." },
    ],
    programSteps: [
      { icon: '📝', title: 'Méthodologie', desc: "Découvrez les techniques de rédaction éprouvées et les structures gagnantes." },
      { icon: '📰', title: "Sujets d'Actualités", desc: "Entraînez-vous sur des sujets récents et pertinents organisés par mois." },
      { icon: '💡', title: 'Astuces et Techniques', desc: "Apprenez les astuces d'experts pour maximiser vos points." },
    ],
  },
  EO: {
    description: "Maîtrisez l'art de la communication orale en français avec nos modules complets : méthodologie, sujets d'actualités et astuces pour exceller dans votre examen TCF Canada.",
    duration: '12 min', questionsLabel: 'Tâches', questionsCount: '3', maxScore: '20', unit: 'pts max',
    freeSeriesCount: 12, totalSeries: 12,
    learningObjectives: [
      { icon: '🗣️', title: 'Prise de parole fluide', desc: "Développez votre aisance à l'oral avec des techniques pour parler de manière claire et naturelle." },
      { icon: '💬', title: 'Argumentation orale', desc: 'Apprenez à défendre votre point de vue avec conviction et à structurer vos arguments à l\'oral.' },
      { icon: '🎵', title: 'Prononciation et intonation', desc: "Améliorez votre prononciation et maîtrisez l'intonation pour une communication efficace." },
      { icon: '🧘', title: 'Gestion du stress', desc: "Maîtrisez votre stress à l'oral et développez votre confiance pour parler en public." },
    ],
    programSteps: [
      { icon: '📋', title: 'Méthodologie', desc: "Découvrez les techniques de communication orale éprouvées et les stratégies gagnantes." },
      { icon: '🎲', title: 'Sessions aléatoires', desc: "Chaque session génère 3 tâches différentes tirées au sort — jamais deux fois le même entraînement." },
      { icon: '💡', title: 'Coaching IA instantané', desc: "Sophie analyse votre plan de réponse et vous donne un retour personnalisé après chaque tâche." },
    ],
  },
};

// ── Détail des tâches EE et EO ────────────────────────────────────
type TaskDetail = {
  num: number; title: string; level: string;
  wordMin?: number; wordMax?: number; timeMin: number;
  prepMin?: number;
  points?: number;
  color: string; description: string;
  examples: string[];
  structure?: { label: string; text: string }[];
  exampleSubject?: string;
};

const EE_TASKS: TaskDetail[] = [
  {
    num: 1, title: "Rédaction d'un message court", level: 'A2 – B1',
    wordMin: 60, wordMax: 120, timeMin: 10,
    color: 'from-sky-400 to-cyan-500',
    description: "La tâche la plus simple. Rédiger un message court pour répondre à une situation de la vie quotidienne : email à un ami, note de service, message de remerciement, demande d'information, etc.",
    examples: [
      "Écrivez un email à un ami pour l'inviter à une fête",
      'Rédigez une note pour excuser votre absence au travail',
      "Envoyez un message pour remercier un collègue de son aide",
    ],
  },
  {
    num: 2, title: "Rédaction d'un article de blog (Narration)", level: 'B1 avancé – B2 avancé',
    wordMin: 120, wordMax: 150, timeMin: 20,
    color: 'from-violet-400 to-purple-500',
    description: "L'objectif principal est de raconter, c'est-à-dire faire de la narration. Cette tâche ne sert PAS à exprimer son opinion. On vous demande de parler d'une expérience vécue dans le passé.",
    examples: [
      "Racontez une expérience de voyage qui vous a marqué",
      "Décrivez une situation personnelle où vous avez dû prendre une décision importante",
      "Racontez un événement mémorable de votre vie professionnelle ou scolaire",
    ],
  },
  {
    num: 3, title: 'Texte argumentatif (Comparaison de deux points de vue)', level: 'C1 – C2',
    wordMin: 120, wordMax: 180, timeMin: 30,
    color: 'from-rose-400 to-pink-500',
    description: "La tâche la plus exigeante. Vous recevez un sujet accompagné de deux documents contradictoires. Vous devez rédiger un texte structuré en deux parties avec un titre.",
    examples: [],
    structure: [
      { label: 'Partie 1 (40-60 mots)', text: "Introduction générale et neutre + résumé des deux documents en utilisant un connecteur d'opposition." },
      { label: 'Partie 2 (80-120 mots)', text: 'Expression de votre point de vue personnel par rapport au sujet abordé dans les deux documents.' },
    ],
    exampleSubject: 'Sujet: "Les jeux vidéo pour les enfants" — Document 1 (favorable) vs Document 2 (défavorable). Vous devez résumer les deux positions puis donner votre avis personnel.',
  },
];

const EO_TASKS: TaskDetail[] = [
  {
    num: 1, title: 'Entretien dirigé sans préparation', level: 'A2 – B1',
    timeMin: 2, points: 3, color: 'from-sky-400 to-cyan-500',
    description: "Cette première tâche consiste à répondre à des questions personnelles posées par l'examinateur. Vous devrez parler de vous, votre famille, vos loisirs, votre travail ou vos études. L'objectif est d'évaluer votre capacité à vous présenter et à parler de votre quotidien de manière spontanée.",
    examples: [
      "Parlez-moi de vous et de votre famille",
      "Quels sont vos loisirs et activités préférés ?",
      "Que faites-vous dans la vie ?",
    ],
  },
  {
    num: 2, title: 'Exercice en interaction', level: 'B1 – B2',
    timeMin: 3, prepMin: 2, points: 7, color: 'from-violet-400 to-purple-500',
    description: "Vous devez jouer un rôle dans une situation de la vie quotidienne. Vous recevez un sujet et devez interagir avec l'examinateur pour obtenir des informations, demander des services ou résoudre un problème. Vous avez 2 minutes de préparation avant le dialogue de 3 minutes 30 secondes.",
    examples: [
      "Vous cherchez un logement et posez des questions à un agent immobilier",
      "Vous organisez un événement et contactez un fournisseur de services",
      "Vous avez un problème avec un achat et contactez le service client",
    ],
  },
  {
    num: 3, title: "Expression d'un point de vue", level: 'C1 – C2',
    timeMin: 4, points: 10, color: 'from-rose-400 to-pink-500',
    description: "La tâche la plus importante ! Vous devez présenter et défendre votre opinion sur un sujet d'actualité ou de société sans préparation préalable. L'examinateur choisit le sujet et vous devez structurer votre argumentation et répondre aux questions pendant 4 minutes 30 secondes.",
    examples: [
      "Pensez-vous que le télétravail est bénéfique pour les employés ?",
      "Les réseaux sociaux ont-ils un impact positif sur la société ?",
      "Faut-il interdire les voitures en centre-ville ?",
    ],
  },
];

// ── Méthodologie EO ───────────────────────────────────────────────
const EO_PRINCIPES = [
  {
    titre: 'Dire les choses simplement',
    texte: "Beaucoup de candidats pensent que des phrases longues et compliquées impressionnent l'examinateur. C'est l'inverse. Une idée bien exprimée en deux phrases courtes vaut bien plus qu'une longue phrase confuse. Avant de parler, posez-vous la question : qu'est-ce que je veux dire exactement ?",
  },
  {
    titre: 'Accepter les pauses sans paniquer',
    texte: "Une seconde de silence n'est pas une faute. Tout le monde a besoin de réfléchir. Ce qui coûte des points, ce n'est pas la pause elle-même, c'est quand vous remplissez ce silence avec des 'euh...euh...euh...' répétés pendant dix secondes. Apprenez à rester naturellement silencieux le temps de trouver votre mot.",
  },
  {
    titre: 'Varier sans chercher à épater',
    texte: "Vous n'avez pas besoin d'un vocabulaire de C2 pour décrocher un bon score. Ce qui compte, c'est de ne pas répéter les mêmes trois mots toute la session. Remplacez 'bon' par 'efficace', 'intéressant' ou 'pertinent'. Utilisez des connecteurs simples : par ailleurs, en revanche, c'est pourquoi.",
  },
];

const EO_STRATEGIES = [
  {
    num: 1,
    titre: 'Tâche 1 — Présentation personnelle',
    duree: '2 minutes · 3 points sur 20',
    color: 'from-sky-500 to-cyan-600',
    borderColor: 'border-sky-100',
    bgColor: 'bg-sky-50',
    textColor: 'text-sky-800',
    objectif: "L'examinateur vous pose des questions sur vous : qui vous êtes, ce que vous faites, pourquoi vous êtes au Canada ou pourquoi vous apprenez le français. Cette tâche vaut seulement 3 points sur 20. Ne cherchez pas à être parfait, cherchez à être naturel.",
    strategies: [
      "Parlez de choses que vous connaissez vraiment. Si vous dites que vous aimez la cuisine, soyez prêt à dire quels plats vous préparez. L'examinateur peut creuser n'importe quel point que vous mentionnez.",
      "Donnez toujours un peu plus que la question ne demande. Si on vous demande où vous habitez, ajoutez depuis quand et ce que vous aimez dans ce quartier. Cela montre que vous savez développer.",
      "Ne récitez pas. Un discours mémorisé se voit immédiatement au débit monotone et au regard fixe. Parlez comme si c'était la première fois que vous le disiez.",
      "Cette tâche est la seule où l'examinateur cherche activement à vous mettre à l'aise. Profitez-en pour vous installer dans la session.",
    ],
    alerte: {
      titre: 'Un point que personne ne dit clairement',
      texte: "Si l'examinateur sent que vous récitez un texte appris par coeur, il va vous couper et vous poser une question précise sur ce que vous venez de dire. Par exemple, si vous dites 'je travaille dans le domaine de la comptabilité', il peut demander 'et concrètement, qu'est-ce que ça implique comme tâches au quotidien ?'. Ce n'est pas une punition, c'est une vérification. Si vous parlez de ce que vous vivez vraiment, cette interruption ne vous déstabilisera pas.",
    },
    conseil: {
      titre: 'Quelle longueur de présentation viser',
      texte: "Une présentation de 60 à 90 secondes est parfaite pour cette tâche. Donnez votre prénom, votre situation actuelle (où vous habitez, ce que vous faites), un ou deux centres d'intérêt, et votre objectif lié au Canada. Ne transformez pas cette introduction en discours de 5 minutes sur votre parcours professionnel complet. L'examinateur a d'autres questions à vous poser.",
    },
  },
  {
    num: 2,
    titre: 'Tâche 2 — Dialogue en situation',
    duree: '2 min de préparation + 3 min 30 de dialogue · 7 points sur 20',
    color: 'from-violet-500 to-purple-600',
    borderColor: 'border-violet-100',
    bgColor: 'bg-violet-50',
    textColor: 'text-violet-800',
    objectif: "On vous place dans une situation concrète : vous appelez une garderie pour inscrire votre enfant, vous vous renseignez sur un logement à louer, vous contactez un club de sport du quartier. L'examinateur joue le rôle de votre interlocuteur. Votre mission : obtenir toutes les informations dont vous avez besoin.",
    strategies: [
      "La première chose à faire en préparation : déterminer si l'interlocuteur est un ami ou un inconnu professionnel. Un ami, ça se tutoie. Une agence immobilière, ça se vouvoie. Une erreur de registre coûte des points dès la première phrase.",
      "Pensez à tous les angles d'une situation réelle. Pour un appartement : le prix, la surface, les charges incluses, le quartier, la disponibilité, les modalités de visite, le dépôt de garantie. Plus vous pensez comme quelqu'un qui vit vraiment cette situation, plus vos questions seront naturelles.",
      "Écrivez vos questions en mots-clés, pas en phrases complètes. Pendant la préparation, vous n'avez pas le temps de rédiger des phrases entières. Notez : 'prix / charges / parking / animaux acceptés / durée bail' et construisez vos questions à l'oral.",
      "Posez une question à la fois. Si vous enchaînez trois questions d'un coup, l'examinateur ne peut pas toutes les traiter et le dialogue devient chaotique.",
      "Quand l'examinateur répond, rebondissez. S'il dit que le loyer est 1 400 dollars, demandez ce qui est inclus dans ce prix. Cette réaction naturelle montre que vous écoutez vraiment.",
    ],
    alerte: {
      titre: 'Le piège le plus courant dans cette tâche',
      texte: "Vous préparez 5 questions, vous les posez en 90 secondes, et il vous reste encore 2 minutes de silence. Le dialogue ne s'arrête pas parce que votre liste est épuisée. Si vous aviez une vraie conversation pour chercher un appartement, vous poseriez des questions jusqu'à ce que vous ayez tout compris. Faites pareil ici. Demandez des précisions sur des réponses déjà données. Demandez des exemples. Demandez ce qui se passe si vous annulez.",
    },
    conseil: null,
  },
  {
    num: 3,
    titre: "Tâche 3 — Prise de position sur un sujet",
    duree: '4 min 30 sans préparation · 10 points sur 20',
    color: 'from-rose-500 to-pink-600',
    borderColor: 'border-rose-100',
    bgColor: 'bg-rose-50',
    textColor: 'text-rose-800',
    objectif: "L'examinateur vous annonce un sujet de société et vous pose une question ouverte. Vous devez donner votre avis, l'argumenter et répondre à ses relances. Cette tâche vaut la moitié de votre note totale. C'est là que tout se joue.",
    strategies: [
      "Ne commencez pas par votre opinion personnelle. Commencez par reformuler le sujet et annoncer que vous allez en voir les différents aspects. Cela vous donne quelques secondes pour rassembler vos idées et montre que vous structurez.",
      "Présentez toujours les deux côtés, même si vous avez une conviction forte. Un candidat qui dit uniquement 'les réseaux sociaux c'est nul' sans nuance montre une pensée limitée. Un candidat qui dit 'certes les réseaux sociaux présentent des avantages comme X et Y, cependant ils comportent aussi des risques comme Z' montre qu'il peut argumenter.",
      "Quand l'examinateur vous relance, ne répétez pas ce que vous avez déjà dit. Apportez un nouvel angle, un nouvel exemple, une situation concrète tirée de votre expérience au Canada ou dans votre pays d'origine.",
      "Utilisez des exemples réels plutôt qu'abstraits. 'J'ai un cousin qui a trouvé du travail grâce à LinkedIn' est plus percutant que 'les réseaux sociaux peuvent aider à trouver du travail'.",
      "Pour conclure, résumez en une phrase votre position et pourquoi vous la tenez. Une conclusion nette vaut mieux qu'une fin qui s'effiloche.",
    ],
    alerte: {
      titre: 'Ce que la plupart des candidats font mal dans cette tâche',
      texte: "Ils partent du principe qu'ils doivent parler 4 minutes 30 d'une traite, sans s'arrêter. Résultat : ils s'épuisent leur sujet en 2 minutes, commencent à tourner en rond, répètent les mêmes idées avec d'autres mots, et la qualité chute. Ce n'est pas un monologue. L'examinateur va intervenir, poser des questions, vous demander de développer tel ou tel point. Votre rôle est de répondre à ces relances avec de nouvelles informations, pas de résister à l'interruption.",
    },
    conseil: {
      titre: 'Un plan simple qui fonctionne à chaque fois',
      texte: "Introduction (20 sec) : 'La question de X est complexe. Il y a des arguments dans les deux sens.' — Côté positif (45 sec à 1 min) : 2 arguments avec 1 exemple chacun. — Côté négatif (45 sec à 1 min) : 2 arguments avec 1 exemple chacun. — Position personnelle (30 sec) : 'Personnellement, je pense que... parce que dans mon expérience...' Ce plan vous occupe entre 2 min 30 et 3 min. L'examinateur prend le relais avec ses questions pour le reste.",
    },
  },
];

const EO_CRITERES = [
  {
    titre: 'Lexique',
    desc: "Ce critère évalue si vous utilisez des mots précis et variés. Répéter toujours les mêmes termes pénalise votre note même si vos idées sont bonnes. Travaillez activement vos synonymes et vos expressions de nuance.",
  },
  {
    titre: 'Morphosyntaxe',
    desc: "Il s'agit de la grammaire : accords, conjugaisons, structure des phrases. Une erreur isolée ne pénalise pas. Ce qui pénalise, c'est la même faute répétée systématiquement, ou des constructions qui rendent vos phrases incompréhensibles.",
  },
  {
    titre: 'Phonologie',
    desc: "L'examinateur évalue si votre prononciation permet une compréhension sans effort. Avoir un accent africain ou camerounais n'est pas une faute. Ce qui compte, c'est que chaque mot soit articulé clairement. Ralentissez si vous sentez que vous vous embrouillez.",
  },
  {
    titre: 'Pragmatique',
    desc: "Ce critère mesure votre capacité à adapter votre discours à la situation. Parlez-vous différemment à un ami et à un employeur ? Savez-vous quand conclure, quand relancer, quand donner un exemple ? C'est ce que ce critère évalue.",
  },
];

const EO_CONSEILS_JOUR_J = [
  {
    titre: 'Votre accent n\'est pas un obstacle',
    texte: "Le TCF Canada n'évalue pas votre prononciation parisienne. Il évalue si on vous comprend. Des milliers de candidats originaires d'Afrique francophone obtiennent d'excellents scores chaque année avec leur accent. Ce qui nuit à la note, c'est une articulation floue ou une vitesse excessive, pas l'accent en lui-même.",
  },
  {
    titre: 'Demandez une reformulation sans hésiter',
    texte: "Si vous n'avez pas bien saisi une question, dites-le clairement : 'Pourriez-vous reformuler votre question ?' ou simplement 'Je n'ai pas bien compris, désolé'. L'examinateur n'en fait pas une note négative. Ce qui serait vraiment dommageable, c'est de répondre à côté de la question parce que vous n'avez pas osé demander.",
  },
  {
    titre: 'Une erreur ne détruit pas votre session',
    texte: "Faire une faute de grammaire au milieu d'une réponse n'efface pas tout ce que vous avez dit avant. Ne vous arrêtez pas, ne vous excusez pas, ne recommencez pas la phrase depuis le début. Continuez. L'examinateur note l'ensemble de votre performance, pas chaque erreur individuellement.",
  },
  {
    titre: 'Ce qui fait vraiment la différence avant l\'examen',
    texte: "Parler français à voix haute tous les jours. Pas lire, pas écouter, parler. Entraînez-vous à donner votre avis sur un sujet pendant 2 minutes chronomètre en main. Faites-le sur des sujets variés : le logement, le travail, les études, l'immigration, la technologie. C'est exactement ce que vous ferez le jour de l'examen.",
  },
];

// ── Lecteur audio TTS ─────────────────────────────────────────────
// ── Lecteur audio CO chronométré (une seule écoute, comme le vrai TCF) ──────
function AudioPlayer({ transcript, audioUrl, timeLimitSec, onTimeUp }: {
  transcript: string;
  audioUrl?: string | null;
  timeLimitSec?: number;
  onTimeUp?: () => void;
}) {
  type Phase = 'loading' | 'playing' | 'paused' | 'active' | 'done';
  const [phase, setPhase] = useState<Phase>('loading');
  const [timeLeft, setTimeLeft] = useState(timeLimitSec ?? 0);
  const countRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef  = useRef<HTMLAudioElement | null>(null);
  const isTTSRef  = useRef(false);

  const total      = timeLimitSec ?? 0;
  const elapsedPct = total > 0 ? Math.round(((total - timeLeft) / total) * 100) : 0;

  function pauseCountdown() {
    if (countRef.current) { clearInterval(countRef.current); countRef.current = null; }
  }

  function startCountdown() {
    if (!timeLimitSec) return;
    pauseCountdown();
    countRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(countRef.current!);
          setTimeout(() => { setPhase('done'); onTimeUp?.(); }, 0);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }

  function playTTS(text: string, tSec?: number) {
    if (!text || !('speechSynthesis' in window)) { setPhase('active'); return; }
    isTTSRef.current = true;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'fr-CA';
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => v.lang === 'fr-CA') || voices.find(v => v.lang.startsWith('fr'));
    if (voice) utter.voice = voice;
    utter.rate = 0.9;
    utter.onstart = () => { setPhase('playing'); startCountdown(); };
    utter.onend   = () => { setPhase(tSec ? 'active' : 'done'); };
    utter.onerror = () => { setPhase('active'); };
    window.speechSynthesis.speak(utter);
  }

  function launchAudio(url: string, text: string, tSec?: number) {
    isTTSRef.current = false;
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.onplay  = () => { setPhase('playing'); startCountdown(); };
    audio.onended = () => { setPhase(tSec ? 'active' : 'done'); };
    audio.onerror = () => playTTS(text, tSec);
    setPhase('playing');
    audio.play().catch(() => playTTS(text, tSec));
  }

  function togglePlayPause() {
    if (phase === 'loading') return;

    if (phase === 'playing') {
      // → Pause
      if (isTTSRef.current) {
        window.speechSynthesis.pause();
      } else if (audioRef.current) {
        audioRef.current.pause();
      }
      pauseCountdown();
      setPhase('paused');
      return;
    }

    if (phase === 'paused') {
      // → Reprendre
      if (isTTSRef.current) {
        window.speechSynthesis.resume();
      } else if (audioRef.current) {
        audioRef.current.play().catch(() => {});
      }
      startCountdown();
      setPhase('playing');
      return;
    }

    // phase === 'active' | 'done' → Rejouer depuis le début
    pauseCountdown();
    window.speechSynthesis.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setTimeLeft(timeLimitSec ?? 0);
    setPhase('loading');
    setTimeout(() => {
      if (audioUrl) launchAudio(audioUrl, transcript, timeLimitSec);
      else playTTS(transcript, timeLimitSec);
    }, 300);
  }

  useEffect(() => {
    window.speechSynthesis.cancel();
    pauseCountdown();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPhase('loading');
    setTimeLeft(timeLimitSec ?? 0);

    const t = setTimeout(() => {
      if (audioUrl) launchAudio(audioUrl, transcript, timeLimitSec);
      else playTTS(transcript, timeLimitSec);
    }, 600);

    return () => {
      clearTimeout(t);
      window.speechSynthesis.cancel();
      pauseCountdown();
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transcript, audioUrl]);

  const btnIcon =
    phase === 'loading' ? null :
    phase === 'playing' ? '⏸' :
    phase === 'paused'  ? '▶' : '↺';

  const label =
    phase === 'loading' ? '⏳ Chargement...' :
    phase === 'playing' ? '🎧 Écoute en cours...' :
    phase === 'paused'  ? '⏸ En pause' :
    phase === 'active'  ? '💭 Choisissez votre réponse' :
                          '✓ Écoute terminée';

  return (
    <div className="bg-sky-50 border border-sky-200 rounded-2xl p-4">
      <div className="flex items-center gap-3 mb-2">

        {/* Bouton unique Play / Pause / Rejouer */}
        <button
          onClick={togglePlayPause}
          disabled={phase === 'loading'}
          className={`w-11 h-11 rounded-full flex items-center justify-center text-white text-lg font-bold shadow flex-shrink-0 transition-all active:scale-95
            ${phase === 'loading'  ? 'bg-sky-300 cursor-not-allowed' :
              phase === 'playing'  ? 'bg-sky-500 hover:bg-sky-600 cursor-pointer' :
              phase === 'paused'   ? 'bg-amber-500 hover:bg-amber-600 cursor-pointer' :
                                     'bg-slate-500 hover:bg-slate-600 cursor-pointer'}`}>
          {phase === 'loading'
            ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            : btnIcon}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1.5 gap-2">
            <span className={`text-xs font-bold truncate ${
              phase === 'playing' ? 'text-sky-700' :
              phase === 'paused'  ? 'text-amber-600' :
              phase === 'active'  ? 'text-emerald-600' : 'text-slate-500'}`}>
              {label}
            </span>
            {total > 0 && phase !== 'loading' && phase !== 'done' && (
              <span className={`text-sm font-black flex-shrink-0 tabular-nums ${
                phase === 'active' ? 'text-emerald-600' : 'text-sky-700'
              }`}>
                {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}
              </span>
            )}
          </div>

          {/* Barre gauche → droite — continue après la fin de l'audio */}
          {total > 0 ? (
            <div className="h-2.5 bg-sky-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-1000 ${
                  phase === 'playing' ? 'bg-sky-400' :
                  phase === 'paused'  ? 'bg-amber-400' :
                  phase === 'active'  ? 'bg-emerald-400' : 'bg-slate-200'
                }`}
                style={{ width: `${elapsedPct}%` }}
              />
            </div>
          ) : (
            <div className="h-2.5 bg-sky-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-sky-400 rounded-full"
                animate={{ width: phase === 'playing' ? '100%' : phase === 'active' || phase === 'done' ? '100%' : `${elapsedPct}%` }}
                transition={{ duration: phase === 'playing' ? 8 : 0.3, ease: 'linear' }} />
            </div>
          )}
        </div>
      </div>

      {phase === 'active' && (
        <p className="text-[10px] text-emerald-600 font-bold mt-1">
          ✓ Audio terminé — sélectionnez votre réponse ci-dessous
        </p>
      )}
    </div>
  );
}

// ── Lecteur audio simplifié pour la revue des résultats ───────────
function ReviewAudio({ audioUrl, transcript }: { audioUrl?: string | null; transcript?: string | null }) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  function stop() {
    window.speechSynthesis?.cancel();
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setPlaying(false);
  }

  function speakTTS() {
    if (!transcript || !('speechSynthesis' in window)) { setPlaying(false); return; }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(transcript);
    utter.lang = 'fr-CA';
    utter.rate = 0.9;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === 'fr-CA') || voices.find(v => v.lang.startsWith('fr'));
    if (v) utter.voice = v;
    utter.onstart = () => setPlaying(true);
    utter.onend   = () => setPlaying(false);
    utter.onerror = () => setPlaying(false);
    window.speechSynthesis.speak(utter);
    setPlaying(true);
  }

  function toggle() {
    if (playing) { stop(); return; }
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => setPlaying(false);
      audio.onerror = () => speakTTS();
      audio.play().then(() => setPlaying(true)).catch(() => speakTTS());
    } else {
      speakTTS();
    }
  }

  useEffect(() => () => stop(), []);

  if (!audioUrl && !transcript) return null;
  return (
    <button onClick={toggle}
      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
        playing ? 'bg-amber-100 text-amber-700 border border-amber-300' : 'bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100'
      }`}>
      <span>{playing ? '⏸' : '▶'}</span>
      {playing ? 'Arrêter' : 'Réécouter'}
    </button>
  );
}

// ── Compteur de mots ──────────────────────────────────────────────
function WordCount({ text, min, max }: { text: string; min?: number; max?: number }) {
  const count = text.trim() ? text.trim().split(/\s+/).length : 0;
  const ok = (!min || count >= min) && (!max || count <= max);
  const over = max && count > max;
  return (
    <div className={`text-xs font-semibold ${over ? 'text-red-500' : ok && count > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
      {count} mot{count !== 1 ? 's' : ''}
      {min && max ? ` · Objectif : ${min}–${max}` : min ? ` · Minimum : ${min}` : ''}
    </div>
  );
}

// ── Carte série / combinaison ─────────────────────────────────────
const CURRENT_MONTH = new Date().toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' });

function SerieCard({ num, isFree, isFirst, isPaid, color, onStart, cardLabel, cardDesc }: {
  num: number; isFree: boolean; isFirst: boolean; isPaid: boolean; color: string;
  onStart: (n: number) => void; cardLabel: string; cardDesc: string;
}) {
  if (isFree) {
    return (
      <motion.div whileHover={{ y: -3, scale: 1.02 }}
        className="bg-white border-2 border-slate-100 hover:border-red-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onStart(num)}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-black shadow`}>{num}</div>
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isFirst ? 'bg-emerald-100 text-emerald-700' : 'bg-sky-100 text-sky-700'}`}>
            {isFirst ? 'Gratuit' : 'Disponible'}
          </span>
        </div>
        <div className="font-black text-slate-800 text-sm mb-0.5">{cardLabel} {num}</div>
        <div className="text-xs text-slate-400 capitalize mb-1">{CURRENT_MONTH}</div>
        <div className="text-xs text-slate-400">{cardDesc}</div>
        <div className="mt-3 text-xs font-bold text-red-600 group-hover:text-red-700 flex items-center gap-1">
          Commencer <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </motion.div>
    );
  }

  // Série accessible — utilisateur abonné payant
  if (isPaid) {
    return (
      <motion.div whileHover={{ y: -3, scale: 1.02 }}
        className="bg-white border-2 border-slate-100 hover:border-red-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group"
        onClick={() => onStart(num)}>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center text-white text-sm font-black shadow`}>{num}</div>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">Premium</span>
        </div>
        <div className="font-black text-slate-800 text-sm mb-0.5">{cardLabel} {num}</div>
        <div className="text-xs text-slate-400 capitalize mb-1">{CURRENT_MONTH}</div>
        <div className="text-xs text-slate-400">{cardDesc}</div>
        <div className="mt-3 text-xs font-bold text-red-600 group-hover:text-red-700 flex items-center gap-1">
          Commencer <span className="group-hover:translate-x-1 transition-transform">→</span>
        </div>
      </motion.div>
    );
  }

  // Série verrouillée — utilisateur gratuit : paywall vers /pricing
  return (
    <motion.div
      whileHover={{ y: -2, scale: 1.01 }}
      className="bg-gradient-to-br from-indigo-50 to-violet-50 border-2 border-indigo-100 hover:border-red-300 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
      onClick={() => window.location.href = '/pricing'}
    >
      <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-indigo-200/30 to-violet-200/30 rounded-full -translate-y-6 translate-x-6 pointer-events-none" />
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-300 to-violet-400 flex items-center justify-center text-white text-sm font-black shadow opacity-80">{num}</div>
        <span className="text-xs font-black bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">Premium</span>
      </div>
      <div className="font-black text-slate-700 text-sm mb-0.5">{cardLabel} {num}</div>
      <div className="text-xs text-slate-500 mb-1">{cardDesc}</div>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs text-slate-400 flex items-center gap-1">🔒 Accès réservé</span>
        <span className="text-xs font-black text-red-600 group-hover:text-violet-700 flex items-center gap-1 transition-colors">
          S&apos;abonner <span className="group-hover:translate-x-1 transition-transform">→</span>
        </span>
      </div>
    </motion.div>
  );
}

// ════════════════════════════════════════════════════════════════
function PracticePageInner() {
  const { section } = useParams<{ section: string }>();
  const { user, loading: authLoading, getToken, userPlan } = useAuth();
  const isPaid = userPlan !== 'free' || user?.role === 'admin';
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionCode = section?.toUpperCase() as 'CO' | 'CE' | 'EE' | 'EO';
  const meta = SECTION_META[sectionCode] ?? SECTION_META.CE;
  const overview = SECTION_OVERVIEW[sectionCode] ?? SECTION_OVERVIEW.CE;

  // Combo custom depuis la page Formation (t1/t2/t3 passés en query params)
  const customT1Id = searchParams.get('t1');
  const customT2Id = searchParams.get('t2');
  const customT3Id = searchParams.get('t3');
  const customSerieNum = searchParams.get('serie');
  const isFormationCombo = (sectionCode === 'EE' || sectionCode === 'EO') && !!(customT1Id && customT2Id && customT3Id);

  const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const [phase, setPhase] = useState<'overview' | 'sessions' | 'preview' | 'session'>('overview');
  const [selectedSerie, setSelectedSerie] = useState(1);
  const [activeTab, setActiveTab] = useState<'methodologie' | 'banque' | 'dashboard'>('methodologie');

  // Séries EE curées par l'admin (Formation)
  type EeFormationTask = { id: string; theme?: string | null; taskNumber?: number | null };
  type EeFormationSerie = { id: number; t1: EeFormationTask; t2: EeFormationTask; t3: EeFormationTask };
  const [eeFormationSeries, setEeFormationSeries] = useState<EeFormationSerie[]>([]);
  const [eeFormationLoading, setEeFormationLoading] = useState(false);
  const [selectedComboIds, setSelectedComboIds] = useState<{ t1Id: string; t2Id: string; t3Id: string } | null>(null);

  // Séries CE curées par l'admin
  type CeFormationQuestion = { id: string; question: string; level: string; options: Record<string, string>; answer: string; explanation?: string; theme?: string };
  type CeFormationSerie = { id: number; questions: CeFormationQuestion[] };
  type CeSerieScore = { correct: number; total: number; completedAt: string };
  const [ceFormationSeries, setCeFormationSeries] = useState<CeFormationSerie[]>([]);
  const [ceFormationLoading, setCeFormationLoading] = useState(false);
  const [selectedCeSerieId, setSelectedCeSerieId] = useState<number | null>(null);
  const [ceFilter, setCeFilter] = useState<'all' | 'done' | 'todo'>('all');
  const [ceSerieScores, setCeSerieScores] = useState<Record<number, CeSerieScore>>({});
  const [pendingCeSerie, setPendingCeSerie] = useState<CeFormationSerie | null>(null);

  // Séries CO curées par l'admin (via sessionGroup)
  type CoFormationSerie = { id: number; sessionGroup: string; questions: Question[] };
  const [coFormationSeries, setCoFormationSeries] = useState<CoFormationSerie[]>([]);
  const [coFormationLoading, setCoFormationLoading] = useState(false);
  const [selectedCoSerieId, setSelectedCoSerieId] = useState<number | null>(null);
  const [coSerieScores, setCoSerieScores] = useState<Record<number, CeSerieScore>>({});

  // Dashboard EO
  const [dashData, setDashData] = useState<{ attempts: number; avgScore: number | null; bestScore: number | null; history: import('../../../lib/api').HistoryItem[] } | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashLoaded, setDashLoaded] = useState(false);

  // Banque d'épreuves EO
  type BankTask = { id: string; taskNumber: number; question: string; theme: string | null; timeLimitMin: number | null; tags: string[]; level: string };
  const BANK_PAGE_SIZE = 12;
  const [bankTasks, setBankTasks] = useState<Record<number, BankTask[]>>({});
  const [bankLoading, setBankLoading] = useState(false);
  const [bankLoaded, setBankLoaded] = useState(false);
  const [bankOpen, setBankOpen] = useState<Record<string, boolean>>({});
  const [bankTaskOpen, setBankTaskOpen] = useState<Record<number, boolean>>({ 1: true, 2: false, 3: false });
  const [bankThemeFilter, setBankThemeFilter] = useState<Record<number, string | null>>({});
  const [bankPage, setBankPage] = useState<Record<number, number>>({ 1: 0, 2: 0, 3: 0 });
  const [bankCorrections, setBankCorrections] = useState<Record<string, string>>({});
  const [bankCorrectionLoading, setBankCorrectionLoading] = useState<Record<string, boolean>>({});
  const [showQuitModal, setShowQuitModal] = useState(false);

  // Timer
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // CO/CE — navigation libre entre toutes les questions
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // EE/EO — 3 tâches
  const [session, setSession] = useState<EpreuvSession | null>(null);
  const [currentTask, setCurrentTask] = useState(0);
  const [taskAnswers, setTaskAnswers] = useState<string[]>(['', '', '']);
  const [taskCorrections, setTaskCorrections] = useState<(CorrectionResult | null)[]>([null, null, null]);
  const [taskSubmitted, setTaskSubmitted] = useState<boolean[]>([false, false, false]);
  const [correcting, setCorrecting] = useState(false);
  const [correctionError, setCorrectionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Navigation panel mobile
  const [navOpen, setNavOpen] = useState(false);

  // Common
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [mood, setMood] = useState<AvatarMood>('idle');
  const [scores, setScores] = useState<number[]>([]);
  const [startTime, setStartTime] = useState(0);

  const [studentClasses, setStudentClasses] = useState<ClassData[]>([]);
  const [selectedClassId, setSelectedClassId] = useState('');

  // Résultats — questions dépliées + onglet actif
  const [expandedQ, setExpandedQ]     = useState<Set<number>>(new Set());
  const [resultsTab, setResultsTab]   = useState<'results' | 'apercu'>('results');

  // Achievements toast
  const [newBadges, setNewBadges] = useState<Badge[]>([]);

  // Sondage post-session
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyResultId, setSurveyResultId] = useState<string | undefined>();

  // Protection anti-plagiat
  const protectedRef = useExamProtection(phase === 'session');

  // Auth guard
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [authLoading, user, router]);

  // EE Formation combo — affiche la preview avant le lancement
  useEffect(() => {
    if (!isFormationCombo || phase !== 'overview' || authLoading || !user) return;
    if (customSerieNum) setSelectedSerie(Number(customSerieNum));
    setPhase('preview');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFormationCombo, phase, authLoading, user]);

  // EE — démarrage après sélection d'une série admin dans le picker
  useEffect(() => {
    if (!selectedComboIds || phase !== 'preview' || authLoading || !user) return;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedComboIds, phase, authLoading, user]);

  // Classes
  useEffect(() => {
    if (!user || !meta.isWritten) return;
    getToken().then(token => {
      if (!token) return;
      api.classes.listByStudent(user.id, token)
        .then(r => { setStudentClasses(r.classes); if (r.classes.length === 1) setSelectedClassId(r.classes[0].id); })
        .catch(() => {});
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, meta.isWritten]);

  // Séries EE formation — charge quand on entre dans le sélecteur de sessions
  useEffect(() => {
    if (sectionCode !== 'EE' || phase !== 'sessions' || eeFormationSeries.length > 0 || eeFormationLoading) return;
    setEeFormationLoading(true);
    getToken().then(async token => {
      if (!token) { setEeFormationLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/questions/exam-series?section=EE`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data.series) && data.series.length > 0) setEeFormationSeries(data.series);
      } catch {}
      finally { setEeFormationLoading(false); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCode, phase, eeFormationSeries.length]);

  // CE séries — charge quand on entre dans la sélection
  useEffect(() => {
    if (sectionCode !== 'CE' || (phase !== 'sessions' && phase !== 'overview') || ceFormationSeries.length > 0 || ceFormationLoading) return;
    setCeFormationLoading(true);
    getToken().then(async token => {
      if (!token) { setCeFormationLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/questions/exam-series?section=CE`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data.series) && data.series.length > 0) setCeFormationSeries(data.series);
      } catch {}
      finally { setCeFormationLoading(false); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCode, phase, ceFormationSeries.length]);

  // CE scores localStorage — charge quand user disponible
  useEffect(() => {
    if (!user || sectionCode !== 'CE') return;
    try {
      const saved = localStorage.getItem(`reussirtcf_ce_scores_${user.id}`);
      if (saved) setCeSerieScores(JSON.parse(saved));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sectionCode]);

  // CO séries — charge quand on entre dans la sélection
  useEffect(() => {
    if (sectionCode !== 'CO' || (phase !== 'sessions' && phase !== 'overview') || coFormationSeries.length > 0 || coFormationLoading) return;
    setCoFormationLoading(true);
    getToken().then(async token => {
      if (!token) { setCoFormationLoading(false); return; }
      try {
        const res = await fetch(`${API_BASE}/api/questions/exam-series?section=CO`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (Array.isArray(data.series) && data.series.length > 0) setCoFormationSeries(data.series);
      } catch {}
      finally { setCoFormationLoading(false); }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCode, phase, coFormationSeries.length]);

  // CO scores localStorage — charge quand user disponible
  useEffect(() => {
    if (!user || sectionCode !== 'CO') return;
    try {
      const saved = localStorage.getItem(`reussirtcf_co_scores_${user.id}`);
      if (saved) setCoSerieScores(JSON.parse(saved));
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, sectionCode]);

  // Timer — démarre quand phase=session
  useEffect(() => {
    if (phase !== 'session' || done) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, done]);

  // Auto-soumission quand le timer expire
  useEffect(() => {
    if (timeLeft === 0 && phase === 'session' && !done) {
      submitExam();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, phase, done]);

  // Auto-save brouillon EE/EO dans localStorage
  useEffect(() => {
    if (!meta.isWritten || !user || phase !== 'session') return;
    if (taskAnswers.every(a => !a.trim())) return;
    try {
      localStorage.setItem(`reussirtcf_draft_${sectionCode}_${user.id}`, JSON.stringify(taskAnswers));
    } catch {}
  }, [taskAnswers, meta.isWritten, user, phase, sectionCode]);

  // Chargement dashboard section
  useEffect(() => {
    if (activeTab !== 'dashboard' || dashLoaded || dashLoading || !user) return;
    setDashLoading(true);
    (async () => {
      try {
        const token = await getToken();
        const [dash, hist] = await Promise.all([
          api.progress.dashboard(user.id, token ?? undefined),
          api.progress.history(user.id, token ?? undefined),
        ]);
        const sectionStat = dash.stats.find(s => s.section === sectionCode);
        const sectionHistory = hist.history.filter(h => h.section === sectionCode);
        const bestScore = sectionHistory.length > 0 ? Math.max(...sectionHistory.map(h => h.score)) : null;
        setDashData({ attempts: sectionStat?.attempts ?? 0, avgScore: sectionStat?.averageScore ?? null, bestScore, history: sectionHistory });
        setDashLoaded(true);
      } catch { /* silencieux */ }
      finally { setDashLoading(false); }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dashLoaded, dashLoading, user, sectionCode]);

  async function handleEoCorrection(q: { id: string; taskNumber: number; question: string; theme: string | null }) {
    if (bankCorrections[q.id] || bankCorrectionLoading[q.id]) return;
    setBankCorrectionLoading(prev => ({ ...prev, [q.id]: true }));
    try {
      const token = await (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk?.session?.getToken().catch(() => undefined);
      const data = await api.ai.eoCorrection({ taskNumber: q.taskNumber, question: q.question, theme: q.theme }, token);
      setBankCorrections(prev => ({ ...prev, [q.id]: data.correction }));
    } catch {
      setBankCorrections(prev => ({ ...prev, [q.id]: 'Erreur lors de la génération. Réessayez.' }));
    } finally {
      setBankCorrectionLoading(prev => ({ ...prev, [q.id]: false }));
    }
  }

  // Chargement banque d'épreuves EO/EE (à la demande quand l'onglet est ouvert)
  useEffect(() => {
    if (activeTab !== 'banque' || bankLoaded || bankLoading) return;
    setBankLoading(true);

    (async () => {
      try {
        const token = await (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string> } } }).Clerk?.session?.getToken().catch(() => undefined);
        const data = await api.questions.tasks(sectionCode, token);
        const tasks = data.tasks as Record<number, BankTask[]>;
        setBankTasks(tasks);
        setBankLoaded(true);

        // Auto-ouvrir toutes les questions de toutes les tâches
        const allOpen: Record<string, boolean> = {};
        for (const tn of [1, 2, 3]) {
          for (const q of tasks[tn] ?? []) allOpen[q.id] = true;
        }
        setBankOpen(allOpen);
      } catch {
        // silencieux
      } finally {
        setBankLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, bankLoaded, bankLoading, sectionCode]);

  const fetchContent = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getToken();
      if (!token) { setError('Session expirée — reconnecte-toi.'); setLoading(false); return; }
      if (meta.isWritten) {
        let sessionData;
        const activeCombo = selectedComboIds ?? (isFormationCombo ? { t1Id: customT1Id!, t2Id: customT2Id!, t3Id: customT3Id! } : null);
        if (activeCombo) {
          // Combo fixe depuis la page Formation ou sélecteur admin
          const headers = { Authorization: `Bearer ${token}` };
          const [r1, r2, r3] = await Promise.all([
            fetch(`${API_BASE}/api/questions/${activeCombo.t1Id}`, { headers }).then(r => r.json()),
            fetch(`${API_BASE}/api/questions/${activeCombo.t2Id}`, { headers }).then(r => r.json()),
            fetch(`${API_BASE}/api/questions/${activeCombo.t3Id}`, { headers }).then(r => r.json()),
          ]);
          if (!r1.id || !r2.id || !r3.id) throw new Error('Tâches introuvables — série invalide.');
          sessionData = {
            group: 'formation-custom',
            level: r1.level ?? 'B1',
            theme: r3.theme ?? r2.theme ?? null,
            tasks: [r1, r2, r3],
          };
        } else {
          const res = await api.questions.session({ section: sectionCode as 'EE' | 'EO' }, token);
          sessionData = res.session;
        }
        setSession(sessionData);
        // Restaurer le brouillon sauvegardé si disponible
        let restoredAnswers: string[] = ['', '', ''];
        try {
          const saved = user ? localStorage.getItem(`reussirtcf_draft_${sectionCode}_${user.id}`) : null;
          if (saved) {
            const parsed = JSON.parse(saved) as string[];
            if (Array.isArray(parsed) && parsed.length === 3) restoredAnswers = parsed;
          }
        } catch {}
        setTaskAnswers(restoredAnswers);
        setTaskCorrections([null, null, null]);
        setTaskSubmitted([false, false, false]);
        setCurrentTask(0);
      } else if (sectionCode === 'CE') {
        const ceRes = await fetch(`${API_BASE}/api/questions/exam-series?section=CE`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const ceData = await ceRes.json();
        if (!Array.isArray(ceData.series) || ceData.series.length === 0) {
          setError('Aucune série CE disponible — contacte l\'administrateur.');
          setLoading(false);
          return;
        }
        const randomSerie = ceData.series[Math.floor(Math.random() * ceData.series.length)];
        setQuestions(randomSerie.questions as Question[]);
        setCurrentQ(0);
        setAnswers({});
      } else if (sectionCode === 'CO') {
        const coRes = await fetch(`${API_BASE}/api/questions/exam-series?section=CO`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const coData = await coRes.json();
        if (!Array.isArray(coData.series) || coData.series.length === 0) {
          setError("Aucune série CO disponible — contacte l'administrateur.");
          setLoading(false);
          return;
        }
        const serie = coData.series.find((s: CoFormationSerie) => s.id === selectedCoSerieId) ?? coData.series[0];
        setQuestions(serie.questions as Question[]);
        setCurrentQ(0);
        setAnswers({});
      } else {
        const res = await api.questions.list({ section: sectionCode, limit: 39 }, token);
        if (res.questions.length === 0) { setError('Aucune question disponible pour cette section.'); }
        setQuestions(res.questions);
        setCurrentQ(0);
        setAnswers({});
      }
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      if (msg.includes('429') || msg.includes('trop')) setError('Trop de requêtes — attends quelques secondes.');
      else if (msg.includes('token') || msg.includes('401')) setError('Session expirée — reconnecte-toi.');
      else setError('Erreur de chargement — vérifie ta connexion et réessaie.');
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionCode, meta.isWritten, isFormationCombo, customT1Id, customT2Id, customT3Id, selectedComboIds]);

  function startSession() {
    setStartTime(Date.now());
    setScores([]);
    setDone(false);
    setMood('idle');
    setShowSurvey(false);
    setTimeLeft(SECTION_DURATION[sectionCode] ?? 3600);
    setPhase('session');
    fetchContent();
    if (user) trackEvent({ userId: user.id, event: EVENTS.SESSION_START, page: `/practice/${sectionCode}`, section: sectionCode });
  }

  function startCeSerie(serie: CeFormationSerie) {
    if (timerRef.current) clearInterval(timerRef.current);
    setStartTime(Date.now());
    setScores([]);
    setDone(false);
    setMood('idle');
    setTimeLeft(SECTION_DURATION['CE'] ?? 3600);
    setSelectedCeSerieId(serie.id);
    const sorted = [...serie.questions].sort(
      (a, b) => (LEVEL_ORDER[a.level] ?? 99) - (LEVEL_ORDER[b.level] ?? 99)
    );
    setQuestions(sorted as Question[]);
    setCurrentQ(0);
    setAnswers({});
    setPhase('session');
  }

  function startCoSerie(serie: CoFormationSerie) {
    if (timerRef.current) clearInterval(timerRef.current);
    setStartTime(Date.now());
    setScores([]);
    setDone(false);
    setMood('idle');
    setTimeLeft(SECTION_DURATION['CO'] ?? 2100);
    setSelectedCoSerieId(serie.id);
    setQuestions(serie.questions as Question[]);
    setCurrentQ(0);
    setAnswers({});
    setPhase('session');
  }

  function exitSession() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (isFormationCombo) {
      router.push(sectionCode === 'EO' ? '/formation-eo' : '/formation');
      return;
    }
    if (sectionCode === 'CE' || sectionCode === 'CO') {
      setPhase('overview');
      return;
    }
    setPhase('overview');
  }

  async function finishSession(finalScores: number[]) {
    if (timerRef.current) clearInterval(timerRef.current);
    const avg = finalScores.length ? Math.round(finalScores.reduce((a, b) => a + b, 0) / finalScores.length) : 0;
    const duration = Math.round((Date.now() - startTime) / 1000);

    const prevIds = loadSavedBadgeIds();

    if (user) {
      const savedResult = await api.progress.save({
        userId: user.id, section: sectionCode, score: avg,
        total: finalScores.length, correct: finalScores.filter(s => s >= 70).length,
        durationSeconds: duration,
      }).catch(() => null);

      // Tracker la complétion de session
      trackEvent({ userId: user.id, event: EVENTS.SESSION_COMPLETE, page: `/practice/${sectionCode}`, section: sectionCode, metadata: { score: avg } });

      // Déclencher le sondage une seule fois après 2 sessions
      const rId = (savedResult as { resultId?: string } | null)?.resultId;
      const surveyShownKey = 'reussirtcf_survey_shown';
      const surveyCountKey = 'reussirtcf_survey_count';
      const alreadyShown = localStorage.getItem(surveyShownKey);
      if (!alreadyShown) {
        const count = parseInt(localStorage.getItem(surveyCountKey) ?? '0') + 1;
        localStorage.setItem(surveyCountKey, String(count));
        if (count >= 2) {
          localStorage.setItem(surveyShownKey, '1');
          setSurveyResultId(rId);
          setTimeout(() => setShowSurvey(true), 1200);
        }
      }

      // Fetch updated history to detect new badges
      const token = await getToken().catch(() => null);
      if (token) {
        const [hist, dash] = await Promise.all([
          api.progress.history(user.id, token).catch(() => ({ history: [] })),
          api.progress.dashboard(user.id, token).catch(() => null),
        ]);
        const newly = getNewlyUnlocked(prevIds, hist.history, dash);
        if (newly.length > 0) {
          const allIds = [...new Set([...prevIds, ...newly.map(b => b.id)])];
          saveBadgeIds(allIds);
          setNewBadges(newly);
        }
      }
    }

    setScores(finalScores);
    setDone(true);
    setMood('celebrate');
    // Effacer le brouillon après complétion
    if (meta.isWritten && user) {
      try { localStorage.removeItem(`reussirtcf_draft_${sectionCode}_${user.id}`); } catch {}
    }
  }

  // ── CO/CE ──────────────────────────────────────────────────────
  function selectAnswer(optKey: string) {
    setAnswers(prev => ({ ...prev, [currentQ]: optKey }));
  }

  async function submitExam() {
    const finalScores = questions.map((q, i) => answers[i] === q.answer ? 100 : 0);
    if (sectionCode === 'CE' && selectedCeSerieId !== null && user) {
      try {
        const correct = finalScores.filter(s => s === 100).length;
        const updated = { ...ceSerieScores, [selectedCeSerieId]: { correct, total: questions.length, completedAt: new Date().toISOString() } };
        localStorage.setItem(`reussirtcf_ce_scores_${user.id}`, JSON.stringify(updated));
        setCeSerieScores(updated);
      } catch {}
    }
    if (sectionCode === 'CO' && selectedCoSerieId !== null && user) {
      try {
        const correct = finalScores.filter(s => s === 100).length;
        const updated = { ...coSerieScores, [selectedCoSerieId]: { correct, total: questions.length, completedAt: new Date().toISOString() } };
        localStorage.setItem(`reussirtcf_co_scores_${user.id}`, JSON.stringify(updated));
        setCoSerieScores(updated);
      } catch {}
    }
    await finishSession(finalScores);
  }

  // ── EE/EO ──────────────────────────────────────────────────────
  const task = session?.tasks[currentTask];

  function updateAnswer(val: string) {
    setTaskAnswers(prev => { const n = [...prev]; n[currentTask] = val; return n; });
  }

  async function handleCorrectWithSophie() {
    if (!task || !taskAnswers[currentTask].trim()) return;
    setCorrecting(true); setMood('thinking'); setCorrectionError(null);
    try {
      const token = await getToken();
      const res = await api.ai.correct({ text: taskAnswers[currentTask], section: sectionCode, prompt: task.question }, token ?? undefined);
      setTaskCorrections(prev => { const n = [...prev]; n[currentTask] = res; return n; });
      setMood(res.score >= 70 ? 'celebrate' : res.score >= 50 ? 'happy' : 'encourage');
    } catch (err: unknown) {
      setMood('encourage');
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('abonnés') || msg.includes('abonnement') || msg.includes('PLAN_REQUIRED')) {
        setCorrectionError('plan_required');
      } else if (msg.includes('Bronze') || msg.includes('BRONZE_EE_ONLY')) {
        setCorrectionError('Le plan Bronze inclut la correction IA pour l\'Expression Écrite uniquement. Passez à Silver pour toutes les sections.');
      } else if (msg.includes('Limite') || msg.includes('limite')) {
        setCorrectionError('Limite atteinte (5 corrections/min). Patientez 1 minute avant de réessayer.');
      } else if (msg.includes('Token') || msg.includes('token') || msg.includes('manquant') || msg.includes('autoris')) {
        setCorrectionError('session_expired');
      } else {
        setCorrectionError('Sophie est indisponible pour le moment. Réessaie dans quelques instants.');
      }
    }
    finally { setCorrecting(false); }
  }

  async function handleSubmitToProf() {
    if (!task || !taskAnswers[currentTask].trim() || !user) return;
    setSubmitting(true);
    try {
      const token = await getToken();
      await api.submissions.submit({ studentId: user.id, classId: selectedClassId || undefined, section: sectionCode as 'EE' | 'EO', question: task.question, answer: taskAnswers[currentTask] }, token ?? undefined);
      setTaskSubmitted(prev => { const n = [...prev]; n[currentTask] = true; return n; });
      setMood('happy');
    } catch {} finally { setSubmitting(false); }
  }

  async function handleTaskNext() {
    const correction = taskCorrections[currentTask];
    const taskScore = taskSubmitted[currentTask] ? 50 : correction ? correction.score : 0;
    const newScores = [...scores, taskScore];
    if (currentTask + 1 >= (session?.tasks.length ?? 0)) { await finishSession(newScores); return; }
    setScores(newScores);
    setCurrentTask(t => t + 1);
    setMood('idle');
  }

  const canAdvanceTask = taskCorrections[currentTask] !== null || taskSubmitted[currentTask];
  const answeredCount = Object.keys(answers).length;
  const isUrgent = timeLeft > 0 && timeLeft <= 300;

  // ── Modal de confirmation de sortie (JSX inline — évite le re-mount sur chaque render) ───
  const quitModalJSX = (
    <AnimatePresence>
      {showQuitModal && (
        <motion.div
          key="quit-modal"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={() => setShowQuitModal(false)}
        >
          <motion.div
            initial={{ scale: 0.92, opacity: 0, y: 16 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.92, opacity: 0, y: 16 }}
            transition={{ type: 'spring', stiffness: 380, damping: 30 }}
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <span className="text-red-500 text-lg">⚠️</span>
              </div>
              <h2 className="text-slate-900 font-black text-lg leading-tight">
                Quitter l&apos;examen ?
              </h2>
            </div>
            <p className="text-slate-500 text-sm mb-6 leading-relaxed">
              Votre progression ne sera pas sauvegardée. Vous devrez recommencer l&apos;examen depuis le début.
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setShowQuitModal(false)}
                className="w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-sm transition-all"
              >
                Continuer l&apos;examen
              </button>
              <button
                onClick={() => { setShowQuitModal(false); exitSession(); }}
                className="w-full py-3 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 font-bold text-sm transition-all"
              >
                Quitter
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  // ── Header exam (phase session) ────────────────────────────────
  const ExamHeader = () => (
    <div className="sticky top-0 z-40 shadow-sm">
      <div className="flex h-1 w-full"><div className="w-1/4 bg-red-600" /><div className="w-1/2 bg-white" /><div className="w-1/4 bg-red-600" /></div>
      <div className="bg-white border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex items-center gap-3">
        <button onClick={() => setShowQuitModal(true)}
          className="text-slate-500 hover:text-red-600 transition-colors text-sm flex-shrink-0 flex items-center gap-1 font-medium">
          ← <span className="hidden sm:inline">Séries</span>
        </button>
        <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0`}>
          <span>{meta.icon}</span>
          <span className="hidden sm:inline">{sectionCode} · {meta.label}</span>
          <span className="sm:hidden">{sectionCode}</span>
        </div>
        <div className="flex-1" />
        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-mono font-black text-base transition-all
          ${isUrgent
            ? 'bg-red-600 text-white border-2 border-red-700 shadow-lg shadow-red-200 animate-pulse'
            : 'bg-slate-100 text-slate-700'}`}>
          ⏱ {formatTime(timeLeft)}
        </div>
        <button onClick={() => setShowQuitModal(true)}
          className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-lg transition-all border border-red-200">
          Quitter l&apos;examen
        </button>
      </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // OVERVIEW
  // ════════════════════════════════════════════════════════════
  if (phase === 'overview' && isFormationCombo) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-slate-500">
          <div className={`w-10 h-10 border-4 border-t-transparent rounded-full animate-spin ${sectionCode === 'EO' ? 'border-rose-500' : 'border-emerald-500'}`} />
          <p className="text-sm font-bold">Chargement de la série…</p>
        </div>
      </div>
    );
  }

  if (phase === 'overview') {
    const cardLabel = sectionCode === 'EO' ? 'Session' : meta.isWritten ? 'Combinaison' : 'Série';
    const cardDesc = sectionCode === 'EO' ? `3 tâches aléatoires · 12 min` : meta.isWritten ? `${overview.questionsCount} tâches · ${overview.duration}` : `${overview.questionsCount} questions · ${overview.duration}`;
    const tasks = sectionCode === 'EE' ? EE_TASKS : sectionCode === 'EO' ? EO_TASKS : null;

    return (
      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-40 shadow-sm">
          <div className="flex h-1 w-full"><div className="w-1/4 bg-red-600" /><div className="w-1/2 bg-white" /><div className="w-1/4 bg-red-600" /></div>
          <div className="bg-white/95 backdrop-blur border-b border-slate-100">
            <div className="max-w-4xl mx-auto px-3 sm:px-6 py-3 flex items-center gap-2 sm:gap-4">
              <button onClick={() => router.push('/dashboard')}
                className="text-slate-400 hover:text-red-600 transition-colors text-sm flex-shrink-0 flex items-center gap-1">
                ← <span className="hidden sm:inline">Tableau de bord</span>
              </button>
              <div className={`px-2 sm:px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1`}>
                <span>{meta.icon}</span><span className="hidden sm:inline">{sectionCode} · {meta.label}</span><span className="sm:hidden">{sectionCode}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${meta.gradient} border-b border-slate-100`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-0">
            <div className="flex items-center gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-3xl shadow-lg flex-shrink-0`}>{meta.icon}</div>
              <div>
                <div className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">TCF Canada · Section</div>
                <h1 className="text-2xl sm:text-4xl font-black text-slate-900">{meta.label}</h1>
              </div>
            </div>
            <p className="text-slate-600 text-base max-w-2xl leading-relaxed mb-6">{overview.description}</p>
            <div className="flex flex-wrap gap-3 mb-5">
              {[{ label: 'Durée', value: overview.duration, icon: '⏱️' }, { label: overview.questionsLabel, value: overview.questionsCount, icon: '📝' }, { label: 'Mode', value: meta.isWritten ? 'Rédaction' : 'QCM', icon: '📋' }, { label: overview.unit, value: overview.maxScore, icon: '🏆' }].map(s => (
                <div key={s.label} className="bg-white/80 backdrop-blur border border-white/60 rounded-xl px-4 py-2.5 flex items-center gap-2.5 shadow-sm">
                  <span className="text-base">{s.icon}</span>
                  <div><div className="text-sm font-black text-slate-800">{s.value}</div><div className="text-xs text-slate-500">{s.label}</div></div>
                </div>
              ))}
            </div>

            {/* Bouton Sessions d'entraînement dans l'entête */}
            <div className="flex flex-wrap gap-3 mb-6">
              {sectionCode !== 'CE' && sectionCode !== 'EE' && sectionCode !== 'EO' && (
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => setPhase('sessions')}
                className={`inline-flex items-center gap-2.5 bg-gradient-to-r ${meta.color} text-white font-black px-6 py-3 rounded-2xl shadow-md text-sm`}
              >
                {meta.icon} Sessions d&apos;entraînement
                <span className="text-white/70 text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">
                  {`${overview.totalSeries} série${overview.totalSeries > 1 ? 's' : ''}`}
                </span>
              </motion.button>
              )}
              {sectionCode === 'EE' && (
                <Link href="/formation"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-black px-5 py-3 rounded-2xl shadow-md hover:shadow-lg hover:from-emerald-400 hover:to-teal-500 transition-all text-sm">
                  ✍️ Passer les épreuves officielles
                  <span className="text-white/70 text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">50 épreuves</span>
                </Link>
              )}
              {sectionCode === 'EO' && (
                <Link href="/formation-eo"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-rose-500 to-pink-600 text-white font-black px-5 py-3 rounded-2xl shadow-md hover:shadow-lg hover:from-rose-400 hover:to-pink-500 transition-all text-sm">
                  🎤 Passer les épreuves officielles
                  <span className="text-white/70 text-xs font-normal bg-white/20 px-2 py-0.5 rounded-full">50 épreuves</span>
                </Link>
              )}
            </div>

            <div className="flex gap-0 border-b border-slate-200/50">
              {([
                { key: 'methodologie', label: sectionCode === 'CE' ? 'Épreuves d\'actualité' : 'Méthodologie et Astuces' },
                ...(sectionCode === 'EO' || sectionCode === 'EE' ? [{ key: 'banque', label: 'Épreuves d\'actualité' }] : []),
                { key: 'dashboard', label: 'Tableau de bord' },
              ] as { key: string; label: string }[]).map(tab => (
                <button key={tab.key} onClick={() => setActiveTab(tab.key as 'methodologie' | 'banque' | 'dashboard')}
                  className={`text-xs sm:text-sm font-bold px-3 sm:px-5 py-3 border-b-2 transition-all whitespace-nowrap
                    ${activeTab === tab.key ? 'border-red-600 text-red-700 bg-white/30' : 'border-transparent text-slate-600 hover:text-slate-800 hover:border-slate-300'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Tableau de bord */}
        {activeTab === 'dashboard' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-8">
            <div>
              <h2 className="text-xl font-black text-slate-900">Tableau de bord — {meta.label}</h2>
              <p className="text-slate-500 text-sm mt-1">Ta progression sur la section {sectionCode}</p>
            </div>

            {dashLoading && <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>}

            {dashLoaded && dashData && (() => {
              // Estimation NCLC à partir du score moyen en %
              const estimateNclc = (score: number | null): { nclc: string; label: string; color: string } => {
                if (score === null) return { nclc: '—', label: 'Pas encore de données', color: 'text-slate-400' };
                if (score >= 92) return { nclc: '10+', label: 'Excellent · Entrée Express toutes catégories', color: 'text-emerald-600' };
                if (score >= 84) return { nclc: '9', label: 'Très bon · Éligible Entrée Express FSW', color: 'text-emerald-500' };
                if (score >= 76) return { nclc: '8', label: 'Bon · Répond à la plupart des exigences', color: 'text-teal-600' };
                if (score >= 68) return { nclc: '7', label: 'Suffisant · Seuil Entrée Express FSW', color: 'text-red-600' };
                if (score >= 60) return { nclc: '6', label: 'En progression · Encore quelques mois', color: 'text-amber-600' };
                if (score >= 50) return { nclc: '5', label: 'Intermédiaire · Continue à pratiquer', color: 'text-orange-500' };
                return { nclc: '4', label: 'Débutant · Intensifie ta pratique', color: 'text-red-500' };
              };
              const nclcEst = estimateNclc(dashData.avgScore);

              // Sparkline SVG sur les 15 dernières sessions
              const SparkLine = ({ scores }: { scores: number[] }) => {
                if (scores.length < 2) return null;
                const W = 280; const H = 60; const PAD = 6;
                const min = 0; const max = 100;
                const xStep = (W - PAD * 2) / (scores.length - 1);
                const yScale = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2);
                const pts = scores.map((s, i) => `${PAD + i * xStep},${yScale(s)}`).join(' ');
                const last = scores[scores.length - 1];
                const lx = PAD + (scores.length - 1) * xStep;
                const ly = yScale(last);
                return (
                  <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-14" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity="0.15" />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    {/* Zone remplie */}
                    <polygon points={`${PAD},${H} ${pts} ${lx},${H}`} fill="url(#spark-fill)" />
                    {/* Ligne */}
                    <polyline points={pts} fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    {/* Point dernier */}
                    <circle cx={lx} cy={ly} r="4" fill="#6366f1" />
                    {/* Ligne objectif B2 */}
                    <line x1={PAD} y1={yScale(70)} x2={W - PAD} y2={yScale(70)} stroke="#e0e7ff" strokeWidth="1.5" strokeDasharray="4 3" />
                  </svg>
                );
              };

              const recentScores = dashData.history.slice(0, 15).reverse().map(h => h.score);

              return (
              <>
                {/* Stat cards */}
                <div className="grid grid-cols-3 gap-3 sm:gap-4">
                  {[
                    { label: 'Sessions', value: dashData.attempts, icon: '🎯', color: 'from-red-500 to-rose-500' },
                    { label: 'Score moyen', value: dashData.avgScore !== null ? `${dashData.avgScore}%` : '—', icon: '📊', color: 'from-emerald-500 to-teal-500' },
                    { label: 'Meilleur', value: dashData.bestScore !== null ? `${dashData.bestScore}%` : '—', icon: '🏆', color: `${meta.color}` },
                  ].map(s => (
                    <div key={s.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 text-center">
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-lg mx-auto mb-2`}>{s.icon}</div>
                      <div className="text-xl font-black text-slate-900">{s.value}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Estimation NCLC */}
                {dashData.avgScore !== null && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Niveau NCLC estimé</div>
                        <div className={`text-3xl font-black ${nclcEst.color}`}>NCLC {nclcEst.nclc}</div>
                        <div className={`text-xs mt-1 font-semibold ${nclcEst.color}`}>{nclcEst.label}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-slate-400 mb-1">Seuil Entrée Express FSW</div>
                        <div className="text-sm font-black text-red-600">NCLC 7 requis</div>
                        <div className="text-xs text-slate-400 mt-0.5">≥ 68% sur cette plateforme</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Sparkline + barre objectif */}
                {dashData.avgScore !== null && (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-black text-slate-800">Courbe de progression</div>
                      <div className="text-xs font-bold text-red-600">{dashData.avgScore}% · objectif 70%</div>
                    </div>
                    {recentScores.length >= 2
                      ? <SparkLine scores={recentScores} />
                      : <div className="text-xs text-slate-400 py-4 text-center">Au moins 2 sessions pour afficher la courbe.</div>
                    }
                    <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden mt-3">
                      <div
                        className={`h-2.5 bg-gradient-to-r ${meta.color} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min(100, (dashData.avgScore / 70) * 100)}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-slate-400 mt-1">
                      <span>0%</span><span className="text-red-500 font-bold">Objectif B2 : 70%</span><span>100%</span>
                    </div>
                  </div>
                )}

                {/* Historique des sessions */}
                {dashData.history.length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
                    <div className="text-4xl mb-3">📭</div>
                    <div className="font-black text-slate-700">Aucune session {sectionCode} complétée</div>
                    <p className="text-slate-500 text-sm mt-1">Lance ta première session pour voir ta progression ici.</p>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedSerie(1); setPhase('preview'); }}
                      className={`mt-5 inline-flex items-center gap-2 bg-gradient-to-r ${meta.color} text-white font-black px-6 py-3 rounded-2xl shadow text-sm`}>
                      {meta.icon} Lancer une session
                    </motion.button>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="font-black text-slate-800 text-sm">Historique des sessions {sectionCode}</div>
                      <div className="text-xs text-slate-400">{dashData.history.length} session{dashData.history.length > 1 ? 's' : ''}</div>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {dashData.history.slice(0, 10).map((h, i) => {
                        const date = new Date(h.createdAt);
                        const mins = Math.floor(h.durationS / 60);
                        const secs = h.durationS % 60;
                        const scoreColor = h.score >= 70 ? 'text-emerald-600' : h.score >= 50 ? 'text-amber-600' : 'text-red-500';
                        return (
                          <div key={h.id} className="flex items-center gap-4 px-5 py-3.5">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold text-slate-800">Session {sectionCode}</div>
                              <div className="text-xs text-slate-400">
                                {date.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short', year: 'numeric' })} · {mins}m{secs.toString().padStart(2, '0')}s
                              </div>
                            </div>
                            <div className={`text-lg font-black ${scoreColor}`}>{h.score}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-center">
                      <button onClick={() => router.push('/dashboard')} className="text-xs font-bold text-red-600 hover:text-red-800 transition-colors">
                        Voir le dashboard complet →
                      </button>
                    </div>
                  </div>
                )}
              </>
              );
            })()}

            {dashLoaded && dashData?.attempts === 0 && !dashLoading && dashData.history.length === 0 && (
              <div className="text-center py-10">
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={() => { setSelectedSerie(1); setPhase('preview'); }}
                  className={`inline-flex items-center gap-2 bg-gradient-to-r ${meta.color} text-white font-black px-7 py-4 rounded-2xl shadow-lg`}>
                  {meta.icon} Lancer ma première session
                </motion.button>
              </div>
            )}
          </div>
        )}

        {/* Tab Épreuves d'actualité */}
        {activeTab === 'banque' && (
          <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-4">
            {/* Paywall pour utilisateurs gratuits */}
            {!isPaid ? (
              <div className="flex flex-col items-center justify-center py-16 gap-6 text-center">
                <div className={`w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-3xl shadow-xl`}>
                  🔒
                </div>
                <div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Épreuves d&apos;actualité {sectionCode}</h2>
                  <p className="text-slate-500 text-sm max-w-sm mx-auto">
                    La banque complète d&apos;épreuves organisées par tâche et par thème est réservée aux abonnés.
                  </p>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 max-w-xs w-full space-y-2 text-left">
                  <div className="text-xs font-bold text-slate-500 mb-3">Inclus avec l&apos;abonnement :</div>
                  {[
                    '✓ Toutes les épreuves par tâche (T1, T2, T3)',
                    '✓ Filtrage par thème',
                    '✓ Correction IA instantanée par Sophie',
                    '✓ Accès illimité à toutes les sections',
                  ].map((f, i) => (
                    <div key={i} className="text-sm text-slate-600">{f}</div>
                  ))}
                </div>
                <a href="/pricing"
                  className={`inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-white text-sm shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all bg-gradient-to-r ${meta.color}`}>
                  Voir les abonnements →
                </a>
                <p className="text-xs text-slate-400">Commencez par les 2 épreuves gratuites sur la page Formation</p>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">Épreuves d&apos;actualité {sectionCode}</h2>
                <p className="text-slate-500 text-sm mt-0.5">Questions organisées par tâche · filtrables par thème</p>
              </div>
              {bankLoaded && (
                <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full font-bold">
                  {Object.values(bankTasks).flat().length} questions
                </div>
              )}
            </div>

            {bankLoading && (
              <div className="flex items-center justify-center py-16"><Spinner size={32} /></div>
            )}
            {bankLoaded && Object.keys(bankTasks).length === 0 && (
              <div className="text-center py-16 text-slate-400">Aucune question dans la banque pour l&apos;instant.</div>
            )}

            {bankLoaded && (() => {
              const TASK_META = sectionCode === 'EO'
                ? { 1: { label: 'Tâche 1 — Présentation personnelle', color: 'from-sky-500 to-cyan-500', icon: '👤', hint: 'Présentez-vous naturellement : nom, parcours, famille, loisirs, projet au Canada. 1 à 2 minutes.' },
                    2: { label: 'Tâche 2 — Interaction situationnelle', color: 'from-violet-500 to-purple-500', icon: '🗣', hint: 'Entrez dans la situation comme si elle était réelle. Posez des questions pertinentes et réagissez naturellement.' },
                    3: { label: 'Tâche 3 — Expression d\'un point de vue', color: 'from-rose-500 to-pink-500', icon: '💭', hint: 'Donnez votre avis clairement (pour/contre), illustrez avec 2 arguments concrets et une conclusion personnelle.' } }
                : { 1: { label: 'Tâche 1', color: 'from-red-500 to-rose-500', icon: '📝', hint: '' },
                    2: { label: 'Tâche 2', color: 'from-emerald-500 to-teal-500', icon: '📝', hint: '' },
                    3: { label: 'Tâche 3', color: 'from-amber-500 to-orange-500', icon: '📝', hint: '' } };

              return [1, 2, 3].map(taskNum => {
                const allQs = bankTasks[taskNum] ?? [];
                if (allQs.length === 0) return null;
                const tm = TASK_META[taskNum as 1 | 2 | 3];
                const isTaskOpen = !!bankTaskOpen[taskNum];
                const activeTheme = bankThemeFilter[taskNum] ?? null;
                const currentPage = bankPage[taskNum] ?? 0;

                // Thèmes uniques pour ce task
                const themes = Array.from(new Set(allQs.map(q => q.theme).filter(Boolean) as string[])).sort();

                // Questions filtrées
                const filtered = activeTheme ? allQs.filter(q => q.theme === activeTheme) : allQs;
                const totalPages = Math.ceil(filtered.length / BANK_PAGE_SIZE);
                const pageQs = filtered.slice(currentPage * BANK_PAGE_SIZE, (currentPage + 1) * BANK_PAGE_SIZE);

                return (
                  <div key={taskNum} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header cliquable */}
                    <button
                      onClick={() => setBankTaskOpen(prev => ({ ...prev, [taskNum]: !prev[taskNum] }))}
                      className={`w-full bg-gradient-to-r ${tm.color} px-5 py-4 flex items-center gap-3 text-left`}
                    >
                      <span className="text-2xl">{tm.icon}</span>
                      <div className="flex-1">
                        <div className="font-black text-white text-base">{tm.label}</div>
                        <div className="text-white/70 text-xs">{allQs.length} question{allQs.length > 1 ? 's' : ''} · {themes.length} thème{themes.length > 1 ? 's' : ''}</div>
                      </div>
                      <span className={`text-white/80 text-lg transition-transform duration-200 ${isTaskOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isTaskOpen && (
                      <>
                        {/* Filtres par thème (seulement si plusieurs thèmes) */}
                        {themes.length > 1 && (
                          <div className="px-5 py-3 border-b border-slate-100 flex flex-wrap gap-2">
                            <button
                              onClick={() => { setBankThemeFilter(prev => ({ ...prev, [taskNum]: null })); setBankPage(prev => ({ ...prev, [taskNum]: 0 })); }}
                              className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all ${!activeTheme ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
                            >
                              Tous ({allQs.length})
                            </button>
                            {themes.map(t => (
                              <button key={t}
                                onClick={() => { setBankThemeFilter(prev => ({ ...prev, [taskNum]: t })); setBankPage(prev => ({ ...prev, [taskNum]: 0 })); }}
                                className={`text-xs font-bold px-3 py-1.5 rounded-full border transition-all capitalize ${activeTheme === t ? 'bg-red-600 text-white border-red-600' : 'bg-white text-slate-600 border-slate-200 hover:border-red-300 hover:text-red-600'}`}
                              >
                                {t} ({allQs.filter(q => q.theme === t).length})
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Info résultats filtrés */}
                        {activeTheme && (
                          <div className="px-5 py-2 bg-red-50 border-b border-red-100 text-xs text-red-700 font-semibold">
                            {filtered.length} question{filtered.length > 1 ? 's' : ''} — thème &laquo; {activeTheme} &raquo;
                          </div>
                        )}

                        {/* Liste des questions */}
                        <div className="divide-y divide-slate-100">
                          {pageQs.map((q, idx) => {
                            const isOpen = !!bankOpen[q.id];
                            const globalIdx = currentPage * BANK_PAGE_SIZE + idx + 1;
                            return (
                              <div key={q.id}>
                                <button
                                  onClick={() => setBankOpen(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                                  className="w-full flex items-start gap-3 px-5 py-4 text-left hover:bg-slate-50 transition-colors group"
                                >
                                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-black flex items-center justify-center mt-0.5 group-hover:bg-red-100 group-hover:text-red-600 transition-colors">{globalIdx}</span>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-slate-800 text-sm font-medium leading-snug line-clamp-2">
                                      {taskNum === 3
                                        ? (() => { const { sujet } = parseT3(q.question); return sujet || q.question.slice(0, 120) + (q.question.length > 120 ? '…' : ''); })()
                                        : q.question}
                                    </p>
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                      {q.theme && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full capitalize">🏷 {q.theme}</span>}
                                      {q.timeLimitMin && <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">⏱ {q.timeLimitMin} min</span>}
                                    </div>
                                  </div>
                                  <span className={`flex-shrink-0 text-slate-300 group-hover:text-slate-500 transition-all duration-200 ${isOpen ? 'rotate-180' : ''} mt-1`}>▾</span>
                                </button>
                                {isOpen && (
                                  <div className="px-5 pb-5 pt-2 bg-slate-50 border-t border-slate-100">
                                    {q.theme && (
                                      <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
                                        <span className="font-bold">Thème :</span>
                                        <span className="capitalize bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">{q.theme}</span>
                                        {q.timeLimitMin && <span className="bg-white border border-slate-200 px-2.5 py-0.5 rounded-full">⏱ {q.timeLimitMin} min</span>}
                                      </div>
                                    )}

                                    {/* Rendu T3 : Document 1 / Document 2 */}
                                    {taskNum === 3 && (() => {
                                      const { sujet, docs } = parseT3(q.question);
                                      return (
                                        <div className="space-y-2 mb-3">
                                          {sujet && (
                                            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3">
                                              <p className="text-xs font-black text-violet-700 uppercase tracking-wider mb-1">📋 Sujet</p>
                                              <p className="text-sm font-bold text-slate-800 leading-snug">{sujet}</p>
                                            </div>
                                          )}
                                          {docs.length >= 2 ? (
                                            <>
                                              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3">
                                                <p className="text-xs font-black text-sky-700 uppercase tracking-wider mb-1">🔵 Document 1 — Argument POUR</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{docs[0]}</p>
                                              </div>
                                              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                                                <p className="text-xs font-black text-orange-700 uppercase tracking-wider mb-1">🟠 Document 2 — Argument CONTRE</p>
                                                <p className="text-sm text-slate-700 leading-relaxed">{docs[1]}</p>
                                              </div>
                                            </>
                                          ) : (
                                            <div className="bg-white border border-slate-200 rounded-xl p-3">
                                              <p className="text-sm text-slate-700 whitespace-pre-line">{q.question}</p>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {tm.hint && (
                                      <div className={`p-3 rounded-xl border text-xs mb-3 ${
                                        taskNum === 1 ? 'bg-sky-50 border-sky-200 text-sky-700' :
                                        taskNum === 2 ? 'bg-violet-50 border-violet-200 text-violet-700' :
                                        'bg-amber-50 border-amber-200 text-amber-700'
                                      }`}>
                                        <span className="font-bold block mb-0.5">Comment répondre</span>
                                        {tm.hint}
                                      </div>
                                    )}

                                    {/* Bouton correction Sophie */}
                                    {!bankCorrections[q.id] && (
                                      <button
                                        onClick={() => handleEoCorrection(q)}
                                        disabled={!!bankCorrectionLoading[q.id]}
                                        className="flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-500 text-white shadow hover:shadow-md transition-all disabled:opacity-60"
                                      >
                                        {bankCorrectionLoading[q.id]
                                          ? <><Spinner size={14} color="#fff" /> Sophie génère la correction…</>
                                          : <><span>✨</span> Correction Sophie</>}
                                      </button>
                                    )}

                                    {/* Correction générée */}
                                    {bankCorrections[q.id] && (
                                      <div className="mt-1 bg-white border border-red-100 rounded-2xl overflow-hidden shadow-sm">
                                        <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-red-50 to-slate-50 border-b border-red-100">
                                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-rose-500 flex items-center justify-center text-white text-xs font-black flex-shrink-0">S</div>
                                          <span className="text-xs font-black text-red-700">Sophie · Correction IA</span>
                                          <button
                                            onClick={() => setBankCorrections(prev => { const n = { ...prev }; delete n[q.id]; return n; })}
                                            className="ml-auto text-slate-400 hover:text-slate-600 text-xs transition-colors"
                                          >✕</button>
                                        </div>
                                        <div className="px-4 py-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap max-h-72 sm:max-h-none overflow-y-auto">
                                          {bankCorrections[q.id]}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                            <button
                              onClick={() => setBankPage(prev => ({ ...prev, [taskNum]: Math.max(0, currentPage - 1) }))}
                              disabled={currentPage === 0}
                              className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              ← Précédent
                            </button>
                            <div className="text-xs text-slate-500">
                              Page <span className="font-black text-slate-800">{currentPage + 1}</span> / {totalPages}
                              <span className="ml-2 text-slate-400">({filtered.length} question{filtered.length > 1 ? 's' : ''})</span>
                            </div>
                            <button
                              onClick={() => setBankPage(prev => ({ ...prev, [taskNum]: Math.min(totalPages - 1, currentPage + 1) }))}
                              disabled={currentPage >= totalPages - 1}
                              className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-200 text-slate-600 hover:border-slate-400 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                            >
                              Suivant →
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              });
            })()}
            </>
            )}
          </div>
        )}

        {/* Tab Méthodologie */}
        {activeTab === 'methodologie' && (
          <>
            {meta.isWritten && sectionCode !== 'EE' && sectionCode !== 'EO' && (
              <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-10">
                <div className={`bg-gradient-to-r ${meta.color} rounded-2xl p-6 sm:p-8 text-white relative overflow-hidden`}>
                  <div className="absolute top-3 right-4 text-xs font-black bg-white/20 px-3 py-1 rounded-full">SIMULATEUR UNIQUE</div>
                  <h3 className="text-xl sm:text-2xl font-black mb-2">Simulateur d&apos;Expression Orale</h3>
                  <p className="text-white/80 text-sm max-w-xl mb-6">Timer intégré · {overview.questionsCount} tâches complètes · Correction IA instantanée</p>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => setPhase('sessions')} className="bg-white text-slate-900 font-black px-6 py-3 rounded-xl shadow text-sm">
                    Lancer le Simulateur {meta.icon}
                  </motion.button>
                </div>
              </div>
            )}

            <div className={`${meta.isWritten ? '' : 'border-t border-slate-100'} py-12`}>
              <div className="max-w-4xl mx-auto px-4 sm:px-6">
                {!meta.isWritten && sectionCode !== 'CE' && (
                  <>
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-2xl font-black text-slate-900">{overview.totalSeries} Séries d&apos;Entraînement</h2>
                      <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />{overview.freeSeriesCount} séries gratuites
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 mb-12">
                      {Array.from({ length: overview.totalSeries }, (_, i) => i + 1).map(num => (
                        <SerieCard key={num} num={num} isFree={num <= overview.freeSeriesCount} isFirst={num === 1} isPaid={isPaid} color={meta.color} onStart={(n) => { setSelectedSerie(n); setPhase('preview'); }} cardLabel={cardLabel} cardDesc={cardDesc} />
                      ))}
                    </div>
                  </>
                )}

                {/* ── CE : Épreuves d'actualité (50 séries, 2 gratuites) ── */}
                {sectionCode === 'CE' && (
                  <div className="mb-12">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h2 className="text-2xl font-black text-slate-900">50 Épreuves d&apos;actualité</h2>
                        <p className="text-slate-500 text-sm mt-0.5">2 épreuves gratuites · accès illimité avec abonnement</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 flex-shrink-0">
                        <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />2 gratuites
                      </div>
                    </div>

                    {ceFormationLoading ? (
                      <div className="flex justify-center py-12">
                        <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                      </div>
                    ) : ceFormationSeries.length === 0 ? (
                      <div className="text-center py-10 text-slate-400 space-y-2">
                        <div className="text-4xl">📖</div>
                        <p className="font-medium">Épreuves bientôt disponibles</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-5 gap-2.5">
                        {ceFormationSeries.map((serie, idx) => {
                          const isFree = serie.id <= overview.freeSeriesCount;
                          const canAccess = isFree || isPaid;
                          const score = ceSerieScores[serie.id];
                          // Conversion en points TCF /699
                          const pts699 = score ? Math.round((score.correct / score.total) * 699) : null;
                          const lvlFromPts = pts699 === null ? null
                            : pts699 >= 600 ? 'C2'
                            : pts699 >= 500 ? 'C1'
                            : pts699 >= 400 ? 'B2'
                            : pts699 >= 300 ? 'B1'
                            : pts699 >= 200 ? 'A2' : 'A1';
                          const lvlStyle = lvlFromPts === null ? null
                            : (lvlFromPts === 'A1' || lvlFromPts === 'A2')
                              ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', score: 'text-emerald-600', bar: 'bg-emerald-500' }
                            : lvlFromPts === 'B1'
                              ? { bg: 'bg-sky-50',    border: 'border-sky-200',    text: 'text-sky-700',    score: 'text-sky-600',    bar: 'bg-sky-500' }
                            : lvlFromPts === 'B2'
                              ? { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   score: 'text-blue-600',   bar: 'bg-blue-500' }
                            : lvlFromPts === 'C1'
                              ? { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-700', score: 'text-violet-600', bar: 'bg-violet-500' }
                              : { bg: 'bg-rose-50',   border: 'border-rose-200',   text: 'text-rose-700',   score: 'text-rose-600',   bar: 'bg-rose-500' };

                          return (
                            <motion.div
                              key={serie.id}
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ delay: Math.min(idx * 0.005, 0.2) }}
                              className={`group relative flex flex-col bg-white border-2 rounded-2xl p-3 min-h-[108px] transition-all ${
                                score && canAccess && lvlStyle
                                  ? `${lvlStyle.border} hover:shadow-md cursor-pointer`
                                  : canAccess
                                    ? 'border-slate-200 hover:border-violet-300 hover:shadow-md cursor-pointer'
                                    : 'border-slate-100'
                              }`}
                              onClick={canAccess ? () => { setPendingCeSerie(serie); setPhase('preview'); } : undefined}>

                              {/* Badge FREE */}
                              {isFree && (
                                <span className="absolute top-2 right-2 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-700 border border-emerald-200 leading-none">
                                  FREE
                                </span>
                              )}

                              {score && canAccess ? (
                                /* ── Épreuve déjà faite ── */
                                <>
                                  {/* Numéro petit + série */}
                                  <div className="flex items-center gap-1.5 mb-2">
                                    <span className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 flex-shrink-0">
                                      {serie.id}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-medium leading-none">Série</span>
                                  </div>
                                  {/* Niveau CECR */}
                                  <span className={`self-start text-xs font-black px-2 py-0.5 rounded-md border mb-auto ${lvlStyle!.bg} ${lvlStyle!.border} ${lvlStyle!.text}`}>
                                    {lvlFromPts}
                                  </span>
                                  {/* Score /699 */}
                                  <div className="mt-2">
                                    <div className="w-full bg-slate-100 rounded-full h-1 mb-1">
                                      <div className={`h-1 rounded-full ${lvlStyle!.bar}`} style={{ width: `${Math.round((pts699! / 699) * 100)}%` }} />
                                    </div>
                                    <span className={`text-[11px] font-black tabular-nums ${lvlStyle!.score}`}>
                                      {pts699}<span className="text-slate-300 font-normal text-[10px]"> / 699</span>
                                    </span>
                                  </div>
                                </>
                              ) : canAccess ? (
                                /* ── Épreuve non commencée ── */
                                <>
                                  <span className="text-2xl mb-1.5 leading-none">📖</span>
                                  <span className="text-[11px] font-black text-slate-700 leading-tight mb-0.5">
                                    Épreuve {serie.id}
                                  </span>
                                  <span className="text-[10px] text-slate-400">39 questions</span>
                                  <span className="mt-auto text-[10px] font-bold text-violet-500 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                                    Commencer →
                                  </span>
                                </>
                              ) : (
                                /* ── Premium verrouillé ── */
                                <>
                                  <span className="text-2xl mb-1.5 leading-none opacity-30">📖</span>
                                  <span className="text-[11px] font-black text-slate-300 leading-tight mb-0.5">
                                    Épreuve {serie.id}
                                  </span>
                                  <span className="text-[10px] text-slate-300">39 questions</span>
                                  <button
                                    onClick={e => { e.stopPropagation(); router.push('/pricing'); }}
                                    className="mt-auto w-full text-[9px] font-black py-1.5 rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-sm hover:shadow-md transition-all leading-none">
                                    🔒 S&apos;abonner
                                  </button>
                                </>
                              )}
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
                <h2 className="text-2xl font-black text-slate-900 mb-8">Ce que vous apprendrez</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {overview.learningObjectives.map((obj, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                      className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex gap-4">
                      <div className="text-2xl flex-shrink-0">{obj.icon}</div>
                      <div><div className="font-black text-slate-800 text-sm mb-1">{obj.title}</div><div className="text-xs text-slate-500 leading-relaxed">{obj.desc}</div></div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            <div className="bg-slate-50 py-12">
              <div className="max-w-4xl mx-auto px-4 sm:px-6">
                <h2 className="text-2xl font-black text-slate-900 mb-8">Structure du programme</h2>
                <div className="grid sm:grid-cols-3 gap-6">
                  {overview.programSteps.map((step, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                      className="text-center p-6 bg-white border border-slate-100 rounded-2xl shadow-sm">
                      <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${meta.color} flex items-center justify-center text-xl mx-auto mb-4 shadow`}>{step.icon}</div>
                      <div className="font-black text-slate-800 text-sm mb-2">{step.title}</div>
                      <div className="text-xs text-slate-500 leading-relaxed">{step.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>

            {tasks && (
              <div className="py-12">
                <div className="max-w-4xl mx-auto px-4 sm:px-6">
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Les 3 Tâches de l&apos;{sectionCode === 'EE' ? 'Expression Écrite' : 'Expression Orale'}</h2>
                  <p className="text-slate-500 text-sm mb-8">Découvrez en détail chaque tâche de l&apos;épreuve</p>
                  <div className="space-y-5">
                    {tasks.map((t, i) => (
                      <motion.div key={t.num} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }}
                        className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className={`bg-gradient-to-r ${t.color} px-6 py-4 flex items-center gap-4`}>
                          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-white font-black text-lg flex-shrink-0">{t.num}</div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-black text-white text-sm sm:text-base">{t.title}</h3>
                            <div className="flex flex-wrap gap-2 mt-1">
                              <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">Niveau : {t.level}</span>
                              {t.wordMin && <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">{t.wordMin}–{t.wordMax} mots</span>}
                              {t.prepMin
                                ? <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">⏱ {t.prepMin} min prépa + {t.timeMin} min 30 dialogue</span>
                                : <span className="text-xs text-white/80 bg-white/20 px-2 py-0.5 rounded-full">⏱ {t.timeMin} min{sectionCode === 'EO' && t.num === 3 ? ' 30' : ''}</span>}
                              {t.points && <span className="text-xs text-white font-black bg-white/30 px-2 py-0.5 rounded-full">🏆 {t.points}/20 pts</span>}
                            </div>
                          </div>
                        </div>
                        <div className="p-5 space-y-4">
                          <p className="text-sm text-slate-600 leading-relaxed">{t.description}</p>
                          {t.structure && (
                            <div>
                              <div className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Structure obligatoire :</div>
                              <div className="space-y-2">{t.structure.map((s, si) => (
                                <div key={si} className="bg-red-50 border border-red-100 rounded-xl p-3">
                                  <div className="text-xs font-bold text-red-700 mb-1">{s.label}</div>
                                  <p className="text-xs text-slate-600">{s.text}</p>
                                </div>
                              ))}</div>
                            </div>
                          )}
                          {t.examples.length > 0 && (
                            <div>
                              <div className="text-xs font-black text-slate-700 uppercase tracking-widest mb-2">Exemples de consignes :</div>
                              <ul className="space-y-1">{t.examples.map((ex, ei) => (
                                <li key={ei} className="text-xs text-slate-600 flex items-start gap-2">
                                  <span className="text-red-400 font-bold flex-shrink-0 mt-0.5">›</span>{ex}
                                </li>
                              ))}</ul>
                            </div>
                          )}
                          {t.exampleSubject && (
                            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
                              <div className="text-xs font-bold text-amber-700 mb-1">Exemple de sujet :</div>
                              <p className="text-xs text-slate-600">{t.exampleSubject}</p>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Contenu méthodologique détaillé EO ── */}
            {sectionCode === 'EO' && (
              <>
                {/* Principes fondamentaux */}
                <div className="py-12 border-t border-slate-100">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Principes fondamentaux</h2>
                    <p className="text-slate-500 text-sm mb-8">Les trois piliers qui guident votre performance dans toutes les tâches</p>
                    <div className="grid sm:grid-cols-3 gap-5">
                      {EO_PRINCIPES.map((p, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 mb-4 flex items-center justify-center">
                            <span className="text-white font-black text-xs">{i + 1}</span>
                          </div>
                          <h3 className="font-black text-slate-800 mb-2">{p.titre}</h3>
                          <p className="text-sm text-slate-500 leading-relaxed">{p.texte}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stratégies détaillées par tâche */}
                <div className="bg-slate-50 py-12">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Stratégies par tâche</h2>
                    <p className="text-slate-500 text-sm mb-8">Approches spécifiques pour maximiser votre performance dans chaque exercice</p>
                    <div className="space-y-8">
                      {EO_STRATEGIES.map((s, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                          {/* En-tête tâche */}
                          <div className={`bg-gradient-to-r ${s.color} px-6 py-5 text-white`}>
                            <div className="flex items-center gap-3 mb-1">
                              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-black text-sm">{s.num}</div>
                              <h3 className="font-black text-base sm:text-lg">{s.titre}</h3>
                            </div>
                            <p className="text-white/75 text-xs">{s.duree}</p>
                          </div>
                          <div className="p-6 space-y-5">
                            {/* Objectif */}
                            <div>
                              <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">Objectif</div>
                              <p className="text-sm text-slate-600 leading-relaxed">{s.objectif}</p>
                            </div>
                            {/* Stratégies */}
                            <div>
                              <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-3">Stratégies</div>
                              <ul className="space-y-2">
                                {s.strategies.map((str, si) => (
                                  <li key={si} className="flex items-start gap-3 text-sm text-slate-600">
                                    <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs flex-shrink-0 mt-0.5">{si + 1}</span>
                                    <span className="leading-relaxed">{str}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {/* Alerte */}
                            <div className={`${s.bgColor} border ${s.borderColor} rounded-xl p-4`}>
                              <div className={`text-xs font-black ${s.textColor} uppercase tracking-wider mb-1.5`}>{s.alerte.titre}</div>
                              <p className="text-sm text-slate-600 leading-relaxed">{s.alerte.texte}</p>
                            </div>
                            {/* Conseil additionnel */}
                            {s.conseil && (
                              <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                                <div className="text-xs font-black text-amber-800 uppercase tracking-wider mb-1.5">{s.conseil.titre}</div>
                                <p className="text-sm text-slate-600 leading-relaxed">{s.conseil.texte}</p>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Critères d'évaluation */}
                <div className="py-12 border-t border-slate-100">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Critères d'évaluation</h2>
                    <p className="text-slate-500 text-sm mb-8">Comprendre comment l'examinateur évalue votre performance</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {EO_CRITERES.map((c, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex gap-4">
                          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-black text-xs flex-shrink-0 shadow-sm">
                            {c.titre.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <h3 className="font-black text-slate-800 text-sm mb-1">{c.titre}</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">{c.desc}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Conseils pour le jour J */}
                <div className="bg-slate-50 py-12">
                  <div className="max-w-4xl mx-auto px-4 sm:px-6">
                    <h2 className="text-2xl font-black text-slate-900 mb-2">Conseils pour le jour de l'examen</h2>
                    <p className="text-slate-500 text-sm mb-8">Ce que les candidats qui réussissent ont en commun</p>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {EO_CONSEILS_JOUR_J.map((c, i) => (
                        <motion.div key={i} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}
                          className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                          <h3 className="font-black text-slate-800 text-sm mb-2">{c.titre}</h3>
                          <p className="text-xs text-slate-500 leading-relaxed">{c.texte}</p>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="bg-slate-900 py-12">
              <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
                <h2 className="text-xl font-black text-white mb-6">Format de l&apos;examen officiel</h2>
                <div className="grid grid-cols-3 gap-4 mb-8 max-w-lg mx-auto">
                  {[{ label: 'Durée', value: overview.duration, icon: '⏱️' }, { label: overview.questionsLabel, value: overview.questionsCount, icon: '📝' }, { label: 'Score max', value: overview.maxScore, icon: '🏆' }].map(s => (
                    <div key={s.label} className="bg-slate-800 rounded-2xl p-4 text-center border border-slate-700">
                      <div className="text-xl mb-1">{s.icon}</div>
                      <div className="text-xl font-black text-white">{s.value}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap gap-3 justify-center">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => { setSelectedSerie(1); setPhase('preview'); }}
                    className={`inline-flex items-center gap-2 bg-gradient-to-r ${meta.color} text-white font-black px-8 py-4 rounded-2xl shadow-lg`}>
                    Lancer le Simulateur {meta.icon}
                  </motion.button>
                  <button onClick={() => router.push('/dashboard')} className="inline-flex items-center gap-2 bg-white/10 text-white font-bold px-6 py-4 rounded-2xl border border-white/20 text-sm">
                    📊 Tableau de Bord
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // SESSIONS LIST — grille de choix de session (EO)
  // ════════════════════════════════════════════════════════════
  if (phase === 'sessions') {
    const cardLabel = sectionCode === 'EO' ? 'Session' : meta.isWritten ? 'Combinaison' : 'Série';
    const cardDesc = sectionCode === 'EO' ? '3 tâches aléatoires · 12 min' : `${overview.questionsCount} tâches · ${overview.duration}`;
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => setPhase('overview')}
              className="text-slate-400 hover:text-red-600 transition-colors text-sm flex-shrink-0 flex items-center gap-1 font-medium">
              ← <span className="hidden sm:inline">Retour</span>
            </button>
            <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1.5`}>
              {meta.icon} {sectionCode} · {meta.label}
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Choisissez votre série</h2>
              <p className="text-slate-500 text-sm mt-1">
                {sectionCode === 'EE' && eeFormationSeries.length > 0
                  ? `${eeFormationSeries.length} séries officielles · T1 × T2 × T3 · 60 min`
                  : sectionCode === 'CE'
                    ? `${ceFormationSeries.length > 0 ? ceFormationSeries.length : 50} séries officielles · 39 questions · 60 min`
                    : sectionCode === 'EO'
                      ? 'Tâches générées aléatoirement à chaque session · 12 min'
                      : `${overview.questionsCount} tâches · ${overview.duration}`}
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Toutes gratuites
            </div>
          </div>

          {/* ── Séries EE curées par l'admin ── */}
          {sectionCode === 'EE' && (eeFormationLoading || eeFormationSeries.length > 0) ? (
            eeFormationLoading ? (
              <div className="flex justify-center py-12"><div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" /></div>
            ) : (
              <div className="space-y-2">
                {eeFormationSeries.map((serie, idx) => (
                  <motion.button
                    key={serie.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(idx * 0.01, 0.4) }}
                    onClick={() => { setSelectedComboIds({ t1Id: serie.t1.id, t2Id: serie.t2.id, t3Id: serie.t3.id }); setSelectedSerie(serie.id); setPhase('preview'); }}
                    className="w-full flex items-center gap-3 bg-white border border-slate-200 rounded-2xl px-4 py-3 hover:border-emerald-300 hover:shadow-sm transition-all group text-left">
                    {/* Numéro */}
                    <span className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-black text-slate-500 flex-shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                      {serie.id}
                    </span>
                    {/* Thèmes */}
                    <div className="flex-1 flex flex-wrap items-center gap-2 min-w-0">
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 capitalize">
                        ✉️ {serie.t1.theme || 'T1'}
                      </span>
                      <span className="text-slate-300 text-xs">+</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-50 border border-sky-200 text-sky-700 capitalize">
                        📖 {serie.t2.theme || 'T2'}
                      </span>
                      <span className="text-slate-300 text-xs">+</span>
                      <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-violet-50 border border-violet-200 text-violet-700 capitalize">
                        💬 {serie.t3.theme || 'T3'}
                      </span>
                    </div>
                    {/* CTA */}
                    <span className="flex-shrink-0 text-xs font-black text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      Commencer →
                    </span>
                  </motion.button>
                ))}
              </div>
            )
          ) : sectionCode === 'CO' ? (
            /* ── Séries CO ── */
            coFormationLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : coFormationSeries.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-5xl">🎧</div>
                <p className="text-slate-700 font-bold text-lg">Aucune série CO disponible</p>
                <p className="text-slate-400 text-sm">L&apos;administrateur n&apos;a pas encore ajouté les séries CO.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {!isPaid && (
                  <div className="flex items-center justify-between bg-sky-50 border border-sky-100 rounded-xl px-4 py-2.5 mb-2">
                    <span className="text-xs text-sky-700 font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 bg-sky-400 rounded-full" />
                      3 séries gratuites · le reste est réservé aux abonnés
                    </span>
                    <a href="/pricing" className="text-xs font-black text-sky-600 hover:text-sky-800 transition-colors">Voir les plans →</a>
                  </div>
                )}
                {coFormationSeries.map((serie, idx) => {
                  const score = coSerieScores[serie.id];
                  const pct = score ? Math.round((score.correct / score.total) * 100) : null;
                  const isFree = serie.id <= (overview.freeSeriesCount ?? 3);
                  const canAccess = isFree || isPaid;
                  return (
                    <motion.button key={serie.id}
                      initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(idx * 0.008, 0.3) }}
                      onClick={() => canAccess ? startCoSerie(serie) : (window.location.href = '/pricing')}
                      className={`group w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-all text-left border ${
                        canAccess
                          ? 'bg-white border-slate-200 hover:border-sky-300 hover:shadow-sm'
                          : 'bg-gradient-to-r from-indigo-50 to-violet-50 border-indigo-100 hover:border-indigo-300'
                      }`}>
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0 transition-colors ${
                        canAccess ? 'bg-slate-100 text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600'
                                  : 'bg-gradient-to-br from-indigo-300 to-violet-400 text-white/80 shadow-sm'
                      }`}>{serie.id}</span>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm font-bold ${canAccess ? 'text-slate-700' : 'text-slate-500'}`}>Série {serie.id}</span>
                        <span className="ml-2 text-xs text-slate-400">· 39 questions · 35 min</span>
                      </div>
                      {canAccess ? (
                        <>
                          {isFree && !isPaid && <span className="text-[10px] font-black px-1.5 py-0.5 rounded bg-sky-100 text-sky-700 border border-sky-200">GRATUIT</span>}
                          {score && (
                            <span className={`text-sm font-black tabular-nums ${pct! >= 70 ? 'text-emerald-600' : pct! >= 50 ? 'text-sky-600' : 'text-rose-500'}`}>
                              {score.correct}/{score.total}
                            </span>
                          )}
                          <span className="text-xs font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity">Commencer →</span>
                        </>
                      ) : (
                        <span className="text-xs font-black bg-gradient-to-r from-indigo-500 to-violet-600 text-white px-2.5 py-0.5 rounded-full shadow-sm">Premium</span>
                      )}
                    </motion.button>
                  );
                })}
              </div>
            )
          ) : sectionCode === 'CE' ? (
            /* ── Séries CE avec scores et filtres ── */
            ceFormationLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-7 h-7 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : ceFormationSeries.length === 0 ? (
              <div className="text-center py-16 space-y-3">
                <div className="text-5xl">📖</div>
                <p className="text-slate-700 font-bold text-lg">Aucune série CE disponible</p>
                <p className="text-slate-400 text-sm">L&apos;administrateur n&apos;a pas encore généré les séries CE.</p>
              </div>
            ) : (
              <>
                {/* Filtres */}
                <div className="flex gap-2 mb-5">
                  {(['all', 'done', 'todo'] as const).map(f => {
                    const labels: Record<string, string> = { all: 'Tous', done: 'Terminés', todo: 'Non terminés' };
                    const count = f === 'all'
                      ? ceFormationSeries.length
                      : f === 'done'
                        ? ceFormationSeries.filter(s => !!ceSerieScores[s.id]).length
                        : ceFormationSeries.filter(s => !ceSerieScores[s.id]).length;
                    return (
                      <button
                        key={f}
                        onClick={() => setCeFilter(f)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          ceFilter === f
                            ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-sky-300 hover:text-sky-600'
                        }`}>
                        {labels[f]}
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-black ${ceFilter === f ? 'bg-white/25 text-white' : 'bg-slate-100 text-slate-500'}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Liste compacte style LMS */}
                <div className="space-y-1.5">
                  {ceFormationSeries
                    .filter(s =>
                      ceFilter === 'done' ? !!ceSerieScores[s.id] :
                      ceFilter === 'todo' ? !ceSerieScores[s.id] :
                      true
                    )
                    .map((serie, idx) => {
                      const score = ceSerieScores[serie.id];
                      // Niveau dominant parmi les 39 questions
                      const lvlCounts: Record<string, number> = {};
                      (serie.questions as Array<{ level?: string }>).forEach(q => {
                        if (q.level) lvlCounts[q.level] = (lvlCounts[q.level] || 0) + 1;
                      });
                      const dominant = Object.entries(lvlCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'B2';
                      const lvl =
                        dominant.startsWith('A') ? { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-400' } :
                        dominant === 'B1'        ? { bg: 'bg-sky-50',     border: 'border-sky-200',     text: 'text-sky-700',     dot: 'bg-sky-400' }     :
                        dominant === 'B2'        ? { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    dot: 'bg-blue-400' }    :
                        dominant === 'C1'        ? { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  dot: 'bg-violet-400' }  :
                                                  { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    dot: 'bg-rose-400' };

                      const pct = score ? Math.round((score.correct / score.total) * 100) : null;
                      const scoreColor = pct === null ? '' : pct >= 70 ? 'text-emerald-600' : pct >= 50 ? 'text-sky-600' : 'text-rose-500';
                      const barColor  = pct === null ? '' : pct >= 70 ? 'bg-emerald-500'   : pct >= 50 ? 'bg-sky-500'   : 'bg-rose-400';

                      return (
                        <motion.button
                          key={serie.id}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: Math.min(idx * 0.008, 0.3) }}
                          onClick={() => { setPendingCeSerie(serie); setPhase('preview'); }}
                          className="group w-full flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 hover:border-sky-300 hover:shadow-sm transition-all text-left">

                          {/* Numéro */}
                          <span className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-black text-slate-400 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors flex-shrink-0">
                            {serie.id}
                          </span>

                          {/* Titre + niveau */}
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="text-sm font-bold text-slate-700 whitespace-nowrap">Série {serie.id}</span>
                            <span className={`text-xs font-black px-2 py-0.5 rounded-md border ${lvl.bg} ${lvl.border} ${lvl.text}`}>
                              {dominant}
                            </span>
                            <span className="text-xs text-slate-400 hidden sm:inline">· 39 questions</span>
                          </div>

                          {/* Score + barre */}
                          <div className="flex-shrink-0 flex items-center gap-3">
                            {score ? (
                              <div className="flex items-center gap-2">
                                <div className="hidden sm:flex flex-col items-end gap-0.5">
                                  <div className="w-20 bg-slate-100 rounded-full h-1.5">
                                    <div className={`h-1.5 rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                                  </div>
                                  <span className="text-xs text-slate-400">
                                    {new Date(score.completedAt).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                  </span>
                                </div>
                                <span className={`text-sm font-black tabular-nums ${scoreColor}`}>
                                  {score.correct}<span className="text-slate-300 font-normal">/</span>{score.total}
                                </span>
                                <span className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0" title="Terminé">
                                  <svg className="w-3 h-3 text-emerald-600" fill="none" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                </span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400 hidden sm:inline">60 min</span>
                            )}
                            <span className="text-xs font-bold text-sky-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                              Commencer →
                            </span>
                          </div>
                        </motion.button>
                      );
                    })}
                </div>
              </>
            )
          ) : (
            /* Fallback générique si pas de séries curées */
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: overview.totalSeries }, (_, i) => i + 1).map(num => (
                <SerieCard
                  key={num}
                  num={num}
                  isFree={num <= overview.freeSeriesCount}
                  isFirst={num === 1}
                  isPaid={isPaid}
                  color={meta.color}
                  onStart={n => { setSelectedSerie(n); setPhase('preview'); }}
                  cardLabel={cardLabel}
                  cardDesc={cardDesc}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PREVIEW CE — écran pré-épreuve spécifique Compréhension Écrite
  // ════════════════════════════════════════════════════════════
  if (phase === 'preview' && sectionCode === 'CE' && pendingCeSerie) {
    const ceTips = SECTION_STRATEGIC_TIPS['CE'] ?? [];
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button
              onClick={() => { setPendingCeSerie(null); setPhase('overview'); }}
              className="text-slate-400 hover:text-violet-600 transition-colors text-sm flex-shrink-0 flex items-center gap-1 font-medium">
              ← <span className="hidden sm:inline">Épreuves</span>
            </button>
            <div className="px-3 py-1 rounded-full bg-gradient-to-r from-violet-400 to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0">
              <span>📖</span>
              <span className="hidden sm:inline">CE · Compréhension Écrite</span>
              <span className="sm:hidden">CE</span>
            </div>
          </div>
        </div>

        {/* Contenu centré */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full space-y-6">

            {/* Titre */}
            <div className="text-center">
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] mb-3">
                Formation TCF Canada
              </p>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-purple-500 text-4xl shadow-lg mb-4">
                📖
              </div>
              <p className="text-xs font-bold text-slate-400 mb-1">TCF Canada</p>
              <h1 className="text-4xl font-black text-slate-900">Série {pendingCeSerie.id}</h1>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: '39', label: 'Questions' },
                { value: '60', label: 'Minutes' },
                { value: '699', label: 'Points' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
                  <div className="text-2xl font-black text-slate-800 mb-0.5">{s.value}</div>
                  <div className="text-xs text-slate-400">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Conseils stratégiques */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💡</span>
                <span className="font-black text-amber-800 text-sm">Conseil stratégique</span>
              </div>
              <ul className="space-y-3">
                {ceTips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900 leading-relaxed">
                    <span className="text-amber-500 font-black flex-shrink-0 mt-0.5">›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bouton commencer */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => { const s = pendingCeSerie; setPendingCeSerie(null); startCeSerie(s); }}
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-black text-lg shadow-lg flex items-center justify-center gap-3">
              Commencer l&apos;épreuve <span className="text-white/80">→</span>
            </motion.button>

            <p className="text-center text-xs text-slate-400">
              Timer démarrera automatiquement · Bonne chance !
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // PREVIEW — écran pré-examen style Pack Ayoub
  // ════════════════════════════════════════════════════════════
  if (phase === 'preview') {
    const mins = Math.round(SECTION_DURATION[sectionCode] / 60);
    const tips = SECTION_STRATEGIC_TIPS[sectionCode] ?? [];
    const serieLabel = meta.isWritten ? 'Combinaison' : 'Série';
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
            <button onClick={() => isFormationCombo ? router.push(sectionCode === 'EO' ? '/formation-eo' : '/formation') : setPhase(sectionCode === 'EO' ? 'sessions' : 'overview')}
              className="text-slate-400 hover:text-red-600 transition-colors text-sm flex-shrink-0 flex items-center gap-1 font-medium">
              ← <span className="hidden sm:inline">{sectionCode === 'EO' ? 'Sessions' : 'Séries'}</span>
            </button>
            <div className={`px-3 py-1 rounded-full bg-gradient-to-r ${meta.color} text-white text-xs font-bold flex items-center gap-1.5 flex-shrink-0`}>
              <span>{meta.icon}</span>
              <span className="hidden sm:inline">{sectionCode} · {meta.label}</span>
              <span className="sm:hidden">{sectionCode}</span>
            </div>
          </div>
        </div>

        {/* Contenu centré */}
        <div className="flex-1 flex items-center justify-center px-4 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-lg w-full space-y-6"
          >
            {/* Titre */}
            <div className="text-center">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">TCF Canada</div>
              <div className={`inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br ${meta.color} text-4xl shadow-lg mb-4`}>
                {meta.icon}
              </div>
              <h1 className="text-4xl font-black text-slate-900 mb-1">{serieLabel} {selectedSerie}</h1>
              <p className="text-slate-500 text-sm">{meta.label}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: '📝', value: meta.isWritten ? overview.questionsCount : '39', label: meta.isWritten ? 'Tâches' : 'Questions' },
                { icon: '⏱️', value: `${mins} min`, label: 'Durée' },
                { icon: '🏆', value: overview.maxScore, label: meta.isWritten ? 'pts max' : 'pts max' },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-2xl p-4 text-center shadow-sm border border-slate-100">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className="text-xl font-black text-slate-800">{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Conseils stratégiques */}
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xl">💡</span>
                <span className="font-black text-amber-800 text-sm">Conseil stratégique</span>
              </div>
              <ul className="space-y-3">
                {tips.map((tip, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-amber-900 leading-relaxed">
                    <span className="text-amber-500 font-black flex-shrink-0 mt-0.5">›</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>

            {/* Bouton commencer */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startSession}
              className={`w-full py-5 rounded-2xl bg-gradient-to-r ${meta.color} text-white font-black text-lg shadow-lg flex items-center justify-center gap-3`}
            >
              Commencer l&apos;épreuve <span className="text-white/80">→</span>
            </motion.button>

            <p className="text-center text-xs text-slate-400">
              Timer démarrera automatiquement · Bonne chance !
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // CHARGEMENT
  // ════════════════════════════════════════════════════════════
  if (loading) return (
    <div className="min-h-screen flex flex-col">
      <div className="flex h-1.5 w-full flex-shrink-0"><div className="w-1/4 bg-red-600" /><div className="w-1/2 bg-white" /><div className="w-1/4 bg-red-600" /></div>
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <Spinner size={40} /><p className="text-slate-500 font-medium">Chargement de l&apos;épreuve...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen flex flex-col">
      <div className="flex h-1.5 w-full flex-shrink-0"><div className="w-1/4 bg-red-600" /><div className="w-1/2 bg-white" /><div className="w-1/4 bg-red-600" /></div>
      <div className="flex-1 flex flex-col items-center justify-center gap-5 px-4">
        <div className="text-5xl">⚠️</div>
        <p className="text-slate-600 font-semibold text-center max-w-sm">{error}</p>
        <button onClick={fetchContent} className="bg-red-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-red-700 transition-colors">Réessayer</button>
        <button onClick={() => setPhase('overview')} className="text-slate-400 text-sm hover:underline">Retour aux séries</button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // RÉSULTATS
  // ════════════════════════════════════════════════════════════
  if (done) {
    // ── Calcul des points par niveau ─────────────────────────────
    const LEVEL_POINTS: Record<string, number> = { A1: 3, A2: 9, B1: 15, B2: 21, C1: 26, C2: 33 };
    const isQCM = !meta.isWritten;

    const correct      = isQCM ? questions.filter((q, i) => answers[i] === q.answer).length : scores.filter(s => s >= 70).length;
    const total        = isQCM ? questions.length : scores.length;
    const unanswered   = isQCM ? questions.filter((_, i) => !answers[i]).length : 0;
    const wrong        = total - correct - unanswered;
    const scorePercent = total ? Math.round((correct / total) * 100) : 0;

    const earnedPts = isQCM
      ? questions.reduce((sum, q, i) => sum + (answers[i] === q.answer ? (LEVEL_POINTS[q.level] ?? 0) : 0), 0)
      : 0;
    const maxPts = isQCM
      ? questions.reduce((sum, q) => sum + (LEVEL_POINTS[q.level] ?? 0), 0)
      : 0;

    // Temps passé
    const timeSpentSec = SECTION_DURATION[sectionCode] - timeLeft;
    const timeMin      = Math.floor(timeSpentSec / 60);
    const timeSec      = timeSpentSec % 60;
    const timeStr      = `${timeMin} min ${String(timeSec).padStart(2, '0')} sec`;

    // NCLC + niveau
    const getNclcInfo = (pct: number): { nclc: string; level: string; levelSub: string; color: string; bg: string } => {
      if (pct >= 92) return { nclc: '10+', level: 'C2',          levelSub: 'Expert',               color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200' };
      if (pct >= 84) return { nclc: '9',   level: 'C1',          levelSub: 'Maîtrise avancée',     color: 'text-emerald-500', bg: 'bg-emerald-50 border-emerald-100' };
      if (pct >= 76) return { nclc: '8',   level: 'C1',          levelSub: 'Maîtrise',             color: 'text-teal-600',   bg: 'bg-teal-50 border-teal-100' };
      if (pct >= 68) return { nclc: '7',   level: 'B2',          levelSub: 'Avancé',               color: 'text-red-600', bg: 'bg-red-50 border-red-200' };
      if (pct >= 60) return { nclc: '6',   level: 'B2',          levelSub: 'Intermédiaire avancé', color: 'text-violet-500', bg: 'bg-violet-50 border-violet-100' };
      if (pct >= 50) return { nclc: '5',   level: 'B1',          levelSub: 'Intermédiaire',        color: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' };
      if (pct >= 40) return { nclc: '4',   level: 'A2',          levelSub: 'Élémentaire',          color: 'text-orange-500', bg: 'bg-orange-50 border-orange-100' };
      return                { nclc: '3',   level: 'A1–A2',       levelSub: 'Débutant',             color: 'text-red-500',    bg: 'bg-red-50 border-red-100' };
    };
    const nclcInfo = getNclcInfo(scorePercent);

    const appreciation =
      scorePercent >= 90 ? { label: 'Exceptionnel', msg: 'Performance remarquable ! Tu es prêt(e) pour le vrai examen.', icon: '🏆' }
      : scorePercent >= 80 ? { label: 'Excellent',  msg: 'Excellente maîtrise. Continue sur cette lancée !',              icon: '🎉' }
      : scorePercent >= 70 ? { label: 'Très bien',  msg: 'Très bon résultat ! Quelques points encore à consolider.',      icon: '👍' }
      : scorePercent >= 60 ? { label: 'Bien',       msg: 'Bon travail ! Quelques points à améliorer.',                    icon: '✅' }
      : scorePercent >= 50 ? { label: 'Passable',   msg: 'Tu es sur la bonne voie. Pratique encore.',                    icon: '💪' }
      : { label: 'À améliorer', msg: 'Courage ! La régularité fait la différence.',                                        icon: '📚' };

    function toggleExpand(i: number) {
      setExpandedQ(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
    }

    const LEVEL_COLORS: Record<string, string> = {
      A1: 'bg-slate-100 text-slate-600 border-slate-200',
      A2: 'bg-sky-100 text-sky-700 border-sky-200',
      B1: 'bg-indigo-100 text-indigo-700 border-indigo-200',
      B2: 'bg-violet-100 text-violet-700 border-violet-200',
      C1: 'bg-rose-100 text-rose-700 border-rose-200',
      C2: 'bg-amber-100 text-amber-700 border-amber-200',
    };

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-red-50">
        {newBadges.length > 0 && <AchievementToast badges={newBadges} onDone={() => setNewBadges([])} />}
        {showSurvey && user && (
          <SurveyModal
            userId={user.id}
            section={sectionCode}
            resultId={surveyResultId}
            onClose={() => setShowSurvey(false)}
          />
        )}

        {/* ── Header résultats ── */}
        <div className="sticky top-0 z-40 shadow-sm">
          <div className="flex h-1 w-full"><div className="w-1/4 bg-red-600" /><div className="w-1/2 bg-white" /><div className="w-1/4 bg-red-600" /></div>
          <div className="bg-white border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 py-3 text-center">
            <div className="text-xs font-black text-slate-400 uppercase tracking-widest">Formation TCF Canada</div>
            <div className="text-base font-black text-slate-800 mt-0.5">
              {meta.label} — Série {selectedSerie} · Terminé !
            </div>
            <div className="text-xs text-slate-500 mt-0.5">{total} sur {total} questions répondues</div>
          </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* ── Carte principale ── */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-lg border border-slate-100 overflow-hidden">

            {/* Niveau + NCLC */}
            <div className={`px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3 ${nclcInfo.bg}`}>
              <div className="flex items-center gap-3">
                <div>
                  <div className={`text-sm font-black ${nclcInfo.color}`}>Niveau {nclcInfo.level} ({nclcInfo.levelSub})</div>
                  {isQCM && maxPts > 0 && (
                    <div className="text-xs text-slate-500 mt-0.5">{earnedPts} / {maxPts} points bruts</div>
                  )}
                </div>
              </div>
              <div className={`text-2xl font-black ${nclcInfo.color}`}>NCLC {nclcInfo.nclc}</div>
            </div>

            {/* Score anneau + stats */}
            <div className="p-6">
              <div className="flex flex-col items-center mb-6">
                <ScoreRing score={scorePercent} size={110} />
              </div>

              {/* Bannière score TCF /699 pour CO */}
              {sectionCode === 'CO' && maxPts > 0 && (
                <div className="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl px-6 py-4 mb-4 flex items-center justify-between shadow">
                  <div>
                    <div className="text-white/80 text-xs font-bold uppercase tracking-widest mb-0.5">Score TCF Canada</div>
                    <div className="text-white text-3xl font-black">{earnedPts} <span className="text-white/60 text-xl font-bold">/ 699 pts</span></div>
                  </div>
                  <div className="text-right">
                    <div className="text-white/80 text-xs font-semibold">Estimation NCLC</div>
                    <div className={`text-2xl font-black ${nclcInfo.color.replace('text-', 'text-white')}`}>NCLC {nclcInfo.nclc}</div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-emerald-600">{correct}/{total}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Correctes</div>
                </div>
                <div className="bg-red-50 border border-red-100 rounded-2xl p-3 text-center">
                  <div className="text-2xl font-black text-red-600">{scorePercent}%</div>
                  <div className="text-xs text-slate-500 mt-0.5">Réussite</div>
                </div>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 text-center">
                  <div className="text-sm font-black text-slate-700 leading-tight">{timeStr}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Temps passé</div>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-3 text-center">
                  <div className="text-xl font-black text-amber-600">{appreciation.icon}</div>
                  <div className="text-xs font-black text-amber-700">{appreciation.label}</div>
                  <div className="text-xs text-slate-500 leading-tight mt-0.5">{appreciation.msg}</div>
                </div>
              </div>

              {/* Boutons actions */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => { setDone(false); setScores([]); setMood('idle'); setExpandedQ(new Set()); setResultsTab('results'); startSession(); }}
                  className="flex-1 min-w-[100px] bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow">
                  🔄 Refaire
                </button>
                <button onClick={() => { setDone(false); setPhase('overview'); setExpandedQ(new Set()); }}
                  className="flex-1 min-w-[100px] bg-white border-2 border-slate-200 hover:border-red-300 text-slate-700 font-bold py-3 rounded-xl transition-colors text-sm">
                  Séries
                </button>
                <button onClick={() => router.push('/dashboard')}
                  className="flex-1 min-w-[100px] bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 rounded-xl transition-colors text-sm">
                  Dashboard
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Résultats + Aperçu toujours visibles ── */}
          {isQCM && questions.length > 0 && (
            <>
              {/* ── Grille des questions ── */}
              {(
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl shadow-sm border border-slate-100 p-5">
                  <h3 className="font-black text-slate-700 text-sm mb-4">Résumé question par question</h3>

                  {/* Légende */}
                  <div className="flex items-center gap-4 mb-4 flex-wrap">
                    {[
                      { color: 'bg-emerald-500', label: 'Correcte' },
                      { color: 'bg-red-400',     label: 'Incorrecte' },
                      { color: 'bg-slate-300',   label: 'Non répondue' },
                    ].map(l => (
                      <div key={l.label} className="flex items-center gap-1.5 text-xs text-slate-500">
                        <span className={`w-3 h-3 rounded-full ${l.color}`} />
                        {l.label}
                      </div>
                    ))}
                  </div>

                  {/* Grille numérotée */}
                  <div className="grid grid-cols-10 sm:grid-cols-13 gap-1.5 mb-6">
                    {questions.map((q, i) => {
                      const ua = answers[i];
                      const ok = ua === q.answer;
                      const na = !ua;
                      return (
                        <button key={i}
                          onClick={() => { setResultsTab('apercu'); setTimeout(() => toggleExpand(i), 100); }}
                          title={`Q${i + 1} — ${q.level}`}
                          className={`w-full aspect-square rounded-lg text-xs font-black flex items-center justify-center transition-transform hover:scale-110 ${
                            na ? 'bg-slate-200 text-slate-500' : ok ? 'bg-emerald-500 text-white' : 'bg-red-400 text-white'
                          }`}>
                          {i + 1}
                        </button>
                      );
                    })}
                  </div>

                  {/* Stats par niveau */}
                  <div className="border-t border-slate-100 pt-4">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-wider mb-3">Résultats par niveau</div>
                    <div className="space-y-2">
                      {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(lvl => {
                        const qs = questions.map((q, i) => ({ q, i })).filter(({ q }) => q.level === lvl);
                        if (qs.length === 0) return null;
                        const okCount = qs.filter(({ q, i }) => answers[i] === q.answer).length;
                        const pts = LEVEL_POINTS[lvl] ?? 0;
                        const earnedLvl = okCount * pts;
                        const maxLvl = qs.length * pts;
                        const pctLvl = qs.length > 0 ? Math.round((okCount / qs.length) * 100) : 0;
                        return (
                          <div key={lvl}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-full font-black border text-xs ${LEVEL_COLORS[lvl]}`}>{lvl}</span>
                                <span className="text-slate-500">{pts} pt/question</span>
                              </span>
                              <span className="text-slate-600 font-bold">{okCount}/{qs.length} · {earnedLvl}/{maxLvl} pts · <span className={pctLvl >= 70 ? 'text-emerald-600' : pctLvl >= 50 ? 'text-amber-600' : 'text-red-500'}>{pctLvl}%</span></span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <motion.div initial={{ width: 0 }} animate={{ width: `${pctLvl}%` }} transition={{ duration: 0.6 }}
                                className={`h-full rounded-full ${pctLvl >= 70 ? 'bg-emerald-500' : pctLvl >= 50 ? 'bg-amber-400' : 'bg-red-400'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── Aperçu des réponses ── */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <h3 className="font-black text-slate-700 text-sm">Revue détaillée</h3>
                    <button onClick={() => setExpandedQ(new Set(questions.map((_, i) => i)))}
                      className="text-xs text-red-600 hover:underline">Tout afficher</button>
                  </div>

                  {questions.map((qu, i) => {
                    const userAns  = answers[i];
                    const isOk     = userAns === qu.answer;
                    const isNA     = !userAns;
                    const isExp    = expandedQ.has(i);
                    const pts      = LEVEL_POINTS[qu.level] ?? 0;
                    const earnedQ  = isOk ? pts : 0;

                    return (
                      <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.025, 0.5) }}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">

                        {/* En-tête question */}
                        <button className="w-full text-left" onClick={() => toggleExpand(i)}>
                          <div className={`px-4 py-3 flex items-center gap-3 border-b ${isOk ? 'bg-emerald-50 border-emerald-100' : isNA ? 'bg-slate-50 border-slate-100' : 'bg-red-50 border-red-100'}`}>
                            {/* Numéro + statut */}
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${isOk ? 'bg-emerald-500 text-white' : isNA ? 'bg-slate-300 text-slate-600' : 'bg-red-400 text-white'}`}>
                              {i + 1}
                            </div>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-black border px-2 py-0.5 rounded-full ${LEVEL_COLORS[qu.level] ?? ''}`}>
                                  {qu.level}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">{pts} pt</span>
                                {qu.theme && <span className="text-xs text-slate-400 capitalize">{qu.theme}</span>}
                              </div>

                              {/* Résumé réponse sur une ligne */}
                              <div className="text-xs mt-1 space-y-0.5">
                                {isNA ? (
                                  <span className="text-slate-400 italic">Non répondue</span>
                                ) : (
                                  <>
                                    {!isOk && (
                                      <div className="text-red-600">
                                        <span className="font-black">✗</span> {String(qu.options?.[userAns] ?? userAns).replace(/\*\*/g, '').slice(0, 60)}
                                      </div>
                                    )}
                                    <div className="text-emerald-700">
                                      <span className="font-black">✓</span> {String(qu.options?.[qu.answer ?? ''] ?? qu.answer ?? '').replace(/\*\*/g, '').slice(0, 60)}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0">
                              <span className={`text-xs font-black ${isOk ? 'text-emerald-600' : 'text-slate-400'}`}>
                                +{earnedQ}
                              </span>
                              <span className="text-slate-400 text-xs">{isExp ? '▲' : '▼'}</span>
                            </div>
                          </div>
                        </button>

                        {/* Détail dépliable */}
                        <AnimatePresence>
                          {isExp && (
                            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">

                              {/* Image (CO uniquement) */}
                              {sectionCode === 'CO' && qu.imageUrl && (
                                <div className="px-4 pt-3 border-b border-slate-100 pb-3">
                                  <img src={qu.imageUrl} alt="" className="w-full rounded-xl max-h-52 object-contain bg-slate-100" />
                                </div>
                              )}

                              {/* Audio + texte du passage */}
                              <div className="px-4 py-3 bg-violet-50/40 border-b border-violet-100 space-y-2">
                                {sectionCode === 'CO' && (qu.audioUrl || qu.transcript) && (
                                  <ReviewAudio audioUrl={qu.audioUrl} transcript={qu.transcript} />
                                )}
                                <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">{qu.question}</p>
                              </div>

                              {/* Options */}
                              <div className="px-4 pt-3 pb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {Object.entries(qu.options ?? {}).map(([key, val]) => {
                                  const isUser = userAns === key;
                                  const isCor  = qu.answer === key;
                                  let style = 'border-slate-100 bg-slate-50 text-slate-400';
                                  let kStyle = 'bg-slate-200 text-slate-500';
                                  if (isCor)       { style = 'border-emerald-300 bg-emerald-50 text-emerald-800'; kStyle = 'bg-emerald-500 text-white'; }
                                  else if (isUser) { style = 'border-red-300 bg-red-50 text-red-700';            kStyle = 'bg-red-400 text-white'; }
                                  return (
                                    <div key={key} className={`px-3 py-2 rounded-xl border-2 flex items-start gap-2 text-xs ${style}`}>
                                      <span className={`w-6 h-6 rounded-md font-black flex items-center justify-center flex-shrink-0 mt-0.5 text-xs ${kStyle}`}>
                                        {isCor ? '✓' : isUser ? '✗' : key.toUpperCase()}
                                      </span>
                                      <span className="leading-snug">{renderBold(String(val))}</span>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Explication */}
                              {qu.explanation && (
                                <div className="px-4 pb-4 pt-1">
                                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-slate-600 leading-relaxed">
                                    <span className="font-black text-amber-600">💡 </span>{qu.explanation}
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}

                  {/* Bouton bas de page */}
                  <div className="flex gap-3 pb-6 pt-2">
                    <button onClick={() => { setDone(false); setScores([]); setMood('idle'); setExpandedQ(new Set()); startSession(); }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition-colors text-sm shadow">
                      🔄 Refaire
                    </button>
                    <button onClick={() => router.push('/dashboard')}
                      className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:border-red-300 transition-colors text-sm">
                      Dashboard
                    </button>
                  </div>
                </motion.div>
            </>
          )}

          {/* Résultats EE/EO (non QCM) — version simplifiée */}
          {!isQCM && (
            <div className="flex gap-3 pb-6">
              <button onClick={() => { setDone(false); setScores([]); setMood('idle'); startSession(); }}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl hover:bg-red-700 text-sm shadow">
                🔄 Nouvelle session
              </button>
              <button onClick={() => router.push('/dashboard')}
                className="flex-1 bg-white border-2 border-slate-200 text-slate-700 font-bold py-3 rounded-xl hover:border-red-300 text-sm">
                Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // SESSION CO/CE — interface examen avec timer + navigation libre
  // ════════════════════════════════════════════════════════════
  if (!meta.isWritten && questions.length > 0) {
    const q = questions[currentQ];

    // CE — le dernier paragraphe est toujours la question, tout le reste est le passage
    const ceRaw = q?.question ?? '';
    const ceParagraphs = ceRaw.split(/\n+/).map((p: string) => p.trim()).filter(Boolean);
    const ceActualQuestion = ceParagraphs[ceParagraphs.length - 1] ?? '';
    const cePassageParagraphs = ceParagraphs.slice(0, -1);
    const cePassage = cePassageParagraphs.join(' ');
    const cePassageLen = cePassage.length;
    const cePassageFontSize =
      cePassageLen < 250  ? 'text-2xl'   :
      cePassageLen < 500  ? 'text-xl'    :
      cePassageLen < 800  ? 'text-[17px]' :
      cePassageLen < 1200 ? 'text-base'  : 'text-[15px]';

    return (
      <div className="min-h-screen bg-slate-50">
        {quitModalJSX}
        <ExamHeader />

        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-5 flex gap-5">
          {/* Zone principale — centrée pour CE */}
          <div className={`flex-1 min-w-0 space-y-4 ${sectionCode === 'CE' ? 'flex flex-col items-center' : ''}`}>
            {sectionCode !== 'CE' && sectionCode !== 'CO' && (
              <div className="flex justify-center">
                <SophieAvatar mood={mood} size="sm" showMessage={true} />
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={currentQ} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                ref={protectedRef}
                className={`bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative flex flex-col
                  ${sectionCode === 'CE' ? 'w-full max-w-2xl h-[780px]' : ''}`}
                style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>

                {/* Filigrane anti-plagiat */}
                <ExamWatermark />

                {/* En-tête question — fixe */}
                <div className={`bg-gradient-to-r ${meta.color} px-5 py-3 flex items-center justify-between relative z-20 flex-shrink-0`}>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-black text-sm">Question {currentQ + 1}</span>
                    <span className="text-white/60 text-xs">/ {questions.length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {q?.level && <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">{q.level}</span>}
                    {answers[currentQ]
                      ? <span className="bg-white/30 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">✓ Répondue</span>
                      : <span className="bg-black/10 text-white/70 text-xs px-2.5 py-0.5 rounded-full">Non répondue</span>}
                  </div>
                </div>

                {/* ── CE : passage scrollable + question fixe + options fixes ── */}
                {sectionCode === 'CE' && (
                  <>
                    <div className="flex-1 overflow-y-auto relative z-20 px-6 select-none [&::-webkit-scrollbar]:hidden flex flex-col justify-center"
                      style={{ userSelect: 'none', WebkitUserSelect: 'none', scrollbarWidth: 'none' } as React.CSSProperties}>
                      {cePassageParagraphs.map((para, i) => (
                        <p key={i} className={`text-slate-700 ${cePassageFontSize} leading-relaxed text-center`}>
                          {para}
                        </p>
                      ))}
                    </div>

                    <div className="flex-shrink-0 relative z-20 px-5 pb-3 pt-3 border-t border-slate-100">
                      <div className="bg-red-50 border border-red-200 rounded-2xl px-5 py-3.5 select-none"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                        <p className="text-slate-900 font-bold text-[17px] leading-snug text-center">
                          {ceActualQuestion}
                        </p>
                      </div>
                    </div>

                    <div className="flex-shrink-0 px-5 pb-4 pt-2 grid grid-cols-2 gap-2.5 relative z-20 bg-white">
                      {Object.entries(q?.options ?? {}).map(([key, val]) => {
                        const isSelected = answers[currentQ] === key;
                        return (
                          <motion.button key={key} onClick={() => selectAnswer(key)}
                            whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }}
                            className={`w-full text-left px-4 py-3 rounded-xl border-2 font-medium transition-all flex items-start gap-3 text-[13px] select-none
                              ${isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/40 text-slate-700'}`}
                            style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                            <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 transition-all ${isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {key.toUpperCase()}
                            </span>
                            <span className="leading-snug">{renderBold(String(val))}</span>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="relative z-20 flex-shrink-0"><ExamSignature /></div>
                  </>
                )}

                {/* ── CO : image fixe + question + audio + options ── */}
                {sectionCode === 'CO' && (
                  <>
                    {/* Zone image — hauteur fixe, logo si pas d'image */}
                    <div className="mx-5 mt-4 h-72 rounded-2xl overflow-hidden border border-sky-100 flex items-center justify-center flex-shrink-0 relative z-20 bg-gradient-to-br from-sky-50 to-slate-50">
                      {q?.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.imageUrl} alt="Document" className="w-full h-full object-contain select-none" draggable={false} onContextMenu={e => e.preventDefault()} />
                      ) : (
                        <div className="flex flex-col items-center gap-2 select-none pointer-events-none">
                          <span className="text-6xl">🍁</span>
                          <span className="text-sm font-black text-sky-600 tracking-wide">RéussirTCF</span>
                        </div>
                      )}
                    </div>

                    {/* Thème + Question */}
                    <div className="px-5 pt-4 pb-2 relative z-20">
                      {q?.theme && <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-2 select-none">📄 {q.theme}</div>}
                      <p className="text-slate-800 font-bold text-base leading-relaxed select-none"
                        style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                        {q?.question}
                      </p>
                    </div>

                    {/* AudioPlayer — juste au-dessus des propositions */}
                    {(q?.audioUrl || q?.transcript) && (() => {
                      // Durée totale (audio + réponse) par niveau — basé sur TCF CO officiel
                      // A1: 1m42s/4q ≈ 25s audio + 15s | A2: 3m19s/6q ≈ 33s+17s
                      // B1: 6m32s/9q ≈ 44s+16s | B2: 8m22s/10q ≈ 50s+20s
                      // C1: 6m09s/6q ≈ 62s+18s | C2: 3m47s/4q ≈ 57s+18s
                      const CO_TIME: Record<string, number> = { A1: 40, A2: 50, B1: 60, B2: 70, C1: 80, C2: 75 };
                      const tSec = CO_TIME[q.level ?? ''] ?? 75;
                      return (
                        <div className="px-5 pb-3 relative z-20">
                          <AudioPlayer
                            transcript={q.transcript ?? ''}
                            audioUrl={q.audioUrl}
                            timeLimitSec={tSec}
                            onTimeUp={() => {
                              if (currentQ < questions.length - 1) setCurrentQ(i => i + 1);
                              else submitExam();
                            }}
                          />
                        </div>
                      );
                    })()}

                    {/* Options */}
                    <div className="px-5 pb-4 grid grid-cols-2 gap-2.5 relative z-20">
                      {Object.entries(q?.options ?? {}).map(([key, val]) => {
                        const isSelected = answers[currentQ] === key;
                        return (
                          <motion.button key={key} onClick={() => selectAnswer(key)}
                            whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }}
                            className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all flex items-start gap-3 text-sm select-none
                              ${isSelected ? 'border-sky-500 bg-sky-50 text-sky-700' : 'border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40 text-slate-700'}`}
                            style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                            <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${isSelected ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              {key.toUpperCase()}
                            </span>
                            <span className="leading-snug">{renderBold(String(val))}</span>
                          </motion.button>
                        );
                      })}
                    </div>
                    <div className="relative z-20 flex-shrink-0"><ExamSignature /></div>
                  </>
                )}

                {/* ── Autres QCM (non CE, non CO) ── */}
                {sectionCode !== 'CE' && sectionCode !== 'CO' && (
                  <>
                    <div className="relative z-20">
                      {q?.theme && (
                        <div className="px-5 pt-4 text-xs text-slate-400 font-semibold uppercase tracking-wider select-none">
                          {q.theme}
                        </div>
                      )}
                      <div className="px-5 py-4">
                        <p className="text-slate-800 font-medium text-base leading-relaxed whitespace-pre-line select-none"
                          style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                          {q?.question}
                        </p>
                      </div>
                      <div className="px-5 pb-4 grid grid-cols-2 gap-2.5">
                        {Object.entries(q?.options ?? {}).map(([key, val]) => {
                          const isSelected = answers[currentQ] === key;
                          return (
                            <motion.button key={key} onClick={() => selectAnswer(key)}
                              whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }}
                              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 font-medium transition-all flex items-start gap-3 text-sm select-none
                                ${isSelected ? 'border-red-500 bg-red-50 text-red-700' : 'border-slate-200 bg-white hover:border-red-300 hover:bg-red-50/40 text-slate-700'}`}
                              style={{ userSelect: 'none', WebkitUserSelect: 'none' } as React.CSSProperties}>
                              <span className={`w-8 h-8 rounded-lg text-xs font-black flex items-center justify-center flex-shrink-0 transition-all mt-0.5 ${isSelected ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                                {key.toUpperCase()}
                              </span>
                              <span className="leading-snug">{renderBold(String(val))}</span>
                            </motion.button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="relative z-20 flex-shrink-0"><ExamSignature /></div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Barre nav — même largeur max que la carte pour CE */}

            {/* Précédent / Suivant / Soumettre */}
            <div className={`flex items-center justify-between gap-3 ${sectionCode === 'CE' ? 'w-full max-w-2xl' : ''}`}>
              <button onClick={() => setCurrentQ(q => Math.max(0, q - 1))} disabled={currentQ === 0}
                className="flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-slate-200 bg-white text-slate-700 font-bold hover:border-red-300 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm">
                ← Précédent
              </button>

              <div className="flex flex-col items-center gap-1 text-center">
                <div className="text-xs text-slate-500">
                  <span className="font-black text-emerald-600">{answeredCount}</span>
                  <span className="text-slate-400"> / {questions.length} répondues</span>
                </div>
                {(sectionCode === 'CE' || sectionCode === 'CO') && q?.level && (() => {
                  const clr = LEVEL_CLR[q.level] ?? LEVEL_CLR.B2;
                  const pts = LEVEL_PTS[q.level] ?? 0;
                  return (
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[11px] font-black px-2 py-0.5 rounded-md border shadow-sm ${clr.bg} ${clr.border} ${clr.text}`}>
                        {q.level}
                      </span>
                      <span className="text-[11px] font-black text-amber-500">
                        +{pts} pts
                      </span>
                    </div>
                  );
                })()}
              </div>

              {currentQ < questions.length - 1 ? (
                <button onClick={() => setCurrentQ(q => Math.min(questions.length - 1, q + 1))}
                  disabled={sectionCode === 'CE' && !answers[currentQ]}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-red-600 text-white font-bold hover:bg-red-700 transition-all text-sm disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-red-700">
                  Suivant →
                </button>
              ) : (
                <button onClick={submitExam}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl text-white font-bold transition-all text-sm shadow
                    ${answeredCount === questions.length ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`}>
                  {answeredCount === questions.length ? '✓ Soumettre l\'examen' : 'Terminer →'}
                </button>
              )}
            </div>
          </div>

          {/* ── Panneau navigation desktop ── */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
              <h3 className="font-black text-slate-800 text-sm mb-3">Navigation des questions</h3>

              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4 text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Actuelle</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Répondue</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Non rép.</div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-4">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQ(i)}
                    className={`w-7 h-7 rounded text-xs font-bold transition-all
                      ${i === currentQ ? 'bg-red-600 text-white ring-2 ring-red-300 ring-offset-1' :
                        answers[i] ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' :
                        'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>

              <div className="border-t border-slate-100 pt-3 mb-4 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-500"><span>Répondues</span><span className="font-black text-emerald-600">{answeredCount}</span></div>
                <div className="flex justify-between text-slate-500"><span>Non répondues</span><span className="font-black">{questions.length - answeredCount}</span></div>
                <div className="flex justify-between text-slate-500"><span>Total</span><span className="font-black">{questions.length}</span></div>
              </div>

              <button onClick={submitExam}
                className={`w-full py-3 rounded-xl text-white font-black text-sm transition-all shadow mb-2
                  ${answeredCount === questions.length ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-red-600 hover:bg-red-700'}`}>
                {answeredCount === questions.length ? '✓ Soumettre l\'examen' : `Soumettre (${answeredCount}/${questions.length})`}
              </button>

              <button onClick={() => setShowQuitModal(true)}
                className="w-full py-2 rounded-xl text-red-500 font-bold text-xs hover:bg-red-50 transition-all border border-red-200">
                Quitter l&apos;examen
              </button>
            </div>
          </div>
        </div>

        {/* ── Nav mobile — bouton flottant ── */}
        <div className="lg:hidden fixed bottom-4 right-4 z-50">
          <button onClick={() => setNavOpen(v => !v)}
            className={`w-14 h-14 rounded-2xl shadow-lg flex flex-col items-center justify-center gap-0.5 text-white transition-all
              ${navOpen ? 'bg-slate-700' : 'bg-red-600'}`}>
            <span className="text-xs font-black">{answeredCount}/{questions.length}</span>
            <span className="text-base">{navOpen ? '✕' : '☰'}</span>
          </button>
        </div>

        <AnimatePresence>
          {navOpen && (
            <motion.div initial={{ opacity: 0, y: 80 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 80 }}
              className="lg:hidden fixed inset-x-0 bottom-0 z-40 bg-white rounded-t-3xl shadow-2xl border-t border-slate-200 p-5 pb-8">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-black text-slate-800 text-sm">Navigation des questions</h3>
                <button onClick={() => setNavOpen(false)} className="text-slate-400 text-lg">✕</button>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs mb-4 text-slate-500">
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-red-500 inline-block" />Actuelle</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-400 inline-block" />Répondue</div>
                <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-slate-200 inline-block" />Non rép.</div>
              </div>
              <div className="grid grid-cols-10 gap-1.5 mb-5">
                {questions.map((_, i) => (
                  <button key={i} onClick={() => { setCurrentQ(i); setNavOpen(false); }}
                    className={`h-8 rounded text-xs font-bold transition-all
                      ${i === currentQ ? 'bg-red-600 text-white' :
                        answers[i] ? 'bg-emerald-100 text-emerald-700' :
                        'bg-slate-100 text-slate-600'}`}>
                    {i + 1}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setNavOpen(false); submitExam(); }}
                  className="flex-1 py-3 rounded-xl text-white font-black text-sm bg-red-600 hover:bg-red-700 transition-colors">
                  Soumettre ({answeredCount}/{questions.length})
                </button>
                <button onClick={() => { setNavOpen(false); setShowQuitModal(true); }}
                  className="px-4 py-3 rounded-xl text-red-500 font-bold text-xs border border-red-200 hover:bg-red-50">
                  Quitter
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ════════════════════════════════════════════════════════════
  // SESSION EE/EO — 3 tâches avec timer + sidebar navigation
  // ════════════════════════════════════════════════════════════
  if (meta.isWritten && task) {
    return (
      <div className="min-h-screen bg-slate-50">
        {quitModalJSX}
        <ExamHeader />

        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-6 flex gap-6">
          {/* Zone principale */}
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex justify-center">
              <SophieAvatar mood={mood} size="sm" showMessage={true} />
            </div>

            {sectionCode !== 'EO' && (
              <div className="flex items-center gap-2 flex-wrap">
                <div className={`px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${meta.color} text-white`}>Tâche {task.taskNumber}/3</div>
                {task.wordCountMin && task.wordCountMax && <div className="text-xs text-slate-500 bg-white px-2.5 py-1 rounded-full border border-slate-200">{task.wordCountMin}–{task.wordCountMax} mots</div>}
                {task.timeLimitMin && <div className="text-xs text-slate-400 bg-white px-2.5 py-1 rounded-full border border-slate-200">⏱ ~{task.timeLimitMin} min</div>}
              </div>
            )}

            <AnimatePresence mode="wait">
              <motion.div key={`task-${currentTask}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">

                {sectionCode === 'EO' && task.taskNumber && EO_TASK_META[task.taskNumber] ? (() => {
                  const eoMeta = EO_TASK_META[task.taskNumber!];
                  return (
                    <>
                      <div className={`bg-gradient-to-r ${eoMeta.gradient} px-5 py-3 flex items-center justify-between`}>
                        <div className="flex items-center gap-2">
                          <span className="text-white font-black text-sm">{eoMeta.icon} Tâche {task.taskNumber}</span>
                          <span className="text-white/80 text-xs">— {eoMeta.label}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {eoMeta.prep && (
                            <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">⏳ {eoMeta.prep}</span>
                          )}
                          <span className="bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full">⏱ {eoMeta.duration}</span>
                          <span className="bg-white/30 text-white text-xs font-black px-2.5 py-0.5 rounded-full">{eoMeta.points}</span>
                        </div>
                      </div>
                      <div className="px-5 py-4 space-y-3">
                        {task.theme && (
                          <div className="text-xs text-slate-400 font-semibold uppercase tracking-wider">🏷 {task.theme}</div>
                        )}
                        <div className={`rounded-xl p-4 border ${eoMeta.bgColor} ${eoMeta.borderColor}`}>
                          <p className={`text-xs font-black uppercase tracking-wider mb-2 ${eoMeta.color}`}>{eoMeta.consigneLabel}</p>
                          <p className="text-sm text-slate-700 leading-relaxed">{task.question}</p>
                        </div>
                      </div>
                    </>
                  );
                })() : (
                  <>
                    <div className={`bg-gradient-to-r ${meta.color} px-5 py-3`}>
                      <span className="text-white font-black text-sm">
                        ✍️ Expression Écrite{task.theme ? ` · ${task.theme}` : ''}
                      </span>
                    </div>
                    <div className="p-5 space-y-3">
                      {task.taskNumber === 3 ? (() => {
                        const { sujet, docs } = parseT3(task.question);
                        return (
                          <>
                            {sujet && (
                              <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                                <p className="text-xs font-black text-violet-700 uppercase tracking-wider mb-2">📋 Sujet</p>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed">{sujet}</p>
                              </div>
                            )}
                            {docs.length >= 2 ? (
                              <>
                                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                                  <p className="text-xs font-black text-sky-700 uppercase tracking-wider mb-2">🔵 Document 1 — Argument POUR</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{docs[0]}</p>
                                </div>
                                <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                                  <p className="text-xs font-black text-orange-700 uppercase tracking-wider mb-2">🟠 Document 2 — Argument CONTRE</p>
                                  <p className="text-sm text-slate-700 leading-relaxed">{docs[1]}</p>
                                </div>
                              </>
                            ) : (
                              <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
                                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{task.question}</p>
                              </div>
                            )}
                          </>
                        );
                      })() : (
                        <p className="text-slate-800 font-medium text-sm leading-relaxed whitespace-pre-line">{task.question}</p>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>

            {!taskCorrections[currentTask] && !taskSubmitted[currentTask] && (
              <div className="space-y-3">
                {sectionCode === 'EO' && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-2.5 flex items-center gap-2">
                    <span className="text-amber-500 text-base">📝</span>
                    <div>
                      <p className="text-xs font-black text-amber-700">Plan de réponse orale</p>
                      <p className="text-xs text-amber-600">Notez vos idées avant de parler — Sophie les analysera pour vous coacher</p>
                    </div>
                  </div>
                )}
                <div className="relative">
                  <textarea value={taskAnswers[currentTask]} onChange={e => updateAnswer(e.target.value)}
                    placeholder={
                      sectionCode === 'EE'
                        ? 'Rédigez votre texte ici...'
                        : task.taskNumber === 1
                          ? "Notez les points clés : qui vous êtes, votre famille, vos loisirs, votre travail ou vos études..."
                          : task.taskNumber === 2
                            ? "Notez votre stratégie : rôle à jouer, questions à poser, informations à obtenir ou problème à résoudre..."
                            : "Structurez votre argumentation : introduction, arguments (pour/contre), exemples, conclusion personnelle..."
                    }
                    rows={sectionCode === 'EE' ? 9 : 6}
                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100 transition-all resize-none" />
                  {task.wordCountMin && (
                    <div className="absolute bottom-3 right-3">
                      <WordCount text={taskAnswers[currentTask]} min={task.wordCountMin} max={task.wordCountMax ?? undefined} />
                    </div>
                  )}
                </div>

                {studentClasses.length > 1 && (
                  <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-red-400">
                    <option value="">— Solo —</option>
                    {studentClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                )}

                <div className={`grid gap-2 ${studentClasses.length > 0 ? 'sm:grid-cols-2' : ''}`}>
                  <div className="flex flex-col gap-1.5">
                    <motion.button onClick={handleCorrectWithSophie} disabled={correcting || !taskAnswers[currentTask].trim()}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold py-3.5 rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      {correcting
                        ? <><Spinner size={18} color="#fff" /> Analyse en cours...</>
                        : sectionCode === 'EO'
                          ? '🎤 Analyser mon plan avec Sophie'
                          : '✨ Corriger avec Sophie (IA)'
                      }
                    </motion.button>
                    {correctionError && (
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                        <span className="flex-shrink-0 mt-0.5">⚠️</span>
                        <span>
                          {correctionError === 'plan_required'
                            ? <>La correction IA est réservée aux abonnés. <a href="/pricing" className="font-bold underline">Voir nos offres →</a></>
                            : correctionError === 'session_expired'
                            ? <>Session expirée. <a href="/login" className="font-bold underline">Reconnecte-toi</a></>
                            : correctionError}
                        </span>
                      </div>
                    )}
                  </div>
                  {studentClasses.length > 0 && (
                    <motion.button onClick={handleSubmitToProf} disabled={submitting || !taskAnswers[currentTask].trim() || (studentClasses.length > 1 && !selectedClassId)}
                      whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                      className="w-full bg-gradient-to-r from-emerald-600 to-teal-500 text-white font-bold py-3.5 rounded-xl shadow disabled:opacity-50 flex items-center justify-center gap-2 text-sm">
                      {submitting ? <><Spinner size={18} color="#fff" /> Envoi...</> : '👨‍🏫 Soumettre au professeur'}
                    </motion.button>
                  )}
                </div>
              </div>
            )}

            {taskSubmitted[currentTask] && !taskCorrections[currentTask] && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border-2 border-emerald-200 rounded-2xl p-6 text-center space-y-2">
                <div className="text-4xl">📨</div>
                <h3 className="font-black text-emerald-800">Tâche {task.taskNumber} soumise au professeur</h3>
                <div className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-600 text-xs font-semibold px-3 py-1.5 rounded-full">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />En attente de correction
                </div>
              </motion.div>
            )}

            {taskCorrections[currentTask] && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 space-y-4">
                <div className="flex items-center gap-4">
                  <ScoreRing score={taskCorrections[currentTask]!.score} size={72} />
                  <div>
                    <div className="font-black text-slate-800 text-base">Correction — Tâche {task.taskNumber}</div>
                    <div className="text-xs text-slate-500">Sophie IA · Section {sectionCode}</div>
                  </div>
                </div>
                {taskCorrections[currentTask]!.strengths.length > 0 && (
                  <div><div className="text-sm font-bold text-emerald-700 mb-1">✅ Points forts</div>
                    <ul className="text-sm text-slate-600 space-y-1">{taskCorrections[currentTask]!.strengths.map((s, i) => <li key={i}>• {s}</li>)}</ul>
                  </div>
                )}
                {taskCorrections[currentTask]!.errors.length > 0 && (
                  <div><div className="text-sm font-bold text-red-600 mb-1">❌ À corriger</div>
                    <ul className="space-y-2">{taskCorrections[currentTask]!.errors.map((e, i) => (
                      <li key={i} className="bg-red-50 rounded-lg px-3 py-2 text-sm">
                        <span className="line-through text-red-400">{e.text}</span>{' → '}
                        <span className="text-emerald-600 font-medium">{e.correction}</span>
                        <div className="text-xs text-slate-500 mt-0.5">Règle : {e.rule}</div>
                      </li>
                    ))}</ul>
                  </div>
                )}
                {taskCorrections[currentTask]!.tips.length > 0 && (
                  <div><div className="text-sm font-bold text-red-600 mb-1">💡 Conseils</div>
                    <ul className="text-sm text-slate-600 space-y-1">{taskCorrections[currentTask]!.tips.map((t, i) => <li key={i}>• {t}</li>)}</ul>
                  </div>
                )}
              </motion.div>
            )}

            {canAdvanceTask && (
              <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                onClick={handleTaskNext} whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                className="w-full bg-gradient-to-r from-red-600 to-rose-500 text-white font-bold py-4 rounded-xl shadow">
                {currentTask + 1 >= (session?.tasks.length ?? 0) ? '🏁 Terminer la session' : `Tâche ${currentTask + 2} →`}
              </motion.button>
            )}
          </div>

          {/* ── Sidebar EE/EO ── */}
          <div className="hidden lg:block w-56 flex-shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sticky top-20">
              <h3 className="font-black text-slate-800 text-sm mb-4">Progression</h3>
              <div className="space-y-2 mb-5">
                {[1, 2, 3].map(n => {
                  const i = n - 1;
                  const corrected = taskCorrections[i] !== null;
                  const submitted = taskSubmitted[i];
                  const isCurrent = currentTask === i;
                  return (
                    <button key={n} onClick={() => setCurrentTask(i)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all text-sm
                        ${isCurrent ? `bg-gradient-to-r ${meta.color} text-white shadow` :
                          corrected || submitted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'}`}>
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black flex-shrink-0
                        ${isCurrent ? 'bg-white/20' : corrected || submitted ? 'bg-emerald-400 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        {corrected || submitted ? '✓' : n}
                      </span>
                      <div>
                        <div className="font-bold text-xs">Tâche {n}</div>
                        <div className={`text-xs ${isCurrent ? 'text-white/70' : 'opacity-60'}`}>
                          {isCurrent ? 'En cours' : corrected ? 'Corrigée' : submitted ? 'Soumise' : 'À faire'}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {session?.theme && (
                <div className="border-t border-slate-100 pt-3 mb-4 text-xs text-slate-500">
                  <span className="font-bold">Thème :</span> <span className="capitalize">{session.theme}</span>
                </div>
              )}
              <button onClick={() => setShowQuitModal(true)}
                className="w-full py-2 rounded-xl text-red-500 font-bold text-xs hover:bg-red-50 transition-all border border-red-200">
                Quitter l&apos;examen
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner size={40} />
    </div>
  );
}

export default function PracticePage() {
  return <Suspense fallback={null}><PracticePageInner /></Suspense>;
}
