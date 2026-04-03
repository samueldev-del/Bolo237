"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

type FaqItem = {
  question: string;
  answer: string;
};

export default function QuestionsFrequentesPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  const faqItems: FaqItem[] = [
    {
      question: isEn
        ? 'How do I verify a provider profile on Bolo237?'
        : 'Comment verifier le profil d un prestataire sur Bolo237 ?',
      answer: isEn
        ? 'The provider submits an ID document and a selfie through Identity Shield. Our team manually reviews the submission before showing the verified badge.'
        : 'Le prestataire soumet une piece d identite et un selfie via Identity Shield. Notre equipe verifie manuellement le dossier avant d afficher le badge verifie.',
    },
    {
      question: isEn
        ? 'Is posting a job on Bolo237 free?'
        : 'Est-ce gratuit de poster une offre sur Bolo237 ?',
      answer: isEn
        ? 'Yes. Publishing a listing on Bolo237 is free for employers and service providers at this stage.'
        : 'Oui. La publication d une offre sur Bolo237 est gratuite pour les employeurs et les prestataires a ce stade.',
    },
    {
      question: isEn
        ? 'Can I use Bolo237 without downloading an app?'
        : 'Puis-je utiliser Bolo237 sans telecharger une application ?',
      answer: isEn
        ? 'Yes. Bolo237 works directly in your browser and can be installed as a PWA if you want.'
        : 'Oui. Bolo237 fonctionne directement dans votre navigateur et peut etre installee en PWA si vous le souhaitez.',
    },
    {
      question: isEn
        ? 'Does Bolo237 guarantee contracts between users?'
        : 'Bolo237 garantit-il les contrats entre utilisateurs ?',
      answer: isEn
        ? 'No. Bolo237 is an intermediary platform. Agreements are made directly between users.'
        : 'Non. Bolo237 est une plateforme intermediaire. Les accords sont conclus directement entre utilisateurs.',
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
    <div className="min-h-screen bg-white flex flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'FAQ', en: 'FAQ' }, path: '/questions-frequentes' },
        ]}
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {isEn ? 'Frequently Asked Questions' : 'Questions frequentes'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isEn
            ? 'Everything you need to understand verification, posting, and trust on Bolo237.'
            : 'Tout ce qu il faut savoir sur la verification, la publication et la confiance sur Bolo237.'}
        </p>

        <div className="space-y-4">
          {faqItems.map((item) => (
            <details key={item.question} className="group border border-gray-200 rounded-2xl p-5 bg-white">
              <summary className="list-none cursor-pointer flex items-center justify-between gap-3 font-extrabold text-gray-900">
                <span>{item.question}</span>
                <span className="text-[#DA7756] text-xl leading-none group-open:rotate-45 transition-transform">+</span>
              </summary>
              <p className="text-gray-700 mt-3 leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Footer />
    </div>
  );
}
