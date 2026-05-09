"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { verifyCredentials, createSession } from "@/lib/auth";

export type LoginState = {
  error?: string;
  success?: boolean;
};

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const requestHeaders = await headers();

  return Sentry.withServerActionInstrumentation(
    "admin.loginAction",
    {
      headers: requestHeaders,
      recordResponse: false,
    },
    async () => {
      const username = formData.get("username");
      const password = formData.get("password");

      if (!username || typeof username !== "string") {
        return { error: "Veuillez entrer l’identifiant administrateur." };
      }

      if (!password || typeof password !== "string") {
        return { error: "Veuillez entrer le mot de passe." };
      }

      if (!verifyCredentials(username, password)) {
        await new Promise((r) => setTimeout(r, 800));
        return { error: "Identifiant ou mot de passe incorrect." };
      }

      await createSession();
      redirect("/");
    }
  );
}
