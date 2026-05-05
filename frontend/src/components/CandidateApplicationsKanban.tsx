"use client";

import Link from 'next/link';
import type { UserApplication } from '@/lib/api';

type CandidateApplicationsKanbanProps = {
  applications: UserApplication[];
  isEn: boolean;
  localizePath: (path: string) => string;
};

type KanbanStatus = 'APPLIED' | 'REVIEWING' | 'INTERVIEW' | 'HIRED' | 'REJECTED';

function normalizeApplicationStatus(status: string): KanbanStatus {
  const normalized = String(status || '').toUpperCase();
  if (normalized === 'REVIEWING' || normalized === 'REVIEWED') return 'REVIEWING';
  if (normalized === 'INTERVIEW') return 'INTERVIEW';
  if (normalized === 'HIRED' || normalized === 'ACCEPTED') return 'HIRED';
  if (normalized === 'REJECTED') return 'REJECTED';
  return 'APPLIED';
}

export default function CandidateApplicationsKanban({
  applications,
  isEn,
  localizePath,
}: CandidateApplicationsKanbanProps) {
  if (applications.length === 0) {
    return (
      <div className="bg-white py-10 text-center sm:py-14">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 sm:h-20 sm:w-20">
          <span className="text-3xl sm:text-4xl">📨</span>
        </div>
        <h4 className="mb-2 text-sm font-bold text-gray-900 sm:text-[15px]">
          {isEn ? 'No applications yet' : 'Aucune candidature pour le moment'}
        </h4>
        <p className="mx-auto max-w-sm text-xs font-medium text-gray-500 sm:text-sm">
          {isEn
            ? 'Your applications will appear here once you apply to job listings.'
            : 'Vos candidatures apparaîtront ici dès vos premières réponses aux offres.'}
        </p>
        <Link href={localizePath('/emplois')} className="mt-4 inline-block text-sm font-bold text-blue-600 transition hover:text-blue-700">
          {isEn ? 'Browse jobs' : 'Parcourir les offres'} &rarr;
        </Link>
      </div>
    );
  }

  const columns: Array<{
    key: KanbanStatus;
    title: string;
    subtitle: string;
    chipClassName: string;
    panelClassName: string;
  }> = [
    {
      key: 'APPLIED',
      title: isEn ? 'Applied' : 'Envoyées',
      subtitle: isEn ? 'Sent to employers' : 'Candidatures transmises',
      chipClassName: 'bg-blue-50 text-blue-700 border-blue-200',
      panelClassName: 'border-blue-100 bg-blue-50/40',
    },
    {
      key: 'REVIEWING',
      title: isEn ? 'Reviewing' : 'À l’étude',
      subtitle: isEn ? 'Under review' : 'En cours d’examen',
      chipClassName: 'bg-amber-50 text-amber-700 border-amber-200',
      panelClassName: 'border-amber-100 bg-amber-50/40',
    },
    {
      key: 'INTERVIEW',
      title: isEn ? 'Interview' : 'Entretien',
      subtitle: isEn ? 'Interview step' : 'Échange planifié',
      chipClassName: 'bg-violet-50 text-violet-700 border-violet-200',
      panelClassName: 'border-violet-100 bg-violet-50/40',
    },
    {
      key: 'HIRED',
      title: isEn ? 'Hired' : 'Retenu',
      subtitle: isEn ? 'Positive outcome' : 'Issue favorable',
      chipClassName: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      panelClassName: 'border-emerald-100 bg-emerald-50/40',
    },
    {
      key: 'REJECTED',
      title: isEn ? 'Rejected' : 'Non retenu',
      subtitle: isEn ? 'Closed outcomes' : 'Candidatures clôturées',
      chipClassName: 'bg-rose-50 text-rose-700 border-rose-200',
      panelClassName: 'border-rose-100 bg-rose-50/40',
    },
  ];

  const grouped = columns.map((column) => ({
    ...column,
    items: applications.filter((item) => normalizeApplicationStatus(item.status) === column.key),
  }));

  return (
    <div className="space-y-5 px-5 py-5 sm:px-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {grouped.map((column) => (
          <div key={column.key} className={`rounded-2xl border p-4 ${column.panelClassName}`}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500">{column.title}</p>
                <p className="mt-1 text-xs font-medium text-slate-500">{column.subtitle}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-black ${column.chipClassName}`}>
                {column.items.length}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        {grouped.map((column) => (
          <div key={column.key} className={`min-h-[240px] rounded-[24px] border p-4 ${column.panelClassName}`}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black text-slate-900">{column.title}</h3>
                <p className="text-xs font-medium text-slate-500">{column.subtitle}</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 text-[11px] font-black ${column.chipClassName}`}>
                {column.items.length}
              </span>
            </div>

            <div className="space-y-3">
              {column.items.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 px-4 py-6 text-center text-xs font-semibold text-slate-400">
                  {isEn ? 'No application in this column yet.' : 'Aucune candidature dans cette colonne pour l’instant.'}
                </div>
              ) : column.items.map((item) => {
                const dateStr = new Date(item.date).toLocaleDateString(isEn ? 'en-US' : 'fr-FR', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                });

                return (
                  <article key={item.id} className="rounded-[22px] border border-white/80 bg-white p-4 shadow-sm shadow-slate-200/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-black text-slate-900">{item.jobTitle}</h4>
                        <p className="mt-1 text-xs font-bold text-slate-500">{item.company}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-black ${column.chipClassName}`}>
                        {item.statut}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-medium text-slate-500">
                      {isEn ? `Updated ${dateStr}` : `Mis à jour le ${dateStr}`}
                    </p>
                    {item.jobId ? (
                      <Link
                        href={localizePath(`/annonce/${item.jobId}`)}
                        className="mt-4 inline-flex text-xs font-black text-[#0F4C81] transition hover:text-[#0C3E69]"
                      >
                        {isEn ? 'Open listing →' : 'Voir l’offre →'}
                      </Link>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}