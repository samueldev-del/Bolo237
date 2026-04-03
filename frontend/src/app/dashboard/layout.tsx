import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon espace candidat | Bolo237',
  description: 'Gérez votre profil, votre CV et vos candidatures sur Bolo237.',
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
