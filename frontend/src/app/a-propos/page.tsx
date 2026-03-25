"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function AProposPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#DA7756] to-[#A8502F] text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'About Bolo237' : 'A propos de Bolo237'}
            </h1>
            <p className="text-lg text-[#FEEBD6] max-w-xl mx-auto">
              {isEn
                ? 'The new generation platform dedicated to jobs and local services in Cameroon.'
                : 'La plateforme nouvelle generation dediee a l\'emploi et aux services de proximite au Cameroun.'}
            </p>
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
            {isEn ? 'Our Mission' : 'Notre Mission'}
          </h2>
          <p className="text-gray-700 leading-relaxed mb-6">
            {isEn
              ? 'Welcome to Bolo237, the new generation platform dedicated to jobs and local services in Cameroon. Our mission is simple: instantly connect those who have a need with those who have the talent to answer it.'
              : 'Bienvenue sur Bolo237, la plateforme nouvelle generation dediee a l\'emploi et aux services de proximite au Cameroun. Notre mission est simple : connecter instantanement ceux qui ont un besoin avec ceux qui ont le talent pour y repondre.'}
          </p>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'Whether you are a company looking for the perfect candidate, an individual needing a qualified artisan, or a talent seeking your next opportunity, Bolo237 is your bridge of trust.'
              : 'Que vous soyez une entreprise cherchant la perle rare, un particulier ayant besoin d\'un artisan qualifie, ou un talent cherchant sa prochaine opportunite, Bolo237 est votre pont de confiance.'}
          </p>
        </section>

        {/* Pourquoi */}
        <section className="bg-[#FFF5EF] py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
              {isEn ? 'Why Bolo237?' : 'Pourquoi Bolo237 ?'}
            </h2>
            <p className="text-gray-700 leading-relaxed mb-8">
              {isEn
                ? 'We noticed that finding a reliable worker or landing a contract was often an obstacle course. So we created a modern, fast, and accessible tool right from your phone, without unnecessary intermediaries.'
                : 'Nous avons constate que trouver un travailleur fiable ou decrocher un contrat relevait souvent du parcours du combattant. Nous avons donc cree un outil moderne, rapide et accessible directement depuis votre telephone, sans intermediaire inutile.'}
            </p>

            <h3 className="text-xl font-bold text-gray-900 mb-6">
              {isEn ? 'Our Three Pillars' : 'Nos trois piliers'}
            </h3>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Confiance */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#FEEBD6]">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  🛡️
                </div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {isEn ? 'Trust (Identity Shield)' : 'La Confiance (Identity Shield)'}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'We meticulously verify the profiles of our artisans and companies (ID, legal documents) to guarantee a safe ecosystem.'
                    : 'Nous verifions meticulesement les profils de nos artisans et entreprises (CNI, documents legaux) pour garantir un ecosysteme sur.'}
                </p>
              </div>

              {/* Rapidite */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#FEEBD6]">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  ⚡
                </div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {isEn ? 'Speed' : 'La Rapidite'}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'Thanks to our WhatsApp integration, connections happen in real time.'
                    : 'Grace a notre integration WhatsApp, les mises en relation se font en temps reel.'}
                </p>
              </div>

              {/* Accessibilite */}
              <div className="bg-white rounded-xl p-6 shadow-sm border border-[#FEEBD6]">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  📱
                </div>
                <h4 className="font-bold text-gray-900 mb-2">
                  {isEn ? 'Accessibility' : 'L\'Accessibilite'}
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'A platform designed for the local market, lightweight and easy to use, even with an unstable connection.'
                    : 'Une plateforme pensee pour le marche local, legere et facile a utiliser, meme avec une connexion instable.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Tagline */}
        <section className="py-12 px-4 text-center">
          <p className="text-xl font-bold text-[#C4623F]">
            {isEn
              ? 'Bolo237 — Cameroonian talent, one click away.'
              : 'Bolo237, c\'est le talent camerounais, a portee de clic.'}
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
}
