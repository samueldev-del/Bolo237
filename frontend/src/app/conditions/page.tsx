"use client";

import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useLocale } from '@/components/LocaleProvider';

export default function ConditionsPage() {
  const { locale } = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-br from-gray-800 to-gray-900 text-white py-16 px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
              {isEn ? 'Terms of Use' : 'Conditions Generales d\'Utilisation (CGU)'}
            </h1>
            <p className="text-gray-300">
              {isEn ? 'Last updated: March 2026' : 'Derniere mise a jour : Mars 2026'}
            </p>
          </div>
        </section>

        <section className="max-w-3xl mx-auto px-4 py-12 space-y-10">
          {/* 1. Role */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">1</span>
              {isEn ? 'Role of the Platform' : 'Role de la plateforme'}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {isEn
                ? '237jobs is an online matchmaking service. We act exclusively as an intermediary hosting job listings and profiles. We are neither the employer of candidates nor the provider of services offered by artisans. Contracts or agreements entered into are directly between users.'
                : '237jobs est un service de mise en relation en ligne. Nous agissons exclusivement en tant qu\'intermediaire hebergeant les offres et les profils. Nous ne sommes ni l\'employeur des candidats, ni le fournisseur des services proposes par les artisans. Les contrats ou accords conclus le sont directement entre les utilisateurs.'}
            </p>
          </div>

          {/* 2. Engagements */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">2</span>
              {isEn ? 'User Commitments' : 'Engagements de l\'utilisateur'}
            </h2>
            <p className="text-gray-700 mb-3">
              {isEn ? 'By using 237jobs, you agree to:' : 'En utilisant 237jobs, vous vous engagez a :'}
            </p>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-green-600 mt-1">&#10003;</span>
                {isEn
                  ? 'Provide real and accurate information during identity verification (KYC).'
                  : 'Fournir des informations reelles et exactes lors de la verification d\'identite (KYC).'}
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-green-600 mt-1">&#10003;</span>
                {isEn
                  ? 'Only post legal, clear, and respectful job or service listings.'
                  : 'Ne publier que des offres d\'emploi ou de services legales, claires et respectueuses.'}
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-green-600 mt-1">&#10003;</span>
                {isEn
                  ? 'Be professional and respectful in your exchanges (via WhatsApp or on the platform).'
                  : 'Faire preuve de professionnalisme et de respect lors de vos echanges (via WhatsApp ou sur la plateforme).'}
              </li>
            </ul>
          </div>

          {/* 3. Moderation */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">3</span>
              {isEn ? 'Moderation & Security' : 'Moderation et Securite'}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {isEn
                ? '237jobs reserves the exclusive right, through its moderation team, to refuse, suspend, or delete any listing or profile that does not meet our quality standards, that appears to be a scam, or that has been reported by other users.'
                : '237jobs se reserve le droit exclusif, via son equipe de moderation, de refuser, suspendre ou supprimer toute annonce ou profil qui ne respecterait pas nos standards de qualite, qui s\'apparenterait a une arnaque, ou qui ferait l\'objet de signalements de la part d\'autres utilisateurs.'}
            </p>
          </div>

          {/* 4. Limite de responsabilite */}
          <div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-8 bg-green-100 text-green-700 rounded-full flex items-center justify-center text-sm font-bold">4</span>
              {isEn ? 'Limitation of Liability' : 'Limite de responsabilite'}
            </h2>
            <p className="text-gray-700 leading-relaxed">
              {isEn
                ? 'Although we implement a strict identity verification system (Identity Shield), 237jobs cannot guarantee the outcome of a service or the behavior of a user in person. Users are responsible for their own decisions when entering into an agreement.'
                : 'Bien que nous mettions en place un systeme strict de verification d\'identite (Identity Shield), 237jobs ne peut garantir l\'issue d\'une prestation ou le comportement d\'un utilisateur sur le terrain. Les utilisateurs engagent leur propre responsabilite lors de la conclusion d\'un accord.'}
            </p>
          </div>

          {/* Encadre */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <p className="text-sm text-gray-600">
              {isEn
                ? 'For any questions about these terms, contact us at '
                : 'Pour toute question relative a ces conditions, contactez-nous a '}
              <a href="mailto:contact@237jobs.com" className="text-green-700 font-bold hover:underline">
                contact@237jobs.com
              </a>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
