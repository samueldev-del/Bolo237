-- Rejouer ce fichier dans l'editeur SQL Neon pour verifier les plans des routes chaudes.
-- Remplace les valeurs d'exemple par des termes reels si besoin.
-- Si une table est encore tres petite et que PostgreSQL choisit un Seq Scan,
-- relance la requete dans une transaction avec:
--   BEGIN;
--   SET LOCAL enable_seqscan = off;
--   ... EXPLAIN ...
--   ROLLBACK;

-- 1) GET /api/jobs?status=APPROVED&page=1&limit=20
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  j.id,
  j.title,
  j.company,
  j.location,
  j.description,
  j.salary,
  j.status,
  j."authorId",
  j."createdAt"
FROM "Job" AS j
WHERE j.status IN ('APPROVED', 'ACTIVE')
ORDER BY j."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 2) GET /api/jobs?status=APPROVED&location=Douala&search=plombier&page=1&limit=20
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  j.id,
  j.title,
  j.company,
  j.location,
  j.description,
  j.salary,
  j.status,
  j."authorId",
  j."createdAt"
FROM "Job" AS j
WHERE j.status IN ('APPROVED', 'ACTIVE')
  AND (
    j.location ILIKE '%Douala%'
    OR j.title ILIKE '%plombier%'
    OR j.company ILIKE '%plombier%'
    OR j.description ILIKE '%plombier%'
  )
ORDER BY j."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 3) GET /api/users?role=ARTISAN&page=1&limit=20
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u."photoUrl",
  u."isVerified",
  u."isBanned",
  u."banReason",
  u."bannedAt",
  u."createdAt"
FROM "User" AS u
WHERE u.role = 'ARTISAN'
ORDER BY u."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 4) GET /api/users?role=ARTISAN&search=Emy&page=1&limit=20
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u."photoUrl",
  u."isVerified",
  u."isBanned",
  u."banReason",
  u."bannedAt",
  u."createdAt"
FROM "User" AS u
WHERE u.role = 'ARTISAN'
  AND (
    u.name ILIKE '%Emy%'
    OR u.email ILIKE '%Emy%'
    OR u.phone ILIKE '%Emy%'
  )
ORDER BY u."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 5) GET /api/admin/notifications?page=1&limit=20&startDate=2026-01-01&endDate=2026-12-31
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  n.id,
  n."userId",
  n.type,
  n.title,
  n.message,
  n.data,
  n."isRead",
  n."readAt",
  n."createdAt",
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role
FROM "Notification" AS n
LEFT JOIN "User" AS u ON u.id = n."userId"
WHERE n."createdAt" >= TIMESTAMP '2026-01-01 00:00:00'
  AND n."createdAt" < TIMESTAMP '2027-01-01 00:00:00'
ORDER BY n."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 6) GET /api/admin/notifications?page=1&limit=20&query=account
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  n.id,
  n."userId",
  n.type,
  n.title,
  n.message,
  n.data,
  n."isRead",
  n."readAt",
  n."createdAt",
  u.id AS user_id,
  u.name AS user_name,
  u.email AS user_email,
  u.role AS user_role
FROM "Notification" AS n
LEFT JOIN "User" AS u ON u.id = n."userId"
WHERE (
  n.title ILIKE '%account%'
  OR n.message ILIKE '%account%'
  OR n.type ILIKE '%account%'
  OR u.name ILIKE '%account%'
  OR u.email ILIKE '%account%'
)
ORDER BY n."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 7) GET /api/admin/me/notifications?userId=1&unreadOnly=true&page=1&limit=20
-- Remplace 1 par l'id admin reel.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  n.id,
  n."userId",
  n.type,
  n.title,
  n.message,
  n.data,
  n."isRead",
  n."readAt",
  n."createdAt"
FROM "Notification" AS n
WHERE n."userId" = 1
  AND n."isRead" = false
ORDER BY n."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 8) GET /api/admin/me/notifications?userId=1&query=verifie&page=1&limit=20
-- Remplace 1 par l'id admin reel.
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  n.id,
  n."userId",
  n.type,
  n.title,
  n.message,
  n.data,
  n."isRead",
  n."readAt",
  n."createdAt"
FROM "Notification" AS n
WHERE n."userId" = 1
  AND (
    n.title ILIKE '%verifie%'
    OR n.message ILIKE '%verifie%'
    OR n.type ILIKE '%verifie%'
  )
ORDER BY n."createdAt" DESC
LIMIT 20 OFFSET 0;

-- 9) GET /api/admin/privacy-requests?status=PENDING&kind=EXPORT&page=1&limit=20
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  pr.id,
  pr.reference,
  pr.kind,
  pr.status,
  pr."userId",
  pr."requesterEmail",
  pr."requesterPhone",
  pr."requesterRole",
  pr."requesterName",
  pr.reason,
  pr.delivery,
  pr."sourceIp",
  pr."userAgent",
  pr.notes,
  pr.payload,
  pr."requestedAt",
  pr."processedAt",
  pr."processedBy",
  pr."updatedAt"
FROM "PrivacyRequest" AS pr
WHERE pr.status = 'PENDING'
  AND pr.kind = 'EXPORT'
ORDER BY pr."requestedAt" DESC, pr.id DESC
LIMIT 20 OFFSET 0;

-- 10) GET /api/admin/privacy-requests?status=PENDING&query=contact
EXPLAIN (ANALYZE, BUFFERS)
SELECT
  pr.id,
  pr.reference,
  pr.kind,
  pr.status,
  pr."userId",
  pr."requesterEmail",
  pr."requesterPhone",
  pr."requesterRole",
  pr."requesterName",
  pr.reason,
  pr.delivery,
  pr."sourceIp",
  pr."userAgent",
  pr.notes,
  pr.payload,
  pr."requestedAt",
  pr."processedAt",
  pr."processedBy",
  pr."updatedAt"
FROM "PrivacyRequest" AS pr
WHERE pr.status = 'PENDING'
  AND (
    pr.reference ILIKE '%contact%'
    OR pr."requesterEmail" ILIKE '%contact%'
    OR pr."requesterName" ILIKE '%contact%'
    OR pr."requesterPhone" ILIKE '%contact%'
    OR pr."requesterRole" ILIKE '%contact%'
    OR pr.reason ILIKE '%contact%'
    OR pr.notes ILIKE '%contact%'
    OR pr."processedBy" ILIKE '%contact%'
  )
ORDER BY pr."requestedAt" DESC, pr.id DESC
LIMIT 20 OFFSET 0;