import { createOpenGraphCard, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from '@/lib/opengraph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type CandidateProfile = {
  nom?: string | null;
  titre?: string | null;
  localisation?: string | null;
  disponibilite?: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export const contentType = OG_CONTENT_TYPE;
export const size = OG_IMAGE_SIZE;
export const alt = 'Bolo237 candidate profile preview';

export default async function Image({ params }: Props) {
  const { id } = await params;

  try {
    const response = await fetch(`${API_BASE}/api/candidates/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Candidate not found');
    }

    const candidate = (await response.json()) as CandidateProfile;

    return createOpenGraphCard({
      eyebrow: 'Candidate profile',
      title: candidate.nom?.trim() || 'Profil candidat',
      subtitle: candidate.titre?.trim() || 'Talent disponible sur Bolo237',
      meta: [candidate.localisation?.trim() || 'Cameroun', candidate.disponibilite?.trim() || 'Disponibilite a confirmer'],
      footerLabel: 'CV et profil',
      accentColor: '#8CC8FF',
    });
  } catch {
    return createOpenGraphCard({
      eyebrow: 'Candidate profile',
      title: 'Profil candidat Bolo237',
      subtitle: 'Consultez ce CV public et ce profil professionnel sur Bolo237.',
      footerLabel: 'CV et profil',
      accentColor: '#8CC8FF',
    });
  }
}