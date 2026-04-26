import HomePageClient from '@/components/HomePageClient';
import { getInitialHomeJobs } from '@/lib/home-jobs';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const initialJobsData = await getInitialHomeJobs();

  return <HomePageClient initialJobsData={initialJobsData} />;
}