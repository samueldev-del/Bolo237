import { NextResponse } from "next/server";
import { createSession, verifyPassword } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const password = String(body?.password || "");

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

    await createSession();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/admin-login error:", error);
    return NextResponse.json(
      { success: false, error: "Erreur de connexion admin." },
      { status: 500 }
    );
  }
}
