"use client";

import type { ReactNode } from 'react';
import Link from 'next/link';
import type { JobListing } from '@/lib/job-listings';
import { getContractLabel, getExperienceLabel, getWorkModeLabel, getWorkTimeLabel } from '@/lib/job-listings';

type JobListingCardProps = {
  offer: JobListing;
  isEn: boolean;
  href: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
};

function DetailItem({
  icon,
  label,
  value,
  emphasize = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  emphasize?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="text-slate-500">{icon}</span>
        <span>{label}</span>
      </div>
      <p className={`text-sm font-semibold ${emphasize ? 'text-emerald-700' : 'text-slate-800'}`}>{value}</p>
    </div>
  );
}

export default function JobListingCard({ offer, isEn, href, isSaved = false, onToggleSave }: JobListingCardProps) {
  const summary = offer.description || (isEn ? 'No description available yet.' : 'Aucune description disponible pour le moment.');
  const applyLabel = offer.applicationType === 'bolo237'
    ? (isEn ? 'Quick apply' : 'Candidature rapide')
    : (isEn ? 'External apply' : 'Candidature externe');
  const companyStatusLabel = offer.isVerified
    ? (isEn ? 'Verified employer' : 'Employeur vérifié')
    : (isEn ? 'Company profile' : 'Profil entreprise');

  return (
    <article className="group rounded-[28px] border border-slate-200 bg-white p-4 shadow-[0_20px_50px_-28px_rgba(15,23,42,0.35)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_28px_70px_-32px_rgba(15,23,42,0.42)] sm:p-5">
      <div className="flex items-start gap-4 sm:gap-5">
        <div className="min-w-0 flex-1">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] ${offer.applicationType === 'bolo237' ? 'bg-[#E8F1FA] text-[#0F4C81]' : 'bg-[#FFF3EA] text-[#B45309]'}`}>
              {applyLabel}
            </span>
            {offer.isNew ? (
              <span className="rounded-full bg-[#E8F8EF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700">
                {isEn ? 'New' : 'Nouveau'}
              </span>
            ) : null}
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">
              {offer.postedLabel}
            </span>
          </div>

          <Link href={href} className="block text-[1.08rem] font-extrabold leading-snug text-slate-950 transition group-hover:text-[#0F4C81] sm:text-[1.18rem]">
            {offer.title}
          </Link>

          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-slate-600">
            <span className="font-bold text-slate-800">{offer.company}</span>
            {offer.isVerified ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <ShieldIcon />
                {isEn ? 'Verified' : 'Vérifiée'}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <LocationIcon />
              {offer.location}
            </span>
          </div>

          <div className="mt-4 grid gap-2.5 grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3">
            <DetailItem
              icon={<LocationIcon />}
              label={isEn ? 'Location' : 'Lieu'}
              value={offer.location || (isEn ? 'Location not specified' : 'Lieu non précisé')}
            />
            <DetailItem
              icon={<BriefcaseIcon />}
              label={isEn ? 'Work mode' : 'Mode de travail'}
              value={getWorkModeLabel(offer.workMode, isEn)}
            />
            <DetailItem
              icon={<MoneyIcon />}
              label={isEn ? 'Salary' : 'Salaire'}
              value={offer.salary || (isEn ? 'Not disclosed' : 'Non communiqué')}
              emphasize={Boolean(offer.salary)}
            />
          </div>

          <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">{summary}</p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{getContractLabel(offer.contractType, isEn)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{getExperienceLabel(offer.experienceLevel, isEn)}</span>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">{getWorkTimeLabel(offer.workTime, isEn)}</span>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="inline-flex items-center gap-2 text-sm font-medium text-slate-500">
              <ClockIcon />
              <span>{isEn ? 'Published' : 'Publiée'} {offer.postedLabel}</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {onToggleSave ? (
                <button
                  onClick={onToggleSave}
                  className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-bold transition ${isSaved ? 'border-[#0F4C81] bg-[#E8F1FA] text-[#0F4C81]' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900'}`}
                  title={isSaved ? (isEn ? 'Remove from saved jobs' : 'Retirer des favoris') : (isEn ? 'Save job' : 'Sauvegarder')}
                  type="button"
                >
                  <HeartIcon filled={isSaved} />
                  {isSaved ? (isEn ? 'Saved' : 'Sauvegardée') : (isEn ? 'Save' : 'Sauvegarder')}
                </button>
              ) : null}

              <Link href={href} className="inline-flex items-center gap-2 rounded-full bg-[#0F4C81] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0C3E69]">
                {isEn ? 'View offer' : "Voir l'offre"}
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="flex w-[90px] shrink-0 flex-col items-end gap-3 text-right sm:w-[104px]">
          <div className="relative">
            {offer.logoUrl ? (
              <div className="flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-[22px] border border-slate-200 bg-white p-2 shadow-sm sm:h-[84px] sm:w-[84px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={offer.logoUrl}
                  alt={offer.company}
                  className="h-full w-full object-contain"
                  loading="lazy"
                  decoding="async"
                  onError={(event) => {
                    const image = event.target as HTMLImageElement;
                    const wrapper = image.parentElement;
                    if (wrapper) wrapper.style.display = 'none';
                    const fallback = wrapper?.nextElementSibling;
                    if (fallback instanceof HTMLElement) {
                      fallback.style.removeProperty('display');
                    }
                  }}
                />
              </div>
            ) : null}
            <div
              style={{
                backgroundColor: `${offer.logoColor}18`,
                borderColor: `${offer.logoColor}30`,
                color: offer.logoColor,
                display: offer.logoUrl ? 'none' : 'flex',
              }}
              className="h-[72px] w-[72px] items-center justify-center rounded-[22px] border text-lg font-black shadow-sm sm:h-[84px] sm:w-[84px]"
            >
              {offer.logoInitials}
            </div>
            {offer.isVerified ? (
              <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[11px] font-bold text-white">
                ✓
              </span>
            ) : null}
          </div>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
            {companyStatusLabel}
          </span>
        </div>
      </div>
    </article>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.93-2.01-3.5-4.5-3.5S7.5 5.57 7.5 7.5 9.51 11 12 11s4.5 1.57 4.5 3.5S14.49 18 12 18s-4.5-1.57-4.5-3.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V5l-8-3Zm-1.1 13.2-3-3 1.4-1.4 1.6 1.6 3.8-3.8 1.4 1.4-5.2 5.2Z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20.5s-7-4.35-7-10.03C5 7.42 7.2 5.5 9.8 5.5c1.64 0 3.09.8 4.2 2.32 1.11-1.52 2.56-2.32 4.2-2.32C20.8 5.5 23 7.42 23 10.47 23 16.15 16 20.5 16 20.5H12Z" />
    </svg>
  );
}
