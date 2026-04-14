import HomePageClient from '@/components/HomePageClient';
import { getInitialHomeJobs } from '@/lib/home-jobs';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata = buildLocalizedMetadata('/', { locale: 'fr' });

export default async function FrenchHomePage() {
  const initialJobsData = await getInitialHomeJobs();

  return <HomePageClient initialJobsData={initialJobsData} />;
}