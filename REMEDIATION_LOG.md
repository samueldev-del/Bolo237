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
| S2-T1 | M-1 CSRF httpOnly + endpoint /csrf-token | 🟦 PENDING |
| S2-T2 | M-2 Rotation JWT post-login | 🟦 PENDING |
| S2-T3 | M-3 Admin secret strict (≥32 chars, throw) | 🟦 PENDING |
| S2-T4 | M-4 Admin settings whitelist (no passthrough) | 🟦 PENDING |
| S2-T5 | M-5 Validation cvUrl anti-SSRF + lib/urlGuard.js | 🟦 PENDING |
| S2-T6 | M-6 Rate-limit + anti-prompt-injection AI Gemini | 🟦 PENDING |
| S2-T7 | M-7 Backoff exponentiel admin login | 🟦 PENDING |
| S2-T8 | M-8 Limite upload différenciée par fieldname | 🟦 PENDING |
| S2-T9 | M-9 updateMany batch alertes (anti-N+1) | 🟦 PENDING |
| S2-T10 | M-10 Job slug/reference @unique + Decimal price | 🟦 PENDING |

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

