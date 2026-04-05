"use client";

import { useEffect, useState, type ReactNode } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchAdminPrivacyRequests,
  updateAdminPrivacyRequest,
  type AdminPrivacyRequest,
  type AdminPrivacyRequestSummary,
  type Pagination,
  type PrivacyRequestKind,
  type PrivacyRequestStatus,
} from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  Download,
  Filter,
  Loader2,
  Save,
  SearchX,
  ShieldCheck,
  Trash2,
} from "lucide-react";

type StatusFilter = "all" | PrivacyRequestStatus;
type KindFilter = "all" | PrivacyRequestKind;

type DraftState = Record<string, { status: PrivacyRequestStatus; notes: string }>;

const STATUS_CONFIG: Record<PrivacyRequestStatus, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  IN_REVIEW: { label: "En revue", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  COMPLETED: { label: "Traite", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  REJECTED: { label: "Rejete", cls: "bg-zinc-100 text-zinc-600 border-zinc-200" },
};

const KIND_CONFIG: Record<PrivacyRequestKind, { label: string; cls: string; icon: ReactNode }> = {
  EXPORT: {
    label: "Export",
    cls: "bg-violet-50 text-violet-700 border-violet-200",
    icon: <Download className="h-4 w-4" />,
  },
  DELETE: {
    label: "Suppression",
    cls: "bg-red-50 text-red-700 border-red-200",
    icon: <Trash2 className="h-4 w-4" />,
  },
};

const EMPTY_SUMMARY: AdminPrivacyRequestSummary = {
  total: 0,
  pending: 0,
  inReview: 0,
  completed: 0,
  rejected: 0,
  exports: 0,
  deletions: 0,
};

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildDrafts(items: AdminPrivacyRequest[]): DraftState {
  return items.reduce<DraftState>((acc, item) => {
    acc[item.reference] = {
      status: item.status,
      notes: item.notes || "",
    };
    return acc;
  }, {});
}

export default function AlertesConfidentialitePage() {
  const [items, setItems] = useState<AdminPrivacyRequest[]>([]);
  const [summary, setSummary] = useState<AdminPrivacyRequestSummary>(EMPTY_SUMMARY);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [kindFilter, setKindFilter] = useState<KindFilter>("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [actionReference, setActionReference] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftState>({});
  const [toast, setToast] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, kindFilter, page]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function load() {
    setLoading(true);
    try {
      const response = await fetchAdminPrivacyRequests({
        status: statusFilter === "all" ? undefined : statusFilter,
        kind: kindFilter === "all" ? undefined : kindFilter,
        page,
        limit: 20,
      });
      setItems(response.items);
      setSummary(response.summary);
      setPagination(response.pagination);
      setDrafts(buildDrafts(response.items));
    } catch {
      setItems([]);
      setSummary(EMPTY_SUMMARY);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }

  function updateDraft(reference: string, patch: Partial<{ status: PrivacyRequestStatus; notes: string }>) {
    setDrafts((prev) => ({
      ...prev,
      [reference]: {
        status: patch.status || prev[reference]?.status || "PENDING",
        notes: patch.notes ?? prev[reference]?.notes ?? "",
      },
    }));
  }

  async function handleSave(reference: string) {
    const draft = drafts[reference];
    if (!draft) return;

    setActionReference(reference);
    try {
      const updated = await updateAdminPrivacyRequest(reference, {
        status: draft.status,
        notes: draft.notes,
      });
      setItems((prev) => prev.map((item) => (item.reference === reference ? updated : item)));
      setDrafts((prev) => ({
        ...prev,
        [reference]: { status: updated.status, notes: updated.notes || "" },
      }));
      showToast("Demande mise a jour");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors de la mise a jour");
    } finally {
      setActionReference(null);
    }
  }

  return (
    <AdminShell title="Demandes confidentialite" description="Journal des exports de donnees et demandes de suppression avec suivi par reference.">
      {toast && (
        <div className="fixed right-6 top-6 z-[100] animate-fade-in rounded-xl border border-emerald-200 bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Total</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900">{summary.total}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">En attente</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-900">{summary.pending}</p>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-blue-700">En revue</p>
          <p className="mt-2 text-3xl font-extrabold text-blue-900">{summary.inReview}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Exports / Suppressions</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900">{summary.exports} / {summary.deletions}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          {(["all", "PENDING", "IN_REVIEW", "COMPLETED", "REJECTED"] as StatusFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => {
                setStatusFilter(value);
                setPage(1);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === value
                  ? "border-[#8B4332] bg-[#8B4332] text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-[#C4623F] hover:text-[#8B4332]"
              }`}
            >
              {value === "all" ? "Tous statuts" : STATUS_CONFIG[value].label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["all", "EXPORT", "DELETE"] as KindFilter[]).map((value) => (
            <button
              key={value}
              onClick={() => {
                setKindFilter(value);
                setPage(1);
              }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                kindFilter === value
                  ? "border-zinc-900 bg-zinc-900 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400 hover:text-zinc-900"
              }`}
            >
              {value === "all" ? "Tous types" : KIND_CONFIG[value].label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B4332]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-700">Aucune demande pour ces filtres</p>
            <p className="mt-1 text-xs text-zinc-400">Les references d&apos;export et de suppression apparaitront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((item) => {
              const statusCfg = STATUS_CONFIG[item.status];
              const kindCfg = KIND_CONFIG[item.kind];
              const draft = drafts[item.reference] || { status: item.status, notes: item.notes || "" };

              return (
                <div key={item.reference} className="px-5 py-5">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${kindCfg.cls}`}>
                          {kindCfg.icon}
                          {kindCfg.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusCfg.cls}`}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                          {statusCfg.label}
                        </span>
                        <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-1 font-mono text-[11px] text-zinc-700">
                          {item.reference}
                        </span>
                      </div>

                      <div className="mt-3 space-y-1">
                        <p className="text-sm font-semibold text-zinc-900">
                          {item.requesterName || item.user?.name || item.requesterEmail}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {item.requesterEmail}
                          {item.requesterRole ? ` • ${item.requesterRole}` : ""}
                          {item.requesterPhone ? ` • ${item.requesterPhone}` : ""}
                        </p>
                        <p className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="h-3.5 w-3.5" /> {formatDate(item.requestedAt)}
                          </span>
                          <span className="text-zinc-300">•</span>
                          <span>Livraison: {item.delivery || "n/a"}</span>
                          {item.sourceIp ? (
                            <>
                              <span className="text-zinc-300">•</span>
                              <span>IP: {item.sourceIp}</span>
                            </>
                          ) : null}
                        </p>
                      </div>

                      {item.reason ? (
                        <div className="mt-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                          <span className="font-bold">Motif:</span> {item.reason}
                        </div>
                      ) : null}

                      {item.processedAt || item.processedBy ? (
                        <p className="mt-3 text-xs text-zinc-500">
                          Dernier traitement: {formatDate(item.processedAt)}
                          {item.processedBy ? ` par ${item.processedBy}` : ""}
                        </p>
                      ) : null}
                    </div>

                    <div className="w-full xl:max-w-[360px] rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                      <label className="block text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Statut
                      </label>
                      <select
                        value={draft.status}
                        onChange={(event) => updateDraft(item.reference, { status: event.target.value as PrivacyRequestStatus })}
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm font-medium text-zinc-800 outline-none transition focus:border-[#C4623F]"
                      >
                        {(Object.keys(STATUS_CONFIG) as PrivacyRequestStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {STATUS_CONFIG[status].label}
                          </option>
                        ))}
                      </select>

                      <label className="mt-4 block text-xs font-bold uppercase tracking-wide text-zinc-500">
                        Notes internes
                      </label>
                      <textarea
                        value={draft.notes}
                        onChange={(event) => updateDraft(item.reference, { notes: event.target.value.slice(0, 4000) })}
                        rows={4}
                        placeholder="Ajouter une note de traitement ou une justification"
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm text-zinc-800 outline-none transition focus:border-[#C4623F]"
                      />

                      <button
                        onClick={() => void handleSave(item.reference)}
                        disabled={actionReference === item.reference}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#8B4332] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#6B3325] disabled:opacity-60"
                      >
                        {actionReference === item.reference ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Sauvegarder le suivi
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-600">
          <p>
            Page {pagination.page} / {pagination.totalPages} • {pagination.total} resultat{pagination.total > 1 ? "s" : ""}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              disabled={pagination.page <= 1}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Prec.
            </button>
            <button
              onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
              disabled={pagination.page >= pagination.totalPages}
              className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-3 py-1.5 font-semibold text-zinc-700 transition hover:border-zinc-400 disabled:opacity-40"
            >
              Suiv. <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}