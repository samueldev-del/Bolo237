# 📒 Journal de Remédiation Sécurité — Bolo237

**Branche worktree** : `claude/brave-banzai-0d8882`
**Démarré** : 2026-05-09
**Orchestrateur** : Claude Code (Opus 4.7)

## Légende statuts
- 🟦 PENDING : non commencé
- 🟨 IN_PROGRESS : en cours
- 🟩 DONE : terminé + vérifié
- 🟥 BLOCKED : bloqué (raison)
- ⏭️ DEFERRED : nécessite intervention utilisateur (BD, secrets, déploiement)

---

## SPRINT 1 — Blockers prod

| ID | Tâche | Fichiers | Statut | Notes |
|---|---|---|---|---|
| S1-T1 | C-7 + C-8 — Headers admin + image domains | admin-Bolo237/next.config.ts | 🟩 DONE | CSP, HSTS, X-Frame-Options, COOP. localhost limité à dev. |
| S1-T2 | C-1 — Uniformiser messages auth/OTP | backend/routes/auth.js, otp.js | 🟩 DONE | + délai constant 600ms sur /forgot-password. |
| S1-T3 | C-6 — Rate-limit POST /jobs/:id/apply | backend/routes/jobs.js, lib/limiters.js | 🟩 DONE | KeyGen étendu pour fallback `req.sessionUser.id`. |
| S1-T4 | C-5 — Race condition candidature | backend/routes/jobs.js | 🟩 DONE | `@@unique([jobId,candidateId])` existait déjà. try/catch P2002 → 409. |
| S1-T5 | C-2 + C-3 + C-4 — Refonte OTP | backend/lib/otp.js (nouveau), routes/otp.js, routes/auth.js, schema.prisma + migration phase A | 🟩 DONE (code) | ⏭️ Migration à appliquer côté user. bcryptjs déjà présent. |
| S1-T6 | Validation Sprint 1 + commit | — | 🟨 IN_PROGRESS | Attente GO utilisateur pour migration + commit. |

## SPRINT 2 — Majeurs

| ID | Tâche | Statut |
|---|---|---|
| S2-T1 | M-3 Admin secret strict (≥32 chars, throw) | 🟩 DONE | Throw en prod ; warning + fallback sécurisé en dev. |
| S2-T2 | M-2 Rotation JWT post-login | 🟩 DONE | Helper `revokeCurrentSessionToken()` câblé sur `/login`. |
| S2-T3 | M-7 Backoff exponentiel admin login | 🟩 DONE | In-memory par IP, 800ms→8s. Migration Upstash recommandée pour scale-out. |
| S2-T4 | M-4 Admin settings whitelist | 🟩 DONE | Schéma Zod strict, plus de `passthrough()`. |
| S2-T5 | M-8 Limite upload différenciée | 🟩 DONE | `uploadCv` 5MB / `uploadImage` 2MB / `uploadVerificationDoc` 8MB. |
| S2-T6 | M-9 updateMany batch alertes | 🟩 DONE | Split createMany + Promise.all(update). |
| S2-T7 | M-1 CSRF httpOnly + endpoint /csrf-token | 🟩 DONE | Frontend a déjà fallback fetch. |
| S2-T8 | M-5 Anti-SSRF cvUrl + externalApplyUrl | 🟩 DONE | Nouveau lib `urlGuard.js` (RFC1918, link-local, métadata cloud). |
| S2-T9 | M-10 ArtisanService.priceAmount Decimal | 🟩 DONE | Job.slug/reference déjà @unique. Migration phase A additive. |
| S2-T10 | M-6 Rate-limit + anti-prompt-injection AI | 🟩 DONE | `_lib/guard.ts` partagé : 10 req/min/IP + délimiteurs `<USER_INPUT>`. |

## SPRINT 3 — Mineurs

| ID | Tâche | Statut |
|---|---|---|
| S3-T1 | MIN-1 + 3 + 5 + 7 (consolidé) | 🟦 PENDING |

## SPRINT 4 — RGPD / PII

| ID | Tâche | Statut |
|---|---|---|
| S4-T1 | MIN-2 Phase A (lib/crypto.js + colonnes additives) | 🟦 PENDING |
| S4-T2 | MIN-2 Phase B (backfill + bascule routes) | 🟦 PENDING |
| S4-T3 | MIN-2 Phase C (drop colonnes plain) | 🟦 PENDING |
| S4-T4 | MIN-4 Soft-delete + cron purge RGPD | 🟦 PENDING |

## SPRINT 5 — Hardening

| ID | Tâche | Statut |
|---|---|---|
| S5-T1 | MIN-6 ClamAV antivirus uploads | 🟦 PENDING |
| S5-T2 | E2E Playwright (5 scénarios) | 🟦 PENDING |
| S5-T3 | Brief pentest + maj documentation | 🟦 PENDING |

---

## Journal d'exécution

### 2026-05-09 — Sprint 1 code-complete

**Fichiers modifiés :**
- `admin-Bolo237/next.config.ts` (S1-T1)
- `backend/routes/auth.js` (S1-T2, S1-T5)
- `backend/routes/otp.js` (S1-T2, S1-T5)
- `backend/routes/jobs.js` (S1-T3, S1-T4)
- `backend/lib/limiters.js` (S1-T3)
- `backend/prisma/schema.prisma` (S1-T5 — modèle OtpCode étendu)

**Fichiers créés :**
- `backend/lib/otp.js` — helper `issueOtp` / `verifyOtp` (bcryptjs, attempts, consumed, fallback legacy).
- `backend/prisma/migrations/20260509094413_otp_hardening_phase1/migration.sql` — phase A additive, sans downtime.

**Actions ⏭️ utilisateur AVANT déploiement prod :**
1. `cd backend && npm install` (worktree fraîche).
2. `cd backend && npx prisma migrate deploy` (ou `npx prisma migrate dev` en dev) pour appliquer la migration phase A.
3. `npx prisma generate` pour régénérer le client TypeScript avec les nouveaux champs.
4. Vérifier env optionnel : `OTP_VALIDITY_MINUTES` (def. 5), `OTP_MAX_ATTEMPTS` (def. 5).

**Vérifications staging recommandées avant prod :**
- Build admin OK : `cd admin-Bolo237 && npm run build`.
- Headers admin présents : `curl -I https://admin-staging.bolo237.com/login` → CSP/HSTS/XFO.
- Cycle OTP candidat : send → verify (bon code) → consumed=true en BD.
- Brute-force OTP : 5 codes faux → 6e renvoie 429.
- Double candidature : 2× POST `/jobs/:id/apply` même user → 1× 201, 2e× 409.

**Risques résiduels (à traiter en sprints ultérieurs) :**
- Phase B OTP (drop colonne `code`) à planifier après vérification stabilité phase A.
- Cycle complet hors-prod nécessaire avant promotion (Twilio + Redis réels).

### 2026-05-09 — Sprint 2 code-complete (10 majeurs)

**Fichiers modifiés :**
- `admin-Bolo237/src/lib/admin-session.ts` (M-3 — secret strict + fallback dev sécurisé)
- `admin-Bolo237/src/app/api/admin-login/route.ts` (M-7 — backoff exponentiel)
- `backend/lib/session.js` (M-2 — `revokeCurrentSessionToken`)
- `backend/routes/auth.js` (M-2 — révocation au login)
- `backend/routes/admin.js` (M-4 — schéma Zod strict)
- `backend/lib/uploads.js` (M-8 — instances spécialisées)
- `backend/lib/adminInboxService.js` (M-9 — anti-N+1)
- `backend/lib/csrf.js` (M-1 — httpOnly + endpoint enrichi)
- `backend/routes/jobs.js` (M-5 — guard cvUrl + externalApplyUrl)
- `backend/prisma/schema.prisma` (M-10 — `ArtisanService.priceAmount`)
- `backend/server.js` (M-10 — extraction priceAmount au create service)
- `frontend/src/app/api/ai/cv-optimize/route.ts` (M-6)
- `frontend/src/app/api/ai/job-optimize/route.ts` (M-6)
- `frontend/src/app/api/ai/candidate-match/route.ts` (M-6)

**Fichiers créés :**
- `admin-Bolo237/src/lib/admin-login-backoff.ts` — backoff exp. 800ms→8s.
- `backend/lib/urlGuard.js` — assertions URL anti-SSRF.
- `backend/prisma/migrations/20260509094414_artisan_service_price_amount/migration.sql` — phase A.
- `frontend/src/app/api/ai/_lib/guard.ts` — rate-limit + délimitation prompts.

**Actions ⏭️ utilisateur AVANT déploiement prod :**
1. `cd backend && npx prisma migrate deploy` (migration phase A `priceAmount`).
2. `npx prisma generate`.
3. Vérifier env optionnel : `AI_RATE_LIMIT_PER_MIN` (def. 10).
4. Vérifier `ADMIN_SESSION_SECRET` ≥ 32 chars (sinon le service ne démarrera plus en prod — comportement voulu).

**Bonnes surprises trouvées en cours de sprint (audit imprécis) :**
- `Job.slug` et `Job.reference` ont **déjà** `@unique`.
- Frontend [api.ts](frontend/src/lib/api.ts) a **déjà** un fallback fetch CSRF — passage `httpOnly:true` sans modif côté client.

**Limitations connues à traiter sprint ultérieur :**
- Backoff admin login + rate-limit AI sont in-memory : pas partagés entre instances Vercel. Migration vers Upstash Redis = M-7-bis / M-6-bis si trafic justifie.
- `ArtisanService.priceAmount` reste Null pour les rows existantes — script de backfill à écrire si besoin de filtrage prix.


