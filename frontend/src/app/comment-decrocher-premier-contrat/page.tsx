"use client";

import BreadcrumbJsonLd from '@/components/BreadcrumbJsonLd';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';
import { safeJsonLd } from '@/lib/jsonLd';

type HowToStep = {
  name: string;
  text: string;
  url: string;
};

export default function CommentDecrocherPremierContratPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const basePath = `https://www.bolo237.com/${locale}`;

  const steps: HowToStep[] = [
    {
      name: isEn ? 'Create your account' : 'Creer votre compte',
      text: isEn
        ? 'Sign up with your phone number, choose the right role, and complete your basic profile.'
        : 'Inscrivez-vous avec votre numero de telephone, choisissez le bon role et completez votre profil de base.',
      url: `${basePath}/connexion`,
    },
    {
      name: isEn ? 'Complete your professional profile' : 'Completer votre profil professionnel',
      text: isEn
        ? 'Add your title, skills, location, and clear contact information to improve trust and visibility.'
        : 'Ajoutez votre titre, vos competences, votre localisation et vos contacts pour renforcer la confiance et la visibilite.',
      url: `${basePath}/profil`,
    },
    {
      name: isEn ? 'Activate Identity Shield' : 'Activer Identity Shield',
      text: isEn
        ? 'Submit your ID document and selfie for manual review to get the verified badge.'
        : 'Soumettez votre piece d identite et votre selfie pour verification manuelle afin d obtenir le badge verifie.',
      url: `${basePath}/dashboard`,
    },
    {
      name: isEn ? 'Apply to relevant opportunities' : 'Postuler aux opportunites pertinentes',
      text: isEn
        ? 'Target listings matching your skills, send clean applications, and keep your responses fast on WhatsApp.'
        : 'Ciblez les offres adaptees a vos competences, envoyez des candidatures propres et repondez vite sur WhatsApp.',
      url: `${basePath}/recherche`,
    },
  ];

  const howToSchema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: isEn
      ? 'How to get your first contract on Bolo237'
      : 'Comment decrocher son premier contrat sur Bolo237',
    description: isEn
      ? 'Step-by-step method to get your first contract using Bolo237.'
      : 'Methode pas-a-pas pour obtenir votre premier contrat sur Bolo237.',
    totalTime: 'P1D',
    step: steps.map((step, index) => ({
      '@type': 'HowToStep',
      position: index + 1,
      name: step.name,
      text: step.text,
      url: step.url,
    })),
  };

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: 'Accueil', en: 'Home' }, path: '/' },
          { name: { fr: 'Guide premier contrat', en: 'First contract guide' }, path: '/comment-decrocher-premier-contrat' },
        ]}
      />
      <Header />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-12 md:py-16">
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-3">
          {isEn ? 'How to Land Your First Contract' : 'Comment decrocher votre premier contrat'}
        </h1>
        <p className="text-gray-600 mb-8">
          {isEn
            ? 'Follow these practical steps to increase your chances quickly on Bolo237.'
            : 'Suivez ces etapes pratiques pour augmenter rapidement vos chances sur Bolo237.'}
        </p>

        <ol className="space-y-4">
          {steps.map((step, index) => (
            <li key={step.name} className="border border-gray-200 rounded-2xl p-5 bg-white">
              <p className="text-sm font-bold text-[#DA7756] mb-1">
                {isEn ? 'Step' : 'Etape'} {index + 1}
              </p>
              <h2 className="text-xl font-extrabold text-gray-900 mb-2">{step.name}</h2>
              <p className="text-gray-700 leading-relaxed">{step.text}</p>
            </li>
          ))}
        </ol>
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(howToSchema) }} />
      <Footer />
    </div>
  );
}
