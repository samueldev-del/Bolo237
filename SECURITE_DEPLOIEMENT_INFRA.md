# Securite Deploiement Infra

Cette checklist couvre Neon, Render et Vercel pour Bolo237.

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