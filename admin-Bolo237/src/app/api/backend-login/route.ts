import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://api-237jobs.onrender.com";
const ADMIN_BACKEND_EMAIL = process.env.ADMIN_BACKEND_EMAIL || "";
const ADMIN_BACKEND_PASSWORD = process.env.ADMIN_BACKEND_PASSWORD || "";

/**
 * POST /api/backend-login
 * Retourne les infos necessaires pour que le client appelle directement
 * le backend et obtienne le cookie JWT sur le bon domaine.
 *
 * Protege par verification du mot de passe admin dans le body.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // Verifier que le mot de passe admin est correct
  if (!body.password || !verifyPassword(String(body.password))) {
    return NextResponse.json({ error: "Non autorise" }, { status: 401 });
  }

  if (!ADMIN_BACKEND_EMAIL || !ADMIN_BACKEND_PASSWORD) {
    return NextResponse.json(
      { error: "Identifiants backend admin non configures" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    apiUrl: API_URL,
    email: ADMIN_BACKEND_EMAIL,
    password: ADMIN_BACKEND_PASSWORD,
  });
}
