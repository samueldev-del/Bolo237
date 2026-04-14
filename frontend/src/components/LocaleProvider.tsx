"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
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

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.locale = locale;

    try {
      localStorage.setItem('NEXT_LOCALE', locale);
    } catch {}
  }, [locale]);

  const setLocale = useCallback((nextLocale: Locale) => {
    const basePath = stripLocalePrefix(pathname || '/');
    const nextPath = withLocale(basePath, nextLocale);

    try {
      localStorage.setItem('NEXT_LOCALE', nextLocale);
    } catch {}

    router.push(nextPath);
  }, [pathname, router]);

  const localizePath = useCallback((path: string) => {
    return withLocale(path, locale || DEFAULT_LOCALE);
  }, [locale]);

  const value = useMemo<LocaleContextValue>(() => ({
    locale,
    setLocale,
    t: dictionary[locale],
    localizePath,
  }), [locale, setLocale, localizePath]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return ctx;
}
