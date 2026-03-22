"use client";

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, type ApiJob } from '@/lib/api';
import { useApi } from '@/lib/useApi';

// Helper : calcule "il y a Xh" depuis createdAt
function timeAgo(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return isEn ? 'just now' : "à l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `il y a ${hours}h`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `il y a ${days} jour${days > 1 ? 's' : ''}`;
}

// Helper : convertit un ApiJob en format local pour les filtres
function apiJobToLocal(job: ApiJob, isEn: boolean) {
  const hours = Math.floor((Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60));
  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    lieu: job.location,
    contrat: 'CDI', // default, could be extended in the DB model later
    mode: 'Sur site',
    publishedHours: hours,
    temps: timeAgo(job.createdAt, isEn),
  };
}

// Plus de mock data — on attend les vraies données du backend

export default function Home() {
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const [searchMode, setSearchMode] = useState<'emploi' | 'artisan'>('emploi');

  // Fetch jobs depuis le backend avec fallback mock
  const { data: jobsData, loading: jobsLoading } = useApi(
    () => fetchJobs({ status: 'APPROVED', limit: 10 }),
    null,
    []
  );

  // Offres depuis le backend (tableau vide si rien)
  const emplois = jobsData && jobsData.jobs.length > 0
    ? jobsData.jobs.map((j) => apiJobToLocal(j, isEn))
    : [];

  // Artisans — vide en attendant la future route /api/artisans
  const artisans: { id: number; titre: string; entreprise: string; lieu: string; note: number; disponibilite: string; verifie: boolean; image: string; temps: string }[] = [];

  const [jobDate24h, setJobDate24h] = useState(false);
  const [jobDate7j, setJobDate7j] = useState(false);
  const [jobContrats, setJobContrats] = useState<string[]>([]);
  const [jobModes, setJobModes] = useState<string[]>([]);

  const [artisanNote4, setArtisanNote4] = useState(false);
  const [artisanDispoImmediate, setArtisanDispoImmediate] = useState(false);
  const [artisanVerifie, setArtisanVerifie] = useState<boolean | null>(null);

  const toggleInArray = (value: string, values: string[], setter: (next: string[]) => void) => {
    if (values.includes(value)) {
      setter(values.filter((v) => v !== value));
      return;
    }
    setter([...values, value]);
  };

  const resetJobFilters = () => {
    setJobDate24h(false);
    setJobDate7j(false);
    setJobContrats([]);
    setJobModes([]);
  };

  const resetArtisanFilters = () => {
    setArtisanNote4(false);
    setArtisanDispoImmediate(false);
    setArtisanVerifie(null);
  };

  const emploisFiltres = emplois.filter((job) => {
    const datePass =
      (!jobDate24h && !jobDate7j) ||
      (jobDate24h && job.publishedHours <= 24) ||
      (jobDate7j && job.publishedHours <= 168);

    const contratPass = jobContrats.length === 0 || jobContrats.includes(job.contrat);
    const modePass = jobModes.length === 0 || jobModes.includes(job.mode);

    return datePass && contratPass && modePass;
  });

  const artisansFiltres = artisans.filter((artisan) => {
    const notePass = !artisanNote4 || artisan.note >= 4;
    const dispoPass = !artisanDispoImmediate || ["Immédiate", "Urgente"].includes(artisan.disponibilite);
    const verifiePass = artisanVerifie === null || artisan.verifie === artisanVerifie;

    return notePass && dispoPass && verifiePass;
  });

  const resultats = searchMode === 'emploi' ? emploisFiltres : artisansFiltres;

  const jobDateBase = emplois.filter((job) => {
    const contratPass = jobContrats.length === 0 || jobContrats.includes(job.contrat);
    const modePass = jobModes.length === 0 || jobModes.includes(job.mode);
    return contratPass && modePass;
  });
  const countJob24h = jobDateBase.filter((job) => job.publishedHours <= 24).length;
  const countJob7j = jobDateBase.filter((job) => job.publishedHours <= 168).length;

  const jobContratBase = emplois.filter((job) => {
    const datePass =
      (!jobDate24h && !jobDate7j) ||
      (jobDate24h && job.publishedHours <= 24) ||
      (jobDate7j && job.publishedHours <= 168);
    const modePass = jobModes.length === 0 || jobModes.includes(job.mode);
    return datePass && modePass;
  });
  const countCDI = jobContratBase.filter((job) => job.contrat === 'CDI').length;
  const countCDD = jobContratBase.filter((job) => job.contrat === 'CDD').length;
  const countStage = jobContratBase.filter((job) => job.contrat === 'Stage').length;

  const jobModeBase = emplois.filter((job) => {
    const datePass =
      (!jobDate24h && !jobDate7j) ||
      (jobDate24h && job.publishedHours <= 24) ||
      (jobDate7j && job.publishedHours <= 168);
    const contratPass = jobContrats.length === 0 || jobContrats.includes(job.contrat);
    return datePass && contratPass;
  });
  const countSurSite = jobModeBase.filter((job) => job.mode === 'Sur site').length;
  const countTeletravail = jobModeBase.filter((job) => job.mode === 'Télétravail').length;

  const artisanNoteBase = artisans.filter((artisan) => {
    const dispoPass = !artisanDispoImmediate || ["Immédiate", "Urgente"].includes(artisan.disponibilite);
    const verifiePass = artisanVerifie === null || artisan.verifie === artisanVerifie;
    return dispoPass && verifiePass;
  });
  const countNote4 = artisanNoteBase.filter((artisan) => artisan.note >= 4).length;

  const artisanDispoBase = artisans.filter((artisan) => {
    const notePass = !artisanNote4 || artisan.note >= 4;
    const verifiePass = artisanVerifie === null || artisan.verifie === artisanVerifie;
    return notePass && verifiePass;
  });
  const countUrgentImmediate = artisanDispoBase.filter((artisan) => ["Immédiate", "Urgente"].includes(artisan.disponibilite)).length;

  const artisanVerifieBase = artisans.filter((artisan) => {
    const notePass = !artisanNote4 || artisan.note >= 4;
    const dispoPass = !artisanDispoImmediate || ["Immédiate", "Urgente"].includes(artisan.disponibilite);
    return notePass && dispoPass;
  });
  const countVerifieOui = artisanVerifieBase.filter((artisan) => artisan.verifie).length;
  const countVerifieNon = artisanVerifieBase.filter((artisan) => !artisan.verifie).length;

  return (
    <div className="w-full font-sans bg-white text-black min-h-screen flex flex-col">
      
      <Header />
      
      {/* 1. SECTION RECHERCHE (Épurée) */}
      <div className="bg-green-50/50 py-10 border-b border-green-100">
        <div className="max-w-[1400px] mx-auto px-4 text-center">
          
          <h1 className="text-3xl font-extrabold text-black mb-6 leading-tight">
            {t.home.find} <span className="text-green-600">{searchMode === 'emploi' ? t.home.matchingJob : t.home.matchingArtisan}</span> {t.home.forYou}
          </h1>

          {/* Sélecteur simple */}
          <div className="flex justify-center mb-8">
            <div className="bg-white border border-gray-200 p-1 rounded-full inline-flex shadow-sm">
              <button 
                onClick={() => setSearchMode('emploi')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${searchMode === 'emploi' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
              >
                💼 {t.home.searchJob}
              </button>
              <button 
                onClick={() => setSearchMode('artisan')}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${searchMode === 'artisan' ? 'bg-green-600 text-white shadow-md' : 'text-gray-500 hover:text-black'}`}
              >
                🛠️ {t.home.findArtisan}
              </button>
            </div>
          </div>

          {/* Barre de recherche */}
          <div className="flex flex-col md:flex-row gap-2 justify-center max-w-5xl mx-auto">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold">🔍</span>
              <input 
                type="text" 
                placeholder={searchMode === 'emploi' ? t.home.searchPlaceholderJob : t.home.searchPlaceholderArtisan} 
                className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-300 focus:ring-2 focus:ring-green-600 outline-none text-[15px] font-medium text-black shadow-sm" 
              />
            </div>
            
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-black font-bold">📍</span>
              <input 
                type="text" 
                placeholder={t.home.locationPlaceholder} 
                className="w-full pl-12 pr-4 py-4 rounded-full border border-gray-300 focus:ring-2 focus:ring-green-600 outline-none text-[15px] font-medium text-black shadow-sm" 
              />
            </div>
            
            <button className="w-full md:w-auto bg-green-600 text-white px-8 py-4 rounded-full font-bold hover:bg-green-700 transition text-[15px] shadow-md">
              {searchMode === 'emploi' ? t.home.submitJob : t.home.submitArtisan}
            </button>
          </div>
        </div>
      </div>

      {/* 2. CORPS (Split Screen 30/70) */}
      <div className="max-w-[1400px] w-full mx-auto mt-8 px-4 flex flex-col lg:flex-row gap-8 flex-grow mb-12">
        
        {/* Colonne gauche 30%: filtres dynamiques */}
        <aside className="w-full lg:basis-[30%] lg:max-w-none shrink-0 space-y-4 h-fit">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 font-bold text-black text-sm">
              {t.home.dynamicFilters}
            </div>

            {searchMode === 'emploi' && (
              <div className="p-4 space-y-6">
                <div className="flex justify-end">
                  <button onClick={resetJobFilters} className="text-xs font-bold text-green-700 hover:underline">
                    {t.home.resetFilters}
                  </button>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Publication date' : 'Date de publication'}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={jobDate24h} onChange={() => setJobDate24h(!jobDate24h)} className="accent-green-600" />
                      {isEn ? 'Less than 24h' : 'Moins de 24h'}
                      <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countJob24h}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={jobDate7j} onChange={() => setJobDate7j(!jobDate7j)} className="accent-green-600" />
                      {isEn ? 'Less than 7 days' : 'Moins de 7 jours'}
                      <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countJob7j}</span>
                    </label>
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Contract type' : 'Type de contrat'}</h3>
                  <div className="space-y-2">
                    {['CDI', 'CDD', 'Stage'].map((contrat) => (
                      <label key={contrat} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={jobContrats.includes(contrat)}
                          onChange={() => toggleInArray(contrat, jobContrats, setJobContrats)}
                          className="accent-green-600"
                        />
                        {contrat}
                        <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {contrat === 'CDI' ? countCDI : contrat === 'CDD' ? countCDD : countStage}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Work mode' : 'Mode de travail'}</h3>
                  <div className="space-y-2">
                    {['Sur site', 'Télétravail'].map((mode) => (
                      <label key={mode} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={jobModes.includes(mode)}
                          onChange={() => toggleInArray(mode, jobModes, setJobModes)}
                          className="accent-green-600"
                        />
                        {mode === 'Sur site' ? (isEn ? 'On-site' : 'Sur site') : (isEn ? 'Remote' : 'Télétravail')}
                        <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                          {mode === 'Sur site' ? countSurSite : countTeletravail}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {searchMode === 'artisan' && (
              <div className="p-4 space-y-6">
                <div className="flex justify-end">
                  <button onClick={resetArtisanFilters} className="text-xs font-bold text-green-700 hover:underline">
                    {t.home.resetFilters}
                  </button>
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Minimum rating' : 'Note minimum'}</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={artisanNote4} onChange={() => setArtisanNote4(!artisanNote4)} className="accent-green-600" />
                    {isEn ? '⭐⭐⭐⭐ and above' : '⭐⭐⭐⭐ et plus'}
                    <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countNote4}</span>
                  </label>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Availability' : 'Disponibilité'}</h3>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={artisanDispoImmediate}
                      onChange={() => setArtisanDispoImmediate(!artisanDispoImmediate)}
                      className="accent-green-600"
                    />
                    {isEn ? 'Urgent / Immediate' : 'Urgente / Immédiate'}
                    <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countUrgentImmediate}</span>
                  </label>
                </div>

                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-3">{isEn ? 'Verified profile' : 'Profil vérifié'}</h3>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="artisan-verifie"
                        checked={artisanVerifie === true}
                        onChange={() => setArtisanVerifie(true)}
                        className="accent-green-600"
                      />
                      {isEn ? 'Yes' : 'Oui'}
                      <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countVerifieOui}</span>
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="artisan-verifie"
                        checked={artisanVerifie === false}
                        onChange={() => setArtisanVerifie(false)}
                        className="accent-green-600"
                      />
                      {isEn ? 'No' : 'Non'}
                      <span className="ml-auto text-xs font-bold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{countVerifieNon}</span>
                    </label>
                    <button
                      onClick={() => setArtisanVerifie(null)}
                      className="text-xs font-bold text-green-700 hover:underline mt-1"
                    >
                      {isEn ? 'Reset this filter' : 'Réinitialiser ce filtre'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Colonne droite 70%: résultats */}
        <section className="w-full lg:basis-[70%]">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[15px] text-gray-700 font-medium">
              <span className="font-bold text-gray-900">{resultats.length} {isEn ? 'results' : 'résultats'}</span> {isEn ? 'for' : 'pour'} « {searchMode === 'emploi' ? (isEn ? 'Jobs' : 'Emplois') : (isEn ? 'Artisans' : 'Artisans')} »
            </h2>
          </div>

          {searchMode === 'emploi' && (
            <div className="space-y-3">
              {emploisFiltres.map((job) => (
                <div key={job.id} className="space-y-2">
                  <Link href={localizePath(`/annonce/${job.id}`)} className="block">
                    <article className="bg-white p-5 rounded-xl border border-gray-200 hover:border-green-600 transition">
                      <h3 className="text-lg font-bold text-black mb-1">{job.titre}</h3>
                      <div className="text-sm text-gray-700 font-medium flex flex-wrap gap-x-3 gap-y-1">
                        <span>{job.entreprise}</span>
                        <span>•</span>
                        <span>{job.lieu}</span>
                        <span>•</span>
                        <span>{job.temps}</span>
                      </div>
                      <div className="mt-3 text-sm font-extrabold text-green-700">
                        {isEn ? 'View ad →' : 'Voir l offre →'}
                      </div>
                    </article>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {searchMode === 'artisan' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {artisansFiltres.map((artisan) => (
                <div key={artisan.id} className="space-y-2">
                  <Link href={localizePath(`/artisan/${artisan.id}`)} className="block">
                    <article className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-green-600 transition">
                      <div className="h-36 bg-green-50 border-b border-green-100 flex items-center justify-center text-4xl">
                        {artisan.image}
                      </div>

                      <div className="p-4">
                        <div className="flex justify-between items-start gap-3 mb-2">
                          <h3 className="text-base font-bold text-black leading-tight">{artisan.titre}</h3>
                          <span className="text-sm font-extrabold text-amber-500">⭐ {artisan.note.toFixed(1)}</span>
                        </div>

                        <p className="text-sm text-gray-700 font-medium mb-1">{artisan.entreprise}</p>
                        <p className="text-sm text-gray-500 mb-3">{artisan.lieu}</p>

                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-green-700 bg-green-50 border border-green-100 px-2 py-1 rounded-full">
                            {artisan.disponibilite}
                          </span>
                          <span className={artisan.verifie ? 'text-blue-700' : 'text-gray-400'}>
                            {artisan.verifie ? (isEn ? 'Verified profile' : 'Profil vérifié') : (isEn ? 'Not verified' : 'Non vérifié')}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-3">{artisan.temps}</p>
                        <p className="text-sm font-extrabold text-green-700 mt-2">{isEn ? 'View profile →' : 'Voir le profil →'}</p>
                      </div>
                    </article>
                  </Link>
                </div>
              ))}
            </div>
          )}

          {jobsLoading && resultats.length === 0 && (
            <div className="bg-white p-8 rounded-xl border border-gray-200 text-center text-gray-500 font-medium">
              {isEn ? 'Loading...' : 'Chargement...'}
            </div>
          )}

          {!jobsLoading && resultats.length === 0 && searchMode === 'emploi' && (
            <div className="bg-white p-10 rounded-xl border border-gray-200 text-center">
              <p className="text-4xl mb-4">📋</p>
              <h4 className="font-bold text-black text-[15px] mb-2">{isEn ? 'No offers available yet' : 'Aucune offre disponible pour le moment'}</h4>
              <p className="text-sm text-gray-500 font-medium">
                {isEn
                  ? 'New job listings will appear here as they are published and approved.'
                  : 'Les nouvelles offres apparaitront ici au fur et a mesure de leur publication et validation.'}
              </p>
            </div>
          )}

          {!jobsLoading && resultats.length === 0 && searchMode === 'artisan' && (
            <div className="bg-white p-10 rounded-xl border border-gray-200 text-center">
              <p className="text-4xl mb-4">🛠️</p>
              <h4 className="font-bold text-black text-[15px] mb-2">{isEn ? 'No artisans available yet' : 'Aucun artisan disponible pour le moment'}</h4>
              <p className="text-sm text-gray-500 font-medium">
                {isEn
                  ? 'Artisan profiles will appear here once registered on the platform.'
                  : 'Les profils artisans apparaitront ici une fois inscrits sur la plateforme.'}
              </p>
            </div>
          )}
        </section>

      </div>

      {/* FAQ UNIQUEMENT ICI */}
      <div className="max-w-[1400px] w-full mx-auto px-4 mb-16">
        <div className="bg-[#fdfaf6] border border-[#e8e3d8] rounded-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
            ❓ {isEn ? 'Frequently asked questions' : 'Foire aux questions'}
          </h2>
          <div className="space-y-6 text-sm">
            <div>
              <h3 className="font-bold text-gray-900 mb-1">
                {isEn
                  ? 'How many job opportunities are currently open in Cameroon?'
                  : 'Combien d offres d emploi sont actuellement ouvertes au Cameroun ?'}
              </h3>
              <p className="text-gray-700">
                {isEn
                  ? 'Currently, 237jobs lists new opportunities across multiple sectors and profile types. Check back soon!'
                  : 'Actuellement, 237jobs propose de nouvelles offres dans plusieurs secteurs. Revenez bientot !'}
              </p>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
