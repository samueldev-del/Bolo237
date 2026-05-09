"use client";

import Image from "next/image";
import { Lock, ShieldCheck, Eye, EyeOff } from "lucide-react";
import { useEffect, useState, useRef } from "react";

export default function LoginPage() {
  const [authError, setAuthError] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    // Pre-warm the backend so login isn't blocked by a Render cold start.
    fetch("/api/wake", { cache: "no-store" }).catch(() => {});
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAuthError("");
    const form = e.currentTarget;
    const username = new FormData(form).get("username") as string;
    const password = new FormData(form).get("password") as string;

    if (!username?.trim()) {
      setAuthError("Veuillez entrer l’identifiant administrateur.");
      return;
    }

    if (!password?.trim()) {
      setAuthError("Veuillez entrer le mot de passe.");
      return;
    }

    setIsPending(true);

    try {
      const localRes = await fetch("/api/admin-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const payload = (await localRes.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!localRes.ok || !payload.success) {
        setAuthError(payload.error || "Connexion impossible.");
        setIsPending(false);
        return;
      }

      window.location.href = "/";
    } catch {
      setAuthError("Connexion impossible.");
      setIsPending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#8B4332] via-[#6B3325] to-[#4A2218] p-4">
      {/* Subtle pattern overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.05),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(255,255,255,0.03),transparent_50%)]" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Image src="/logo-white.svg" alt="Bolo237" width={160} height={40} className="h-10 w-auto mx-auto mb-4" priority />
          <div className="flex items-center justify-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#F5C5A3]" />
            <span className="text-sm font-semibold text-[#F5C5A3] uppercase tracking-widest">Admin</span>
          </div>
          <p className="text-sm text-[#F5C5A3]/70 mt-2">Acces securise au back-office</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5EF]">
              <Lock className="h-5 w-5 text-[#DA7756]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-zinc-900">Connexion</h2>
              <p className="text-xs text-zinc-600">Entrez l’identifiant et le mot de passe administrateur</p>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
            {/* Error */}
            {authError && (
              <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                <svg className="h-4 w-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {authError}
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-sm font-medium text-zinc-700 mb-2">
                Identifiant administrateur
              </label>
              <input
                id="username"
                name="username"
                type="text"
                inputMode="text"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
              />
            </div>

            {/* Password field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-zinc-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  inputMode="text"
                  autoComplete="current-password"
                  required
                  autoFocus
                  placeholder="Entrez le mot de passe..."
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-4 pr-12 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 rounded-md"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="relative h-12 w-full rounded-xl bg-gradient-to-b from-[#DA7756] to-[#C4623F] text-sm font-semibold text-white shadow-sm transition hover:from-[#E8A87C] hover:to-[#DA7756] disabled:opacity-60 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
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

          {/* Security footer */}
          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Connexion securisee &bull; Session de 8h</span>
          </div>
        </div>

        <p className="text-center text-xs text-[#F5C5A3]/50 mt-6">
          &copy; 2026 Bolo237 &mdash; Panneau d&apos;administration
        </p>
      </div>
    </div>
  );
}
