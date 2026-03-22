export const BLOCKED_PUBLICATION_KEYWORDS = [
  'frais de dossier',
  'frais d inscription',
  'transfert mobile money',
  'investissement',
];

export function containsBlockedKeyword(text: string): string | null {
  const normalized = text.toLowerCase().replace(/[']/g, ' ');
  const found = BLOCKED_PUBLICATION_KEYWORDS.find((keyword) => normalized.includes(keyword));
  return found ?? null;
}

export function getModerationStatusForFirstPublications(publicationCount: number): 'en-attente' | 'publiee' {
  return publicationCount < 3 ? 'en-attente' : 'publiee';
}

export function canPublishUnlimited(isVerifiedRecruiter: boolean): boolean {
  return isVerifiedRecruiter;
}

export function getOtpDemoCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}