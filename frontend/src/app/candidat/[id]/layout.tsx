import type { Metadata } from 'next';
import { buildLocalizedMetadata, truncateText } from '@/lib/seo';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type CandidateProfileDetail = {
  nom?: string | null;
  titre?: string | null;
  localisation?: string | null;
  profile?: {
    profile?: string | null;
  } | null;
};

type LayoutProps = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { id } = await params;
  const path = `/candidat/${id}`;

  try {
    const response = await fetch(`${API_BASE}/api/candidates/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Candidate not found');
    }

    const candidate = (await response.json()) as CandidateProfileDetail;
    const name = candidate.nom?.trim() || 'Candidat';
    const titlePart = candidate.titre?.trim();
    const locationPart = candidate.localisation?.trim();
    const title = titlePart ? `${name} - ${titlePart} | Bolo237` : `${name} | Bolo237`;
    const description = truncateText(
      candidate.profile?.profile ||
        `${name}${titlePart ? `, ${titlePart}` : ''}${locationPart ? ` a ${locationPart}` : ''}. Consultez ce profil candidat sur Bolo237.`
    );

    return buildLocalizedMetadata(path, {
      title,
      description,
    });
  } catch {
    return buildLocalizedMetadata(path, {
      title: 'Profil candidat | Bolo237',
      description: 'Consultez le CV et le profil public de ce candidat sur Bolo237.',
    });
  }
}

export default function CandidateProfileLayout({ children }: LayoutProps) {
  return children;
}