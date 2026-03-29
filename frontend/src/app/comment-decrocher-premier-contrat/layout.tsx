import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Comment decrocher son premier contrat sur Bolo237',
  description:
    'Guide pas-a-pas pour creer son profil, activer la verification et postuler efficacement sur Bolo237.',
  alternates: {
    canonical: 'https://www.bolo237.com/fr/comment-decrocher-premier-contrat',
    languages: {
      fr: 'https://www.bolo237.com/fr/comment-decrocher-premier-contrat',
      en: 'https://www.bolo237.com/en/comment-decrocher-premier-contrat',
      'x-default': 'https://www.bolo237.com/fr/comment-decrocher-premier-contrat',
    },
  },
  openGraph: {
    title: 'Comment decrocher son premier contrat sur Bolo237',
    description:
      'Guide pas-a-pas pour creer son profil, activer la verification et postuler efficacement sur Bolo237.',
    type: 'article',
    siteName: 'Bolo237',
    locale: 'fr_CM',
    url: 'https://www.bolo237.com/fr/comment-decrocher-premier-contrat',
  },
};

export default function HowToLayout({ children }: { children: React.ReactNode }) {
  return children;
}
