"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { fetchReports, updateReport, type Report } from "@/lib/api";
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Filter,
  Flag,
  Clock,
  ShieldCheck,
  ShieldX,
} from "lucide-react";

type StatusFilter = "all" | "OPEN" | "RESOLVED" | "DISMISSED";

const STATUS_CONFIG: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  OPEN: { label: "Ouvert", cls: "bg-red-50 text-red-700 border-red-200", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  RESOLVED: { label: "Résolu", cls: "bg-green-50 text-green-700 border-green-200", icon: <ShieldCheck className="h-3.5 w-3.5" /> },
  DISMISSED: { label: "Rejeté", cls: "bg-zinc-100 text-zinc-600 border-zinc-200", icon: <ShieldX className="h-3.5 w-3.5" /> },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AlertesSignalementsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [actionId, setActionId] = useState<number | null>(null);

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchReports(statusFilter === "all" ? undefined : statusFilter);
      setReports(data);
    } catch {
      /* vide */
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(id: number, status: "RESOLVED" | "DISMISSED") {
    setActionId(id);
    try {
      await updateReport(id, { status });
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch {
      alert("Erreur lors de la mise à jour");
    } finally {
      setActionId(null);
    }
  }

  const filtered = reports;
  const openCount = reports.filter((r) => r.status === "OPEN").length;

  return (
    <AdminShell title="Signalements" description="Suivi en temps réel des alertes fraude et abus.">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {(["all", "OPEN", "RESOLVED", "DISMISSED"] as StatusFilter[]).map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === s
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {s === "all" ? "Tous" : STATUS_CONFIG[s].label}
          </button>
        ))}
        {openCount > 0 && (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-red-50 border border-red-200 px-3 py-1 text-xs font-bold text-red-700">
            <Flag className="h-3 w-3" /> {openCount} ouvert{openCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Liste */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
            <p className="text-sm font-medium text-zinc-600">Aucun signalement trouvé</p>
            <p className="text-xs text-zinc-400 mt-1">Tout est sain !</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((report) => {
              const cfg = STATUS_CONFIG[report.status] || STATUS_CONFIG.OPEN;
              return (
                <div key={report.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${report.status === "OPEN" ? "bg-red-100 text-red-600" : "bg-zinc-100 text-zinc-500"}`}>
                      <Flag className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800">{report.reason}</p>
                      <p className="text-xs text-zinc-500 mt-0.5 flex items-center gap-2">
                        <span>Cible : {report.targetType} #{report.targetId}</span>
                        <span className="text-zinc-300">&bull;</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatDate(report.createdAt)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${cfg.cls}`}>
                      {cfg.icon} {cfg.label}
                    </span>

                    {report.status === "OPEN" && (
                      <>
                        <button
                          onClick={() => handleAction(report.id, "RESOLVED")}
                          disabled={actionId === report.id}
                          className="rounded-lg p-2 text-green-600 hover:bg-green-100 transition disabled:opacity-40"
                          title="Marquer comme résolu"
                        >
                          {actionId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleAction(report.id, "DISMISSED")}
                          disabled={actionId === report.id}
                          className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600 transition disabled:opacity-40"
                          title="Rejeter le signalement"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
