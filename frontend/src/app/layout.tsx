import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { LocaleProvider } from "@/components/LocaleProvider";
import { cookies } from "next/headers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://237jobs.com"),
  title: "237jobs - Emplois et Services au Cameroun",
  description: "Trouvez l'opportunité idéale ou proposez vos services partout au Cameroun.",
  manifest: "/manifest.json",
  themeColor: "#16a34a",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "237jobs",
  },
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
    apple: "/icons/icon-192.png",
  },
  alternates: {
    canonical: "/fr",
    languages: {
      fr: "/fr",
      en: "/en",
      "x-default": "/fr",
    },
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode; }>) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("NEXT_LOCALE")?.value;
  const lang = localeCookie === "en" ? "en" : "fr";

  return (
    <html lang={lang}>
      <head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
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
        </LocaleProvider>
      </body>
    </html>
  );
}

