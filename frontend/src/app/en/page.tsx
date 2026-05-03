import HomePageClient from '@/components/HomePageClient';
import { Suspense } from 'react';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata = buildLocalizedMetadata('/', { locale: 'en' });
export const revalidate = 60;

export default async function EnglishHomePage() {
  const initialJobsData = null;

  return (
    <>
      <Suspense fallback={null}>
        <HomePageClient initialJobsData={initialJobsData} />
      </Suspense>
    </>
  );
}