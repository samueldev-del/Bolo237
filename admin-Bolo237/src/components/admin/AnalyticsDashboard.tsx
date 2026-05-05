"use client";

import { useEffect, useState, type ReactNode } from 'react';
import { Activity, BarChart3, FileText, Loader2, MousePointerClick } from 'lucide-react';
import {
  fetchJobAnalytics,
  type AdminJobAnalyticsResponse,
} from '@/lib/api';

function formatInteger(value: number) {
  return Number(value || 0).toLocaleString('fr-FR');
}

function formatPercent(value: number) {
  return `${Number(value || 0).toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} %`;
}

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AdminJobAnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchJobAnalytics();
        if (!active) return;
        setData(response);
      } catch (err) {
        if (!active) return;
        setError(err instanceof Error ? err.message : 'Impossible de charger les analytics.');
      } finally {
        if (active) setLoading(false);
      }
    };

    void load();
    return () => {
      active = false;
    };
  }, []);

  return (
    <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[#DA7756]">Analytics</p>
          <h3 className="mt-2 text-lg font-black text-zinc-900">Performance des annonces</h3>
          <p className="mt-1 text-sm font-medium text-zinc-500">
            Vues, clics sur « Postuler », candidatures générées et taux de clic par annonce.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-zinc-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
          {error}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Vues totales"
              value={formatInteger(data.summary.totalViews)}
              icon={<Activity className="h-5 w-5" />}
              tone="blue"
            />
            <MetricCard
              title="Clics sur Postuler"
              value={formatInteger(data.summary.totalApplyClicks)}
              icon={<MousePointerClick className="h-5 w-5" />}
              tone="amber"
            />
            <MetricCard
              title="Candidatures générées"
              value={formatInteger(data.summary.totalApplications)}
              icon={<FileText className="h-5 w-5" />}
              tone="emerald"
            />
            <MetricCard
              title="CTR global"
              value={formatPercent(data.summary.overallCtr)}
              icon={<BarChart3 className="h-5 w-5" />}
              tone="rose"
            />
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-zinc-200">
            <div className="grid grid-cols-[minmax(0,2fr),1fr,0.8fr,0.8fr,0.8fr] gap-3 bg-zinc-50 px-4 py-3 text-[11px] font-black uppercase tracking-wide text-zinc-500">
              <span>Annonce</span>
              <span>Entreprise</span>
              <span>Vues</span>
              <span>CTR</span>
              <span>Candidatures</span>
            </div>

            <div className="divide-y divide-zinc-100 bg-white">
              {data.jobs.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm font-medium text-zinc-400">
                  Aucune annonce suivie pour le moment.
                </div>
              ) : data.jobs.map((job) => (
                <div key={job.id} className="grid grid-cols-[minmax(0,2fr),1fr,0.8fr,0.8fr,0.8fr] gap-3 px-4 py-4 text-sm text-zinc-700">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-zinc-900">{job.title}</p>
                    <p className="mt-1 text-xs font-medium text-zinc-500">#{job.id}</p>
                  </div>
                  <p className="truncate font-medium text-zinc-600">{job.company}</p>
                  <p className="font-bold text-zinc-900">{formatInteger(job.viewCount)}</p>
                  <p className="font-bold text-[#DA7756]">{formatPercent(job.ctr)}</p>
                  <p className="font-bold text-zinc-900">{formatInteger(job.applicationCount)}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}

function MetricCard({
  title,
  value,
  icon,
  tone,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  tone: 'blue' | 'amber' | 'emerald' | 'rose';
}) {
  const toneClassName = tone === 'blue'
    ? 'border-blue-200 bg-blue-50 text-blue-700'
    : tone === 'amber'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : tone === 'emerald'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
        : 'border-rose-200 bg-rose-50 text-rose-700';

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-black uppercase tracking-wide text-zinc-500">{title}</p>
        <div className={`rounded-xl border px-3 py-2 ${toneClassName}`}>{icon}</div>
      </div>
      <p className="mt-4 text-3xl font-black tracking-tight text-zinc-900">{value}</p>
    </div>
  );
}