"use client";

import { Suspense, memo, useCallback, useEffect, useMemo, useRef, useState, useTransition, useSyncExternalStore, type KeyboardEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { VerifiedBadge } from '@/components/VerifiedBadge';
import { fetchJobs, type ApiJob, type JobsResponse } from '@/lib/api';
import {
  inferWorkMode,
  inferContractType,
  inferWorkTime,
  inferExperienceLevel,
  inferCity,
  inferRegion,
} from '@/lib/job-listings';
import { useApi } from '@/lib/useApi';
import { getSessionStorageValue, subscribeToSessionStorage } from '@/lib/session';
import { BLUR_DATA_URL_STATIC } from '@/lib/imagePlaceholder';

const HOME_JOBS_PER_PAGE = 10;
const DEFAULT_HOME_QUERY: HomeQuery = {
  search: '',
  location: '',
  page: 1,
};

type HomeQuery = {
  search: string;
  location: string;
  page: number;
};

type HomePageClientProps = {
  initialJobsData: JobsResponse | null;
};

type HomePageContentProps = {
  initialJobsData: JobsResponse | null;
  initialQuery: HomeQuery;
};

type LocalJob = {
  id: number;
  titre: string;
  entreprise: string;
  lieu: string;
  authorPhoto: string | null;
  authorVerified: boolean;
  publishedHours: number;
  temps: string;
  description: string;
  salaire: string | null;
  region: string;
  city: string;
  workMode: 'onsite' | 'partial' | 'remote';
  applicationType: 'bolo237' | 'external';
  contractType: 'cdi' | 'cdd' | 'stage' | 'freelance';
  experienceLevel: 'junior' | 'confirmed' | 'senior';
  workTime: 'full' | 'part';
};

type HomeFilters = {
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

const DEFAULT_HOME_FILTERS: HomeFilters = {
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

function extractExternalApplyUrl(description: string): string | null {
  const text = String(description || '');
  if (!text) return null;

  const markerPattern = /(postuler sur le site de l'entreprise|lien de candidature|apply on company site)\s*[:\-]\s*(https?:\/\/[^\s]+)/i;
  const markerMatch = text.match(markerPattern);
  return markerMatch?.[2]?.trim() || null;
}

// infer* helpers are imported from '@/lib/job-listings' to avoid duplication.


function timeAgo(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return isEn ? 'just now' : "à l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `il y a ${days}j`;
}

function apiJobToLocal(job: ApiJob, isEn: boolean): LocalJob {
  const hours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));
  const description = job.description || '';

  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    lieu: job.location,
    authorPhoto: job.author?.photoUrl || null,
    authorVerified: Boolean(job.author?.isVerified),
    publishedHours: hours,
    temps: timeAgo(job.createdAt, isEn),
    description,
    salaire: job.salary,
    region: inferRegion(job.location),
    city: inferCity(job.location),
    workMode: inferWorkMode(job.location, description),
    applicationType: extractExternalApplyUrl(description) ? 'external' : 'bolo237',
    contractType: inferContractType(job.title, description),
    experienceLevel: inferExperienceLevel(job.title, description),
    workTime: inferWorkTime(job.title, description),
  };
}

function LoadingJobCards() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 4 }, (_, index) => (
        <article
          key={index}
          className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm animate-pulse"
        >
          <div className="flex items-start gap-4">
            {/* 🦴 Skeleton du Logo / Photo */}
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gray-200 flex-shrink-0"></div>

            {/* 🦴 Skeleton des Textes */}
            <div className="flex-1 min-w-0 space-y-3 py-1">
              <div className="h-4 w-3/4 sm:w-1/2 rounded-md bg-gray-200"></div>
              <div className="flex flex-wrap gap-2 pt-1">
                <div className="h-3 w-20 rounded-md bg-gray-100"></div>
                <div className="h-3 w-24 rounded-md bg-gray-100"></div>
                <div className="h-3 w-16 rounded-md bg-gray-100"></div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}

const FilterGroup = memo(function FilterGroup({ title, children, defaultOpen = false }: { title: string; children: ReactNode; defaultOpen?: boolean }) {
  // Use a ref to set the initial `open` state without rebinding the attribute on
  // every parent re-render — otherwise React reopens the panel that the user
  // just closed (very visible on mobile where filter changes re-render often).
  const detailsRef = useRef<HTMLDetailsElement | null>(null);
  useEffect(() => {
    if (detailsRef.current) detailsRef.current.open = defaultOpen;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <details ref={detailsRef} className="group rounded-2xl border border-gray-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm font-bold text-gray-900">
        <span>{title}</span>
        <span className="text-gray-400 transition group-open:rotate-180">▾</span>
      </summary>
      <div className="border-t border-gray-100 px-3 py-3">{children}</div>
    </details>
  );
});

const FilterChoice = memo(function FilterChoice({
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
});

function resolveHomeQuery(searchParams: { get: (name: string) => string | null }): HomeQuery {
  const pageValue = Number.parseInt(searchParams.get('page') || '1', 10);

  return {
    search: String(searchParams.get('search') || '').trim(),
    location: String(searchParams.get('location') || '').trim(),
    page: Number.isFinite(pageValue) && pageValue > 0 ? pageValue : 1,
  };
}

function HomePageContent({ initialJobsData, initialQuery }: HomePageContentProps) {
  const { t, localizePath, locale } = useLocale();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const isEn = locale === 'en';
  const [searchMode, setSearchMode] = useState<'emploi' | 'artisan'>('emploi');

  const roleSnapshot = useSyncExternalStore(
    subscribeToSessionStorage,
    () => getSessionStorageValue('bolo237-account-role'),
    () => undefined,
  );
  const isEnterprise = useMemo(() => roleSnapshot === 'entreprise', [roleSnapshot]);
  const [searchInput, setSearchInput] = useState(initialQuery.search);
  const [locationInput, setLocationInput] = useState(initialQuery.location);

  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 1. Initialiser les filtres avec les valeurs présentes dans l'URL
  const [filters, setFilters] = useState<HomeFilters>(() => {
    const initialState: HomeFilters = { ...DEFAULT_HOME_FILTERS };

    const assignFilterValue = <K extends keyof HomeFilters>(key: K) => {
      const val = searchParams.get(key);
      if (val) initialState[key] = val as HomeFilters[K];
    };

    (Object.keys(DEFAULT_HOME_FILTERS) as Array<keyof HomeFilters>).forEach((key) => {
      assignFilterValue(key);
    });

    return initialState;
  });

  const [isMobileFiltersOpen, setIsMobileFiltersOpen] = useState(false);

  // 2. Synchroniser l'URL silencieusement dès qu'un filtre change
  useEffect(() => {
    if (searchMode !== 'emploi') return;

    const params = new URLSearchParams(searchParams.toString());
    let hasChanges = false;

    Object.entries(filters).forEach(([key, value]) => {
      const defaultValue = DEFAULT_HOME_FILTERS[key as keyof HomeFilters];
      if (value !== defaultValue) {
        if (params.get(key) !== value) {
          params.set(key, value as string);
          hasChanges = true;
        }
      } else if (params.has(key)) {
        params.delete(key);
        hasChanges = true;
      }
    });

    if (hasChanges) {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
  }, [filters, pathname, router, searchParams, searchMode]);

  useEffect(() => {
    if (!isMobileFiltersOpen) {
      return undefined;
    }

    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = overflow;
    };
  }, [isMobileFiltersOpen]);

  const isBaseHomeQuery = initialQuery.page === DEFAULT_HOME_QUERY.page
    && !initialQuery.search
    && !initialQuery.location;

  const { data: fetchedJobsData, loading: jobsLoading } = useApi<JobsResponse | null>(
    () => {
      if (isBaseHomeQuery && initialJobsData) {
        return Promise.resolve(initialJobsData);
      }

      return fetchJobs({
        status: 'APPROVED',
        limit: HOME_JOBS_PER_PAGE,
        page: initialQuery.page,
        ...(initialQuery.search ? { search: initialQuery.search } : {}),
        ...(initialQuery.location ? { location: initialQuery.location } : {}),
      });
    },
    isBaseHomeQuery ? initialJobsData : null,
    [isBaseHomeQuery, initialQuery.search, initialQuery.location, initialQuery.page]
  );

  const jobsData = isBaseHomeQuery ? (initialJobsData ?? fetchedJobsData) : fetchedJobsData;
  const emplois: LocalJob[] = useMemo(
    () => jobsData?.jobs.map((job) => apiJobToLocal(job, isEn)) ?? [],
    [jobsData, isEn],
  );
  const totalActiveJobs = jobsData?.pagination.total ?? 0;
  const currentPage = jobsData?.pagination.page ?? initialQuery.page;
  const currentLimit = jobsData?.pagination.limit ?? HOME_JOBS_PER_PAGE;
  const realTotalPages = jobsData?.pagination.totalPages ?? 0;
  const totalPages = Math.min(realTotalPages, 5);
  const resultsStart = totalActiveJobs === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const resultsEnd = totalActiveJobs === 0 ? 0 : resultsStart + emplois.length - 1;
  const hasActiveSearch = Boolean(initialQuery.search || initialQuery.location);
  const showJobLoadingState = searchMode === 'emploi' && jobsLoading && !jobsData;

  const filteredEmplois = emplois
    .filter((job) => {
      if (filters.datePosted === '24h' && job.publishedHours > 24) return false;
      if (filters.datePosted === '7d' && job.publishedHours > 24 * 7) return false;
      if (filters.datePosted === '30d' && job.publishedHours > 24 * 30) return false;
      if (filters.remote !== 'all' && job.workMode !== filters.remote) return false;
      if (filters.salary === 'with-salary' && !job.salaire) return false;
      if (filters.applicationType !== 'all' && job.applicationType !== filters.applicationType) return false;
      if (filters.region !== 'all' && job.region !== filters.region) return false;
      if (filters.city !== 'all' && job.city !== filters.city) return false;
      if (filters.experience !== 'all' && job.experienceLevel !== filters.experience) return false;
      if (filters.contract !== 'all' && job.contractType !== filters.contract) return false;
      if (filters.workTime !== 'all' && job.workTime !== filters.workTime) return false;
      return true;
    })
    .sort((left, right) => {
      if (filters.sortBy === 'oldest') {
        return left.publishedHours - right.publishedHours;
      }

      return right.publishedHours - left.publishedHours;
    });

  const visibleJobs = searchMode === 'emploi' ? filteredEmplois : emplois;
  const hasPanelFiltersActive = JSON.stringify(filters) !== JSON.stringify(DEFAULT_HOME_FILTERS);
  const activeFilterCount = Object.entries(filters).filter(([key, value]) => {
    const defaultValue = DEFAULT_HOME_FILTERS[key as keyof HomeFilters];
    return value !== defaultValue;
  }).length;

  const countMatches = useCallback(
    (predicate: (job: LocalJob) => boolean) => emplois.filter(predicate).length,
    [emplois],
  );
  const uniqueRegions = Array.from(new Set(emplois.map((job) => job.region))).sort((left, right) => left.localeCompare(right));
  const uniqueCities = Array.from(new Set(emplois.map((job) => job.city))).sort((left, right) => left.localeCompare(right));

  const navigateToHome = (query: HomeQuery) => {
    const params = new URLSearchParams(searchParams.toString());

    // Mettre à jour la recherche, localisation et page, en gardant les filtres existants
    if (query.search) params.set('search', query.search);
    else params.delete('search');

    if (query.location) params.set('location', query.location);
    else params.delete('location');

    if (query.page > 1) params.set('page', String(query.page));
    else params.delete('page');

    const queryString = params.toString();
    const basePath = localizePath('/');
    const nextUrl = queryString ? `${basePath}?${queryString}` : basePath;

    startTransition(() => {
      router.push(nextUrl, { scroll: true });
    });
  };

  const submitSearch = () => {
    const nextSearch = searchInput.trim();
    const nextLocation = locationInput.trim();

    if (searchMode === 'artisan') {
      const params = new URLSearchParams();

      if (nextSearch) {
        params.set('search', nextSearch);
      }

      if (nextLocation) {
        params.set('location', nextLocation);
      }

      const queryString = params.toString();
      const targetPath = localizePath('/petits-boulots');
      const nextUrl = queryString ? `${targetPath}?${queryString}` : targetPath;

      startTransition(() => {
        router.push(nextUrl);
      });
      return;
    }

    navigateToHome({
      search: nextSearch,
      location: nextLocation,
      page: 1,
    });
  };

  const resetSearch = () => {
    setSearchInput('');
    setLocationInput('');
    navigateToHome({ search: '', location: '', page: 1 });
  };

  const resetFilters = () => {
    setFilters(DEFAULT_HOME_FILTERS);
  };

  const goToPage = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages || nextPage === currentPage) {
      return;
    }

    navigateToHome({
      search: initialQuery.search,
      location: initialQuery.location,
      page: nextPage,
    });
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      submitSearch();
    }
  };

  return (
    <div className="w-full font-sans bg-white text-black min-h-screen flex flex-col">
      <Header />

      {isEnterprise && (
        <div className="bg-green-700 text-white px-4 py-3">
          <div className="max-w-[1400px] mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
            <div className="flex-1">
              <p className="text-sm font-bold">
                {isEn ? 'You are logged in as a recruiter.' : 'Vous êtes connecté en tant que recruteur.'}
              </p>
              <p className="text-xs text-green-200 mt-0.5">
                {isEn
                  ? 'Use your dashboard to post jobs, manage applications, and browse candidate CVs.'
                  : 'Utilisez votre tableau de bord pour publier des offres, gérer les candidatures et explorer les CVs.'}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 shrink-0">
              <Link
                href={localizePath('/dashboard-entreprise')}
                className="inline-flex items-center gap-1.5 bg-white text-green-800 font-bold text-xs px-4 py-2 rounded-lg hover:bg-green-50 transition"
              >
                {isEn ? 'My dashboard' : 'Mon tableau de bord'}
              </Link>
              <Link
                href={localizePath('/cvtheque')}
                className="inline-flex items-center gap-1.5 bg-green-600 border border-green-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-green-500 transition"
              >
                {isEn ? 'Browse CVs' : 'CVthèque'}
              </Link>
            </div>
          </div>
        </div>
      )}

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5EF] via-white to-[#FEEBD6]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #DA7756 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <div className="relative max-w-[1400px] mx-auto px-4 pt-16 pb-20">
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <span className="w-2 h-2 bg-[#DA7756] rounded-full animate-pulse"></span>
              {isEn ? 'The #1 job platform in Cameroon' : 'La plateforme #1 de l\'emploi au Cameroun'}
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-center leading-tight mb-6 tracking-tight">
            {t.home.find}{' '}
            <span className="relative inline-block">
              <span className="relative z-10 text-[#DA7756]">
                {searchMode === 'emploi' ? t.home.matchingJob : t.home.matchingArtisan}
              </span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-[#FEEBD6]/60 -z-0 rounded-sm"></span>
            </span>
            {' '}{t.home.forYou}
          </h1>

          <p className="text-center text-gray-500 text-lg font-medium max-w-2xl mx-auto mb-10">
            {isEn
              ? 'Browse verified job offers and trusted artisan services across all regions of Cameroon.'
              : 'Parcourez des offres vérifiées et des services d’artisans fiables dans toutes les régions du Cameroun.'}
          </p>

          <div className="flex justify-center mb-8">
            <div className="bg-white border border-gray-200 p-1.5 rounded-full inline-flex shadow-lg shadow-[#FEEBD6]/50">
              <button
                onClick={() => setSearchMode('emploi')}
                className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold transition-all duration-200 ${searchMode === 'emploi' ? 'bg-[#DA7756] text-white shadow-md shadow-[#FEEBD6]' : 'text-gray-500 hover:text-black'}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                {t.home.searchJob}
              </button>
              <button
                onClick={() => {
                  setSearchMode('artisan');
                  setIsMobileFiltersOpen(false);
                }}
                className={`inline-flex items-center gap-2 px-7 py-3 rounded-full text-sm font-bold transition-all duration-200 ${searchMode === 'artisan' ? 'bg-[#DA7756] text-white shadow-md shadow-[#FEEBD6]' : 'text-gray-500 hover:text-black'}`}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
                {t.home.findArtisan}
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                </span>
                <input
                  type="text"
                  placeholder={searchMode === 'emploi' ? t.home.searchPlaceholderJob : t.home.searchPlaceholderArtisan}
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-[#DA7756] focus:bg-white outline-none text-[15px] font-medium text-black transition"
                />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                </span>
                <input
                  type="text"
                  placeholder={t.home.locationPlaceholder}
                  value={locationInput}
                  onChange={(event) => setLocationInput(event.target.value)}
                  onKeyDown={handleInputKeyDown}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-[#DA7756] focus:bg-white outline-none text-[15px] font-medium text-black transition"
                />
              </div>
              <button
                onClick={submitSearch}
                disabled={isPending}
                className="bg-[#DA7756] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#C4623F] transition text-[15px] shadow-md hover:shadow-lg whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isPending
                  ? (isEn ? 'Loading...' : 'Chargement...')
                  : searchMode === 'emploi'
                    ? t.home.submitJob
                    : t.home.submitArtisan}
              </button>
            </div>
          </div>
        </div>
      </section>

      {searchMode === 'emploi' ? (
        <button
          type="button"
          aria-label={isEn ? 'Close filters panel' : 'Fermer le panneau des filtres'}
          aria-hidden={!isMobileFiltersOpen}
          tabIndex={isMobileFiltersOpen ? 0 : -1}
          disabled={!isMobileFiltersOpen}
          onClick={() => setIsMobileFiltersOpen(false)}
          className={`fixed inset-0 z-40 bg-black/35 backdrop-blur-[2px] transition-opacity duration-300 ease-out lg:hidden ${isMobileFiltersOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        />
      ) : null}

      <div className="max-w-[1400px] w-full mx-auto px-4 flex flex-col lg:flex-row gap-8 flex-grow mb-16 mt-10">
        <aside className={`w-full lg:basis-[28%] lg:max-w-none shrink-0 space-y-4 h-fit lg:sticky lg:top-24 ${searchMode === 'emploi' ? `fixed inset-x-4 top-24 bottom-4 z-50 overflow-y-auto overscroll-contain transition-all duration-300 ease-out motion-reduce:transition-none lg:static lg:inset-auto lg:z-auto lg:block lg:overflow-visible ${isMobileFiltersOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0 lg:pointer-events-auto lg:translate-y-0 lg:opacity-100'}` : 'hidden lg:block'}`}>
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white font-bold text-black text-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 bg-[#FEEBD6] rounded flex items-center justify-center text-[#C4623F]">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
                </span>
                {isEn ? 'Filter listings' : 'Filtrer annonces'}
              </div>
              <button
                onClick={() => setIsMobileFiltersOpen(false)}
                className="lg:hidden w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-black transition"
                type="button"
              >
                ✕
              </button>
            </div>

            {searchMode === 'emploi' && (
              <div className="p-4 space-y-3 bg-[#FCFCFD]">
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
                    <FilterChoice label={isEn ? 'Any time' : 'Toutes'} active={filters.datePosted === 'all'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'Last 24 hours' : 'Moins de 24h'} active={filters.datePosted === '24h'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '24h' }))} count={countMatches((job) => job.publishedHours <= 24)} />
                    <FilterChoice label={isEn ? 'Last 7 days' : 'Moins de 7 jours'} active={filters.datePosted === '7d'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '7d' }))} count={countMatches((job) => job.publishedHours <= 24 * 7)} />
                    <FilterChoice label={isEn ? 'Last 30 days' : 'Moins de 30 jours'} active={filters.datePosted === '30d'} onClick={() => setFilters((prev) => ({ ...prev, datePosted: '30d' }))} count={countMatches((job) => job.publishedHours <= 24 * 30)} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Work mode' : 'Mode de travail'} defaultOpen>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All modes' : 'Tous les modes'} active={filters.remote === 'all'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'On-site' : 'Sur site'} active={filters.remote === 'onsite'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'onsite' }))} count={countMatches((job) => job.workMode === 'onsite')} />
                    <FilterChoice label={isEn ? 'Hybrid' : 'Hybride'} active={filters.remote === 'partial'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'partial' }))} count={countMatches((job) => job.workMode === 'partial')} />
                    <FilterChoice label={isEn ? 'Remote' : 'Télétravail'} active={filters.remote === 'remote'} onClick={() => setFilters((prev) => ({ ...prev, remote: 'remote' }))} count={countMatches((job) => job.workMode === 'remote')} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Application type' : 'Type de candidature'} defaultOpen>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All types' : 'Toutes'} active={filters.applicationType === 'all'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'Apply on Bolo237' : 'Postuler sur Bolo237'} active={filters.applicationType === 'bolo237'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'bolo237' }))} count={countMatches((job) => job.applicationType === 'bolo237')} />
                    <FilterChoice label={isEn ? 'External company link' : 'Lien entreprise externe'} active={filters.applicationType === 'external'} onClick={() => setFilters((prev) => ({ ...prev, applicationType: 'external' }))} count={countMatches((job) => job.applicationType === 'external')} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Salary' : 'Salaire'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All offers' : 'Toutes les offres'} active={filters.salary === 'all'} onClick={() => setFilters((prev) => ({ ...prev, salary: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'Salary displayed' : 'Salaire affiché'} active={filters.salary === 'with-salary'} onClick={() => setFilters((prev) => ({ ...prev, salary: 'with-salary' }))} count={countMatches((job) => Boolean(job.salaire))} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Region' : 'Région'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All regions' : 'Toutes les régions'} active={filters.region === 'all'} onClick={() => setFilters((prev) => ({ ...prev, region: 'all' }))} count={emplois.length} />
                    {uniqueRegions.map((region) => (
                      <FilterChoice key={region} label={region} active={filters.region === region} onClick={() => setFilters((prev) => ({ ...prev, region }))} count={countMatches((job) => job.region === region)} />
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'City' : 'Ville'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All cities' : 'Toutes les villes'} active={filters.city === 'all'} onClick={() => setFilters((prev) => ({ ...prev, city: 'all' }))} count={emplois.length} />
                    {uniqueCities.map((city) => (
                      <FilterChoice key={city} label={city} active={filters.city === city} onClick={() => setFilters((prev) => ({ ...prev, city }))} count={countMatches((job) => job.city === city)} />
                    ))}
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Experience level' : 'Niveau d\'expérience'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All levels' : 'Tous les niveaux'} active={filters.experience === 'all'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'Junior' : 'Junior'} active={filters.experience === 'junior'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'junior' }))} count={countMatches((job) => job.experienceLevel === 'junior')} />
                    <FilterChoice label={isEn ? 'Confirmed' : 'Confirmé'} active={filters.experience === 'confirmed'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'confirmed' }))} count={countMatches((job) => job.experienceLevel === 'confirmed')} />
                    <FilterChoice label={isEn ? 'Senior' : 'Senior'} active={filters.experience === 'senior'} onClick={() => setFilters((prev) => ({ ...prev, experience: 'senior' }))} count={countMatches((job) => job.experienceLevel === 'senior')} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Contract type' : 'Type de contrat'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All contracts' : 'Tous les contrats'} active={filters.contract === 'all'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'all' }))} count={emplois.length} />
                    <FilterChoice label="CDI" active={filters.contract === 'cdi'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'cdi' }))} count={countMatches((job) => job.contractType === 'cdi')} />
                    <FilterChoice label="CDD" active={filters.contract === 'cdd'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'cdd' }))} count={countMatches((job) => job.contractType === 'cdd')} />
                    <FilterChoice label={isEn ? 'Internship' : 'Stage'} active={filters.contract === 'stage'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'stage' }))} count={countMatches((job) => job.contractType === 'stage')} />
                    <FilterChoice label="Freelance" active={filters.contract === 'freelance'} onClick={() => setFilters((prev) => ({ ...prev, contract: 'freelance' }))} count={countMatches((job) => job.contractType === 'freelance')} />
                  </div>
                </FilterGroup>

                <FilterGroup title={isEn ? 'Working time' : 'Temps de travail'}>
                  <div className="space-y-2">
                    <FilterChoice label={isEn ? 'All working times' : 'Tous'} active={filters.workTime === 'all'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'all' }))} count={emplois.length} />
                    <FilterChoice label={isEn ? 'Full-time' : 'Temps plein'} active={filters.workTime === 'full'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'full' }))} count={countMatches((job) => job.workTime === 'full')} />
                    <FilterChoice label={isEn ? 'Part-time' : 'Temps partiel'} active={filters.workTime === 'part'} onClick={() => setFilters((prev) => ({ ...prev, workTime: 'part' }))} count={countMatches((job) => job.workTime === 'part')} />
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
                        disabled={isPending}
                        className="text-xs font-bold text-[#C4623F] hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                        type="button"
                      >
                        {isEn ? 'Reset search' : 'Effacer'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {initialQuery.search ? <span className="rounded-full border border-[#F2D8C8] bg-white px-3 py-1 text-xs font-bold text-[#A8502F]">{initialQuery.search}</span> : null}
                      {initialQuery.location ? <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-bold text-gray-600">{initialQuery.location}</span> : null}
                    </div>
                  </div>
                ) : null}

                <button
                  onClick={() => setIsMobileFiltersOpen(false)}
                  className="lg:hidden w-full mt-4 bg-black text-white font-bold py-3 rounded-xl transition hover:bg-gray-800"
                  type="button"
                >
                  {isEn ? 'Show results' : `Voir les résultats (${visibleJobs.length})`}
                </button>
              </div>
            )}

            {searchMode === 'artisan' && (
              <div className="p-4">
                <div className="rounded-2xl border border-dashed border-[#F2D8C8] bg-[#FFF8F3] px-4 py-5 text-sm text-gray-500 font-medium leading-relaxed">
                  <p className="font-bold text-black">
                    {isEn ? 'Browse artisans on the dedicated page' : 'Parcourez les artisans sur la page dédiée'}
                  </p>
                  <p className="mt-2">
                    {isEn
                      ? 'The services catalog lives on a dedicated route so the homepage can stay focused on verified job offers.'
                      : 'Le catalogue services vit sur une page dédiée pour garder la home centrée sur les offres d’emploi vérifiées.'}
                  </p>
                  <Link href={localizePath('/petits-boulots')} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#DA7756] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#C4623F] transition">
                    {isEn ? 'Open services page' : 'Ouvrir la page services'}
                    <span>→</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section className="w-full lg:basis-[72%]">
          <div className="flex justify-between items-start sm:items-center mb-6 flex-col sm:flex-row gap-4">
            {searchMode === 'emploi' && visibleJobs.length > 0 ? (
              <h2 className="text-[15px] text-gray-600 font-medium">
                {hasPanelFiltersActive ? (
                  <>
                    <span className="font-extrabold text-gray-900">{visibleJobs.length}</span>{' '}
                    {isEn ? 'filtered offers' : 'annonces filtrées'}
                  </>
                ) : (
                  <>
                    <span className="font-extrabold text-gray-900">{resultsStart}-{resultsEnd}</span>{' '}
                    {isEn ? 'recent offers (Top 50)' : 'offres récentes (Top 50)'}
                  </>
                )}
              </h2>
            ) : (
              <h2 className="text-[15px] text-gray-600 font-medium">
                {showJobLoadingState
                  ? (isEn ? 'Loading verified offers' : 'Chargement des offres vérifiées')
                  : searchMode === 'emploi'
                  ? hasPanelFiltersActive || hasActiveSearch
                    ? (isEn ? 'No verified offers match the current filters' : 'Aucune offre vérifiée ne correspond aux filtres actuels')
                    : (isEn ? 'Verified openings' : 'Offres vérifiées')
                  : (isEn ? 'Artisan profiles' : 'Profils artisans')}
              </h2>
            )}

            {searchMode === 'emploi' && !isMobileFiltersOpen && (
              <button
                onClick={() => setIsMobileFiltersOpen(true)}
                className="lg:hidden flex items-center gap-2 bg-white border border-gray-200 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 shadow-sm"
                type="button"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
                {isEn ? 'Filters' : 'Filtres'} {activeFilterCount > 0 && <span className="bg-[#DA7756] text-white px-1.5 rounded-full text-xs">{activeFilterCount}</span>}
              </button>
            )}
          </div>

          {searchMode === 'emploi' && visibleJobs.length > 0 && (
            <div className="space-y-3">
              {visibleJobs.map((job) => (
                <Link key={job.id} href={localizePath(`/annonce/${job.id}`)} className="block group">
                  <article className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-[#DA7756] hover:shadow-lg hover:shadow-[#FFF5EF] transition-all duration-200">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg border border-gray-100 overflow-hidden flex-shrink-0 bg-white p-1.5 flex items-center justify-center shadow-sm">
                        {job.authorPhoto ? (
                          <Image
                            src={job.authorPhoto}
                            alt={job.entreprise}
                            width={56}
                            height={56}
                                                        placeholder="blur"
                                                        blurDataURL={BLUR_DATA_URL_STATIC}
                            sizes="(max-width: 640px) 48px, 56px"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <span className="text-xl font-bold text-gray-300">{(job.entreprise || 'B').charAt(0)}</span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-bold text-black group-hover:text-[#C4623F] transition truncate">
                            {job.titre}
                          </h3>
                          {job.authorVerified ? (
                            <VerifiedBadge
                              size={16}
                              title={isEn ? 'Verified profile' : 'Profil vérifié'}
                            />
                          ) : null}
                        </div>

                        <div className="text-sm text-gray-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="font-bold text-gray-900">{job.entreprise}</span>
                          <span className="text-gray-300">•</span>
                          <span>{job.lieu}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-400">{job.temps}</span>
                        </div>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {showJobLoadingState && <LoadingJobCards />}

          {searchMode === 'emploi' && totalPages > 1 && visibleJobs.length > 0 && !hasPanelFiltersActive && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-500">
                  {isEn
                    ? `Page ${currentPage} of ${totalPages}.`
                    : `Page ${currentPage} sur ${totalPages}.`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isPending}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#DA7756] hover:text-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEn ? 'Previous' : 'Précédent'}
                  </button>

                  {currentPage < totalPages ? (
                    <button
                      onClick={() => goToPage(currentPage + 1)}
                      disabled={isPending}
                      className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#DA7756] hover:text-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isEn ? 'Next' : 'Suivant'}
                    </button>
                  ) : (
                    <Link href={localizePath('/emplois')} className="rounded-xl border border-[#DA7756] text-[#C4623F] px-4 py-2 text-sm font-bold hover:bg-[#FFF5EF] transition">
                      {isEn ? 'See more offers' : 'Voir plus d\'offres'}
                    </Link>
                  )}

                  <Link href={localizePath('/emplois')} className="hidden sm:block rounded-xl bg-[#FFF5EF] px-4 py-2 text-sm font-bold text-[#C4623F] hover:bg-[#FEEBD6] transition">
                    {isEn ? 'Open full catalog' : 'Catalogue complet'}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {searchMode === 'emploi' && visibleJobs.length === 0 && !showJobLoadingState && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-8 text-center shadow-sm flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-[#FFF5EF] rounded-2xl flex items-center justify-center text-4xl mb-6">📋</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {hasPanelFiltersActive || hasActiveSearch
                  ? (isEn ? 'No verified offer matches these filters' : 'Aucune offre vérifiée ne correspond à ces filtres')
                  : (isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment')}
              </h4>
              <p className="text-gray-600 font-medium text-center max-w-md">
                {hasPanelFiltersActive || hasActiveSearch
                  ? (isEn
                      ? 'Try broader filters or reset them to see the latest verified listings.'
                      : 'Essayez des filtres plus larges ou réinitialisez-les pour revoir les dernières offres vérifiées.')
                  : (isEn
                      ? 'New job listings will appear here as they are published and approved by our team.'
                      : 'Les nouvelles offres apparaîtront ici au fur et à mesure de leur publication et validation par notre équipe.')}
              </p>

              {hasPanelFiltersActive || hasActiveSearch ? (
                <button
                  onClick={() => {
                    resetFilters();
                    if (hasActiveSearch) {
                      resetSearch();
                    }
                  }}
                  disabled={isPending}
                  className="mt-6 rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white hover:bg-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-70"
                  type="button"
                >
                  {isEn ? 'Reset filters' : 'Réinitialiser les filtres'}
                </button>
              ) : (
                <Link href={localizePath('/connexion')} className="mt-6 bg-[#DA7756] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#C4623F] transition text-sm">
                  {isEn ? 'Create an account to get notified' : 'Créer un compte pour être notifié'}
                </Link>
              )}
            </div>
          )}

          {searchMode === 'artisan' && (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-8 text-center shadow-sm flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6">🛠️</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {isEn ? 'Browse artisans on the dedicated page' : 'Parcourez les artisans sur la page dédiée'}
              </h4>
              <p className="text-gray-600 font-medium text-center max-w-md">
                {isEn
                  ? 'Use the services page to browse artisans and local gigs with the dedicated experience.'
                  : 'Utilisez la page services pour parcourir les artisans et les petits boulots avec l’expérience dédiée.'}
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Link href={localizePath('/petits-boulots')} className="rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white hover:bg-[#C4623F] transition text-center">
                  {isEn ? 'Open services page' : 'Ouvrir la page services'}
                </Link>
                <Link href={localizePath('/connexion')} className="rounded-xl border border-gray-200 px-6 py-3 text-sm font-bold text-gray-700 hover:border-[#DA7756] hover:text-[#C4623F] transition text-center">
                  {isEn ? 'Register as an artisan' : 'S\'inscrire comme artisan'}
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      <section className="py-20 bg-[#FFF5EF] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #DA7756 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
        <div className="relative max-w-[1400px] mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4">
              {isEn ? 'SIMPLE & FAST' : 'SIMPLE & RAPIDE'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {isEn ? 'How does it work?' : 'Comment ça marche ?'}
            </h2>
            <p className="text-gray-500 font-medium max-w-xl mx-auto">
              {isEn
                ? '3 simple steps to find your next opportunity or the right professional.'
                : '3 étapes simples pour trouver votre prochaine opportunité ou le bon professionnel.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: '01',
                icon: '📝',
                title: isEn ? 'Create your free account' : 'Créez votre compte gratuit',
                desc: isEn
                  ? 'In 2 minutes, sign up and choose your profile: candidate, employer, or artisan.'
                  : 'En 2 minutes, inscrivez-vous et choisissez votre profil : candidat, entreprise ou artisan.',
              },
              {
                step: '02',
                icon: '✨',
                title: isEn ? 'Complete your profile' : 'Complétez votre profil',
                desc: isEn
                  ? 'Add your skills, CV, or services. Our Identity Shield verification certifies your identity.'
                  : 'Ajoutez vos compétences, votre CV ou vos services. Notre système de vérification Identity Shield certifie votre identité.',
              },
              {
                step: '03',
                icon: '🤝',
                title: isEn ? 'Connect directly' : 'Connectez-vous directement',
                desc: isEn
                  ? 'Apply to jobs or contact artisans via WhatsApp. No middleman, no commission.'
                  : 'Postulez aux offres ou contactez les artisans via WhatsApp. Pas d\'intermédiaire, pas de commission.',
              },
            ].map((item, index) => (
              <div key={item.step} className="relative">
                {index < 2 && (
                  <div className="hidden md:block absolute top-14 left-[60%] w-[80%] border-t-2 border-dashed border-[#DA7756]/20"></div>
                )}
                <div className="bg-white rounded-2xl p-8 shadow-sm border border-[#FEEBD6] hover:shadow-xl hover:shadow-[#FEEBD6]/50 transition-all duration-300 text-center relative z-10">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#DA7756] to-[#C4623F] rounded-2xl flex items-center justify-center text-3xl mx-auto mb-5 shadow-lg shadow-[#DA7756]/20">
                    {item.icon}
                  </div>
                  <span className="text-xs font-extrabold text-[#DA7756] tracking-widest">{isEn ? 'STEP' : 'ÉTAPE'} {item.step}</span>
                  <h3 className="font-bold text-lg text-black mt-2 mb-3">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 bg-white border-y border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              {
                value: '10+',
                label: isEn ? 'Regions covered' : 'Régions couvertes',
                icon: '🌍',
                bg: 'bg-blue-50',
                iconBg: 'bg-blue-100',
              },
              {
                value: 'Identity Shield',
                label: isEn ? 'Identity verification' : "Vérification d'identité",
                icon: '🛡️',
                bg: 'bg-[#FFF5EF]',
                iconBg: 'bg-[#FEEBD6]',
              },
              {
                value: '100%',
                label: isEn ? 'Free' : 'Gratuit',
                icon: '🆓',
                bg: 'bg-green-50',
                iconBg: 'bg-green-100',
              },
              {
                value: '24/7',
                label: isEn ? 'WhatsApp support' : 'Support WhatsApp',
                icon: '💬',
                bg: 'bg-emerald-50',
                iconBg: 'bg-emerald-100',
              },
            ].map((item) => (
              <div key={item.label} className={`${item.bg} rounded-2xl p-6 text-center hover:scale-105 transition-transform duration-300`}>
                <div className={`w-12 h-12 ${item.iconBg} rounded-xl flex items-center justify-center text-2xl mx-auto mb-3`}>
                  {item.icon}
                </div>
                <div className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-1">{item.value}</div>
                <p className="text-sm font-medium text-gray-500">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4">
              {isEn ? 'FOR EVERYONE' : 'POUR TOUS'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {isEn ? 'Who is Bolo237 for?' : 'Pour qui est Bolo237 ?'}
            </h2>
            <p className="text-gray-500 font-medium max-w-xl mx-auto">
              {isEn
                ? 'Whether you are looking for a job, recruiting, or offering services, Bolo237 is for you.'
                : 'Que vous cherchiez un emploi, recrutiez ou offriez vos services, Bolo237 est fait pour vous.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>),
                emoji: isEn ? 'Apply in one click' : 'Postulez en un clic',
                bg: 'from-[#DA7756] to-[#C4623F]',
                title: isEn ? 'Candidates' : 'Candidats',
                desc: isEn
                  ? 'Looking for a job? Create your profile, upload your CV and apply in one click. Get personalized alerts.'
                  : 'Vous cherchez un emploi ? Créez votre profil, ajoutez votre CV et postulez en un clic. Recevez des alertes personnalisées.',
                cta: isEn ? 'Find a job' : 'Trouver un emploi',
                href: '/connexion',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>),
                emoji: isEn ? 'Post for free' : 'Publiez gratuitement',
                bg: 'from-blue-600 to-blue-700',
                title: isEn ? 'Employers' : 'Entreprises',
                desc: isEn
                  ? 'Hiring? Post your jobs for free and access a base of verified talents across Cameroon.'
                  : 'Vous recrutez ? Publiez vos offres gratuitement et accédez à une base de talents vérifiés dans tout le Cameroun.',
                cta: isEn ? 'Post a job' : 'Publier une offre',
                href: '/publier',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>),
                emoji: isEn ? 'Grow your clientele' : 'Développez votre clientèle',
                bg: 'from-amber-500 to-amber-600',
                title: isEn ? 'Artisans' : 'Artisans',
                desc: isEn
                  ? 'Are you an artisan? Showcase your skills, receive direct requests and grow your clientele.'
                  : 'Vous êtes artisan ? Montrez votre savoir-faire, recevez des demandes directes et développez votre clientèle.',
                cta: isEn ? 'Create my profile' : 'Créer mon profil',
                href: '/connexion',
              },
            ].map((card) => (
              <div key={card.title} className="group relative bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-2xl hover:shadow-gray-200/60 transition-all duration-300">
                <div className={`h-2 bg-gradient-to-r ${card.bg}`}></div>
                <div className="p-8">
                  <div className="flex items-center gap-3 mb-5">
                    <div className={`w-14 h-14 bg-gradient-to-br ${card.bg} rounded-2xl flex items-center justify-center text-2xl text-white shadow-lg`}>
                      {card.icon}
                    </div>
                    <div>
                      <h3 className="font-bold text-xl text-black">{card.title}</h3>
                      <span className="text-xs text-gray-400 font-medium">{card.emoji}</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm leading-relaxed font-medium mb-6">{card.desc}</p>
                  <Link
                    href={localizePath(card.href)}
                    className={`inline-flex items-center gap-2 bg-gradient-to-r ${card.bg} text-white px-6 py-3 rounded-xl font-bold text-sm hover:opacity-90 transition shadow-md`}
                  >
                    {card.cta}
                    <span className="group-hover:translate-x-1 transition-transform">→</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-[#FFF5EF] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#FEEBD6] rounded-full opacity-30 blur-3xl -translate-y-1/2 translate-x-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#DA7756] rounded-full opacity-10 blur-3xl translate-y-1/2 -translate-x-1/2"></div>
        <div className="relative max-w-[1400px] mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4">
              {isEn ? 'TESTIMONIALS' : 'TÉMOIGNAGES'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {isEn ? 'They trust Bolo237' : 'Ils font confiance à Bolo237'}
            </h2>
            <p className="text-gray-500 font-medium max-w-xl mx-auto">
              {isEn
                ? 'Discover the stories of those who found their opportunity on our platform.'
                : 'Découvrez les histoires de ceux qui ont trouvé leur opportunité sur notre plateforme.'}
            </p>
          </div>

          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-20 h-20 bg-[#FEEBD6] rounded-full flex items-center justify-center text-[#C4623F] mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>
            </div>
            <p className="text-gray-500 font-medium text-center max-w-md">
              {isEn
                ? 'Our first verified testimonials will be published here. Create an account to become one of the first visible profiles on Bolo237.'
                : 'Nos premiers témoignages vérifiés seront publiés ici. Créez votre compte pour faire partie des premiers profils visibles sur Bolo237.'}
            </p>
            <Link href={localizePath('/connexion')} className="mt-6 inline-flex items-center gap-2 bg-[#DA7756] text-white px-6 py-3 rounded-full font-bold text-sm hover:bg-[#C4623F] transition">
              {isEn ? 'Create my account' : 'Créer mon compte'}
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-gray-50 py-20 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="text-center mb-14">
            <span className="inline-block bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-4">
              {isEn ? 'OUR ADVANTAGES' : 'NOS AVANTAGES'}
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-3">
              {isEn ? 'Why choose' : 'Pourquoi choisir'}{' '}
              <span className="text-[#DA7756]">Bolo237</span> ?
            </h2>
            <p className="text-center text-gray-500 font-medium mb-0 max-w-xl mx-auto">
              {isEn
                ? 'A platform built by Cameroonians, for Cameroonians.'
                : 'Une plateforme créée par des Camerounais, pour les Camerounais.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>), bg: 'bg-[#FEEBD6]', color: 'text-[#C4623F]',
                title: isEn ? 'Anti-fraud protection' : 'Protection anti-fraude',
                desc: isEn
                  ? 'Every listing is moderated. Suspicious profiles are automatically flagged and hidden.'
                  : 'Chaque annonce est modérée. Les profils suspects sont automatiquement signalés et masqués.',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>), bg: 'bg-blue-100', color: 'text-blue-600',
                title: isEn ? 'All 10 regions' : 'Les 10 régions',
                desc: isEn
                  ? 'Find opportunities near you — Douala, Yaoundé, Bafoussam, Bamenda, and beyond.'
                  : 'Trouvez des opportunités près de chez vous — Douala, Yaoundé, Bafoussam, Bamenda et au-delà.',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>), bg: 'bg-amber-100', color: 'text-amber-600',
                title: isEn ? 'Jobs + Artisans' : 'Emplois + Artisans',
                desc: isEn
                  ? 'The only platform combining formal job offers and skilled artisan services in one place.'
                  : 'La seule plateforme combinant offres d\'emploi formelles et services d\'artisans qualifiés.',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>), bg: 'bg-emerald-100', color: 'text-emerald-600',
                title: isEn ? 'WhatsApp integrated' : 'WhatsApp intégré',
                desc: isEn
                  ? 'Chat directly with recruiters or artisans via WhatsApp. Fast, familiar, effective.'
                  : 'Échangez directement avec les recruteurs ou artisans via WhatsApp. Rapide, familier, efficace.',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>), bg: 'bg-purple-100', color: 'text-purple-600',
                title: isEn ? 'Mobile-first' : 'Pensé pour le mobile',
                desc: isEn
                  ? 'Designed for Cameroon, our app works even on low-bandwidth networks. Install it on your phone like a native app.'
                  : 'Conçue pour le Cameroun, notre app fonctionne même sur les réseaux à faible débit. Installez-la sur votre téléphone comme une application native.',
              },
              {
                icon: (<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>), bg: 'bg-green-100', color: 'text-green-600',
                title: isEn ? '100% Free' : '100% Gratuit',
                desc: isEn
                  ? 'Registration, job posting, applications: everything is free. No hidden fees, no commission.'
                  : 'Inscription, publication d\'offres, candidatures : tout est gratuit. Pas de frais cachés, pas de commission.',
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl hover:shadow-gray-100/80 transition-all duration-300 group">
                <div className={`w-14 h-14 ${card.bg} ${card.color} rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <h3 className="font-bold text-lg text-black mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-br from-[#DA7756] to-[#C4623F] py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full opacity-5 blur-3xl -translate-y-1/2 -translate-x-1/2"></div>
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full opacity-5 blur-3xl translate-y-1/2 translate-x-1/2"></div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <span className="inline-block bg-white/20 text-white px-4 py-1.5 rounded-full text-xs font-bold tracking-wide mb-6 backdrop-blur-sm">
            {isEn ? 'GET STARTED TODAY' : 'COMMENCEZ AUJOURD\'HUI'}
          </span>
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-5 tracking-tight leading-tight">
            {isEn
              ? 'Join the talents building tomorrow\'s Cameroon'
              : 'Rejoignez les talents qui construisent le Cameroun de demain'}
          </h2>
          <p className="text-[#FEEBD6] font-medium text-lg mb-10 max-w-xl mx-auto">
            {isEn
              ? '10 regions. Verified opportunities. One platform.'
              : '10 régions. Des opportunités vérifiées. Une seule plateforme.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={localizePath('/connexion')} className="bg-white text-[#C4623F] px-10 py-4 rounded-xl font-bold text-[15px] hover:bg-[#FFF5EF] transition shadow-lg hover:shadow-xl hover:scale-105 transform duration-200">
              {isEn ? 'Create my free account' : 'Créer mon compte gratuit'}
            </Link>
            <Link href={localizePath('/publier')} className="border-2 border-white text-white px-10 py-4 rounded-xl font-bold text-[15px] hover:bg-white/10 transition hover:scale-105 transform duration-200">
              {isEn ? 'Post a listing' : 'Publier une annonce'}
            </Link>
          </div>
          <p className="text-white/60 text-xs font-medium mt-6">
            {isEn ? 'Free registration. No credit card required.' : 'Inscription gratuite. Aucune carte bancaire requise.'}
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function HomePageSearchController({ initialJobsData }: HomePageClientProps) {
  const searchParams = useSearchParams();
  const initialQuery = resolveHomeQuery(searchParams);

  return (
    <HomePageContent
      key={`${initialQuery.search}:${initialQuery.location}:${initialQuery.page}`}
      initialJobsData={initialJobsData}
      initialQuery={initialQuery}
    />
  );
}

export default function HomePageClient({ initialJobsData }: HomePageClientProps) {
  return (
    <Suspense fallback={<HomePageContent initialJobsData={initialJobsData} initialQuery={DEFAULT_HOME_QUERY} />}>
      <HomePageSearchController initialJobsData={initialJobsData} />
    </Suspense>
  );
}