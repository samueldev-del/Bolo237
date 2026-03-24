const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ── Types ────────────────────────────────────────────────────────

export type Job = {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  authorId: number;
  createdAt: string;
  author?: { id: number; name: string | null; email: string };
};

export type User = {
  id: number;
  email: string;
  name: string | null;
  role: 'CANDIDAT' | 'ENTREPRISE' | 'ARTISAN' | 'ADMIN';
  isVerified: boolean;
  isBanned: boolean;
  banReason: string | null;
  bannedAt: string | null;
  createdAt: string;
};

export type Report = {
  id: number;
  reason: string;
  targetType: string;
  targetId: number;
  status: 'OPEN' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
};

export type AdminStats = {
  users: number;
  pendingJobs: number;
  approvedJobs: number;
  reports: number;
  todaySignups: number;
  totalReviews: number;
  enterprisePending: number;
};

export type VerificationSubmission = {
  id: string;
  role: 'entreprise' | 'artisan';
  accountKey: string;
  displayName: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
  payload: Record<string, string | boolean | number | null>;
};

export type AppFeedback = {
  id: number;
  userId: number | null;
  authorName: string | null;
  rating: number;
  comment: string;
  createdAt: string;
};

export type UserReview = {
  id: number;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { id: number; name: string; email: string; role: string } | null;
  reviewed: { id: number; name: string; email: string; role: string } | null;
};

export type ReviewAlert = {
  userId: number;
  name: string;
  role: string;
  averageRating: number;
  reviewCount: number;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ── Fetch helper ─────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Erreur API ${res.status}`);
  }

  return res.json();
}

// ── Admin Stats ──────────────────────────────────────────────────

export function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/stats');
}

// ── Jobs ─────────────────────────────────────────────────────────

type JobsResponse = { jobs: Job[]; pagination: Pagination };

export function fetchJobs(filters: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
} = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.search) params.set('search', filters.search);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<JobsResponse>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export function fetchJob(id: number): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}`);
}

export function updateJob(id: number, data: Partial<Pick<Job, 'title' | 'company' | 'location' | 'description' | 'salary' | 'status'>>): Promise<Job> {
  return apiFetch<Job>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function deleteJob(id: number): Promise<void> {
  return apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
}

// ── Users ────────────────────────────────────────────────────────

type UsersResponse = { users: User[]; pagination: Pagination };

export function fetchUsers(filters: {
  role?: string;
  page?: number;
  limit?: number;
} = {}): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));
  const qs = params.toString();
  return apiFetch<UsersResponse>(`/api/users${qs ? `?${qs}` : ''}`);
}

export function fetchUser(id: number): Promise<User & { jobs: Job[] }> {
  return apiFetch(`/api/users/${id}`);
}

export function updateUser(id: number, data: Partial<Pick<User, 'name' | 'role' | 'isVerified'>>): Promise<User> {
  return apiFetch<User>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function banUser(id: number, banned: boolean, reason?: string): Promise<User> {
  return apiFetch<User>(`/api/users/${id}/ban`, {
    method: 'PUT',
    body: JSON.stringify({ banned, reason }),
  });
}

export function deleteUser(id: number): Promise<void> {
  return apiFetch(`/api/users/${id}`, { method: 'DELETE' });
}

// ── Reports ──────────────────────────────────────────────────────

export function fetchReports(status?: string): Promise<Report[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<Report[]>(`/api/reports${qs}`);
}

export function updateReport(id: number, data: { status: string }): Promise<Report> {
  return apiFetch<Report>(`/api/reports/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Trends ──────────────────────────────────────────────────────

export type TrendPoint = {
  dayKey: string;
  label: string;
  users: number;
  jobs: number;
};

export type TrendsResponse = {
  days: number;
  points: TrendPoint[];
};

export function fetchAdminTrends(days: number = 7): Promise<TrendsResponse> {
  return apiFetch<TrendsResponse>(`/api/admin/trends?days=${days}`);
}

// ── Verifications ───────────────────────────────────────────────

export function fetchVerificationSubmissions(): Promise<VerificationSubmission[]> {
  return apiFetch<{ items: VerificationSubmission[] }>('/api/verifications').then((r) => r.items);
}

export function reviewVerification(
  id: string,
  data: { status: 'approved' | 'rejected'; reviewedBy: string; notes?: string },
): Promise<VerificationSubmission> {
  return apiFetch<VerificationSubmission>(`/api/verifications/${id}/review`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

// ── App Feedbacks ───────────────────────────────────────────────

export function fetchAppFeedbacks(
  limit: number = 50,
): Promise<{ items: AppFeedback[]; summary: { averageRating: number; count: number } }> {
  return apiFetch(`/api/feedbacks?limit=${limit}`);
}

// ── Admin Reviews ───────────────────────────────────────────────

export function fetchAdminReviews(): Promise<{ reviews: UserReview[]; alerts: ReviewAlert[] }> {
  return apiFetch('/api/admin/reviews');
}

// ── Health ───────────────────────────────────────────────────────

export function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch('/api/health');
}
