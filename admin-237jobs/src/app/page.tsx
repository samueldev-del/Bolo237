"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Briefcase,
  ShieldCheck,
  AlertTriangle,
  Users,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Loader2,
  WifiOff,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import AdminShell from "@/components/admin/admin-shell";
import {
  fetchAdminStats,
  fetchJobs,
  updateJob,
  type AdminStats,
  type Job,
} from "@/lib/api";

// Graphique vide — sera rempli par une future route /api/admin/analytics
const chartData: { name: string; inscrits: number }[] = [];

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingJobs, setPendingJobs] = useState<Job[]>([]);
  const [recentJobs, setRecentJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [statsData, pendingData, recentData] = await Promise.all([
        fetchAdminStats(),
        fetchJobs({ status: "PENDING", limit: 5 }),
        fetchJobs({ limit: 5 }),
      ]);
      setStats(statsData);
      setPendingJobs(pendingData.jobs);
      setRecentJobs(recentData.jobs);
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
      // Retirer le job de la liste pending
      setPendingJobs((prev) => prev.filter((j) => j.id !== jobId));
      // Mettre à jour les stats
      if (stats) {
        setStats({
          ...stats,
          pendingJobs: stats.pendingJobs - 1,
          approvedJobs: status === "APPROVED" ? stats.approvedJobs + 1 : stats.approvedJobs,
        });
      }
    } catch {
      alert("Erreur lors de la modération");
    } finally {
      setActionLoading(null);
    }
  }

  // Loading state
  if (loading) {
    return (
      <AdminShell title="Tableau de bord" description="Chargement des données...">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </AdminShell>
    );
  }

  // Error state
  if (error) {
    return (
      <AdminShell title="Tableau de bord" description="Erreur de connexion">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <WifiOff className="h-12 w-12 text-red-400 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-800 mb-2">Connexion au serveur impossible</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-md">{error}</p>
          <button
            onClick={loadData}
            className="rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
          >
            Réessayer
          </button>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell title="Tableau de bord" description="Vue d'ensemble de la plateforme 237jobs">
      {/* ── Cartes Statistiques ─────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Jobs en attente"
          value={stats?.pendingJobs ?? 0}
          icon={<Clock className="h-5 w-5" />}
          color="text-orange-600"
          bg="bg-orange-50"
          border="border-orange-100"
          href="/moderation/jobs"
        />
        <StatCard
          title="Jobs approuvés"
          value={stats?.approvedJobs ?? 0}
          icon={<Briefcase className="h-5 w-5" />}
          color="text-green-600"
          bg="bg-green-50"
          border="border-green-100"
          href="/moderation/jobs"
        />
        <StatCard
          title="Signalements ouverts"
          value={stats?.reports ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          color="text-red-600"
          bg="bg-red-50"
          border="border-red-100"
          href="/alertes/signalements"
        />
        <StatCard
          title="Utilisateurs"
          value={stats?.users ?? 0}
          icon={<Users className="h-5 w-5" />}
          color="text-blue-600"
          bg="bg-blue-50"
          border="border-blue-100"
          href="/utilisateurs/liste"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* ── Graphique ──────────────────────────────────── */}
        <div className="xl:col-span-2 rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-zinc-800">Inscriptions cette semaine</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" /> +12%
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: "#6B7280", fontSize: 12 }} dx={-10} />
                <Tooltip
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #E5E7EB",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    fontSize: 13,
                  }}
                />
                <Area type="monotone" dataKey="inscrits" stroke="#22C55E" fill="#22C55E" fillOpacity={0.08} strokeWidth={2.5} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* ── Modération urgente ──────────────────────────── */}
        <div className="rounded-2xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-zinc-800">
              A modérer
              {pendingJobs.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
                  {pendingJobs.length}
                </span>
              )}
            </h3>
            <Link href="/moderation/jobs" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition">
              Tout voir &rarr;
            </Link>
          </div>

          {pendingJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <CheckCircle className="h-10 w-10 text-green-400 mb-3" />
              <p className="text-sm font-medium text-zinc-600">Aucune annonce en attente</p>
              <p className="text-xs text-zinc-400 mt-1">Tout est à jour !</p>
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
                      className="rounded-lg p-2 text-green-600 hover:bg-green-100 transition disabled:opacity-50"
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
                      className="rounded-lg p-2 text-red-600 hover:bg-red-100 transition disabled:opacity-50"
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

      {/* ── Dernières annonces ────────────────────────────── */}
      <div className="rounded-2xl border border-zinc-200 bg-white">
        <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
          <h3 className="text-base font-semibold text-zinc-800">Dernières annonces</h3>
          <Link href="/moderation/jobs" className="text-xs font-medium text-zinc-500 hover:text-zinc-800 transition">
            Voir tout &rarr;
          </Link>
        </div>
        <div className="divide-y divide-zinc-100">
          {recentJobs.map((job) => (
            <div key={job.id} className="flex items-center justify-between px-6 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-zinc-800">{job.title}</p>
                <p className="text-xs text-zinc-500">
                  {job.company} &bull; {job.location} &bull; {formatDate(job.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 ml-4 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                  job.status === "APPROVED"
                    ? "bg-green-50 text-green-700 border border-green-200"
                    : job.status === "PENDING"
                      ? "bg-orange-50 text-orange-700 border border-orange-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                }`}
              >
                {job.status === "APPROVED" ? "Approuvé" : job.status === "PENDING" ? "En attente" : "Rejeté"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </AdminShell>
  );
}

// ── Composant StatCard ────────────────────────────────────────────

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
