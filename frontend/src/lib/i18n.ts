export type Locale = 'fr' | 'en';

export const DEFAULT_LOCALE: Locale = 'fr';
export const SUPPORTED_LOCALES: Locale[] = ['fr', 'en'];

export const dictionary = {
  fr: {
    header: {
      login: 'Connexion',
      menu: 'Menu',
    },
    footer: {
      about: 'À propos de nous',
      press: 'Presse',
      partner: 'Devenez partenaire',
      candidates: 'Candidats',
      my237: 'Mon Bolo237',
      salaryInfo: 'Informations salariales',
      careerTips: 'Conseils de carrière',
      cvTemplate: 'Modèle de CV',
      employers: 'Employeurs',
      post: "Publication d'annonces",
      employerLogin: 'Connexion employeurs',
      hrKnowledge: 'Connaissances RH',
      follow: 'Suivez-nous',
      feedback: "N'hésitez pas à nous faire part de vos commentaires.",
      contact: 'Contact',
      whatsappSupport: 'Support 24/7',
      rights: 'Tous droits réservés.',
      artisans: 'Artisans',
      findArtisan: 'Trouver un artisan',
      artisanLogin: 'Connexion artisans',
      artisanCategories: 'Categories de metiers',
      becomeArtisan: 'Devenir artisan',
      comingSoon: 'Bientot disponible sur',
    },
    home: {
      find: 'Trouvez',
      matchingJob: 'le job',
      matchingArtisan: "l'artisan",
      forYou: 'qui vous correspond.',
      searchJob: 'Chercher un emploi',
      findArtisan: 'Trouver un artisan',
      searchPlaceholderJob: '(Intitulé du poste, compétence ou entreprise)',
      searchPlaceholderArtisan: '(Quel service ? ex: Plomberie...)',
      locationPlaceholder: '(Ville ou quartier)',
      submitJob: 'Trouver un emploi',
      submitArtisan: 'Trouver un artisan',
      dynamicFilters: 'Filtres dynamiques',
      resetFilters: 'Réinitialiser tous les filtres',
      translateAd: 'Traduire cette annonce',
      translateProfile: 'Traduire ce profil',
    },
    security: {
      antiFraudTitle: 'Protection anti-fraude',
      reportFraud: 'Signaler une fraude',
      reportReasonTitle: 'Motif du signalement',
      reportReasonMoney: "Demande d'argent",
      reportReasonIdentity: 'Fausse identité',
      reportReasonArtisan: 'Artisan injoignable / malhonnête',
      sendReport: 'Envoyer le signalement',
      alreadyReported: 'Signalement déjà envoyé',
      uniqueReports: 'signalement(s) unique(s). Masquage automatique à partir de 3.',
      autoMaskedAd: "Ce compte est masqué automatiquement suite à 3 signalements provenant de 3 personnes différentes. En attente d'enquête admin.",
      autoMaskedArtisan: "Ce profil artisan est masqué automatiquement après 3 signalements uniques. Il reste invisible en attendant vérification admin.",
      redJobWarning: "⚠️ Attention : Un employeur sérieux ne vous demandera JAMAIS de payer pour un entretien ou une formation. Signalez toute demande d'argent.",
      artisanWarning: "⚠️ Ne payez jamais la totalité d'un service à l'avance. Exigez un devis signé pour les gros chantiers.",
      adMaskedCta: 'Annonce masquée',
      profileMaskedCta: 'Profil masqué',
      apply: 'Postuler',
      applyNow: 'Postuler maintenant',
      contactWhatsapp: 'Contacter par WhatsApp',
      requestQuote: 'Demander un devis',
    },
  },
  en: {
    header: {
      login: 'Login',
      menu: 'Menu',
    },
    footer: {
      about: 'About us',
      press: 'Press',
      partner: 'Become a partner',
      candidates: 'Candidates',
      my237: 'My Bolo237',
      salaryInfo: 'Salary insights',
      careerTips: 'Career advice',
      cvTemplate: 'CV template',
      employers: 'Employers',
      post: 'Post jobs',
      employerLogin: 'Employer login',
      hrKnowledge: 'HR knowledge',
      follow: 'Follow us',
      feedback: 'Feel free to share your feedback with us.',
      contact: 'Contact',
      whatsappSupport: '24/7 Support',
      rights: 'All rights reserved.',
      artisans: 'Artisans',
      findArtisan: 'Find an artisan',
      artisanLogin: 'Artisan login',
      artisanCategories: 'Trade categories',
      becomeArtisan: 'Become an artisan',
      comingSoon: 'Coming soon on',
    },
    home: {
      find: 'Find',
      matchingJob: 'a job',
      matchingArtisan: 'an artisan',
      forYou: 'that fits you.',
      searchJob: 'Find a job',
      findArtisan: 'Find an artisan',
      searchPlaceholderJob: '(Job title, skill, or company)',
      searchPlaceholderArtisan: '(What service? ex: Plumbing...)',
      locationPlaceholder: '(City or district)',
      submitJob: 'Search jobs',
      submitArtisan: 'Search artisans',
      dynamicFilters: 'Dynamic filters',
      resetFilters: 'Reset all filters',
      translateAd: 'Translate this ad',
      translateProfile: 'Translate this profile',
    },
    security: {
      antiFraudTitle: 'Anti-fraud protection',
      reportFraud: 'Report fraud',
      reportReasonTitle: 'Report reason',
      reportReasonMoney: 'Request for money',
      reportReasonIdentity: 'Fake identity',
      reportReasonArtisan: 'Artisan unreachable / dishonest',
      sendReport: 'Send report',
      alreadyReported: 'Report already sent',
      uniqueReports: 'unique report(s). Auto-masking starts at 3.',
      autoMaskedAd: 'This account is automatically masked after 3 reports from 3 different people. Pending admin investigation.',
      autoMaskedArtisan: 'This artisan profile is automatically masked after 3 unique reports. Hidden pending admin review.',
      redJobWarning: '⚠️ Warning: A serious employer will NEVER ask you to pay for an interview or training. Report any money request.',
      artisanWarning: '⚠️ Never pay the full amount for a service in advance. Request a signed quote for major works.',
      adMaskedCta: 'Ad hidden',
      profileMaskedCta: 'Profile hidden',
      apply: 'Apply',
      applyNow: 'Apply now',
      contactWhatsapp: 'Contact on WhatsApp',
      requestQuote: 'Request a quote',
    },
  },
} as const;

export function getLocaleFromPath(pathname: string): Locale {
  const segment = pathname.split('/')[1];
  return segment === 'en' ? 'en' : 'fr';
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname.startsWith('/fr/')) return pathname.slice(3);
  if (pathname === '/fr') return '/';
  if (pathname.startsWith('/en/')) return pathname.slice(3);
  if (pathname === '/en') return '/';
  return pathname;
}

export function withLocale(path: string, locale: Locale): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  if (normalized === '/') return `/${locale}`;
  return `/${locale}${normalized}`;
}
