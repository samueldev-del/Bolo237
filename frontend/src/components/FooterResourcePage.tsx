"use client";

import Link from "next/link";
import BreadcrumbJsonLd from "@/components/BreadcrumbJsonLd";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { useLocale } from "@/components/LocaleProvider";

type LocalizedText = {
  fr: string;
  en: string;
};

type ResourceCard = {
  title: LocalizedText;
  description: LocalizedText;
};

type ResourceLink = {
  href: string;
  label: LocalizedText;
  note: LocalizedText;
};

type FooterResourcePageProps = {
  path: string;
  breadcrumbLabel: LocalizedText;
  eyebrow: LocalizedText;
  title: LocalizedText;
  intro: LocalizedText;
  highlight: LocalizedText;
  cards: ResourceCard[];
  quickLinks: ResourceLink[];
  primaryCta: {
    href: string;
    label: LocalizedText;
  };
  secondaryCta?: {
    href: string;
    label: LocalizedText;
  };
};

function pick(text: LocalizedText, locale: "fr" | "en") {
  return text[locale];
}

export default function FooterResourcePage({
  path,
  breadcrumbLabel,
  eyebrow,
  title,
  intro,
  highlight,
  cards,
  quickLinks,
  primaryCta,
  secondaryCta,
}: FooterResourcePageProps) {
  const { locale, localizePath } = useLocale();

  return (
    <div className="min-h-screen bg-[#FFF9F5] text-black flex flex-col">
      <BreadcrumbJsonLd
        items={[
          { name: { fr: "Accueil", en: "Home" }, path: "/" },
          { name: breadcrumbLabel, path },
        ]}
      />
      <Header />

      <main className="flex-1">
        <section className="border-b border-[#F2D8C8] bg-[radial-gradient(circle_at_top_left,_#FFF1E8,_#FFF9F5_48%,_#FFFFFF_100%)]">
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-18">
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#B55B38]">
              {pick(eyebrow, locale)}
            </p>

            <div className="mt-4 grid gap-8 lg:grid-cols-[1.35fr_0.8fr] lg:items-start">
              <div>
                <h1 className="max-w-3xl text-3xl md:text-5xl font-black tracking-tight text-gray-900">
                  {pick(title, locale)}
                </h1>
                <p className="mt-5 max-w-2xl text-base md:text-lg leading-relaxed text-gray-600">
                  {pick(intro, locale)}
                </p>

                <div className="mt-8 flex flex-wrap gap-3">
                  <Link
                    href={localizePath(primaryCta.href)}
                    className="inline-flex items-center justify-center rounded-full bg-[#C4623F] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#A8502F]"
                  >
                    {pick(primaryCta.label, locale)}
                  </Link>

                  {secondaryCta ? (
                    <Link
                      href={localizePath(secondaryCta.href)}
                      className="inline-flex items-center justify-center rounded-full border border-[#D9B29A] bg-white px-6 py-3 text-sm font-extrabold text-[#8B4332] transition hover:bg-[#FFF1E8]"
                    >
                      {pick(secondaryCta.label, locale)}
                    </Link>
                  ) : null}
                </div>
              </div>

              <div className="rounded-[28px] border border-[#F1D3C1] bg-white/90 p-6 shadow-[0_20px_60px_rgba(139,67,50,0.08)]">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[#C4623F]">
                  {locale === "en" ? "Quick focus" : "Focus rapide"}
                </p>
                <p className="mt-3 text-lg font-bold leading-snug text-gray-900">
                  {pick(highlight, locale)}
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-4 py-12 md:py-14 grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {cards.map((card, index) => (
              <article
                key={pick(card.title, locale)}
                className="rounded-[24px] border border-[#F0D8C9] bg-white p-6 shadow-[0_10px_30px_rgba(139,67,50,0.05)]"
              >
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#FFF1E8] text-sm font-black text-[#B55B38]">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <h2 className="text-lg font-extrabold text-gray-900">
                  {pick(card.title, locale)}
                </h2>
                <p className="mt-3 text-sm leading-7 text-gray-600">
                  {pick(card.description, locale)}
                </p>
              </article>
            ))}
          </div>

          <aside className="rounded-[28px] border border-[#ECD3C4] bg-[#FFF5EF] p-6">
            <h2 className="text-xl font-black text-gray-900">
              {locale === "en" ? "Related Bolo237 resources" : "Ressources Bolo237 associees"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-gray-600">
              {locale === "en"
                ? "These links connect this guide to the sections that already exist on the platform."
                : "Ces liens relient ce guide aux sections deja disponibles sur la plateforme."}
            </p>

            <div className="mt-6 space-y-3">
              {quickLinks.map((link) => (
                <Link
                  key={`${path}-${link.href}-${pick(link.label, locale)}`}
                  href={localizePath(link.href)}
                  className="block rounded-2xl border border-[#E7C9B7] bg-white px-4 py-4 transition hover:border-[#C4623F] hover:bg-[#FFF1E8]"
                >
                  <p className="text-sm font-extrabold text-gray-900">{pick(link.label, locale)}</p>
                  <p className="mt-1 text-xs leading-5 text-gray-600">{pick(link.note, locale)}</p>
                </Link>
              ))}
            </div>
          </aside>
        </section>
      </main>

      <Footer />
    </div>
  );
}