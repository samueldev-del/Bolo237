import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/questions-frequentes');

export default function FaqLayout({ children }: { children: React.ReactNode }) {
  return children;
}
