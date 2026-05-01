import type { JobsResponse } from '@/lib/api';
import type { ApiArtisanProfile } from '@/lib/api';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const HOME_JOBS_PER_PAGE = 10;

export type HomeArtisansResponse = {
  artisans: ApiArtisanProfile[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type FetchApprovedJobsOptions = {
  take?: number;
  revalidateSeconds?: number;
};

type FetchVerifiedArtisansOptions = {
  take?: number;
  revalidateSeconds?: number;
};

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

export async function fetchApprovedJobs(options: FetchApprovedJobsOptions = {}): Promise<JobsResponse | null> {
  const take = Math.min(20, Math.max(1, Number(options.take || 8)));
  const revalidateSeconds = Number(options.revalidateSeconds || 60);

  const params = new URLSearchParams({
    status: 'APPROVED',
    limit: String(take),
    page: '1',
  });

  try {
    const response = await fetch(`${API_BASE}/api/jobs?${params.toString()}`, {
      next: { revalidate: revalidateSeconds },
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as JobsResponse;
  } catch {
    return null;
  }
}

export async function fetchVerifiedArtisans(options: FetchVerifiedArtisansOptions = {}): Promise<HomeArtisansResponse | null> {
  const take = Math.min(20, Math.max(1, Number(options.take || 6)));
  const revalidateSeconds = Number(options.revalidateSeconds || 60);

  const params = new URLSearchParams({
    page: '1',
    limit: String(take),
    sortBy: 'recent',
  });

  try {
    const response = await fetch(`${API_BASE}/api/users/artisans?${params.toString()}`, {
      next: { revalidate: revalidateSeconds },
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      success?: boolean;
      artisans?: ApiArtisanProfile[];
      pagination?: HomeArtisansResponse['pagination'];
    };

    return {
      artisans: Array.isArray(payload.artisans) ? payload.artisans : [],
      pagination: payload.pagination,
    };
  } catch {
    return null;
  }
}