import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function seed() {
  console.log('Seeding questions TCF Canada avec Prisma...');

  await prisma.question.createMany({
    skipDuplicates: true,
    data: [
      // ── Compréhension des Écrits (CE) ─────────────────────────────
      {
        section: 'CE', level: 'B1',
        question: 'Lisez le texte : "Le Canada accueille chaque année des centaines de milliers d\'immigrants. Pour s\'installer, les candidats doivent passer plusieurs tests de langue française." — Quel est l\'objectif principal de ce texte ?',
        options: { a: 'Expliquer comment obtenir la citoyenneté', b: 'Informer sur les exigences linguistiques pour immigrer', c: 'Décrire la culture canadienne', d: 'Présenter les villes du Canada' },
        answer: 'b',
        explanation: 'Le texte parle des tests de langue requis pour s\'installer au Canada.',
      },
      {
        section: 'CE', level: 'B2',
        question: 'Dans l\'annonce : "Poste à pourvoir : conseiller(ère) en immigration. Bilinguisme français-anglais exigé. Expérience de 3 ans minimum." — Quelle compétence est OBLIGATOIRE ?',
        options: { a: 'Avoir 3 ans d\'expérience uniquement', b: 'Parler trois langues', c: 'Être bilingue et avoir 3 ans d\'expérience', d: 'Connaître le droit canadien' },
        answer: 'c',
        explanation: 'Les deux conditions sont "exigées" donc obligatoires.',
      },
      // ── Compréhension de l\'Oral (CO) ──────────────────────────────
      {
        section: 'CO', level: 'B1',
        question: 'Vous entendez : "Bienvenue à Montréal ! Les transports en commun sont excellents ici. Le métro fonctionne jusqu\'à minuit trente." — Jusqu\'à quelle heure fonctionne le métro ?',
        options: { a: 'Minuit', b: 'Minuit trente', c: 'Une heure du matin', d: 'Onze heures trente' },
        answer: 'b',
        explanation: 'Le locuteur dit clairement "jusqu\'à minuit trente".',
      },
      {
        section: 'CO', level: 'A2',
        question: 'Vous entendez : "Attention, le train à destination de Québec partira du quai numéro cinq à quatorze heures." — De quel quai part le train ?',
        options: { a: 'Quai 4', b: 'Quai 3', c: 'Quai 5', d: 'Quai 2' },
        answer: 'c',
        explanation: 'L\'annonce précise "quai numéro cinq".',
      },
      // ── Expression Écrite (EE) ─────────────────────────────────────
      {
        section: 'EE', level: 'B1',
        question: 'Vous avez reçu une offre d\'emploi à Montréal. Écrivez un email de remerciement à l\'employeur (80-100 mots) en précisant votre motivation et votre disponibilité.',
        options: null, answer: null,
        explanation: 'Critères : salutation formelle, remerciement, motivation, disponibilité, formule de politesse.',
      },
      {
        section: 'EE', level: 'B2',
        question: 'Rédigez une lettre de motivation (150-200 mots) pour un poste de technicien(ne) en informatique dans une entreprise québécoise.',
        options: null, answer: null,
        explanation: 'Critères : structure, vocabulaire professionnel, cohérence, registre soutenu.',
      },
      // ── Expression Orale (EO) ──────────────────────────────────────
      {
        section: 'EO', level: 'B1',
        question: 'Décrivez votre ville natale en 2-3 minutes. Parlez du climat, des habitants, des activités et de ce qui vous manque.',
        options: null, answer: null,
        explanation: 'Critères : fluidité, vocabulaire, structures variées, organisation.',
      },
      {
        section: 'EO', level: 'B2',
        question: 'Donnez votre opinion : "L\'immigration est-elle un atout ou un défi pour le Canada ?" Développez avec des exemples concrets.',
        options: null, answer: null,
        explanation: 'Critères : argumentation structurée, connecteurs logiques, nuance.',
      },
    ],
  });

  console.log('✓ Questions insérées avec succès.');
  await prisma.$disconnect();
}

seed().catch(e => { console.error(e); prisma.$disconnect(); process.exit(1); });
