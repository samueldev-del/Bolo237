import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/conditions');

export default function ConditionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}