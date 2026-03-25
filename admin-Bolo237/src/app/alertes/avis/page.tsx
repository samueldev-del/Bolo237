"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchAdminReviews,
  type UserReview,
  type ReviewAlert,
} from "@/lib/api";
import {
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

  useEffect(() => {
    fetchAdminReviews()
      .then((data) => {
        setReviews(data.reviews);
        setAlerts(data.alerts);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <AdminShell
      title="Avis & Notes"
      description="Tous les avis utilisateurs et alertes de mauvaises notes."
    >
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
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
