import { createOpenGraphCard, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from '@/lib/opengraph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ArtisanProfile = {
  fullName?: string | null;
  title?: string | null;
  location?: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export const contentType = OG_CONTENT_TYPE;
export const size = OG_IMAGE_SIZE;
export const alt = 'Bolo237 artisan profile preview';

export default async function Image({ params }: Props) {
  const { id } = await params;

  try {
    const response = await fetch(`${API_BASE}/api/profiles/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Artisan not found');
    }

    const artisan = (await response.json()) as ArtisanProfile;

    return createOpenGraphCard({
      eyebrow: 'Artisan profile',
      title: artisan.fullName?.trim() || 'Profil artisan',
      subtitle: artisan.title?.trim() || 'Prestataire verifiable sur Bolo237',
      meta: [artisan.location?.trim() || 'Cameroun'],
      footerLabel: 'Prestataire local',
      accentColor: '#9BD9A8',
    });
  } catch {
    return createOpenGraphCard({
      eyebrow: 'Artisan profile',
      title: 'Profil artisan Bolo237',
      subtitle: 'Trouvez un artisan fiable et consultez son profil public.',
      footerLabel: 'Prestataire local',
      accentColor: '#9BD9A8',
    });
  }
}