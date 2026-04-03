import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/connexion', {
  robots: {
    index: false,
    follow: false,
  },
});

export default function ConnexionLayout({ children }: { children: React.ReactNode }) {
  return children;
}