# CHANGELOG — FrançaisIA

## [1.1.0] — 2026-06-12 · Migration base de données

### Modifié
- Migration de Supabase vers **Neon** (PostgreSQL serverless)
- Remplacement de `@supabase/supabase-js` par `@neondatabase/serverless` dans les 3 services
- Requêtes SQL templateées (tagged template literals Neon) — plus performant et typé
- Une seule `DATABASE_URL` partagée entre les services (au lieu de 3 connexions Supabase séparées)
- Migrations SQL simplifiées (suppression des politiques RLS Supabase)
- `docker-compose.yml` mis à jour pour injecter `DATABASE_URL` dans chaque service

---

## [1.0.0] — 2026-06-12 · Fondateur Solo

### Ajouté
- Architecture microservices complète (auth, content, ai, progress)
- API Gateway Express.js avec middleware JWT
- Supabase comme base de données (PostgreSQL managé)
- Redis pour blacklist tokens et cache sessions
- Docker Compose pour l'orchestration locale
- **auth-service** : inscription, connexion, refresh token, logout (JWT HS256)
- **content-service** : banque de questions TCF Canada (CO, CE, EE, EO) + seed
- **ai-service** : intégration Claude claude-sonnet-4-6 — correction EE/EO, chat streaming, explications grammaticales
- **progress-service** : enregistrement résultats, dashboard stats, historique
- **Frontend Next.js 16** avec :
  - Page d'accueil animée (Framer Motion)
  - Inscription / Connexion
  - Dashboard avec ScoreRing et progression par section
  - Pages de pratique par compétence (QCM + expression libre avec correction IA)
  - Examen simulé complet (4 sections)
  - Chat en temps réel avec Sophie (streaming SSE)
  - Avatar IA Sophie avec 6 états d'humeur animés
- Migrations SQL Supabase pour les 3 schémas (users, questions, results)
- Sécurité : helmet, rate limiting, validation zod, CORS strict sur tous les services

### Stack
- Frontend : Next.js 16 · TypeScript · Tailwind CSS v4 · Framer Motion · DiceBear
- Backend : Node.js · Express · TypeScript
- Database : Supabase (PostgreSQL) · Redis
- IA : Anthropic Claude claude-sonnet-4-6
- Infra : Docker · Docker Compose

---

## À venir

### [1.1.0] — Prévu
- [ ] Authentification OAuth (Google)
- [ ] Audio réel pour Compréhension Orale (CO)
- [ ] Enregistrement vocal pour Expression Orale (EO)
- [ ] Paiement Stripe (abonnement premium)
- [ ] Notifications email (rappels de pratique)
- [ ] Classement communautaire

### [2.0.0] — Prévu 2027
- [ ] Application mobile React Native
- [ ] Parcours d'apprentissage personnalisé par IA
- [ ] Partenariats écoles de langue
