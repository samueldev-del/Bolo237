"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function CookiesPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const sections = [
    {
      num: 1,
      title: isEn ? 'What is a Cookie?' : 'Qu\u2019est-ce qu\u2019un cookie\u00a0?',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'A cookie is a small text file stored on your device (computer, smartphone, or tablet) when you visit a website. Cookies allow the site to remember technical information such as your session, security state, and consent choices over time, so you do not have to re-enter them on each visit.'
            : 'Un cookie est un petit fichier texte stock\u00e9 sur votre appareil (ordinateur, smartphone ou tablette) lorsque vous visitez un site web. Les cookies permettent au site de m\u00e9moriser des informations techniques comme votre session, l\u2019\u00e9tat de s\u00e9curit\u00e9 et vos choix de consentement, afin que vous n\u2019ayez pas \u00e0 les ressaisir \u00e0 chaque visite.'}
        </p>
      ),
    },
    {
      num: 2,
      title: isEn ? 'Types of Cookies Used' : 'Types de cookies utilis\u00e9s',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-4">
            {isEn
              ? 'Bolo237 uses the following categories of cookies:'
              : 'Bolo237 utilise les cat\u00e9gories de cookies suivantes\u00a0:'}
          </p>

          <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
            {isEn ? 'Essential / Technical Cookies' : 'Cookies essentiels / techniques'}
          </p>
          <ul className="space-y-2 mb-4">
            {[
              isEn
                ? 'User session management (authentication, login state)'
                : 'Gestion de la session utilisateur (authentification, \u00e9tat de connexion)',
              isEn
                ? 'Cookie consent choice recording'
                : 'Enregistrement du choix de consentement aux cookies',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>

          <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
            {isEn ? 'Performance Cookies' : 'Cookies de performance'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            {isEn
              ? 'Anonymous browsing statistics may be collected to help us understand how visitors use the platform and improve the user experience. These cookies do not identify you personally.'
              : 'Des statistiques de navigation anonymes peuvent \u00eatre collect\u00e9es pour nous aider \u00e0 comprendre comment les visiteurs utilisent la plateforme et am\u00e9liorer l\u2019exp\u00e9rience utilisateur. Ces cookies ne vous identifient pas personnellement.'}
          </p>

          <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
            {isEn ? 'Functional Cookies' : 'Cookies fonctionnels'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            {isEn
              ? 'These cookies are reserved for optional interface preferences such as display options when such features are enabled in the future.'
              : 'Ces cookies sont r\u00e9serv\u00e9s \u00e0 d\u2019\u00e9ventuelles pr\u00e9f\u00e9rences d\u2019interface non essentielles, comme certaines options d\u2019affichage, si ces fonctions sont activ\u00e9es plus tard.'}
          </p>

          <div className="bg-[#FFF5EF] border border-[#E8C4B0] rounded-lg p-4">
            <p className="text-gray-700 leading-relaxed font-semibold">
              {isEn
                ? 'Note: Bolo237 does NOT use advertising cookies or third-party tracking cookies.'
                : 'Note\u00a0: Bolo237 n\u2019utilise PAS de cookies publicitaires ni de cookies de suivi tiers.'}
            </p>
          </div>
        </>
      ),
    },
    {
      num: 3,
      title: isEn ? 'Detailed Cookie List' : 'Liste d\u00e9taill\u00e9e des cookies',
      content: (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-200 px-4 py-2 text-sm font-bold text-gray-900">
                  Cookie
                </th>
                <th className="border border-gray-200 px-4 py-2 text-sm font-bold text-gray-900">
                  {isEn ? 'Purpose' : 'Finalit\u00e9'}
                </th>
                <th className="border border-gray-200 px-4 py-2 text-sm font-bold text-gray-900">
                  {isEn ? 'Type' : 'Type'}
                </th>
                <th className="border border-gray-200 px-4 py-2 text-sm font-bold text-gray-900">
                  {isEn ? 'Duration' : 'Dur\u00e9e'}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-50">
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700 font-mono">
                  bolo237_session
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? 'User session' : 'Session utilisateur'}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? 'Essential' : 'Essentiel'}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? 'Session duration' : 'Dur\u00e9e de la session'}
                </td>
              </tr>
              <tr>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700 font-mono">
                  cookieConsent
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? 'Cookie consent choice' : 'Choix de consentement cookies'}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? 'Essential' : 'Essentiel'}
                </td>
                <td className="border border-gray-200 px-4 py-2 text-sm text-gray-700">
                  {isEn ? '13 months' : '13 mois'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      ),
    },
    {
      num: 4,
      title: isEn ? 'Legal Basis' : 'Base juridique',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'When you first visit Bolo237, a cookie consent banner allows you to accept or reject non-essential cookies. You can reopen these settings at any time from the cookie button displayed on the site.'
              : 'Lors de votre première visite sur Bolo237, un bandeau de consentement aux cookies vous permet d’accepter ou de refuser les cookies non essentiels. Vous pouvez rouvrir ces réglages à tout moment grâce au bouton cookies affiché sur le site.'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Essential cookies: Legitimate interest (Art. 6, Law 2024/017). These cookies are strictly necessary for the platform to function and do not require your prior consent.'
                : 'Cookies essentiels\u00a0: Int\u00e9r\u00eat l\u00e9gitime (Art. 6, Loi 2024/017). Ces cookies sont strictement n\u00e9cessaires au fonctionnement de la plateforme et ne n\u00e9cessitent pas votre consentement pr\u00e9alable.',
              isEn
                ? 'Non-essential cookies (performance, functional): Consent (Art. 6, Law 2024/017). These cookies are only placed on your device after you have given your explicit consent via the cookie consent banner.'
                : 'Cookies non essentiels (performance, fonctionnels)\u00a0: Consentement (Art. 6, Loi 2024/017). Ces cookies ne sont plac\u00e9s sur votre appareil qu\u2019apr\u00e8s que vous avez donn\u00e9 votre consentement explicite via le bandeau de consentement aux cookies.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
        </>
      ),
    },
    {
      num: 5,
      title: isEn ? 'Managing Cookies' : 'Gestion des cookies',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'These cookies are optional. They are intended for future non-essential interface preferences and stay disabled until you explicitly accept them.'
              : 'Ces cookies sont optionnels. Ils sont destinés à de futures préférences d’interface non essentielles et restent désactivés tant que vous ne les avez pas acceptés explicitement.'}
          </p>

          <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
            {isEn ? 'Via the consent banner' : 'Via le bandeau de consentement'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-4">
            {isEn
              ? 'When you first visit Bolo237, a cookie consent banner allows you to accept or reject non-essential cookies. You can change your choice at any time by clearing your cookies and revisiting the site.'
              : 'Lors de votre premi\u00e8re visite sur Bolo237, un bandeau de consentement aux cookies vous permet d\u2019accepter ou de refuser les cookies non essentiels. Vous pouvez modifier votre choix \u00e0 tout moment en supprimant vos cookies et en revisitant le site.'}
          </p>

          <p className="text-gray-700 leading-relaxed mb-2 font-semibold">
            {isEn ? 'Via your browser settings' : 'Via les param\u00e8tres de votre navigateur'}
          </p>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'You can also configure your browser to block or delete cookies. Here are instructions for the most common browsers:'
              : 'Vous pouvez \u00e9galement configurer votre navigateur pour bloquer ou supprimer les cookies. Voici les instructions pour les navigateurs les plus courants\u00a0:'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Google Chrome: Settings > Privacy and Security > Cookies and other site data'
                : 'Google Chrome\u00a0: Param\u00e8tres > Confidentialit\u00e9 et s\u00e9curit\u00e9 > Cookies et autres donn\u00e9es des sites',
              isEn
                ? 'Mozilla Firefox: Settings > Privacy & Security > Cookies and Site Data'
                : 'Mozilla Firefox\u00a0: Param\u00e8tres > Vie priv\u00e9e et s\u00e9curit\u00e9 > Cookies et donn\u00e9es de sites',
              isEn
                ? 'Safari: Preferences > Privacy > Manage Website Data'
                : 'Safari\u00a0: Pr\u00e9f\u00e9rences > Confidentialit\u00e9 > G\u00e9rer les donn\u00e9es de sites web',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mt-3 text-sm italic">
            {isEn
              ? 'Please note that disabling essential cookies may affect the proper functioning of the platform.'
              : 'Veuillez noter que la d\u00e9sactivation des cookies essentiels peut affecter le bon fonctionnement de la plateforme.'}
          </p>
        </>
      ),
    },
    {
      num: 6,
      title: isEn ? 'Cookie Duration' : 'Dur\u00e9e de conservation',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'In accordance with applicable regulations, cookies used on Bolo237 are stored for a maximum period of thirteen (13) months from the date they are placed on your device. At the end of this period, your consent will be requested again for non-essential cookies.'
            : 'Conform\u00e9ment \u00e0 la r\u00e9glementation applicable, les cookies utilis\u00e9s sur Bolo237 sont conserv\u00e9s pour une dur\u00e9e maximale de treize (13) mois \u00e0 compter de leur d\u00e9p\u00f4t sur votre appareil. \u00c0 l\u2019expiration de cette p\u00e9riode, votre consentement sera \u00e0 nouveau sollicit\u00e9 pour les cookies non essentiels.'}
        </p>
      ),
    },
    {
      num: 7,
      title: isEn ? 'Changes to This Policy' : 'Modifications',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'Bolo237 reserves the right to update this Cookie Policy at any time to reflect changes in legislation, platform features, or cookie usage practices. Any significant changes will be communicated via the platform. The updated policy will indicate the new effective date. We encourage you to review this page periodically.'
            : 'Bolo237 se r\u00e9serve le droit de mettre \u00e0 jour la pr\u00e9sente Politique de Cookies \u00e0 tout moment pour refl\u00e9ter les \u00e9volutions l\u00e9gislatives, les fonctionnalit\u00e9s de la plateforme ou les pratiques d\u2019utilisation des cookies. Toute modification significative sera communiqu\u00e9e via la plateforme. La politique mise \u00e0 jour indiquera la nouvelle date d\u2019entr\u00e9e en vigueur. Nous vous encourageons \u00e0 consulter cette page p\u00e9riodiquement.'}
        </p>
      ),
    },
    {
      num: 8,
      title: 'Contact',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'For any questions or requests regarding this Cookie Policy or the use of cookies on Bolo237, you may contact us at:'
            : 'Pour toute question ou demande relative \u00e0 la pr\u00e9sente Politique de Cookies ou \u00e0 l\u2019utilisation des cookies sur Bolo237, vous pouvez nous contacter \u00e0\u00a0:'}
        </p>
      ),
    },
    {
      num: 9,
      title: isEn ? 'Effective Date' : 'Date d\u2019entr\u00e9e en vigueur',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'This Cookie Policy is effective as of April 4, 2026.'
            : 'La pr\u00e9sente Politique de Cookies entre en vigueur le 4 avril 2026.'}
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Cookies', en: 'Cookies' }, path: '/cookies' },
        ]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'Cookie Policy' : 'Politique de Cookies'}
            </h1>
            <p className="text-gray-300 text-lg">
              {isEn ? 'Last updated: April 2026' : 'Derni\u00e8re mise \u00e0 jour : Avril 2026'}
            </p>
          </div>
        </section>

        {/* Sections */}
        <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
          <div className="rounded-2xl border border-[#E8C4B0] bg-[#FFF5EF] px-6 py-5 text-sm leading-7 text-gray-700">
            {isEn
              ? 'The Bolo237 application is published by Samuel DJOMMOU THENGHO, an independent developer operating under the DTSfuture commercial brand and product studio.'
              : 'L’application Bolo237 est éditée par Samuel DJOMMOU THENGHO, développeur indépendant opérant sous la marque commerciale et le studio d’édition DTSfuture.'}
          </div>

          {sections.map((s) => (
            <div key={s.num}>
              <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-[#FEEBD6] text-[#C4623F] rounded-full flex items-center justify-center text-sm font-bold shrink-0">
                  {s.num}
                </span>
                {s.title}
              </h2>
              {s.content}
            </div>
          ))}

          {/* Contact Box */}
          <div className="bg-[#FFF5EF] border border-[#E8C4B0] rounded-xl p-8 text-center space-y-4">
            <h3 className="text-lg font-bold text-gray-900">
              {isEn ? 'Get in Touch' : 'Nous Contacter'}
            </h3>
            <div className="space-y-2">
              <p className="text-gray-700">
                <span className="font-semibold">Email : </span>
                <a href="mailto:contact@bolo237.com" className="text-[#C4623F] font-bold hover:underline">
                  contact@bolo237.com
                </a>
              </p>
              <p className="text-gray-700">
                <span className="font-semibold">WhatsApp : </span>
                <a href="https://wa.me/4915124862693" className="text-[#C4623F] font-bold hover:underline">
                  +49 151 24862693
                </a>
              </p>
            </div>
            <p className="text-sm text-gray-500 mt-4">
              {isEn
                ? 'Bolo237 — Published by Samuel DJOMMOU THENGHO under the DTSfuture brand'
                : 'Bolo237 — Éditée par Samuel DJOMMOU THENGHO sous la marque DTSfuture'}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
