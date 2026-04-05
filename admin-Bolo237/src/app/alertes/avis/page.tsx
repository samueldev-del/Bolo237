"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchAdminReviews,
  type UserReview,
  type ReviewAlert,
} from "@/lib/api";
import { buildCsvContent, downloadCsvFile } from "@/lib/csv";
import {
  Download,
  Loader2,
  AlertTriangle,
  Star,
  ArrowRight,
} from "lucide-react";

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
            i <= rating
              ? "fill-current text-amber-400"
              : "text-zinc-200"
          }`}
        />
      ))}
    </span>
  );
}

function ratingColor(rating: number): string {
  if (rating <= 2) return "text-red-600";
  if (rating === 3) return "text-amber-600";
  return "text-green-600";
}

export default function ReviewsAlertsPage() {
  const [reviews, setReviews] = useState<UserReview[]>([]);
  const [alerts, setAlerts] = useState<ReviewAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    fetchAdminReviews(200)
      .then((data) => {
        setReviews(data.reviews);
        setAlerts(data.alerts);
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
      const alertedUserIds = new Set(alerts.map((alert) => alert.userId));
      const csv = buildCsvContent(
        [
          "reviewId",
          "createdAt",
          "rating",
          "comment",
          "reviewerName",
          "reviewerEmail",
          "reviewerRole",
          "reviewedName",
          "reviewedEmail",
          "reviewedRole",
          "reviewedUserFlagged",
        ],
        reviews.map((review) => [
          review.id,
          review.createdAt,
          review.rating,
          review.comment,
          review.reviewer?.name || "",
          review.reviewer?.email || "",
          review.reviewer?.role || "",
          review.reviewed?.name || "",
          review.reviewed?.email || "",
          review.reviewed?.role || "",
          review.reviewed?.id ? (alertedUserIds.has(review.reviewed.id) ? "yes" : "no") : "unknown",
        ]),
      );
      const stamp = new Date().toISOString().slice(0, 10);

      downloadCsvFile(csv, `bolo237-avis-${stamp}.csv`);
      showToast(`CSV exporte (${reviews.length} ligne${reviews.length > 1 ? "s" : ""})`);
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors de l export CSV");
    } finally {
      setIsExportingCsv(false);
    }
  }

  return (
    <AdminShell
      title="Avis & Notes"
      description="Tous les avis utilisateurs et alertes de mauvaises notes."
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
              <p className="text-sm font-semibold text-zinc-900">Export moderation des avis</p>
              <p className="mt-1 text-xs text-zinc-500">Le CSV reprend tous les avis charges et signale les comptes actuellement sous alerte de note faible.</p>
            </div>
            <button
              onClick={handleExportCsv}
              disabled={isExportingCsv || reviews.length === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B4332] bg-[#FFF7F2] px-4 py-2.5 text-sm font-bold text-[#8B4332] transition hover:bg-[#FDEBDD] disabled:opacity-50"
            >
              {isExportingCsv ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              {isExportingCsv ? "Export CSV..." : "Exporter CSV"}
            </button>
          </div>

          {/* Alert banner */}
          {alerts.length > 0 && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h2 className="text-sm font-bold text-red-800">
                  Utilisateurs avec une note moyenne &le; 2.5
                </h2>
              </div>
              <div className="space-y-2">
                {alerts.map((alert) => (
                  <div
                    key={alert.userId}
                    className="flex items-center justify-between rounded-xl bg-white border border-red-100 px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-700">
                        {alert.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-zinc-800">
                          {alert.name}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {alert.role} &middot; {alert.reviewCount} avis
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-red-600">
                        {alert.averageRating.toFixed(1)}
                      </span>
                      <Stars rating={Math.round(alert.averageRating)} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All reviews */}
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-zinc-800">
              Tous les avis ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
                <Star className="mx-auto h-10 w-10 text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-500">Aucun avis pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="rounded-2xl border border-zinc-200 bg-white p-5"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="font-semibold text-zinc-800">
                          {review.reviewer?.name || "Anonyme"}
                        </span>
                        <ArrowRight className="h-3 w-3 text-zinc-400" />
                        <span className="font-semibold text-zinc-800">
                          {review.reviewed?.name || "Inconnu"}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-400 shrink-0 ml-3">
                        {formatDate(review.createdAt)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <Stars rating={review.rating} />
                      <span
                        className={`text-sm font-bold ${ratingColor(
                          review.rating
                        )}`}
                      >
                        {review.rating}/5
                      </span>
                    </div>
                    {review.comment && (
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {review.comment}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </AdminShell>
  );
}
