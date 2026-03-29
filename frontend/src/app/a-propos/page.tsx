"use client";

import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function AProposPage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';
  const faqItems = [
    {
      question: isEn ? 'Is Bolo237 free to use?' : 'Bolo237 est-il gratuit ?',
      answer: isEn
        ? 'Yes. Creating an account, browsing offers, and connecting with candidates or artisans is completely free on Bolo237.'
        : 'Oui. La creation de compte, la consultation des offres et la mise en relation avec les candidats ou artisans sont entierement gratuites sur Bolo237.',
    },
    {
      question: isEn ? 'How does identity verification work?' : 'Comment fonctionne la verification d identite ?',
      answer: isEn
        ? 'Users can submit an ID document and a selfie through Identity Shield. Our team reviews submissions manually before granting a verified badge.'
        : 'Les utilisateurs peuvent soumettre une piece d identite et un selfie via Identity Shield. Notre equipe verifie manuellement chaque dossier avant attribution du badge verifie.',
    },
    {
      question: isEn ? 'Can I use Bolo237 on mobile without an app store?' : 'Puis-je utiliser Bolo237 sur mobile sans Play Store ?',
      answer: isEn
        ? 'Yes. Bolo237 is a Progressive Web App (PWA): you can open it in your browser and install it directly on your phone.'
        : 'Oui. Bolo237 est une Progressive Web App (PWA) : vous pouvez l ouvrir dans le navigateur et l installer directement sur votre telephone.',
    },
    {
      question: isEn ? 'Does Bolo237 hire candidates directly?' : 'Bolo237 recrute-t-il directement les candidats ?',
      answer: isEn
        ? 'No. Bolo237 is an intermediary platform. Employment or service contracts are agreed directly between users.'
        : 'Non. Bolo237 est une plateforme intermediaire. Les contrats d emploi ou de service sont conclus directement entre les utilisateurs.',
    },
  ];

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#DA7756] via-[#C4623F] to-[#8B3A1F] text-white py-24 md:py-32 px-4">
          {/* decorative circles */}
          <div className="absolute -top-20 -right-20 w-72 h-72 bg-white/5 rounded-full blur-2xl" />
          <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-white/5 rounded-full blur-2xl" />

          <div className="relative max-w-3xl mx-auto text-center">
            <p className="inline-block text-xs md:text-sm font-bold tracking-widest uppercase text-[#FEEBD6]/80 mb-6">
              {isEn ? 'About Bolo237' : 'A propos de Bolo237'}
            </p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-6">
              {isEn
                ? 'Born from frustration. Built with passion.'
                : "N\u00e9 d\u2019une frustration. Construit avec passion."}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-[#FEEBD6] max-w-2xl mx-auto leading-relaxed">
              {isEn
                ? "Bolo237 is more than a platform. It\u2019s a mission: giving every Cameroonian the tools to build their professional future."
                : "Bolo237 est plus qu\u2019une plateforme. C\u2019est une mission\u00a0: donner \u00e0 chaque Camerounais les outils pour construire son avenir professionnel."}
            </p>
          </div>
        </section>

        {/* ── THE STORY ── */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
              {isEn ? 'The Story' : "L\u2019Histoire"}
            </h2>
            <div className="w-16 h-1 bg-[#DA7756] rounded-full mb-8" />

            <div className="space-y-5 text-gray-700 leading-relaxed text-[15px] md:text-base">
              <p>
                {isEn
                  ? "My name is Samuel DJOMMOU THENGHO. I\u2019m Cameroonian, and I live in Germany. Like many of us in the diaspora, I never stopped thinking about home \u2014 about the people I love, the country that shaped me, and the challenges that still hold it back."
                  : "Je m\u2019appelle Samuel DJOMMOU THENGHO. Je suis Camerounais, et je vis en Allemagne. Comme beaucoup d\u2019entre nous dans la diaspora, je n\u2019ai jamais cess\u00e9 de penser au pays\u00a0\u2014\u00a0aux gens que j\u2019aime, \u00e0 la terre qui m\u2019a forg\u00e9, et aux d\u00e9fis qui freinent encore son \u00e9lan."}
              </p>
              <p>
                {isEn
                  ? "Every time I needed a reliable plumber or electrician back home, it was a nightmare. Every time I saw a talented young Cameroonian struggling to find work despite incredible skills, it broke my heart. And every time I saw fake job listings preying on desperate people, it made me angry."
                  : "Chaque fois que j\u2019avais besoin d\u2019un plombier ou d\u2019un \u00e9lectricien fiable au pays, c\u2019\u00e9tait un calvaire. Chaque fois que je voyais un jeune Camerounais talentueux gaL\u00e9rer \u00e0 trouver un emploi malgr\u00e9 ses comp\u00e9tences, \u00e7a me brisait le c\u0153ur. Et chaque fois que je voyais des fausses offres d\u2019emploi qui arnaquaient des gens d\u00e9sesp\u00e9r\u00e9s, \u00e7a me mettait en col\u00e8re."}
              </p>
              <p className="font-semibold text-gray-900">
                {isEn
                  ? "So I decided to stop complaining and start building."
                  : "Alors j\u2019ai d\u00e9cid\u00e9 d\u2019arr\u00eater de me plaindre et de commencer \u00e0 construire."}
              </p>
              <p>
                {isEn
                  ? "Bolo237 is a platform where every profile is verified, every listing is moderated, and connections happen directly via WhatsApp \u2014 the tool Cameroonians already use every day. No middlemen. No scams. Just real people finding real opportunities."
                  : "Bolo237 est une plateforme o\u00f9 chaque profil est v\u00e9rifi\u00e9, chaque annonce est mod\u00e9r\u00e9e, et les mises en relation se font directement via WhatsApp\u00a0\u2014\u00a0l\u2019outil que les Camerounais utilisent d\u00e9j\u00e0 chaque jour. Pas d\u2019interm\u00e9diaires. Pas d\u2019arnaques. Juste de vraies personnes qui trouvent de vraies opportunit\u00e9s."}
              </p>
            </div>

            {/* Founder quote */}
            <div className="mt-10 bg-gradient-to-br from-[#FFF5EF] to-[#FEEBD6] rounded-2xl p-8 md:p-10 border border-[#DA7756]/20 relative">
              <div className="absolute top-4 left-6 text-6xl text-[#DA7756]/20 font-serif leading-none select-none">&ldquo;</div>
              <blockquote className="relative z-10">
                <p className="text-lg md:text-xl font-medium text-gray-800 italic leading-relaxed">
                  {isEn
                    ? "I wanted to create the platform I wish I had. A platform where trust is not a luxury, but the standard."
                    : "J\u2019ai voulu cr\u00e9er la plateforme que j\u2019aurais aim\u00e9 avoir. Une plateforme o\u00f9 la confiance n\u2019est pas un luxe, mais la norme."}
                </p>
                <footer className="mt-6 flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-[#DA7756] flex items-center justify-center text-white font-extrabold text-lg">
                    SD
                  </div>
                  <div>
                    <p className="font-extrabold text-gray-900 text-sm">Samuel DJOMMOU THENGHO</p>
                    <p className="text-xs text-[#C4623F] font-semibold">
                      {isEn ? 'Founder & CEO' : 'Fondateur & CEO'}
                    </p>
                  </div>
                </footer>
              </blockquote>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="py-16 md:py-24 px-4 bg-[#FAFAFA]">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                {isEn ? 'Frequently Asked Questions' : 'Questions frequentes'}
              </h2>
              <div className="w-16 h-1 bg-[#DA7756] rounded-full mx-auto" />
            </div>

            <div className="space-y-4">
              {faqItems.map((item) => (
                <details key={item.question} className="group bg-white rounded-2xl border border-gray-200 p-5">
                  <summary className="cursor-pointer list-none font-bold text-gray-900 flex items-center justify-between gap-4">
                    <span>{item.question}</span>
                    <span className="text-[#DA7756] text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                  </summary>
                  <p className="mt-3 text-sm md:text-base text-gray-700 leading-relaxed">{item.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── VISION ── */}
        <section className="bg-gray-900 text-white py-16 md:py-24 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-2">
              {isEn ? 'Our Vision' : 'Notre Vision'}
            </h2>
            <div className="w-16 h-1 bg-[#DA7756] rounded-full mx-auto mb-8" />

            <p className="text-xl md:text-2xl font-bold text-[#DA7756] leading-snug mb-6">
              {isEn
                ? "Become the reference for jobs and services in Francophone Africa, starting with Cameroon."
                : "Devenir la r\u00e9f\u00e9rence de l\u2019emploi et des services en Afrique francophone, en commen\u00e7ant par le Cameroun."}
            </p>
            <p className="text-gray-400 leading-relaxed max-w-2xl mx-auto text-[15px]">
              {isEn
                ? "Cameroon is just the beginning. Once we\u2019ve proven the model here \u2014 in all 10 regions, from Douala to Maroua \u2014 we\u2019ll bring Bolo237 to every Francophone African country where the same challenges exist. The same hunger for opportunity. The same need for trust."
                : "Le Cameroun n\u2019est que le d\u00e9but. Une fois le mod\u00e8le prouv\u00e9 ici\u00a0\u2014\u00a0dans les 10 r\u00e9gions, de Douala \u00e0 Maroua\u00a0\u2014\u00a0nous porterons Bolo237 dans chaque pays d\u2019Afrique francophone o\u00f9 les m\u00eames d\u00e9fis existent. La m\u00eame soif d\u2019opportunit\u00e9s. Le m\u00eame besoin de confiance."}
            </p>
          </div>
        </section>

        {/* ── VALUES ── */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                {isEn ? 'Our Values' : 'Nos Valeurs'}
              </h2>
              <div className="w-16 h-1 bg-[#DA7756] rounded-full mx-auto" />
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Trust */}
              <div className="bg-white rounded-2xl p-7 shadow-md border border-[#FEEBD6] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-[#FEEBD6] rounded-2xl flex items-center justify-center text-2xl mb-5">
                  <span role="img" aria-label={isEn ? 'Trust' : 'Confiance'}>&#x1F6E1;&#xFE0F;</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  {isEn ? 'Trust' : 'Confiance'}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? "Every profile is verified. Every listing is moderated. User safety is our absolute priority."
                    : "Chaque profil est v\u00e9rifi\u00e9. Chaque annonce est mod\u00e9r\u00e9e. La s\u00e9curit\u00e9 de nos utilisateurs est notre priorit\u00e9 absolue."}
                </p>
              </div>

              {/* Proximity */}
              <div className="bg-white rounded-2xl p-7 shadow-md border border-[#FEEBD6] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-[#FEEBD6] rounded-2xl flex items-center justify-center text-2xl mb-5">
                  <span role="img" aria-label={isEn ? 'Proximity' : 'Proximit\u00e9'}>&#x1F91D;</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  {isEn ? 'Proximity' : 'Proximit\u00e9'}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? "We are Cameroonian. We understand local realities: unstable networks, the need for speed, the importance of word-of-mouth."
                    : "Nous sommes Camerounais. Nous comprenons les r\u00e9alit\u00e9s du terrain\u00a0: le r\u00e9seau instable, le besoin d\u2019aller vite, l\u2019importance du bouche-\u00e0-oreille."}
                </p>
              </div>

              {/* Accessibility */}
              <div className="bg-white rounded-2xl p-7 shadow-md border border-[#FEEBD6] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-[#FEEBD6] rounded-2xl flex items-center justify-center text-2xl mb-5">
                  <span role="img" aria-label={isEn ? 'Free' : 'Gratuit'}>&#x1F193;</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  {isEn ? 'Accessibility' : 'Accessibilit\u00e9'}
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? "100% free. No hidden fees. No commission. We believe access to employment should never be a paid privilege."
                    : "100% gratuit. Pas de frais cach\u00e9s. Pas de commission. Nous croyons que l\u2019acc\u00e8s \u00e0 l\u2019emploi ne devrait jamais \u00eatre un privil\u00e8ge payant."}
                </p>
              </div>

              {/* Innovation */}
              <div className="bg-white rounded-2xl p-7 shadow-md border border-[#FEEBD6] hover:shadow-lg transition-shadow">
                <div className="w-14 h-14 bg-[#FEEBD6] rounded-2xl flex items-center justify-center text-2xl mb-5">
                  <span role="img" aria-label="Innovation">&#x1F680;</span>
                </div>
                <h3 className="text-lg font-extrabold text-gray-900 mb-2">
                  Innovation
                </h3>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isEn
                    ? "Mobile-first, WhatsApp integrated, ultra-light PWA: we use technology to solve real African problems."
                    : "Mobile-first, WhatsApp int\u00e9gr\u00e9, PWA ultra-l\u00e9g\u00e8re\u00a0: nous utilisons la technologie pour r\u00e9soudre de vrais probl\u00e8mes africains."}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── NUMBERS ── */}
        <section className="bg-gradient-to-br from-[#FFF5EF] to-[#FEEBD6] py-16 md:py-20 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                {isEn ? 'Bolo237 in Numbers' : 'Bolo237 en chiffres'}
              </h2>
              <div className="w-16 h-1 bg-[#DA7756] rounded-full mx-auto" />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl md:text-4xl font-black text-[#DA7756]">10</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {isEn ? 'Regions' : 'R\u00e9gions'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isEn ? 'Covered across Cameroon' : 'Couvertes au Cameroun'}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl md:text-4xl font-black text-[#DA7756]">3</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {isEn ? 'Profiles' : 'Profils'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isEn ? 'Candidate, Company, Artisan' : 'Candidat, Entreprise, Artisan'}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl md:text-4xl font-black text-[#DA7756]">0 <span className="text-lg">FCFA</span></p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {isEn ? 'Cost' : 'Co\u00fbt'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isEn ? 'Completely free forever' : 'Enti\u00e8rement gratuit pour toujours'}
                </p>
              </div>
              <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
                <p className="text-3xl md:text-4xl font-black text-[#DA7756]">24/7</p>
                <p className="text-sm font-bold text-gray-900 mt-1">
                  {isEn ? 'Support' : 'Support'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {isEn ? 'Via WhatsApp' : 'Via WhatsApp'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── WHAT MAKES US DIFFERENT ── */}
        <section className="py-16 md:py-24 px-4">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 mb-2">
                {isEn ? 'What Makes Us Different' : 'Ce qui nous rend diff\u00e9rents'}
              </h2>
              <div className="w-16 h-1 bg-[#DA7756] rounded-full mx-auto" />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {/* Identity Shield */}
              <div className="flex gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#DA7756]/30 transition-colors">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#DA7756] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">Identity Shield</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {isEn
                      ? "KYC verification on every professional profile. Real identities, real trust, real peace of mind."
                      : "V\u00e9rification KYC sur chaque profil professionnel. De vraies identit\u00e9s, une vraie confiance, une vraie tranquillit\u00e9 d\u2019esprit."}
                  </p>
                </div>
              </div>

              {/* WhatsApp Direct */}
              <div className="flex gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#DA7756]/30 transition-colors">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#25D366] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">WhatsApp Direct</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {isEn
                      ? "No complex internal messaging. One tap connects you directly to the person you need. Real conversations, real connections."
                      : "Pas de messagerie interne complexe. Un clic vous connecte directement \u00e0 la personne qu\u2019il vous faut. De vraies conversations, de vraies connexions."}
                  </p>
                </div>
              </div>

              {/* Made in Cameroon */}
              <div className="flex gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#DA7756]/30 transition-colors">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#009639] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">Made in Cameroon</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {isEn
                      ? "Built by Cameroonians who live and breathe the market. We don\u2019t guess what users need \u2014 we know."
                      : "Construit par des Camerounais qui vivent et comprennent le march\u00e9. On ne devine pas les besoins des utilisateurs\u00a0\u2014\u00a0on les conna\u00eet."}
                  </p>
                </div>
              </div>

              {/* Mobile-First PWA */}
              <div className="flex gap-4 bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:border-[#DA7756]/30 transition-colors">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-[#DA7756] flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 mb-1">Mobile-First PWA</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {isEn
                      ? "Works even on 2G/3G networks. No app store needed. Install it like an app, use it instantly \u2014 even offline."
                      : "Fonctionne m\u00eame en 2G/3G. Pas besoin du Play Store. Installez comme une appli, utilisez instantan\u00e9ment\u00a0\u2014\u00a0m\u00eame hors ligne."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-gradient-to-br from-[#DA7756] via-[#C4623F] to-[#8B3A1F] text-white py-16 md:py-24 px-4">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-white/5 rounded-full blur-3xl" />

          <div className="relative max-w-3xl mx-auto text-center">
            <h2 className="text-2xl md:text-3xl font-extrabold mb-4">
              {isEn ? "Join the Adventure" : "Rejoignez l\u2019aventure"}
            </h2>
            <p className="text-[#FEEBD6] text-base md:text-lg leading-relaxed max-w-2xl mx-auto mb-10">
              {isEn
                ? "Whether you\u2019re looking for a job, a qualified artisan, or want to recruit the best talents in Cameroon, Bolo237 is made for you."
                : "Que vous cherchiez un emploi, un artisan qualifi\u00e9, ou que vous souhaitiez recruter les meilleurs talents du Cameroun, Bolo237 est fait pour vous."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href={localizePath('/connexion')}
                className="bg-white text-[#C4623F] px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-[#FFF5EF] transition shadow-lg w-full sm:w-auto text-center"
              >
                {isEn ? 'Create my account' : 'Cr\u00e9er mon compte'}
              </Link>
              <Link
                href={localizePath('/publier')}
                className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-[15px] hover:bg-white/10 transition w-full sm:w-auto text-center"
              >
                {isEn ? 'Post a listing' : 'Publier une annonce'}
              </Link>
            </div>
          </div>
        </section>

      </main>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <Footer />
    </div>
  );
}
