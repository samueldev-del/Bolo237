"use client";

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { fetchJobs, type ApiJob } from '@/lib/api';
import { useApi } from '@/lib/useApi';

type Annonce = {
  id: number;
  titre: string;
  entreprise: string;
  lieu: string;
  type: string;
  mode: string;
  description: string;
  temps: string;
  logo: string;
};

function timeAgoFr(createdAt: string, isEn: boolean): string {
  const diff = Date.now() - new Date(createdAt).getTime();
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours < 1) return isEn ? 'just now' : "à l'instant";
  if (hours < 24) return isEn ? `${hours}h ago` : `il y a ${hours} heure${hours > 1 ? 's' : ''}`;
  const days = Math.floor(hours / 24);
  return isEn ? `${days}d ago` : `il y a ${days} jour${days > 1 ? 's' : ''}`;
}

function apiJobToAnnonce(job: ApiJob, isEn: boolean): Annonce {
  return {
    id: job.id,
    titre: job.title,
    entreprise: job.company,
    lieu: job.location,
    type: 'Temps plein',
    mode: 'Sur site',
    description: job.description,
    temps: timeAgoFr(job.createdAt, isEn),
    logo: job.company.slice(0, 2).toUpperCase(),
  };
}

const MOCK_ANNONCES: Annonce[] = [
  { id: 1, titre: "Développeur Web Fullstack (H/F) - React/Node.js", entreprise: "TechCamer Solutions", lieu: "Douala, Akwa", type: "Temps plein", mode: "Hybride", description: "Rejoignez notre équipe pour développer des solutions innovantes. Vous travaillerez sur la refonte de notre plateforme avec Next.js et PostgreSQL.", temps: "il y a 2 heures", logo: "TC" },
  { id: 2, titre: "Comptable Financier Senior (H/F)", entreprise: "Banque Atlantique", lieu: "Yaoundé, Centre-ville", type: "Temps plein", mode: "Sur site", description: "Nous recherchons un comptable expérimenté pour gérer les déclarations fiscales et superviser les clôtures mensuelles de nos agences régionales.", temps: "il y a 1 jour", logo: "BA" },
  { id: 3, titre: "Menuisier - Fabrication de meubles (Urgent)", entreprise: "Particulier", lieu: "Douala, Bonamoussadi", type: "Petit Boulot", mode: "Sur site", description: "J'ai besoin d'un menuisier qualifié pour fabriquer sur mesure une table à manger 8 places et une étagère de salon.", temps: "il y a 4 heures", logo: "👤" },
  { id: 4, titre: "Commercial Terrain B2B (H/F)", entreprise: "Orange Cameroun", lieu: "Bafoussam", type: "Temps plein", mode: "Déplacements", description: "Développez le portefeuille client sur la région Ouest. Vente de solutions télécoms aux entreprises locales.", temps: "il y a 3 jours", logo: "OR" },
];

export default function Recherche() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  const { data: jobsData } = useApi(
    () => fetchJobs({ limit: 20 }),
    null,
    []
  );

  const annonces: Annonce[] = jobsData && jobsData.jobs.length > 0
    ? jobsData.jobs.map((j) => apiJobToAnnonce(j, isEn))
    : MOCK_ANNONCES;

  return (
    <div className="min-h-screen bg-gray-50 font-sans pb-12">
      <Header />

      {/* 1. BARRE DE RECHERCHE SUPÉRIEURE (Style Stepstone avec nos couleurs) */}
      <div className="bg-blue-50 py-8 border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4">
          
          <div className="flex flex-col md:flex-row gap-3 max-w-4xl mx-auto">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
              <input 
                type="text" 
                placeholder={isEn ? 'Job, skill, or company' : 'Job, competence ou entreprise'} 
                className="w-full pl-11 pr-4 py-3.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 shadow-sm"
              />
            </div>
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">📍</span>
              <input 
                type="text" 
                placeholder={isEn ? 'City or district (ex: Douala)' : 'Ville ou quartier (ex: Douala)'} 
                className="w-full pl-11 pr-4 py-3.5 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 shadow-sm"
              />
            </div>
            <button className="bg-blue-700 text-white px-8 py-3.5 rounded-full font-bold hover:bg-blue-800 transition shadow-md w-full md:w-auto">
              {isEn ? 'Search' : 'Rechercher'}
            </button>
          </div>
          
        </div>
      </div>

      {/* CONTENU PRINCIPAL : 1915 offres trouvées... */}
      <main className="max-w-7xl mx-auto mt-8 px-4 flex flex-col md:flex-row gap-8">
        
        {/* 2. COLONNE DE GAUCHE : FILTRES */}
        <aside className="w-full md:w-70 shrink-0">
          
          {/* Bloc de filtre : Date */}
          <div className="bg-white border border-gray-200 rounded-lg mb-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Date de publication</h3>
              <span className="text-gray-400">⌃</span>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="radio" name="date" className="w-4 h-4 text-blue-700 focus:ring-blue-500 border-gray-300" />
                  <span className="text-gray-700 text-sm group-hover:text-black">{isEn ? 'Less than 24h' : 'Moins de 24h'}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">160</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="radio" name="date" className="w-4 h-4 text-blue-700 focus:ring-blue-500 border-gray-300" />
                  <span className="text-gray-700 text-sm group-hover:text-black">{isEn ? 'Less than 7 days' : 'Moins de 7 jours'}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">893</span>
              </label>
            </div>
          </div>

          {/* Bloc de filtre : Type de contrat */}
          <div className="bg-white border border-gray-200 rounded-lg mb-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Type de contrat</h3>
              <span className="text-gray-400">⌃</span>
            </div>
            <div className="p-4 space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-700 rounded focus:ring-blue-500 border-gray-300" />
                  <span className="text-gray-700 text-sm group-hover:text-black">{isEn ? 'Permanent / Full-time' : 'CDI / Temps plein'}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">1026</span>
              </label>
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="w-4 h-4 text-blue-700 rounded focus:ring-blue-500 border-gray-300" />
                  <span className="text-gray-700 text-sm group-hover:text-black">{isEn ? 'Small jobs (Informal)' : 'Petit Boulot (Informel)'}</span>
                </div>
                <span className="bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded">342</span>
              </label>
            </div>
          </div>

          {/* Bloc de filtre : Salaire */}
          <div className="bg-white border border-gray-200 rounded-lg mb-4">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center cursor-pointer hover:bg-gray-50">
              <h3 className="font-bold text-gray-900 text-sm">Salaire</h3>
              <span className="text-gray-400">⌃</span>
            </div>
            <div className="p-4">
              <p className="text-xs text-gray-500 mb-4">{isEn ? 'Set your desired minimum salary.' : 'Fixez le salaire minimum souhaite.'}</p>
              <button className="w-full bg-blue-50 text-blue-700 font-bold text-sm py-2 rounded-full hover:bg-blue-100 transition">
                {isEn ? 'Set salary' : 'Definir le salaire'}
              </button>
            </div>
          </div>

        </aside>

        {/* 3. COLONNE DE DROITE : LISTE DES ANNONCES */}
        <section className="flex-1">
          
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-medium text-gray-700">
              <span className="font-bold text-gray-900">4 {isEn ? 'jobs' : 'offres'}</span> {isEn ? 'found' : 'trouvees'}
            </h2>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span>{isEn ? 'Sort by:' : 'Trier par :'}</span>
              <select className="bg-transparent font-bold text-gray-900 focus:outline-none cursor-pointer">
                <option>{isEn ? 'Relevance' : 'Pertinence'}</option>
                <option>{isEn ? 'Date' : 'Date'}</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            {annonces.map((annonce) => (
              <div key={annonce.id} className="space-y-2">
                <div className="bg-white p-5 rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition relative group">
                  
                  <div className="flex justify-between items-start">
                    {/* Infos principales */}
                    <div className="flex-1 pr-4">
                      <Link href={localizePath(`/annonce/${annonce.id}`)}>
                        <h3 className="text-[18px] font-bold text-blue-700 hover:underline cursor-pointer mb-2">
                          {annonce.titre}
                        </h3>
                      </Link>
                      
                      {/* Ligne des icônes (Entreprise, Lieu, Contrat) */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <span className="text-gray-400">🏢</span> {annonce.entreprise}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <span className="text-gray-400">📍</span> {annonce.lieu}
                        </div>
                        <div className="flex items-center gap-1.5 text-sm text-gray-700">
                          <span className="text-gray-400">💼</span> {annonce.type}
                        </div>
                      </div>

                      <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed mb-4">
                        {annonce.description}
                      </p>

                      <div className="text-xs text-gray-500">
                        {annonce.temps}
                      </div>
                    </div>

                    {/* Logo de l'entreprise */}
                    <div className="w-14 h-14 border border-gray-100 rounded bg-white flex items-center justify-center font-bold text-gray-400 text-lg shadow-sm shrink-0">
                      {annonce.logo}
                    </div>
                  </div>

                  {/* Bouton Coeur (Sauvegarder) */}
                  <button className="absolute bottom-5 right-5 text-gray-300 hover:text-red-500 transition">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                    </svg>
                  </button>

                </div>
              </div>
            ))}
          </div>
          
        </section>

      </main>
      <Footer />
    </div>
  );
}