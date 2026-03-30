import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-237jobs.onrender.com";
const ADMIN_BACKEND_EMAIL = process.env.ADMIN_BACKEND_EMAIL || "";
const ADMIN_BACKEND_PASSWORD = process.env.ADMIN_BACKEND_PASSWORD || "";

/**
 * POST /api/backend-login
 * Proxy securise: login au backend avec identifiants admin (serveur uniquement)
 * et transmet le cookie JWT au navigateur.
 * Les identifiants ne sont JAMAIS exposes cote client.
 */
export async function POST() {
  if (!ADMIN_BACKEND_EMAIL || !ADMIN_BACKEND_PASSWORD) {
    return NextResponse.json(
      { error: "Identifiants backend admin non configures" },
      { status: 500 }
    );
  }

  try {
    const backendRes = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: ADMIN_BACKEND_EMAIL,
        password: ADMIN_BACKEND_PASSWORD,
      }),
    });

    if (!backendRes.ok) {
      const body = await backendRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body.error || "Login backend echoue" },
        { status: backendRes.status }
      );
    }

    const userData = await backendRes.json();

    // Extraire les cookies de session du backend
    const setCookieHeaders = backendRes.headers.getSetCookie?.() || [];

    const response = NextResponse.json({
      ok: true,
      user: { id: userData.id, role: userData.role },
    });

    // Transmettre tous les cookies du backend au navigateur
    for (const cookieHeader of setCookieHeaders) {
      response.headers.append("Set-Cookie", cookieHeader);
    }

    return response;
  } catch (error) {
    console.error("[backend-login] Error:", error);
    return NextResponse.json(
      { error: "Erreur de connexion au backend" },
      { status: 500 }
    );
  }
}
