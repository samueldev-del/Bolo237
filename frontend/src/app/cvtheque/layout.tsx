import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/cvtheque', {
  robots: {
    index: false,
    follow: false,
  },
});

export default function CvthequeLayout({ children }: { children: React.ReactNode }) {
  return children;
}