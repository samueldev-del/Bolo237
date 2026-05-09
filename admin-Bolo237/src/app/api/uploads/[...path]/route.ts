import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { fetchBackendPathAsAdmin } from "@/lib/backend-admin";

export const runtime = "nodejs";
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function buildForwardHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("cookie");
  headers.delete("host");
  return headers;
}

function buildResponseHeaders(upstream: Response) {
  const headers = new Headers();

  upstream.headers.forEach((value, key) => {
    const normalizedKey = key.toLowerCase();
    if (
      normalizedKey === "connection" ||
      normalizedKey === "content-encoding" ||
      normalizedKey === "content-length" ||
      normalizedKey === "keep-alive" ||
      normalizedKey === "set-cookie" ||
      normalizedKey === "transfer-encoding"
    ) {
      return;
    }

    headers.append(key, value);
  });

  headers.set("cache-control", "no-store");
  return headers;
}

async function proxyUploadRequest(request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Session admin requise." }, { status: 401 });
  }

  try {
    const { path } = await context.params;
    if (!path?.length) {
      return NextResponse.json({ error: "Chemin de document manquant." }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const upstreamPath = path.map((segment) => encodeURIComponent(segment)).join("/");
    const upstream = await fetchBackendPathAsAdmin(`/uploads/${upstreamPath}${requestUrl.search}`, {
      method: request.method.toUpperCase(),
      headers: buildForwardHeaders(request),
      cache: "no-store",
      redirect: "manual",
    });

    const body = request.method.toUpperCase() === "HEAD"
      ? undefined
      : await upstream.arrayBuffer();

    return new NextResponse(body, {
      status: upstream.status,
      headers: buildResponseHeaders(upstream),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Connexion au backend impossible.",
      },
      { status: 502 },
    );
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyUploadRequest(request, context);
}

export async function HEAD(request: Request, context: RouteContext) {
  return proxyUploadRequest(request, context);
}