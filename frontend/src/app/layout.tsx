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

