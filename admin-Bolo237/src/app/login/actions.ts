"use server";

import { redirect } from "next/navigation";
import { verifyPassword, createSession } from "@/lib/auth";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const password = formData.get("password");

  if (!password || typeof password !== "string") {
    return { error: "Veuillez entrer le mot de passe." };
  }

  if (!verifyPassword(password)) {
    // Petit delai anti-bruteforce
    await new Promise((r) => setTimeout(r, 800));
    return { error: "Mot de passe incorrect." };
  }

  await createSession();
  redirect("/");
}
