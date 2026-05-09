import * as Sentry from '@sentry/nextjs';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
const FRONTEND_PROXY_BASE = '/api/backend';
const FRONTEND_UPLOAD_PROXY_BASE = '/api/uploads';

function buildApiUrl(path: string): string {
  if (typeof window === 'undefined') {
    return `${API_BASE}${path}`;
  }

  const normalizedPath = String(path || '').replace(/^\/+/, '');
  const strippedApiPath = normalizedPath.startsWith('api/')
    ? normalizedPath.slice(4)
    : normalizedPath;

  return `${FRONTEND_PROXY_BASE}/${strippedApiPath}`;
}

export function buildFirstPartyUploadUrl(url: string): string {
  const normalized = String(url || '').trim();
  if (!normalized) return '';

  try {
    const parsed = new URL(normalized, API_BASE);
    if (parsed.pathname.startsWith(`${FRONTEND_UPLOAD_PROXY_BASE}/`)) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`;
    }
    if (!parsed.pathname.startsWith('/uploads/')) {
      return normalized;
    }

    return `${FRONTEND_UPLOAD_PROXY_BASE}${parsed.pathname.slice('/uploads'.length)}${parsed.search}${parsed.hash}`;
  } catch {
    if (normalized.startsWith(`${FRONTEND_UPLOAD_PROXY_BASE}/`)) {
      return normalized;
    }
    if (!normalized.startsWith('/uploads/')) {
      return normalized;
    }

    return `${FRONTEND_UPLOAD_PROXY_BASE}${normalized.slice('/uploads'.length)}`;
  }
}

// ── Types partagées ──────────────────────────────────────────────

export type ApiJob = {
  id: number;
  reference?: string | null;
  slug?: string | null;
  externalApplyUrl?: string | null;
  title: string;
  titleFr?: string | null;
  titleEn?: string | null;
  company: string;
  location: string;
  description: string;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  salary: string | null;
  status: string;
  authorId: number;
  createdAt: string;
  author?: { id: number; name: string | null; email: string; role?: string; isVerified?: boolean; photoUrl?: string | null };
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

export type ApiReportSummary = {
  targetType: string;
  targetId: number;
  totalReports: number;
  openReports: number;
  reviewThreshold: number;
  reviewThresholdReached: boolean;
};

export type ApiReportSubmission = {
  report: ApiReport;
  summary: ApiReportSummary;
};

export type ApiPrivacyExport = Record<string, unknown> & {
  reference: string;
  exportedAt: string;
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
  photoUrl?: string | null;
  defaultCvUrl?: string;
  profileVisible?: boolean;
  lastProfileUpdateAt?: string | null;
};

export type CandidateProfilesFilters = {
  search?: string;
  location?: string;
  sortBy?: 'recent' | 'oldest' | 'experience' | 'availability' | 'alpha';
  experience?: string[];
  availability?: string[];
  education?: string[];
  skills?: string[];
  activeDays?: number;
  onlyImmediate?: boolean;
  onlyWithCv?: boolean;
  page?: number;
  limit?: number;
};

export type CandidateProfilesResponse = {
  candidates: CandidateProfile[];
  pagination: Pagination;
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
    availability: string;
    profileVisible: boolean;
    jobAlertRole: string;
    jobAlertCity: string;
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
  availability: string;
  profileVisible: boolean;
  jobAlertRole: string;
  jobAlertCity: string;
  phone: string;
  email: string;
  profile: string;
  defaultCvUrl: string;
  experience: string;
  education: string;
  skillsText: string;
  languagesText: string;
  updatedAt: string;
};

export type ArtisanService = {
  id: number;
  userId: number;
  name: string;
  description: string | null;
  price: string | null;
  createdAt: string;
};

export type ArtisanPortfolioItem = {
  id: number;
  userId: number;
  imageUrl: string;
  title: string | null;
  createdAt: string;
};

export type ApiArtisanProfile = {
  id: number;
  fullName?: string | null;
  name?: string | null;
  title?: string | null;
  location?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  profile?: string | null;
  services: { name: string; price?: string | null }[];
  portfolio: { imageUrl: string }[];
};

export type ArtisanDirectoryPage = {
  items: ApiArtisanProfile[];
  pagination: Pagination;
};

export type ApiArtisanPublicDetail = {
  id: number;
  fullName?: string | null;
  name?: string | null;
  title?: string | null;
  location?: string | null;
  photoUrl?: string | null;
  phone?: string | null;
  profile?: string | null;
  services: {
    id: number;
    name: string;
    description?: string | null;
    price?: string | null;
    createdAt: string;
  }[];
  portfolio: {
    id: number;
    imageUrl: string;
    title?: string | null;
    createdAt: string;
  }[];
};

export type PortfolioPage = {
  items: ArtisanPortfolioItem[];
  pagination: Pagination;
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

class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function captureApiException(error: unknown, context: Record<string, unknown>) {
  Sentry.withScope((scope) => {
    scope.setTag('surface', 'frontend-api');
    Object.entries(context).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        scope.setExtra(key, value);
      }
    });
    Sentry.captureException(error);
  });
}

type ApiFetchOptions = RequestInit & {
  captureServerErrors?: boolean;
  captureNetworkErrors?: boolean;
};

function buildApiHeaders(headersInit?: HeadersInit, body?: BodyInit | null): Headers {
  const headers = new Headers(headersInit);

  if (!(body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return headers;
}

// ── CSRF (synchronisation cookie/header) ──────────────────────────
const CSRF_COOKIE_NAME = 'bolo237_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
let csrfTokenCache: string | null = null;
let csrfFetchInflight: Promise<string | null> | null = null;

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([a-fA-F0-9]{64})`));
  return match ? match[1].toLowerCase() : null;
}

async function ensureCsrfToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;

  if (!csrfTokenCache) {
    csrfTokenCache = readCsrfCookie();
  }
  if (csrfTokenCache) return csrfTokenCache;

  if (!csrfFetchInflight) {
    csrfFetchInflight = (async () => {
      try {
        const res = await fetch(buildApiUrl('/api/csrf-token'), {
          credentials: 'include',
          cache: 'no-store',
        });
        if (!res.ok) return null;
        const data = (await res.json().catch(() => null)) as { csrfToken?: string } | null;
        const fromBody = data?.csrfToken && /^[a-fA-F0-9]{64}$/.test(data.csrfToken)
          ? data.csrfToken.toLowerCase()
          : null;
        const fromCookie = readCsrfCookie();
        csrfTokenCache = fromCookie || fromBody || null;
        return csrfTokenCache;
      } catch {
        return null;
      } finally {
        csrfFetchInflight = null;
      }
    })();
  }

  return csrfFetchInflight;
}

export function invalidateCsrfToken(): void {
  csrfTokenCache = null;
}

async function apiFetch<T>(
  path: string,
  options?: ApiFetchOptions & { validate?: (data: unknown) => T },
): Promise<T> {
  const {
    captureServerErrors = true,
    captureNetworkErrors = true,
    headers,
    body,
    validate,
    ...requestOptions
  } = options ?? {};
  const method = String(options?.method || 'GET').toUpperCase();
  const finalHeaders = buildApiHeaders(headers, body);

  if (!SAFE_METHODS.has(method)) {
    const token = await ensureCsrfToken();
    if (token && !finalHeaders.has('x-csrf-token')) {
      finalHeaders.set('x-csrf-token', token);
    }
  }

  let res: Response;

  try {
    res = await fetch(buildApiUrl(path), {
      cache: 'no-store',
      credentials: 'include',
      ...requestOptions,
      headers: finalHeaders,
      body,
    });
  } catch (error) {
    if (captureNetworkErrors) {
      captureApiException(error, { kind: 'network', method, path });
    }
    throw error;
  }

  if (!res.ok) {
    let errBody: { error?: string; message?: string } = await res.json().catch(() => ({}));

    // Token CSRF rejete -> invalider, recuperer un nouveau token, puis reessayer une fois.
    if (res.status === 403 && !SAFE_METHODS.has(method) && /csrf/i.test(String(errBody.error || ''))) {
      invalidateCsrfToken();
      const fresh = await ensureCsrfToken();
      if (fresh) {
        finalHeaders.set('x-csrf-token', fresh);
        try {
          res = await fetch(buildApiUrl(path), {
            cache: 'no-store',
            credentials: 'include',
            ...requestOptions,
            headers: finalHeaders,
            body,
          });
        } catch (error) {
          if (captureNetworkErrors) {
            captureApiException(error, { kind: 'network', method, path });
          }
          throw error;
        }
        if (!res.ok) {
          errBody = await res.json().catch(() => ({}));
        }
      }
    }

    if (!res.ok) {
      if (captureServerErrors && res.status >= 500) {
        captureApiException(new Error(errBody.error || `API error ${res.status}`), {
          kind: 'response',
          method,
          path,
          status: res.status,
        });
      }
      throw new ApiError(errBody.error || errBody.message || `API error ${res.status}`, res.status, errBody);
    }
  }

  const json = (await res.json()) as unknown;
  if (validate) {
    try {
      return validate(json);
    } catch (err) {
      captureApiException(err, { kind: 'schema', method, path });
      throw new ApiError('Réponse serveur invalide.', 0, json);
    }
  }
  return json as T;
}

// Lightweight runtime guards (avoids adding zod to the frontend bundle).
export function expectObject(data: unknown, where: string): Record<string, unknown> {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error(`${where}: expected object`);
  }
  return data as Record<string, unknown>;
}
export function expectArray<T>(data: unknown, where: string, mapItem: (item: unknown, index: number) => T): T[] {
  if (!Array.isArray(data)) {
    throw new Error(`${where}: expected array`);
  }
  return data.map((item, idx) => mapItem(item, idx));
}
export function expectString(data: unknown, where: string): string {
  if (typeof data !== 'string') throw new Error(`${where}: expected string`);
  return data;
}
export function expectNumber(data: unknown, where: string): number {
  if (typeof data !== 'number' || !Number.isFinite(data)) {
    throw new Error(`${where}: expected number`);
  }
  return data;
}

export { ApiError };

// ── Jobs ─────────────────────────────────────────────────────────

export type JobsResponse = { jobs: ApiJob[]; pagination: Pagination };

export type JobFilters = {
  search?: string;
  location?: string;
  sort?: 'recent' | 'oldest';
  status?: string;
  authorId?: number;
  page?: number;
  limit?: number;
};

export type ArtisanDashboardOverview = {
  jobs: ApiJob[];
  profileViews: number;
  clickHistory: ArtisanClickHistoryPoint[];
};

export type ArtisanClickHistoryPoint = {
  dayKey: string;
  count: number;
};

export type EnterpriseDashboardOverview = {
  jobs: ApiJob[];
};

export async function fetchJobs(filters: JobFilters = {}): Promise<JobsResponse> {
  const params = new URLSearchParams();
  if (filters.search)   params.set('search',   filters.search);
  if (filters.location) params.set('location', filters.location);
  if (filters.sort && filters.sort !== 'recent') params.set('sort', filters.sort);
  if (filters.status)   params.set('status',   filters.status);
  if (filters.authorId) params.set('authorId', String(filters.authorId));
  if (filters.page)     params.set('page',     String(filters.page));
  if (filters.limit)    params.set('limit',    String(filters.limit));

  const qs = params.toString();
  return apiFetch<JobsResponse>(`/api/jobs${qs ? `?${qs}` : ''}`);
}

export async function fetchArtisanDashboardOverview(): Promise<ArtisanDashboardOverview> {
  return apiFetch<ArtisanDashboardOverview>('/api/dashboard-artisan/overview');
}

export async function fetchEnterpriseDashboardOverview(): Promise<EnterpriseDashboardOverview> {
  return apiFetch<EnterpriseDashboardOverview>('/api/dashboard-entreprise/overview');
}

export async function fetchJob(id: number): Promise<ApiJob> {
  return apiFetch<ApiJob>(`/api/jobs/${id}`);
}

export async function trackJobView(jobId: number): Promise<void> {
  await apiFetch(`/api/jobs/${jobId}/view`, {
    method: 'POST',
    body: JSON.stringify({}),
    captureServerErrors: false,
    captureNetworkErrors: false,
  });
}

export async function trackJobApplyClick(jobId: number): Promise<void> {
  await apiFetch(`/api/jobs/${jobId}/apply-click`, {
    method: 'POST',
    body: JSON.stringify({}),
    captureServerErrors: false,
    captureNetworkErrors: false,
  });
}

export async function createJobAlert(input: {
  keywords: string;
  location?: string | null;
  frequency?: JobAlertFrequency;
}): Promise<ApiJobAlert> {
  const response = await apiFetch<{ alert?: ApiJobAlert; message?: string }>('/api/job-alerts', {
    method: 'POST',
    body: JSON.stringify({
      keywords: input.keywords,
      location: input.location ?? null,
      frequency: input.frequency ?? 'DAILY',
    }),
  });

  if (!response.alert) {
    throw new Error(response.message || 'Réponse invalide lors de la création de l’alerte.');
  }

  return response.alert;
}

export async function createJob(data: {
  title: string;
  company: string;
  location: string;
  description: string;
  salary?: string;
  externalApplyUrl?: string | null;
}): Promise<ApiJob> {
  const response = await apiFetch<{ job?: ApiJob; message?: string }>('/api/jobs', {
    method: 'POST',
    body: JSON.stringify(data),
  });

  if (!response.job) {
    throw new Error(response.message || 'Réponse invalide lors de la création de l’offre.');
  }

  return response.job;
}

export type UserApplication = {
  id: number;
  jobId: number | null;
  jobTitle: string;
  company: string;
  date: string;
  status: string;
  statut: string;
};

export type RecruiterApplicationStatus = 'REVIEWING' | 'INTERVIEW' | 'REJECTED' | 'HIRED';

export type JobAlertFrequency = 'DAILY' | 'WEEKLY';

export type ApiJobAlert = {
  id: number;
  userId: number;
  keywords: string;
  location: string | null;
  frequency: JobAlertFrequency;
  isActive: boolean;
  lastSentAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApiApplication = {
  id: number;
  jobId: number;
  candidateId: number;
  message: string;
  cvUrl: string;
  status: string;
  createdAt: string;
  candidate: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    photoUrl?: string;
  };
};

export async function submitJobApplication(
  jobId: number,
  message: string,
  options: { cvFile?: File | null; defaultCvUrl?: string | null }
): Promise<{ application?: ApiApplication }> {
  const payload = new FormData();
  payload.append('message', message);

  let cvUrl = String(options.defaultCvUrl || '').trim();
  if (options.cvFile) {
    const uploaded = await uploadFile(options.cvFile, 'cv');
    cvUrl = String(uploaded.url || '').trim();
  }

  if (!cvUrl) {
    throw new ApiError('CV requis pour envoyer la candidature.', 400);
  }

  payload.append('cvUrl', cvUrl);

  return apiFetch<{ application?: ApiApplication }>(`/api/jobs/${jobId}/apply`, {
    method: 'POST',
    body: payload,
  });
}

export async function updateUserPhoto(userId: number, photoUrl: string | null): Promise<ApiUser> {
  return apiFetch<ApiUser>(`/api/users/${userId}/photo`, {
    method: 'PATCH',
    body: JSON.stringify({ photoUrl }),
  });
}

export async function fetchJobApplications(jobId: number): Promise<ApiApplication[]> {
  const response = await fetch(`/api/backend/jobs/${jobId}/applications`, {
    method: 'GET',
    credentials: 'include',
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.message || 'Erreur lors de la recuperation des candidatures');
  }

  return Array.isArray(payload.applications) ? (payload.applications as ApiApplication[]) : [];
}

export async function fetchUserApplications(userId: number): Promise<UserApplication[]> {
  const res = await apiFetch<{ applications: UserApplication[] }>(`/api/users/${userId}/applications`, {
    validate: (data) => {
      const obj = expectObject(data, 'fetchUserApplications');
      const apps = Array.isArray(obj.applications) ? obj.applications : [];
      return { applications: apps as UserApplication[] };
    },
  });
  return res.applications;
}

export async function updateApplicationStatus(
  applicationId: number,
  status: RecruiterApplicationStatus
): Promise<ApiApplication> {
  const response = await apiFetch<{ application?: ApiApplication }>(`/api/jobs/applications/${applicationId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

  if (!response.application) {
    throw new Error('Reponse invalide: candidature absente.');
  }

  return response.application;
}

export async function updateJob(
  id: number,
  data: Partial<Pick<ApiJob, 'title' | 'company' | 'location' | 'description' | 'salary' | 'status'>>
): Promise<ApiJob> {
  const response = await apiFetch<{ job?: ApiJob; message?: string }>(`/api/jobs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });

  if (!response.job) {
    throw new Error(response.message || 'Réponse invalide lors de la mise à jour de l’offre.');
  }

  return response.job;
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
  email?: string;
  password: string;
  name?: string;
  role?: string;
  phone?: string;
  website?: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function loginUser(data: {
  email?: string;
  phone?: string;
  identifier?: string;
  password: string;
}): Promise<ApiUser> {
  return apiFetch<ApiUser>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchSessionUser(options?: { captureServerErrors?: boolean }): Promise<ApiUser & { phone?: string | null; isBanned?: boolean }> {
  return apiFetch('/api/auth/me', {
    captureServerErrors: options?.captureServerErrors,
  });
}

export async function logoutUser(): Promise<void> {
  try {
    await apiFetch('/api/auth/logout', {
      method: 'POST',
      captureNetworkErrors: false,
      captureServerErrors: false,
    });
  } finally {
    invalidateCsrfToken();
  }
}

// ── Reports ──────────────────────────────────────────────────────

export async function fetchReports(status?: string): Promise<ApiReport[]> {
  const qs = status ? `?status=${status}` : '';
  return apiFetch<ApiReport[]>(`/api/reports${qs}`);
}

export async function fetchReportSummary(targetType: string, targetId: number): Promise<ApiReportSummary> {
  const params = new URLSearchParams({
    targetType,
    targetId: String(targetId),
  });
  return apiFetch<ApiReportSummary>(`/api/reports/summary?${params.toString()}`);
}

export async function createReport(data: {
  reason: string;
  targetType: string;
  targetId: number;
}): Promise<ApiReportSubmission> {
  return apiFetch<ApiReportSubmission>('/api/reports', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function exportPrivacyData(): Promise<ApiPrivacyExport> {
  return apiFetch<ApiPrivacyExport>('/api/privacy/export');
}

export async function requestAccountDeletion(reason?: string): Promise<{ ok: boolean; reference: string; delivery: string; message: string }> {
  return apiFetch('/api/privacy/delete-request', {
    method: 'POST',
    body: JSON.stringify({ reason }),
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
  success?: boolean;
  message?: string;
  demoCode?: string; // uniquement en dev
  expiresIn?: string;
};

export type OtpVerifyResponse = {
  verified?: boolean;
  success?: boolean;
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
  const res = await fetch(buildApiUrl(`/api/upload${qs}`), {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
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

// ── Candidate profiles / CVtheque ────────────────────────────────

export async function fetchCandidateProfiles(filters: CandidateProfilesFilters = {}): Promise<CandidateProfilesResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.location) params.set('location', filters.location);
  if (filters.sortBy) params.set('sortBy', filters.sortBy);
  if (filters.experience && filters.experience.length > 0) params.set('experience', filters.experience.join(','));
  if (filters.availability && filters.availability.length > 0) params.set('availability', filters.availability.join(','));
  if (filters.education && filters.education.length > 0) params.set('education', filters.education.join(','));
  if (filters.skills && filters.skills.length > 0) params.set('skills', filters.skills.join(','));
  if (filters.activeDays) params.set('activeDays', String(filters.activeDays));
  if (filters.onlyImmediate) params.set('onlyImmediate', 'true');
  if (filters.onlyWithCv) params.set('onlyWithCv', 'true');
  if (filters.page) params.set('page', String(filters.page));
  if (filters.limit) params.set('limit', String(filters.limit));

  const query = params.toString();
  const res = await apiFetch<CandidateProfilesResponse>(`/api/candidates${query ? `?${query}` : ''}`);
  return {
    candidates: Array.isArray(res.candidates) ? res.candidates : [],
    pagination: res.pagination,
  };
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

export async function trackArtisanContactClick(userId: number): Promise<void> {
  await apiFetch(`/api/artisans/${userId}/track-contact`, {
    method: 'POST',
  });
}

export async function fetchArtisanServices(userId: number): Promise<ArtisanService[]> {
  const res = await apiFetch<{ services: ArtisanService[] }>(`/api/users/${userId}/services`);
  return Array.isArray(res.services) ? res.services : [];
}

export async function addArtisanService(
  userId: number,
  data: { name: string; description?: string; price?: string }
): Promise<ArtisanService> {
  const res = await apiFetch<{ service: ArtisanService }>(`/api/users/${userId}/services`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.service;
}

export async function removeArtisanService(userId: number, serviceId: number): Promise<void> {
  await apiFetch(`/api/users/${userId}/services/${serviceId}`, {
    method: 'DELETE',
  });
}

export async function fetchArtisanPortfolio(
  userId: number,
  options: { page?: number; limit?: number } = {}
): Promise<PortfolioPage> {
  const params = new URLSearchParams();
  if (options.page) params.set('page', String(options.page));
  if (options.limit) params.set('limit', String(options.limit));
  const query = params.toString();

  const res = await apiFetch<{ portfolio: ArtisanPortfolioItem[]; pagination?: Pagination }>(
    `/api/users/${userId}/portfolio${query ? `?${query}` : ''}`
  );

  const items = Array.isArray(res.portfolio) ? res.portfolio : [];
  return {
    items,
    pagination: res.pagination || {
      page: options.page || 1,
      limit: options.limit || items.length || 1,
      total: items.length,
      totalPages: 1,
    },
  };
}

export async function addPortfolioImage(
  userId: number,
  data: { imageUrl: string; title?: string }
): Promise<ArtisanPortfolioItem> {
  const res = await apiFetch<{ portfolioItem: ArtisanPortfolioItem }>(`/api/users/${userId}/portfolio`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
  return res.portfolioItem;
}

export async function removePortfolioImage(userId: number, portfolioId: number): Promise<void> {
  await apiFetch(`/api/users/${userId}/portfolio/${portfolioId}`, {
    method: 'DELETE',
  });
}

export async function fetchArtisanDirectory(filters?: {
  categorie?: string;
  location?: string;
  service?: string;
  sortBy?: 'recent' | 'services' | 'portfolio';
  page?: number;
  limit?: number;
}): Promise<ArtisanDirectoryPage> {
  const params = new URLSearchParams();

  if (filters?.categorie) params.set('categorie', filters.categorie);
  if (filters?.location) params.set('location', filters.location);
  if (filters?.service) params.set('service', filters.service);
  if (filters?.sortBy) params.set('sortBy', filters.sortBy);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.limit) params.set('limit', String(filters.limit));

  const queryString = params.toString();
  const res = await apiFetch<{ artisans: ApiArtisanProfile[]; pagination?: Pagination }>(
    `/api/users/artisans${queryString ? `?${queryString}` : ''}`
  );

  const items = Array.isArray(res.artisans) ? res.artisans : [];
  const page = filters?.page || 1;
  const limit = filters?.limit || items.length || 1;

  return {
    items,
    pagination: res.pagination || {
      page,
      limit,
      total: items.length,
      totalPages: 1,
    },
  };
}

export async function fetchPublicArtisanProfile(artisanId: number): Promise<ApiArtisanPublicDetail> {
  const res = await apiFetch<{ artisan: ApiArtisanPublicDetail }>(`/api/users/artisans/${artisanId}`);
  return res.artisan;
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
  rating: number;
  comment: string;
}): Promise<UserReview> {
  return apiFetch<UserReview>(`/api/users/${input.reviewedId}/reviews`, {
    method: 'POST',
    body: JSON.stringify({
      rating: input.rating,
      comment: input.comment,
    }),
  });
}

// ── Password reset ──────────────────────────────────────────────

export async function forgotPassword(phone: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export async function resetPassword(data: {
  phone: string;
  code: string;
  newPassword: string;
}): Promise<{ message: string }> {
  return apiFetch<{ message: string }>('/api/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
