#!/usr/bin/env bash
set -e

# Helper de RATTRAPAGE de drift : lance prisma db push sur la prod en mode
# INTERACTIF pour que tu valides chaque opération destructive (drop column,
# drop table) avant qu'elle ne soit exécutée.
#
# À utiliser une fois pour combler un schéma prod historiquement créé via
# `db push` (tables manquantes, colonnes orphelines). Après usage, le mode
# strict `migrate deploy` reprend la main au prochain redéploiement Render.
#
# Usage : depuis backend/  →  bash scripts/repair-prod-drift.sh
#
# Sécurité :
#   - Refuse de tourner si .env ne pointe pas vers Neon.
#   - Met .env.local de côté pour ne pas cibler localhost.
#   - Mode interactif : Prisma demande confirmation pour les data-loss.
#   - Restaure .env.local quoi qu'il arrive (trap EXIT).

cd "$(dirname "$0")/.."

ENV_LOCAL=".env.local"
ENV_LOCAL_BAK=".env.local.bak.repair-drift"

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
fi

if ! grep -q "^DATABASE_URL=.*neon\.tech" .env 2>/dev/null; then
  echo "❌ .env ne contient pas une URL Neon. Abandon."
  exit 1
fi

echo "📋 Cible Prisma :"
grep "^DATABASE_URL" .env | sed -E 's/(:.*@)/\:****@/'

echo ""
echo "⚠️  ATTENTION : prisma db push va synchroniser le schéma sans passer par"
echo "   les migrations versionnées. Lis chaque ligne avant de répondre 'y'."
echo "   Si Prisma propose un DROP TABLE ou DROP COLUMN inattendu, REFUSE."
echo ""
read -p "▶️  Continuer ? [y/N] " confirm
if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
  echo "Annulé."
  exit 0
fi

echo ""
echo "▶️  Étape 1/3 — État actuel :"
npx prisma migrate status || true

echo ""
echo "▶️  Étape 2/3 — db push interactif :"
npx prisma db push

echo ""
echo "▶️  Étape 3/3 — Vérification post-push :"
npx prisma migrate status

echo ""
echo "✅ Drift réparé. Le prochain 'prisma migrate deploy' (au boot Render)"
echo "   devrait dire 'No pending migrations to apply.'"
