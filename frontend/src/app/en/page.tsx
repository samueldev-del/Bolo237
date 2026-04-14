import HomePageClient from '@/components/HomePageClient';
import { getInitialHomeJobs } from '@/lib/home-jobs';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata = buildLocalizedMetadata('/', { locale: 'en' });

export default async function EnglishHomePage() {
  const initialJobsData = await getInitialHomeJobs();

  return <HomePageClient initialJobsData={initialJobsData} />;
}