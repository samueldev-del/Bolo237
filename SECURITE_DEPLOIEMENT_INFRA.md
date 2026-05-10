# Securite Deploiement Infra

Cette checklist couvre Neon, Render et Vercel pour Bolo237.

## 0. Matrice reseau a garder ouverte

### Ports entrants a autoriser

- `22/tcp` uniquement pour l'administration SSH de votre serveur, si vous hebergez vous-meme une machine.
- `80/tcp` uniquement si vous forcez ensuite la redirection HTTP vers HTTPS.
- `443/tcp` pour le trafic public du site et de l'API publique.

### Ports entrants a fermer strictement

- `5432/tcp` ne doit jamais etre expose publiquement. La base Postgres doit rester joignable uniquement par le backend autorise.
- `5000/tcp` et `5001/tcp` ne doivent pas etre publics en production. Ce sont des ports de backend/dev.
- `3000/tcp` et `3001/tcp` ne doivent pas etre publics en production. Ce sont des ports de front/admin locaux.
- `465/tcp` et `993/tcp` ne doivent pas etre ouverts en entree sur votre serveur. Le backend s'en sert seulement en sortie vers vos fournisseurs mail.

### Ports sortants utilises par l'application

- `443/tcp`: frontend vers backend en production, admin vers backend, backend vers Cloudinary, Twilio, Sentry et autres APIs HTTPS.
- `5432/tcp`: backend vers Postgres/Neon.
- `465/tcp`: backend vers le SMTP Hostinger.
- `993/tcp`: backend vers l'IMAP Hostinger.

### Flux applicatifs verifies dans le code

- Frontend web vers backend:
	`frontend/src/lib/api.ts` et `frontend/src/app/api/backend/[...path]/route.ts` montrent que le navigateur passe par le proxy Next `/api/backend/*`, puis le serveur frontend appelle le backend via `BACKEND_INTERNAL_URL` ou `NEXT_PUBLIC_API_URL`. En production, ce flux doit passer en `443/tcp`.
- Admin vers backend:
	`admin-Bolo237/src/lib/backend-admin.ts` appelle le backend via `NEXT_PUBLIC_API_URL` ou `https://api-237jobs.onrender.com`, donc en production ce flux passe aussi en `443/tcp`.
- Backend vers base de donnees:
	`backend/server.js` lit `DATABASE_URL` et ouvre la connexion Postgres. Le format d'URL de `backend/.env.example` montre un port Postgres `5432`, donc le flux backend -> base passe en `5432/tcp`.
- Backend local:
	`backend/server.js` ecoute sur `PORT` avec defaut `5000`; votre environnement local le force actuellement a `5001`.

### Regle pratique si vous avez un serveur Linux a vous

- Politique entrante: `deny all`.
- Exceptions entrantes minimales: `22/tcp`, `80/tcp`, `443/tcp`.
- Politique sortante: n'autoriser que `53` si vous filtrez aussi le DNS, puis `443`, `5432`, `465`, `993` selon vos besoins reels.
- Si frontend/admin tournent en Docker sur le serveur, les publier sur `127.0.0.1` seulement, puis laisser Nginx ou Caddy exposer `443` publiquement.

### Exemple UFW minimal

Si vous utilisez un VPS Ubuntu/Debian avec UFW:

1. `ufw default deny incoming`
2. `ufw default allow outgoing`
3. `ufw allow 22/tcp`
4. `ufw allow 80/tcp`
5. `ufw allow 443/tcp`
6. `ufw deny 3000/tcp`
7. `ufw deny 3001/tcp`
8. `ufw deny 5000/tcp`
9. `ufw deny 5001/tcp`
10. `ufw deny 5432/tcp`
11. `ufw enable`

Si vous etes entierement derriere Cloudflare ou un reverse proxy TLS deja en place, vous pouvez meme fermer `80/tcp` et ne garder que `22/tcp` et `443/tcp`.

## 1. Neon

- Activer une allowlist IP stricte: n'autoriser que les IP sortantes de Render et les IP locales de developpement.
- Verifier que la connexion Postgres utilise bien `sslmode=require`.
- Preferer un utilisateur Postgres dedie au backend avec des droits limites, plutot que le role proprietaire.
- Si un secret ou une URL de connexion a deja circule hors du coffre-fort d'infrastructure, le faire tourner immediatement.

## 2. Render

- Stocker `DATABASE_URL`, `SESSION_JWT_SECRET`, les cles Twilio, Cloudinary et email uniquement dans les variables d'environnement Render.
- Configurer `CORS_ALLOWED_ORIGINS` avec les seuls domaines officiels requis, par exemple `https://www.bolo237.com,https://admin.bolo237.com`.
- Laisser `ALLOW_VERCEL_PREVIEW_ORIGINS` desactive en production, sauf besoin temporaire explicite.
- Redeployer le backend apres tout changement sur les cookies, le CORS, les secrets ou les limites de debit.

## 3. Vercel

- Ne jamais prefixer une variable secrete avec `NEXT_PUBLIC_`.
- Limiter les variables publiques aux URL et indicateurs strictement necessaires au navigateur.
- Conserver les headers de securite dans `frontend/next.config.ts` pour appliquer CSP, HSTS et protections navigateur a la racine du domaine.

## 4. Ce que le code enforce deja

- Le backend refuse une `DATABASE_URL` de production sans `sslmode=require`.
- Le backend refuse un `SESSION_JWT_SECRET` absent, faible ou recycle depuis `MASTER_OTP` en production.
- Le backend refuse un `CORS_ALLOWED_ORIGINS` avec wildcard en production.
- Le backend applique des rate limits dedies sur le login, la demande de reinitialisation et la reinitialisation de mot de passe.
- Le frontend envoie des headers de securite stricts via Vercel.

## 5. Verification rapide apres release

1. Lancer `BASE_URL=https://api-237jobs.onrender.com node backend/session-cookie-smoke.js`.
2. Verifier qu'un login puis un logout via `https://www.bolo237.com/api/backend/auth/*` donnent respectivement `200` puis `401` apres logout.
3. Controler dans Neon que l'allowlist IP n'a pas ete rouverte a `0.0.0.0/0`.

## 6. Secrets ajoutes par la remediation securite (sprints 1-5)

Toutes ces variables sont stockees dans le coffre-fort Render (backend) ou Vercel (admin).

### Backend (Render)

| Variable | Obligatoire | Generation | Role |
|---|---|---|---|
| `DATA_ENCRYPTION_KEY` | prod | `openssl rand -hex 32` | Cle AES-256-GCM pour le chiffrement applicatif des PII (telephones). Perte = donnees chiffrees irrecuperables. |
| `DATA_LOOKUP_HMAC_KEY` | prod | `openssl rand -hex 32` | Cle HMAC-SHA256 pour les hashes de lookup (`phoneHash`). Distincte de la cle de chiffrement. |
| `OTP_VALIDITY_MINUTES` | non | entier | Defaut 5. Duree de validite d'un OTP. |
| `OTP_MAX_ATTEMPTS` | non | entier | Defaut 5. Plafond d'essais erronnes avant 429. |
| `JOB_APPLICATION_HOURLY_LIMIT` | non | entier | Defaut 30. |
| `RGPD_PURGE_DELAY_DAYS` | non | entier | Defaut 30. Delai entre soft-delete et hard-delete. |
| `RGPD_PURGE_ENABLED` | non | `true`/`false` | Defaut `true`. Permet de couper le cron en pre-prod. |
| `CLAMAV_ENABLED` | non | `true`/`false` | Defaut `false`. Active le scan antivirus opt-in. |
| `CLAMAV_HOST` / `CLAMAV_PORT` | si activé | host/port | Sidecar ClamAV. |

### Admin (Vercel)

| Variable | Obligatoire | Role |
|---|---|---|
| `ADMIN_SESSION_SECRET` | prod | >= 32 caracteres. Le service admin throw au demarrage si manquant ou trop court. |
| `ADMIN_ALLOWED_IPS` | non | Allowlist IPs admin (auth IP-based optionnelle). |

### Backup obligatoire des cles de chiffrement

`DATA_ENCRYPTION_KEY` et `DATA_LOOKUP_HMAC_KEY` doivent etre sauvegardees dans **deux** coffres-forts distincts (1Password equipe + bunker offline). Sans elles, les `phoneEnc`/`phoneHash` ne peuvent plus etre lus.

## 7. Procedures de rotation des secrets

### Rotation `SESSION_JWT_SECRET`

1. Generer une nouvelle cle (`openssl rand -hex 64`).
2. Deployer le backend avec la nouvelle valeur.
3. Tous les utilisateurs sont deconnectes (cookies invalides) — communiquer en avance si possible.

### Rotation `ADMIN_SESSION_SECRET`

1. Idem `SESSION_JWT_SECRET` cote admin.

### Rotation `DATA_ENCRYPTION_KEY`

Plus complexe car les anciennes valeurs sont liees a l'ancienne cle.

1. Ajouter une nouvelle cle `DATA_ENCRYPTION_KEY_V2` (ne pas remplacer V1).
2. Etendre `backend/lib/crypto.js` pour gerer plusieurs versions (deja preparé : prefixe `v1:` permet d'ajouter `v2:`).
3. Re-encrypter en boucle via un script `re-encrypt-pii.js` (lit avec V1, ecrit avec V2).
4. Apres convergence, supprimer V1 du coffre.

## 8. Migrations Prisma additives a appliquer

Toutes sans downtime :

```bash
cd backend
npx prisma migrate deploy
npx prisma generate
node scripts/encrypt-phones.js --dry-run    # verifier
node scripts/encrypt-phones.js              # backfill reel
```

Migrations livrees :

1. `20260509094413_otp_hardening_phase1` — codeHash, attempts, consumed.
2. `20260509094414_artisan_service_price_amount` — priceAmount Decimal.
3. `20260509094415_pii_encryption_phase1` — phoneEnc, phoneHash + index uniques.
4. `20260509094416_soft_delete_phase1` — deletedAt + index.

Les phases B/C (drop des colonnes plain) sont **planifiees separement**, pas dans cette release.

## 9. Bascule least-privilege (runtime vs. migration)

Depuis la bascule de mai 2026, le backend Render utilise deux URLs Neon distinctes :

| Variable | Role Postgres | Privileges | Usage |
|---|---|---|---|
| `DATABASE_URL` | `api_worker` | SELECT, INSERT, UPDATE, DELETE, USAGE sur sequences | Runtime Express (toutes les requetes utilisateur) |
| `DATABASE_MIGRATION_URL` | `neondb_owner` | DDL complet (CREATE, ALTER, DROP) + DML | `prisma migrate deploy` au boot uniquement |

### Benefice

En cas de compromission du backend (XSS exploite, dependance verolee, session admin volee), l'attaquant ne peut plus executer de DDL : pas de DROP TABLE, pas d'ALTER pour exfiltrer/modifier la structure, pas de CREATE pour ajouter des triggers malveillants. La surface destructive est reduite aux DML sur les tables existantes.

### Procedure de mise en place sur Neon

1. Dans Neon SQL Editor (connecte avec `neondb_owner`) :
	 ```sql
	 CREATE ROLE api_worker LOGIN PASSWORD '<strong_password>';
	 GRANT USAGE ON SCHEMA public TO api_worker;
	 GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO api_worker;
	 GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO api_worker;
	 ALTER DEFAULT PRIVILEGES IN SCHEMA public
		 GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO api_worker;
	 ALTER DEFAULT PRIVILEGES IN SCHEMA public
		 GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO api_worker;
	 ```
2. Construire l'URL `postgresql://api_worker:<password>@<host>-pooler.<region>.aws.neon.tech/neondb?sslmode=require`.
3. Dans Render -> Environment :
	 - `DATABASE_URL` <- URL `api_worker`
	 - `DATABASE_MIGRATION_URL` <- URL `neondb_owner`
4. Redeployer. Le `prestart` lance `migrate deploy` avec l'URL owner ; le runtime utilise l'URL worker.

### Audit de validation

```sql
-- Doit retourner true / 0 / 0
SELECT
	has_schema_privilege('api_worker', 'public', 'USAGE') AS schema_usage,
	COUNT(*) FILTER (WHERE NOT has_table_privilege('api_worker', schemaname || '.' || tablename, 'SELECT,INSERT,UPDATE,DELETE')) AS table_gap_count
	FROM pg_tables WHERE schemaname = 'public';
```

### Rotation du mot de passe api_worker

```sql
ALTER ROLE api_worker PASSWORD '<new_strong_password>';
```
Puis mise a jour de `DATABASE_URL` dans Render. Le `DATABASE_MIGRATION_URL` (owner) n'est pas affecte.