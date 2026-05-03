# Bolo237 Admin

This package is the Next.js admin portal for moderation and operations.

Canonical project documentation is centralized in [../README.md](../README.md).
Use that file as the single source of truth for:

- full local setup (backend + frontend + admin)
- architecture and security model
- contributor quality gates before merge

## Quick Start (admin only)

```bash
cp .env.example .env
npm install
npm run dev -- -p 3001
```

Local URL: http://localhost:3001/login

## Production Check

```bash
npm run build
npm run start -- -p 3200
```

## Docker (admin only)

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f
docker compose down
```

## Security Reminder

- Keep `ADMIN_SESSION_SECRET` long and random.
- Keep `ADMIN_PASSWORD` and backend admin credentials out of git.
- If needed, enforce `ADMIN_ALLOWED_IPS` to harden access.
