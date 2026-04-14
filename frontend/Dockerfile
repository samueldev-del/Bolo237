# ==========================================
# 1. BASE : On prépare le terrain
# ==========================================
# On utilise Alpine, une version de Linux minuscule (environ 5 Mo !)
FROM node:18-alpine AS base

# ==========================================
# 2. DÉPENDANCES : On installe les paquets
# ==========================================
FROM base AS deps
# libc6-compat est souvent requis par certaines dépendances Node sur Alpine Linux
RUN apk add --no-cache libc6-compat
WORKDIR /app

# On copie d'abord uniquement les fichiers qui listent les dépendances
COPY package.json package-lock.json* ./
# On installe proprement (npm ci est plus strict et fiable que npm install en production)
RUN npm ci

# ==========================================
# 3. BUILDER : On compile le code
# ==========================================
FROM base AS builder
WORKDIR /app
# On récupère les dépendances fraîchement installées de l'étape précédente
COPY --from=deps /app/node_modules ./node_modules
# On copie tout le reste de notre code (le .dockerignore bloquera le superflu)
COPY . .

# On désactive la télémétrie de Next.js pour accélérer la compilation
ENV NEXT_TELEMETRY_DISABLED 1

# On lance la compilation (qui va générer notre fameux dossier 'standalone')
RUN npm run build

# ==========================================
# 4. RUNNER : L'image finale de production
# ==========================================
FROM base AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# SÉCURITÉ : Ne jamais faire tourner l'app en tant que 'root' (administrateur).
# On crée un utilisateur système avec des droits limités.
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# On copie le dossier public (images, polices, etc.)
COPY --from=builder /app/public ./public

# On configure les bonnes permissions pour que Next.js puisse mettre son cache à jour
RUN mkdir .next
RUN chown nextjs:nodejs .next

# LA MAGIE DU STANDALONE : On ne copie QUE ce qui est strictement nécessaire
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# On dit à Docker d'utiliser notre utilisateur sécurisé
USER nextjs

# On indique le port sur lequel l'app va tourner
EXPOSE 3000
ENV PORT 3000
# Important pour que l'app écoute sur toutes les interfaces réseau du conteneur
ENV HOSTNAME "0.0.0.0"

# La commande finale pour démarrer l'application
CMD ["node", "server.js"]