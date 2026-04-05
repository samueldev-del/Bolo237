"use client";

import { useEffect, useState, useCallback } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchPlatformSettings,
  updatePlatformSettings,
  checkHealth,
  type PlatformSettings,
} from "@/lib/api";
import {
  Settings,
  Shield,
  Bell,
  Server,
  Loader2,
  X,
  Plus,
  RefreshCw,
} from "lucide-react";

function Toggle({
  checked,
  onChange,
  colorOn = "bg-[#DA7756]",
  colorOff = "bg-zinc-300",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  colorOn?: string;
  colorOff?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full transition-colors ${checked ? colorOn : colorOff}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 translate-y-1 rounded-full bg-white shadow-md ring-0 transition-transform ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <div
      className={`fixed top-6 right-6 z-[100] animate-fade-in rounded-xl border px-5 py-3 text-sm font-medium text-white shadow-2xl ${
        type === "success" ? "border-[#E8C4B0] bg-[#8B4332]" : "border-red-200 bg-red-700"
      }`}
    >
      {message}
    </div>
  );
}

export default function ParametresPage() {
  const [, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Platform info
  const [platformName, setPlatformName] = useState("");
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  // Moderation
  const [autoApprove, setAutoApprove] = useState(0);
  const [blockedKeywords, setBlockedKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState("");

  // Notifications
  const [emailOnNewReport, setEmailOnNewReport] = useState(false);
  const [whatsappOnNewJob, setWhatsappOnNewJob] = useState(false);
  const [emailOnInternalAdminAlert, setEmailOnInternalAdminAlert] = useState(false);
  const [whatsappOnInternalAdminAlert, setWhatsappOnInternalAdminAlert] = useState(false);

  // Health
  const [healthStatus, setHealthStatus] = useState<string | null>(null);
  const [healthChecking, setHealthChecking] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  const apiUrl = (() => {
    const fromEnv = process.env.NEXT_PUBLIC_API_URL?.trim();
    if (fromEnv) return fromEnv;
    if (typeof window !== "undefined") {
      const host = window.location.hostname;
      if (host === "localhost" || host === "127.0.0.1") {
        return "http://localhost:5000";
      }
    }
    return "https://api-237jobs.onrender.com";
  })();

  function showToast(message: string, type: "success" | "error") {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }

  useEffect(() => {
    fetchPlatformSettings()
      .then((s) => {
        setSettings(s);
        setPlatformName(s.platformName);
        setMaintenanceMode(s.maintenanceMode);
        setAutoApprove(s.moderationRules.autoApproveAfterPosts);
        setBlockedKeywords(s.moderationRules.blockedKeywords);
        setEmailOnNewReport(s.notificationPreferences.emailOnNewReport);
        setWhatsappOnNewJob(s.notificationPreferences.whatsappOnNewJob);
        setEmailOnInternalAdminAlert(s.notificationPreferences.emailOnInternalAdminAlert);
        setWhatsappOnInternalAdminAlert(s.notificationPreferences.whatsappOnInternalAdminAlert);
      })
      .catch(() => showToast("Impossible de charger les parametres", "error"))
      .finally(() => setLoading(false));
  }, []);

  const doHealthCheck = useCallback(async () => {
    setHealthChecking(true);
    try {
      const data = await checkHealth();
      setHealthStatus(data.status);
    } catch {
      setHealthStatus("error");
    } finally {
      setHealthChecking(false);
      setLastCheck(new Date());
    }
  }, []);

  useEffect(() => {
    doHealthCheck();
    const iv = setInterval(doHealthCheck, 30000);
    return () => clearInterval(iv);
  }, [doHealthCheck]);

  async function saveSection(section: string, data: Partial<PlatformSettings>) {
    setSaving(section);
    try {
      const updated = await updatePlatformSettings(data);
      setSettings(updated);
      showToast("Parametres sauvegardes", "success");
    } catch {
      showToast("Erreur lors de la sauvegarde", "error");
    } finally {
      setSaving(null);
    }
  }

  function addKeyword() {
    const kw = newKeyword.trim().toLowerCase();
    if (kw && !blockedKeywords.includes(kw)) {
      setBlockedKeywords((prev) => [...prev, kw]);
      setNewKeyword("");
    }
  }

  if (loading) {
    return (
      <AdminShell title="Parametres" description="Configuration globale du back-office Bolo237.">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#DA7756]" />
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Parametres" description="Configuration globale du back-office Bolo237.">
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="space-y-6">
        {/* Section 1: Informations Plateforme */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF5EF] text-[#DA7756]">
              <Settings className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Informations Plateforme</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Nom de la plateforme</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="h-11 w-full max-w-md rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-[#DA7756] focus:ring-2 focus:ring-[#FEEBD6]"
              />
            </div>

            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-sm font-medium text-zinc-700">Mode maintenance</p>
                <p className="text-xs text-zinc-400">Desactive l&apos;acces public a la plateforme</p>
              </div>
              <Toggle
                checked={maintenanceMode}
                onChange={setMaintenanceMode}
                colorOn="bg-red-600"
                colorOff="bg-[#DA7756]"
              />
            </div>

            <button
              onClick={() => saveSection("platform", { platformName, maintenanceMode })}
              disabled={saving === "platform"}
              className="rounded-xl bg-[#DA7756] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C4623F] transition disabled:opacity-60"
            >
              {saving === "platform" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Section 2: Regles de Moderation */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <Shield className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Regles de Moderation</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">
                Auto-approuver apres N publications
              </label>
              <input
                type="number"
                min={0}
                value={autoApprove}
                onChange={(e) => setAutoApprove(Number(e.target.value))}
                className="h-11 w-32 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-[#DA7756] focus:ring-2 focus:ring-[#FEEBD6]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-1.5">Mots-cles bloques</label>
              <div className="flex flex-wrap gap-2 mb-3">
                {blockedKeywords.map((kw) => (
                  <span
                    key={kw}
                    className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-medium text-red-700"
                  >
                    {kw}
                    <button
                      onClick={() => setBlockedKeywords((prev) => prev.filter((k) => k !== kw))}
                      className="text-red-400 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
                {blockedKeywords.length === 0 && (
                  <span className="text-xs text-zinc-400">Aucun mot-cle bloque</span>
                )}
              </div>
              <div className="flex gap-2 max-w-md">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={(e) => setNewKeyword(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addKeyword();
                    }
                  }}
                  placeholder="Ajouter un mot-cle..."
                  className="h-11 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm outline-none focus:border-[#DA7756] focus:ring-2 focus:ring-[#FEEBD6]"
                />
                <button
                  onClick={addKeyword}
                  className="flex items-center gap-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                >
                  <Plus className="h-4 w-4" /> Ajouter
                </button>
              </div>
            </div>

            <button
              onClick={() =>
                saveSection("moderation", {
                  moderationRules: { autoApproveAfterPosts: autoApprove, blockedKeywords },
                })
              }
              disabled={saving === "moderation"}
              className="rounded-xl bg-[#DA7756] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C4623F] transition disabled:opacity-60"
            >
              {saving === "moderation" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Section 3: Preferences Notifications */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Bell className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Preferences Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-sm font-medium text-zinc-700">Email sur nouveau signalement</p>
                <p className="text-xs text-zinc-400">Recevoir un email a chaque signalement</p>
              </div>
              <Toggle checked={emailOnNewReport} onChange={setEmailOnNewReport} />
            </div>

            <div className="flex items-center justify-between max-w-md">
              <div>
                <p className="text-sm font-medium text-zinc-700">WhatsApp sur nouvelle offre</p>
                <p className="text-xs text-zinc-400">Notification WhatsApp a chaque nouvelle offre</p>
              </div>
              <Toggle checked={whatsappOnNewJob} onChange={setWhatsappOnNewJob} />
            </div>

            <div className="mt-2 rounded-2xl border border-blue-100 bg-blue-50/70 p-4">
              <p className="text-sm font-semibold text-zinc-900">Alertes internes admin</p>
              <p className="mt-1 text-xs text-zinc-500">
                Controle l&apos;escalade temps reel des notifications internes sensibles, en plus de leur affichage dans le back-office.
              </p>

              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">Email sur alerte interne</p>
                    <p className="text-xs text-zinc-400">Active l&apos;envoi email pour les demandes de suppression et autres alertes admin sensibles</p>
                  </div>
                  <Toggle checked={emailOnInternalAdminAlert} onChange={setEmailOnInternalAdminAlert} />
                </div>

                <div className="flex items-center justify-between max-w-md">
                  <div>
                    <p className="text-sm font-medium text-zinc-700">WhatsApp sur alerte interne</p>
                    <p className="text-xs text-zinc-400">Active l&apos;escalade WhatsApp vers la cellule admin configuree</p>
                  </div>
                  <Toggle checked={whatsappOnInternalAdminAlert} onChange={setWhatsappOnInternalAdminAlert} />
                </div>
              </div>
            </div>

            <button
              onClick={() =>
                saveSection("notifications", {
                  notificationPreferences: {
                    emailOnNewReport,
                    whatsappOnNewJob,
                    emailOnInternalAdminAlert,
                    whatsappOnInternalAdminAlert,
                  },
                })
              }
              disabled={saving === "notifications"}
              className="rounded-xl bg-[#DA7756] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#C4623F] transition disabled:opacity-60"
            >
              {saving === "notifications" ? <Loader2 className="h-4 w-4 animate-spin mx-auto" /> : "Sauvegarder"}
            </button>
          </div>
        </div>

        {/* Section 4: Sante API */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Server className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">Sante API</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                {healthStatus === "ok" || healthStatus === "healthy" ? (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#DA7756] opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-[#DA7756]" />
                  </>
                ) : healthStatus === null ? (
                  <span className="relative inline-flex h-3 w-3 rounded-full bg-zinc-300" />
                ) : (
                  <>
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
                  </>
                )}
              </span>
              <span className="text-sm font-medium text-zinc-700">
                {healthStatus === "ok" || healthStatus === "healthy"
                  ? "API operationnelle"
                  : healthStatus === null
                    ? "Verification..."
                    : "API hors ligne"}
              </span>
            </div>

            <div className="text-sm text-zinc-500 space-y-1">
              <p>
                <span className="font-medium text-zinc-600">URL :</span> {apiUrl}
              </p>
              {lastCheck && (
                <p>
                  <span className="font-medium text-zinc-600">Derniere verification :</span>{" "}
                  {lastCheck.toLocaleTimeString("fr-FR")}
                </p>
              )}
              <p className="text-xs text-zinc-400">Rafraichissement automatique toutes les 30s</p>
            </div>

            <button
              onClick={doHealthCheck}
              disabled={healthChecking}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${healthChecking ? "animate-spin" : ""}`} />
              Verifier
            </button>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
