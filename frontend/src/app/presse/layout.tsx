import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/presse');

export default function PresseLayout({ children }: { children: React.ReactNode }) {
  return children;
}