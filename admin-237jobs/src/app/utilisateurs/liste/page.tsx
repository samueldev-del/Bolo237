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
  CheckCircle,
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
  ADMIN: { label: "Admin", cls: "bg-zinc-100 text-zinc-800 border-zinc-300" },
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
      /* vide */
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
        <div className="fixed top-6 right-6 z-[100] animate-fade-in rounded-xl border border-zinc-200 bg-zinc-900 px-5 py-3 text-sm font-medium text-white shadow-2xl">
          {toast}
        </div>
      )}

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
            <p className="text-sm text-zinc-500">Aucun utilisateur trouve.</p>
          </div>
        ) : (
          <>
            {/* En-tetes desktop */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto_auto] gap-4 border-b border-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">
              <span>Utilisateur</span>
              <span className="w-24 text-center">Role</span>
              <span className="w-24 text-center">Statut</span>
              <span className="w-28 text-center">Inscrit le</span>
              <span className="w-20 text-center">Actions</span>
            </div>

            <div className="divide-y divide-zinc-100">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 sm:gap-4 items-center px-5 py-4 transition ${
                    user.isBanned ? "bg-red-50/50" : "hover:bg-zinc-50"
                  }`}
                >
                  {/* Utilisateur */}
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      user.isBanned
                        ? "bg-red-100 text-red-600"
                        : "bg-gradient-to-br from-zinc-200 to-zinc-300 text-zinc-600"
                    }`}>
                      {user.isBanned ? <Ban className="h-4 w-4" /> : (user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className={`text-sm font-semibold truncate ${user.isBanned ? "text-red-700 line-through" : "text-zinc-800"}`}>
                        {user.name || "Sans nom"}
                      </p>
                      <p className="flex items-center gap-1 text-xs text-zinc-500 truncate">
                        <Mail className="h-3 w-3" /> {user.email}
                      </p>
                      {user.isBanned && user.banReason && (
                        <p className="text-[10px] text-red-500 font-medium truncate mt-0.5">
                          Banni : {user.banReason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Role */}
                  <span className={`w-24 text-center inline-flex justify-center items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${ROLE_LABELS[user.role]?.cls || "bg-zinc-50 text-zinc-500 border-zinc-200"}`}>
                    {ROLE_LABELS[user.role]?.label || user.role}
                  </span>

                  {/* Statut */}
                  <span className="w-24 text-center">
                    {user.isBanned ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600">
                        <Ban className="h-3.5 w-3.5" /> Banni
                      </span>
                    ) : user.isVerified ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verifie
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-orange-500">
                        <ShieldAlert className="h-3.5 w-3.5" /> Non verifie
                      </span>
                    )}
                  </span>

                  {/* Date */}
                  <span className="w-28 text-center flex items-center justify-center gap-1 text-xs text-zinc-500">
                    <Calendar className="h-3 w-3" /> {formatDate(user.createdAt)}
                  </span>

                  {/* Actions */}
                  <div className="w-20 flex justify-center relative">
                    <button
                      onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                      disabled={actionLoading === user.id}
                      className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition disabled:opacity-50"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MoreHorizontal className="h-4 w-4" />
                      )}
                    </button>

                    {/* Dropdown menu */}
                    {actionMenu === user.id && (
                      <>
                        <button className="fixed inset-0 z-40" onClick={() => setActionMenu(null)} />
                        <div className="absolute right-0 top-10 z-50 w-52 rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl">
                          {/* Verifier / Deverifier */}
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

                          {/* Changer le role */}
                          <button
                            onClick={() => { setRoleModal(user); setNewRole(user.role); setActionMenu(null); }}
                            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition"
                          >
                            <UserCog className="h-4 w-4 text-blue-600" /> Changer le role
                          </button>

                          <div className="my-1 border-t border-zinc-100" />

                          {/* Bannir / Debannir */}
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

                          {/* Supprimer */}
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
              <ChevronLeft className="h-4 w-4" /> Precedent
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

      {/* ── Modal: Bannir ─────────────────────────────────── */}
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
                  className="h-24 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 resize-none"
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

      {/* ── Modal: Supprimer ──────────────────────────────── */}
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

      {/* ── Modal: Changer role ───────────────────────────── */}
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
                      ? "border-zinc-900 bg-zinc-900 text-white"
                      : `border-zinc-200 bg-white hover:border-zinc-300 ${ROLE_LABELS[r]?.cls || "text-zinc-600"}`
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
                className="flex-1 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 transition disabled:opacity-40"
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
