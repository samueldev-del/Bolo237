"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import { fetchBannedUsers, banUser, type User, type Pagination } from "@/lib/api";
import { Search, Loader2, ShieldOff, ShieldCheck, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  CANDIDAT: { label: "Candidat", cls: "bg-[#FFF5EF] text-[#DA7756] border-[#E8C4B0]" },
  ENTREPRISE: { label: "Entreprise", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ARTISAN: { label: "Artisan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ADMIN: { label: "Admin", cls: "bg-purple-50 text-purple-700 border-purple-200" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function BannissementsPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [unbanModal, setUnbanModal] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, page]);

  async function loadData() {
    setLoading(true);
    try {
      const data = await fetchBannedUsers({ search: search || undefined, page, limit: 20 });
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleUnban(user: User) {
    setActionLoading(user.id);
    try {
      await banUser(user.id, false);
      setUsers(prev => prev.filter(u => u.id !== user.id));
      setUnbanModal(null);
    } catch {
      setToast("Erreur lors du debannissement");
      setTimeout(() => setToast(""), 3000);
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <AdminShell title="Bannissements" description="Audit des comptes bannis et liste noire.">
      {toast && (
        <div className="animate-fade-in rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {toast}
        </div>
      )}
      {/* Search */}
      <div className="relative w-full max-w-md">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          placeholder="Rechercher par nom ou email..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="h-11 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-[#DA7756]" />
        </div>
      ) : users.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-zinc-200 bg-white">
          <ShieldCheck className="h-12 w-12 text-zinc-300 mb-3" />
          <p className="text-sm font-medium text-zinc-600">Aucun utilisateur banni</p>
          <p className="text-xs text-zinc-400 mt-1">La liste noire est vide.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Utilisateur</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Raison du ban</th>
                  <th className="px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-zinc-500">Date du ban</th>
                  <th className="px-5 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-zinc-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {users.map((user) => (
                  <tr key={user.id} className="bg-red-50/30 hover:bg-red-50/50 transition">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-600 text-xs font-bold">
                          {(user.name || user.email).slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-zinc-800 truncate">{user.name || "Sans nom"}</p>
                          <p className="text-xs text-zinc-400 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ROLE_LABELS[user.role]?.cls || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                        {ROLE_LABELS[user.role]?.label || user.role}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-zinc-600 max-w-[250px] truncate">
                        {user.banReason || <span className="text-zinc-400 italic">Non specifiee</span>}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-zinc-500 whitespace-nowrap">
                      {user.bannedAt ? formatDate(user.bannedAt) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        onClick={() => setUnbanModal(user)}
                        disabled={actionLoading === user.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[#DA7756] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C4623F] transition disabled:opacity-50"
                      >
                        {actionLoading === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <ShieldOff className="h-3.5 w-3.5" />
                        )}
                        Debannir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-3">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-[#DA7756] disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" /> Precedent
          </button>
          <span className="text-xs text-zinc-400">
            Page {pagination.page} / {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= pagination.totalPages}
            className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-[#DA7756] disabled:opacity-30"
          >
            Suivant <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Unban confirmation modal */}
      {unbanModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-900">Confirmer le debannissement</h3>
                <p className="text-xs text-zinc-400">Cette action est reversible</p>
              </div>
            </div>

            <p className="text-sm text-zinc-600 mb-2">
              Etes-vous sur de vouloir debannir <strong>{unbanModal.name || unbanModal.email}</strong> ?
            </p>
            {unbanModal.banReason && (
              <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-2.5 mb-4">
                <p className="text-xs text-red-700">
                  <span className="font-semibold">Raison du ban :</span> {unbanModal.banReason}
                </p>
              </div>
            )}
            <p className="text-sm text-zinc-500 mb-6">
              L&apos;utilisateur pourra a nouveau acceder a la plateforme.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setUnbanModal(null)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={() => handleUnban(unbanModal)}
                disabled={actionLoading === unbanModal.id}
                className="flex-1 rounded-xl bg-[#DA7756] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#C4623F] transition disabled:opacity-60"
              >
                {actionLoading === unbanModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Confirmer le debannissement"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
