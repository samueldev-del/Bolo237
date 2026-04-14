# Bolo237 Admin

Centre de commande Next.js pour la moderation et l'administration de Bolo237.

## Commandes

```bash
npm install
npm run dev
npm run build
```

## Variables d'environnement

Variables requises pour un deploiement utile:

```bash
NEXT_PUBLIC_API_URL=https://api-237jobs.onrender.com
ADMIN_BACKEND_EMAIL=admin@bolo237.com
ADMIN_BACKEND_PASSWORD=mot-de-passe-backend-admin
ADMIN_PASSWORD=mot-de-passe-du-portail-admin
ADMIN_SESSION_SECRET=une-cle-longue-et-aleatoire
```

Variables recommandees pour verrouiller l'acces reseau:

```bash
ADMIN_ALLOWED_IPS=203.0.113.10,198.51.100.24
```

Notes:

- `ADMIN_SESSION_SECRET` n'a plus de fallback en production. Si elle est absente, aucune session admin locale n'est creee.
- `ADMIN_ALLOWED_IPS` et `ADMIN_IP_ALLOWLIST` acceptent une liste d'IP publiques separees par des virgules. Quand la liste est renseignee, toute IP non autorisee recoit une `404` avant meme l'affichage du login.
- En test local via Docker Desktop sur macOS, les requetes publiees sur `localhost` arrivent souvent avec l'IP passerelle `192.168.65.1`. Ajoute-la a `ADMIN_ALLOWED_IPS` avec `127.0.0.1` si tu veux tester l'allowlist depuis ta machine.
- `ADMIN_PASSWORD` protege l'entree du portail. Les actions admin reelles passent ensuite par le compte backend fourni par `ADMIN_BACKEND_EMAIL` et `ADMIN_BACKEND_PASSWORD`.

## Commandes Docker locales

Prepare le fichier d'environnement local une seule fois:

```bash
cp .env.example .env
```

Construit et lance le portail admin:

```bash
docker compose up -d --build
```

Suis les logs du conteneur:

```bash
docker compose logs -f
```

Arrete la stack locale:

```bash
docker compose down
```

URL locale:
- `http://localhost:3001/login`

Notes:
- La stack Docker de l'admin vit dans `admin-Bolo237/docker-compose.yml`.
- En local macOS avec Docker Desktop, garde `ADMIN_ALLOWED_IPS=127.0.0.1,192.168.65.1` pour que `localhost` reste autorise.
- `.env.example` contient seulement des placeholders. Garde les vrais secrets dans `.env`, jamais dans Git.

## Ce qui est verrouille

### 1. Middleware frontal

Le middleware Next.js protege toutes les pages privees.

- `/login` reste public.
- Les autres pages exigent un cookie `admin_session` signe et non expire.
- Un cookie forge ou expire est supprime puis redirige vers `/login`.
- Si l'allowlist IP est active, les visiteurs hors liste recoivent une `404`.

### 2. RBAC cote serveur

Le portail admin ne parle jamais directement au backend avec la session du navigateur.

- Les appels passent par `/api/backend/[...path]`.
- Le proxy local exige une session admin locale valide.
- Le proxy ouvre ensuite une session backend avec le compte admin configure.
- Le backend Bolo237 controle deja `ADMIN` / `SUPER_ADMIN` cote serveur et renvoie `403` si le role ne convient pas.

### 3. CORS backend

Si l'admin est deployee sur `https://admin.bolo237.com`, le backend doit accepter cette origine dans `CORS_ALLOWED_ORIGINS`.

Valeur attendue typique:

```bash
CORS_ALLOWED_ORIGINS=https://www.bolo237.com,https://admin.bolo237.com
```

Le backend principal du repo inclut deja `https://admin.bolo237.com` dans sa liste d'origines autorisees par defaut. Si tu changes de domaine admin, mets a jour cette variable cote Render.

## Deploiement Vercel

1. Declarer toutes les variables ci-dessus dans le projet Vercel admin.
2. Pointer le domaine admin vers cette app, par exemple `admin.bolo237.com`.
3. Ajouter l'IP ou les IP autorisees dans `ADMIN_ALLOWED_IPS`.
4. Verifier que Render autorise bien le domaine admin dans `CORS_ALLOWED_ORIGINS`.
5. Tester:

```bash
curl -I https://admin.bolo237.com/login
curl -i https://admin.bolo237.com/
```

Depuis une IP non autorisee, l'application doit repondre `404`.
