# Session Auth Checklist (Production)

Cette checklist evite les deconnexions immediates apres inscription/connexion.

## 1) Variables backend (production)

Configurer ces variables dans l'environnement du backend:

- `NODE_ENV=production`
- `SESSION_COOKIE_SAMESITE=none`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_JWT_SECRET=<secret-fort-et-unique>`
- `CORS_ALLOWED_ORIGINS=https://www.bolo237.com,https://admin.bolo237.com`

Notes:
- `SameSite=None` + `Secure=true` est requis quand frontend et backend sont sur des domaines differents.
- Garder HTTPS partout (frontend, admin, backend).

## 2) Redeployer le backend

Redeployer apres toute modification auth/cookie/CORS.

## 3) Smoke test session (site en ligne)

Depuis `backend/`, executer:

```bash
BASE_URL=https://api-237jobs.onrender.com \
EXPECT_SAMESITE=none \
REQUIRE_SECURE_COOKIE=true \
node session-cookie-smoke.js
```

Resultat attendu:

- sortie contenant `SESSION_COOKIE_FLOW_OK`
- details `secure: true`, `sameSite: "none"`, `httpOnly: true`

## 4) Verification manuelle rapide

1. Creer un compte candidat sur le frontend.
2. Verifier redirection vers le dashboard candidat (pas retour accueil).
3. Rafraichir la page: session toujours active.
4. Se deconnecter puis se reconnecter: meme resultat.

## 5) Garde-fou avant chaque mise en ligne

Avant release, relancer au minimum:

```bash
BASE_URL=https://api-237jobs.onrender.com node session-cookie-smoke.js
```

Si le test echoue, ne pas promouvoir la release.
