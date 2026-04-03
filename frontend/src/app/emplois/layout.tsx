import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/emplois');

export default function EmploisLayout({ children }: { children: React.ReactNode }) {
  return children;
}
