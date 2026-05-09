import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getAdminSessionConfigurationError, getClientIpFromHeaders } from "@/lib/admin-session";
import { ensureBackendAdminSession } from "@/lib/backend-admin";
import { clearFailures, getBackoffDelay, registerFailure } from "@/lib/admin-login-backoff";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || "");
    const sessionConfigurationError = getAdminSessionConfigurationError();
    const clientIp = getClientIpFromHeaders(request.headers);

    if (sessionConfigurationError) {
      return NextResponse.json(
        { success: false, error: sessionConfigurationError },
        { status: 503 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: "Veuillez entrer le mot de passe." },
        { status: 400 }
      );
    }

    if (!verifyPassword(password)) {
      const delay = getBackoffDelay(clientIp);
      registerFailure(clientIp);
      await new Promise((r) => setTimeout(r, delay));
      return NextResponse.json(
        { success: false, error: "Mot de passe incorrect." },
        { status: 401 }
      );
    }

    clearFailures(clientIp);

    // La session admin locale (cookie) est creee meme si le backend est temporairement
    // injoignable. La session backend sera re-acquise au prochain appel API via
    // fetchBackendAsAdmin (qui a deja un retry sur 401/403). Cela evite de bloquer
    // l'admin sur un cold-start Render ou un incident reseau.
    let backendSessionWarning: string | null = null;
    try {
      await ensureBackendAdminSession(true);
    } catch (backendErr) {
      const message = backendErr instanceof Error ? backendErr.message : String(backendErr);
      console.warn("[admin-login] backend session warmup failed:", message);
      backendSessionWarning = message;
    }

    await createSession();
    return NextResponse.json({
      success: true,
      ...(backendSessionWarning ? { warning: `Session backend differee: ${backendSessionWarning}` } : {}),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de connexion admin.";
    console.error("POST /api/admin-login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: message === "fetch failed"
          ? "Le serveur backend est injoignable. Verifiez NEXT_PUBLIC_API_URL et reessayez."
          : message,
      },
      { status: 502 }
    );
  }
}
