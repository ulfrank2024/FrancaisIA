# API Reference — FrançaisIA

Base URL : `http://localhost:4000`

Toutes les routes protégées nécessitent : `Authorization: Bearer <accessToken>`

---

## Auth Service `/api/auth`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/auth/register` | ❌ | Inscription |
| POST | `/api/auth/login` | ❌ | Connexion |
| POST | `/api/auth/refresh` | ❌ | Renouveler le token |
| POST | `/api/auth/logout` | ✅ | Déconnexion |

### POST `/api/auth/register`
```json
{ "email": "user@example.com", "password": "motdepasse8+", "fullName": "Jean Dupont" }
```
Réponse : `{ accessToken, refreshToken, user: { id, email, full_name } }`

### POST `/api/auth/login`
```json
{ "email": "user@example.com", "password": "motdepasse8+" }
```

---

## Content Service `/api/questions`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| GET | `/api/questions` | ✅ | Liste des questions |
| GET | `/api/questions/mock-exam` | ✅ | Examen complet simulé |
| GET | `/api/questions/:id` | ✅ | Une question avec réponse |

### GET `/api/questions?section=CE&level=B2&limit=10`
Paramètres : `section` (CO|CE|EE|EO), `level` (A1–C2), `limit` (1–50)

---

## AI Service `/api/ai`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/ai/correct` | ✅ | Correction EE/EO par IA |
| POST | `/api/ai/chat` | ✅ | Chat streaming avec Sophie |
| POST | `/api/ai/explain` | ✅ | Explication grammaticale |

### POST `/api/ai/correct`
```json
{ "text": "Ma réponse...", "section": "EE", "prompt": "Écrivez une lettre..." }
```
Réponse : `{ score, strengths[], errors[{text, correction, rule}], correctedVersion, tips[] }`

### POST `/api/ai/chat` (Server-Sent Events)
```json
{ "messages": [{ "role": "user", "content": "Comment conjuguer..." }] }
```
Stream SSE : `data: { "text": "..." }\n\n` · Fin : `data: [DONE]\n\n`

---

## Progress Service `/api/progress`

| Méthode | Route | Auth | Description |
|---------|-------|------|-------------|
| POST | `/api/progress/results` | ✅ | Enregistrer un résultat |
| GET | `/api/progress/dashboard/:userId` | ✅ | Stats globales |
| GET | `/api/progress/history/:userId` | ✅ | Historique (50 derniers) |

### POST `/api/progress/results`
```json
{
  "userId": "uuid",
  "section": "CE",
  "score": 75,
  "total": 10,
  "correct": 8,
  "durationSeconds": 420
}
```
