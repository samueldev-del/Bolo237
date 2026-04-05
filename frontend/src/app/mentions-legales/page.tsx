"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function MentionsLegalesPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const sections = [
    {
      num: 1,
      title: isEn ? 'Website Publisher' : 'Éditeur du site',
      content: (
        <div className="space-y-2">
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'In accordance with Cameroonian Law No. 2010/021 of 21 December 2010 governing electronic commerce (Art. 7), the following information identifies the publisher of this website:'
              : 'Conformément à la loi camerounaise n°2010/021 du 21 décembre 2010 régissant le commerce électronique (Art. 7), les informations suivantes identifient l\u2019éditeur de ce site :'}
          </p>
          <ul className="space-y-3 mt-3">
            {[
              { label: isEn ? 'Name' : 'Nom', value: 'Samuel DJOMMOU THENGHO' },
              { label: isEn ? 'Status' : 'Statut', value: isEn ? 'Sole proprietor registered in Germany' : 'Entrepreneur individuel enregistré en Allemagne' },
              { label: isEn ? 'Address' : 'Adresse', value: isEn ? 'Germany' : 'Allemagne (Germany)' },
              { label: 'Email', value: 'contact@bolo237.com' },
              { label: isEn ? 'Phone' : 'Téléphone', value: '+49 151 24862693' },
              { label: isEn ? 'Website' : 'Site web', value: 'https://bolo237.com' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1 font-bold">&#10003;</span>
                <span>
                  <strong className="text-gray-900">{item.label}</strong>{' : '}
                  {item.label === 'Email' ? (
                    <a href={`mailto:${item.value}`} className="text-[#C4623F] font-bold hover:underline">{item.value}</a>
                  ) : item.label === (isEn ? 'Website' : 'Site web') ? (
                    <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-[#C4623F] font-bold hover:underline">{item.value}</a>
                  ) : (
                    item.value
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      num: 2,
      title: isEn ? 'Publication Director' : 'Directeur de la publication',
      content: (
        <p className="text-gray-700 leading-relaxed">
          Samuel DJOMMOU THENGHO
        </p>
      ),
    },
    {
      num: 3,
      title: isEn ? 'Hosting' : 'Hébergement',
      content: (
        <div className="space-y-2">
          <p className="text-gray-700 leading-relaxed">
            {isEn
              ? 'This website is hosted by:'
              : 'Ce site est hébergé par :'}
          </p>
          <ul className="space-y-3 mt-3">
            {[
              { label: isEn ? 'Host' : 'Hébergeur', value: 'Vercel Inc.' },
              { label: isEn ? 'Address' : 'Adresse', value: '340 S Lemon Ave #4133, Walnut, CA 91789, USA' },
              { label: isEn ? 'Website' : 'Site web', value: 'https://vercel.com' },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1 font-bold">&#10003;</span>
                <span>
                  <strong className="text-gray-900">{item.label}</strong>{' : '}
                  {item.label === (isEn ? 'Website' : 'Site web') ? (
                    <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-[#C4623F] font-bold hover:underline">{item.value}</a>
                  ) : (
                    item.value
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ),
    },
    {
      num: 4,
      title: isEn ? 'Activity' : 'Activité',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Bolo237 is a digital platform connecting job seekers, employers, and independent artisans in Cameroon.'
              : 'Bolo237 est une plateforme numérique de mise en relation entre demandeurs d\u2019emploi, employeurs et artisans indépendants au Cameroun.'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'The service is entirely free of charge for all users.'
                : 'Le service est entièrement gratuit pour tous les utilisateurs.',
              isEn
                ? 'No financial transactions take place on the platform.'
                : 'Aucune transaction financière n\u2019a lieu sur la plateforme.',
              isEn
                ? 'Bolo237 acts solely as a digital intermediary facilitating connections between users.'
                : 'Bolo237 agit uniquement en tant qu\u2019intermédiaire numérique facilitant la mise en relation entre utilisateurs.',
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
      title: isEn ? 'Intellectual Property' : 'Propriété intellectuelle',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'All content on the Bolo237 platform, including but not limited to texts, logos, images, graphic design, and source code, is the exclusive property of Bolo237 and its operator, Samuel DJOMMOU THENGHO.'
              : 'Tous les contenus de la plateforme Bolo237, incluant mais sans s\u2019y limiter les textes, logos, images, design graphique et code source, sont la propriété exclusive de Bolo237 et de son exploitant, Samuel DJOMMOU THENGHO.'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Any reproduction, distribution, or use of the content without prior written authorization is strictly prohibited.'
                : 'Toute reproduction, distribution ou utilisation du contenu sans autorisation écrite préalable est strictement interdite.',
              isEn
                ? 'The trademarks, logos, and domain names associated with Bolo237 are protected under applicable intellectual property laws.'
                : 'Les marques, logos et noms de domaine associés à Bolo237 sont protégés par les lois applicables en matière de propriété intellectuelle.',
              isEn
                ? 'Any infringement of these rights may result in civil and criminal prosecution.'
                : 'Toute violation de ces droits peut entraîner des poursuites civiles et pénales.',
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
      num: 6,
      title: isEn ? 'Applicable Law' : 'Loi applicable',
      content: (
        <>
          <p className="text-gray-700 leading-relaxed mb-3">
            {isEn
              ? 'Because Bolo237 is offered to users located in Cameroon, the public operation of this website is primarily framed by the mandatory laws of the Republic of Cameroon, in particular:'
              : 'Parce que Bolo237 est proposé à des utilisateurs situés au Cameroun, l’exploitation publique de ce site est principalement encadrée par les lois impératives de la République du Cameroun, notamment :'}
          </p>
          <ul className="space-y-3">
            {[
              isEn
                ? 'Law No. 2010/021 of 21 December 2010 governing electronic commerce.'
                : 'Loi n°2010/021 du 21 décembre 2010 régissant le commerce électronique.',
              isEn
                ? 'Law No. 2010/012 of 21 December 2010 on cybersecurity and cybercrime.'
                : 'Loi n°2010/012 du 21 décembre 2010 relative à la cybersécurité et la cybercriminalité.',
              isEn
                ? 'Law No. 2024/017 of 23 December 2024 on the protection of personal data.'
                : 'Loi n°2024/017 du 23 décembre 2024 portant protection des données à caractère personnel.',
              isEn
                ? 'Mandatory German and European rules applicable to the operating entity established in Germany remain applicable where required.'
                : 'Les règles impératives allemandes et européennes applicables à l’entité exploitante établie en Allemagne demeurent applicables lorsque la loi l’exige.',
            ].map((text, i) => (
              <li key={i} className="flex items-start gap-3 text-gray-700">
                <span className="text-[#DA7756] mt-1">&#10003;</span>
                {text}
              </li>
            ))}
          </ul>
          <p className="text-gray-700 leading-relaxed mt-4">
            {isEn
              ? 'Any dispute arising from the use of the public platform in Cameroon should first be addressed amicably. Failing amicable resolution, the matter shall be submitted to the competent courts of Douala, Cameroon, subject to any mandatory jurisdiction rule that applies to the operator or the user.'
              : 'Tout litige lié à l’utilisation de la plateforme publique au Cameroun doit d’abord faire l’objet d’une tentative de règlement amiable. À défaut d’accord amiable, le litige sera soumis aux tribunaux compétents de Douala, Cameroun, sous réserve de toute règle impérative de compétence applicable à l’exploitant ou à l’utilisateur.'}
          </p>
        </>
      ),
    },
    {
      num: 7,
      title: 'Contact',
      content: (
        <p className="text-gray-700 leading-relaxed">
          {isEn
            ? 'For any questions or requests regarding this legal notice, you may contact us through the following channels:'
            : 'Pour toute question ou demande relative aux présentes mentions légales, vous pouvez nous contacter via les canaux suivants :'}
        </p>
      ),
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Mentions Légales', en: 'Legal Notice' }, path: '/mentions-legales' },
        ]}
      />
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'Legal Notice' : 'Mentions Légales'}
            </h1>
            <p className="text-gray-300 text-lg">
              {isEn ? 'Last updated: April 2026' : 'Dernière mise à jour : Avril 2026'}
            </p>
          </div>
        </section>

        {/* Sections */}
        <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
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
                ? 'Bolo237 — Operated by Samuel DJOMMOU THENGHO — Germany'
                : 'Bolo237 — Exploité par Samuel DJOMMOU THENGHO — Allemagne'}
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
