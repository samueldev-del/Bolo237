"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import {
  Briefcase,
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  WifiOff,
  Mail,
  UserCheck,
  UserPlus,
  Star,
  Building2,
} from "lucide-react";
import AdminShell from "@/components/admin/admin-shell";
import AnalyticsDashboard from "@/components/admin/AnalyticsDashboard";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  fetchAdminStats,
  fetchAdminTrends,
  fetchJobs,
  fetchUsers,
  updateJob,
  type AdminStats,
  type Job,
  type TrendPoint,
  type User,
} from "@/lib/api";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [latestUsers, setLatestUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);
  const [retryAttempt, setRetryAttempt] = useState(0);
  const [retryCountdown, setRetryCountdown] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);

  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [trendDays, setTrendDays] = useState<7 | 30>(7);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    fetchAdminTrends(trendDays)
      .then((data) => setTrendPoints(data.points))
      .catch(() => setTrendPoints([]));
  }, [trendDays]);

  // Auto-retry with exponential backoff while the error state is shown.
  // Render cold-starts can take 30-60s, so we keep poking with a visible countdown.
  useEffect(() => {
    if (!error) return;
    const delays = [3, 6, 12, 20]; // seconds
    const idx = Math.min(retryAttempt, delays.length - 1);
    const wait = delays[idx];

    if (retryAttempt >= delays.length) return; // give up auto, let user click

    setRetryCountdown(wait);
    const tick = setInterval(() => {
      setRetryCountdown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);

    const timer = setTimeout(() => {
      // Wake the backend before retrying.
      fetch("/api/wake", { cache: "no-store" })
        .catch(() => {})
        .finally(() => loadData(retryAttempt + 1));
    }, wait * 1000);

    return () => {
      clearInterval(tick);
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error, retryAttempt]);

  async function loadData(attempt = 0) {
    setLoading(true);
    setError(null);
    try {
      const [statsData, pendingData, usersData] = await Promise.all([
        fetchAdminStats(),
        fetchJobs({ status: "PENDING", limit: 5 }),
        fetchUsers({ limit: 8 }),
      ]);
      setStats(statsData);
      setPendingJobs(pendingData.jobs);
      setLatestUsers(usersData.users);
      const trendsData = await fetchAdminTrends(trendDays);
      setTrendPoints(trendsData.points);
      setRetryAttempt(0);
    } catch (err) {
      setRetryAttempt(attempt);
      setError(err instanceof Error ? err.message : "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  function handleManualRetry() {
    setRetryAttempt(0);
    fetch("/api/wake", { cache: "no-store" }).catch(() => {});
    loadData(0);
  }

  async function handleModeration(jobId: number, status: "APPROVED" | "REJECTED") {
    setActionLoading(jobId);
    setActionError(null);
    try {
      await updateJob(jobId, { status });
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (stats) {
        setStats({
          ...stats,
          pendingJobs: Math.max(0, stats.pendingJobs - 1),
          approvedJobs: status === "APPROVED" ? stats.approvedJobs + 1 : stats.approvedJobs,
        });
      }
    } catch {
      setActionError(`Impossible de moderer l'annonce #${jobId}. Reessayez.`);
      setTimeout(() => setActionError(null), 4000);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Tableau de bord" description="Chargement des donnees...">
        <div className="flex h-[60vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-[#DA7756]" />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    const maxAutoRetries = 4;
    const willAutoRetry = retryAttempt < maxAutoRetries;
    return (
      <AdminShell title="Tableau de bord" description="Erreur de connexion">
        <div className="flex h-[60vh] flex-col items-center justify-center text-center">
          <WifiOff className="mb-6 h-16 w-16 text-red-400" />
          <h3 className="mb-2 text-xl font-bold text-zinc-900">Connexion au serveur impossible</h3>
          <p className="mb-2 max-w-md text-zinc-500">{error}</p>
          {willAutoRetry ? (
            <p className="mb-8 max-w-md text-xs font-semibold text-zinc-400">
              Tentative {retryAttempt + 1}/{maxAutoRetries} — nouvelle tentative dans {retryCountdown}s...
            </p>
          ) : (
            <p className="mb-8 max-w-md text-xs font-semibold text-zinc-400">
              Le reveil automatique a echoue. Le backend Render est peut-etre hors ligne.
            </p>
          )}
          <button
            onClick={handleManualRetry}
            className="rounded-xl bg-[#DA7756] px-8 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#DA7756]/30 transition hover:bg-[#C4623F] hover:shadow-xl"
          >
            Reessayer maintenant
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Tableau de bord" description="Vue d'ensemble de la plateforme Bolo237">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        <StatCard
          title="Utilisateurs"
          value={stats?.users ?? 0}
          icon={<Users className="h-6 w-6" />}
          color="text-[#DA7756]"
          bg="bg-[#FFF5EF]"
          border="border-[#E8C4B0]"
          href="/utilisateurs/liste"
        />
        <StatCard
          title="Jobs en attente"
          value={stats?.pendingJobs ?? 0}
          icon={<Clock className="h-6 w-6" />}
          color="text-amber-600"
          bg="bg-amber-50"
          border="border-amber-200"
          href="/moderation/jobs"
        />
        <StatCard
          title="Jobs approuves"
          value={stats?.approvedJobs ?? 0}
          icon={<Briefcase className="h-6 w-6" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
          border="border-emerald-200"
          href="/moderation/jobs"
        />
        <StatCard
          title="Signalements"
          value={stats?.reports ?? 0}
          icon={<AlertTriangle className="h-6 w-6" />}
          color="text-red-600"
          bg="bg-red-50"
          border="border-red-200"
          href="/alertes/signalements"
        />
        <StatCard
          title="Inscriptions aujourd'hui"
          value={stats?.todaySignups ?? 0}
          icon={<UserPlus className="h-6 w-6" />}
          color="text-cyan-600"
          bg="bg-cyan-50"
          border="border-cyan-200"
          href="/utilisateurs/liste"
        />
        <StatCard
          title="Avis au total"
          value={stats?.totalReviews ?? 0}
          icon={<Star className="h-6 w-6" />}
          color="text-indigo-600"
          bg="bg-indigo-50"
          border="border-indigo-200"
          href="/alertes/avis"
        />
        <div className="sm:col-span-2 lg:col-span-1 xl:col-span-2">
          <StatCard
            title="Entreprises en attente"
            value={stats?.enterprisePending ?? 0}
            icon={<Building2 className="h-6 w-6" />}
            color="text-rose-600"
            bg="bg-rose-50"
            border="border-rose-200"
            href="/moderation/artisans"
          />
        </div>
      </div>

      <div className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-zinc-900">Tendances de la plateforme</h3>
          <div className="flex gap-1 rounded-lg border border-zinc-200 bg-zinc-50 p-1">
            <button
              onClick={() => setTrendDays(7)}
              className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                trendDays === 7
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              7 jours
            </button>
            <button
              onClick={() => setTrendDays(30)}
              className={`rounded-md px-4 py-1.5 text-xs font-bold transition-all ${
                trendDays === 30
                  ? "bg-white text-black shadow-sm"
                  : "text-zinc-500 hover:text-zinc-900"
              }`}
            >
              30 jours
            </button>
          </div>
        </div>
        {trendPoints.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm font-medium text-zinc-400">
            Aucune donnee disponible pour cette periode
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={trendPoints} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DA7756" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#DA7756" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8A87C" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#E8A87C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "#71717a", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fontSize: 12, fill: "#71717a", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "12px",
                  border: "none",
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
                  fontWeight: 600,
                  fontSize: "13px",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Inscriptions"
                stroke="#DA7756"
                strokeWidth={3}
                fill="url(#colorUsers)"
              />
              <Area
                type="monotone"
                dataKey="jobs"
                name="Publications"
                stroke="#E8A87C"
                strokeWidth={3}
                fill="url(#colorJobs)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <AnalyticsDashboard />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Latest Users */}
        <div className="xl:col-span-2 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-6 py-5">
            <h3 className="text-base font-bold text-zinc-900">Derniers utilisateurs inscrits</h3>
            <Link href="/utilisateurs/liste" className="rounded-lg bg-[#FFF5EF] px-3 py-1.5 text-xs font-bold text-[#DA7756] transition hover:text-[#C4623F]">
              Voir tout &rarr;
            </Link>
          </div>
          {latestUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm font-medium text-zinc-400">Aucun utilisateur inscrit</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {latestUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-6 py-4 transition hover:bg-zinc-50/50">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black ${
                      user.isVerified
                        ? "bg-gradient-to-br from-[#FEEBD6] to-[#FFF5EF] text-[#DA7756]"
                        : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {(user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-zinc-900">{user.name || "Sans nom"}</p>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs font-medium text-zinc-500">
                        <Mail className="h-3.5 w-3.5" /> {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-black uppercase tracking-wider ${
                      user.role === "ENTREPRISE" ? "bg-purple-50 text-purple-700"
                      : user.role === "ARTISAN" ? "bg-amber-50 text-amber-700"
                      : user.role === "ADMIN" ? "bg-black text-white"
                      : "bg-blue-50 text-blue-700"
                    }`}>
                      {user.role}
                    </span>
                    {user.isVerified && <UserCheck className="h-5 w-5 text-[#DA7756]" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation urgente */}
        <div className="h-fit rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-base font-bold text-zinc-900">
              A moderer
              {pendingJobs.length > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-black text-red-700">
                  {pendingJobs.length}
                </span>
              )}
            </h3>
            <Link href="/moderation/jobs" className="text-xs font-bold text-[#DA7756] hover:underline">
              Tout voir
            </Link>
          </div>

          {actionError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-xs font-bold text-red-600 animate-in fade-in">
              <AlertTriangle className="h-4 w-4" />
              {actionError}
            </div>
          )}

          {pendingJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-200 bg-zinc-50 py-12 text-center">
              <CheckCircle className="mb-4 h-12 w-12 text-emerald-400" />
              <p className="text-sm font-bold text-zinc-700">Aucune annonce en attente</p>
              <p className="mt-1 text-xs font-medium text-zinc-500">L&apos;annuaire est a jour !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-xl border border-zinc-200 bg-white p-4 shadow-sm transition hover:border-zinc-300"
                >
                  <div className="min-w-0 flex-1">
                    <p className="mb-0.5 truncate text-sm font-bold text-zinc-900">{job.title}</p>
                    <p className="truncate text-xs font-medium text-zinc-500">
                      {job.company} &bull; {job.location}
                    </p>
                  </div>
                  <div className="ml-3 flex shrink-0 gap-2">
                    <button
                      onClick={() => handleModeration(job.id, "APPROVED")}
                      disabled={actionLoading === job.id}
                      className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600 transition hover:bg-emerald-100 hover:text-emerald-700 disabled:opacity-50"
                      title="Approuver"
                    >
                      {actionLoading === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4 stroke-[2.5]" />
                      )}
                    </button>
                    <button
                      onClick={() => handleModeration(job.id, "REJECTED")}
                      disabled={actionLoading === job.id}
                      className="rounded-lg bg-red-50 p-2.5 text-red-600 transition hover:bg-red-100 hover:text-red-700 disabled:opacity-50"
                      title="Rejeter"
                    >
                      <XCircle className="h-4 w-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminShell>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  bg,
  border,
  href,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  bg: string;
  border: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex h-full items-center gap-4 rounded-2xl border ${border} bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg`}
    >
      <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="mb-1 text-xs font-bold uppercase tracking-wider text-zinc-500">{title}</p>
        <p className="text-3xl font-black tracking-tight text-zinc-900">{value}</p>
      </div>
    </Link>
  );
}
