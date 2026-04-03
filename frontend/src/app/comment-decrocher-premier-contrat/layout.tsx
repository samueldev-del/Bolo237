import type { Metadata } from 'next';
import { buildLocalizedMetadata } from '@/lib/seo';

export const metadata: Metadata = buildLocalizedMetadata('/comment-decrocher-premier-contrat');


export default function HowToLayout({ children }: { children: React.ReactNode }) {
  return children;
}
