"use client";

import { Suspense, useState, useTransition, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, type ApiJob, type JobsResponse } from '@/lib/api';
import { useApi } from '@/lib/useApi';

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
  publishedHours: number;
  temps: string;
};

function timeAgo(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return isEn ? 'just now' : "à l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `il y a ${days}j`;
}

function apiJobToLocal(job: ApiJob, isEn: boolean) {
  const hours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));
  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    lieu: job.location,
    publishedHours: hours,
    temps: timeAgo(job.createdAt, isEn),
  };
}

function buildHomeQueryString(query: HomeQuery) {
  const params = new URLSearchParams();

  if (query.search) {
    params.set('search', query.search);
  }

  if (query.location) {
    params.set('location', query.location);
  }

  if (query.page > 1) {
    params.set('page', String(query.page));
  }

  return params.toString();
}

function buildLocalizedHomeUrl(localizePath: (path: string) => string, query: HomeQuery) {
  const basePath = localizePath('/');
  const queryString = buildHomeQueryString(query);
  return queryString ? `${basePath}?${queryString}` : basePath;
}

function LoadingJobCards() {
  return (
    <div className="space-y-3" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div
          key={index}
          className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm animate-pulse"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="h-5 w-2/3 rounded bg-gray-200"></div>
              <div className="h-4 w-5/6 rounded bg-gray-100"></div>
              <div className="h-4 w-2/5 rounded bg-gray-100"></div>
            </div>
            <div className="h-4 w-14 rounded bg-gray-100"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [searchInput, setSearchInput] = useState(initialQuery.search);
  const [locationInput, setLocationInput] = useState(initialQuery.location);

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
  const emplois: LocalJob[] = jobsData?.jobs.map((job) => apiJobToLocal(job, isEn)) ?? [];
  const totalActiveJobs = jobsData?.pagination.total ?? 0;
  const currentPage = jobsData?.pagination.page ?? initialQuery.page;
  const currentLimit = jobsData?.pagination.limit ?? HOME_JOBS_PER_PAGE;
  const totalPages = jobsData?.pagination.totalPages ?? 0;
  const resultsStart = totalActiveJobs === 0 ? 0 : (currentPage - 1) * currentLimit + 1;
  const resultsEnd = totalActiveJobs === 0 ? 0 : resultsStart + emplois.length - 1;
  const hasActiveSearch = Boolean(initialQuery.search || initialQuery.location);
  const currentPageLabel = totalPages > 0 ? `${currentPage}/${totalPages}` : jobsLoading ? `${currentPage}/…` : '1/1';
  const showOfferCount = totalActiveJobs > 0;
  const heroOfferValue = showOfferCount ? `${totalActiveJobs}+` : '✓';
  const heroOfferLabel = isEn ? 'Verified offers' : 'Offres vérifiées';
  const totalJobsDisplay = jobsLoading && !jobsData ? '…' : String(totalActiveJobs);
  const showJobLoadingState = searchMode === 'emploi' && jobsLoading && !jobsData;

  const navigateToHome = (query: HomeQuery) => {
    const nextUrl = buildLocalizedHomeUrl(localizePath, query);

    startTransition(() => {
      router.push(nextUrl);
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
                onClick={() => setSearchMode('artisan')}
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

          <div className="mt-4 flex flex-wrap justify-center items-center gap-2">
            <span className="text-xs text-gray-400 font-medium">
              {isEn ? 'Cities:' : 'Villes :'}
            </span>
            {(['Douala', 'Yaoundé', 'Bafoussam', 'Bamenda', 'Garoua', 'Bertoua'] as const).map((city) => (
              <button
                key={city}
                onClick={() => {
                  setLocationInput(city);
                  navigateToHome({ search: searchInput.trim(), location: city, page: 1 });
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  initialQuery.location === city
                    ? 'bg-[#DA7756] text-white border-[#DA7756]'
                    : 'bg-white/70 text-gray-600 border-gray-200 hover:border-[#DA7756] hover:text-[#C4623F] backdrop-blur-sm'
                }`}
              >
                {city}
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-8 mt-6 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="min-w-[2.25rem] h-8 px-2 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-[#C4623F] font-bold text-xs">
                {heroOfferValue}
              </span>
              <span className="font-medium">{heroOfferLabel}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700">
                <svg viewBox="0 0 16 20" width="14" height="18" fill="currentColor" aria-hidden="true">
                  <path d="M8,0.5 L12,2 L14,5 L15,9 L15,13 L14,17 L8,20 L4,18 L3,15 L2,12 L0.5,10 L2,8 L3,5 L6,2 Z"/>
                </svg>
              </span>
              <span className="font-medium">{isEn ? 'Regions' : 'Régions'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
              </span>
              <span className="font-medium">{isEn ? 'Real-time' : 'Temps réel'}</span>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-[1400px] w-full mx-auto px-4 flex flex-col lg:flex-row gap-8 flex-grow mb-16 -mt-2">
        <aside className="w-full lg:basis-[28%] lg:max-w-none shrink-0 space-y-4 h-fit lg:sticky lg:top-24">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white font-bold text-black text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-[#FEEBD6] rounded flex items-center justify-center text-[#C4623F]">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
              </span>
              {isEn ? 'Search summary' : 'Résumé de recherche'}
            </div>

            {searchMode === 'emploi' && (
              <div className="p-4 space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[#F2D8C8] bg-[#FFF8F3] px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-[#A8502F]">
                      {isEn ? 'Verified offers' : 'Offres vérifiées'}
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-black">{totalJobsDisplay}</p>
                  </div>
                  <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">
                      Page
                    </p>
                    <p className="mt-2 text-3xl font-extrabold text-black">{currentPageLabel}</p>
                  </div>
                </div>

                {hasActiveSearch ? (
                  <div>
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400">
                        {isEn ? 'Active search' : 'Recherche active'}
                      </h3>
                      <button
                        onClick={resetSearch}
                        disabled={isPending}
                        className="text-xs font-bold text-[#C4623F] hover:underline disabled:cursor-not-allowed disabled:opacity-70"
                      >
                        {isEn ? 'Reset search' : 'Réinitialiser la recherche'}
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {initialQuery.search ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2D8C8] bg-[#FFF8F3] px-3 py-1.5 text-xs font-semibold text-[#A8502F]">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                          {initialQuery.search}
                        </span>
                      ) : null}
                      {initialQuery.location ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-600">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
                          {initialQuery.location}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-gray-200 bg-white px-4 py-5 text-sm text-gray-500 font-medium leading-relaxed">
                    <p className="font-bold text-black">
                      {isEn ? 'Newest verified listings first' : 'Les annonces vérifiées les plus récentes en premier'}
                    </p>
                    <p className="mt-2">
                      {isEn
                        ? 'This panel reflects the real backend total and the page you are currently browsing.'
                        : 'Ce panneau reflète le total backend réel et la page que vous consultez actuellement.'}
                    </p>
                  </div>
                )}
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
          <div className="flex justify-between items-center mb-6">
            {searchMode === 'emploi' && totalActiveJobs > 0 ? (
              <h2 className="text-[15px] text-gray-600 font-medium">
                <span className="font-extrabold text-gray-900">{resultsStart}-{resultsEnd}</span>{' '}
                {isEn ? `of ${totalActiveJobs} verified offers` : `sur ${totalActiveJobs} offres vérifiées`}
              </h2>
            ) : (
              <h2 className="text-[15px] text-gray-600 font-medium">
                {showJobLoadingState
                  ? (isEn ? 'Loading verified offers' : 'Chargement des offres vérifiées')
                  : searchMode === 'emploi'
                  ? hasActiveSearch
                    ? (isEn ? 'No verified offers match this search' : 'Aucune offre vérifiée ne correspond à cette recherche')
                    : (isEn ? 'Verified openings' : 'Offres vérifiées')
                  : (isEn ? 'Artisan profiles' : 'Profils artisans')}
              </h2>
            )}
          </div>

          {searchMode === 'emploi' && emplois.length > 0 && (
            <div className="space-y-3">
              {emplois.map((job) => (
                <Link key={job.id} href={localizePath(`/annonce/${job.id}`)} className="block group">
                  <article className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-[#DA7756] hover:shadow-lg hover:shadow-[#FFF5EF] transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-black mb-1 group-hover:text-[#C4623F] transition">{job.titre}</h3>
                        <div className="text-sm text-gray-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>{job.entreprise}</span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1.5"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>{job.lieu}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-gray-400">{job.temps}</span>
                        </div>
                      </div>
                      <span className="text-[#DA7756] font-bold text-sm opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                        {isEn ? 'View →' : 'Voir →'}
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {showJobLoadingState && <LoadingJobCards />}

          {searchMode === 'emploi' && totalPages > 1 && emplois.length > 0 && (
            <div className="mt-8 rounded-2xl border border-gray-200 bg-white px-4 py-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm font-medium text-gray-500">
                  {isEn
                    ? `Page ${currentPage} of ${totalPages}. Showing up to ${currentLimit} verified offers per page.`
                    : `Page ${currentPage} sur ${totalPages}. Jusqu’à ${currentLimit} offres vérifiées par page.`}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || isPending}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#DA7756] hover:text-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEn ? 'Previous' : 'Précédent'}
                  </button>
                  <button
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={currentPage === totalPages || isPending}
                    className="rounded-xl border border-gray-200 px-4 py-2 text-sm font-bold text-gray-600 hover:border-[#DA7756] hover:text-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isEn ? 'Next' : 'Suivant'}
                  </button>
                  <Link href={localizePath('/emplois')} className="rounded-xl bg-[#FFF5EF] px-4 py-2 text-sm font-bold text-[#C4623F] hover:bg-[#FEEBD6] transition">
                    {isEn ? 'Open full catalog' : 'Ouvrir le catalogue complet'}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {searchMode === 'emploi' && emplois.length === 0 && !showJobLoadingState && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-[#FFF5EF] rounded-2xl flex items-center justify-center text-4xl mb-6">📋</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {hasActiveSearch
                  ? (isEn ? 'No verified offer matches this search' : 'Aucune offre vérifiée ne correspond à cette recherche')
                  : (isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment')}
              </h4>
              <p className="text-gray-500 font-medium text-center max-w-md">
                {hasActiveSearch
                  ? (isEn
                      ? 'Try a broader keyword or another city, or reset the search to see the latest verified listings.'
                      : 'Essayez un mot-clé plus large ou une autre ville, ou réinitialisez la recherche pour voir les dernières offres vérifiées.')
                  : (isEn
                      ? 'New job listings will appear here as they are published and approved by our team.'
                      : 'Les nouvelles offres apparaîtront ici au fur et à mesure de leur publication et validation par notre équipe.')}
              </p>

              {hasActiveSearch ? (
                <button
                  onClick={resetSearch}
                  disabled={isPending}
                  className="mt-6 rounded-xl bg-[#DA7756] px-6 py-3 text-sm font-bold text-white hover:bg-[#C4623F] transition disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isEn ? 'Reset search' : 'Réinitialiser la recherche'}
                </button>
              ) : (
                <Link href={localizePath('/connexion')} className="mt-6 bg-[#DA7756] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#C4623F] transition text-sm">
                  {isEn ? 'Create an account to get notified' : 'Créer un compte pour être notifié'}
                </Link>
              )}
            </div>
          )}

          {searchMode === 'artisan' && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6">🛠️</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {isEn ? 'Browse artisans on the dedicated page' : 'Parcourez les artisans sur la page dédiée'}
              </h4>
              <p className="text-gray-500 font-medium text-center max-w-md">
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