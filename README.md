# Bolo237 Monorepo

Bolo237 est compose de trois applications principales :

- `backend/` : API Express + Prisma (PostgreSQL)
- `frontend/` : site public Next.js
- `admin-Bolo237/` : portail admin Next.js

Ce README sert de reference unique pour lancer le projet localement et comprendre les choix d'architecture et de securite.

## 1. Prerequis

- Node.js 22.12.x (recommande)
- npm 10+
- PostgreSQL (local ou distant)
- Redis (optionnel mais recommande pour rate limiting distribue)
- Docker Desktop (optionnel, pour execution conteneurisee)

## 2. Installation locale

Depuis la racine du repo, installer les dependances de chaque app :

```bash
cd backend && npm install
cd ../frontend && npm install
cd ../admin-Bolo237 && npm install
```

## 3. Configuration des variables d'environnement

### Backend

```bash
cd backend
cp .env.example .env
```

Variables critiques a renseigner en priorite dans `backend/.env` :

- `DATABASE_URL`
- `SESSION_JWT_SECRET`
- `CORS_ALLOWED_ORIGINS`
- `PUBLIC_WEB_URL`
- `MASTER_OTP` (fortement recommande en production)

### Frontend public

```bash
cd frontend
cp .env.example .env
```

Variables minimales :

- `NEXT_PUBLIC_API_URL` (ex: `http://localhost:5000`)
- `BACKEND_INTERNAL_URL` (souvent identique en local)

### Admin

```bash
cd admin-Bolo237
cp .env.example .env
```

Variables minimales :

- `NEXT_PUBLIC_API_URL`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `ADMIN_BACKEND_EMAIL`
- `ADMIN_BACKEND_PASSWORD`

## 4. Lancement local (mode developpement)

Ouvrir 3 terminaux.

### Terminal 1 : backend

```bash
cd backend
npx prisma generate
npx prisma db push
npm run dev
```

API locale: `http://localhost:5000`

### Terminal 2 : frontend public

```bash
cd frontend
npm run dev
```

Site public local: `http://localhost:3001`

### Terminal 3 : admin

```bash
cd admin-Bolo237
npm run dev
```

Portail admin local: `http://localhost:3000/login`

## 5. Lancement en mode production local (verification build)

### Backend

```bash
cd backend
npm run build
npm run start
```

### Frontend public

```bash
cd frontend
npm run build
npm run start
```

### Admin

```bash
cd admin-Bolo237
npm run build
npm run start
```

## 6. Docker local

### Frontend public

```bash
cd frontend
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

### Admin

```bash
cd admin-Bolo237
cp .env.example .env
docker compose up -d --build
docker compose logs -f
```

Arret:

```bash
docker compose down
```

## 7. Architecture applicative

### Vue d'ensemble

```text
        +---------------------------+
        |      Utilisateurs         |
        |  Web public + Admin ops  |
        +-------------+-------------+
                |
      +------------------+------------------+
      |                                     |
   +--------v--------+                  +---------v---------+
   |  Frontend App   |                  |   Admin App       |
   |  Next.js public |                  | Next.js portail   |
   +--------+--------+                  +---------+---------+
      |                                     |
      | API HTTP                            | Proxy serveur
      |                                     | /api/backend/*
      |                                     |
      +------------------+------------------+
                |
          +--------v--------+
          | Backend API     |
          | Express + Prisma|
          +----+-------+----+
            |       |
        +---------v-+   +-v----------------+
        |PostgreSQL |   | Redis (rate-limit)|
        +-----------+   +-------------------+
```

- Le navigateur parle au backend via API HTTP.
- Le frontend public et le portail admin sont separes.
- L'admin ne consomme pas le backend directement depuis le navigateur pour les actions sensibles:
  - il passe par un proxy serveur Next (`/api/backend/[...path]`),
  - puis ouvre une session backend avec un compte admin technique.

### Backend

- Express 5 + middlewares de securite (`helmet`, CORS strict, CSRF, rate-limiters).
- Auth utilisateur basee sur session JWT en cookie `httpOnly`.
- Prisma + PostgreSQL pour la persistance.
- OTP, notifications, feedbacks, reviews, uploads, moderation.

### Base de donnees

- Relations critiques renforcees avec suppression en cascade sur les liens necessaires.
- `SavedJob` est relie explicitement a `User` et `Job`, avec nettoyage automatique en cas de suppression parent.
- Index ajoutes sur colonnes de filtre/recherche pour stabiliser les performances.

## 8. Regles de securite obligatoires (a respecter)

### 8.1 Authentification et autorisation

- Ne jamais faire confiance a une identite envoyee par le client (`userId`, `reviewerId`, etc.).
- Toute identite doit etre derivee de la session serveur.
- Toute route sensible doit imposer un middleware d'auth (`requireUserSession` ou equivalent).

### 8.2 Donnees cote navigateur

- Aucune donnee sensible dans `localStorage` (token, email, phone, id, role d'autorisation backend).
- Les donnees UI eventuellement persistees doivent rester non sensibles.

### 8.3 XSS et rendu HTML

- Eviter `dangerouslySetInnerHTML` hors cas strictement necessaires.
- Pour les scripts JSON-LD, utiliser la serialisation securisee (`safeJsonLd`) pour empecher l'injection `</script>`.

### 8.4 Uploads

- Toujours valider type MIME + extension + taille.
- Ne jamais utiliser un chemin de fichier non valide depuis le client.
- Preferer Cloudinary en production; fallback local uniquement controle.

### 8.5 CSRF, CORS, rate limiting

- Conserver CSRF actif sur routes mutation.
- Restreindre `CORS_ALLOWED_ORIGINS` aux domaines necessaires.
- Ne pas supprimer les limites de debit (IP, endpoint, OTP, feedback, reviews, uploads).

### 8.6 CI/CD et supply chain

- Actions GitHub pinnees par SHA immuable.
- Permissions minimales dans workflows (`contents: read` quand possible).
- Conserver le test de regression securite backend:

```bash
cd backend
npm run test:security-routes
```

### 8.7 Conteneurs

- Images multi-stage obligatoires (deps/builder/runner).
- Conteneurs non-root obligatoires.
- `no-new-privileges:true` recommande en compose.

## 9. Qualite et verification avant merge

Checklist minimale avant merge:

```bash
# Backend
cd backend && npm run test:security-routes

# Frontend
cd ../frontend && npx tsc --noEmit && npm run build

# Admin
cd ../admin-Bolo237 && npx tsc --noEmit && npm run build
```

## 10. Notes pour contributeurs

- Garder les changements alignes avec les conventions existantes.
- Ne jamais commiter de secrets.
- Eviter les regressions de securite en modifiant les flux auth/session.
- En cas de doute, prioriser la securite serveur plutot que la commodite client.
