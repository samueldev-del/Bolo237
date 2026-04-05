"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { fetchAppFeedbacks, type AppFeedback } from "@/lib/api";
import { matchesDateRange, matchesTextQuery } from "@/lib/admin-filters";
import { buildCsvContent, downloadCsvFile } from "@/lib/csv";
import { Download, Loader2, Search, Star, MessageSquare } from "lucide-react";

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function Stars({ rating, size = "h-4 w-4" }: { rating: number; size?: string }) {
  return (
    <span className="inline-flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`${size} ${
            i <= rating ? "fill-current text-amber-400" : "text-zinc-200"
          }`}
        />
      ))}
    </span>
  );
}

export default function FeedbacksPage() {
  const [feedbacks, setFeedbacks] = useState<AppFeedback[]>([]);
  const [summary, setSummary] = useState<{
    averageRating: number;
    count: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [query, setQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchAppFeedbacks(200)
      .then((data) => {
        setFeedbacks(
          [...data.items].sort(
            (a, b) =>
              new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
        );
        setSummary(data.summary);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  function handleExportCsv() {
    setIsExportingCsv(true);

    try {
      const csv = buildCsvContent(
        ["feedbackId", "createdAt", "authorName", "userId", "rating", "comment"],
        filteredFeedbacks.map((feedback) => [
          feedback.id,
          feedback.createdAt,
          feedback.authorName || "",
          feedback.userId || "",
          feedback.rating,
          feedback.comment,
        ]),
      );
      const stamp = new Date().toISOString().slice(0, 10);

      downloadCsvFile(csv, `bolo237-feedbacks-app-${stamp}.csv`);
      showToast(`CSV exporte (${filteredFeedbacks.length} ligne${filteredFeedbacks.length > 1 ? "s" : ""})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors de l export CSV");
    } finally {
      setIsExportingCsv(false);
    }
  }

  const filteredFeedbacks = feedbacks.filter((feedback) => (
    matchesTextQuery(
      [feedback.id, feedback.authorName, feedback.userId, feedback.rating, feedback.comment],
      query,
    ) && matchesDateRange(feedback.createdAt, startDate || undefined, endDate || undefined)
  ));

  const filteredAverage = filteredFeedbacks.length > 0
    ? filteredFeedbacks.reduce((sum, feedback) => sum + feedback.rating, 0) / filteredFeedbacks.length
    : 0;

  return (
    <AdminShell
      title="Feedbacks App"
      description="Retours et avis des utilisateurs sur l'application."
    >
      {toast && (
        <div className="fixed right-6 top-6 z-[100] animate-fade-in rounded-xl border border-emerald-200 bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-zinc-900">Export produit des feedbacks</p>
              <p className="mt-1 text-xs text-zinc-500">Le CSV reprend les retours visibles selon les filtres actifs.</p>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv || filteredFeedbacks.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B4332] bg-[#FFF7F2] px-4 py-2.5 text-sm font-bold text-[#8B4332] transition hover:bg-[#FDEBDD] disabled:opacity-50"
            >
              {isExportingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExportingCsv ? "Export CSV..." : "Exporter CSV"}
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-zinc-200 bg-white p-5 xl:grid-cols-[minmax(0,1.6fr)_180px_180px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher par auteur, commentaire, note..."
                className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
              />
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
            />
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
            />
            <button
              onClick={() => {
                setQuery("");
                setStartDate("");
                setEndDate("");
              }}
              disabled={!query && !startDate && !endDate}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Reinitialiser
            </button>
          </div>

          {/* Summary */}
          {summary && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 flex items-center gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold text-zinc-900">
                  {filteredFeedbacks.length > 0 ? filteredAverage.toFixed(1) : "0.0"}
                </p>
                <Stars
                  rating={Math.round(filteredFeedbacks.length > 0 ? filteredAverage : 0)}
                  size="h-5 w-5"
                />
              </div>
              <div className="border-l border-zinc-200 pl-6">
                <p className="text-sm text-zinc-500">Feedbacks filtres</p>
                <p className="text-2xl font-bold text-zinc-900">
                  {filteredFeedbacks.length}
                </p>
              </div>
            </div>
          )}

          {/* Feedback grid */}
          {filteredFeedbacks.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
              <MessageSquare className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-500">
                Aucun feedback ne correspond aux filtres
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredFeedbacks.map((fb) => (
                <div
                  key={fb.id}
                  className="rounded-2xl border border-zinc-200 bg-white p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-zinc-800">
                      {fb.authorName || "Anonyme"}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {formatDate(fb.createdAt)}
                    </span>
                  </div>
                  <Stars rating={fb.rating} />
                  {fb.comment && (
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {fb.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}
