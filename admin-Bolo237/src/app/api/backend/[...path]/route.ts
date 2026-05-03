import { NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { fetchBackendAsAdmin } from "@/lib/backend-admin";

// Render free-tier cold starts can take 30s+
export const maxDuration = 60;

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function forwardHeaders(request: Request) {
  const headers = new Headers(request.headers);
  headers.delete("connection");
  headers.delete("content-length");
  headers.delete("cookie");
  headers.delete("host");
  return headers;
}

async function proxyRequest(request: Request, context: RouteContext) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Session admin requise." }, { status: 401 });
  }

  try {
    const { path } = await context.params;
    if (!path?.length) {
      return NextResponse.json({ error: "Chemin backend manquant." }, { status: 400 });
    }

    const requestUrl = new URL(request.url);
    const backendPath = `/api/${path.join("/")}${requestUrl.search}`;
    const method = request.method.toUpperCase();
    const bodyText = method === "GET" || method === "HEAD" ? undefined : await request.text();

    const upstream = await fetchBackendAsAdmin(backendPath, {
      method,
      headers: forwardHeaders(request),
      body: bodyText && bodyText.length > 0 ? bodyText : undefined,
    });

    // Read full body to avoid streaming issues in serverless
    const body = await upstream.arrayBuffer();

    const contentType = upstream.headers.get("content-type");
    const responseHeaders = new Headers();
    if (contentType) responseHeaders.set("content-type", contentType);

    return new Response(body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("/api/backend proxy error:", error);
    const raw = error instanceof Error ? error.message : "";
    const friendly = !raw || raw === "fetch failed"
      ? "Backend injoignable (Render se reveille peut-etre). Reessayez dans 30s."
      : raw;
    return NextResponse.json({ error: friendly }, { status: 502 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PUT(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function PATCH(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}

export async function DELETE(request: Request, context: RouteContext) {
  return proxyRequest(request, context);
}
