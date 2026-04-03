import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/a-propos');

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return children;
}