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

// ── Health ───────────────────────────────────────────────────────

export function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch('/api/health');
}
