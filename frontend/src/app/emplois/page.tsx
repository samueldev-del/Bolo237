"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, fetchUserSavedJobs, removeUserSavedJob, saveUserJob, type ApiJob } from '@/lib/api';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import { useApi } from '@/lib/useApi';

type Offre = {
  id: number;
  titre: string;
  entreprise: string;
  logoInitiales: string;
  logoColor: string;
  logoUrl: string | null;
  isVerified: boolean;
  lieu: string;
  region: string;
  city: string;
  salaire: string | null;
  description: string;
  heures: string;
  publishedHours: number;
  workMode: 'onsite' | 'partial' | 'remote';
  applicationType: 'bolo237' | 'external';
  contractType: 'cdi' | 'cdd' | 'stage' | 'freelance';
  experienceLevel: 'junior' | 'confirmed' | 'senior';
  workTime: 'full' | 'part';
  nouveau: boolean;
};

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

const LOGO_COLORS = ['#7C3AED', '#059669', '#D97706', '#DC2626', '#EA580C', '#2563EB', '#0891B2'];

function extractExternalApplyUrl(description: string): string | null {
  const text = String(description || '');
  if (!text) {
    return null;
  }

  const markerPattern = /(postuler sur le site de l'entreprise|lien de candidature|apply on company site)\s*[:\-]\s*(https?:\/\/[^\s]+)/i;
  const markerMatch = text.match(markerPattern);
  return markerMatch?.[2]?.trim() || null;
}

function inferWorkMode(location: string, description: string): 'onsite' | 'partial' | 'remote' {
  const text = `${location} ${description}`.toLowerCase();

  if (text.includes('100% teletravail') || text.includes('100% remote') || text.includes('full remote')) {
    return 'remote';
  }

  if (
    text.includes('teletravail partiel') ||
    text.includes('hybride') ||
    text.includes('hybrid') ||
    text.includes('partially remote') ||
    text.includes('home-office')
  ) {
    return 'partial';
  }

  return 'onsite';
}

function inferContractType(title: string, description: string): 'cdi' | 'cdd' | 'stage' | 'freelance' {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('stage') || text.includes('intern')) return 'stage';
  if (text.includes('freelance') || text.includes('consultant')) return 'freelance';
  if (text.includes('cdd') || text.includes('contract')) return 'cdd';
  return 'cdi';
}

function inferExperienceLevel(title: string, description: string): 'junior' | 'confirmed' | 'senior' {
  const text = `${title} ${description}`.toLowerCase();

  if (text.includes('senior') || text.includes('lead') || text.includes('manager') || text.includes('head')) {
    return 'senior';
  }
  if (text.includes('junior') || text.includes('assistant') || text.includes('entry')) {
    return 'junior';
  }

  return 'confirmed';
}

function inferWorkTime(title: string, description: string): 'full' | 'part' {
  const text = `${title} ${description}`.toLowerCase();
  if (text.includes('temps partiel') || text.includes('part-time') || text.includes('teilzeit') || text.includes('minijob')) {
    return 'part';
  }

  return 'full';
}

function inferCity(location: string): string {
  const normalized = String(location || '').trim();
  if (!normalized) return 'Autres';

  return normalized.split(/[\/,]/)[0]?.trim() || 'Autres';
}

function inferRegion(location: string): string {
  const text = String(location || '').toLowerCase();

  if (text.includes('douala') || text.includes('littoral')) return 'Littoral';
  if (text.includes('yaound') || text.includes('centre')) return 'Centre';
  if (text.includes('bafoussam') || text.includes('ouest')) return 'Ouest';
  if (text.includes('bamenda') || text.includes('nord-ouest')) return 'Nord-Ouest';
  if (text.includes('buea') || text.includes('limbe') || text.includes('sud-ouest')) return 'Sud-Ouest';
  if (text.includes('garoua') || text.includes('nord')) return 'Nord';
  if (text.includes('bertoua') || text.includes('est')) return 'Est';
  if (text.includes('kribi') || text.includes('sud')) return 'Sud';
  if (text.includes('maroua') || text.includes('extreme-nord')) return 'Extreme-Nord';
  if (text.includes('ngaound') || text.includes('adamaoua')) return 'Adamaoua';

  return 'Autres';
}

function timeAgo(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));

  if (hours < 1) return isEn ? 'just now' : "À l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `Il y a ${hours}h`;
  if (hours < 168) {
    const days = Math.floor(hours / 24);
    return isEn ? `${days}d ago` : `Il y a ${days} jour${days > 1 ? 's' : ''}`;
  }

  const weeks = Math.floor(hours / 168);
  return isEn ? `${weeks}w ago` : `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
}

function getContractLabel(contract: Offre['contractType'], isEn: boolean): string {
  if (contract === 'cdd') return 'CDD';
  if (contract === 'stage') return isEn ? 'Internship' : 'Stage';
  if (contract === 'freelance') return 'Freelance';
  return 'CDI';
}

function getWorkModeLabel(mode: Offre['workMode'], isEn: boolean): string {
  if (mode === 'remote') return isEn ? 'Remote' : 'Télétravail';
  if (mode === 'partial') return isEn ? 'Hybrid' : 'Hybride';
  return isEn ? 'On-site' : 'Sur site';
}

function getExperienceLabel(level: Offre['experienceLevel'], isEn: boolean): string {
  if (level === 'junior') return isEn ? 'Junior' : 'Junior';
  if (level === 'senior') return isEn ? 'Senior' : 'Senior';
  return isEn ? 'Confirmed' : 'Confirmé';
}

function apiJobToOffre(job: ApiJob, index: number, isEn: boolean): Offre {
  const publishedHours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));
  const description = job.description || '';

  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    logoInitiales: (job.company || '??').slice(0, 2).toUpperCase(),
    logoColor: LOGO_COLORS[index % LOGO_COLORS.length],
    logoUrl: job.author?.photoUrl || null,
    isVerified: job.author?.isVerified || false,
    lieu: job.location,
    region: inferRegion(job.location),
    city: inferCity(job.location),
    salaire: job.salary,
    description,
    heures: timeAgo(job.createdAt, isEn),
    publishedHours,
    workMode: inferWorkMode(job.location, description),
    applicationType: extractExternalApplyUrl(description) ? 'external' : 'bolo237',
    contractType: inferContractType(job.title, description),
    experienceLevel: inferExperienceLevel(job.title, description),
    workTime: inferWorkTime(job.title, description),
    nouveau: publishedHours < 72,
  };
}

function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  return (
    <details open={defaultOpen} className="group rounded-2xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-gray-900">
        <span>{title}</span>
        <span className="text-gray-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-gray-100 px-3 py-3">{children}</div>
    </details>
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

export default function EmploisFormels() {
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
    null,
    [appliedSearch, appliedLocation],
  );

  const offres = useMemo(
    () => jobsData?.jobs.map((job, index) => apiJobToOffre(job, index, isEn)) ?? [],
    [jobsData, isEn],
  );

  const filteredOffers = useMemo(() => {
    return offres
      .filter((offer) => {
        if (filters.datePosted === '24h' && offer.publishedHours > 24) return false;
        if (filters.datePosted === '7d' && offer.publishedHours > 24 * 7) return false;
        if (filters.datePosted === '30d' && offer.publishedHours > 24 * 30) return false;
        if (filters.remote !== 'all' && offer.workMode !== filters.remote) return false;
        if (filters.salary === 'with-salary' && !offer.salaire) return false;
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
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 transition hover:text-[#A8502F]"
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
              className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#C4623F]"
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
              {isEn ? 'Filter listings' : 'Filtrer annonces'}
            </div>

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
                  <FilterChoice label={isEn ? 'Salary displayed' : 'Salaire affiché'} active={filters.salary === 'with-salary'} onClick={() => setFilters((prev) => ({ ...prev, salary: 'with-salary' }))} count={countMatches((offer) => Boolean(offer.salaire))} />
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
          </div>
        </aside>

        <section className="min-w-0 flex-1">
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

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-500">{isEn ? 'Sort by:' : 'Trier par :'}</span>
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
            <div className="space-y-3">
              {filteredOffers.map((offre) => {
                const isSaved = savedIds.includes(offre.id);

                return (
                  <article key={offre.id} className="rounded-2xl border border-gray-200 bg-white p-5 transition hover:border-[#DA7756] hover:shadow-lg hover:shadow-[#FFF5EF]">
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="mb-3 flex flex-wrap items-center gap-2">
                          {offre.applicationType === 'bolo237' ? (
                            <span className="rounded-lg bg-[#EDE9FE] px-3 py-1 text-[11px] font-bold text-[#6D28D9]">
                              {isEn ? 'Quick apply' : 'Candidature rapide'}
                            </span>
                          ) : (
                            <span className="rounded-lg bg-[#FFF5EF] px-3 py-1 text-[11px] font-bold text-[#A8502F]">
                              {isEn ? 'External application' : 'Candidature externe'}
                            </span>
                          )}
                          {offre.nouveau ? (
                            <span className="rounded-lg bg-[#DBEAFE] px-3 py-1 text-[11px] font-extrabold tracking-wide text-[#1D4ED8]">
                              {isEn ? 'NEW' : 'NOUVEAU'}
                            </span>
                          ) : null}
                        </div>

                        <Link
                          href={localizePath(`/annonce/${offre.id}`)}
                          className="block text-[1.05rem] font-extrabold leading-snug text-[#7C3AED] transition hover:text-[#A855F7]"
                        >
                          {offre.titre}
                        </Link>

                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5 font-semibold text-gray-800">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16M3 21h18M9 21V11h6v10" /></svg>
                            {offre.entreprise}
                            {offre.isVerified ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="#059669"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                                {isEn ? 'Verified' : 'Certifiée'}
                              </span>
                            ) : null}
                          </span>

                          <span className="flex items-center gap-1.5">
                            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#94A3B8" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" /></svg>
                            {offre.lieu}
                          </span>

                          <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                            {getWorkModeLabel(offre.workMode, isEn)}
                          </span>

                          {offre.salaire ? (
                            <span className="flex items-center gap-1.5 font-semibold text-emerald-700">
                              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" /></svg>
                              {offre.salaire}
                            </span>
                          ) : null}
                        </div>

                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-gray-500">
                          {offre.description}
                        </p>

                        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-400">
                          <span>{offre.heures}</span>
                          <span>•</span>
                          <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-gray-600">{getContractLabel(offre.contractType, isEn)}</span>
                          <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-gray-600">{getExperienceLabel(offre.experienceLevel, isEn)}</span>
                          <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-gray-600">{offre.workTime === 'full' ? (isEn ? 'Full-time' : 'Temps plein') : (isEn ? 'Part-time' : 'Temps partiel')}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-3">
                        <div className="relative">
                          {offre.logoUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={offre.logoUrl}
                              alt={offre.entreprise}
                              className="h-[52px] w-[52px] rounded-xl border border-gray-200 bg-white p-1 object-contain"
                              onError={(event) => {
                                const image = event.target as HTMLImageElement;
                                image.style.display = 'none';
                                const fallback = image.nextElementSibling;
                                if (fallback instanceof HTMLElement) {
                                  fallback.style.removeProperty('display');
                                }
                              }}
                            />
                          ) : null}
                          <div
                            style={{ backgroundColor: `${offre.logoColor}18`, borderColor: `${offre.logoColor}30`, color: offre.logoColor, display: offre.logoUrl ? 'none' : 'flex' }}
                            className="h-[52px] w-[52px] items-center justify-center rounded-xl border text-sm font-black"
                          >
                            {offre.logoInitiales}
                          </div>
                          {offre.isVerified ? (
                            <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[10px] font-bold text-white">
                              ✓
                            </span>
                          ) : null}
                        </div>

                        <button
                          onClick={() => toggleSave(offre.id)}
                          className="rounded-full p-1 transition hover:bg-gray-50"
                          title={isSaved ? (isEn ? 'Remove from saved jobs' : 'Retirer des favoris') : (isEn ? 'Save job' : 'Sauvegarder')}
                          type="button"
                        >
                          <svg width="22" height="22" viewBox="0 0 24 24" fill={isSaved ? '#7C3AED' : 'none'} stroke={isSaved ? '#7C3AED' : '#CBD5E1'} strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 0 0 0 6.364L12 20.364l7.682-7.682a4.5 4.5 0 0 0-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 0 0-6.364 0z" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : jobsLoading ? (
            <div className="space-y-3" aria-hidden="true">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="animate-pulse rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-2/3 rounded bg-gray-200"></div>
                      <div className="h-4 w-5/6 rounded bg-gray-100"></div>
                      <div className="h-4 w-2/5 rounded bg-gray-100"></div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-gray-100"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[#F2D8C8] bg-white px-8 py-20 text-center">
              <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-[#FFF5EF] text-4xl">📋</div>
              <h3 className="text-xl font-extrabold text-black">
                {hasPanelFiltersActive || hasActiveSearch
                  ? (isEn ? 'No offer matches these filters' : 'Aucune annonce ne correspond à ces filtres')
                  : (isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment')}
              </h3>
              <p className="mt-3 max-w-md text-sm font-medium leading-6 text-gray-500">
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
                  className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#C4623F]"
                  type="button"
                >
                  {isEn ? 'Reset filters and search' : 'Réinitialiser filtres et recherche'}
                </button>
                <Link
                  href={localizePath('/connexion')}
                  className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 transition hover:border-[#DA7756] hover:text-[#C4623F]"
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
