"use client";

import Link from 'next/link';
import { useLocale } from '@/components/LocaleProvider';

export default function PublierPage() {
  const { locale, localizePath } = useLocale();
  const isEn = locale === 'en';

  return (
    <div className="min-h-screen bg-[#f5f7f8] text-black">
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white border border-gray-200 rounded-3xl p-8 md:p-10 shadow-sm">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            {isEn ? 'Publish a listing' : 'Publier une annonce'}
          </h1>
          <p className="text-gray-600 font-medium mb-8">
            {isEn
              ? 'Choose what you want to publish and continue from your dashboard.'
              : 'Choisissez ce que vous voulez publier et continuez depuis votre dashboard.'}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link
              href={localizePath('/dashboard-entreprise')}
              className="block rounded-2xl border border-gray-200 p-5 hover:border-green-600 transition"
            >
              <p className="text-2xl mb-2">🏢</p>
              <p className="font-extrabold text-lg">{isEn ? 'Company job post' : 'Offre entreprise'}</p>
              <p className="text-sm text-gray-600 mt-1">
                {isEn ? 'Post or manage recruitment offers.' : 'Publier ou gerer des offres de recrutement.'}
              </p>
            </Link>

            <Link
              href={localizePath('/dashboard-artisan')}
              className="block rounded-2xl border border-gray-200 p-5 hover:border-green-600 transition"
            >
              <p className="text-2xl mb-2">🛠️</p>
              <p className="font-extrabold text-lg">{isEn ? 'Artisan need post' : 'Besoin artisan'}</p>
              <p className="text-sm text-gray-600 mt-1">
                {isEn ? 'Publish a need to find talent or an apprentice.' : 'Publier un besoin pour trouver un talent ou un apprenti.'}
              </p>
            </Link>
          </div>

          <div className="mt-8">
            <Link href={localizePath('/')} className="text-sm font-bold text-green-700 hover:underline">
              {isEn ? 'Back to home' : 'Retour a l accueil'}
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
