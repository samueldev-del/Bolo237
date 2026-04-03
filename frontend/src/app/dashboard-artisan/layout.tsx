import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon espace artisan | Bolo237',
  description: 'Gérez votre profil artisan, vos services et vos demandes sur Bolo237.',
  robots: { index: false, follow: false },
};

export default function DashboardArtisanLayout({ children }: { children: React.ReactNode }) {
  return children;
}
