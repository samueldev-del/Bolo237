import HomePageClient from '@/components/HomePageClient';
import { Suspense } from 'react';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata = buildLocalizedMetadata('/', { locale: 'fr' });
export const revalidate = 60;

export default async function FrenchHomePage() {
  const initialJobsData = null;

  return (
    <>
      <Suspense fallback={null}>
        <HomePageClient initialJobsData={initialJobsData} />
      </Suspense>
    </>
  );
}