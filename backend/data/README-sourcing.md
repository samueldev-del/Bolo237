# Sourcing manuel curé

Pré-requis: la migration Prisma de sourcing doit être appliquée, et le backend doit utiliser un client Prisma régénéré.

## Workflow quotidien

1. Ouvrir `backend/data/manual-jobs.json` et ajouter une nouvelle entrée dans le tableau.
   Champs obligatoires: `title`, `companyName`, `companyLogo`, `location`, `description`, `externalApplyUrl`, `sourceUrl`, `outreachEmailSentAt`.
   Règles pratiques: description reformulée manuellement, pas de copier-coller, URLs officielles en `https`, date au format `YYYY-MM-DD`.

2. Préparer le logo de l'entreprise avant de remplir `companyLogo`.
   Le script attend une URL publique `https`. Héberger donc l'image sur votre stockage public habituel, par exemple Cloudinary, puis copier cette URL finale dans `companyLogo`.

3. Vérifier le plan d'action sans écrire en base.

```bash
cd backend
node scripts/seed-manual-jobs.js --dry-run
```

4. Contrôler la sortie.
   Attendu: une ligne `[CREATE] ...` ou `[UPDATE] ...` par offre, puis un résumé final. Si une erreur apparaît, corriger le JSON avant de continuer.

5. Exécuter le seed réel.

```bash
cd backend
node scripts/seed-manual-jobs.js
```

Relancer la même commande plus tard sur la même offre doit produire `0 created, X updated`, grâce à l'idempotence basée sur `sourceHash`.