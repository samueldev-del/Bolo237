"use server";

import * as Sentry from "@sentry/nextjs";
import { headers } from "next/headers";
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
  const requestHeaders = await headers();

  return Sentry.withServerActionInstrumentation(
    "admin.loginAction",
    {
      headers: requestHeaders,
      recordResponse: false,
    },
    async () => {
      const password = formData.get("password");

      if (!password || typeof password !== "string") {
        return { error: "Veuillez entrer le mot de passe." };
      }

      if (!verifyPassword(password)) {
        await new Promise((r) => setTimeout(r, 800));
        return { error: "Mot de passe incorrect." };
      }

      await createSession();
      redirect("/");
    }
  );
}
