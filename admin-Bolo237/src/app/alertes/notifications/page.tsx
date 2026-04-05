"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchAdminMyNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type Pagination,
} from "@/lib/api";
import {
  ArrowLeft,
  ArrowRight,
  Bell,
  BellRing,
  CheckCheck,
  Clock3,
  Loader2,
  RefreshCw,
  Search,
  SearchX,
} from "lucide-react";

type NotificationFilter = "all" | "unread";

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: 20,
  total: 0,
  totalPages: 1,
};

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTypeLabel(type: string) {
  return type
    .split("_")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getReference(data: AdminNotification["data"]) {
  if (!data || typeof data !== "object") return null;

  const reference = data.reference;
  return typeof reference === "string" && reference.trim() ? reference : null;
}

export default function AlertesNotificationsPage() {
  const [items, setItems] = useState<AdminNotification[]>([]);
  const [pagination, setPagination] = useState<Pagination>(EMPTY_PAGINATION);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [startDateInput, setStartDateInput] = useState("");
  const [endDateInput, setEndDateInput] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [actionId, setActionId] = useState<number | null>(null);
  const [markAllLoading, setMarkAllLoading] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, page, query, startDate, endDate]);

  function showToast(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(""), 3200);
  }

  async function load() {
    setLoading(true);
    try {
      const response = await fetchAdminMyNotifications({
        page,
        limit: 20,
        unreadOnly: filter === "unread",
        query,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setItems(response.items);
      setUnreadCount(response.unreadCount);
      setPagination(response.pagination);
    } catch {
      setItems([]);
      setUnreadCount(0);
      setPagination(EMPTY_PAGINATION);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkRead(id: number) {
    setActionId(id);
    try {
      await markAdminNotificationRead(id);
      showToast("Notification marquee comme lue");
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors de la mise a jour");
    } finally {
      setActionId(null);
    }
  }

  async function handleMarkAllRead() {
    setMarkAllLoading(true);
    try {
      const result = await markAllAdminNotificationsRead();
      showToast(result.updated > 0 ? `${result.updated} notification${result.updated > 1 ? "s" : ""} marquee${result.updated > 1 ? "es" : "e"} comme lue${result.updated > 1 ? "s" : ""}` : "Aucune notification non lue");
      if (filter === "unread") {
        setPage(1);
      }
      await load();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Erreur lors du marquage global");
    } finally {
      setMarkAllLoading(false);
    }
  }

  function applySearchFilters() {
    if (startDateInput && endDateInput && startDateInput > endDateInput) {
      showToast("La date de debut doit etre anterieure ou egale a la date de fin");
      return;
    }

    setQuery(queryInput.trim());
    setStartDate(startDateInput);
    setEndDate(endDateInput);
    setPage(1);
  }

  function resetSearchFilters() {
    setQueryInput("");
    setQuery("");
    setStartDateInput("");
    setEndDateInput("");
    setStartDate("");
    setEndDate("");
    setPage(1);
  }

  return (
    <AdminShell
      title="Notifications internes"
      description="File personnelle des alertes admin generees par les demandes de confidentialite et les operations sensibles."
    >
      {toast && (
        <div className="fixed right-6 top-6 z-[100] animate-fade-in rounded-xl border border-emerald-200 bg-emerald-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Non lues</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900">{unreadCount}</p>
        </div>
        <div className="rounded-2xl border border-zinc-200 bg-white p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-zinc-500">Sur cette page</p>
          <p className="mt-2 text-3xl font-extrabold text-zinc-900">{items.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-extrabold uppercase tracking-wide text-amber-700">Fil actif</p>
          <p className="mt-2 text-3xl font-extrabold text-amber-900">{filter === "unread" ? "Non lues" : "Toutes"}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "unread"] as NotificationFilter[]).map((value) => (
              <button
                key={value}
                onClick={() => {
                  setFilter(value);
                  setPage(1);
                }}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  filter === value
                    ? "border-[#8B4332] bg-[#8B4332] text-white"
                    : "border-zinc-200 bg-white text-zinc-600 hover:border-[#C4623F] hover:text-[#8B4332]"
                }`}
              >
                {value === "unread" ? "Non lues" : "Toutes"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm font-semibold text-zinc-700 transition hover:bg-white disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
            <button
              onClick={() => void handleMarkAllRead()}
              disabled={markAllLoading || unreadCount === 0}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B4332] bg-[#FFF7F2] px-4 py-2.5 text-sm font-bold text-[#8B4332] transition hover:bg-[#FDEBDD] disabled:opacity-50"
            >
              {markAllLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
              Tout marquer lu
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.6fr)_180px_180px_auto]">
          <label className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={queryInput}
              onChange={(event) => setQueryInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  applySearchFilters();
                }
              }}
              placeholder="Rechercher dans le titre, message ou type..."
              className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
            />
          </label>

          <input
            type="date"
            value={startDateInput}
            onChange={(event) => setStartDateInput(event.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
          />

          <input
            type="date"
            value={endDateInput}
            onChange={(event) => setEndDateInput(event.target.value)}
            className="h-11 rounded-xl border border-zinc-200 bg-zinc-50 px-4 text-sm text-zinc-800 outline-none transition focus:border-[#8B4332] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
          />

          <div className="flex items-center gap-2">
            <button
              onClick={applySearchFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[#8B4332] bg-[#8B4332] px-4 text-sm font-bold text-white transition hover:bg-[#723527]"
            >
              Appliquer
            </button>
            <button
              onClick={resetSearchFilters}
              disabled={!query && !startDate && !endDate && !queryInput && !startDateInput && !endDateInput}
              className="inline-flex h-11 items-center justify-center rounded-xl border border-zinc-200 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-50"
            >
              Reinitialiser
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          Les filtres s&apos;appliquent a la pagination courante. La recherche couvre le titre, le message et le type de notification.
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#8B4332]" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <SearchX className="mb-3 h-10 w-10 text-zinc-300" />
            <p className="text-sm font-medium text-zinc-600">Aucune notification a afficher</p>
            <p className="mt-1 text-xs text-zinc-400">Les prochaines alertes internes apparaitront ici.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {items.map((item) => {
              const reference = getReference(item.data);

              return (
                <div
                  key={item.id}
                  className={`flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-start lg:justify-between ${
                    item.isRead ? "bg-white" : "bg-amber-50/45"
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-bold ${
                        item.isRead
                          ? "border-zinc-200 bg-zinc-100 text-zinc-600"
                          : "border-amber-200 bg-amber-100 text-amber-800"
                      }`}>
                        {item.isRead ? <Bell className="h-3.5 w-3.5" /> : <BellRing className="h-3.5 w-3.5" />}
                        {item.isRead ? "Lue" : "Nouvelle"}
                      </span>
                      <span className="inline-flex items-center rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-zinc-500">
                        {formatTypeLabel(item.type)}
                      </span>
                      {reference ? (
                        <span className="inline-flex items-center rounded-full border border-[#E8C4B0] bg-[#FFF7F2] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#8B4332]">
                          Ref {reference}
                        </span>
                      ) : null}
                    </div>

                    <h2 className="mt-3 text-base font-semibold text-zinc-900">{item.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-600">{item.message}</p>

                    <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-zinc-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {formatDate(item.createdAt)}
                      </span>
                      {item.readAt ? <span>Lue le {formatDate(item.readAt)}</span> : null}
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    {!item.isRead ? (
                      <button
                        onClick={() => void handleMarkRead(item.id)}
                        disabled={actionId === item.id}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#8B4332] bg-[#FFF7F2] px-4 py-2 text-sm font-bold text-[#8B4332] transition hover:bg-[#FDEBDD] disabled:opacity-50"
                      >
                        {actionId === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCheck className="h-4 w-4" />}
                        Marquer comme lue
                      </button>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setPage((prev) => Math.max(1, prev - 1))}
          disabled={page <= 1 || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
        >
          <ArrowLeft className="h-4 w-4" />
          Precedent
        </button>
        <span className="text-sm text-zinc-500">
          Page {pagination.page} / {pagination.totalPages}
        </span>
        <button
          onClick={() => setPage((prev) => Math.min(pagination.totalPages, prev + 1))}
          disabled={page >= pagination.totalPages || loading}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-50 disabled:opacity-40"
        >
          Suivant
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </AdminShell>
  );
}