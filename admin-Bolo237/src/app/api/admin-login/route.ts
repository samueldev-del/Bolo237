import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";
import { getAdminSessionConfigurationError } from "@/lib/admin-session";
import { ensureBackendAdminSession, resolveTrustedOriginFromRequest } from "@/lib/backend-admin";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || "");
    const sessionConfigurationError = getAdminSessionConfigurationError();

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
      await new Promise((r) => setTimeout(r, 800));
      return NextResponse.json(
        { success: false, error: "Mot de passe incorrect." },
        { status: 401 }
      );
    }

    const trustedOrigin = resolveTrustedOriginFromRequest(request);
    await ensureBackendAdminSession(true, { origin: trustedOrigin });
    await createSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin-login error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Erreur de connexion admin.",
      },
      { status: 502 }
    );
  }
}
