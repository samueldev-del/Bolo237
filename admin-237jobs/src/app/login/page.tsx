"use client";

import { useActionState } from "react";
import { loginAction, type LoginState } from "./actions";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useState } from "react";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#f7fbff,transparent_28%),radial-gradient(circle_at_80%_0%,#eef3ff,transparent_35%),#edf1f7] p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="237jobs" className="h-10 w-auto mx-auto mb-4" />
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-green-600" />
            <span className="text-sm font-semibold text-zinc-500 uppercase tracking-widest">Admin</span>
          </div>
          <p className="text-sm text-zinc-500 mt-2">Acces securise au back-office</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_24px_80px_rgba(22,34,51,0.12)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100">
              <Lock className="h-5 w-5 text-zinc-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Connexion</h2>
              <p className="text-xs text-zinc-400">Entrez le mot de passe administrateur</p>
            </div>
          </div>

          <form action={formAction} className="space-y-5">
            {/* Erreur */}
            {state.error && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {state.error}
              </div>
            )}

            {/* Champ mot de passe */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  autoFocus
                  placeholder="Entrez le mot de passe..."
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-4 pr-12 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-400 focus:bg-white focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Bouton */}
            <button
              type="submit"
              disabled={isPending}
              className="relative h-12 w-full rounded-xl bg-gradient-to-b from-zinc-800 to-zinc-900 text-sm font-semibold text-white shadow-sm transition hover:from-zinc-700 hover:to-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Verification...
                </span>
              ) : (
                "Acceder au tableau de bord"
              )}
            </button>
          </form>

          {/* Footer securite */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Connexion securisee &bull; Session de 8h</span>
          </div>
        </div>

        <p className="text-center text-xs text-zinc-400 mt-6">
          &copy; 2026 237jobs &mdash; Panneau d&apos;administration
        </p>
      </div>
    </div>
  );
}
