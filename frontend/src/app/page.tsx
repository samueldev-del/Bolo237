import HomePageClient from '@/components/HomePageClient';
import { Suspense } from 'react';

export const revalidate = 60;

export default async function Home() {
  const initialJobsData = null;

  return (
    <>
      <Suspense fallback={null}>
        <HomePageClient initialJobsData={initialJobsData} />
      </Suspense>
    </>
  );
}