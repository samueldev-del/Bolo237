"use client";

import { use } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

type CandidatParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function FicheCandidatPage({ params }: CandidatParams) {
  const { id } = use(params);
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const profil = {
    id,
    nom: 'Alain Tchoumi',
    titre: 'Developpeur Web Fullstack (React / Node.js)',
    localisation: 'Douala, Akwa',
    experienceTotale: '3 ans',
    disponibilite: 'Immediatement',
    bio: 'Passionne par les applications web performantes, je conçois et deploye des solutions robustes en environnement agile. J aime transformer un besoin metier en produit concret, stable et utile.',
    telephone: '+237 6XX XX XX XX',
    email: 'alain.tchoumi@email.com',
    competences: ['React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'Git'],
    langues: ['Francais (Courant)', 'Anglais (Professionnel)'],
    experiences: [
      {
        poste: 'Developpeur Frontend',
        entreprise: 'TechCamer Solutions',
        date: 'Janv 2023 - Aujourd hui',
        description: 'Developpement des interfaces metier, integration API REST et optimisation des performances front.',
      },
      {
        poste: 'Developpeur Web',
        entreprise: 'Digital Start',
        date: 'Juin 2021 - Dec 2022',
        description: 'Creation de plateformes vitrines et e-commerce, maintenance corrective et evolutive.',
      },
    ],
    formations: [
      {
        diplome: 'Master Informatique',
        ecole: 'Universite de Douala',
        date: '2019 - 2021',
      },
      {
        diplome: 'Licence Informatique de Gestion',
        ecole: 'Universite de Douala',
        date: '2016 - 2019',
      },
    ],
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/cvtheque" className="text-sm font-bold text-gray-600 hover:text-green-700">
            Retour a la CVtheque
          </Link>
          <p className="text-xs text-gray-400 font-bold">ID #{profil.id}</p>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-extrabold">{profil.nom}</h1>
                <p className="text-lg font-bold text-gray-700 mt-1">{profil.titre}</p>
                <p className="text-sm text-gray-500 mt-1">{profil.localisation} • Experience: {profil.experienceTotale}</p>
                <span className="inline-flex mt-3 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100 text-xs font-extrabold uppercase">
                  {profil.disponibilite}
                </span>
              </div>

              <button className="bg-green-600 hover:bg-green-700 text-white font-extrabold px-6 py-3 rounded-xl transition">
                Contacter le candidat
              </button>
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-3">Resume du candidat</h2>
            <p className="text-gray-700 leading-relaxed">{profil.bio}</p>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Parcours professionnel</h2>
            <div className="space-y-5">
              {profil.experiences.map((exp) => (
                <div key={exp.poste} className="relative pl-6 border-l-2 border-gray-200">
                  <div className="absolute w-3 h-3 bg-green-600 rounded-full -left-[7px] top-1"></div>
                  <h3 className="font-extrabold text-black">{exp.poste}</h3>
                  <p className="text-sm font-bold text-gray-700">{exp.entreprise}</p>
                  <p className="text-xs text-gray-500 mb-2">{exp.date}</p>
                  <p className="text-sm text-gray-700">{exp.description}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Formation</h2>
            <div className="space-y-4">
              {profil.formations.map((form) => (
                <div key={form.diplome} className="border-b border-gray-100 pb-3 last:border-b-0">
                  <p className="font-extrabold">{form.diplome}</p>
                  <p className="text-sm text-gray-700">{form.ecole}</p>
                  <p className="text-xs text-gray-500">{form.date}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="text-xl font-extrabold mb-4">Langues</h2>
            <div className="flex flex-wrap gap-2">
              {profil.langues.map((langue) => (
                <span key={langue} className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold">
                  {langue}
                </span>
              ))}
            </div>
          </article>
        </section>

        <aside className="space-y-4 h-fit md:sticky md:top-6">
          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-3">Coordonnees du candidat</h3>
            <p className="text-sm text-gray-700 mb-1"><span className="font-bold">Email:</span> {profil.email}</p>
            <p className="text-sm text-gray-700 mb-3"><span className="font-bold">Telephone:</span> {profil.telephone}</p>
            <p className="text-xs font-bold text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
              Regle de lancement: acces gratuit aux coordonnees pour toutes les entreprises.
            </p>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-3">Actions rapides</h3>
            <button className="w-full bg-black text-white font-extrabold py-3 rounded-xl hover:bg-gray-800 transition mb-2">
              Proposer une offre
            </button>
            <button className="w-full bg-white text-black border border-gray-300 font-extrabold py-3 rounded-xl hover:border-gray-400 transition">
              Telecharger le CV (PDF)
            </button>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-3">Competences cles</h3>
            <div className="flex flex-wrap gap-2">
              {profil.competences.map((comp) => (
                <span key={comp} className="px-2.5 py-1 rounded-lg bg-gray-100 text-gray-700 text-xs font-bold">
                  {comp}
                </span>
              ))}
            </div>
          </article>
        </aside>
      </main>
    </div>
  );
}
