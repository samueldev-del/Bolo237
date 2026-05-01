"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchJobs,
  updateJob,
  deleteJob,
  type Job,
  type Pagination,
} from "@/lib/api";
import {
  CheckCircle,
  XCircle,
  Trash2,
  Loader2,
  Eye,
  Filter,
  ChevronLeft,
  ChevronRight,
  MapPin,
  Building2,
  Calendar,
  Search,
  User,
} from "lucide-react";

type StatusFilter = "all" | "PENDING" | "APPROVED" | "REJECTED";

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "En attente", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  APPROVED: { label: "Approuve", cls: "bg-green-50 text-green-700 border-green-200" },
  ACTIVE: { label: "Active", cls: "bg-green-50 text-green-700 border-green-200" },
  REJECTED: { label: "Rejete", cls: "bg-red-50 text-red-700 border-red-200" },
  CLOSED: { label: "Cloturee", cls: "bg-zinc-100 text-zinc-700 border-zinc-200" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function ModerationJobsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedSearch = searchParams.get("search") || "";
  const highlightJobId = Number(searchParams.get("highlight") || 0);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState(appliedSearch);
  const [page, setPage] = useState(1);
  const [actionId, setActionId] = useState<number | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page, appliedSearch]);

  useEffect(() => {
    setSearchInput(appliedSearch);
    setPage(1);
  }, [appliedSearch]);

  useEffect(() => {
    if (highlightJobId) {
      const matchedJob = jobs.find((job) => job.id === highlightJobId);
      if (matchedJob) {
        setSelectedJob(matchedJob);
        return;
      }
    }

    if (selectedJob && !jobs.some((job) => job.id === selectedJob.id)) {
      setSelectedJob(null);
    }
  }, [jobs, highlightJobId, selectedJob]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { page, limit: 10 };
      if (statusFilter !== "all") filters.status = statusFilter;
      if (appliedSearch) filters.search = appliedSearch;
      const data = await fetchJobs(filters);
      setJobs(data.jobs);
      setPagination(data.pagination);
    } catch {
      showToast("Erreur lors du chargement des annonces");
    } finally {
      setLoading(false);
    }
  }

  function applySearch(nextSearch: string) {
    const params = new URLSearchParams(searchParams.toString());
    const trimmed = nextSearch.trim();

    if (trimmed) {
      params.set("search", trimmed);
    } else {
      params.delete("search");
    }

    params.delete("highlight");
    setPage(1);
    router.replace(`/moderation/jobs${params.toString() ? `?${params.toString()}` : ""}`);
  }

  async function handleAction(id: number, action: "APPROVED" | "REJECTED" | "DELETE") {
    setActionId(id);
    try {
      if (action === "DELETE") {
        if (!confirm("Supprimer cette annonce definitivement ?")) {
          setActionId(null);
          return;
        }
        await deleteJob(id);
        showToast("Annonce supprimee");
      } else {
        await updateJob(id, { status: action });
        showToast(action === "APPROVED" ? "Annonce approuvee" : "Annonce rejetee");
      }
      setJobs((prev) => action === "DELETE" ? prev.filter((j) => j.id !== id) : prev.map((j) => j.id === id ? { ...j, status: action as Job["status"] } : j));
      if (selectedJob?.id === id) {
        if (action === "DELETE") {
          setSelectedJob(null);
        } else {
          setSelectedJob({ ...selectedJob, status: action as Job["status"] });
        }
      }
    } catch {
      showToast("Erreur lors de l'action");
    } finally {
      setActionId(null);
    }
  }

  return (
    <AdminShell title="Moderation des annonces" description="Validez, rejetez ou supprimez les offres d'emploi.">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in rounded-xl border border-green-200 bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3 rounded-2xl border border-zinc-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-4 w-4 text-zinc-400" />
          {(["all", "PENDING", "APPROVED", "REJECTED"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                statusFilter === s
                  ? "border-green-700 bg-green-700 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-green-300 hover:text-green-700"
              }`}
            >
              {s === "all" ? "Toutes" : STATUS_LABELS[s].label}
            </button>
          ))}
          <span className="ml-auto text-xs text-zinc-400">
            {pagination ? `${pagination.total} annonce${pagination.total > 1 ? "s" : ""}` : ""}
          </span>
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  applySearch(searchInput);
                }
              }}
              placeholder="Rechercher par ID, titre, entreprise ou description..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-green-400 focus:bg-white focus:ring-2 focus:ring-green-100"
            />
          </label>

          <div className="flex gap-2">
            <button
              onClick={() => applySearch(searchInput)}
              className="rounded-xl bg-green-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-800"
            >
              Rechercher
            </button>
            {appliedSearch ? (
              <button
                onClick={() => {
                  setSearchInput("");
                  applySearch("");
                }}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50"
              >
                Effacer
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* List */}
        <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-8 py-20 text-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 shadow-sm m-6">
              <p className="text-sm text-zinc-600">Aucune annonce trouvee pour ce filtre.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {jobs.map((job) => (
                <div
                  key={job.id}
                  onClick={() => setSelectedJob(job)}
                  className={`flex items-center justify-between px-5 py-4 cursor-pointer transition hover:bg-green-50/50 ${
                    selectedJob?.id === job.id || highlightJobId === job.id
                      ? "bg-green-50/70 border-l-2 border-l-green-500"
                      : ""
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{job.title}</p>
                      <span className={`shrink-0 inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_LABELS[job.status]?.cls}`}>
                        {STATUS_LABELS[job.status]?.label}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-0.5 truncate">
                      {job.company} &bull; {job.location} &bull; {formatDate(job.createdAt)}
                    </p>
                    {job.author && (
                      <p className="text-[10px] text-zinc-400 mt-0.5 flex items-center gap-1">
                        <User className="h-3 w-3" /> Par {job.author.name || job.author.email}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 ml-3 shrink-0">
                    {job.status === "PENDING" && (
                      <>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(job.id, "APPROVED"); }}
                          disabled={actionId === job.id}
                          className="rounded-lg bg-green-50 p-2 text-green-600 hover:bg-green-100 transition disabled:opacity-40"
                          title="Approuver"
                        >
                          {actionId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAction(job.id, "REJECTED"); }}
                          disabled={actionId === job.id}
                          className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition disabled:opacity-40"
                          title="Rejeter"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleAction(job.id, "DELETE"); }}
                      disabled={actionId === job.id}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-red-50 hover:text-red-500 transition disabled:opacity-40"
                      title="Supprimer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-green-700 disabled:opacity-30"
              >
                <ChevronLeft className="h-4 w-4" /> Precedent
              </button>
              <span className="text-xs text-zinc-400">
                Page {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages}
                className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-green-700 disabled:opacity-30"
              >
                Suivant <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          {selectedJob ? (
            <div className="space-y-5">
              <div>
                <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_LABELS[selectedJob.status]?.cls}`}>
                  {STATUS_LABELS[selectedJob.status]?.label}
                </span>
                <h3 className="text-lg font-bold text-zinc-900 mt-3">{selectedJob.title}</h3>
              </div>

              <div className="space-y-2 text-sm text-zinc-600">
                <p className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-zinc-400" /> {selectedJob.company}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-zinc-400" /> {selectedJob.location}
                </p>
                <p className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-zinc-400" /> {formatDate(selectedJob.createdAt)}
                </p>
                {selectedJob.author && (
                  <p className="flex items-center gap-2">
                    <User className="h-4 w-4 text-zinc-400" /> {selectedJob.author.name || selectedJob.author.email}
                  </p>
                )}
                {selectedJob.salary && (
                  <p className="font-semibold text-green-700">{selectedJob.salary}</p>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Description</h4>
                <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">{selectedJob.description}</p>
              </div>

              {selectedJob.status === "PENDING" && (
                <div className="flex gap-2 pt-3 border-t border-zinc-100">
                  <button
                    onClick={() => handleAction(selectedJob.id, "APPROVED")}
                    disabled={actionId === selectedJob.id}
                    className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => handleAction(selectedJob.id, "REJECTED")}
                    disabled={actionId === selectedJob.id}
                    className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                  >
                    Rejeter
                  </button>
                </div>
              )}

              {selectedJob.status !== "PENDING" && (
                <div className="flex gap-2 pt-3 border-t border-zinc-100">
                  {selectedJob.status === "REJECTED" && (
                    <button
                      onClick={() => handleAction(selectedJob.id, "APPROVED")}
                      disabled={actionId === selectedJob.id}
                      className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      Approuver
                    </button>
                  )}
                  {(selectedJob.status === "APPROVED" || selectedJob.status === "ACTIVE") && (
                    <button
                      onClick={() => handleAction(selectedJob.id, "REJECTED")}
                      disabled={actionId === selectedJob.id}
                      className="flex-1 rounded-xl bg-red-600 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                      Rejeter
                    </button>
                  )}
                  <button
                    onClick={() => handleAction(selectedJob.id, "DELETE")}
                    disabled={actionId === selectedJob.id}
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                  >
                    Supprimer
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Eye className="h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-400">Cliquez sur une annonce pour voir les details</p>
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function ModerationJobsPageFallback() {
  return (
    <AdminShell title="Moderation des annonces" description="Validez, rejetez ou supprimez les offres d'emploi.">
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-green-600" />
      </div>
    </AdminShell>
  );
}

export default function ModerationJobsPage() {
  return (
    <Suspense fallback={<ModerationJobsPageFallback />}>
      <ModerationJobsPageContent />
    </Suspense>
  );
}
