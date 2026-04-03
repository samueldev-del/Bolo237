"use client";

import Link from 'next/link';
import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function PressePage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  const downloadAsPng = async (svgPath: string, filename: string, width = 800) => {
    try {
      const res = await fetch(svgPath);
      const svgText = await res.text();
      const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const ratio = img.naturalHeight / img.naturalWidth;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = Math.round(width * ratio);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((pngBlob) => {
          if (!pngBlob) return;
          const a = document.createElement('a');
          a.href = URL.createObjectURL(pngBlob);
          a.download = filename;
          a.click();
          URL.revokeObjectURL(a.href);
        }, 'image/png');
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch {
      // Fallback: download SVG directly
      const a = document.createElement('a');
      a.href = svgPath;
      a.download = filename.replace('.png', '.svg');
      a.click();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Presse', en: 'Press' }, path: '/presse' },
        ]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-[#C4623F] to-[#A8502F] text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <Link href={localizePath('/')} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/80 hover:text-white transition mb-6">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
              {isEn ? 'Back to home' : 'Retour a l\'accueil'}
            </Link>
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
            {/* Logo Pack */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  🖼️
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'HD Logo Pack' : 'Pack Logo Haute Definition'}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">PNG — {isEn ? 'High resolution' : 'Haute resolution'}</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Official versions in light and dark variants for print and web.'
                      : 'Versions officielles claires et sombres pour le print et le web.'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => downloadAsPng('/logo.svg', 'bolo237-logo.png', 1200)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition cursor-pointer"
                    >
                      <span>⬇</span> {isEn ? 'Logo (Color)' : 'Logo (Couleur)'}
                    </button>
                    <button
                      onClick={() => downloadAsPng('/logo-white.svg', 'bolo237-logo-white.png', 1200)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition cursor-pointer"
                    >
                      <span>⬇</span> {isEn ? 'Logo (White)' : 'Logo (Blanc)'}
                    </button>
                    <button
                      onClick={() => downloadAsPng('/logo-icon.svg', 'bolo237-icon.png', 800)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition cursor-pointer"
                    >
                      <span>⬇</span> {isEn ? 'Icon Only' : 'Icone seule'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Brand Colors */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  🎨
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Brand Color Palette' : 'Palette de Couleurs'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Official brand colors for consistent visual representation.'
                      : 'Couleurs officielles de la marque pour une representation visuelle coherente.'}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="text-center">
                      <div className="w-full h-10 rounded-lg bg-[#C4623F] mb-1"></div>
                      <p className="text-[10px] font-mono text-gray-500">#C4623F</p>
                      <p className="text-[10px] text-gray-400">{isEn ? 'Primary' : 'Primaire'}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full h-10 rounded-lg bg-[#DA7756] mb-1"></div>
                      <p className="text-[10px] font-mono text-gray-500">#DA7756</p>
                      <p className="text-[10px] text-gray-400">{isEn ? 'Accent' : 'Accent'}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full h-10 rounded-lg bg-[#FEEBD6] mb-1"></div>
                      <p className="text-[10px] font-mono text-gray-500">#FEEBD6</p>
                      <p className="text-[10px] text-gray-400">{isEn ? 'Light' : 'Clair'}</p>
                    </div>
                    <div className="text-center">
                      <div className="w-full h-10 rounded-lg bg-[#1F2937] mb-1"></div>
                      <p className="text-[10px] font-mono text-gray-500">#1F2937</p>
                      <p className="text-[10px] text-gray-400">{isEn ? 'Dark' : 'Sombre'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* App Screenshots */}
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
                    {isEn ? 'Mobile & Desktop — PNG' : 'Mobile et Desktop — PNG'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Curated visuals of key user journeys: hiring, candidate profile, and verification flow.'
                      : 'Visuels selectionnes des parcours cles : recrutement, profil candidat et verification.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Screenshots"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition"
                  >
                    <span>📧</span> {isEn ? 'Request by email' : 'Demander par email'}
                  </a>
                </div>
              </div>
            </div>

            {/* Founder Bio */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  👤
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Founder Biography' : 'Biographie du Fondateur'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Short and long biography of the founder available for editorial use in articles, podcasts, and interviews.'
                      : 'Biographie courte et longue du fondateur disponible pour usage editorial dans vos articles, podcasts et interviews.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Founder%20Bio"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition"
                  >
                    <span>📧</span> {isEn ? 'Request biography' : 'Demander la biographie'}
                  </a>
                </div>
              </div>
            </div>

            {/* Product Factsheet */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  📋
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Product Factsheet' : 'Fiche Produit'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'One-page summary of Bolo237: features, market positioning, technology stack, and competitive advantages.'
                      : 'Resume d\'une page de Bolo237 : fonctionnalites, positionnement marche, stack technologique et avantages concurrentiels.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Factsheet"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition"
                  >
                    <span>📧</span> {isEn ? 'Request factsheet' : 'Demander la fiche'}
                  </a>
                </div>
              </div>
            </div>

            {/* Video / Demo Reel */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  🎬
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Video / Demo Reel' : 'Video / Demo Reel'}
                  </p>
                  <p className="text-xs text-gray-500 mb-2">MP4 — 1080p</p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Short promotional video and product demo showcasing the main user flows of the Bolo237 platform.'
                      : 'Video promotionnelle courte et demo produit presentant les parcours utilisateurs principaux de la plateforme Bolo237.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Video"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition"
                  >
                    <span>📧</span> {isEn ? 'Request video assets' : 'Demander les videos'}
                  </a>
                </div>
              </div>
            </div>

            {/* Social Media Kit */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  📱
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Social Media Kit' : 'Kit Reseaux Sociaux'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Pre-formatted banners, profile images and post templates optimized for LinkedIn, Twitter/X, Facebook and Instagram.'
                      : 'Bannieres, images de profil et modeles de publications pre-formates et optimises pour LinkedIn, Twitter/X, Facebook et Instagram.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Social%20Media%20Kit"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#C4623F] bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg px-3 py-1.5 hover:bg-[#FEEBD6] transition"
                  >
                    <span>📧</span> {isEn ? 'Request social kit' : 'Demander le kit social'}
                  </a>
                </div>
              </div>
            </div>

            {/* Key Figures */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  📊
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Key Figures' : 'Chiffres Cles'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Use these figures when referencing Bolo237 in your publications.'
                      : 'Utilisez ces chiffres pour referencier Bolo237 dans vos publications.'}
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-[#FFF5EF] rounded-lg p-3 text-center">
                      <p className="text-lg font-extrabold text-[#C4623F]">2024</p>
                      <p className="text-[10px] text-gray-600">{isEn ? 'Year Founded' : 'Annee de creation'}</p>
                    </div>
                    <div className="bg-[#FFF5EF] rounded-lg p-3 text-center">
                      <p className="text-lg font-extrabold text-[#C4623F]">PWA</p>
                      <p className="text-[10px] text-gray-600">{isEn ? 'Technology' : 'Technologie'}</p>
                    </div>
                    <div className="bg-[#FFF5EF] rounded-lg p-3 text-center">
                      <p className="text-lg font-extrabold text-[#C4623F]">🇨🇲</p>
                      <p className="text-[10px] text-gray-600">{isEn ? 'Target Market' : 'Marche cible'}</p>
                    </div>
                    <div className="bg-[#FFF5EF] rounded-lg p-3 text-center">
                      <p className="text-lg font-extrabold text-[#C4623F]">KYC</p>
                      <p className="text-[10px] text-gray-600">{isEn ? 'Identity Verification' : 'Verification d\'identite'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Full Press Kit */}
            <div className="border border-gray-200 rounded-xl p-5 hover:border-[#DA7756] transition bg-white">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-[#FEEBD6] rounded-lg flex items-center justify-center text-xl shrink-0">
                  📁
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm mb-1">
                    {isEn ? 'Full Press Kit' : 'Kit Presse Complet'}
                  </p>
                  <p className="text-xs text-gray-600 mb-3">
                    {isEn
                      ? 'Get the complete package: founder biography, product factsheet, high-resolution visuals, and brand guidelines.'
                      : 'Recevez le package complet : biographie du fondateur, fiche produit, visuels haute resolution et charte graphique.'}
                  </p>
                  <a
                    href="mailto:contact@bolo237.com?subject=Press%20Kit%20Request%20-%20Full%20Kit"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-[#C4623F] rounded-lg px-4 py-2 hover:bg-[#A8502F] transition"
                  >
                    <span>📧</span> {isEn ? 'Request full press kit' : 'Demander le kit complet'}
                  </a>
                </div>
              </div>
            </div>
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
