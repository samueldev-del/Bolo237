import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon profil | Bolo237',
  description: 'Complétez et gérez votre profil candidat sur Bolo237.',
  robots: { index: false, follow: false },
};

export default function ProfilLayout({ children }: { children: React.ReactNode }) {
  return children;
}
