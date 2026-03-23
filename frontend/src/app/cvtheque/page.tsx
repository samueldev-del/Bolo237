"use client";

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';
import { fetchCandidateProfiles } from '@/lib/api';

type Candidate = {
  id: number;
  nom: string;
  titre: string;
  localisation: string;
  experience: 'Junior' | 'Confirme' | 'Senior';
  disponibilite: 'Immediatement' | 'Sous 1 mois' | 'A l ecoute du marche';
  etudes: 'Bac' | 'Bac+2' | 'Bac+3' | 'Bac+5';
  cvMajJours: number;
  competences: string[];
  disponibleNow: boolean;
  photo?: string;
};

const candidatsData: Candidate[] = [
  {
    id: 101,
    nom: 'Alain Tchoumi',
    titre: 'Developpeur Web Fullstack',
    localisation: 'Douala',
    experience: 'Confirme',
    disponibilite: 'Immediatement',
    etudes: 'Bac+5',
    cvMajJours: 4,
    competences: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker'],
    disponibleNow: true,
  },
  {
    id: 102,
    nom: 'Mireille Essono',
    titre: 'Chef de projet digital',
    localisation: 'Yaounde',
    experience: 'Senior',
    disponibilite: 'Sous 1 mois',
    etudes: 'Bac+5',
    cvMajJours: 18,
    competences: ['Gestion de projet', 'Agile', 'Scrum', 'Reporting'],
    disponibleNow: false,
    photo: '/vercel.svg',
  },
  {
    id: 103,
    nom: 'Kevin Moukoko',
    titre: 'Technicien support IT',
    localisation: 'Douala',
    experience: 'Junior',
    disponibilite: 'A l ecoute du marche',
    etudes: 'Bac+2',
    cvMajJours: 33,
    competences: ['Helpdesk', 'Windows', 'Reseaux', 'Office 365'],
    disponibleNow: false,
  },
  {
    id: 104,
    nom: 'Christelle N.',
    titre: 'Comptable generale',
    localisation: 'Bafoussam',
    experience: 'Confirme',
    disponibilite: 'Immediatement',
    etudes: 'Bac+3',
    cvMajJours: 9,
    competences: ['Comptabilite', 'Sage', 'Fiscalite', 'Excel'],
    disponibleNow: true,
  },
];

export default function CvthequePage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const [apiCandidats, setApiCandidats] = useState<Candidate[]>([]);
  const [keywords, setKeywords] = useState('');
  const [localisation, setLocalisation] = useState('');
  const [saved, setSaved] = useState<number[]>([]);
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'experience' | 'availability' | 'alpha'>('recent');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 3;

  const [expFilters, setExpFilters] = useState<string[]>([]);
  const [dispoFilters, setDispoFilters] = useState<string[]>([]);
  const [etudeFilters, setEtudeFilters] = useState<string[]>([]);
  const [actif30Jours, setActif30Jours] = useState(false);

  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const rows = await fetchCandidateProfiles();
        const mapped = rows.map((cand) => ({
          id: cand.id,
          nom: cand.nom,
          titre: cand.titre,
          localisation: cand.localisation,
          experience: cand.experience,
          disponibilite: cand.disponibilite,
          etudes: cand.etudes,
          cvMajJours: cand.cvMajJours,
          competences: cand.competences,
          disponibleNow: cand.disponibleNow,
        })) as Candidate[];
        setApiCandidats(mapped);
      } catch {
        setApiCandidats([]);
      }
    };

    loadCandidates();
  }, []);

  const allCandidates = useMemo(() => {
    const ids = new Set<number>();
    const merged: Candidate[] = [];

    [...apiCandidats, ...candidatsData].forEach((cand) => {
      if (!ids.has(cand.id)) {
        ids.add(cand.id);
        merged.push(cand);
      }
    });

    return merged;
  }, [apiCandidats]);

  const toggleFilter = (value: string, state: string[], setState: (v: string[]) => void) => {
    if (state.includes(value)) {
      setState(state.filter((item) => item !== value));
      return;
    }
    setState([...state, value]);
  };

  const candidats = useMemo(() => {
    const key = keywords.trim().toLowerCase();
    const loc = localisation.trim().toLowerCase();

    return allCandidates.filter((cand) => {
      const keywordPass =
        !key ||
        cand.titre.toLowerCase().includes(key) ||
        cand.competences.some((skill) => skill.toLowerCase().includes(key));

      const locPass = !loc || cand.localisation.toLowerCase().includes(loc);
      const expPass = expFilters.length === 0 || expFilters.includes(cand.experience);
      const dispoPass = dispoFilters.length === 0 || dispoFilters.includes(cand.disponibilite);
      const etudePass = etudeFilters.length === 0 || etudeFilters.includes(cand.etudes);
      const actifPass = !actif30Jours || cand.cvMajJours <= 30;

      return keywordPass && locPass && expPass && dispoPass && etudePass && actifPass;
    });
  }, [keywords, localisation, expFilters, dispoFilters, etudeFilters, actif30Jours, allCandidates]);

  const candidatsTries = useMemo(() => {
    const copy = [...candidats];

    if (sortBy === 'recent') {
      copy.sort((a, b) => a.cvMajJours - b.cvMajJours);
      return copy;
    }

    if (sortBy === 'oldest') {
      copy.sort((a, b) => b.cvMajJours - a.cvMajJours);
      return copy;
    }

    if (sortBy === 'availability') {
      copy.sort((a, b) => Number(b.disponibleNow) - Number(a.disponibleNow) || a.cvMajJours - b.cvMajJours);
      return copy;
    }

    if (sortBy === 'alpha') {
      copy.sort((a, b) => a.nom.localeCompare(b.nom));
      return copy;
    }

    const rank: Record<Candidate['experience'], number> = {
      Junior: 1,
      Confirme: 2,
      Senior: 3,
    };
    copy.sort((a, b) => rank[b.experience] - rank[a.experience] || a.cvMajJours - b.cvMajJours);
    return copy;
  }, [candidats, sortBy]);

  const totalPages = Math.max(1, Math.ceil(candidatsTries.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const start = (effectivePage - 1) * pageSize;
  const end = start + pageSize;
  const candidatsPage = candidatsTries.slice(start, end);

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-10">
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl md:text-3xl font-extrabold mb-4">{isEn ? 'Recruiter CV Database' : 'CVtheque RH'}</h1>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder={isEn ? 'Keywords: skills, job title' : 'Mots-cles: competences, intitule de poste'}
              className="md:col-span-2 border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
            <input
              value={localisation}
              onChange={(e) => setLocalisation(e.target.value)}
              placeholder={isEn ? 'Location' : 'Localisation'}
              className="border border-gray-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        <aside className="w-full lg:w-80 shrink-0">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 space-y-6 sticky top-6">
            <div>
              <h2 className="text-sm font-extrabold uppercase text-gray-500 mb-3">{isEn ? 'Experience level' : 'Niveau d experience'}</h2>
              <div className="space-y-2 text-sm">
                {['Junior', 'Confirme', 'Senior'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={expFilters.includes(item)}
                      onChange={() => toggleFilter(item, expFilters, setExpFilters)}
                      className="accent-green-600"
                    />
                    {item === 'Junior' ? 'Junior (0-2 ans)' : item === 'Confirme' ? 'Confirme (3-5 ans)' : 'Senior (+5 ans)'}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold uppercase text-gray-500 mb-3">{isEn ? 'Availability' : 'Disponibilite'}</h2>
              <div className="space-y-2 text-sm">
                {['Immediatement', 'Sous 1 mois', 'A l ecoute du marche'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={dispoFilters.includes(item)}
                      onChange={() => toggleFilter(item, dispoFilters, setDispoFilters)}
                      className="accent-green-600"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold uppercase text-gray-500 mb-3">{isEn ? 'Education level' : 'Niveau d etudes'}</h2>
              <div className="space-y-2 text-sm">
                {['Bac', 'Bac+2', 'Bac+3', 'Bac+5'].map((item) => (
                  <label key={item} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={etudeFilters.includes(item)}
                      onChange={() => toggleFilter(item, etudeFilters, setEtudeFilters)}
                      className="accent-green-600"
                    />
                    {item}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-extrabold uppercase text-gray-500 mb-3">{isEn ? 'Profile activity' : 'Activite du profil'}</h2>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={actif30Jours}
                  onChange={() => setActif30Jours(!actif30Jours)}
                  className="accent-green-600"
                />
                {isEn ? 'Active in the last 30 days' : 'Actif ces 30 derniers jours'}
              </label>
            </div>
          </div>
        </aside>

        <section className="flex-1 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm md:text-base font-medium text-gray-700">
              <span className="font-extrabold text-black">{candidatsTries.length}</span> {isEn ? 'profiles found' : 'profils trouves'}
            </h2>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value as 'recent' | 'oldest' | 'experience' | 'availability' | 'alpha');
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
            >
              <option value="recent">{isEn ? 'Sort: Most recent CVs' : 'Tri: CV les plus recents'}</option>
              <option value="oldest">{isEn ? 'Sort: Oldest CVs' : 'Tri: CV les plus anciens'}</option>
              <option value="experience">{isEn ? 'Sort: Experience level' : 'Tri: Niveau d experience'}</option>
              <option value="availability">{isEn ? 'Sort: Immediate availability' : 'Tri: Disponibilite immediate'}</option>
              <option value="alpha">{isEn ? 'Sort: Alphabetical order' : 'Tri: Ordre alphabetique'}</option>
            </select>
          </div>

          {candidatsPage.map((cand) => (
            <article key={cand.id} className="bg-white border border-gray-200 rounded-2xl p-5">
              <div className="flex flex-col md:flex-row md:items-start gap-4">
                <div className="w-16 h-16 rounded-full border border-gray-200 bg-gray-100 flex items-center justify-center overflow-hidden text-xl font-extrabold text-gray-500">
                  {cand.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={cand.photo} alt={cand.nom} className="w-full h-full object-cover" />
                  ) : (
                    cand.nom.charAt(0)
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-wrap gap-2 items-center justify-between">
                    <div>
                      <h3 className="text-lg font-extrabold text-black">{cand.nom}</h3>
                      <p className="text-sm font-bold text-gray-700">{cand.titre}</p>
                      <p className="text-sm text-gray-500">{cand.localisation}</p>
                    </div>

                    {cand.disponibleNow && (
                      <span className="inline-flex px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-extrabold uppercase">
                        Disponible immediatement
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-3">
                    {cand.competences.slice(0, 5).map((skill) => (
                      <span key={skill} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                        {skill}
                      </span>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2 mt-4">
                    <button
                      onClick={() => setSaved((prev) => (prev.includes(cand.id) ? prev.filter((id) => id !== cand.id) : [...prev, cand.id]))}
                      className={`px-4 py-2 rounded-lg text-sm font-bold border transition ${saved.includes(cand.id) ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'}`}
                    >
                      {saved.includes(cand.id) ? (isEn ? 'Profile saved' : 'Profil sauvegarde') : (isEn ? 'Save profile' : 'Sauvegarder le profil')}
                    </button>

                    <Link href={localizePath(`/candidat/${cand.id}`)} className="px-4 py-2 rounded-lg text-sm font-extrabold bg-black text-white hover:bg-gray-800 transition">
                      {isEn ? 'View CV' : 'Voir le CV'}
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}

          {candidatsTries.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-gray-600 font-medium">
              {isEn ? 'No profile matches your current filters.' : 'Aucun profil ne correspond a vos filtres actuels.'}
            </div>
          )}

          {candidatsTries.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <p className="text-sm text-gray-600 font-medium">
                {isEn
                  ? `Showing ${start + 1}-${Math.min(end, candidatsTries.length)} of ${candidatsTries.length}`
                  : `Affichage ${start + 1}-${Math.min(end, candidatsTries.length)} sur ${candidatsTries.length}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, effectivePage - 1))}
                  disabled={effectivePage === 1}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold disabled:opacity-40"
                >
                  {isEn ? 'Previous' : 'Precedent'}
                </button>

                {Array.from({ length: totalPages }).map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-9 h-9 rounded-lg text-sm font-extrabold border ${
                        page === effectivePage
                          ? 'bg-black text-white border-black'
                          : 'bg-white text-gray-700 border-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, effectivePage + 1))}
                  disabled={effectivePage === totalPages}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm font-bold disabled:opacity-40"
                >
                  {isEn ? 'Next' : 'Suivant'}
                </button>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}