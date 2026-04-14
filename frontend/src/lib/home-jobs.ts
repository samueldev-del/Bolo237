import type { JobsResponse } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const HOME_JOBS_PER_PAGE = 10;

export async function getInitialHomeJobs(): Promise<JobsResponse | null> {
  const params = new URLSearchParams({
    status: 'APPROVED',
    limit: String(HOME_JOBS_PER_PAGE),
    page: '1',
  });

  try {
    const response = await fetch(`${API_BASE}/api/jobs?${params.toString()}`, {
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as JobsResponse;
  } catch {
    return null;
  }
}