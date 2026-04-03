import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/i18n';

export const SITE_URL = 'https://www.bolo237.com';

type LocalizedText = Record<Locale, string>;
type ChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
type PageKind = 'website' | 'article';

export type SiteSection = {
  path: string;
  title: LocalizedText;
  description: LocalizedText;
  priority: number;
  changeFrequency: ChangeFrequency;
  kind?: PageKind;
  navLabel?: LocalizedText;
  includeInSitemap?: boolean;
};

const DEFAULT_LOCALE: Locale = 'fr';

const OPEN_GRAPH_LOCALE: Record<Locale, string> = {
  fr: 'fr_CM',
  en: 'en_US',
};

export const SITE_SECTIONS: readonly SiteSection[] = [
  {
    path: '/',
    title: {
      fr: 'Bolo237 - Emplois et services au Cameroun',
      en: 'Bolo237 - Jobs and services in Cameroon',
    },
    description: {
      fr: 'Trouvez un emploi, publiez une offre ou trouvez un artisan fiable partout au Cameroun.',
      en: 'Find jobs, publish an offer, or hire a trusted artisan anywhere in Cameroon.',
    },
    priority: 1,
    changeFrequency: 'daily',
  },
  {
    path: '/emplois',
    title: {
      fr: 'Offres d emploi au Cameroun | Bolo237',
      en: 'Jobs in Cameroon | Bolo237',
    },
    description: {
      fr: 'Consultez les offres d emploi disponibles au Cameroun et postulez rapidement sur Bolo237.',
      en: 'Browse available jobs in Cameroon and apply quickly on Bolo237.',
    },
    priority: 0.95,
    changeFrequency: 'daily',
    navLabel: {
      fr: 'Emplois',
      en: 'Jobs',
    },
  },
  {
    path: '/petits-boulots',
    title: {
      fr: 'Petits boulots et services locaux | Bolo237',
      en: 'Local gigs and services | Bolo237',
    },
    description: {
      fr: 'Trouvez des missions rapides, des services locaux et des artisans dans tout le Cameroun.',
      en: 'Discover local gigs, quick jobs, and artisans across Cameroon.',
    },
    priority: 0.9,
    changeFrequency: 'daily',
    navLabel: {
      fr: 'Services',
      en: 'Services',
    },
  },
  {
    path: '/publier',
    title: {
      fr: 'Publier une annonce | Bolo237',
      en: 'Publish a listing | Bolo237',
    },
    description: {
      fr: 'Publiez une offre entreprise ou un besoin artisan depuis votre espace Bolo237.',
      en: 'Publish a company listing or an artisan need from your Bolo237 dashboard.',
    },
    priority: 0.85,
    changeFrequency: 'weekly',
    navLabel: {
      fr: 'Publier',
      en: 'Post',
    },
  },
  {
    path: '/questions-frequentes',
    title: {
      fr: 'FAQ Bolo237 | Questions frequentes',
      en: 'Bolo237 FAQ | Frequently asked questions',
    },
    description: {
      fr: 'Retrouvez les reponses essentielles sur les comptes, la verification et l utilisation de Bolo237.',
      en: 'Find clear answers about accounts, verification, and how Bolo237 works.',
    },
    priority: 0.8,
    changeFrequency: 'monthly',
    navLabel: {
      fr: 'FAQ',
      en: 'FAQ',
    },
  },
  {
    path: '/a-propos',
    title: {
      fr: 'A propos de Bolo237 | Mission et confiance',
      en: 'About Bolo237 | Mission and trust',
    },
    description: {
      fr: 'Decouvrez la mission de Bolo237, son fondateur et son approche de la confiance au Cameroun.',
      en: 'Discover Bolo237, its founder, and its trust-first approach for Cameroon.',
    },
    priority: 0.75,
    changeFrequency: 'monthly',
    navLabel: {
      fr: 'A propos',
      en: 'About',
    },
  },
  {
    path: '/comment-decrocher-premier-contrat',
    title: {
      fr: 'Comment decrocher son premier contrat sur Bolo237',
      en: 'How to get your first contract on Bolo237',
    },
    description: {
      fr: 'Guide pratique pour creer son profil, activer la verification et obtenir ses premiers contrats.',
      en: 'Practical guide to set up your profile, get verified, and win your first contracts.',
    },
    priority: 0.7,
    changeFrequency: 'monthly',
    kind: 'article',
  },
  {
    path: '/recherche',
    title: {
      fr: 'Recherche avancee d offres | Bolo237',
      en: 'Advanced job search | Bolo237',
    },
    description: {
      fr: 'Affinez votre recherche d emploi par mot-cle, ville et type de mission sur Bolo237.',
      en: 'Refine your search by keyword, city, and opportunity type on Bolo237.',
    },
    priority: 0.65,
    changeFrequency: 'weekly',
  },
  {
    path: '/conditions',
    title: {
      fr: 'Conditions d utilisation | Bolo237',
      en: 'Terms of use | Bolo237',
    },
    description: {
      fr: 'Consultez les conditions d utilisation, les regles de publication et les engagements de Bolo237.',
      en: 'Read the terms of use, publishing rules, and commitments of Bolo237.',
    },
    priority: 0.55,
    changeFrequency: 'yearly',
  },
  {
    path: '/presse',
    title: {
      fr: 'Presse et kit media | Bolo237',
      en: 'Press room and media kit | Bolo237',
    },
    description: {
      fr: 'Accedez au kit media, au pitch produit et aux ressources presse officielles de Bolo237.',
      en: 'Access the media kit, product pitch, and official Bolo237 press resources.',
    },
    priority: 0.5,
    changeFrequency: 'monthly',
  },
  {
    path: '/connexion',
    title: {
      fr: 'Connexion | Bolo237',
      en: 'Login | Bolo237',
    },
    description: {
      fr: 'Connectez-vous a votre compte Bolo237 pour gerer vos candidatures, annonces et profils.',
      en: 'Log in to manage your applications, listings, and Bolo237 profile.',
    },
    priority: 0.3,
    changeFrequency: 'monthly',
    includeInSitemap: false,
  },
  {
    path: '/cvtheque',
    title: {
      fr: 'CVtheque candidats | Bolo237',
      en: 'Candidate CV library | Bolo237',
    },
    description: {
      fr: 'Consultez des profils candidats verifies depuis la CVtheque Bolo237.',
      en: 'Browse verified candidate profiles in the Bolo237 CV library.',
    },
    priority: 0.35,
    changeFrequency: 'weekly',
    includeInSitemap: false,
  },
];

export const PRIMARY_NAV_ITEMS: Array<{ path: string; navLabel: LocalizedText }> =
  SITE_SECTIONS.flatMap((section) =>
    section.navLabel
      ? [
          {
            path: section.path,
            navLabel: section.navLabel,
          },
        ]
      : []
  );

export const SITEMAP_SECTIONS = SITE_SECTIONS.filter(
  (section) => section.includeInSitemap !== false
);

export function localizedUrl(path: string, locale: Locale = DEFAULT_LOCALE) {
  return `${SITE_URL}${withLocale(path, locale)}`;
}

export function buildAlternates(path: string) {
  return {
    canonical: localizedUrl(path, 'fr'),
    languages: {
      fr: localizedUrl(path, 'fr'),
      en: localizedUrl(path, 'en'),
      'x-default': localizedUrl(path, 'fr'),
    },
  };
}

export function getSiteSection(path: string) {
  return SITE_SECTIONS.find((section) => section.path === path);
}

export function buildLocalizedMetadata(
  path: string,
  options?: {
    locale?: Locale;
    title?: string;
    description?: string;
    kind?: PageKind;
    robots?: Metadata['robots'];
  }
): Metadata {
  const locale = options?.locale || DEFAULT_LOCALE;
  const section = getSiteSection(path);
  const title = options?.title || section?.title[locale] || 'Bolo237';
  const description = options?.description || section?.description[locale] || 'Bolo237';
  const kind = options?.kind || section?.kind || 'website';

  return {
    title,
    description,
    alternates: buildAlternates(path),
    openGraph: {
      title,
      description,
      type: kind,
      siteName: 'Bolo237',
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: locale === 'fr' ? ['en_US'] : ['fr_CM'],
      url: localizedUrl(path, locale),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    ...(options?.robots ? { robots: options.robots } : {}),
  };
}