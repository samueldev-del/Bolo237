import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/petits-boulots');

export default function PetitsBoulotsLayout({ children }: { children: React.ReactNode }) {
  return children;
}