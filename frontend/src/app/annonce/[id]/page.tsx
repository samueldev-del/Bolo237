"use client";

import { use, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import { applyToJob, fetchJob, type ApiJob } from '@/lib/api';
import { useApi } from '@/lib/useApi';

type JobParams = {
  params: Promise<{
    id: string;
  }>;
};

// Mock data de fallback
const MOCK_ANNONCE = {
  titre: 'Responsable Marketing Digital',
  entreprise: 'TechCamer S.A',
  logo: 'TC',
  contrat: 'CDI',
  lieu: 'Douala',
  mode: 'Hybride',
  salaire: '450 000 - 650 000 FCFA',
  publication: '21 mars 2026',
  limite: '15 avril 2026',
  description:
    "Dans le cadre de sa croissance, TechCamer renforce son équipe marketing pour accélérer l'acquisition client et la visibilité de ses produits numériques au Cameroun et en Afrique centrale.",
  entrepriseResume:
    'TechCamer S.A est une entreprise technologique basée à Douala, spécialisée dans les solutions web et mobile pour les PME.',
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function OffreEmploiPage({ params }: JobParams) {
  const { id } = use(params);
  const numericId = parseInt(id, 10);
  const { t, localizePath, locale } = useLocale();
  const [translated, setTranslated] = useState(false);
  const [maskedByReports, setMaskedByReports] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);

  // Fetch le détail de l'offre depuis le backend
  const { data: apiJob, loading } = useApi(
    () => (isNaN(numericId) ? Promise.reject(new Error('Invalid ID')) : fetchJob(numericId)),
    null,
    [numericId]
  );

  // Construire les données d'affichage (API ou fallback mock)
  const annonce = apiJob
    ? {
        id,
        titre: apiJob.title,
        entreprise: apiJob.company,
        logo: apiJob.company.slice(0, 2).toUpperCase(),
        contrat: 'CDI',
        lieu: apiJob.location,
        mode: 'Sur site',
        salaire: apiJob.salary || (locale === 'fr' ? 'Non communiqué' : 'Not disclosed'),
        publication: formatDate(apiJob.createdAt),
        limite: '-',
        description: apiJob.description,
        entrepriseResume: `${apiJob.company} — ${apiJob.location}`,
      }
    : { id, ...MOCK_ANNONCE };

  const display = translated
    ? {
        titre: annonce.titre,
        entreprise: annonce.entreprise,
        description: annonce.description,
        entrepriseResume: annonce.entrepriseResume,
      }
    : {
        titre: annonce.titre,
        entreprise: annonce.entreprise,
        description: annonce.description,
        entrepriseResume: annonce.entrepriseResume,
      };

  const handleApply = async () => {
    if (!apiJob) {
      setApplyMessage(locale === 'fr' ? 'Annonce indisponible.' : 'Job not available.');
      return;
    }

    let candidateId = 0;
    let candidateName = '';
    try {
      const raw = localStorage.getItem('237jobs-user');
      if (raw) {
        const user = JSON.parse(raw);
        candidateId = Number(user.id || 0);
        candidateName = String(user.name || user.fullName || user.email || '').trim();
      }
    } catch {
      // ignore parse errors
    }

    if (!candidateId) {
      setApplyMessage(locale === 'fr' ? 'Connectez-vous pour postuler.' : 'Please sign in before applying.');
      return;
    }

    setIsApplying(true);
    setApplyMessage('');

    try {
      await applyToJob({
        jobId: apiJob.id,
        candidateId,
        candidateName,
      });
      setApplyMessage(
        locale === 'fr'
          ? 'Candidature envoyee. L entreprise a ete notifiee.'
          : 'Application sent. The company has been notified.'
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setApplyMessage((locale === 'fr' ? 'Echec candidature: ' : 'Application failed: ') + message);
    } finally {
      setIsApplying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{locale === 'fr' ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-24 md:pb-10">
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')}>
            <Image src="/logo.svg" alt="237jobs" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <Link href={localizePath('/recherche')} className="text-sm font-bold text-gray-600 hover:text-green-700">
            {locale === 'fr' ? 'Retour aux offres' : 'Back to listings'}
          </Link>
        </div>
      </nav>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center font-extrabold text-green-700">
                {annonce.logo}
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-black">{display.titre}</h1>
                <p className="text-gray-600 font-bold mt-2">{display.entreprise}</p>
                <button
                  onClick={() => setTranslated((s) => !s)}
                  className="mt-3 inline-flex text-xs font-extrabold text-green-700 bg-green-50 border border-green-100 px-3 py-1.5 rounded-full hover:bg-green-100 transition"
                >
                  ✨ {locale === 'fr' ? (translated ? 'Voir la version originale' : t.home.translateAd) : (translated ? 'Show original version' : t.home.translateAd)}
                </button>

                <div className="flex flex-wrap gap-2 mt-4 text-sm font-bold">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{annonce.contrat}</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{annonce.lieu}</span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{annonce.mode}</span>
                  <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-100">{annonce.salaire}</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleApply}
              disabled={maskedByReports || isApplying}
              className="hidden md:inline-flex bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700 text-white font-extrabold px-8 py-3 rounded-xl shadow-sm transition"
            >
              {maskedByReports ? t.security.adMaskedCta : isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.apply}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 md:grid-cols-3 gap-6">
        <section className="md:col-span-2 space-y-6">
          {maskedByReports && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <p className="text-red-700 font-extrabold text-sm">
                {t.security.autoMaskedAd}
              </p>
            </div>
          )}

          <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
            <p className="text-red-700 font-extrabold text-sm">
              {t.security.redJobWarning}
            </p>
          </div>

          <article className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-extrabold mb-3">{locale === 'fr' ? 'À propos du poste' : 'About this role'}</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{display.description}</p>
          </article>

          <div className="hidden md:flex justify-end">
            <button
              onClick={handleApply}
              disabled={maskedByReports || isApplying}
              className="bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700 text-white font-extrabold px-8 py-3 rounded-xl shadow-sm transition"
            >
              {isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.apply}
            </button>
          </div>

          {applyMessage && (
            <div className={`rounded-xl p-3 text-sm font-semibold ${applyMessage.toLowerCase().includes('echec') || applyMessage.toLowerCase().includes('failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
              {applyMessage}
            </div>
          )}
        </section>

        <aside className="space-y-4 md:sticky md:top-6 h-fit">
          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-2">{locale === 'fr' ? "À propos de l'entreprise" : 'About the company'}</h3>
            <p className="text-sm text-gray-700 leading-relaxed">{display.entrepriseResume}</p>
          </article>

          <article className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-base font-extrabold mb-3">{locale === 'fr' ? 'Informations' : 'Information'}</h3>
            <div className="space-y-2 text-sm text-gray-700">
              <p>
                <span className="font-bold text-black">{locale === 'fr' ? 'Publication :' : 'Published:'}</span> {annonce.publication}
              </p>
              <p>
                <span className="font-bold text-black">{locale === 'fr' ? 'Date limite :' : 'Deadline:'}</span> {annonce.limite}
              </p>
              <p>
                <span className="font-bold text-black">{locale === 'fr' ? 'Référence :' : 'Reference:'}</span> #{annonce.id}
              </p>
            </div>
          </article>
        </aside>
      </main>

      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <button
          onClick={handleApply}
          disabled={maskedByReports || isApplying}
          className="w-full bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-green-700 text-white font-extrabold py-3 rounded-xl transition"
        >
          {maskedByReports ? t.security.adMaskedCta : isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.applyNow}
        </button>
      </div>
    </div>
  );
}
