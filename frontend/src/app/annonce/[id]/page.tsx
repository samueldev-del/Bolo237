"use client";

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useLocale } from '@/components/LocaleProvider';
import FraudReportButton from '@/components/FraudReportButton';
import { applyToJob, fetchJob, fetchUserProfile } from '@/lib/api';
import { useApi } from '@/lib/useApi';

type JobParams = {
  params: Promise<{
    id: string;
  }>;
};

function extractExternalApplyUrl(description: string): string | null {
  const text = String(description || "");
  if (!text) {
    return null;
  }

  const markerPattern = /(postuler sur le site de l'entreprise|lien de candidature|apply on company site)\s*[:\-]\s*(https?:\/\/[^\s]+)/i;
  const markerMatch = text.match(markerPattern);
  if (markerMatch?.[2]) {
    return markerMatch[2].trim();
  }

  return null;
}


function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

type UserProfile = {
  id: number;
  name: string;
  title: string;
  skills: string;
  cvUploaded: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  isVerified: boolean;
  missingItems: string[];
};

export default function OffreEmploiPage({ params }: JobParams) {
  const { id } = use(params);
  const numericId = parseInt(id, 10);
  const { t, localizePath, locale } = useLocale();
  const [translated, setTranslated] = useState(false);
  const [maskedByReports, setMaskedByReports] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [isApplying, setIsApplying] = useState(false);
  const [showApplicationReview, setShowApplicationReview] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);

  // Fetch le détail de l'offre depuis le backend
  const { data: apiJob, loading } = useApi(
    () => (isNaN(numericId) ? Promise.reject(new Error('Invalid ID')) : fetchJob(numericId)),
    null,
    [numericId]
  );

  // Load user profile from localStorage when review panel opens
  useEffect(() => {
    if (showApplicationReview) {
      const loadReviewProfile = async () => {
        setIsLoadingReview(true);
        try {
          const raw = localStorage.getItem('bolo237-user');
          if (!raw) return;

          const user = JSON.parse(raw);
          const candidateId = Number(user.id || 0);
          if (!candidateId) return;

          const profile = await fetchUserProfile(candidateId).catch(() => null);
          const phoneVerified = localStorage.getItem('bolo237-phone-verified') === 'true' || Boolean(user.phone);
          const fullName = String(profile?.fullName || user.name || user.fullName || '').trim();
          const title = String(profile?.title || user.title || user.jobTitle || '').trim();
          const skills = String(profile?.skillsText || user.skills || '').trim();
          const hasNarrative = Boolean(profile?.profile || profile?.experience || profile?.education);
          const profileComplete = Boolean(fullName && title && profile?.phone && profile?.email && (skills || hasNarrative));
          const missingItems = [
            !fullName && (locale === 'fr' ? 'Nom complet' : 'Full name'),
            !title && (locale === 'fr' ? 'Titre du profil' : 'Profile title'),
            !profile?.phone && (locale === 'fr' ? 'Telephone' : 'Phone number'),
            !profile?.email && (locale === 'fr' ? 'Email' : 'Email'),
            !skills && !hasNarrative && (locale === 'fr' ? 'Resume, experience ou competences' : 'Summary, experience or skills'),
            !phoneVerified && (locale === 'fr' ? 'Verification telephone' : 'Phone verification'),
          ].filter(Boolean) as string[];

          setUserProfile({
            id: candidateId,
            name: fullName,
            title,
            skills,
            cvUploaded: Boolean(profileComplete),
            phoneVerified,
            profileComplete,
            isVerified: Boolean(user.isVerified),
            missingItems,
          });
        } catch {
          // ignore parse errors
        } finally {
          setIsLoadingReview(false);
        }
      };

      loadReviewProfile();
    }
  }, [showApplicationReview, locale]);

  // Construire les données d'affichage depuis l'API
  const annonce = apiJob
    ? {
        id,
        titre: apiJob.title,
        entreprise: apiJob.company,
        logo: (apiJob.company || '??').slice(0, 2).toUpperCase(),
        logoUrl: apiJob.author?.photoUrl || null,
        isVerified: apiJob.author?.isVerified || false,
        contrat: 'CDI',
        lieu: apiJob.location,
        mode: 'Sur site',
        salaire: apiJob.salary || (locale === 'fr' ? 'Non communiqué' : 'Not disclosed'),
        publication: formatDate(apiJob.createdAt),
        limite: '-',
        description: apiJob.description,
        entrepriseResume: `${apiJob.company} — ${apiJob.location}`,
      }
    : null;

  if (!annonce) {
    return (
      <div className="min-h-screen bg-[#f5f7f8]">
        <nav className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-5xl mx-auto">
            <Link href={localizePath('/')} className="font-bold text-lg text-[#C4623F]">Bolo237</Link>
          </div>
        </nav>
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <p className="text-5xl mb-4">{'\uD83D\uDCCB'}</p>
            <h1 className="text-xl font-bold text-gray-800 mb-2">
              {locale === 'fr' ? 'Annonce introuvable' : 'Listing not found'}
            </h1>
            <p className="text-gray-500 mb-6">
              {locale === 'fr'
                ? 'Cette offre n\u2019existe plus ou a \u00e9t\u00e9 retir\u00e9e.'
                : 'This listing no longer exists or has been removed.'}
            </p>
            <Link href={localizePath('/emplois')} className="inline-block bg-[#C4623F] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
              {locale === 'fr' ? 'Voir les offres' : 'Browse jobs'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

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

  const canonicalJobUrl = `https://www.bolo237.com/${locale}/annonce/${id}`;
  const externalApplyUrl = apiJob ? extractExternalApplyUrl(apiJob.description) : null;
  const jobPostingSchema = apiJob
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: apiJob.title,
        description: apiJob.description,
        datePosted: apiJob.createdAt,
        employmentType: 'FULL_TIME',
        hiringOrganization: {
          '@type': 'Organization',
          name: apiJob.company,
          sameAs: 'https://www.bolo237.com',
          logo: 'https://www.bolo237.com/icon.svg',
        },
        jobLocation: {
          '@type': 'Place',
          address: {
            '@type': 'PostalAddress',
            addressLocality: apiJob.location,
            addressCountry: 'CM',
          },
        },
        applicantLocationRequirements: {
          '@type': 'Country',
          name: 'Cameroon',
        },
        directApply: !externalApplyUrl,
        url: canonicalJobUrl,
      }
    : null;

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: locale === 'fr' ? 'Accueil' : 'Home',
        item: `https://www.bolo237.com/${locale}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: locale === 'fr' ? 'Offres d emploi' : 'Jobs',
        item: `https://www.bolo237.com/${locale}/emplois`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: annonce.titre,
        item: canonicalJobUrl,
      },
    ],
  };

  const handleApplyClick = () => {
    if (!apiJob) {
      setApplyMessage(locale === 'fr' ? 'Annonce indisponible.' : 'Job not available.');
      return;
    }

    let candidateId = 0;
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const user = JSON.parse(raw);
        candidateId = Number(user.id || 0);
      }
    } catch {
      // ignore parse errors
    }

    if (!candidateId) {
      setApplyMessage(locale === 'fr' ? 'Connectez-vous pour postuler.' : 'Please sign in before applying.');
      return;
    }

    setApplyMessage('');
    setShowApplicationReview(true);
  };

  const handleConfirmApply = async () => {
    if (!apiJob || !userProfile) return;

    if (userProfile.missingItems.length > 0) {
      setApplyMessage(
        locale === 'fr'
          ? `Dossier incomplet: ${userProfile.missingItems.join(', ')}.`
          : `Incomplete application file: ${userProfile.missingItems.join(', ')}.`
      );
      return;
    }

    setIsApplying(true);
    setApplyMessage('');

    try {
      await applyToJob({
        jobId: apiJob.id,
        candidateId: userProfile.id,
        candidateName: userProfile.name,
      });
      setShowApplicationReview(false);
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
          <div className="w-8 h-8 border-4 border-[#C4623F] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{locale === 'fr' ? 'Chargement...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black pb-24 md:pb-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {jobPostingSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jobPostingSchema) }}
        />
      )}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')}>
            <Image src="/logo.svg" alt="Bolo237" width={120} height={32} className="h-8 w-auto" />
          </Link>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-600 hover:text-[#C4623F] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            {locale === 'fr' ? 'Retour' : 'Back'}
          </button>
        </div>
      </nav>

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-5">
            <div className="flex items-start gap-4">
              <div className="relative shrink-0">
                {'logoUrl' in annonce && annonce.logoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={annonce.logoUrl}
                    alt={annonce.entreprise}
                    className="w-14 h-14 rounded-xl object-contain bg-white border border-gray-200 p-1"
                  />
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center font-extrabold text-[#C4623F]">
                    {annonce.logo}
                  </div>
                )}
                {'isVerified' in annonce && annonce.isVerified && (
                  <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-green-600 border-2 border-white flex items-center justify-center text-[9px] text-white font-bold">&#10003;</span>
                )}
              </div>

              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-black">{display.titre}</h1>
                <p className="text-gray-600 font-bold mt-2 flex items-center gap-2">
                  {display.entreprise}
                  {'isVerified' in annonce && annonce.isVerified && (
                    <span className="inline-flex items-center gap-1 bg-green-50 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full border border-green-200">
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="#059669"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                      Certifie
                    </span>
                  )}
                </p>
                <button
                  onClick={() => setTranslated((s) => !s)}
                  className="mt-3 inline-flex text-xs font-extrabold text-[#C4623F] bg-orange-50 border border-orange-100 px-3 py-1.5 rounded-full hover:bg-orange-100 transition"
                >
                  ✨ {locale === 'fr' ? (translated ? 'Voir la version originale' : t.home.translateAd) : (translated ? 'Show original version' : t.home.translateAd)}
                </button>

                <div className="flex flex-wrap gap-2 mt-4 text-sm font-bold">
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{annonce.contrat}</span>
                  <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-700">{annonce.lieu}</span>
                  <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{annonce.mode}</span>
                  <span className="px-3 py-1 rounded-full bg-orange-50 text-[#C4623F] border border-orange-100">{annonce.salaire}</span>
                </div>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-3">
              {externalApplyUrl && (
                <a
                  href={externalApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-black hover:bg-zinc-800 text-white font-extrabold px-6 py-3 rounded-xl shadow-sm transition"
                >
                  {locale === 'fr' ? "Postuler sur le site de l'entreprise" : "Apply on company site"}
                </a>
              )}
              <button
                onClick={handleApplyClick}
                disabled={maskedByReports || isApplying}
                className="inline-flex bg-[#C4623F] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#A8502F] text-white font-extrabold px-8 py-3 rounded-xl shadow-sm transition"
              >
                {maskedByReports ? t.security.adMaskedCta : isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.apply}
              </button>
            </div>
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

          <div className="bg-white border border-gray-200 rounded-2xl p-5">
            <h2 className="text-base font-extrabold text-black mb-3">
              {t.security.antiFraudTitle}
            </h2>
            <FraudReportButton
              targetType="annonce"
              targetId={id}
              onAutoMaskedChange={setMaskedByReports}
            />
          </div>

          <article className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8">
            <h2 className="text-xl font-extrabold mb-3">{locale === 'fr' ? 'À propos du poste' : 'About this role'}</h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-line">{display.description}</p>
          </article>

          <div className="hidden md:flex justify-end">
            <div className="flex items-center gap-3">
              {externalApplyUrl && (
                <a
                  href={externalApplyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center bg-black hover:bg-zinc-800 text-white font-extrabold px-6 py-3 rounded-xl shadow-sm transition"
                >
                  {locale === 'fr' ? "Postuler sur le site de l'entreprise" : "Apply on company site"}
                </a>
              )}
              <button
                onClick={handleApplyClick}
                disabled={maskedByReports || isApplying}
                className="bg-[#C4623F] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#A8502F] text-white font-extrabold px-8 py-3 rounded-xl shadow-sm transition"
              >
                {isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.apply}
              </button>
            </div>
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

      {/* Mobile fixed apply button */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <div className="grid grid-cols-1 gap-2">
          {externalApplyUrl && (
            <a
              href={externalApplyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full text-center bg-black hover:bg-zinc-800 text-white font-extrabold py-3 rounded-xl transition"
            >
              {locale === 'fr' ? "Postuler sur le site de l'entreprise" : "Apply on company site"}
            </a>
          )}
          <button
            onClick={handleApplyClick}
            disabled={maskedByReports || isApplying}
            className="w-full bg-[#C4623F] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#A8502F] text-white font-extrabold py-3 rounded-xl transition"
          >
            {maskedByReports ? t.security.adMaskedCta : isApplying ? (locale === 'fr' ? 'Envoi...' : 'Sending...') : t.security.applyNow}
          </button>
        </div>
      </div>

      {/* Application Review Modal */}
      {showApplicationReview && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-black">
                  {locale === 'fr' ? 'Verifiez votre dossier de candidature' : 'Review your application'}
                </h2>
                <button
                  onClick={() => setShowApplicationReview(false)}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                </button>
              </div>

              {/* Applying to */}
              <div className="bg-gray-50 rounded-xl p-4 mb-6">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                  {locale === 'fr' ? 'Poste' : 'Position'}
                </p>
                <p className="font-extrabold text-black">{display.titre}</p>
                <p className="text-sm text-gray-600">{display.entreprise}</p>
              </div>

              {/* User profile summary */}
              <div className="mb-6">
                <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3">
                  {locale === 'fr' ? 'Votre profil' : 'Your profile'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C4623F] flex items-center justify-center text-white font-bold text-sm">
                      {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-black">{userProfile?.name || (locale === 'fr' ? 'Nom non renseigne' : 'Name not set')}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-sm text-gray-500">{userProfile?.title || (locale === 'fr' ? 'Titre non renseigne' : 'Title not set')}</p>
                        {userProfile?.isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                            ✓ {locale === 'fr' ? 'Certifie' : 'Certified'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {userProfile?.skills && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-gray-500 mb-1">{locale === 'fr' ? 'Competences' : 'Skills'}</p>
                      <p className="text-sm text-gray-700">{userProfile.skills}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div className="mb-6">
                <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3">
                  {locale === 'fr' ? 'Checklist' : 'Checklist'}
                </h3>
                {isLoadingReview && (
                  <p className="text-xs font-semibold text-gray-500 mb-3">
                    {locale === 'fr' ? 'Verification du dossier en cours...' : 'Checking your application file...'}
                  </p>
                )}
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userProfile?.profileComplete ? 'bg-[#C4623F]' : 'bg-gray-200'}`}>
                      {userProfile?.profileComplete ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${userProfile?.profileComplete ? 'text-black' : 'text-gray-400'}`}>
                      {locale === 'fr' ? 'Profil complet' : 'Profile complete'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userProfile?.cvUploaded ? 'bg-[#C4623F]' : 'bg-gray-200'}`}>
                      {userProfile?.cvUploaded ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${userProfile?.cvUploaded ? 'text-black' : 'text-gray-400'}`}>
                      {locale === 'fr' ? 'CV telecharge' : 'CV uploaded'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center ${userProfile?.phoneVerified ? 'bg-[#C4623F]' : 'bg-gray-200'}`}>
                      {userProfile?.phoneVerified ? (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      ) : (
                        <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
                      )}
                    </div>
                    <span className={`text-sm font-semibold ${userProfile?.phoneVerified ? 'text-black' : 'text-gray-400'}`}>
                      {locale === 'fr' ? 'Telephone verifie' : 'Phone verified'}
                    </span>
                  </div>
                </div>
              </div>

              {userProfile && userProfile.missingItems.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6">
                  <p className="text-sm font-extrabold text-amber-800 mb-2">
                    {locale === 'fr' ? 'Elements a completer avant envoi' : 'Complete these items before submitting'}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {userProfile.missingItems.map((item) => (
                      <span key={item} className="rounded-full border border-amber-200 bg-white px-2.5 py-1 text-xs font-bold text-amber-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Complete profile link */}
              <Link
                href={localizePath('/profil')}
                className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C4623F] hover:underline mb-6"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                {locale === 'fr' ? 'Completer mon profil' : 'Complete my profile'}
              </Link>

              {/* Action buttons */}
              <div className="flex flex-col gap-3 mt-2">
                <button
                  onClick={handleConfirmApply}
                  disabled={isApplying || isLoadingReview || Boolean(userProfile?.missingItems.length)}
                  className="w-full bg-[#C4623F] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#A8502F] text-white font-extrabold py-3 rounded-xl transition"
                >
                  {isApplying
                    ? (locale === 'fr' ? 'Envoi en cours...' : 'Sending...')
                    : (locale === 'fr' ? 'Confirmer et envoyer' : 'Confirm and send')
                  }
                </button>
                <button
                  onClick={() => setShowApplicationReview(false)}
                  className="w-full text-gray-600 font-bold py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  {locale === 'fr' ? 'Annuler' : 'Cancel'}
                </button>
              </div>

              {/* Apply error inside modal */}
              {applyMessage && (
                <div className={`rounded-xl p-3 text-sm font-semibold mt-4 ${applyMessage.toLowerCase().includes('echec') || applyMessage.toLowerCase().includes('failed') ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'}`}>
                  {applyMessage}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
