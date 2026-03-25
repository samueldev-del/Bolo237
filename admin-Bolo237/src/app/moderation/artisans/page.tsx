"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchVerificationSubmissions,
  reviewVerification,
  type VerificationSubmission,
} from "@/lib/api";
import {
  CheckCircle,
  XCircle,
  Loader2,
  ShieldCheck,
  Phone,
  Key,
  Clock,
  ChevronDown,
  ChevronUp,
  History,
  FileText,
} from "lucide-react";

const IMAGE_KEYS = [
  "logoPreview",
  "legalDocPreview",
  "profilePhotoPreview",
  "idFrontPreview",
  "idBackPreview",
];

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  entreprise: {
    label: "Entreprise",
    cls: "bg-purple-50 text-purple-700 border-purple-200",
  },
  artisan: {
    label: "Artisan",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
};

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  pending: {
    label: "En attente",
    cls: "bg-amber-50 text-amber-700 border-amber-200",
  },
  approved: {
    label: "Approuve",
    cls: "bg-green-50 text-green-700 border-green-200",
  },
  rejected: {
    label: "Rejete",
    cls: "bg-red-50 text-red-700 border-red-200",
  },
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

export default function ModerationArtisansPage() {
  const [submissions, setSubmissions] = useState<VerificationSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [toast, setToast] = useState("");
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const data = await fetchVerificationSubmissions();
      setSubmissions(data);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function handleReview(
    id: string,
    status: "approved" | "rejected"
  ) {
    setActionId(id);
    try {
      const updated = await reviewVerification(id, {
        status,
        reviewedBy: "admin",
        notes: notes[id] || undefined,
      });
      setSubmissions((prev) =>
        prev.map((s) => (s.id === id ? updated : s))
      );
      showToast(
        status === "approved"
          ? "Verification approuvee"
          : "Verification rejetee"
      );
    } catch {
      showToast("Erreur lors de la verification");
    } finally {
      setActionId(null);
    }
  }

  const pending = submissions.filter((s) => s.status === "pending");
  const reviewed = submissions.filter((s) => s.status !== "pending");

  return (
    <AdminShell
      title="Verification d'identite"
      description="Validez les soumissions KYC des artisans et entreprises."
    >
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in rounded-xl border border-green-200 bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : (
        <>
          {/* Pending queue */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600" />
              <h2 className="text-base font-semibold text-zinc-800">
                En attente de verification
              </h2>
              {pending.length > 0 && (
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {pending.length}
                </span>
              )}
            </div>

            {pending.length === 0 ? (
              <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center">
                <CheckCircle className="mx-auto h-10 w-10 text-green-400 mb-3" />
                <p className="text-sm font-medium text-zinc-600">
                  Aucune soumission en attente
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Tout est a jour !
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {pending.map((sub) => (
                  <SubmissionCard
                    key={sub.id}
                    submission={sub}
                    actionId={actionId}
                    noteValue={notes[sub.id] || ""}
                    onNoteChange={(val) =>
                      setNotes((prev) => ({ ...prev, [sub.id]: val }))
                    }
                    onApprove={() => handleReview(sub.id, "approved")}
                    onReject={() => handleReview(sub.id, "rejected")}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Reviewed history */}
          {reviewed.length > 0 && (
            <div className="space-y-4">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="flex items-center gap-2 text-base font-semibold text-zinc-800 hover:text-zinc-600 transition"
              >
                <History className="h-5 w-5 text-zinc-500" />
                Historique ({reviewed.length})
                {showHistory ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>

              {showHistory && (
                <div className="space-y-3">
                  {reviewed.map((sub) => (
                    <div
                      key={sub.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-5"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-zinc-800">
                            {sub.displayName}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_BADGE[sub.role]?.cls}`}
                          >
                            {ROLE_BADGE[sub.role]?.label}
                          </span>
                          <span
                            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${STATUS_BADGE[sub.status]?.cls}`}
                          >
                            {STATUS_BADGE[sub.status]?.label}
                          </span>
                        </div>
                        <span className="text-xs text-zinc-400">
                          {sub.reviewedAt
                            ? formatDate(sub.reviewedAt)
                            : formatDate(sub.submittedAt)}
                        </span>
                      </div>
                      {sub.notes && (
                        <p className="text-xs text-zinc-500 italic">
                          Note: {sub.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </AdminShell>
  );
}

function SubmissionCard({
  submission: sub,
  actionId,
  noteValue,
  onNoteChange,
  onApprove,
  onReject,
}: {
  submission: VerificationSubmission;
  actionId: string | null;
  noteValue: string;
  onNoteChange: (val: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const isLoading = actionId === sub.id;
  const images = IMAGE_KEYS.filter(
    (k) =>
      sub.payload[k] &&
      typeof sub.payload[k] === "string" &&
      (sub.payload[k] as string).startsWith("data:")
  );
  const textFields = Object.entries(sub.payload).filter(
    ([k, v]) => !IMAGE_KEYS.includes(k) && v !== null && v !== ""
  );

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-100 text-sm font-bold text-zinc-600">
            {sub.displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-800">
                {sub.displayName}
              </span>
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${ROLE_BADGE[sub.role]?.cls}`}
              >
                {ROLE_BADGE[sub.role]?.label}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-xs text-zinc-500">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {sub.phone}
              </span>
              <span className="flex items-center gap-1">
                <Key className="h-3 w-3" /> {sub.accountKey}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {formatDate(sub.submittedAt)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Text payload fields */}
      {textFields.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {textFields.map(([key, val]) => (
            <div key={key} className="rounded-xl bg-zinc-50 border border-zinc-100 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-1 flex items-center gap-1">
                <FileText className="h-3 w-3" /> {key}
              </p>
              <p className="text-sm text-zinc-700 break-all">{String(val)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Image previews */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {images.map((key) => (
            <div key={key} className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                {key.replace("Preview", "")}
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sub.payload[key] as string}
                alt={key}
                className="h-32 w-auto rounded-xl border border-zinc-200 object-cover"
              />
            </div>
          ))}
        </div>
      )}

      {/* Notes + Actions */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3 pt-3 border-t border-zinc-100">
        <textarea
          value={noteValue}
          onChange={(e) => onNoteChange(e.target.value)}
          placeholder="Notes (optionnel)..."
          rows={2}
          className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700 outline-none transition placeholder:text-zinc-400 focus:border-green-300 focus:ring-2 focus:ring-green-100 resize-none"
        />
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Approuver
          </button>
          <button
            onClick={onReject}
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:opacity-50"
          >
            <XCircle className="h-4 w-4" />
            Rejeter
          </button>
        </div>
      </div>
    </div>
  );
}
