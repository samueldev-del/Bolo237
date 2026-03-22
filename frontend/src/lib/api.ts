const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// ── Types partagées ──────────────────────────────────────────────

export type ApiJob = {
  id: number;
  title: string;
  company: string;
  location: string;
  description: string;
  salary: string | null;
  status: string;
  authorId: number;
  createdAt: string;
  author?: { id: number; name: string | null; email: string };
};

export type ApiUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  isVerified: boolean;
  createdAt: string;
};

export type ApiReport = {
  id: number;
  reason: string;
  targetType: string;
  targetId: number;
  status: string;
  createdAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

// ── Helpers ──────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API error ${res.status}`);
  }

  return res.json();
}

// ── Jobs ─────────────────────────────────────────────────────────

type JobsResponse = { jobs: ApiJob[]; pagination: Pagination };

export type JobFilters = {
  search?: string;
  location?: string;
  status?: string;
  page?: number;
  limit?: number;
};

export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.location) params.set('location', filters.location);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<JobsResponse>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export async function fetchJob(id: number): Promise<ApiJob> {
  return apiFetch<ApiJob>(`/api/jobs/${id}`);
}

export async function createJob(data: {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  authorId: number;
}): Promise<ApiJob> {
  return apiFetch<ApiJob>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateJob(
  id: number,
  data: Partial<Pick<ApiJob, 'title' | 'company' | 'location' | 'description' | 'salary' | 'status'>>
): Promise<ApiJob> {
  return apiFetch<ApiJob>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteJob(id: number): Promise<void> {
  await apiFetch(`/api/jobs/${id}`, { method: 'DELETE' });
}

// ── Users ────────────────────────────────────────────────────────

type UsersResponse = { users: ApiUser[]; pagination: Pagination };

export async function fetchUsers(filters: { role?: string; page?: number; limit?: number } = {}): Promise<UsersResponse> {
  const params = new URLSearchParams();
  if (filters.role) params.set('role', filters.role);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const qs = params.toString();
  return apiFetch<UsersResponse>(`/api/users${qs ? `?${qs}` : ''}`);
}

export async function fetchUser(id: number): Promise<ApiUser & { jobs: ApiJob[] }> {
  return apiFetch(`/api/users/${id}`);
}

export async function createUser(data: {
  email: string;
  password: string;
  name?: string;
  role?: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: {
  email: string;
  password: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Reports ──────────────────────────────────────────────────────

export async function fetchReports(status?: string): Promise<ApiReport[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<ApiReport[]>(`/api/reports${qs}`);
}

export async function createReport(data: {
  reason: string;
  targetType: string;
  targetId: number;
}): Promise<ApiReport> {
  return apiFetch<ApiReport>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── Admin ────────────────────────────────────────────────────────

export type AdminStats = {
  users: number;
  pendingJobs: number;
  approvedJobs: number;
  reports: number;
};

export async function fetchAdminStats(): Promise<AdminStats> {
  return apiFetch<AdminStats>('/api/admin/stats');
}

// ── OTP (Verification telephone) ─────────────────────────────────

export type OtpSendResponse = {
  message: string;
  demoCode?: string; // uniquement en dev
  expiresIn: string;
};

export type OtpVerifyResponse = {
  verified: boolean;
  message?: string;
  error?: string;
};

export async function sendOtp(phone: string): Promise<OtpSendResponse> {
  return apiFetch<OtpSendResponse>('/api/otp/send', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function verifyOtp(phone: string, code: string): Promise<OtpVerifyResponse> {
  return apiFetch<OtpVerifyResponse>('/api/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

// ── Health ───────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch('/api/health');
}
