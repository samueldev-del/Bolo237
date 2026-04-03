import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/publier');

export default function PublierLayout({ children }: { children: React.ReactNode }) {
  return children;
}