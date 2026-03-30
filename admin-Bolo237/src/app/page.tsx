"use client";

import { useEffect, useState } from "react";
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

  async function loadData() {
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de contacter le serveur");
    } finally {
      setLoading(false);
    }
  }

  async function handleModeration(jobId: number, status: "APPROVED" | "REJECTED") {
    setActionLoading(jobId);
    try {
      await updateJob(jobId, { status });
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      if (stats) {
        setStats({
          ...stats,
          pendingJobs: stats.pendingJobs - 1,
          approvedJobs: status === "APPROVED" ? stats.approvedJobs + 1 : stats.approvedJobs,
        });
      }
    } catch {
      setError("Erreur lors de la moderation");
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <AdminShell title="Tableau de bord" description="Chargement des donnees...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#DA7756]" />
        </div>
      </AdminShell>
    );
  }

  if (error) {
    return (
      <AdminShell title="Tableau de bord" description="Erreur de connexion">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <WifiOff className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-800 mb-2">Connexion au serveur impossible</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md">{error}</p>
          <button
            onClick={loadData}
            className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#C4623F]"
          >
            Reessayer
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Tableau de bord" description="Vue d'ensemble de la plateforme Bolo237">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Utilisateurs"
          value={stats?.users ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="text-[#DA7756]"
          bg="bg-[#FFF5EF]"
          border="border-[#E8C4B0]"
          href="/utilisateurs/liste"
        />
        <StatCard
          title="Jobs en attente"
          value={stats?.pendingJobs ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="text-amber-600"
          bg="bg-amber-50"
          border="border-amber-200"
          href="/moderation/jobs"
        />
        <StatCard
          title="Jobs approuves"
          value={stats?.approvedJobs ?? 0}
          icon={<Briefcase className="h-5 w-5" />}
          color="text-emerald-600"
          bg="bg-emerald-50"
          border="border-emerald-200"
          href="/moderation/jobs"
        />
        <StatCard
          title="Signalements"
          value={stats?.reports ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-600"
          bg="bg-red-50"
          border="border-red-200"
          href="/alertes/signalements"
        />
        <StatCard
          title="Inscriptions aujourd'hui"
          value={stats?.todaySignups ?? 0}
          icon={<UserPlus className="h-5 w-5" />}
          color="text-cyan-600"
          bg="bg-cyan-50"
          border="border-cyan-200"
          href="/utilisateurs/liste"
        />
        <StatCard
          title="Avis au total"
          value={stats?.totalReviews ?? 0}
          icon={<Star className="h-5 w-5" />}
          color="text-indigo-600"
          bg="bg-indigo-50"
          border="border-indigo-200"
          href="/alertes/avis"
        />
        <StatCard
          title="Entreprises en attente"
          value={stats?.enterprisePending ?? 0}
          icon={<Building2 className="h-5 w-5" />}
          color="text-rose-600"
          bg="bg-rose-50"
          border="border-rose-200"
          href="/moderation/artisans"
        />
      </div>

      {/* Trends Chart */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-base font-semibold text-zinc-800">Tendances</h3>
          <div className="flex gap-1 rounded-lg border border-zinc-200 p-0.5">
            <button
              onClick={() => setTrendDays(7)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                trendDays === 7
                  ? "bg-[#DA7756] text-white"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              7j
            </button>
            <button
              onClick={() => setTrendDays(30)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
                trendDays === 30
                  ? "bg-[#DA7756] text-white"
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              30j
            </button>
          </div>
        </div>
        {trendPoints.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-sm text-zinc-400">
            Aucune donnee disponible
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={trendPoints} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
              <defs>
                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#DA7756" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#DA7756" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E8A87C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#E8A87C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#a1a1aa" }}
                axisLine={false}
                tickLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: "0.75rem",
                  border: "1px solid #e4e4e7",
                  fontSize: "0.75rem",
                }}
              />
              <Area
                type="monotone"
                dataKey="users"
                name="Inscriptions"
                stroke="#DA7756"
                strokeWidth={2}
                fill="url(#colorUsers)"
              />
              <Area
                type="monotone"
                dataKey="jobs"
                name="Publications"
                stroke="#E8A87C"
                strokeWidth={2}
                fill="url(#colorJobs)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Latest Users */}
        <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white">
          <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
            <h3 className="text-base font-semibold text-zinc-800">Derniers utilisateurs inscrits</h3>
            <Link href="/utilisateurs/liste" className="text-xs font-medium text-[#DA7756] hover:text-[#C4623F] transition">
              Voir tout &rarr;
            </Link>
          </div>
          {latestUsers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Users className="h-10 w-10 text-zinc-300 mb-3" />
              <p className="text-sm text-zinc-400">Aucun utilisateur inscrit</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {latestUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between px-6 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                      user.isVerified
                        ? "bg-[#FEEBD6] text-[#DA7756]"
                        : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {(user.name || user.email).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-zinc-800 truncate">{user.name || "Sans nom"}</p>
                      <p className="text-xs text-zinc-400 truncate flex items-center gap-1">
                        <Mail className="h-3 w-3" /> {user.email}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-bold ${
                      user.role === "ENTREPRISE" ? "bg-purple-50 text-purple-700 border-purple-200"
                      : user.role === "ARTISAN" ? "bg-amber-50 text-amber-700 border-amber-200"
                      : user.role === "ADMIN" ? "bg-[#FFF5EF] text-[#DA7756] border-[#E8C4B0]"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}>
                      {user.role}
                    </span>
                    {user.isVerified && <UserCheck className="h-3.5 w-3.5 text-[#DA7756]" />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation urgente */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-zinc-800">
              A moderer
              {pendingJobs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-700">
                  {pendingJobs.length}
                </span>
              )}
            </h3>
            <Link href="/moderation/jobs" className="text-xs font-medium text-[#DA7756] hover:text-[#C4623F] transition">
              Tout voir &rarr;
            </Link>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-[#DA7756] mb-3" />
              <p className="text-sm font-medium text-zinc-600">Aucune annonce en attente</p>
              <p className="text-xs text-zinc-400 mt-1">Tout est a jour !</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 border border-zinc-100 p-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-zinc-800 truncate">{job.title}</p>
                    <p className="text-xs text-zinc-500 truncate">
                      {job.company} &bull; {job.location}
                    </p>
                  </div>
                  <div className="flex gap-1.5 ml-3 shrink-0">
                    <button
                      onClick={() => handleModeration(job.id, "APPROVED")}
                      disabled={actionLoading === job.id}
                      className="rounded-lg bg-[#FFF5EF] p-2 text-[#DA7756] hover:bg-[#FEEBD6] transition disabled:opacity-50"
                      title="Approuver"
                    >
                      {actionLoading === job.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => handleModeration(job.id, "REJECTED")}
                      disabled={actionLoading === job.id}
                      className="rounded-lg bg-red-50 p-2 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
                      title="Rejeter"
                    >
                      <XCircle className="h-4 w-4" />
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
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 rounded-2xl border ${border} ${bg} p-5 transition hover:shadow-md`}
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${bg} ${color}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-zinc-500">{title}</p>
        <p className="text-2xl font-bold text-zinc-900">{value}</p>
      </div>
    </Link>
  );
}
