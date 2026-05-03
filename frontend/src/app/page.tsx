import HomePageClient from '@/components/HomePageClient';
import Image from 'next/image';
import Link from 'next/link';
import { Suspense } from 'react';
import { fetchApprovedJobs, fetchVerifiedArtisans } from '@/lib/home-jobs';
import { BLUR_DATA_URL } from '@/lib/imagePlaceholder';

export const revalidate = 60;

export default async function Home() {
  const [initialJobsData, initialArtisansData] = await Promise.all([
    fetchApprovedJobs({ take: 8 }),
    fetchVerifiedArtisans({ take: 6 }),
  ]);

  const initialArtisans = Array.isArray(initialArtisansData?.artisans) ? initialArtisansData.artisans : [];
  const initialJobs = Array.isArray(initialJobsData?.jobs) ? initialJobsData.jobs : [];

  return (
    <>
      <Suspense fallback={null}>
        <HomePageClient initialJobsData={initialJobsData} />
      </Suspense>

      <section className="bg-white py-14 border-t border-gray-100">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Artisans vérifiés</h2>
            <Link href="/petits-boulots" className="text-sm font-bold text-[#C4623F] hover:text-[#A8502F] transition">
              Voir tout
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {initialArtisans.map((artisan, index) => {
              const profileName = String(artisan.fullName || artisan.name || 'Artisan').trim();
              const artisanServices = Array.isArray(artisan.services) ? artisan.services : [];
              const serviceLabel = artisanServices
                .slice(0, 2)
                .map((service) => String(service?.name || '').trim())
                .filter(Boolean)
                .join(' • ');

              return (
                <Link
                  key={artisan.id}
                  href={`/artisan/${artisan.id}`}
                  className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  <div className="flex items-center gap-3">
                    {artisan.photoUrl ? (
                      <Image
                        src={artisan.photoUrl}
                        alt={profileName}
                        width={56}
                        height={56}
                        priority={index === 0}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="56px"
                        className="h-14 w-14 rounded-full object-cover border border-gray-200"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-800 font-extrabold flex items-center justify-center">
                        {profileName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h3 className="truncate text-base font-bold text-black group-hover:text-[#C4623F] transition">{profileName}</h3>
                      <p className="truncate text-sm text-gray-500">{artisan.location || 'Cameroun'}</p>
                    </div>
                  </div>
                  <p className="mt-4 text-sm text-gray-600 line-clamp-2">{artisan.profile || 'Profil disponible sur Bolo237.'}</p>
                  <p className="mt-3 text-xs font-semibold text-gray-500 truncate">{serviceLabel || 'Services à découvrir'}</p>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-[#FFF8F3] py-14 border-t border-[#F3E3D8]">
        <div className="max-w-[1400px] mx-auto px-4">
          <div className="mb-8 flex items-center justify-between gap-4">
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">Dernières offres</h2>
            <Link href="/emplois" className="text-sm font-bold text-[#C4623F] hover:text-[#A8502F] transition">
              Explorer le catalogue
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {initialJobs.map((job, index) => (
              <Link
                key={job.id}
                href={`/annonce/${job.id}`}
                className="group rounded-2xl border border-[#F2D8C8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  {job.author?.photoUrl ? (
                    <div className="h-[52px] w-[52px] shrink-0 rounded-lg border border-gray-100 bg-white p-1.5 shadow-sm">
                      <Image
                        src={job.author.photoUrl}
                        alt={job.company}
                        width={52}
                        height={52}
                        priority={index === 0}
                        placeholder="blur"
                        blurDataURL={BLUR_DATA_URL}
                        sizes="52px"
                        className="h-full w-full object-contain"
                      />
                    </div>
                  ) : (
                    <div className="h-[52px] w-[52px] shrink-0 rounded-lg border border-gray-100 bg-white text-gray-500 font-extrabold flex items-center justify-center shadow-sm">
                      {String(job.company || 'B').slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-base font-bold text-black group-hover:text-[#C4623F] transition">{job.titleFr || job.title || job.titleEn}</h3>
                    <p className="mt-0.5 text-sm text-gray-600">{job.company}</p>
                    <p className="mt-2 text-xs text-gray-500 truncate">{job.location}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}