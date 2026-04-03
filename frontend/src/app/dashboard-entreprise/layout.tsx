import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Mon espace entreprise | Bolo237',
  description: 'Gérez vos offres d\'emploi et vos candidatures sur Bolo237.',
  robots: { index: false, follow: false },
};

export default function DashboardEntrepriseLayout({ children }: { children: React.ReactNode }) {
  return children;
}
