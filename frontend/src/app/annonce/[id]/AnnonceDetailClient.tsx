"use client";

import { use, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Script from 'next/script';
import { useLocale } from '@/components/LocaleProvider';
import FraudReportButton from '@/components/FraudReportButton';
import ApplyButton from '@/components/ApplyButton';
import { fetchJob, fetchUserProfile, submitJobApplication, trackJobApplyClick, trackJobView, ApiError } from '@/lib/api';
import {
  extractExternalApplyUrl,
  getContractLabel,
  getExperienceLabel,
  getWorkModeLabel,
  getWorkTimeLabel,
  mapApiJobToListing,
  sanitizeJobDescription,
} from '@/lib/job-listings';
import { useApi } from '@/lib/useApi';
import { trackEvent } from '@/lib/analytics';
import { safeJsonLd } from '@/lib/jsonLd';
import { getStoredUser } from '@/lib/session';
import { buildJobDetailSegment, parseJobIdFromSegment } from '@/lib/jobSlug';

type JobParams = {
  params: Promise<{
    id: string;
  }>;
};

function formatDate(dateStr: string, isEn: boolean): string {
  return new Date(dateStr).toLocaleDateString(isEn ? 'en-GB' : 'fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function splitDescription(description: string): { paragraphs: string[]; bulletItems: string[] } {
  const normalized = String(description || '').replace(/\r\n/g, '\n').trim();
  if (!normalized) {
    return { paragraphs: [], bulletItems: [] };
  }

  const sections = normalized.split(/\n{2,}/).map((section) => section.trim()).filter(Boolean);
  const paragraphs: string[] = [];
  const bulletItems: string[] = [];

  sections.forEach((section) => {
    const lines = section.split('\n').map((line) => line.trim()).filter(Boolean);
    const bulletLines = lines.filter((line) => /^(?:[-*•]|\d+\.)\s+/.test(line));

    if (bulletLines.length === lines.length && bulletLines.length > 0) {
      bulletItems.push(...bulletLines.map((line) => line.replace(/^(?:[-*•]|\d+\.)\s+/, '').trim()));
      return;
    }

    paragraphs.push(lines.join(' '));
  });

  if (paragraphs.length === 0 && bulletItems.length === 0) {
    paragraphs.push(normalized);
  }

  return { paragraphs, bulletItems };
}

function pickLocalizedText(primary?: string | null, secondary?: string | null, legacy?: string | null): string {
  const primaryValue = String(primary || '').trim();
  if (primaryValue) {
    return primaryValue;
  }

  const secondaryValue = String(secondary || '').trim();
  if (secondaryValue) {
    return secondaryValue;
  }

  return String(legacy || '').trim();
}

function getLocalizedJobTitleLocal(
  job: { title: string; titleFr?: string | null; titleEn?: string | null },
  isEn: boolean,
): string {
  return isEn
    ? pickLocalizedText(job.titleEn, job.titleFr, job.title)
    : pickLocalizedText(job.titleFr, job.titleEn, job.title);
}

function getLocalizedJobDescriptionLocal(
  job: { description: string; descriptionFr?: string | null; descriptionEn?: string | null },
  isEn: boolean,
): string {
  return isEn
    ? pickLocalizedText(job.descriptionEn, job.descriptionFr, job.description)
    : pickLocalizedText(job.descriptionFr, job.descriptionEn, job.description);
}

function mapCameroonLocations(location: string) {
  const normalized = String(location || '')
    .replace(/\s+/g, ' ')
    .replace(/[./]/g, ',')
    .split(/,|\/|;|\band\b|\bet\b/gi)
    .map((part) => part.trim())
    .filter(Boolean);

  const cityMap = new Map([
    ['douala', 'Douala'],
    ['yaounde', 'Yaounde'],
    ['yaoundé', 'Yaounde'],
    ['bafoussam', 'Bafoussam'],
    ['bertoua', 'Bertoua'],
    ['garoua', 'Garoua'],
    ['maroua', 'Maroua'],
    ['kaele', 'Kaele'],
    ['kaélé', 'Kaele'],
    ['limbe', 'Limbe'],
    ['buea', 'Buea'],
    ['bamenda', 'Bamenda'],
    ['kribi', 'Kribi'],
    ['ngaoundere', 'Ngaoundere'],
    ['ngaoundéré', 'Ngaoundere'],
  ]);

  const cities = normalized
    .map((part) => cityMap.get(part.toLowerCase()))
    .filter((value, index, array) => Boolean(value) && array.indexOf(value) === index);

  if (cities.length > 0) {
    return cities.map((city) => ({
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city,
        addressCountry: 'CM',
      },
    }));
  }

  return [
    {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: String(location || '').trim() || 'Cameroon',
        addressCountry: 'CM',
      },
    },
  ];
}

function mapEmploymentType(value: string | null | undefined) {
  const normalized = String(value || '').toLowerCase();
  if (normalized.includes('freelance') || normalized.includes('contract')) return 'CONTRACTOR';
  if (normalized.includes('part time')) return 'PART_TIME';
  if (normalized.includes('intern')) return 'INTERN';
  if (normalized.includes('temporary') || normalized.includes('short term')) return 'TEMPORARY';
  return 'FULL_TIME';
}

type UserProfile = {
  id: number;
  name: string;
  title: string;
  skills: string;
  defaultCvUrl: string;
  cvUploaded: boolean;
  phoneVerified: boolean;
  profileComplete: boolean;
  isVerified: boolean;
  missingItems: string[];
};

export default function AnnonceDetailClient({ params }: JobParams) {
  const { id } = use(params);
  const numericId = parseJobIdFromSegment(id);
  const { t, localizePath, locale } = useLocale();
  const isEn = locale === 'en';
  const [maskedByReports, setMaskedByReports] = useState(false);
  const [applyMessage, setApplyMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showApplicationReview, setShowApplicationReview] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoadingReview, setIsLoadingReview] = useState(false);
  const [message, setMessage] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [useDefaultCv, setUseDefaultCv] = useState(true);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const trackedViewJobIdRef = useRef<number | null>(null);

  // Fetch le détail de l'offre depuis le backend
  const { data: apiJob, loading } = useApi(
    () => (numericId === null ? Promise.reject(new Error('Invalid ID')) : fetchJob(numericId)),
    null,
    [numericId]
  );

  useEffect(() => {
    if (!apiJob?.id || trackedViewJobIdRef.current === apiJob.id) return;
    trackedViewJobIdRef.current = apiJob.id;
    void trackJobView(apiJob.id).catch(() => {});
  }, [apiJob?.id]);

  // Load user profile from localStorage when review panel opens
  useEffect(() => {
    if (showApplicationReview) {
      const loadReviewProfile = async () => {
        setIsLoadingReview(true);
        try {
            const user = getStoredUser();
            if (!user) return;

            const profile = await fetchUserProfile(0).catch(() => null);
            const phoneVerified = localStorage.getItem('bolo237-phone-verified') === 'true';
            const fullName = String(profile?.fullName || user.name || '').trim();
            const title = String(profile?.title || '').trim();
            const skills = String(profile?.skillsText || '').trim();
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
              id: 0,
            name: fullName,
            title,
            skills,
            defaultCvUrl: String(profile?.defaultCvUrl || '').trim(),
            cvUploaded: Boolean(profileComplete || profile?.defaultCvUrl),
            phoneVerified,
            profileComplete,
              isVerified: Boolean(user?.isVerified),
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

  const annonce = useMemo(() => {
    if (!apiJob) {
      return null;
    }

    const listing = mapApiJobToListing(apiJob, 0, isEn);
    const localizedTitle = getLocalizedJobTitleLocal(apiJob, isEn);
    const localizedDescription = getLocalizedJobDescriptionLocal(apiJob, isEn);
    const description = sanitizeJobDescription(localizedDescription || apiJob.description || '');
    const companySummary = listing.isVerified
      ? (isEn
          ? `${apiJob.company} has a verified employer profile on Bolo237 and is currently hiring in ${listing.location}.`
        : `${apiJob.company} dispose d'un profil employeur vérifié sur Bolo237 et recrute actuellement à ${listing.location}.`)
      : (isEn
          ? `${apiJob.company} is actively hiring in ${listing.location} through Bolo237.`
        : `${apiJob.company} recrute actuellement à ${listing.location} via Bolo237.`);

    return {
      id: apiJob.id,
      title: localizedTitle || apiJob.title,
      company: apiJob.company,
      listing,
      publication: formatDate(apiJob.createdAt, isEn),
      deadline: isEn ? 'Not specified' : 'Non précisée',
      description,
      companySummary,
    };
  }, [apiJob, isEn]);

  const descriptionContent = useMemo(
    () => splitDescription(annonce?.description || ''),
    [annonce?.description],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#0F4C81] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">{isEn ? 'Loading...' : 'Chargement...'}</p>
        </div>
      </div>
    );
  }

  if (!annonce) {
    return (
      <div className="min-h-screen bg-[#F4F7FB]">
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
              {!isEn
                ? 'Cette offre n’existe plus ou a été retirée.'
                : 'This listing no longer exists or has been removed.'}
            </p>
            <Link href={localizePath('/emplois')} className="inline-block bg-[#C4623F] text-white px-6 py-3 rounded-xl font-bold hover:opacity-90 transition">
              {isEn ? 'Browse jobs' : 'Voir les offres'}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const canonicalJobSegment = apiJob ? buildJobDetailSegment(apiJob) : id;
  const canonicalJobUrl = `https://www.bolo237.com/${locale}/annonce/${canonicalJobSegment}`;
  const externalApplyUrl = apiJob
    ? (
        String(apiJob.externalApplyUrl || '').trim() ||
        extractExternalApplyUrl([
          apiJob.descriptionEn,
          apiJob.descriptionFr,
          apiJob.description,
        ].filter(Boolean).join('\n'))
      )
    : null;
  const isExternalOnlyApplication = Boolean(externalApplyUrl);
  const jobPostingSchema = apiJob
    ? {
        '@context': 'https://schema.org',
        '@type': 'JobPosting',
        title: annonce.title,
        description: annonce.description,
        identifier: apiJob.reference
          ? {
              '@type': 'PropertyValue',
              name: 'Bolo237',
              value: apiJob.reference,
            }
          : undefined,
        datePosted: apiJob.createdAt,
        employmentType: mapEmploymentType(apiJob.salary),
        hiringOrganization: {
          '@type': 'Organization',
          name: apiJob.company,
          sameAs: 'https://www.bolo237.com',
          logo: (() => {
            const photoUrl = String(apiJob.author?.photoUrl || '').trim();
            if (!photoUrl) return 'https://www.bolo237.com/icon.svg';
            return /^https?:\/\//i.test(photoUrl) ? photoUrl : `https://www.bolo237.com${photoUrl}`;
          })(),
        },
        jobLocation: mapCameroonLocations(apiJob.location),
        applicantLocationRequirements: {
          '@type': 'Country',
          name: 'Cameroon',
          sameAs: 'https://www.wikidata.org/wiki/Q1009',
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
        name: annonce.title,
        item: canonicalJobUrl,
      },
    ],
  };

  const handleApplyClick = () => {
    if (apiJob?.id) {
      void trackJobApplyClick(apiJob.id).catch(() => {});
    }

    if (externalApplyUrl) {
      window.open(externalApplyUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    if (!apiJob) {
      setApplyMessage(isEn ? 'Job not available.' : 'Annonce indisponible.');
      return;
    }

    let candidateId = 0;
    let userRole = '';
    try {
      const raw = localStorage.getItem('bolo237-user');
      if (raw) {
        const user = JSON.parse(raw);
        candidateId = Number(user.id || 0);
        userRole = String(user.role || localStorage.getItem('bolo237-account-role') || '').toUpperCase();
      }
    } catch {
      // ignore parse errors
    }

    if (userRole === 'ENTREPRISE' || userRole === 'ARTISAN') {
      setApplyMessage(
        isEn
          ? 'Companies and artisans cannot apply to job listings. Browse the CV database to find candidates.'
          : 'Les entreprises et artisans ne postulent pas aux offres. Consultez la CVthèque pour trouver des candidats.'
      );
      return;
    }

    if (!candidateId) {
      setApplyMessage(isEn ? 'Please sign in before applying.' : 'Connectez-vous pour postuler.');
      return;
    }

    setMessage('');
    setCvFile(null);
    setUseDefaultCv(true);
    setFormErrors({});
    setApplyMessage('');
    setShowApplicationReview(true);
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || !event.target.files[0]) {
      return;
    }

    const file = event.target.files[0];
    if (file.size > 5 * 1024 * 1024) {
      setFormErrors((prev) => ({ ...prev, cv: isEn ? 'File is too large (5MB max).' : 'Le fichier est trop volumineux (5 Mo max).' }));
      return;
    }

    setCvFile(file);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.cv;
      return next;
    });
  };

  const handleApply = async (event: FormEvent) => {
    event.preventDefault();
    setFormErrors({});

    if (!apiJob || !userProfile) return;

    if (userProfile.missingItems.length > 0) {
      setApplyMessage(
        isEn
          ? `Incomplete application file: ${userProfile.missingItems.join(', ')}.`
          : `Dossier incomplet: ${userProfile.missingItems.join(', ')}.`
      );
      return;
    }

    const selectedDefaultCvUrl = useDefaultCv ? String(userProfile.defaultCvUrl || '').trim() : '';

    if (!cvFile && !selectedDefaultCvUrl) {
      setFormErrors({ cv: isEn ? 'Please attach your CV.' : 'Veuillez joindre votre CV.' });
      return;
    }

    setIsSubmitting(true);
    setApplyMessage('');

    try {
      await submitJobApplication(apiJob.id, message, {
        cvFile,
        defaultCvUrl: selectedDefaultCvUrl || null,
      });

      setShowApplicationReview(false);
      setMessage('');
      setCvFile(null);
      setUseDefaultCv(true);
      trackEvent('candidature_submitted', { jobId: apiJob.id });
      setApplyMessage(
        isEn
          ? 'Your application has been sent successfully!'
          : 'Votre candidature a été envoyée avec succès !'
      );
    } catch (error) {
      if (error instanceof ApiError) {
        const data = (error.details ?? {}) as { errors?: Array<{ champ?: string; message?: string } | string>; message?: string };
        const nextErrors: Record<string, string> = {};

        if (Array.isArray(data.errors)) {
          data.errors.forEach((err) => {
            if (typeof err === 'string') {
              const normalized = err.toLowerCase();
              if (normalized.includes('motivation')) nextErrors.message = err;
              else if (normalized.includes('cv') || normalized.includes('fichier')) nextErrors.cv = err;
              else nextErrors.global = err;
              return;
            }
            if (err?.champ && err?.message) nextErrors[err.champ] = err.message;
            else if (err?.message) nextErrors.global = err.message;
          });
        }

        if (!nextErrors.cv && typeof data.message === 'string' && data.message.toLowerCase().includes('cv')) {
          nextErrors.cv = data.message;
        }

        if (Object.keys(nextErrors).length > 0) {
          setFormErrors(nextErrors);
          setApplyMessage(
            isEn
              ? 'Please check the information provided.'
              : 'Veuillez vérifier les informations fournies.'
          );
          return;
        }

        setApplyMessage((isEn ? 'Application failed: ' : 'Echec candidature: ') + (data.message || error.message));
        return;
      }
      const message = error instanceof Error ? error.message : String(error);
      setApplyMessage((isEn ? 'Application failed: ' : 'Echec candidature: ') + message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const heroHighlights = [
    {
      label: isEn ? 'Location' : 'Lieu',
      value: annonce.listing.location || (isEn ? 'Not specified' : 'Non precise'),
      icon: <LocationIcon />,
    },
    {
      label: isEn ? 'Work mode' : 'Mode de travail',
      value: getWorkModeLabel(annonce.listing.workMode, isEn),
      icon: <BriefcaseIcon />,
    },
    {
      label: isEn ? 'Salary' : 'Salaire',
      value: annonce.listing.salary || (isEn ? 'Not disclosed' : 'Non communique'),
      icon: <MoneyIcon />,
    },
    {
      label: isEn ? 'Schedule' : 'Temps de travail',
      value: getWorkTimeLabel(annonce.listing.workTime, isEn),
      icon: <ClockIcon />,
    },
  ];

  const overviewItems = [
    { label: isEn ? 'Contract type' : 'Type de contrat', value: getContractLabel(annonce.listing.contractType, isEn), icon: <ContractIcon /> },
    { label: isEn ? 'Experience' : 'Experience', value: getExperienceLabel(annonce.listing.experienceLevel, isEn), icon: <ExperienceIcon /> },
    { label: isEn ? 'Work mode' : 'Mode de travail', value: getWorkModeLabel(annonce.listing.workMode, isEn), icon: <BriefcaseIcon /> },
    { label: isEn ? 'Working time' : 'Temps de travail', value: getWorkTimeLabel(annonce.listing.workTime, isEn), icon: <ClockIcon /> },
    { label: isEn ? 'Application' : 'Candidature', value: isExternalOnlyApplication ? (isEn ? 'Company website' : 'Site entreprise') : 'Bolo237', icon: <ApplyIcon /> },
    { label: isEn ? 'Reference' : 'Reference', value: apiJob?.reference ?? `#${annonce.id}`, icon: <HashIcon /> },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] text-slate-950 pb-24 md:pb-10">
      <Script
        id="job-breadcrumb-jsonld"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbSchema) }}
      />
      {jobPostingSchema && (
        <Script
          id="job-posting-jsonld"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jobPostingSchema) }}
        />
      )}
      <nav className="border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={localizePath('/')}>
            <Image src="/logo.svg" alt="Bolo237" width={120} height={32} priority className="h-8 w-auto" />
          </Link>
          <button onClick={() => window.history.back()} className="inline-flex items-center gap-1.5 text-sm font-bold text-slate-600 hover:text-[#0F4C81] transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
            {isEn ? 'Back' : 'Retour'}
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <Link href={localizePath('/emplois')} className="mb-4 inline-flex items-center gap-2 text-sm font-bold text-slate-500 transition hover:text-[#0F4C81]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5"/></svg>
          {isEn ? 'Back to jobs' : 'Retour aux offres'}
        </Link>

        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-[0_28px_80px_-42px_rgba(15,23,42,0.45)]">
          <div className="border-b border-slate-100 bg-[radial-gradient(circle_at_top_left,rgba(15,76,129,0.14),transparent_44%),linear-gradient(180deg,#FFFFFF_0%,#F7FAFC_100%)] px-6 py-7 md:px-8 md:py-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] ${annonce.listing.applicationType === 'bolo237' ? 'bg-[#E8F1FA] text-[#0F4C81]' : 'bg-[#FFF3EA] text-[#B45309]'}`}>
                    {annonce.listing.applicationType === 'bolo237'
                      ? (isEn ? 'Quick apply' : 'Candidature rapide')
                      : (isEn ? 'Company website' : 'Site entreprise')}
                  </span>
                  {annonce.listing.isNew ? (
                    <span className="rounded-full bg-[#E8F8EF] px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-emerald-700">
                      {isEn ? 'New' : 'Nouveau'}
                    </span>
                  ) : null}
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
                    {annonce.listing.postedLabel}
                  </span>
                </div>

                <h1 className="max-w-4xl text-3xl font-extrabold leading-tight text-slate-950 md:text-[2.6rem]">
                  {annonce.title}
                </h1>

                <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-600">
                  <span className="flex items-center gap-2 font-bold text-slate-900">
                    <BuildingIcon />
                    {annonce.company}
                  </span>
                  {annonce.listing.isVerified ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                      <ShieldCheckIcon />
                      {isEn ? 'Verified employer' : 'Employeur vérifié'}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-2">
                    <LocationIcon />
                    {annonce.listing.location}
                  </span>
                </div>

                <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 md:text-[15px]">
                  {descriptionContent.paragraphs[0] || annonce.companySummary}
                </p>

                <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {heroHighlights.map((item) => (
                    <HeroFact key={item.label} label={item.label} value={item.value} icon={item.icon} />
                  ))}
                </div>
              </div>

              <aside className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="relative shrink-0">
                    {annonce.listing.logoUrl ? (
                      <div className="flex h-[84px] w-[84px] items-center justify-center overflow-hidden rounded-lg border border-gray-100 bg-white p-2 shadow-sm">
                        <Image
                          src={annonce.listing.logoUrl}
                          alt={annonce.company}
                          width={84}
                          height={84}
                          className="h-full w-full object-contain"
                          loading="lazy"
                          unoptimized
                        />
                      </div>
                    ) : (
                      <div
                        style={{ backgroundColor: `${annonce.listing.logoColor}18`, borderColor: `${annonce.listing.logoColor}30`, color: annonce.listing.logoColor }}
                        className="flex h-[84px] w-[84px] items-center justify-center rounded-[22px] border text-xl font-black"
                      >
                        {annonce.listing.logoInitials}
                      </div>
                    )}
                    {annonce.listing.isVerified ? (
                      <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-600 text-[11px] font-bold text-white">✓</span>
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                      {isEn ? 'Employer' : 'Employeur'}
                    </p>
                    <h2 className="mt-1 text-lg font-extrabold text-slate-950">{annonce.company}</h2>
                    <p className="mt-1 text-sm text-slate-500">{annonce.listing.location}</p>
                  </div>
                </div>

                <div className="mt-5 space-y-3 border-t border-slate-100 pt-5">
                  <SidebarStat label={isEn ? 'Published' : 'Publication'} value={annonce.publication} />
                  <SidebarStat label={isEn ? 'Reference' : 'Reference'} value={`#${annonce.id}`} />
                  <SidebarStat label={isEn ? 'Application route' : 'Mode de candidature'} value={isExternalOnlyApplication ? (isEn ? 'Company website' : 'Site entreprise') : 'Bolo237'} />
                </div>

                <div className="mt-5 grid gap-3">
                  <ApplyButton
                    externalApplyUrl={externalApplyUrl}
                    onInternalApply={handleApplyClick}
                    disabled={maskedByReports}
                    loading={isSubmitting}
                    disabledLabel={maskedByReports ? t.security.adMaskedCta : undefined}
                    className={
                      externalApplyUrl
                        ? 'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-extrabold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300'
                        : 'inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#0F4C81] px-5 py-3 text-sm font-extrabold text-white transition hover:bg-[#0C3E69] disabled:cursor-not-allowed disabled:bg-slate-300'
                    }
                  >
                    {externalApplyUrl ? (isEn ? 'Apply' : 'Postuler') : t.security.applyNow}
                  </ApplyButton>
                </div>

                {isExternalOnlyApplication ? (
                  <p className="mt-4 text-xs font-semibold leading-5 text-slate-500">
                    {isEn
                      ? 'Applications for this role are handled on the company website.'
                      : 'Les candidatures pour ce poste sont gérées sur le site de l\'entreprise.'}
                  </p>
                ) : null}

                {applyMessage ? (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm font-semibold ${applyMessage.toLowerCase().includes('echec') || applyMessage.toLowerCase().includes('failed') ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                    {applyMessage}
                  </div>
                ) : null}
              </aside>
            </div>
          </div>

          <div className="grid gap-6 px-6 py-7 md:px-8 md:py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="space-y-6">
              {maskedByReports ? (
                <div className="rounded-[24px] border border-red-200 bg-red-50 p-5">
                  <p className="text-sm font-extrabold text-red-700">{t.security.autoMaskedAd}</p>
                </div>
              ) : null}

              <div className="rounded-[24px] border border-amber-200 bg-amber-50 p-5">
                <p className="text-sm font-extrabold text-amber-800">{t.security.redJobWarning}</p>
              </div>

              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <SectionTitle title={isEn ? 'About the role' : 'À propos du poste'} subtitle={isEn ? 'Core mission, context and what the company expects from the candidate.' : 'Mission, contexte et attentes de l’employeur pour ce poste.'} />
                <div className="mt-5 space-y-4 text-[15px] leading-8 text-slate-700">
                  {descriptionContent.paragraphs.map((paragraph, index) => (
                    <p key={`${paragraph.slice(0, 40)}-${index}`}>{paragraph}</p>
                  ))}
                  {descriptionContent.paragraphs.length === 0 ? (
                    <p>{isEn ? 'No detailed description has been provided yet.' : 'Aucune description détaillée n’a encore été fournie.'}</p>
                  ) : null}
                </div>

                {descriptionContent.bulletItems.length > 0 ? (
                  <div className="mt-6 rounded-[24px] border border-slate-200 bg-slate-50 p-5">
                    <h3 className="text-sm font-extrabold uppercase tracking-[0.14em] text-slate-500">
                      {isEn ? 'Key points' : 'Points clés'}
                    </h3>
                    <ul className="mt-4 space-y-3">
                      {descriptionContent.bulletItems.map((item) => (
                        <li key={item} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                          <span className="mt-1 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#E8F1FA] text-[#0F4C81]">•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <SectionTitle title={isEn ? 'Apply with a complete profile' : 'Postulez avec un dossier complet'} subtitle={isEn ? 'A well-prepared candidate file improves response quality and cuts back-and-forth.' : 'Un dossier candidat bien préparé améliore la qualité des retours et réduit les allers-retours.'} />
                <div className="mt-5 grid gap-3 md:grid-cols-3">
                  <HeroFact label={isEn ? 'Step 1' : 'Étape 1'} value={isEn ? 'Check your profile and contact details.' : 'Vérifiez votre profil et vos coordonnées.'} icon={<ProfileIcon />} />
                  <HeroFact label={isEn ? 'Step 2' : 'Étape 2'} value={isEn ? 'Upload your CV and add your skills.' : 'Ajoutez votre CV et vos compétences.'} icon={<DocumentIcon />} />
                  <HeroFact label={isEn ? 'Step 3' : 'Étape 3'} value={isEn ? 'Send the application once everything is complete.' : 'Envoyez votre candidature une fois le dossier complet.'} icon={<ApplyIcon />} />
                </div>
              </article>

              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm md:p-7">
                <SectionTitle title={t.security.antiFraudTitle} subtitle={isEn ? 'Report suspicious behavior directly from this listing.' : 'Signalez un comportement suspect directement depuis cette annonce.'} />
                <div className="mt-5">
                  <FraudReportButton
                    targetType="annonce"
                    targetId={String(annonce.id)}
                    onAutoMaskedChange={setMaskedByReports}
                  />
                </div>
              </div>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-6 lg:h-fit">
              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle title={isEn ? 'Job overview' : 'Vue d’ensemble'} subtitle={isEn ? 'The essentials at a glance.' : 'Les informations essentielles en un coup d’œil.'} />
                <div className="mt-5 space-y-3">
                  {overviewItems.map((item) => (
                    <SidebarInfoRow key={item.label} icon={item.icon} label={item.label} value={item.value} />
                  ))}
                </div>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle title={isEn ? 'About the company' : 'À propos de l’entreprise'} subtitle={isEn ? 'Public employer details visible on Bolo237.' : 'Informations publiques de l’employeur visibles sur Bolo237.'} />
                <p className="mt-4 text-sm leading-7 text-slate-600">{annonce.companySummary}</p>
              </article>

              <article className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <SectionTitle title={isEn ? 'Timeline' : 'Chronologie'} subtitle={isEn ? 'Publishing and application references for this listing.' : 'Repères de publication et de candidature pour cette annonce.'} />
                <div className="mt-5 space-y-3">
                  <SidebarStat label={isEn ? 'Published' : 'Publication'} value={annonce.publication} />
                  <SidebarStat label={isEn ? 'Deadline' : 'Date limite'} value={annonce.deadline} />
                  <SidebarStat label={isEn ? 'Job ID' : 'ID annonce'} value={`#${annonce.id}`} />
                </div>
              </article>
            </aside>
          </div>
        </section>
      </main>

      {/* Mobile fixed apply button */}
      <div className="fixed md:hidden bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-3 z-50">
        <div className="grid grid-cols-1 gap-2">
          <ApplyButton
            externalApplyUrl={externalApplyUrl}
            onInternalApply={handleApplyClick}
            disabled={maskedByReports}
            loading={isSubmitting}
            disabledLabel={maskedByReports ? t.security.adMaskedCta : undefined}
            className={
              externalApplyUrl
                ? 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-black py-3 text-center font-extrabold text-white transition hover:bg-zinc-800 disabled:bg-gray-300 disabled:cursor-not-allowed'
                : 'inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#C4623F] py-3 text-center font-extrabold text-white transition hover:bg-[#A8502F] disabled:bg-gray-300 disabled:cursor-not-allowed'
            }
          >
            {externalApplyUrl ? (isEn ? 'Apply' : 'Postuler') : t.security.applyNow}
          </ApplyButton>
        </div>
      </div>

      {/* Application Review Modal */}
      {showApplicationReview && !isExternalOnlyApplication && (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="p-6 md:p-8">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-extrabold text-black">
                  {isEn ? 'Review your application' : 'Vérifiez votre dossier de candidature'}
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
                  {isEn ? 'Position' : 'Poste'}
                </p>
                <p className="font-extrabold text-black">{annonce.title}</p>
                <p className="text-sm text-gray-600">{annonce.company}</p>
              </div>

              {/* User profile summary */}
              <div className="mb-6">
                <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3">
                  {isEn ? 'Your profile' : 'Votre profil'}
                </h3>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#C4623F] flex items-center justify-center text-white font-bold text-sm">
                      {userProfile?.name ? userProfile.name.charAt(0).toUpperCase() : '?'}
                    </div>
                    <div>
                      <p className="font-bold text-black">{userProfile?.name || (isEn ? 'Name not set' : 'Nom non renseigne')}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <p className="text-sm text-gray-500">{userProfile?.title || (isEn ? 'Title not set' : 'Titre non renseigné')}</p>
                        {userProfile?.isVerified && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-extrabold text-emerald-700">
                            ✓ {isEn ? 'Certified' : 'Certifié'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {userProfile?.skills && (
                    <div className="mt-2">
                      <p className="text-xs font-bold text-gray-500 mb-1">{isEn ? 'Skills' : 'Compétences'}</p>
                      <p className="text-sm text-gray-700">{userProfile.skills}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Checklist */}
              <div className="mb-6">
                <h3 className="text-sm font-extrabold text-gray-500 uppercase tracking-wide mb-3">
                  {isEn ? 'Checklist' : 'Checklist'}
                </h3>
                {isLoadingReview && (
                  <p className="text-xs font-semibold text-gray-500 mb-3">
                    {isEn ? 'Checking your application file...' : 'Vérification du dossier en cours...'}
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
                      {isEn ? 'Profile complete' : 'Profil complet'}
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
                      {isEn ? 'CV uploaded' : 'CV téléchargé'}
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
                      {isEn ? 'Phone verified' : 'Téléphone vérifié'}
                    </span>
                  </div>
                </div>
              </div>

              {userProfile && userProfile.missingItems.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 mb-6">
                  <p className="text-sm font-extrabold text-amber-800 mb-2">
                    {isEn ? 'Complete these items before submitting' : 'Éléments à compléter avant envoi'}
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
                {isEn ? 'Complete my profile' : 'Compléter mon profil'}
              </Link>

              <form onSubmit={handleApply} className="space-y-4">
                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    {isEn ? 'Your CV (PDF, DOC, DOCX)' : 'Votre CV (PDF, DOC, DOCX)'}
                  </label>
                  {userProfile?.defaultCvUrl ? (
                    <label className="mb-2 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800">
                      <input
                        type="checkbox"
                        checked={useDefaultCv}
                        onChange={(event) => {
                          setUseDefaultCv(event.target.checked);
                          if (event.target.checked) {
                            setCvFile(null);
                            setFormErrors((prev) => {
                              const next = { ...prev };
                              delete next.cv;
                              return next;
                            });
                          }
                        }}
                        className="h-4 w-4"
                      />
                      {isEn ? 'Use my default CV for this application' : 'Utiliser mon CV principal pour cette candidature'}
                      <a
                        href={userProfile.defaultCvUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-auto text-emerald-700 underline"
                      >
                        {isEn ? 'Preview' : 'Apercu'}
                      </a>
                    </label>
                  ) : null}
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    disabled={useDefaultCv && Boolean(userProfile?.defaultCvUrl)}
                    className={`w-full rounded-xl border p-2 text-sm ${formErrors.cv ? 'border-red-500 bg-red-50' : 'border-gray-200 bg-white'}`}
                  />
                  {formErrors.cv ? <p className="mt-1 text-xs font-bold text-red-500">{formErrors.cv}</p> : null}
                </div>

                <div>
                  <label className="mb-1 block text-sm font-bold text-gray-700">
                    {isEn ? 'Motivation message' : 'Message de motivation'}
                  </label>
                  <textarea
                    value={message}
                    onChange={(event) => {
                      setMessage(event.target.value);
                      setFormErrors((prev) => {
                        if (!prev.message) return prev;
                        const next = { ...prev };
                        delete next.message;
                        return next;
                      });
                    }}
                    rows={4}
                    placeholder={isEn ? 'Explain why you are the right candidate...' : 'Expliquez pourquoi vous êtes le candidat idéal...'}
                    className={`w-full rounded-xl border p-3 text-sm ${formErrors.message ? 'border-red-500 bg-red-50 focus:ring-red-500' : 'border-gray-200 focus:ring-[#DA7756]'}`}
                  />
                  {formErrors.message ? <p className="mt-1 text-xs font-bold text-red-500">{formErrors.message}</p> : null}
                </div>

                {formErrors.global ? (
                  <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                    {formErrors.global}
                  </p>
                ) : null}

                {/* Action buttons */}
                <div className="flex flex-col gap-3 mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingReview || Boolean(userProfile?.missingItems.length)}
                  className="w-full bg-[#C4623F] disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-[#A8502F] text-white font-extrabold py-3 rounded-xl transition"
                >
                  {isSubmitting
                    ? (isEn ? 'Sending...' : 'Envoi en cours...')
                    : (isEn ? 'Confirm and send' : 'Confirmer et envoyer')
                  }
                </button>
                <button
                  type="button"
                  onClick={() => setShowApplicationReview(false)}
                  className="w-full text-gray-600 font-bold py-2 rounded-xl hover:bg-gray-50 transition"
                >
                  {isEn ? 'Cancel' : 'Annuler'}
                </button>
              </div>
              </form>

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

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2 className="text-lg font-extrabold text-slate-950 md:text-xl">{title}</h2>
      <p className="mt-1 text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

function HeroFact({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 px-4 py-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
        <span className="text-slate-500">{icon}</span>
        <span>{label}</span>
      </div>
      <p className="text-sm font-semibold leading-6 text-slate-800">{value}</p>
    </div>
  );
}

function SidebarStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</span>
      <span className="text-right text-sm font-semibold text-slate-800">{value}</span>
    </div>
  );
}

function SidebarInfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3.5 py-3">
      <span className="mt-0.5 text-slate-500">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-800">{value}</p>
      </div>
    </div>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 10h.01" />
      <path d="M15 10h.01" />
      <path d="M9 14h.01" />
      <path d="M15 14h.01" />
    </svg>
  );
}

function LocationIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-6-4.35-6-10a6 6 0 1 1 12 0c0 5.65-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2.2" />
    </svg>
  );
}

function MoneyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v18" />
      <path d="M16.5 7.5c0-1.93-2.01-3.5-4.5-3.5S7.5 5.57 7.5 7.5 9.51 11 12 11s4.5 1.57 4.5 3.5S14.49 18 12 18s-4.5-1.57-4.5-3.5" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M3 12h18" />
    </svg>
  );
}

function ContractIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 6h13" />
      <path d="M8 12h13" />
      <path d="M8 18h13" />
      <path d="M3 6h.01" />
      <path d="M3 12h.01" />
      <path d="M3 18h.01" />
    </svg>
  );
}

function ExperienceIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20V10" />
      <path d="M18 20V4" />
      <path d="M6 20v-4" />
    </svg>
  );
}

function ApplyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function HashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 9h16" />
      <path d="M4 15h16" />
      <path d="M10 3 8 21" />
      <path d="m16 3-2 18" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="4" />
      <path d="M6 20a6 6 0 0 1 12 0" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M8 13h8" />
      <path d="M8 17h8" />
    </svg>
  );
}

function ShieldCheckIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.74 8 11 4.6-1.26 8-6 8-11V5l-8-3Zm-1.1 13.2-3-3 1.4-1.4 1.6 1.6 3.8-3.8 1.4 1.4-5.2 5.2Z" />
    </svg>
  );
}
