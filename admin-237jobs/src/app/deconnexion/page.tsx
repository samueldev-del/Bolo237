"use client";

import { useEffect, useState } from "react";
import { LogOut, ShieldCheck, Loader2 } from "lucide-react";

export default function DeconnexionPage() {
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/logout", { method: "POST" });
    } catch {
      // Meme en cas d'erreur, on redirige vers login
    }
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[radial-gradient(circle_at_20%_10%,#f7fbff,transparent_28%),radial-gradient(circle_at_80%_0%,#eef3ff,transparent_35%),#edf1f7] p-4">
      <div className="w-full max-w-sm text-center">
        <div className="bg-white rounded-3xl border border-zinc-200 shadow-[0_24px_80px_rgba(22,34,51,0.12)] p-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-50 border border-red-100 mb-5">
            <LogOut className="h-7 w-7 text-red-500" />
          </div>

          <h1 className="text-xl font-bold text-zinc-900 mb-2">Deconnexion</h1>
          <p className="text-sm text-zinc-500 mb-6">
            Voulez-vous vraiment quitter le panneau d&apos;administration ?
          </p>

          <div className="space-y-3">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full h-11 rounded-xl bg-red-600 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loggingOut ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deconnexion...
                </>
              ) : (
                "Oui, me deconnecter"
              )}
            </button>

            <a
              href="/"
              className="block w-full h-11 rounded-xl border border-zinc-200 bg-white text-sm font-semibold text-zinc-700 leading-[2.75rem] transition hover:bg-zinc-50"
            >
              Annuler
            </a>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-zinc-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Votre session sera detruite</span>
          </div>
        </div>
      </div>
    </div>
  );
}
