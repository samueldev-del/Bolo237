This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Environment Variables

Create or update your environment file with:

```bash
NEXT_PUBLIC_API_URL=http://localhost:5000
BACKEND_INTERNAL_URL=http://localhost:5000
GEMINI_API_KEY=your_server_side_gemini_key
GEMINI_MODEL=gemini-2.0-flash
PDF_SERVICE_URL=https://your-render-puppeteer-service/render-pdf
```

Security note:
- Never call Gemini directly from client-side code.
- `GEMINI_API_KEY` must stay server-side only (used by `src/app/api/ai/cv-optimize/route.ts`).

Server routes added for AI/PDF architecture:
- `src/app/api/ai/cv-optimize/route.ts`
- `src/app/api/ai/job-optimize/route.ts`
- `src/app/api/cv-pdf/route.ts` (prepared for Puppeteer service via `PDF_SERVICE_URL`)

## Local Docker Commands

Prepare the local environment file once:

```bash
cp .env.example .env
```

Build and start the public frontend container:

```bash
docker compose up -d --build
```

Follow the container logs:

```bash
docker compose logs -f
```

Stop the local stack:

```bash
docker compose down
```

Local URL:
- `http://localhost:3000`

Notes:
- The Docker stack for the public site lives in `frontend/docker-compose.yml`.
- If your backend runs outside Docker, keep `NEXT_PUBLIC_API_URL` and `BACKEND_INTERNAL_URL` aligned with the reachable backend address.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
