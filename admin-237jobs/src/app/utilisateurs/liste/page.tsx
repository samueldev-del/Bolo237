"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { fetchUsers, type User, type Pagination } from "@/lib/api";
import {
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  BadgeCheck,
  ShieldAlert,
  Calendar,
} from "lucide-react";

type RoleFilter = "all" | "CANDIDAT" | "ENTREPRISE" | "ARTISAN";

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  CANDIDAT: { label: "Candidat", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ENTREPRISE: { label: "Entreprise", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  ARTISAN: { label: "Artisan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ADMIN: { label: "Admin", cls: "bg-zinc-100 text-zinc-800 border-zinc-300" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function UtilisateursListePage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [page, setPage] = useState(1);

  useEffect(() => {
    load();
  }, [roleFilter, page]);

  async function load() {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { page, limit: 15 };
      if (roleFilter !== "all") filters.role = roleFilter;
      const data = await fetchUsers(filters);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      /* vide */
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminShell title="Utilisateurs" description="Vue globale des candidats, entreprises et artisans.">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {(["all", "CANDIDAT", "ENTREPRISE", "ARTISAN"] as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => { setRoleFilter(r); setPage(1); }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              roleFilter === r
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300"
            }`}
          >
            {r === "all" ? "Tous" : ROLE_LABELS[r].label + "s"}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">
          {pagination ? `${pagination.total} utilisateur${pagination.total > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-zinc-500">Aucun utilisateur trouvé.</p>
          </div>
        ) : (
          <>
            {/* En-têtes (desktop) */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>Utilisateur</span>
              <span className="w-24 text-center">Rôle</span>
              <span className="w-24 text-center">Statut</span>
              <span className="w-28 text-right">Inscrit le</span>
            </div>

            <div className="divide-y divide-zinc-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 sm:gap-4 items-center px-5 py-4 hover:bg-zinc-50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-200 to-zinc-300 text-xs font-bold text-zinc-600">
                      {(user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">
                        {user.name || "Sans nom"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                        <Mail className="h-3 w-3" /> {user.email}
                      </p>
                    </div>
                  </div>

                  <span className={`w-24 text-center inline-flex justify-center items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${ROLE_LABELS[user.role]?.cls || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                    {ROLE_LABELS[user.role]?.label || user.role}
                  </span>

                  <span className="w-24 text-center">
                    {user.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <BadgeCheck className="h-3.5 w-3.5" /> Vérifié
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500">
                        <ShieldAlert className="h-3.5 w-3.5" /> Non vérifié
                      </span>
                    )}
                  </span>

                  <span className="w-28 text-right flex items-center justify-end gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3" /> {formatDate(user.createdAt)}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" /> Précédent
            </button>
            <span className="text-xs text-zinc-400">
              Page {pagination.page} / {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pagination.totalPages}
              className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-30"
            >
              Suivant <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </AdminShell>
  );
}
