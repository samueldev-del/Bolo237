#!/usr/bin/env bash
set -e

# Helper pour appliquer les migrations Prisma sur la production Neon SANS
# que .env.local (qui pointe localhost en dev) ne vienne polluer la cible.
#
# Usage : depuis backend/  →  bash scripts/migrate-prod.sh
#
# Étapes :
#   1. Met .env.local de côté (si présent).
#   2. Vérifie que .env contient bien une URL prod.
#   3. Lance migrate status, baseline les 4 migrations existantes (idempotent),
#      applique les nouvelles, re-vérifie.
#   4. Restaure .env.local quoi qu'il arrive (trap EXIT).

cd "$(dirname "$0")/.."  # cd backend/

ENV_LOCAL=".env.local"
ENV_LOCAL_BAK=".env.local.bak.migrate-prod"

restore_env_local() {
  if [ -f "$ENV_LOCAL_BAK" ]; then
    mv -f "$ENV_LOCAL_BAK" "$ENV_LOCAL"
    echo ""
    echo "🔄 .env.local restauré."
  fi
}
trap restore_env_local EXIT

if [ -f "$ENV_LOCAL" ]; then
  mv "$ENV_LOCAL" "$ENV_LOCAL_BAK"
  echo "📦 .env.local mis de côté → $ENV_LOCAL_BAK"
else
  echo "ℹ️  Pas de .env.local à mettre de côté."
fi

if ! grep -q "^DATABASE_URL=.*neon\.tech" .env 2>/dev/null; then
  echo "❌ .env ne contient pas une URL Neon. Abandon."
  exit 1
fi

echo "📋 Cible Prisma :"
grep "^DATABASE_URL" .env | sed -E 's/(:.*@)/\:****@/'

echo ""
echo "▶️  Étape 1/4 — État avant migration :"
npx prisma migrate status || true

echo ""
echo "▶️  Étape 2/4 — Baseline des 4 migrations pré-existantes (P3008 ignoré, idempotent) :"
for m in \
  20260503125712_init_schema \
  20260504021000_add_bilingual_job_user_fields \
  20260504195500_add_job_slug \
  20260505200356_add_job_alerts_analytics_and_application_status; do
  npx prisma migrate resolve --applied "$m" 2>&1 | grep -v "is already recorded" || true
done

echo ""
echo "▶️  Étape 3/4 — Application des nouvelles migrations :"
npx prisma migrate deploy

echo ""
echo "▶️  Étape 4/4 — État final :"
npx prisma migrate status

echo ""
echo "✅ Migration prod terminée."
