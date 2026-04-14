"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  CircleStop,
  FileText,
  Flag,
  LogOut,
  Menu,
  MessageSquare,
  Search,
  Settings,
  ShieldCheck,
  Star,
  Users,
  X,
  LayoutDashboard,
} from "lucide-react";
import { useDeferredValue, useEffect, useRef, useState } from "react";
import { useAdminInbox } from "@/components/admin/admin-inbox-provider";
import {
  adminSearch,
  fetchAdminMyNotifications,
  type AdminSearchJob,
  type AdminSearchUser,
} from "@/lib/api";

type AdminShellProps = {
  title: string;
  description: string;
  children: ReactNode;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  badge?: string;
};

const dashboardItem: NavItem = {
  href: "/",
  label: "Tableau de bord",
  icon: <LayoutDashboard className="h-4 w-4" />,
};

const moderationItems: NavItem[] = [
  {
    href: "/moderation/jobs",
    label: "Annuaire des jobs",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    href: "/moderation/artisans",
    label: "Verifications identite",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
];

const userItems: NavItem[] = [
  {
    href: "/utilisateurs/liste",
    label: "Liste complete",
    icon: <Users className="h-4 w-4" />,
  },
  {
    href: "/utilisateurs/bannissements",
    label: "Bannissements",
    icon: <CircleStop className="h-4 w-4" />,
  },
];

const alertItems: NavItem[] = [
  {
    href: "/alertes/signalements",
    label: "Signalements",
    icon: <Flag className="h-4 w-4" />,
  },
  {
    href: "/alertes/confidentialite",
    label: "Demandes confidentialite",
    icon: <ShieldCheck className="h-4 w-4" />,
  },
  {
    href: "/alertes/notifications",
    label: "Notifications internes",
    icon: <Bell className="h-4 w-4" />,
  },
  {
    href: "/alertes/avis",
    label: "Avis & Notes",
    icon: <Star className="h-4 w-4" />,
  },
  {
    href: "/alertes/feedbacks",
    label: "Feedbacks App",
    icon: <MessageSquare className="h-4 w-4" />,
  },
  {
    href: "/inbox",
    label: "Boîte de Réception",
    icon: <MessageSquare className="h-4 w-4" />,
  },
];

function SidebarLink({
  item,
  pathname,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  onNavigate: () => void;
}) {
  const isInboxRoute = item.href === "/inbox" && (pathname === "/inbox" || pathname.startsWith("/inbox/"));
  const isActive = pathname === item.href || isInboxRoute;
  const isAlert = item.href.startsWith("/alertes") || item.href === "/inbox";

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={`flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
        isActive
          ? isAlert
            ? "bg-red-500/20 text-red-100"
            : "bg-white/15 text-white shadow-sm"
          : isAlert
            ? "bg-red-500/10 text-red-200 hover:bg-red-500/20"
            : "text-[#FEEBD6]/80 hover:bg-white/10 hover:text-white"
      }`}
    >
      <span className="flex items-center gap-3">
        <span className={isActive ? "text-[#F5C5A3]" : "text-[#F5C5A3]/60"}>{item.icon}</span>
        {item.label}
      </span>
      {item.badge ? (
        <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-semibold text-white">
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

export default function AdminShell({
  title,
  description,
  children,
}: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [adminUnreadCount, setAdminUnreadCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ users: AdminSearchUser[]; jobs: AdminSearchJob[] }>({
    users: [],
    jobs: [],
  });
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const deferredSearchQuery = useDeferredValue(searchQuery.trim());
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const { summary, sync, isLoading } = useAdminInbox();
  const unreadCount = summary?.unreadCount ?? 0;
  const inboxBadge = unreadCount > 99 ? "99+" : unreadCount > 0 ? String(unreadCount) : undefined;
  const adminNotificationsBadge = adminUnreadCount > 99 ? "99+" : adminUnreadCount > 0 ? String(adminUnreadCount) : undefined;
  const hostingerStatusLabel = !sync?.enabled
    ? "IMAP a configurer"
    : sync.lastError
      ? "Sync en erreur"
      : sync.syncing || isLoading
        ? "Synchronisation..."
        : unreadCount > 0
          ? `${unreadCount} non lu${unreadCount > 1 ? "s" : ""}`
          : "Boite a jour";

  useEffect(() => {
    let cancelled = false;

    async function loadAdminNotificationCount() {
      try {
        const response = await fetchAdminMyNotifications({ limit: 1 });
        if (!cancelled) {
          setAdminUnreadCount(response.unreadCount);
        }
      } catch {
        if (!cancelled) {
          setAdminUnreadCount(0);
        }
      }
    }

    void loadAdminNotificationCount();

    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!searchContainerRef.current?.contains(event.target as Node)) {
        setSearchOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, []);

  useEffect(() => {
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    if (mobileNavOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
    }

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [mobileNavOpen]);

  useEffect(() => {
    let cancelled = false;

    async function loadSearchResults() {
      if (deferredSearchQuery.length < 2) {
        setSearchResults({ users: [], jobs: [] });
        setSearchError("");
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      setSearchError("");

      try {
        const results = await adminSearch(deferredSearchQuery);
        if (!cancelled) {
          setSearchResults(results);
          setSearchOpen(true);
        }
      } catch (error) {
        if (!cancelled) {
          setSearchResults({ users: [], jobs: [] });
          setSearchError(error instanceof Error ? error.message : "Erreur lors de la recherche");
        }
      } finally {
        if (!cancelled) {
          setSearchLoading(false);
        }
      }
    }

    void loadSearchResults();

    return () => {
      cancelled = true;
    };
  }, [deferredSearchQuery]);

  function buildUserSearchPath(query: string, highlightId?: number) {
    const params = new URLSearchParams();
    params.set("search", query);
    if (highlightId) {
      params.set("highlight", String(highlightId));
    }
    return `/utilisateurs/liste?${params.toString()}`;
  }

  function buildJobSearchPath(query: string, highlightId?: number) {
    const params = new URLSearchParams();
    params.set("search", query);
    if (highlightId) {
      params.set("highlight", String(highlightId));
    }
    return `/moderation/jobs?${params.toString()}`;
  }

  function openSearchPath(path: string) {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults({ users: [], jobs: [] });
    setSearchError("");
    router.push(path);
  }

  function handleSearchSubmit() {
    const trimmed = searchQuery.trim();
    if (!trimmed) {
      setSearchOpen(false);
      return;
    }

    const firstUser = searchResults.users[0];
    const firstJob = searchResults.jobs[0];

    if (firstUser && !firstJob) {
      openSearchPath(buildUserSearchPath(String(firstUser.id), firstUser.id));
      return;
    }

    if (firstJob && !firstUser) {
      openSearchPath(buildJobSearchPath(String(firstJob.id), firstJob.id));
      return;
    }

    openSearchPath(buildUserSearchPath(trimmed));
  }

  const totalSearchHits = searchResults.users.length + searchResults.jobs.length;

  const navigationAlertItems = alertItems.map((item) =>
    item.href === "/inbox"
      ? {
          ...item,
          badge: inboxBadge,
        }
      : item.href === "/alertes/notifications"
        ? {
            ...item,
            badge: adminNotificationsBadge,
          }
      : item,
  );

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-4">
      {mobileNavOpen ? (
        <button
          aria-label="Fermer le menu"
          className="fixed inset-0 z-40 bg-black/50 xl:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <div className="relative z-50 mx-auto grid min-h-[calc(100dvh-1.5rem)] max-w-[1500px] grid-cols-1 overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-[0_24px_80px_rgba(22,34,51,0.16)] xl:grid-cols-[310px_1fr]">
        <aside
          className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[310px] max-w-[86vw] flex-col overflow-hidden bg-gradient-to-b from-[#8B4332] to-[#6B3325] text-white transition duration-300 xl:static xl:h-auto xl:min-h-full xl:w-auto xl:max-w-none xl:translate-x-0 ${
            mobileNavOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between border-b border-[#A8502F]/50 px-6 py-6 xl:justify-start">
            <div className="inline-flex items-center gap-3 rounded-2xl border border-[#C4623F]/40 bg-[#A8502F]/40 px-4 py-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-white.svg" alt="Bolo237" className="h-7 w-auto" />
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#F5C5A3] border-l border-[#A8502F]/50 pl-3">Admin</span>
            </div>

            <button
              aria-label="Fermer la navigation"
              className="rounded-lg p-2 text-[#F5C5A3] transition hover:bg-[#A8502F] xl:hidden"
              onClick={() => setMobileNavOpen(false)}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 py-6">
            {/* Dashboard link */}
            <div className="space-y-2">
              <SidebarLink
                item={dashboardItem}
                pathname={pathname}
                onNavigate={() => setMobileNavOpen(false)}
              />
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#DA7756]/70">
                Moderation
              </p>
              {moderationItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              ))}
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#DA7756]/70">
                Utilisateurs
              </p>
              {userItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              ))}
            </div>

            <div className="space-y-2">
              <p className="px-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#DA7756]/70">
                Alertes
              </p>
              {navigationAlertItems.map((item) => (
                <SidebarLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={() => setMobileNavOpen(false)}
                />
              ))}
            </div>
          </nav>

          <div className="shrink-0 space-y-2 border-t border-[#A8502F]/50 px-4 py-5 pb-[calc(env(safe-area-inset-bottom)+1.25rem)]">
            <Link
              href="/parametres"
              onClick={() => setMobileNavOpen(false)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                pathname === "/parametres"
                  ? "bg-white/15 text-white"
                  : "text-[#FEEBD6]/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <Settings className="h-4 w-4 text-[#F5C5A3]/60" />
              Parametres
            </Link>
            <Link
              href="/deconnexion"
              onClick={() => setMobileNavOpen(false)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition ${
                pathname === "/deconnexion"
                  ? "bg-white/15 text-white"
                  : "text-[#FEEBD6]/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              <LogOut className="h-4 w-4 text-[#F5C5A3]/60" />
              Deconnexion
            </Link>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col bg-white">
          <header className="border-b border-zinc-200 px-4 py-4 sm:px-8 sm:py-5">
            <div className="mb-3 flex items-center justify-between xl:hidden">
              <button
                aria-label="Ouvrir la navigation"
                className="rounded-xl border border-[#E8C4B0] bg-white p-2 text-[#DA7756]"
                onClick={() => setMobileNavOpen(true)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#DA7756]">
                Bolo237 Admin
              </p>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div ref={searchContainerRef} className="relative w-full max-w-2xl">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="search"
                  value={searchQuery}
                  placeholder="Rechercher un utilisateur ou une annonce par ID ou nom..."
                  onChange={(event) => {
                    setSearchQuery(event.target.value);
                    setSearchOpen(event.target.value.trim().length >= 2);
                  }}
                  onFocus={() => {
                    if (searchQuery.trim().length >= 2) {
                      setSearchOpen(true);
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleSearchSubmit();
                    }
                    if (event.key === "Escape") {
                      setSearchOpen(false);
                    }
                  }}
                  className="h-12 w-full rounded-xl border border-zinc-200 bg-zinc-50 pl-11 pr-4 text-sm text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-[#DA7756] focus:bg-white focus:ring-2 focus:ring-[#FEEBD6]"
                />
                {searchOpen ? (
                  <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-50 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.14)]">
                    {searchLoading ? (
                      <div className="px-4 py-4 text-sm text-zinc-500">Recherche en cours...</div>
                    ) : searchError ? (
                      <div className="px-4 py-4 text-sm text-red-600">{searchError}</div>
                    ) : deferredSearchQuery.length < 2 ? (
                      <div className="px-4 py-4 text-sm text-zinc-500">Tapez au moins 2 caracteres pour lancer la recherche.</div>
                    ) : totalSearchHits === 0 ? (
                      <div className="px-4 py-4 text-sm text-zinc-500">Aucun resultat pour cette recherche.</div>
                    ) : (
                      <div className="max-h-[420px] overflow-y-auto py-2">
                        {searchResults.users.length > 0 ? (
                          <div className="border-b border-zinc-100 px-2 pb-2">
                            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                              Utilisateurs
                            </p>
                            {searchResults.users.map((user) => (
                              <button
                                key={`user-${user.id}`}
                                type="button"
                                onClick={() => openSearchPath(buildUserSearchPath(String(user.id), user.id))}
                                className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-zinc-900">
                                    {user.name || user.email}
                                  </span>
                                  <span className="block truncate text-xs text-zinc-500">
                                    #{user.id} • {user.role} • {user.phone || user.email}
                                  </span>
                                </span>
                                <span className="text-xs font-medium text-[#DA7756]">Ouvrir</span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        {searchResults.jobs.length > 0 ? (
                          <div className="px-2 pt-2">
                            <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
                              Annonces
                            </p>
                            {searchResults.jobs.map((job) => (
                              <button
                                key={`job-${job.id}`}
                                type="button"
                                onClick={() => openSearchPath(buildJobSearchPath(String(job.id), job.id))}
                                className="flex w-full items-start justify-between rounded-xl px-3 py-3 text-left transition hover:bg-zinc-50"
                              >
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-semibold text-zinc-900">
                                    {job.title}
                                  </span>
                                  <span className="block truncate text-xs text-zinc-500">
                                    #{job.id} • {job.company} • {job.status}
                                  </span>
                                </span>
                                <span className="text-xs font-medium text-[#DA7756]">Ouvrir</span>
                              </button>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-2 flex flex-wrap gap-2 border-t border-zinc-100 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => openSearchPath(buildUserSearchPath(deferredSearchQuery))}
                            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-[#DA7756] hover:text-[#8B4332]"
                          >
                            Voir tous les utilisateurs
                          </button>
                          <button
                            type="button"
                            onClick={() => openSearchPath(buildJobSearchPath(deferredSearchQuery))}
                            className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-600 transition hover:border-[#DA7756] hover:text-[#8B4332]"
                          >
                            Voir toutes les annonces
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-end gap-2 sm:gap-4">
                <Link
                  href="/inbox"
                  className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-right leading-tight transition hover:bg-white"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500">
                    Hostinger Mail
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-900">{hostingerStatusLabel}</p>
                  <p className="text-xs text-zinc-500">
                    {sync?.lastSyncedAt
                      ? `Derniere sync ${new Date(sync.lastSyncedAt).toLocaleTimeString("fr-FR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "Clique pour ouvrir la boite"}
                  </p>
                </Link>

                <Link
                  href="/alertes/notifications"
                  className="relative rounded-xl border border-zinc-200 bg-white p-3 text-zinc-700 transition hover:bg-zinc-50"
                  aria-label="Ouvrir les notifications internes"
                >
                  <Bell className="h-5 w-5" />
                  {adminNotificationsBadge ? (
                    <span className="absolute -right-1 -top-1 rounded-full bg-[#DA7756] px-1.5 py-0.5 text-[10px] font-bold text-white shadow-sm">
                      {adminNotificationsBadge}
                    </span>
                  ) : null}
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                    <span
                      className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        adminUnreadCount > 0
                          ? "animate-ping bg-[#DA7756]"
                          : "bg-zinc-300"
                      }`}
                    />
                    <span
                      className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                        adminUnreadCount > 0
                          ? "bg-[#DA7756]"
                          : "bg-zinc-300"
                      }`}
                    />
                  </span>
                </Link>

                <div className="flex items-center gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#DA7756] to-[#8B4332] text-sm font-bold text-white">
                    SA
                  </div>
                  <div className="leading-tight">
                    <p className="text-sm font-semibold text-zinc-900">Samuel Admin</p>
                    <p className="text-xs font-medium text-[#DA7756]">Super Admin</p>
                  </div>
                </div>
              </div>
            </div>
          </header>

          <section className="flex-1 space-y-7 px-4 py-6 sm:px-8 sm:py-8">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
              <p className="mt-1 text-sm text-zinc-500">{description}</p>
            </div>

            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
