import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/recherche');

export default function RechercheLayout({ children }: { children: React.ReactNode }) {
  return children;
}