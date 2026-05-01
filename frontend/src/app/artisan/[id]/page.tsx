import type { Metadata } from 'next';
import ArtisanDetailClient from './ArtisanDetailClient';

type Props = { params: Promise<{ id: string }> };

const SITE_URL = 'https://www.bolo237.com';
const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://localhost:5000';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const numericId = parseInt(id, 10);
  if (isNaN(numericId) || numericId <= 0) {
    return { title: 'Artisan | Bolo237' };
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/candidates/${numericId}`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return { title: 'Artisan | Bolo237' };

    const profile = await res.json();
    const name = String(profile.fullName || profile.name || 'Artisan').trim();
    const specialty = String(profile.title || '').trim();
    const location = String(profile.location || 'Cameroun').trim();
    const title = specialty
      ? `${name} – ${specialty} | Bolo237`
      : `${name} | Artisan Bolo237`;
    const description =
      String(profile.profile || profile.bio || '').replace(/\s+/g, ' ').trim().slice(0, 160) ||
      `Découvrez le profil de ${name}${specialty ? `, ${specialty}` : ''} à ${location} sur Bolo237.`;
    const ogImage = profile.photoUrl || profile.avatarUrl || `${SITE_URL}/og-image.png`;

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        type: 'profile',
        siteName: 'Bolo237',
        locale: 'fr_CM',
        url: `${SITE_URL}/fr/artisan/${numericId}`,
        images: [
          {
            url: ogImage,
            width: 1200,
            height: 630,
            alt: `${name} | Artisan Bolo237`,
          },
        ],
      },
      twitter: {
        card: 'summary_large_image',
        title,
        description,
        images: [ogImage],
      },
    };
  } catch {
    return { title: 'Artisan | Bolo237' };
  }
}

export default function Page({ params }: Props) {
  return <ArtisanDetailClient params={params} />;
}
