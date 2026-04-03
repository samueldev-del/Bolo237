'use client';

import { useLocale } from '@/components/LocaleProvider';
import { buildBreadcrumbSchema, type BreadcrumbItem } from '@/lib/seo';

type BreadcrumbJsonLdProps = {
  items: BreadcrumbItem[];
};

export default function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const { locale } = useLocale();
  const schema = buildBreadcrumbSchema(items, locale);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}