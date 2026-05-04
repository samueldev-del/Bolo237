"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Footer from '@/components/Footer';
import JobListingCard from '@/components/JobListingCard';
import { JobCardSkeletonList } from '@/components/JobCardSkeleton';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, fetchUserSavedJobs, removeUserSavedJob, saveUserJob } from '@/lib/api';
import type { JobsResponse } from '@/lib/api';
import { buildJobDetailPath } from '@/lib/jobSlug';
import { mapApiJobToListing, type JobListing } from '@/lib/job-listings';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import { useApi } from '@/lib/useApi';

type Offre = JobListing;

type JobFilters = {
  sortBy: 'recent' | 'oldest';
  datePosted: 'all' | '24h' | '7d' | '30d';
  remote: 'all' | 'onsite' | 'partial' | 'remote';
  salary: 'all' | 'with-salary';
  applicationType: 'all' | 'bolo237' | 'external';
  region: string;
  city: string;
  experience: 'all' | 'junior' | 'confirmed' | 'senior';
  contract: 'all' | 'cdi' | 'cdd' | 'stage' | 'freelance';
  workTime: 'all' | 'full' | 'part';
};

const DEFAULT_JOB_FILTERS: JobFilters = {
  sortBy: 'recent',
  datePosted: 'all',
  remote: 'all',
  salary: 'all',
  applicationType: 'all',
  region: 'all',
  city: 'all',
  experience: 'all',
  contract: 'all',
  workTime: 'all',
};

function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useMemo(() => `filter-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`, [title]);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-bold text-gray-900"
      >
        <span>{title}</span>
        <span className={`text-gray-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden="true">▾</span>
      </button>
      {open ? (
        <div id={panelId} className="border-t border-gray-100 px-3 py-3">{children}</div>
      ) : null}
    </div>
  );
}

function FilterChoice({
  label,
  active,
  onClick,
  count,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={count !== undefined ? `${label} (${count})` : label}
      className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-semibold transition ${
        active
          ? 'border-[#DA7756] bg-[#FFF5EF] text-[#A8502F]'
          : 'border-gray-200 bg-white text-gray-600 hover:border-[#F2D8C8] hover:bg-[#FFF8F3]'
      }`}
      type="button"
    >
      <span>{label}</span>
      {count !== undefined ? (
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${active ? 'bg-[#DA7756] text-white' : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
      ) : null}
    </button>
  );
}

export default function EmploisFormels({ initialJobs }: { initialJobs?: JobsResponse | null } = {}) {
  const initialJobsSeed = initialJobs || null;
  const { localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const userSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-user'),
    () => null,
  );
  const userId = useMemo(() => {
    try {
      if (!userSnapshot) return 0;
      const parsed = JSON.parse(userSnapshot);
      return Number(parsed?.id || 0);
    } catch {
      return 0;
    }
  }, [userSnapshot]);

  const [savedIds, setSavedIds] = useState<number[]>([]);
  const [showAlertBanner, setShowAlertBanner] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [appliedLocation, setAppliedLocation] = useState('');
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_JOB_FILTERS);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.body.style.overflow;
    if (mobileFiltersOpen) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileFiltersOpen]);

  useEffect(() => {
    const loadSavedJobs = async () => {
      if (!userId) return;
      try {
        const jobs = await fetchUserSavedJobs(userId);
        setSavedIds(jobs.map((job) => job.id));
      } catch {
        setSavedIds([]);
      }
    };

    void loadSavedJobs();
  }, [userId]);

  const handleSearch = () => {
    setAppliedSearch(searchInput.trim());
    setAppliedLocation(locationInput.trim());
  };

  const resetSearch = () => {
    setSearchInput('');
    setLocationInput('');
    setAppliedSearch('');
    setAppliedLocation('');
  };

  const resetFilters = () => {
    setFilters(DEFAULT_JOB_FILTERS);
  };

  const { data: jobsData, loading: jobsLoading } = useApi(
    () =>
      fetchJobs({
        limit: 60,
        status: 'APPROVED',
        ...(appliedSearch ? { search: appliedSearch } : {}),
        ...(appliedLocation ? { location: appliedLocation } : {}),
      }),
    initialJobsSeed,
    [appliedSearch, appliedLocation],
    { initialData: initialJobsSeed },
  );

  const offres = useMemo(
    () => jobsData?.jobs.map((job, index) => mapApiJobToListing(job, index, isEn)) ?? [],
    [jobsData, isEn],
  );

  const filteredOffers = useMemo(() => {
    return offres
      .filter((offer) => {
        if (filters.datePosted === '24h' && offer.publishedHours > 24) return false;
        if (filters.datePosted === '7d' && offer.publishedHours > 24 * 7) return false;
        if (filters.datePosted === '30d' && offer.publishedHours > 24 * 30) return false;
        if (filters.remote !== 'all' && offer.workMode !== filters.remote) return false;
        if (filters.salary === 'with-salary' && !offer.salary) return false;
        if (filters.applicationType !== 'all' && offer.applicationType !== filters.applicationType) return false;
        if (filters.region !== 'all' && offer.region !== filters.region) return false;
        if (filters.city !== 'all' && offer.city !== filters.city) return false;
        if (filters.experience !== 'all' && offer.experienceLevel !== filters.experience) return false;
        if (filters.contract !== 'all' && offer.contractType !== filters.contract) return false;
        if (filters.workTime !== 'all' && offer.workTime !== filters.workTime) return false;
        return true;
      })
      .sort((left, right) => {
        if (filters.sortBy === 'oldest') {
          return left.publishedHours - right.publishedHours;
        }
        return right.publishedHours - left.publishedHours;
      });
  }, [filters, offres]);

  const hasActiveSearch = Boolean(appliedSearch || appliedLocation);
  const hasPanelFiltersActive = JSON.stringify(filters) !== JSON.stringify(DEFAULT_JOB_FILTERS);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => value !== DEFAULT_JOB_FILTERS[key as keyof JobFilters]).length;
  const totalOffers = jobsData?.pagination.total ?? offres.length;

  const countMatches = (predicate: (offer: Offre) => boolean) => offres.filter(predicate).length;
  const uniqueRegions = useMemo(() => Array.from(new Set(offres.map((offer) => offer.region))).sort((left, right) => left.localeCompare(right)), [offres]);
  const uniqueCities = useMemo(() => Array.from(new Set(offres.map((offer) => offer.city))).sort((left, right) => left.localeCompare(right)), [offres]);

  const toggleSave = async (id: number) => {
    const isSaved = savedIds.includes(id);

    setSavedIds((prev) => (isSaved ? prev.filter((item) => item !== id) : [...prev, id]));

    if (!userId) return;

    try {
      if (isSaved) {
        await removeUserSavedJob(userId, id);
      } else {
        await saveUserJob(userId, id);
      }
    } catch {
      setSavedIds((prev) => (isSaved ? [...prev, id] : prev.filter((item) => item !== id)));
    }
  };

  const filterPanelBody = (
    <div className="space-y-3 bg-[#FCFCFD] p-4">
      <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#F2D8C8] bg-[#FFF8F3] px-4 py-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#A8502F]">
            {isEn ? 'Filters active' : 'Filtres actifs'}
          </p>
          <p className="mt-1 text-2xl font-extrabold text-black">{activeFilterCount}</p>
        </div>
        <button
          onClick={resetFilters}
          disabled={!hasPanelFiltersActive}
          className="rounded-xl border border-[#EFC7B3] px-3 py-2 text-xs font-bold text-[#A8502F] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          {isEn ? 'Reset filters' : 'Réinitialiser'}
        </button>
      </div>

      <FilterGroup title={isEn ? 'Sort by' : 'Trier par'} defaultOpen>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'Most recent' : 'Plus récentes'} active={filters.sortBy === 'recent'} onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'recent' }))} />
          <FilterChoice label={isEn ? 'Oldest first' : 'Plus anciennes'} active={filters.sortBy === 'oldest'} onClick={() => setFilters((prev) => ({ ...prev, sortBy: 'oldest' }))} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Publication date' : 'Date de publication'} defaultOpen>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'Any time' : 'Toutes'} active={filters.datePosted === 'all'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'Last 24 hours' : 'Moins de 24h'} active={filters.datePosted === '24h'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '24h' }))} count={countMatches((offer) => offer.publishedHours <= 24)} />
          <FilterChoice label={isEn ? 'Last 7 days' : 'Moins de 7 jours'} active={filters.datePosted === '7d'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '7d' }))} count={countMatches((offer) => offer.publishedHours <= 24 * 7)} />
          <FilterChoice label={isEn ? 'Last 30 days' : 'Moins de 30 jours'} active={filters.datePosted === '30d'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '30d' }))} count={countMatches((offer) => offer.publishedHours <= 24 * 30)} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Work mode' : 'Mode de travail'} defaultOpen>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All modes' : 'Tous les modes'} active={filters.remote === 'all'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'On-site' : 'Sur site'} active={filters.remote === 'onsite'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'onsite' }))} count={countMatches((offer) => offer.workMode === 'onsite')} />
          <FilterChoice label={isEn ? 'Hybrid' : 'Hybride'} active={filters.remote === 'partial'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'partial' }))} count={countMatches((offer) => offer.workMode === 'partial')} />
          <FilterChoice label={isEn ? 'Remote' : 'Télétravail'} active={filters.remote === 'remote'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'remote' }))} count={countMatches((offer) => offer.workMode === 'remote')} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Application type' : 'Type de candidature'} defaultOpen>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All types' : 'Toutes'} active={filters.applicationType === 'all'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'Apply on Bolo237' : 'Postuler sur Bolo237'} active={filters.applicationType === 'bolo237'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'bolo237' }))} count={countMatches((offer) => offer.applicationType === 'bolo237')} />
          <FilterChoice label={isEn ? 'External company link' : 'Lien entreprise externe'} active={filters.applicationType === 'external'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'external' }))} count={countMatches((offer) => offer.applicationType === 'external')} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Salary' : 'Salaire'}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All offers' : 'Toutes les offres'} active={filters.salary === 'all'} onClick={() => setFilters((prev) => ({ ...prev, salary: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'Salary displayed' : 'Salaire affiché'} active={filters.salary === 'with-salary'} onClick={() => setFilters((prev) => ({ ...prev, salary: 'with-salary' }))} count={countMatches((offer) => Boolean(offer.salary))} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Region' : 'Région'}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All regions' : 'Toutes les régions'} active={filters.region === 'all'} onClick={() => setFilters((prev) => ({ ...prev, region: 'all' }))} count={offres.length} />
          {uniqueRegions.map((region) => (
            <FilterChoice key={region} label={region} active={filters.region === region} onClick={() => setFilters((prev) => ({ ...prev, region }))} count={countMatches((offer) => offer.region === region)} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'City' : 'Ville'}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All cities' : 'Toutes les villes'} active={filters.city === 'all'} onClick={() => setFilters((prev) => ({ ...prev, city: 'all' }))} count={offres.length} />
          {uniqueCities.map((city) => (
            <FilterChoice key={city} label={city} active={filters.city === city} onClick={() => setFilters((prev) => ({ ...prev, city }))} count={countMatches((offer) => offer.city === city)} />
          ))}
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Experience level' : "Niveau d'expérience"}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All levels' : 'Tous les niveaux'} active={filters.experience === 'all'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'Junior' : 'Junior'} active={filters.experience === 'junior'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'junior' }))} count={countMatches((offer) => offer.experienceLevel === 'junior')} />
          <FilterChoice label={isEn ? 'Confirmed' : 'Confirmé'} active={filters.experience === 'confirmed'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'confirmed' }))} count={countMatches((offer) => offer.experienceLevel === 'confirmed')} />
          <FilterChoice label={isEn ? 'Senior' : 'Senior'} active={filters.experience === 'senior'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'senior' }))} count={countMatches((offer) => offer.experienceLevel === 'senior')} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Contract type' : 'Type de contrat'}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All contracts' : 'Tous les contrats'} active={filters.contract === 'all'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'all' }))} count={offres.length} />
          <FilterChoice label="CDI" active={filters.contract === 'cdi'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'cdi' }))} count={countMatches((offer) => offer.contractType === 'cdi')} />
          <FilterChoice label="CDD" active={filters.contract === 'cdd'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'cdd' }))} count={countMatches((offer) => offer.contractType === 'cdd')} />
          <FilterChoice label={isEn ? 'Internship' : 'Stage'} active={filters.contract === 'stage'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'stage' }))} count={countMatches((offer) => offer.contractType === 'stage')} />
          <FilterChoice label="Freelance" active={filters.contract === 'freelance'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'freelance' }))} count={countMatches((offer) => offer.contractType === 'freelance')} />
        </div>
      </FilterGroup>

      <FilterGroup title={isEn ? 'Working time' : 'Temps de travail'}>
        <div className="space-y-2">
          <FilterChoice label={isEn ? 'All working times' : 'Tous'} active={filters.workTime === 'all'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'all' }))} count={offres.length} />
          <FilterChoice label={isEn ? 'Full-time' : 'Temps plein'} active={filters.workTime === 'full'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'full' }))} count={countMatches((offer) => offer.workTime === 'full')} />
          <FilterChoice label={isEn ? 'Part-time' : 'Temps partiel'} active={filters.workTime === 'part'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'part' }))} count={countMatches((offer) => offer.workTime === 'part')} />
        </div>
      </FilterGroup>

      {hasActiveSearch ? (
        <div className="rounded-2xl border border-dashed border-[#F2D8C8] bg-[#FFF8F3] px-4 py-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
              {isEn ? 'Current search' : 'Recherche en cours'}
            </h3>
            <button
              onClick={resetSearch}
              className="text-xs font-bold text-[#C4623F] hover:underline"
              type="button"
            >
              {isEn ? 'Clear' : 'Effacer'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {appliedSearch ? <span className="rounded-full border border-[#F2D8C8] bg-white px-3 py-1 text-xs font-bold text-[#A8502F]">{appliedSearch}</span> : null}
            {appliedLocation ? <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600">{appliedLocation}</span> : null}
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F7F8FA]">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Emplois', en: 'Jobs' }, path: '/emplois' },
        ]}
      />
      <Header />

      <div className="border-b border-gray-200 bg-white shadow-sm">
        <div className="mx-auto max-w-6xl px-4 pt-3">
          <Link
            href={localizePath('/')}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-600 transition hover:text-[#A8502F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 rounded-lg"
          >
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {isEn ? 'Back to home' : "Retour à l'accueil"}
          </Link>
        </div>

        <div className="mx-auto max-w-6xl px-4 py-5">
          <div className="flex flex-col gap-2 rounded-2xl border border-gray-100 bg-white p-2 shadow-lg shadow-[#FEEBD6]/25 md:flex-row">
            <div className="relative flex-[2]">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={isEn ? 'Job title, skill, company...' : 'Poste, compétence, entreprise...'}
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                className="w-full rounded-xl bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-[#DA7756]"
              />
            </div>

            <div className="relative flex-1">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" />
                </svg>
              </span>
              <input
                type="text"
                placeholder={isEn ? 'City or region...' : 'Ville ou région...'}
                value={locationInput}
                onChange={(event) => setLocationInput(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && handleSearch()}
                className="w-full rounded-xl bg-gray-50 py-3 pl-11 pr-4 text-sm font-medium text-black outline-none transition focus:bg-white focus:ring-2 focus:ring-[#DA7756]"
              />
            </div>

              <button
              onClick={handleSearch}
                className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#C4623F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
              type="button"
            >
              {isEn ? 'Find jobs' : 'Trouver un emploi'}
            </button>
          </div>
        </div>
      </div>

      {showAlertBanner ? (
        <div className="border-b border-emerald-200 bg-emerald-50">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="m-0 text-sm text-emerald-900">
              <strong>{isEn ? 'Still not finding the right role?' : 'Vous ne trouvez pas ?'}</strong>{' '}
              {isEn
                ? 'Activate job alerts and receive the newest openings by email.'
                : 'Activez les alertes emploi et recevez les nouvelles offres par email.'}
            </p>
            <div className="flex items-center gap-2">
              <button
                className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-700"
                type="button"
              >
                {isEn ? 'Activate alerts' : 'Activer les alertes'}
              </button>
              <button
                className="rounded-lg px-2 py-1 text-lg text-emerald-700 transition hover:bg-emerald-100"
                onClick={() => setShowAlertBanner(false)}
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start">
        <aside className="hidden w-full shrink-0 space-y-3 lg:sticky lg:top-24 lg:block lg:basis-[28%]">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-4 py-4 text-sm font-bold text-black">
              <span className="flex h-5 w-5 items-center justify-center rounded bg-[#FEEBD6] text-[#C4623F]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </span>
              {isEn ? 'Filter listings' : 'Filtrer les annonces'}
            </div>

            {filterPanelBody}
          </div>
        </aside>

        {mobileFiltersOpen && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white lg:hidden">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-bold text-black">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-[#FEEBD6] text-[#C4623F]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </span>
                {isEn ? 'Filter listings' : 'Filtrer les annonces'}
                {activeFilterCount > 0 ? (
                  <span className="ml-1 rounded-full bg-[#DA7756] px-2 py-0.5 text-[11px] font-extrabold text-white">{activeFilterCount}</span>
                ) : null}
              </div>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="rounded-full p-2 text-gray-600 transition hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
                aria-label={isEn ? 'Close filters' : 'Fermer les filtres'}
                type="button"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto pb-24">{filterPanelBody}</div>
            <div className="sticky bottom-0 flex items-center gap-3 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <button
                onClick={() => {
                  resetFilters();
                  resetSearch();
                }}
                disabled={!hasPanelFiltersActive && !hasActiveSearch}
                className="rounded-xl border border-[#EFC7B3] px-4 py-3 text-sm font-bold text-[#A8502F] transition hover:bg-[#FFF8F3] disabled:cursor-not-allowed disabled:opacity-50"
                type="button"
              >
                {isEn ? 'Reset' : 'Réinitialiser'}
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 rounded-xl bg-[#DA7756] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#C4623F]"
                type="button"
              >
                {isEn
                  ? `Show ${filteredOffers.length} ${filteredOffers.length === 1 ? 'offer' : 'offers'}`
                  : `Voir ${filteredOffers.length} ${filteredOffers.length === 1 ? 'annonce' : 'annonces'}`}
              </button>
            </div>
          </div>
        )}

        <section className="min-w-0 flex-1">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 shadow-sm transition hover:border-[#DA7756] hover:text-[#C4623F]"
              type="button"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
              {isEn ? 'Filters' : 'Filtres'}
              {activeFilterCount > 0 ? (
                <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-[#DA7756] px-1.5 text-[10px] font-extrabold text-white">{activeFilterCount}</span>
              ) : null}
            </button>
            <select
              value={filters.sortBy}
              onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value as JobFilters['sortBy'] }))}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#DA7756]"
              aria-label={isEn ? 'Sort by' : 'Trier par'}
            >
              <option value="recent">{isEn ? 'Most recent' : 'Plus récentes'}</option>
              <option value="oldest">{isEn ? 'Oldest first' : 'Plus anciennes'}</option>
            </select>
          </div>
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="m-0 text-sm font-semibold text-gray-600">
              {jobsLoading ? (
                isEn ? 'Loading jobs...' : 'Chargement des annonces...'
              ) : filteredOffers.length > 0 ? (
                hasPanelFiltersActive ? (
                  <>
                    <span className="font-extrabold text-gray-900">{filteredOffers.length}</span>{' '}
                    {isEn ? 'filtered offers on this page' : 'annonces filtrées sur cette page'}
                  </>
                ) : (
                  <>
                    <span className="font-extrabold text-gray-900">{filteredOffers.length}</span>{' '}
                    {isEn ? `offers shown out of ${totalOffers}` : `annonces affichées sur ${totalOffers}`}
                  </>
                )
              ) : (
                isEn ? 'No jobs found' : 'Aucune annonce trouvée'
              )}
            </p>

            <div className="hidden items-center gap-2 lg:flex">
              <span className="text-sm font-medium text-gray-600">{isEn ? 'Sort by:' : 'Trier par :'}</span>
              <select
                value={filters.sortBy}
                onChange={(event) => setFilters((prev) => ({ ...prev, sortBy: event.target.value as JobFilters['sortBy'] }))}
                className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 outline-none transition focus:border-[#DA7756]"
              >
                <option value="recent">{isEn ? 'Most recent' : 'Plus récentes'}</option>
                <option value="oldest">{isEn ? 'Oldest first' : 'Plus anciennes'}</option>
              </select>
            </div>
          </div>

          {filteredOffers.length > 0 ? (
            <div className="space-y-4">
              {filteredOffers.map((offre) => {
                const isSaved = savedIds.includes(offre.id);

                return (
                  <JobListingCard
                    key={offre.id}
                    offer={offre}
                    isEn={isEn}
                    href={localizePath(buildJobDetailPath(offre))}
                    isSaved={isSaved}
                    onToggleSave={() => toggleSave(offre.id)}
                  />
                );
              })}
            </div>
          ) : jobsLoading ? (
            <JobCardSkeletonList count={4} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-8 text-center shadow-sm">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFF5EF] text-4xl">📋</div>
              <h3 className="text-xl font-extrabold text-black">
                {hasPanelFiltersActive || hasActiveSearch
                  ? (isEn ? 'No offer matches these filters' : 'Aucune annonce ne correspond à ces filtres')
                  : (isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment')}
              </h3>
              <p className="mt-3 max-w-md text-sm font-medium leading-6 text-gray-600">
                {hasPanelFiltersActive || hasActiveSearch
                  ? (isEn
                      ? 'Try broader filters or reset the current search to see more verified listings.'
                      : 'Essayez des filtres plus larges ou réinitialisez la recherche pour voir plus d’annonces vérifiées.')
                  : (isEn
                      ? 'New job listings will appear here as they are published and approved.'
                      : 'Les nouvelles annonces apparaîtront ici au fur et à mesure de leur publication et validation.')}
              </p>

              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                    resetFilters();
                    resetSearch();
                  }}
                  className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#C4623F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
                  type="button"
                >
                  {isEn ? 'Reset filters and search' : 'Réinitialiser filtres et recherche'}
                </button>
                <Link
                  href={localizePath('/connexion')}
                  className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#DA7756] hover:text-[#C4623F] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
                >
                  {isEn ? 'Create an account' : 'Créer un compte'}
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-3xl bg-gradient-to-r from-[#5B21B6] to-[#7C3AED] px-6 py-6">
            <div>
              <h3 className="text-base font-extrabold text-white">
                {isEn ? 'Upload your CV and get discovered by employers' : 'Déposez votre CV et soyez trouvé par les entreprises'}
              </h3>
              <p className="mt-1 text-sm font-medium text-white/70">
                {isEn ? 'Hundreds of companies browse the Bolo237 CV database every month.' : 'Des centaines d’entreprises consultent la CVthèque Bolo237 chaque mois.'}
              </p>
            </div>
            <Link
              href={localizePath('/profil')}
              className="ml-auto rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-[#7C3AED] transition hover:bg-[#F9FAFB]"
            >
              {isEn ? 'Upload my CV →' : 'Déposer mon CV →'}
            </Link>
          </div>
        </section>
      </div>

      <Footer />
    </div>
  );
}
