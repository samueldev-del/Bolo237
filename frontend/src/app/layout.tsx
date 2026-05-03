import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { headers } from "next/headers";
import "./globals.css";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import { LocaleProvider } from "@/components/LocaleProvider";
import AppFeedbackWidget from "@/components/AppFeedbackWidget";
import { buildLocalizedMetadata, SITE_URL } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"] });

const homeMetadata = buildLocalizedMetadata('/');
const localeBootstrapScript = `
  (function () {
    var locale = window.location.pathname.startsWith('/en') ? 'en' : 'fr';
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;

    try {
      localStorage.setItem('NEXT_LOCALE', locale);
    } catch {}
  })();
`;

const hydrationAttributeSanitizerScript = `
  (function () {
    var attrName = 'fdprocessedid';

    function stripAttribute(root) {
      var scope = root && root.querySelectorAll ? root : document;
      if (!scope || !scope.querySelectorAll) return;

      scope.querySelectorAll('[' + attrName + ']').forEach(function (node) {
        node.removeAttribute(attrName);
      });
    }

    stripAttribute(document);

    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        if (mutation.type === 'attributes' && mutation.target && mutation.target.removeAttribute) {
          mutation.target.removeAttribute(attrName);
        }

        mutation.addedNodes.forEach(function (node) {
          if (node.nodeType !== 1) return;
          if (node.hasAttribute && node.hasAttribute(attrName)) {
            node.removeAttribute(attrName);
          }
          stripAttribute(node);
        });
      });
    });

    observer.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: [attrName],
    });

    window.addEventListener('load', function () {
      window.setTimeout(function () {
        observer.disconnect();
        stripAttribute(document);
      }, 3000);
    }, { once: true });
  })();
`;

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
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  const nonce = (await headers()).get('x-nonce') || undefined;

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
    alternateName: "Bolo237 - Emplois et Services au Cameroun",
    url: "https://www.bolo237.com",
    logo: {
      "@type": "ImageObject",
      url: "https://www.bolo237.com/icons/icon-512.png",
      width: 512,
      height: 512,
    },
    image: "https://www.bolo237.com/icons/icon-512.png",
    description: "Plateforme de mise en relation entre demandeurs d'emploi, employeurs et artisans au Cameroun.",
    foundingDate: "2024",
    founder: {
      "@type": "Person",
      name: "Samuel DJOMMOU THENGHO",
    },
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+49-151-24862693",
      contactType: "customer service",
      availableLanguage: ["French", "English"],
      email: "contact@bolo237.com",
    },
    sameAs: [
      "https://linkedin.com/company/bolo237",
      "https://facebook.com/bolo237",
      "https://instagram.com/bolo237",
      "https://tiktok.com/@bolo237",
    ],
    areaServed: {
      "@type": "Country",
      name: "Cameroon",
    },
  };

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <script
          id="hydration-attribute-sanitizer"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: hydrationAttributeSanitizerScript }}
        />
        <script
          id="locale-bootstrap"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: localeBootstrapScript }}
        />
        <script
          id="schema-website"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          id="schema-organization"
          type="application/ld+json"
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="sw-register"
          strategy="afterInteractive"
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(registration) {
                    registration.update();
                  }).catch(function() {});
                });
              }
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} flex flex-col min-h-screen bg-[#f4f6f8] text-black`}
        style={{
          paddingTop: 'max(env(safe-area-inset-top), 0px)',
          paddingBottom: 'max(env(safe-area-inset-bottom), 0px)',
          paddingLeft: 'max(env(safe-area-inset-left), 0px)',
          paddingRight: 'max(env(safe-area-inset-right), 0px)',
        }}
      >
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

