"use client";

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, type ApiJob } from '@/lib/api';
import { useApi } from '@/lib/useApi';

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
    contrat: 'CDI',
    mode: 'Sur site',
    publishedHours: hours,
    temps: timeAgo(job.createdAt, isEn),
  };
}

export default function Home() {
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const [searchMode, setSearchMode] = useState<'emploi' | 'artisan'>('emploi');

  const { data: jobsData, loading: jobsLoading } = useApi(
    () => fetchJobs({ status: 'APPROVED', limit: 10 }),
    null,
    []
  );

  const emplois = jobsData && jobsData.jobs.length > 0
    ? jobsData.jobs.map((j) => apiJobToLocal(j, isEn))
    : [];

  const artisans: { id: number; titre: string; entreprise: string; lieu: string; note: number; disponibilite: string; verifie: boolean; image: string; temps: string }[] = [];

  const [jobDate24h, setJobDate24h] = useState(false);
  const [jobDate7j, setJobDate7j] = useState(false);
  const [jobContrats, setJobContrats] = useState<string[]>([]);
  const [jobModes, setJobModes] = useState<string[]>([]);
  const [artisanNote4, setArtisanNote4] = useState(false);
  const [artisanDispoImmediate, setArtisanDispoImmediate] = useState(false);
  const [artisanVerifie, setArtisanVerifie] = useState<boolean | null>(null);

  const toggleInArray = (value: string, values: string[], setter: (next: string[]) => void) => {
    setter(values.includes(value) ? values.filter((v) => v !== value) : [...values, value]);
  };

  const resetJobFilters = () => { setJobDate24h(false); setJobDate7j(false); setJobContrats([]); setJobModes([]); };
  const resetArtisanFilters = () => { setArtisanNote4(false); setArtisanDispoImmediate(false); setArtisanVerifie(null); };

  const emploisFiltres = emplois.filter((job) => {
    const datePass = (!jobDate24h && !jobDate7j) || (jobDate24h && job.publishedHours <= 24) || (jobDate7j && job.publishedHours <= 168);
    return datePass && (jobContrats.length === 0 || jobContrats.includes(job.contrat)) && (jobModes.length === 0 || jobModes.includes(job.mode));
  });

  const artisansFiltres = artisans.filter((a) => {
    return (!artisanNote4 || a.note >= 4) && (!artisanDispoImmediate || ["Immédiate", "Urgente"].includes(a.disponibilite)) && (artisanVerifie === null || a.verifie === artisanVerifie);
  });

  const resultats = searchMode === 'emploi' ? emploisFiltres : artisansFiltres;

  const countJob24h = emplois.filter((j) => j.publishedHours <= 24).length;
  const countJob7j = emplois.filter((j) => j.publishedHours <= 168).length;
  const countCDI = emplois.filter((j) => j.contrat === 'CDI').length;
  const countCDD = emplois.filter((j) => j.contrat === 'CDD').length;
  const countStage = emplois.filter((j) => j.contrat === 'Stage').length;
  const countSurSite = emplois.filter((j) => j.mode === 'Sur site').length;
  const countTeletravail = emplois.filter((j) => j.mode === 'Télétravail').length;
  const countNote4 = artisans.filter((a) => a.note >= 4).length;
  const countUrgentImmediate = artisans.filter((a) => ["Immédiate", "Urgente"].includes(a.disponibilite)).length;
  const countVerifieOui = artisans.filter((a) => a.verifie).length;
  const countVerifieNon = artisans.filter((a) => !a.verifie).length;

  return (
    <div className="w-full font-sans bg-white text-black min-h-screen flex flex-col">
      <Header />

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#FFF5EF] via-white to-[#FEEBD6]"></div>
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #DA7756 1px, transparent 0)', backgroundSize: '32px 32px' }}></div>

        <div className="relative max-w-[1400px] mx-auto px-4 pt-16 pb-20">
          {/* Badge animé */}
          <div className="flex justify-center mb-6">
            <span className="inline-flex items-center gap-2 bg-[#FEEBD6] text-[#A8502F] px-4 py-1.5 rounded-full text-xs font-bold tracking-wide">
              <span className="w-2 h-2 bg-[#DA7756] rounded-full animate-pulse"></span>
              {isEn ? 'The #1 job platform in Cameroon' : 'La plateforme #1 de l\'emploi au Cameroun'}
            </span>
          </div>

          {/* Titre principal avec highlight */}
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
              ? 'Search thousands of job offers and skilled artisans across all regions of Cameroon.'
              : 'Parcourez des milliers d\'offres d\'emploi et d\'artisans qualifiés dans toutes les régions du Cameroun.'}
          </p>

          {/* Toggle */}
          <div className="flex justify-center mb-8">
            <div className="bg-white border border-gray-200 p-1.5 rounded-full inline-flex shadow-lg shadow-[#FEEBD6]/50">
              <button
                onClick={() => setSearchMode('emploi')}
                className={`px-7 py-3 rounded-full text-sm font-bold transition-all duration-200 ${searchMode === 'emploi' ? 'bg-[#DA7756] text-white shadow-md shadow-[#FEEBD6]' : 'text-gray-500 hover:text-black'}`}
              >
                💼 {t.home.searchJob}
              </button>
              <button
                onClick={() => setSearchMode('artisan')}
                className={`px-7 py-3 rounded-full text-sm font-bold transition-all duration-200 ${searchMode === 'artisan' ? 'bg-[#DA7756] text-white shadow-md shadow-[#FEEBD6]' : 'text-gray-500 hover:text-black'}`}
              >
                🛠️ {t.home.findArtisan}
              </button>
            </div>
          </div>

          {/* Barre de recherche moderne */}
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 flex flex-col md:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">🔍</span>
                <input
                  type="text"
                  placeholder={searchMode === 'emploi' ? t.home.searchPlaceholderJob : t.home.searchPlaceholderArtisan}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-[#DA7756] focus:bg-white outline-none text-[15px] font-medium text-black transition"
                />
              </div>
              <div className="relative flex-1">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-lg">📍</span>
                <input
                  type="text"
                  placeholder={t.home.locationPlaceholder}
                  className="w-full pl-12 pr-4 py-4 rounded-xl bg-gray-50 border-0 focus:ring-2 focus:ring-[#DA7756] focus:bg-white outline-none text-[15px] font-medium text-black transition"
                />
              </div>
              <button className="bg-[#DA7756] text-white px-8 py-4 rounded-xl font-bold hover:bg-[#C4623F] transition text-[15px] shadow-md hover:shadow-lg whitespace-nowrap">
                {searchMode === 'emploi' ? t.home.submitJob : t.home.submitArtisan}
              </button>
            </div>
          </div>

          {/* Mini stats */}
          <div className="flex justify-center gap-8 mt-10 text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-8 h-8 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-[#C4623F] font-bold text-xs">{emplois.length}+</span>
              <span className="font-medium">{isEn ? 'Active offers' : 'Offres actives'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-700 font-bold text-xs">10</span>
              <span className="font-medium">{isEn ? 'Regions' : 'Régions'}</span>
            </div>
            <div className="flex items-center gap-2 text-gray-500">
              <span className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-700 font-bold text-xs">⚡</span>
              <span className="font-medium">{isEn ? 'Real-time' : 'Temps réel'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════ CONTENU (Filtres + Résultats) ═══════════ */}
      <div className="max-w-[1400px] w-full mx-auto px-4 flex flex-col lg:flex-row gap-8 flex-grow mb-16 -mt-2">

        {/* Filtres */}
        <aside className="w-full lg:basis-[28%] lg:max-w-none shrink-0 space-y-4 h-fit lg:sticky lg:top-24">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white font-bold text-black text-sm flex items-center gap-2">
              <span className="w-5 h-5 bg-[#FEEBD6] rounded flex items-center justify-center text-[#C4623F] text-[10px]">⚙</span>
              {t.home.dynamicFilters}
            </div>

            {searchMode === 'emploi' && (
              <div className="p-4 space-y-5">
                <div className="flex justify-end">
                  <button onClick={resetJobFilters} className="text-xs font-bold text-[#C4623F] hover:underline">{t.home.resetFilters}</button>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Publication date' : 'Date de publication'}</h3>
                  <div className="space-y-2">
                    {[
                      { checked: jobDate24h, toggle: () => setJobDate24h(!jobDate24h), label: isEn ? 'Less than 24h' : 'Moins de 24h', count: countJob24h },
                      { checked: jobDate7j, toggle: () => setJobDate7j(!jobDate7j), label: isEn ? 'Less than 7 days' : 'Moins de 7 jours', count: countJob7j },
                    ].map((f) => (
                      <label key={f.label} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input type="checkbox" checked={f.checked} onChange={f.toggle} className="accent-[#DA7756] w-4 h-4" />
                        <span className="group-hover:text-[#C4623F] transition">{f.label}</span>
                        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{f.count}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Contract type' : 'Type de contrat'}</h3>
                  <div className="space-y-2">
                    {[{ v: 'CDI', count: countCDI }, { v: 'CDD', count: countCDD }, { v: 'Stage', count: countStage }].map(({ v, count }) => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input type="checkbox" checked={jobContrats.includes(v)} onChange={() => toggleInArray(v, jobContrats, setJobContrats)} className="accent-[#DA7756] w-4 h-4" />
                        <span className="group-hover:text-[#C4623F] transition">{v}</span>
                        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Work mode' : 'Mode de travail'}</h3>
                  <div className="space-y-2">
                    {[
                      { v: 'Sur site', label: isEn ? 'On-site' : 'Sur site', count: countSurSite },
                      { v: 'Télétravail', label: isEn ? 'Remote' : 'Télétravail', count: countTeletravail },
                    ].map(({ v, label, count }) => (
                      <label key={v} className="flex items-center gap-2 text-sm cursor-pointer group">
                        <input type="checkbox" checked={jobModes.includes(v)} onChange={() => toggleInArray(v, jobModes, setJobModes)} className="accent-[#DA7756] w-4 h-4" />
                        <span className="group-hover:text-[#C4623F] transition">{label}</span>
                        <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{count}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {searchMode === 'artisan' && (
              <div className="p-4 space-y-5">
                <div className="flex justify-end">
                  <button onClick={resetArtisanFilters} className="text-xs font-bold text-[#C4623F] hover:underline">{t.home.resetFilters}</button>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Minimum rating' : 'Note minimum'}</h3>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={artisanNote4} onChange={() => setArtisanNote4(!artisanNote4)} className="accent-[#DA7756] w-4 h-4" />
                    {isEn ? '4+ stars' : '4+ étoiles'}
                    <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{countNote4}</span>
                  </label>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Availability' : 'Disponibilité'}</h3>
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox" checked={artisanDispoImmediate} onChange={() => setArtisanDispoImmediate(!artisanDispoImmediate)} className="accent-[#DA7756] w-4 h-4" />
                    {isEn ? 'Urgent / Immediate' : 'Urgente / Immédiate'}
                    <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{countUrgentImmediate}</span>
                  </label>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">{isEn ? 'Verified profile' : 'Profil vérifié'}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="verifie" checked={artisanVerifie === true} onChange={() => setArtisanVerifie(true)} className="accent-[#DA7756]" />
                      {isEn ? 'Yes' : 'Oui'}
                      <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{countVerifieOui}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="verifie" checked={artisanVerifie === false} onChange={() => setArtisanVerifie(false)} className="accent-[#DA7756]" />
                      {isEn ? 'No' : 'Non'}
                      <span className="ml-auto text-xs font-bold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{countVerifieNon}</span>
                    </label>
                    <button onClick={() => setArtisanVerifie(null)} className="text-xs font-bold text-[#C4623F] hover:underline mt-1">
                      {isEn ? 'Reset' : 'Réinitialiser'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Résultats */}
        <section className="w-full lg:basis-[72%]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[15px] text-gray-600 font-medium">
              <span className="font-extrabold text-gray-900">{resultats.length}</span> {isEn ? 'results' : 'résultats'}
            </h2>
          </div>

          {/* Liste emplois */}
          {searchMode === 'emploi' && emploisFiltres.length > 0 && (
            <div className="space-y-3">
              {emploisFiltres.map((job) => (
                <Link key={job.id} href={localizePath(`/annonce/${job.id}`)} className="block group">
                  <article className="bg-white p-5 rounded-2xl border border-gray-200 hover:border-[#DA7756] hover:shadow-lg hover:shadow-[#FFF5EF] transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-black mb-1 group-hover:text-[#C4623F] transition">{job.titre}</h3>
                        <div className="text-sm text-gray-600 font-medium flex flex-wrap items-center gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1">🏢 {job.entreprise}</span>
                          <span className="text-gray-300">•</span>
                          <span className="flex items-center gap-1">📍 {job.lieu}</span>
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

          {/* Grille artisans */}
          {searchMode === 'artisan' && artisansFiltres.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artisansFiltres.map((artisan) => (
                <Link key={artisan.id} href={localizePath(`/artisan/${artisan.id}`)} className="block group">
                  <article className="bg-white rounded-2xl border border-gray-200 overflow-hidden hover:border-[#DA7756] hover:shadow-lg hover:shadow-[#FFF5EF] transition-all duration-200">
                    <div className="h-36 bg-gradient-to-br from-[#FFF5EF] to-[#FEEBD6] border-b border-[#FEEBD6] flex items-center justify-center text-4xl">
                      {artisan.image}
                    </div>
                    <div className="p-4">
                      <div className="flex justify-between items-start gap-3 mb-2">
                        <h3 className="text-base font-bold text-black leading-tight group-hover:text-[#C4623F] transition">{artisan.titre}</h3>
                        <span className="text-sm font-extrabold text-amber-500">⭐ {artisan.note.toFixed(1)}</span>
                      </div>
                      <p className="text-sm text-gray-600 font-medium mb-1">{artisan.entreprise}</p>
                      <p className="text-sm text-gray-400 mb-3">{artisan.lieu}</p>
                      <div className="flex items-center justify-between text-xs font-bold">
                        <span className="text-[#C4623F] bg-[#FFF5EF] border border-[#FEEBD6] px-2.5 py-1 rounded-full">{artisan.disponibilite}</span>
                        <span className={artisan.verifie ? 'text-blue-700' : 'text-gray-400'}>
                          {artisan.verifie ? (isEn ? '✓ Verified' : '✓ Vérifié') : (isEn ? 'Not verified' : 'Non vérifié')}
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          )}

          {/* Loading */}
          {jobsLoading && resultats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-10 h-10 border-4 border-[#FEEBD6] border-t-[#DA7756] rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-medium">{isEn ? 'Loading...' : 'Chargement...'}</p>
            </div>
          )}

          {/* Empty — Emplois */}
          {!jobsLoading && resultats.length === 0 && searchMode === 'emploi' && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-[#FFF5EF] rounded-2xl flex items-center justify-center text-4xl mb-6">📋</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment'}
              </h4>
              <p className="text-gray-500 font-medium text-center max-w-md">
                {isEn
                  ? 'New job listings will appear here as they are published and approved by our team.'
                  : 'Les nouvelles offres apparaîtront ici au fur et à mesure de leur publication et validation par notre équipe.'}
              </p>
              <Link href={localizePath('/connexion')} className="mt-6 bg-[#DA7756] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#C4623F] transition text-sm">
                {isEn ? 'Create an account to get notified' : 'Créer un compte pour être notifié'}
              </Link>
            </div>
          )}

          {/* Empty — Artisans */}
          {!jobsLoading && resultats.length === 0 && searchMode === 'artisan' && (
            <div className="flex flex-col items-center justify-center py-20 px-8">
              <div className="w-20 h-20 bg-amber-50 rounded-2xl flex items-center justify-center text-4xl mb-6">🛠️</div>
              <h4 className="font-bold text-black text-xl mb-2 text-center">
                {isEn ? 'No artisans available yet' : 'Aucun artisan disponible pour le moment'}
              </h4>
              <p className="text-gray-500 font-medium text-center max-w-md">
                {isEn
                  ? 'Artisan profiles will appear here once registered and verified on the platform.'
                  : 'Les profils artisans apparaîtront ici une fois inscrits et vérifiés sur la plateforme.'}
              </p>
              <Link href={localizePath('/connexion')} className="mt-6 bg-[#DA7756] text-white px-6 py-3 rounded-xl font-bold hover:bg-[#C4623F] transition text-sm">
                {isEn ? 'Register as an artisan' : 'S\'inscrire comme artisan'}
              </Link>
            </div>
          )}
        </section>
      </div>

      {/* ═══════════ POURQUOI 237JOBS ═══════════ */}
      <section className="bg-gradient-to-b from-white to-gray-50 py-20 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4">
          <h2 className="text-3xl font-extrabold text-center mb-3 tracking-tight">
            {isEn ? 'Why choose' : 'Pourquoi choisir'}{' '}
            <span className="text-[#DA7756]">Bolo237</span> ?
          </h2>
          <p className="text-center text-gray-500 font-medium mb-12 max-w-xl mx-auto">
            {isEn
              ? 'A platform built by Cameroonians, for Cameroonians.'
              : 'Une plateforme créée par des Camerounais, pour les Camerounais.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: '🔒', bg: 'bg-[#FEEBD6]',
                title: isEn ? 'Anti-fraud protection' : 'Protection anti-fraude',
                desc: isEn
                  ? 'Every listing is moderated. Suspicious profiles are automatically flagged and hidden.'
                  : 'Chaque annonce est modérée. Les profils suspects sont automatiquement signalés et masqués.',
              },
              {
                icon: '🌍', bg: 'bg-blue-100',
                title: isEn ? 'All 10 regions' : 'Les 10 régions',
                desc: isEn
                  ? 'Find opportunities near you — Douala, Yaoundé, Bafoussam, Bamenda, and beyond.'
                  : 'Trouvez des opportunités près de chez vous — Douala, Yaoundé, Bafoussam, Bamenda et au-delà.',
              },
              {
                icon: '⚡', bg: 'bg-amber-100',
                title: isEn ? 'Jobs + Artisans' : 'Emplois + Artisans',
                desc: isEn
                  ? 'The only platform combining formal job offers and skilled artisan services in one place.'
                  : 'La seule plateforme combinant offres d\'emploi formelles et services d\'artisans qualifiés.',
              },
            ].map((card) => (
              <div key={card.title} className="bg-white rounded-2xl border border-gray-200 p-8 hover:shadow-xl hover:shadow-gray-100/80 transition-all duration-300 group">
                <div className={`w-14 h-14 ${card.bg} rounded-2xl flex items-center justify-center text-2xl mb-5 group-hover:scale-110 transition-transform`}>
                  {card.icon}
                </div>
                <h3 className="font-bold text-lg text-black mb-2">{card.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed font-medium">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════ CTA ═══════════ */}
      <section className="bg-[#DA7756] py-16 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '24px 24px' }}></div>
        <div className="relative max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
            {isEn ? 'Ready to get started?' : 'Prêt à commencer ?'}
          </h2>
          <p className="text-[#FEEBD6] font-medium text-lg mb-8 max-w-xl mx-auto">
            {isEn
              ? 'Create your free account in 2 minutes and access all opportunities.'
              : 'Créez votre compte gratuit en 2 minutes et accédez à toutes les opportunités.'}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href={localizePath('/connexion')} className="bg-white text-[#C4623F] px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-[#FFF5EF] transition shadow-lg">
              {isEn ? 'Create my account' : 'Créer mon compte'}
            </Link>
            <Link href={localizePath('/publier')} className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-white/10 transition">
              {isEn ? 'Post a job listing' : 'Publier une annonce'}
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
