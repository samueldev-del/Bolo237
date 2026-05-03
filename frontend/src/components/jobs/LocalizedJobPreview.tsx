"use client";

import { useLocale } from "@/components/LocaleProvider";

type LocalizedJob = {
  title?: string | null;
  description?: string | null;
  titleFr?: string | null;
  titleEn?: string | null;
  descriptionFr?: string | null;
  descriptionEn?: string | null;
  title_fr?: string | null;
  title_en?: string | null;
  description_fr?: string | null;
  description_en?: string | null;
};

function pick(...values: Array<string | null | undefined>) {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) return normalized;
  }
  return "";
}

export default function LocalizedJobPreview({ job }: { job: LocalizedJob }) {
  const { locale } = useLocale();

  const localizedTitle =
    locale === "en"
      ? pick(job.title_en, job.titleEn, job.titleFr, job.title)
      : pick(job.title_fr, job.titleFr, job.titleEn, job.title);

  const localizedDescription =
    locale === "en"
      ? pick(job.description_en, job.descriptionEn, job.descriptionFr, job.description)
      : pick(job.description_fr, job.descriptionFr, job.descriptionEn, job.description);

  return (
    <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
      <h3 className="text-lg font-extrabold text-zinc-900">{localizedTitle || "-"}</h3>
      <p className="mt-2 whitespace-pre-line text-sm text-zinc-700">{localizedDescription || "-"}</p>
    </article>
  );
}
