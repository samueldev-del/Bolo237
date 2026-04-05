import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { LocaleProvider } from "@/components/LocaleProvider";
import AppFeedbackWidget from "@/components/AppFeedbackWidget";
import { cookies } from "next/headers";
import { buildLocalizedMetadata, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

const homeMetadata = buildLocalizedMetadata('/');

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: homeMetadata.title,
  description: homeMetadata.description,
  applicationName: "Bolo237",
  keywords: [
    "Bolo237",
    "emploi Cameroun",
    "offres d'emploi Douala",
    "recrutement Cameroun",
    "artisans Cameroun",
  ],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Bolo237",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
  alternates: homeMetadata.alternates,
  openGraph: homeMetadata.openGraph,
  twitter: homeMetadata.twitter,
};

export const viewport: Viewport = {
  themeColor: "#DA7756",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const lang = localeCookie === "en" ? "en" : "fr";
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Bolo237",
    url: "https://www.bolo237.com",
    inLanguage: ["fr", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.bolo237.com/fr/recherche?search={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Bolo237",
    url: "https://www.bolo237.com",
    logo: "https://www.bolo237.com/icon.svg",
    sameAs: [
      "https://www.bolo237.com/fr",
      "https://www.bolo237.com/en",
    ],
  };

  return (
    <html lang={lang}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${inter.className} flex flex-col min-h-screen bg-[#f4f6f8] text-black`}>
        <LocaleProvider>
          <main className="grow w-full">
            {children}
          </main>
          <AppFeedbackWidget />
          <CookieConsentBanner />
        </LocaleProvider>
      </body>
    </html>
  );
}

