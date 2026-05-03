import { NextResponse } from "next/server";

const DEFAULT_BACKEND_API_URL = "https://api-237jobs.onrender.com";

// Public wake endpoint: pings backend /api/health to warm Render cold-starts.
// No admin session required — this only pokes a public health route.
export const maxDuration = 60;

function getBackendApiBase() {
  return String(process.env.NEXT_PUBLIC_API_URL || "")
    .trim()
    .replace(/\/$/, "") || DEFAULT_BACKEND_API_URL;
}

export async function GET() {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55_000);

  try {
    const res = await fetch(`${getBackendApiBase()}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    });
    return NextResponse.json({
      ok: res.ok,
      status: res.status,
      elapsedMs: Date.now() - start,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "fetch failed";
    return NextResponse.json(
      { ok: false, error: message, elapsedMs: Date.now() - start },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
