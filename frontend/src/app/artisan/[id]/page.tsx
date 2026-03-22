"use client";

import { use, useState } from 'react';
import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

type ArtisanParams = {
  params: Promise<{
    id: string;
  }>;
};

export default function ArtisanVitrinePage({ params }: ArtisanParams) {
  const { id } = use(params);
  const { t, localizePath, locale } = useLocale();
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [translated, setTranslated] = useState(false);
  const [maskedByReports, setMaskedByReports] = useState(false);

  const artisan = {
    id,
    nom: 'Jean Mvondo',
    specialite: 'Menuisier Ebeniste',
    note: 4.8,
    avisCount: 37,
    verifie: true,
    whatsapp: '+237 6XX XX XX XX',
    couvertureLabel: 'Atelier Bois Deido - Realisations recentes',
    portfolio: ['Table sur mesure', 'Dressing moderne', 'Cuisine equipee', 'Porte en bois massif', 'Bureau professionnel', 'Meuble TV'],
    services: [
      { nom: 'Fabrication de meubles sur mesure', tarif: 'A partir de 80 000 FCFA' },
      { nom: 'Installation de cuisine en bois', tarif: 'Sur devis' },
      { nom: 'Reparation et restauration', tarif: 'A partir de 25 000 FCFA' },
      { nom: 'Pose de portes et placards', tarif: 'A partir de 40 000 FCFA' },
    ],
    avis: [
      {
        id: 1,
        auteur: 'Sonia K.',
        note: 5,
        date: '18 mars 2026',
        message: 'Travail propre et livre dans les delais. Tres satisfaite de la finition.',
      },
      {
        id: 2,
        auteur: 'Didier T.',
        note: 4,
        date: '12 mars 2026',
        message: 'Bonne communication, devis clair et execution serieuse.',
      },
      {
        id: 3,
        auteur: 'Clarisse M.',
        note: 5,
        date: '03 mars 2026',
        message: 'Excellent rapport qualite-prix. Je recommande sans hesitation.',
      },
      {
        id: 4,
        auteur: 'Bruno E.',
        note: 4,
        date: '24 fevrier 2026',
        message: 'Intervention rapide et artisan ponctuel.',
      },
    ],
  };

  const artisanTranslated = {
    nom: 'John Mvondo',
    specialite: 'Cabinet Maker',
    couvertureLabel: 'Deido Wood Workshop - Recent projects',
    portfolio: ['Custom table', 'Modern wardrobe', 'Fitted kitchen', 'Solid wood door', 'Office desk', 'TV stand'],
    services: [
      { nom: 'Custom furniture making', tarif: 'From 80,000 XAF' },
      { nom: 'Wood kitchen installation', tarif: 'On quotation' },
      { nom: 'Repair and restoration', tarif: 'From 25,000 XAF' },
      { nom: 'Door and closet installation', tarif: 'From 40,000 XAF' },
    ],
  };

  const display = translated
    ? artisanTranslated
    : {
        nom: artisan.nom,
        specialite: artisan.specialite,
        couvertureLabel: artisan.couvertureLabel,
        portfolio: artisan.portfolio,
        services: artisan.services,
      };

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-24 md:pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')} className="font-extrabold text-xl tracking-tight">
            237jobs
          </Link>
          <Link href={localizePath('/recherche')} className="text-sm font-bold text-gray-600 hover:text-green-700">
            {locale === 'fr' ? 'Retour a la recherche' : 'Back to search'}
          </Link>
        </div>
      </nav>

      <header className="max-w-6xl mx-auto px-4 mt-6">
        <div className="relative rounded-3xl overflow-hidden border border-gray-200 bg-white">
          <div className="h-48 md:h-64 bg-gradient-to-r from-amber-100 via-white to-green-100 flex items-center justify-center text-gray-700 font-bold text-sm">
            {display.couvertureLabel}
          </div>

          <div className="px-6 pb-6">
            <div className="-mt-12 md:-mt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div className="flex items-end gap-4">
                <div className="w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-white bg-gray-100 flex items-center justify-center text-3xl shadow-sm">
                  👨🏾‍🔧
                </div>
                <div className="pb-1">
                  <h1 className="text-2xl md:text-3xl font-extrabold">{display.nom}</h1>
                  <p className="text-gray-700 font-bold">{display.specialite}</p>
                  <button
                    onClick={() => setTranslated((s) => !s)}
                    className="mt-2 inline-flex text-xs font-extrabold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full hover:bg-green-100 transition"
                  >
                    ✨ {locale === 'fr' ? (translated ? 'Voir la version originale' : t.home.translateProfile) : (translated ? 'Show original version' : t.home.translateProfile)}
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-amber-500 font-extrabold">⭐ {artisan.note}</span>
                <span className="text-sm font-bold text-gray-600">({artisan.avisCount} avis)</span>
                {artisan.verifie && (
                  <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-green-50 text-green-700 border border-green-100">
                    Profil Verifie
                  </span>
                )}
              </div>
            </div>

            <div className="hidden md:flex gap-3 mt-6">
              <a
                href={`https://wa.me/${artisan.whatsapp.replace(/\s|\+/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-white font-extrabold px-6 py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
              >
                {maskedByReports ? t.security.profileMaskedCta : t.security.contactWhatsapp}
              </a>
              <button
                onClick={() => setShowQuoteForm((s) => !s)}
                disabled={maskedByReports}
                className="border border-gray-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed hover:border-gray-400 bg-white text-black font-extrabold px-6 py-3 rounded-xl transition"
              >
                {t.security.requestQuote}
              </button>
            </div>

            {showQuoteForm && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-2xl p-4">
                <h2 className="font-extrabold mb-3">Demande de devis rapide</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Votre nom" />
                  <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm" placeholder="Votre numero" />
                  <textarea className="md:col-span-2 border border-gray-300 rounded-lg px-3 py-2 text-sm" rows={3} placeholder="Decrivez votre besoin" />
                </div>
                <button className="mt-3 bg-black text-white font-bold px-5 py-2 rounded-lg">Envoyer</button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        {maskedByReports && (
          <section className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-extrabold text-sm">
              {t.security.autoMaskedArtisan}
            </p>
          </section>
        )}

        <section className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <p className="text-amber-800 font-extrabold text-sm">
            {t.security.artisanWarning}
          </p>
        </section>

        <section>
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'Portfolio' : 'Portfolio'}</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {display.portfolio.map((item) => (
              <div key={item} className="rounded-2xl overflow-hidden border border-gray-200 bg-white">
                <div className="h-32 md:h-40 bg-gray-100 flex items-center justify-center text-3xl">🪵</div>
                <p className="p-3 text-sm font-bold text-gray-700">{item}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">{locale === 'fr' ? 'Services et tarifs' : 'Services and pricing'}</h2>
          <div className="space-y-3">
            {display.services.map((service) => (
              <div key={service.nom} className="flex flex-col md:flex-row md:items-center md:justify-between gap-1 border-b border-gray-100 pb-3">
                <p className="font-bold text-gray-800">{service.nom}</p>
                <p className="text-sm font-extrabold text-green-700">{service.tarif}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="text-xl md:text-2xl font-extrabold mb-4">Avis clients recents</h2>
          <div className="space-y-4">
            {artisan.avis.map((avis) => (
              <article key={avis.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="font-extrabold">{avis.auteur}</p>
                  <p className="text-xs text-gray-500 font-bold">{avis.date}</p>
                </div>
                <p className="text-amber-500 text-sm mb-2">{'★'.repeat(avis.note)}{'☆'.repeat(5 - avis.note)}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{avis.message}</p>
              </article>
            ))}
          </div>
        </section>

      </main>

      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <div className="grid grid-cols-2 gap-2">
          <a
            href={`https://wa.me/${artisan.whatsapp.replace(/\s|\+/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-white text-center font-extrabold py-3 rounded-xl transition ${maskedByReports ? 'bg-gray-300 pointer-events-none' : 'bg-[#25D366] hover:bg-[#1fab53]'}`}
          >
            {maskedByReports ? t.security.profileMaskedCta : 'WhatsApp'}
          </a>
          <button
            onClick={() => setShowQuoteForm((s) => !s)}
            disabled={maskedByReports}
            className="bg-black disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-gray-800 text-white font-extrabold py-3 rounded-xl transition"
          >
            {t.security.requestQuote}
          </button>
        </div>
      </div>
    </div>
  );
}
