"use client";

import { useMemo, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams, ReadonlyURLSearchParams } from 'next/navigation';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import JobListingCard from '@/components/JobListingCard';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, type ApiJob } from '@/lib/api';
import { buildJobDetailPath } from '@/lib/jobSlug';
import { getContractLabel, getWorkModeLabel, getWorkTimeLabel, mapApiJobToListing, type JobListing } from '@/lib/job-listings';
import { useApi } from '@/lib/useApi';

type SearchFilters = {
  datePosted: 'all' | '24h' | '7d';
  salaryOnly: boolean;
  workTimes: JobListing['workTime'][];
  contractTypes: JobListing['contractType'][];
  workModes: JobListing['workMode'][];
};

const DEFAULT_SEARCH_FILTERS: SearchFilters = {
  datePosted: 'all',
  salaryOnly: false,
  workTimes: [],
  contractTypes: [],
  workModes: [],
};

type SearchUrlState = {
  search: string;
  location: string;
  sortBy: 'recent' | 'oldest';
  filters: SearchFilters;
};

const DATE_POSTED_VALUES: SearchFilters['datePosted'][] = ['all', '24h', '7d'];
const WORK_TIME_VALUES: JobListing['workTime'][] = ['full', 'part'];
const CONTRACT_VALUES: JobListing['contractType'][] = ['cdi', 'cdd', 'stage', 'freelance'];
const WORK_MODE_VALUES: JobListing['workMode'][] = ['onsite', 'partial', 'remote'];

function parseMultiValueParam<T extends string>(
  searchParams: ReadonlyURLSearchParams,
  key: string,
  allowedValues: readonly T[],
): T[] {
  const allowedSet = new Set<string>(allowedValues);
  const uniqueValues = new Set<T>();

  searchParams.getAll(key).forEach((value: string) => {
    if (allowedSet.has(value)) {
      uniqueValues.add(value as T);
    }
  });

  return Array.from(uniqueValues);
}

function parseSearchUrlState(searchParams: ReadonlyURLSearchParams): SearchUrlState {
  const datePosted = searchParams.get('date');
  const sortBy = searchParams.get('sort');

  return {
    search: searchParams.get('q')?.trim() || '',
    location: searchParams.get('location')?.trim() || '',
    sortBy: sortBy === 'oldest' ? 'oldest' : 'recent',
    filters: {
      datePosted: DATE_POSTED_VALUES.includes(datePosted as SearchFilters['datePosted'])
        ? (datePosted as SearchFilters['datePosted'])
        : 'all',
      salaryOnly: searchParams.get('salary') === '1',
      workTimes: parseMultiValueParam(searchParams, 'workTime', WORK_TIME_VALUES),
      contractTypes: parseMultiValueParam(searchParams, 'contract', CONTRACT_VALUES),
      workModes: parseMultiValueParam(searchParams, 'mode', WORK_MODE_VALUES),
    },
  };
}

function buildSearchQuery(state: SearchUrlState): string {
  const params = new URLSearchParams();

  if (state.search) {
    params.set('q', state.search);
  }

  if (state.location) {
    params.set('location', state.location);
  }

  if (state.sortBy !== 'recent') {
    params.set('sort', state.sortBy);
  }

  if (state.filters.datePosted !== 'all') {
    params.set('date', state.filters.datePosted);
  }

  if (state.filters.salaryOnly) {
    params.set('salary', '1');
  }

  state.filters.workTimes.forEach((value) => params.append('workTime', value));
  state.filters.contractTypes.forEach((value) => params.append('contract', value));
  state.filters.workModes.forEach((value) => params.append('mode', value));

  return params.toString();
}

function toggleArrayFilter<T extends string>(items: T[], value: T): T[] {
  return items.includes(value) ? items.filter((item) => item !== value) : [...items, value];
}

function FilterPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-4 py-4">
        <h3 className="text-sm font-extrabold text-slate-900">{title}</h3>
      </div>
      <div className="space-y-3 p-4">{children}</div>
    </div>
  );
}

function FilterChoiceRow({
  label,
  count,
  active,
  onChange,
  type = 'checkbox',
}: {
  label: string;
  count: number;
  active: boolean;
  onChange: () => void;
  type?: 'checkbox' | 'radio';
}) {
  return (
    <label className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border px-3 py-2.5 transition ${active ? 'border-[#0F4C81] bg-[#EEF5FB]' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <span className="flex items-center gap-3">
        <input
          checked={active}
          onChange={onChange}
          type={type}
          className="h-4 w-4 border-slate-300 text-[#0F4C81] focus:ring-[#0F4C81]"
        />
        <span className="text-sm font-semibold text-slate-700">{label}</span>
      </span>
      <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${active ? 'bg-[#0F4C81] text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>
    </label>
  );
}

function ActiveFilterChip({
  label,
  onRemove,
  tone = 'neutral',
}: {
  label: string;
  onRemove: () => void;
  tone?: 'neutral' | 'blue' | 'green';
}) {
  const toneClassName = tone === 'blue'
    ? 'bg-[#E8F1FA] text-[#0F4C81] hover:bg-[#DCEAF7]'
    : tone === 'green'
      ? 'bg-[#E8F8EF] text-emerald-700 hover:bg-[#DDF4E7]'
      : 'bg-slate-100 text-slate-600 hover:bg-slate-200';

  return (
    <button
      type="button"
      onClick={onRemove}
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold transition ${toneClassName}`}
    >
      <span>{label}</span>
      <span aria-hidden="true">×</span>
    </button>
  );
}

function RechercheContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const locationInputRef = useRef<HTMLInputElement | null>(null);

  const urlState = useMemo(() => parseSearchUrlState(searchParams), [searchParams]);

  const updateUrlState = (nextState: SearchUrlState) => {
    const queryString = buildSearchQuery(nextState);
    const targetPath = localizePath('/recherche');
    router.replace(queryString ? `${targetPath}?${queryString}` : targetPath, { scroll: false });
  };

  const handleSearch = () => {
    updateUrlState({
      ...urlState,
      search: searchInputRef.current?.value.trim() || '',
      location: locationInputRef.current?.value.trim() || '',
    });
  };

  const { data: jobsData, loading: jobsLoading } = useApi(
    () => fetchJobs({
      limit: 50,
      status: 'APPROVED',
      sort: urlState.sortBy,
      ...(urlState.search ? { search: urlState.search } : {}),
      ...(urlState.location ? { location: urlState.location } : {}),
    }),
    null,
    [urlState.search, urlState.location, urlState.sortBy]
  );

  const annonces: JobListing[] = useMemo(() => {
    return jobsData ? jobsData.jobs.map((job: ApiJob, index: number) => mapApiJobToListing(job, index, isEn)) : [];
  }, [jobsData, isEn]);

  const filteredAnnonces = useMemo(() => {
    return annonces.filter((annonce) => {
      if (urlState.filters.datePosted === '24h' && annonce.publishedHours > 24) return false;
      if (urlState.filters.datePosted === '7d' && annonce.publishedHours > 24 * 7) return false;
      if (urlState.filters.salaryOnly && !annonce.salary) return false;
      if (urlState.filters.workTimes.length > 0 && !urlState.filters.workTimes.includes(annonce.workTime)) return false;
      if (urlState.filters.contractTypes.length > 0 && !urlState.filters.contractTypes.includes(annonce.contractType)) return false;
      if (urlState.filters.workModes.length > 0 && !urlState.filters.workModes.includes(annonce.workMode)) return false;
      return true;
    });
  }, [annonces, urlState.filters]);

  const totalOffers = jobsData?.pagination.total ?? annonces.length;
  const countMatches = (predicate: (annonce: JobListing) => boolean) => annonces.filter(predicate).length;
  const recent24Count = countMatches((annonce) => annonce.publishedHours <= 24);
  const recent7DaysCount = countMatches((annonce) => annonce.publishedHours <= 24 * 7);
  const fullTimeCount = countMatches((annonce) => annonce.workTime === 'full');
  const partTimeCount = countMatches((annonce) => annonce.workTime === 'part');
  const salaryShownCount = countMatches((annonce) => Boolean(annonce.salary));
  const workModeCounts = {
    onsite: countMatches((annonce) => annonce.workMode === 'onsite'),
    partial: countMatches((annonce) => annonce.workMode === 'partial'),
    remote: countMatches((annonce) => annonce.workMode === 'remote'),
  };
  const contractCounts = {
    cdi: countMatches((annonce) => annonce.contractType === 'cdi'),
    cdd: countMatches((annonce) => annonce.contractType === 'cdd'),
    stage: countMatches((annonce) => annonce.contractType === 'stage'),
    freelance: countMatches((annonce) => annonce.contractType === 'freelance'),
  };
  const activeFilterCount = [
    urlState.filters.datePosted !== 'all' ? 1 : 0,
    urlState.filters.salaryOnly ? 1 : 0,
    urlState.filters.workTimes.length,
    urlState.filters.contractTypes.length,
    urlState.filters.workModes.length,
  ].reduce((sum, count) => sum + count, 0);

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Emplois', en: 'Jobs' }, path: '/emplois' },
          { name: { fr: 'Recherche', en: 'Search' }, path: '/recherche' },
        ]}
      />
      <Header />

      {/* Back button */}
      <div className="max-w-7xl mx-auto px-4 pt-4">
        <Link href={localizePath('/emplois')} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-[#C4623F] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 rounded-lg">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {isEn ? 'Back to jobs' : 'Retour aux offres'}
        </Link>
      </div>

      {/* 1. BARRE DE RECHERCHE SUPÉRIEURE (Style Stepstone avec nos couleurs) */}
      <div className="bg-blue-50 py-8 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex flex-col md:flex-row gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input
                key={`search-${urlState.search}`}
                ref={searchInputRef}
                type="text"
                placeholder={isEn ? 'Job, skill, or company' : 'Métier, compétence ou entreprise'}
                defaultValue={urlState.search}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-4 py-3.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#DA7756] focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 text-gray-900 shadow-sm"
              />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
              <input
                key={`location-${urlState.location}`}
                ref={locationInputRef}
                type="text"
                placeholder={isEn ? 'City or district (ex: Douala)' : 'Ville ou quartier (ex: Douala)'}
                defaultValue={urlState.location}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-11 pr-4 py-3.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#DA7756] focus:border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2 text-gray-900 shadow-sm"
              />
            </div>
            <button
              onClick={handleSearch}
              className="bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold hover:bg-blue-800 transition shadow-md w-full md:w-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#DA7756] focus-visible:ring-offset-2"
            >
              {isEn ? 'Search' : 'Rechercher'}
            </button>
          </div>
          
        </div>
      </div>

      {/* CONTENU PRINCIPAL */}
      <main className="max-w-7xl mx-auto mt-8 px-4 flex flex-col md:flex-row gap-8">
        
        {/* 2. COLONNE DE GAUCHE : FILTRES */}
        <aside className="w-full shrink-0 space-y-4 md:w-full md:max-w-[290px] md:sticky md:top-6 md:self-start">
          <div className="rounded-[28px] border border-[#CFE0EF] bg-[linear-gradient(180deg,#F3F8FD_0%,#FFFFFF_100%)] p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0F4C81]">
                  {isEn ? 'Search filters' : 'Filtres de recherche'}
                </p>
                <p className="mt-1 text-3xl font-extrabold text-slate-950">{activeFilterCount}</p>
              </div>
              <button
                onClick={() => updateUrlState({ ...urlState, filters: DEFAULT_SEARCH_FILTERS })}
                disabled={activeFilterCount === 0}
                className="rounded-full border border-[#B7D0E4] bg-white px-4 py-2 text-xs font-bold text-[#0F4C81] transition hover:border-[#0F4C81] disabled:cursor-not-allowed disabled:opacity-40"
                type="button"
              >
                {isEn ? 'Reset' : 'Réinitialiser'}
              </button>
            </div>
          </div>

          <FilterPanel title={isEn ? 'Publication date' : 'Date de publication'}>
            <FilterChoiceRow
              type="radio"
              label={isEn ? 'All dates' : 'Toutes les dates'}
              count={annonces.length}
              active={urlState.filters.datePosted === 'all'}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, datePosted: 'all' } })}
            />
            <FilterChoiceRow
              type="radio"
              label={isEn ? 'Less than 24h' : 'Moins de 24h'}
              count={recent24Count}
              active={urlState.filters.datePosted === '24h'}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, datePosted: '24h' } })}
            />
            <FilterChoiceRow
              type="radio"
              label={isEn ? 'Less than 7 days' : 'Moins de 7 jours'}
              count={recent7DaysCount}
              active={urlState.filters.datePosted === '7d'}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, datePosted: '7d' } })}
            />
          </FilterPanel>

          <FilterPanel title={isEn ? 'Working time' : 'Temps de travail'}>
            <FilterChoiceRow
              label={getWorkTimeLabel('full', isEn)}
              count={fullTimeCount}
              active={urlState.filters.workTimes.includes('full')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workTimes: toggleArrayFilter(urlState.filters.workTimes, 'full') } })}
            />
            <FilterChoiceRow
              label={getWorkTimeLabel('part', isEn)}
              count={partTimeCount}
              active={urlState.filters.workTimes.includes('part')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workTimes: toggleArrayFilter(urlState.filters.workTimes, 'part') } })}
            />
          </FilterPanel>

          <FilterPanel title={isEn ? 'Contract type' : 'Type de contrat'}>
            <FilterChoiceRow
              label={getContractLabel('cdi', isEn)}
              count={contractCounts.cdi}
              active={urlState.filters.contractTypes.includes('cdi')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, contractTypes: toggleArrayFilter(urlState.filters.contractTypes, 'cdi') } })}
            />
            <FilterChoiceRow
              label={getContractLabel('cdd', isEn)}
              count={contractCounts.cdd}
              active={urlState.filters.contractTypes.includes('cdd')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, contractTypes: toggleArrayFilter(urlState.filters.contractTypes, 'cdd') } })}
            />
            <FilterChoiceRow
              label={getContractLabel('stage', isEn)}
              count={contractCounts.stage}
              active={urlState.filters.contractTypes.includes('stage')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, contractTypes: toggleArrayFilter(urlState.filters.contractTypes, 'stage') } })}
            />
            <FilterChoiceRow
              label={getContractLabel('freelance', isEn)}
              count={contractCounts.freelance}
              active={urlState.filters.contractTypes.includes('freelance')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, contractTypes: toggleArrayFilter(urlState.filters.contractTypes, 'freelance') } })}
            />
          </FilterPanel>

          <FilterPanel title={isEn ? 'Work mode' : 'Mode de travail'}>
            <FilterChoiceRow
              label={getWorkModeLabel('onsite', isEn)}
              count={workModeCounts.onsite}
              active={urlState.filters.workModes.includes('onsite')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workModes: toggleArrayFilter(urlState.filters.workModes, 'onsite') } })}
            />
            <FilterChoiceRow
              label={getWorkModeLabel('partial', isEn)}
              count={workModeCounts.partial}
              active={urlState.filters.workModes.includes('partial')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workModes: toggleArrayFilter(urlState.filters.workModes, 'partial') } })}
            />
            <FilterChoiceRow
              label={getWorkModeLabel('remote', isEn)}
              count={workModeCounts.remote}
              active={urlState.filters.workModes.includes('remote')}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workModes: toggleArrayFilter(urlState.filters.workModes, 'remote') } })}
            />
          </FilterPanel>

          <FilterPanel title={isEn ? 'Salary' : 'Salaire'}>
            <FilterChoiceRow
              label={isEn ? 'Salary disclosed' : 'Salaire affiche'}
              count={salaryShownCount}
              active={urlState.filters.salaryOnly}
              onChange={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, salaryOnly: !urlState.filters.salaryOnly } })}
            />
          </FilterPanel>
        </aside>

        {/* 3. COLONNE DE DROITE : LISTE DES ANNONCES */}
        <section className="flex-1">
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-700">
              <span className="font-bold text-gray-900">{filteredAnnonces.length} {isEn ? 'jobs shown' : 'offres affichees'}</span>{' '}
              <span className="text-gray-600">{isEn ? `out of ${totalOffers}` : `sur ${totalOffers}`}</span>
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{isEn ? 'Sort by:' : 'Trier par :'}</span>
              <select
                value={urlState.sortBy}
                onChange={(event) => updateUrlState({ ...urlState, sortBy: event.target.value as 'recent' | 'oldest' })}
                className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer"
              >
                <option value="recent">{isEn ? 'Most recent' : 'Plus recentes'}</option>
                <option value="oldest">{isEn ? 'Oldest first' : 'Plus anciennes'}</option>
              </select>
            </div>
          </div>

          {activeFilterCount > 0 ? (
            <div className="mb-4 flex flex-wrap gap-2">
              {urlState.filters.datePosted !== 'all' ? (
                <ActiveFilterChip
                  label={urlState.filters.datePosted === '24h' ? (isEn ? 'Less than 24h' : 'Moins de 24h') : (isEn ? 'Less than 7 days' : 'Moins de 7 jours')}
                  onRemove={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, datePosted: 'all' } })}
                  tone="blue"
                />
              ) : null}
              {urlState.filters.salaryOnly ? (
                <ActiveFilterChip
                  label={isEn ? 'Salary disclosed' : 'Salaire affiche'}
                  onRemove={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, salaryOnly: false } })}
                  tone="green"
                />
              ) : null}
              {urlState.filters.workTimes.map((item) => (
                <ActiveFilterChip
                  key={item}
                  label={getWorkTimeLabel(item, isEn)}
                  onRemove={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workTimes: urlState.filters.workTimes.filter((value) => value !== item) } })}
                />
              ))}
              {urlState.filters.contractTypes.map((item) => (
                <ActiveFilterChip
                  key={item}
                  label={getContractLabel(item, isEn)}
                  onRemove={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, contractTypes: urlState.filters.contractTypes.filter((value) => value !== item) } })}
                />
              ))}
              {urlState.filters.workModes.map((item) => (
                <ActiveFilterChip
                  key={item}
                  label={getWorkModeLabel(item, isEn)}
                  onRemove={() => updateUrlState({ ...urlState, filters: { ...urlState.filters, workModes: urlState.filters.workModes.filter((value) => value !== item) } })}
                />
              ))}
            </div>
          ) : null}

          {jobsLoading ? (
            <div className="rounded-3xl border border-gray-200 bg-white px-6 py-12 text-center text-sm font-medium text-gray-500">
              {isEn ? 'Loading search results...' : 'Chargement des resultats...'}
            </div>
          ) : filteredAnnonces.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredAnnonces.map((annonce) => (
                <JobListingCard
                  key={annonce.id}
                  offer={annonce}
                  isEn={isEn}
                  href={localizePath(buildJobDetailPath(annonce))}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-gray-200 bg-gradient-to-b from-white to-gray-50 p-8 text-center shadow-sm">
              <h3 className="text-lg font-extrabold text-gray-900">
                {isEn ? 'No job matches these filters' : 'Aucune offre ne correspond a ces filtres'}
              </h3>
              <p className="mt-2 text-sm text-gray-600">
                {isEn ? 'Try broader criteria or reset the sidebar filters to bring back more recent openings.' : 'Essayez des criteres plus larges ou reinitialisez les filtres pour faire revenir plus d offres recentes.'}
              </p>
            </div>
          )}
          
        </section>

      </main>
      <Footer />
    </div>
  );
}


export default function RecherchePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Chargement des résultats...</div>}>
      <RechercheContent />
    </Suspense>
  );
}