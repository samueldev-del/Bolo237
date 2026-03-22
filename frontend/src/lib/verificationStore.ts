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
  reviewedAt?: string;
  reviewedBy?: string;
  notes?: string;
  payload: Record<string, string | boolean | number | null>;
};

const STORE_KEY = '237jobs-verification-submissions';

function readAll(): VerificationSubmission[] {
  if (typeof window === 'undefined') return [];
  const raw = window.localStorage.getItem(STORE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as VerificationSubmission[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(items: VerificationSubmission[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORE_KEY, JSON.stringify(items));
}

export function getVerificationStatus(role: VerificationRole, accountKey: string): VerificationStatus {
  const found = readAll().find((item) => item.role === role && item.accountKey === accountKey);
  return found?.status ?? 'not_submitted';
}

export function submitVerification(input: {
  role: VerificationRole;
  accountKey: string;
  displayName: string;
  phone: string;
  payload: Record<string, string | boolean | number | null>;
}) {
  const items = readAll();
  const now = new Date().toISOString();
  const existingIndex = items.findIndex((item) => item.role === input.role && item.accountKey === input.accountKey);

  const submission: VerificationSubmission = {
    id: existingIndex >= 0 ? items[existingIndex].id : `verif-${Math.random().toString(36).slice(2, 10)}`,
    role: input.role,
    accountKey: input.accountKey,
    displayName: input.displayName,
    phone: input.phone,
    status: 'pending',
    submittedAt: now,
    payload: input.payload,
  };

  if (existingIndex >= 0) {
    items[existingIndex] = submission;
  } else {
    items.unshift(submission);
  }

  writeAll(items);
  return submission;
}

export function listVerificationSubmissions(): VerificationSubmission[] {
  return readAll().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
}

export function reviewVerification(input: {
  id: string;
  status: 'approved' | 'rejected';
  reviewedBy: string;
  notes?: string;
}) {
  const items = readAll();
  const idx = items.findIndex((item) => item.id === input.id);
  if (idx < 0) return null;

  items[idx] = {
    ...items[idx],
    status: input.status,
    reviewedBy: input.reviewedBy,
    reviewedAt: new Date().toISOString(),
    notes: input.notes,
  };

  writeAll(items);
  return items[idx];
}
