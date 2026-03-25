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
  author?: { id: number; name: string | null; email: string; role?: string };
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

export type VerificationRole = 'entreprise' | 'artisan';
export type VerificationStatus = 'not_submitted' | 'pending' | 'approved' | 'rejected';

export type VerificationSubmission = {
  id: string;
  role: VerificationRole;
  accountKey: string;
  displayName: string;
  phone: string;
  status: Exclude<VerificationStatus, 'not_submitted'>;
  submittedAt: string;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  notes?: string | null;
  payload: Record<string, string | boolean | number | null>;
};

export type CandidateProfile = {
  id: number;
  nom: string;
  titre: string;
  localisation: string;
  experience: 'Junior' | 'Confirme' | 'Senior';
  disponibilite: 'Immediatement' | 'Sous 1 mois' | 'A l ecoute du marche';
  etudes: 'Bac' | 'Bac+2' | 'Bac+3' | 'Bac+5';
  cvMajJours: number;
  competences: string[];
  disponibleNow: boolean;
  userId?: number;
  createdAt: string;
};

export type CandidateProfileDetail = CandidateProfile & {
  userId?: number | null;
  user: {
    id: number;
    name: string | null;
    email: string;
    phone: string | null;
    isVerified: boolean;
    createdAt: string;
  } | null;
  profile: {
    fullName: string;
    title: string;
    location: string;
    phone: string;
    email: string;
    profile: string;
    experience: string;
    education: string;
    skillsText: string;
    languagesText: string;
    updatedAt: string;
  } | null;
};

export type UserProfile = {
  userId: number;
  fullName: string;
  title: string;
  location: string;
  phone: string;
  email: string;
  profile: string;
  experience: string;
  education: string;
  skillsText: string;
  languagesText: string;
  updatedAt: string;
};

export type ApiNotification = {
  id: number;
  userId: number;
  type: string;
  title: string;
  message: string;
  data?: Record<string, string | number | boolean | null> | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
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
  reviewerId: number;
  reviewedId: number;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer?: { id: number; name: string | null; email: string };
};

export type AdminTrendPoint = {
  dayKey: string;
  label: string;
  users: number;
  jobs: number;
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
  authorId?: number;
  page?: number;
  limit?: number;
};

export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.location) params.set('location', filters.location);
  if (filters.status) params.set('status', filters.status);
  if (filters.authorId) params.set('authorId', String(filters.authorId));
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

export async function applyToJob(input: {
  jobId: number;
  candidateId: number;
  candidateName?: string;
}): Promise<void> {
  await apiFetch(`/api/jobs/${input.jobId}/apply`, {
    method: 'POST',
    body: JSON.stringify({
      candidateId: input.candidateId,
      candidateName: input.candidateName,
    }),
  });
}

export type UserApplication = {
  id: number;
  jobId: number | null;
  jobTitle: string;
  company: string;
  date: string;
  statut: string;
};

export async function fetchUserApplications(userId: number): Promise<UserApplication[]> {
  const res = await apiFetch<{ applications: UserApplication[] }>(`/api/users/${userId}/applications`);
  return res.applications;
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
  phone?: string;
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

export async function fetchAdminTrends(days: 7 | 30 = 7, locale: 'fr' | 'en' = 'fr'): Promise<{
  days: number;
  points: AdminTrendPoint[];
}> {
  return apiFetch(`/api/admin/trends?days=${days}&locale=${locale}`);
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

// ── Upload ──────────────────────────────────────────────────────

export async function uploadFile(file: File, folder?: string): Promise<{ url: string; publicId: string }> {
  const formData = new FormData();
  formData.append('file', file);
  const qs = folder ? `?folder=${encodeURIComponent(folder)}` : '';
  const res = await fetch(`${API_BASE}/api/upload${qs}`, { method: 'POST', body: formData });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || 'Upload failed');
  }
  return res.json();
}

// ── Health ───────────────────────────────────────────────────────

export async function checkHealth(): Promise<{ status: string; timestamp: string }> {
  return apiFetch('/api/health');
}

// ── Verifications (Identity moderation) ───────────────────────────

export async function fetchVerificationStatus(
  role: VerificationRole,
  accountKey: string
): Promise<VerificationStatus> {
  const params = new URLSearchParams({ role, accountKey });
  const res = await apiFetch<{ status: VerificationStatus }>(`/api/verifications/status?${params.toString()}`);
  return res.status;
}

export async function createVerificationSubmission(data: {
  role: VerificationRole;
  accountKey: string;
  displayName: string;
  phone: string;
  payload: Record<string, string | boolean | number | null>;
}): Promise<VerificationSubmission> {
  return apiFetch<VerificationSubmission>('/api/verifications', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchVerificationSubmissions(): Promise<VerificationSubmission[]> {
  const res = await apiFetch<{ items: VerificationSubmission[] }>('/api/verifications');
  return res.items;
}

export async function reviewVerificationSubmission(input: {
  id: string;
  status: 'approved' | 'rejected';
  reviewedBy: string;
  notes?: string;
}): Promise<VerificationSubmission> {
  return apiFetch<VerificationSubmission>(`/api/verifications/${input.id}/review`, {
    method: 'PATCH',
    body: JSON.stringify({
      status: input.status,
      reviewedBy: input.reviewedBy,
      notes: input.notes,
    }),
  });
}

// ── Candidate profiles / CVtheque ────────────────────────────────

export async function fetchCandidateProfiles(): Promise<CandidateProfile[]> {
  const res = await apiFetch<{ candidates: CandidateProfile[] }>('/api/candidates');
  return res.candidates;
}

export async function fetchCandidateProfileDetail(id: number): Promise<CandidateProfileDetail> {
  return apiFetch<CandidateProfileDetail>(`/api/candidates/${id}`);
}

export async function createCandidateProfile(data: {
  userId?: number;
  nom: string;
  titre: string;
  localisation: string;
  experience: CandidateProfile['experience'];
  disponibilite: CandidateProfile['disponibilite'];
  etudes: CandidateProfile['etudes'];
  competences: string[];
  disponibleNow?: boolean;
}): Promise<CandidateProfile> {
  return apiFetch<CandidateProfile>('/api/candidates', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// ── User profile ──────────────────────────────────────────────────

export async function fetchUserProfile(userId: number): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/profiles/${userId}`);
}

export async function upsertUserProfile(
  userId: number,
  data: Omit<UserProfile, 'userId' | 'updatedAt'>
): Promise<UserProfile> {
  return apiFetch<UserProfile>(`/api/profiles/${userId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ── Saved jobs ────────────────────────────────────────────────────

export async function fetchUserSavedJobs(userId: number): Promise<ApiJob[]> {
  const res = await apiFetch<{ jobs: ApiJob[] }>(`/api/users/${userId}/saved-jobs`);
  return res.jobs;
}

export async function saveUserJob(userId: number, jobId: number): Promise<void> {
  await apiFetch(`/api/users/${userId}/saved-jobs`, {
    method: 'POST',
    body: JSON.stringify({ jobId }),
  });
}

export async function removeUserSavedJob(userId: number, jobId: number): Promise<void> {
  await apiFetch(`/api/users/${userId}/saved-jobs/${jobId}`, {
    method: 'DELETE',
  });
}

// ── Notifications ────────────────────────────────────────────────

export async function fetchUserNotifications(
  userId: number,
  options: { unreadOnly?: boolean; limit?: number } = {}
): Promise<{ items: ApiNotification[]; unreadCount: number }> {
  const params = new URLSearchParams();
  if (options.unreadOnly) params.set('unreadOnly', 'true');
  if (options.limit) params.set('limit', String(options.limit));
  const qs = params.toString();
  return apiFetch<{ items: ApiNotification[]; unreadCount: number }>(
    `/api/users/${userId}/notifications${qs ? `?${qs}` : ''}`
  );
}

export async function markNotificationAsRead(notificationId: number): Promise<void> {
  await apiFetch(`/api/notifications/${notificationId}/read`, {
    method: 'PATCH',
  });
}

export async function markAllNotificationsAsRead(userId: number): Promise<void> {
  await apiFetch(`/api/users/${userId}/notifications/read-all`, {
    method: 'PATCH',
  });
}

// ── App feedbacks ────────────────────────────────────────────────

export async function createAppFeedback(data: {
  userId?: number;
  authorName?: string;
  rating: number;
  comment: string;
}): Promise<AppFeedback> {
  return apiFetch<AppFeedback>('/api/feedbacks', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchAppFeedbacks(limit = 50): Promise<{
  items: AppFeedback[];
  summary: { averageRating: number; count: number };
}> {
  return apiFetch(`/api/feedbacks?limit=${limit}`);
}

// ── User reviews ─────────────────────────────────────────────────

export async function fetchUserReviews(userId: number, limit = 20): Promise<{
  items: UserReview[];
  summary: { averageRating: number; count: number };
}> {
  return apiFetch(`/api/users/${userId}/reviews?limit=${limit}`);
}

export async function createUserReview(input: {
  reviewedId: number;
  reviewerId: number;
  rating: number;
  comment: string;
}): Promise<UserReview> {
  return apiFetch<UserReview>(`/api/users/${input.reviewedId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      reviewerId: input.reviewerId,
      rating: input.rating,
      comment: input.comment,
    }),
  });
}
