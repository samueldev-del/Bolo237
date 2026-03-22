"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchUsers,
  updateUser,
  banUser,
  deleteUser,
  type User,
  type Pagination,
} from "@/lib/api";
import {
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Mail,
  BadgeCheck,
  ShieldAlert,
  Calendar,
  MoreHorizontal,
  Ban,
  Trash2,
  UserCog,
  X,
  ShieldCheck,
  ShieldOff,
  Unlock,
} from "lucide-react";

type RoleFilter = "all" | "CANDIDAT" | "ENTREPRISE" | "ARTISAN";

const ROLE_LABELS: Record<string, { label: string; cls: string }> = {
  CANDIDAT: { label: "Candidat", cls: "bg-blue-50 text-blue-700 border-blue-200" },
  ENTREPRISE: { label: "Entreprise", cls: "bg-purple-50 text-purple-700 border-purple-200" },
  ARTISAN: { label: "Artisan", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  ADMIN: { label: "Admin", cls: "bg-green-50 text-green-700 border-green-200" },
};

const ROLE_OPTIONS = ["CANDIDAT", "ENTREPRISE", "ARTISAN", "ADMIN"];

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
  const [actionMenu, setActionMenu] = useState<number | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [banModal, setBanModal] = useState<User | null>(null);
  const [banReason, setBanReason] = useState("");
  const [deleteModal, setDeleteModal] = useState<User | null>(null);
  const [roleModal, setRoleModal] = useState<User | null>(null);
  const [newRole, setNewRole] = useState("");
  const [toast, setToast] = useState("");

  useEffect(() => {
    load();
  }, [roleFilter, page]);

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  }

  async function load() {
    setLoading(true);
    try {
      const filters: Record<string, string | number> = { page, limit: 15 };
      if (roleFilter !== "all") filters.role = roleFilter;
      const data = await fetchUsers(filters);
      setUsers(data.users);
      setPagination(data.pagination);
    } catch {
      /* empty */
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(user: User) {
    setActionLoading(user.id);
    setActionMenu(null);
    try {
      const updated = await updateUser(user.id, { isVerified: !user.isVerified });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      showToast(updated.isVerified ? `${user.name || user.email} verifie` : `Verification retiree`);
    } catch {
      showToast("Erreur lors de la verification");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleBan() {
    if (!banModal) return;
    setActionLoading(banModal.id);
    try {
      const isBanning = !banModal.isBanned;
      const updated = await banUser(banModal.id, isBanning, banReason || undefined);
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      showToast(isBanning ? `${banModal.name || banModal.email} banni` : `${banModal.name || banModal.email} debanni`);
    } catch {
      showToast("Erreur lors du bannissement");
    } finally {
      setActionLoading(null);
      setBanModal(null);
      setBanReason("");
    }
  }

  async function handleDelete() {
    if (!deleteModal) return;
    setActionLoading(deleteModal.id);
    try {
      await deleteUser(deleteModal.id);
      setUsers((prev) => prev.filter((u) => u.id !== deleteModal.id));
      showToast(`${deleteModal.name || deleteModal.email} supprime`);
    } catch {
      showToast("Erreur lors de la suppression");
    } finally {
      setActionLoading(null);
      setDeleteModal(null);
    }
  }

  async function handleRoleChange() {
    if (!roleModal || !newRole) return;
    setActionLoading(roleModal.id);
    try {
      const updated = await updateUser(roleModal.id, { role: newRole as User["role"] });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? { ...u, ...updated } : u)));
      showToast(`Role change en ${ROLE_LABELS[newRole]?.label || newRole}`);
    } catch {
      showToast("Erreur lors du changement de role");
    } finally {
      setActionLoading(null);
      setRoleModal(null);
      setNewRole("");
    }
  }

  return (
    <AdminShell title="Utilisateurs" description="Gestion complete des comptes candidats, entreprises et artisans.">
      {/* Toast notification */}
      {toast && (
        <div className="fixed top-6 right-6 z-[100] animate-fade-in rounded-xl border border-green-200 bg-green-700 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="h-4 w-4 text-zinc-400" />
        {(["all", "CANDIDAT", "ENTREPRISE", "ARTISAN"] as RoleFilter[]).map((r) => (
          <button
            key={r}
            onClick={() => { setRoleFilter(r); setPage(1); }}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
              roleFilter === r
                ? "border-green-700 bg-green-700 text-white"
                : "border-zinc-200 bg-white text-zinc-600 hover:border-green-300 hover:text-green-700"
            }`}
          >
            {r === "all" ? "Tous" : ROLE_LABELS[r].label + "s"}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-400">
          {pagination ? `${pagination.total} utilisateur${pagination.total > 1 ? "s" : ""}` : ""}
        </span>
      </div>

      {/* User Cards Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-green-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="py-20 text-center rounded-2xl border border-zinc-200 bg-white">
          <p className="text-sm text-zinc-500">Aucun utilisateur trouve.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {users.map((user) => (
            <div
              key={user.id}
              className={`relative rounded-2xl border bg-white p-5 transition hover:shadow-md ${
                user.isBanned ? "border-red-200 bg-red-50/30" : "border-zinc-200"
              }`}
            >
              {/* Header row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                    user.isBanned
                      ? "bg-red-100 text-red-600"
                      : user.isVerified
                        ? "bg-green-100 text-green-700"
                        : "bg-zinc-100 text-zinc-500"
                  }`}>
                    {user.isBanned ? <Ban className="h-4 w-4" /> : (user.name || user.email).slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-sm font-semibold truncate ${user.isBanned ? "text-red-700 line-through" : "text-zinc-800"}`}>
                      {user.name || "Sans nom"}
                    </p>
                    <p className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                      <Mail className="h-3 w-3 shrink-0" /> {user.email}
                    </p>
                  </div>
                </div>

                {/* Action menu trigger */}
                <div className="relative">
                  <button
                    onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                    disabled={actionLoading === user.id}
                    className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition disabled:opacity-50"
                  >
                    {actionLoading === user.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <MoreHorizontal className="h-4 w-4" />
                    )}
                  </button>

                  {actionMenu === user.id && (
                    <>
                      <button className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                      <div className="absolute right-0 top-8 z-50 w-52 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl">
                        <button
                          onClick={() => handleVerify(user)}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          {user.isVerified ? (
                            <><ShieldOff className="h-4 w-4 text-orange-500" /> Retirer verification</>
                          ) : (
                            <><ShieldCheck className="h-4 w-4 text-green-600" /> Verifier le compte</>
                          )}
                        </button>

                        <button
                          onClick={() => { setRoleModal(user); setNewRole(user.role); setActionMenu(null); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                        >
                          <UserCog className="h-4 w-4 text-blue-600" /> Changer le role
                        </button>

                        <div className="my-1 border-t border-zinc-100" />

                        <button
                          onClick={() => { setBanModal(user); setBanReason(""); setActionMenu(null); }}
                          className={`flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium transition ${
                            user.isBanned
                              ? "text-green-700 hover:bg-green-50"
                              : "text-orange-700 hover:bg-orange-50"
                          }`}
                        >
                          {user.isBanned ? (
                            <><Unlock className="h-4 w-4" /> Debannir</>
                          ) : (
                            <><Ban className="h-4 w-4" /> Bannir le compte</>
                          )}
                        </button>

                        <button
                          onClick={() => { setDeleteModal(user); setActionMenu(null); }}
                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-red-600 hover:bg-red-50 transition"
                        >
                          <Trash2 className="h-4 w-4" /> Supprimer definitivement
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Info row */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${ROLE_LABELS[user.role]?.cls || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                  {ROLE_LABELS[user.role]?.label || user.role}
                </span>

                {user.isBanned ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-red-600 bg-red-50 border border-red-200 rounded-full px-2 py-0.5">
                    <Ban className="h-3 w-3" /> Banni
                  </span>
                ) : user.isVerified ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-green-600 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
                    <BadgeCheck className="h-3 w-3" /> Verifie
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-orange-500 bg-orange-50 border border-orange-200 rounded-full px-2 py-0.5">
                    <ShieldAlert className="h-3 w-3" /> Non verifie
                  </span>
                )}

                <span className="ml-auto flex items-center gap-1 text-[10px] text-zinc-400">
                  <Calendar className="h-3 w-3" /> {formatDate(user.createdAt)}
                </span>
              </div>

              {user.isBanned && user.banReason && (
                <p className="mt-2 text-[11px] text-red-500 font-medium bg-red-50 rounded-lg px-3 py-1.5 border border-red-100">
                  Raison : {user.banReason}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-5 py-3">
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

      {/* Modal: Ban */}
      {banModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900">
                {banModal.isBanned ? "Debannir" : "Bannir"} {banModal.name || banModal.email}
              </h3>
              <button onClick={() => setBanModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            {!banModal.isBanned && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-zinc-700 mb-1.5">Raison du bannissement</label>
                <textarea
                  value={banReason}
                  onChange={(e) => setBanReason(e.target.value)}
                  placeholder="Ex: Comportement frauduleux, spam, fausses annonces..."
                  className="h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-green-300 focus:ring-2 focus:ring-green-100 resize-none"
                />
              </div>
            )}

            {banModal.isBanned && (
              <p className="mb-4 text-sm text-zinc-600">
                Cet utilisateur sera debanni et pourra a nouveau acceder a la plateforme.
              </p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setBanModal(null)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleBan}
                disabled={actionLoading === banModal.id}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 ${
                  banModal.isBanned
                    ? "bg-green-600 hover:bg-green-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {actionLoading === banModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : banModal.isBanned ? (
                  "Confirmer le debannissement"
                ) : (
                  "Confirmer le bannissement"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete */}
      {deleteModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-red-700">Supprimer definitivement</h3>
              <button onClick={() => setDeleteModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="rounded-xl bg-red-50 border border-red-100 p-4 mb-4">
              <p className="text-sm text-red-800 font-medium">
                Attention : cette action est irreversible. Le compte de <strong>{deleteModal.name || deleteModal.email}</strong> et toutes ses annonces seront supprimes.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleDelete}
                disabled={actionLoading === deleteModal.id}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-60"
              >
                {actionLoading === deleteModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Supprimer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Change Role */}
      {roleModal && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-zinc-900">Changer le role</h3>
              <button onClick={() => setRoleModal(null)} className="text-zinc-400 hover:text-zinc-700">
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-sm text-zinc-600 mb-4">
              Utilisateur : <strong>{roleModal.name || roleModal.email}</strong>
            </p>

            <div className="grid grid-cols-2 gap-2 mb-6">
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r}
                  onClick={() => setNewRole(r)}
                  className={`rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                    newRole === r
                      ? "border-green-600 bg-green-600 text-white"
                      : `border-zinc-200 bg-white hover:border-green-300 ${ROLE_LABELS[r]?.cls || "text-zinc-600"}`
                  }`}
                >
                  {ROLE_LABELS[r]?.label || r}
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setRoleModal(null)}
                className="flex-1 rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleRoleChange}
                disabled={actionLoading === roleModal.id || newRole === roleModal.role}
                className="flex-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition disabled:opacity-40"
              >
                {actionLoading === roleModal.id ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Confirmer"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
