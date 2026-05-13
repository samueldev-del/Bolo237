# Admin Recovery

Cette note documente le chemin le plus court et le plus sur pour recreer ou reparer le compte admin backend.

## Regle de priorite des variables

Les scripts admin chargent les variables dans cet ordre:

1. variables passees explicitement dans le shell
2. `backend/.env.local`
3. `backend/.env`

Consequence pratique: si vous fournissez `DATABASE_URL=...` au moment d'executer le script, cette valeur ne sera plus ecrasee par `backend/.env.local`.

## Recuperer ou recreer le compte admin

Utiliser quand il faut creer le compte, remettre son role, lever un ban ou remettre un mot de passe connu.

Depuis `backend/`:

```bash
DATABASE_URL='postgresql://...'
ADMIN_TARGET_EMAIL='admin@bolo237.com'
ADMIN_TARGET_NAME='Admin Bolo237'
ADMIN_TARGET_ROLE='ADMIN'
ADMIN_BACKEND_PASSWORD='MotDePasseFort'
npm run admin:recover-user
```

Effet:

- cree le compte si absent
- remet le mot de passe fourni
- force `isVerified=true`
- leve un eventuel ban
- remet le role demande (`ADMIN` ou `SUPER_ADMIN`)

## Rotation du mot de passe uniquement

Utiliser quand le compte existe deja et qu'il faut seulement changer le mot de passe.

Depuis `backend/`:

```bash
DATABASE_URL='postgresql://...'
ADMIN_TARGET_EMAIL='admin@bolo237.com'
ADMIN_BACKEND_PASSWORD='NouveauMotDePasseFort'
npm run admin:reset-password
```

## Validation apres recovery

1. Retester le backend sur `/api/auth/login` avec l'identifiant admin.
1. Lancer le smoke test admin:

```bash
ADMIN_BASE_URL='https://admin.bolo237.com' \
ADMIN_SMOKE_USERNAME='admin@bolo237.com' \
ADMIN_SMOKE_PASSWORD='MotDePasseFort' \
npm run smoke:admin-login
```

Le script verifie:

- `POST /api/admin-login`
- acces a une route admin proxy protegee
- `POST /api/logout`
- retour a `401` apres logout

`ADMIN_SMOKE_USERNAME` et `ADMIN_SMOKE_PASSWORD` peuvent etre omis si `ADMIN_BACKEND_EMAIL` et `ADMIN_BACKEND_PASSWORD` sont deja exportes dans le shell.

1. Si le backend tourne sur Render, verifier que le `DATABASE_URL` runtime cible bien la base attendue.

## Point d'attention production

Pour un recovery production, ne pas se fier a `backend/.env.local` si cette machine pointe vers une base locale. Toujours passer explicitement le `DATABASE_URL` voulu dans la commande shell ou via un fichier d'env temporaire hors repo.
