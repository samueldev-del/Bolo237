# Bolo237 Frontend (Public)

This package is the public Next.js app.

Canonical project documentation is centralized in [../README.md](../README.md).
Use that file as the single source of truth for:

- full local setup (backend + frontend + admin)
- architecture decisions
- security rules and contributor checklist

## Quick Start (frontend only)

```bash
cp .env.example .env
npm install
npm run dev
```

Local URL: http://localhost:3000

## Production Check

```bash
npm run build
npm run start -- -p 3100
```

## Docker (frontend only)

```bash
cp .env.example .env
docker compose up -d --build
docker compose logs -f
docker compose down
```
