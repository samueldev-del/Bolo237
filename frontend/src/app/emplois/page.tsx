import type { Metadata } from 'next';
import EmploisFormels from './EmploisClient';
import { fetchApprovedJobs } from '@/lib/home-jobs';

export const metadata: Metadata = {
  title: 'Offres d\'emploi formelles au Cameroun | Bolo237',
  description:
    'Découvrez toutes les offres d\'emploi vérifiées au Cameroun : CDI, CDD, stages, freelance. Postulez en quelques clics sur Bolo237.',
  alternates: { canonical: '/emplois' },
  openGraph: {
    title: 'Offres d\'emploi formelles au Cameroun | Bolo237',
    description: 'Plateforme de recrutement #1 au Cameroun. Trouvez votre prochain emploi.',
    url: '/emplois',
    type: 'website',
  },
};

export const dynamic = 'force-dynamic';

export default async function EmploisPage() {
  const initialJobs = await fetchApprovedJobs({ take: 20, revalidateSeconds: 300 });
  return <EmploisFormels initialJobs={initialJobs} />;
}
