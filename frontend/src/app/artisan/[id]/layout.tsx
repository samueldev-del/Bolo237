import type { Metadata } from 'next';
import { buildLocalizedMetadata, truncateText } from '@/lib/seo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ArtisanProfile = {
  fullName?: string | null;
  title?: string | null;
  location?: string | null;
  profile?: string | null;
};

type LayoutProps = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const path = `/artisan/${id}`;

  try {
    const response = await fetch(`${API_BASE}/api/profiles/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Profile not found');
    }

    const artisan = (await response.json()) as ArtisanProfile;
    const name = artisan.fullName?.trim() || 'Artisan';
    const titlePart = artisan.title?.trim();
    const locationPart = artisan.location?.trim();

    const title = titlePart ? `${name} - ${titlePart} | Bolo237` : `${name} | Bolo237`;
    const description = truncateText(
      artisan.profile ||
        `${name}${titlePart ? `, ${titlePart}` : ''}${locationPart ? ` a ${locationPart}` : ''}. Trouvez un artisan fiable sur Bolo237.`
    );

    return buildLocalizedMetadata(path, {
      title,
      description,
    });
  } catch {
    return buildLocalizedMetadata(path, {
      title: 'Profil artisan | Bolo237',
      description: 'Consultez le profil public de cet artisan sur Bolo237 et contactez un prestataire au Cameroun.',
    });
  }
}

export default function ArtisanProfileLayout({ children }: LayoutProps) {
  return children;
}