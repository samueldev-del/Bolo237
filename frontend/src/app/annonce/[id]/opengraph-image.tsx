import { createOpenGraphCard, OG_CONTENT_TYPE, OG_IMAGE_SIZE } from '@/lib/opengraph';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

type ApiJob = {
  title: string;
  company: string;
  location: string;
  salary: string | null;
};

type Props = {
  params: Promise<{ id: string }>;
};

export const contentType = OG_CONTENT_TYPE;
export const size = OG_IMAGE_SIZE;
export const alt = 'Bolo237 job preview';

export default async function Image({ params }: Props) {
  const { id } = await params;

  try {
    const response = await fetch(`${API_BASE}/api/jobs/${id}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error('Job not found');
    }

    const job = (await response.json()) as ApiJob;

    return createOpenGraphCard({
      eyebrow: 'Job listing',
      title: job.title,
      subtitle: `${job.company} recrute sur Bolo237`,
      meta: [job.location, job.salary || 'Salaire non communique'],
      footerLabel: 'Offre d emploi',
      accentColor: '#F4B394',
    });
  } catch {
    return createOpenGraphCard({
      eyebrow: 'Job listing',
      title: 'Offre d emploi sur Bolo237',
      subtitle: 'Consultez cette opportunite et postulez depuis Bolo237.',
      footerLabel: 'Offre d emploi',
      accentColor: '#F4B394',
    });
  }
}