"use client";

import { createContext, useContext, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { DEFAULT_LOCALE, dictionary, getLocaleFromPath, Locale, stripLocalePrefix, withLocale } from '@/lib/i18n';

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (typeof dictionary)[Locale];
  localizePath: (path: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const locale = useMemo<Locale>(() => getLocaleFromPath(pathname || '/'), [pathname]);

  const setLocale = (nextLocale: Locale) => {
    const basePath = stripLocalePrefix(pathname || '/');
    const nextPath = withLocale(basePath, nextLocale);
    document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000`;
    localStorage.setItem('NEXT_LOCALE', nextLocale);
    router.push(nextPath);
  };

  const localizePath = (path: string) => {
    const currentLocale = locale || DEFAULT_LOCALE;
    return withLocale(path, currentLocale);
  };

  const value: LocaleContextValue = {
    locale,
    setLocale,
    t: dictionary[locale],
    localizePath,
  };

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
