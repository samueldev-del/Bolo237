import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FAQ Bolo237 | Questions frequentes',
  description:
    'Reponses claires sur la verification des profils, la publication d offres et l utilisation de Bolo237.',
  alternates: {
    canonical: 'https://www.bolo237.com/fr/questions-frequentes',
    languages: {
      fr: 'https://www.bolo237.com/fr/questions-frequentes',
      en: 'https://www.bolo237.com/en/questions-frequentes',
      'x-default': 'https://www.bolo237.com/fr/questions-frequentes',
    },
  },
  openGraph: {
    title: 'FAQ Bolo237 | Questions frequentes',
    description:
      'Reponses claires sur la verification des profils, la publication d offres et l utilisation de Bolo237.',
    type: 'website',
    siteName: 'Bolo237',
    locale: 'fr_CM',
    url: 'https://www.bolo237.com/fr/questions-frequentes',
  },
};

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
