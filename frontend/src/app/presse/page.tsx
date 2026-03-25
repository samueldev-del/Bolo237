"use client";

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function PressePage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#C4623F] to-[#A8502F] text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-[#FEEBD6] text-sm font-bold uppercase tracking-wider mb-2">
              {isEn ? 'Press Room' : 'Espace Presse'}
            </p>
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              Bolo237
            </h1>
            <p className="text-lg text-[#FEEBD6] max-w-xl mx-auto">
              {isEn
                ? 'The Progressive Web App that digitizes and secures the job and local services market in Cameroon.'
                : 'La Progressive Web App (PWA) qui digitalise et securise le marche de l\'emploi et des services locaux au Cameroun.'}
            </p>
          </div>
        </section>

        {/* Pitch */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
            {isEn ? 'The Pitch' : 'Le Pitch'}
          </h2>
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'By combining the power of web matchmaking with the immediacy of WhatsApp, Bolo237 eliminates friction between companies, artisans, and talents. Our platform is designed mobile-first for the Cameroonian market, accessible even on low-bandwidth networks.'
              : 'En combinant la puissance de la mise en relation web avec l\'immediatete de WhatsApp, Bolo237 elimine les frictions entre les entreprises, les artisans et les talents. Notre plateforme est concue mobile-first pour le marche camerounais, accessible meme sur les reseaux a faible bande passante.'}
          </p>
        </section>

        {/* Innovations */}
        <section className="bg-gray-50 py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-8">
              {isEn ? 'Key Innovations' : 'Nos Innovations Cles'}
            </h2>

            <div className="grid gap-6 md:grid-cols-3">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  🛡️
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Identity Shield</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'A strict verification process (full KYC with ID and video verification) to eradicate scams.'
                    : 'Un processus de verification strict (KYC complet avec piece d\'identite et verification video) pour eradiquer les arnaques.'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  📱
                </div>
                <h3 className="font-bold text-gray-900 mb-2">Mobile-First</h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'PWA technology that lets users install the app without going through app stores, optimized for local networks.'
                    : 'Une technologie PWA qui permet aux utilisateurs d\'installer l\'application sans passer par les Stores, optimisee pour les reseaux locaux.'}
                </p>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
                <div className="w-12 h-12 bg-[#FEEBD6] rounded-full flex items-center justify-center text-2xl mb-4">
                  💬
                </div>
                <h3 className="font-bold text-gray-900 mb-2">
                  {isEn ? 'Direct Communication' : 'Communication Directe'}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? 'No complex internal messaging — final connections are made directly and securely via WhatsApp.'
                    : 'Pas de messagerie interne complexe, la mise en relation finale se fait directement et de maniere securisee via WhatsApp.'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Ressources Media */}
        <section className="max-w-3xl mx-auto px-4 py-12">
          <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
            {isEn ? 'Media Resources' : 'Ressources Media'}
          </h2>
          <p className="text-sm text-gray-600 mb-6">
            {isEn
              ? 'Download or request our official communication assets for articles, TV/radio segments, and digital press coverage.'
              : 'Telechargez ou demandez nos elements officiels de communication pour vos articles, reportages TV/radio et couvertures digitales.'}
          </p>

          <div className="space-y-4">
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  🖼️
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'HD Logo Pack' : 'Pack Logo Haute Definition'}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">SVG, PNG, JPEG</p>
                  <p className="text-xs text-gray-600">
                    {isEn
                      ? 'Official versions in light and dark variants for print and web.'
                      : 'Versions officielles claires et sombres pour le print et le web.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  📸
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'App Screenshots' : 'Captures de l\'application'}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">
                    {isEn ? 'Mobile & Desktop' : 'Mobile et Desktop'}
                  </p>
                  <p className="text-xs text-gray-600">
                    {isEn
                      ? 'Curated visuals of key user journeys: hiring, candidate profile, and verification flow.'
                      : 'Visuels selectionnes des parcours cles : recrutement, profil candidat et verification.'}
                  </p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-500">
              {isEn
                ? 'Need the full press kit (founder bio, product factsheet, and visuals)? Contact us below.'
                : 'Besoin du kit presse complet (bio fondateur, fiche produit et visuels) ? Contactez-nous juste en dessous.'}
            </p>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-[#FFF5EF] py-12 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 mb-4">
              {isEn ? 'Press Contact' : 'Contact Presse'}
            </h2>
            <p className="text-gray-600 mb-6">
              {isEn
                ? 'For any interview request, partnership or additional information, contact our founding team:'
                : 'Pour toute demande d\'interview, de partenariat ou d\'informations supplementaires, contactez notre equipe fondatrice :'}
            </p>
            <div className="inline-flex flex-col items-center gap-3">
              <a
                href="mailto:contact@bolo237.com"
                className="inline-flex items-center gap-2 bg-white border border-[#E8C4B0] rounded-full px-6 py-3 font-bold text-[#C4623F] hover:bg-[#FEEBD6] transition text-sm"
              >
                <span>📧</span> contact@bolo237.com
              </a>
              <a
                href="tel:+4915124862693"
                className="inline-flex items-center gap-2 bg-white border border-[#E8C4B0] rounded-full px-6 py-3 font-bold text-[#C4623F] hover:bg-[#FEEBD6] transition text-sm"
              >
                <span>📱</span> +4915124862693
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
