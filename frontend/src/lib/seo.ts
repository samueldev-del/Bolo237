import type { Metadata } from 'next';
import type { Locale } from '@/lib/i18n';
import { withLocale } from '@/lib/i18n';

export const SITE_URL = 'https://www.bolo237.com';

export type LocalizedText = Record<Locale, string>;
type ChangeFrequency = 'daily' | 'weekly' | 'monthly' | 'yearly';
type PageKind = 'website' | 'article';
export type BreadcrumbItem = {
  name: string | LocalizedText;
  path: string;
};

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
      fr: 'À propos de Bolo237 | Mission et confiance',
      en: 'About Bolo237 | Mission and trust',
    },
    description: {
      fr: 'Découvrez Bolo237, produit de DTSfuture, et son approche de la confiance pour le marché camerounais.',
      en: 'Discover Bolo237, a DTSfuture product, and its trust-first approach for the Cameroonian market.',
    },
    priority: 0.75,
    changeFrequency: 'monthly',
    navLabel: {
      fr: 'À propos',
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
    path: '/infos-salaires',
    title: {
      fr: 'Informations salariales | Bolo237',
      en: 'Salary insights | Bolo237',
    },
    description: {
      fr: 'Reperez les bons reflexes pour comparer une offre, evaluer un package et mieux negocier votre salaire.',
      en: 'Learn how to compare an offer, evaluate a package, and negotiate salary with more clarity.',
    },
    priority: 0.62,
    changeFrequency: 'monthly',
    kind: 'article',
  },
  {
    path: '/conseils-carriere',
    title: {
      fr: 'Conseils de carriere | Bolo237',
      en: 'Career advice | Bolo237',
    },
    description: {
      fr: 'Conseils pratiques pour rendre votre profil plus visible, renforcer la confiance et mieux suivre vos opportunites.',
      en: 'Practical guidance to improve visibility, strengthen trust, and manage your opportunities better.',
    },
    priority: 0.64,
    changeFrequency: 'monthly',
    kind: 'article',
  },
  {
    path: '/modele-cv',
    title: {
      fr: 'Modèle de CV | Bolo237',
      en: 'CV template | Bolo237',
    },
    description: {
      fr: 'Structurez un CV lisible et utile avec les bonnes sections pour les recruteurs et clients sur Bolo237.',
      en: 'Build a useful, readable CV with the sections recruiters and clients expect on Bolo237.',
    },
    priority: 0.63,
    changeFrequency: 'monthly',
    kind: 'article',
  },
  {
    path: '/connaissance-rh',
    title: {
      fr: 'Connaissances RH | Bolo237',
      en: 'HR knowledge | Bolo237',
    },
    description: {
      fr: 'Retrouvez les bases RH utiles pour publier de meilleures annonces et fluidifier votre recrutement.',
      en: 'Review practical HR basics to publish better listings and run a smoother hiring process.',
    },
    priority: 0.6,
    changeFrequency: 'monthly',
    kind: 'article',
  },
  {
    path: '/categories-metiers',
    title: {
      fr: 'Categories de metiers | Bolo237',
      en: 'Trade categories | Bolo237',
    },
    description: {
      fr: 'Explorez les grandes categories de services et metiers artisanaux disponibles sur Bolo237.',
      en: 'Explore the main service and artisan trade categories available on Bolo237.',
    },
    priority: 0.58,
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

export function resolveLocalizedText(value: string | LocalizedText, locale: Locale) {
  return typeof value === 'string' ? value : value[locale];
}

export function truncateText(value: string, maxLength = 160) {
  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

export function buildAlternates(path: string, locale: Locale = DEFAULT_LOCALE) {
  return {
    canonical: localizedUrl(path, locale),
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

export function buildBreadcrumbSchema(
  items: BreadcrumbItem[],
  locale: Locale = DEFAULT_LOCALE
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: resolveLocalizedText(item.name, locale),
      item: localizedUrl(item.path, locale),
    })),
  };
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
    alternates: buildAlternates(path, locale),
    openGraph: {
      title,
      description,
      type: kind,
      siteName: 'Bolo237',
      locale: OPEN_GRAPH_LOCALE[locale],
      alternateLocale: locale === 'fr' ? ['en_US'] : ['fr_CM'],
      url: localizedUrl(path, locale),
      images: [
        {
          url: `${SITE_URL}/og-image.png`,
          width: 1200,
          height: 630,
          alt: 'Bolo237 - Emplois et Services au Cameroun',
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${SITE_URL}/og-image.png`],
    },
    ...(options?.robots ? { robots: options.robots } : {}),
  };
}