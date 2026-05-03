"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { useLocale } from '@/components/LocaleProvider';

type CookieConsent = {
  essential: true;
  functional: boolean;
  analytics: boolean;
  version: string;
  updatedAt: string;
};

const COOKIE_CONSENT_STORAGE_KEY = 'bolo237-cookie-consent';
const COOKIE_CONSENT_COOKIE_NAME = 'cookieConsent';
const COOKIE_CONSENT_VERSION = '2026-04';
const COOKIE_CONSENT_MAX_AGE_SECONDS = 60 * 60 * 24 * 395;
const COOKIE_SETTINGS_EVENT = 'bolo237:open-cookie-settings';
// Simple dismissal key — version-agnostic. Written whenever the user makes
// any choice (accept / reject / save). Prevents the banner from reappearing
// after a consent-version bump while preserving detailed per-category consent.
const COOKIE_DISMISSED_KEY = 'bolo237_cookie_consent';

function parseStoredConsent(raw: string | null): CookieConsent | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== COOKIE_CONSENT_VERSION || !parsed.updatedAt) {
      return null;
    }

    return {
      essential: true,
      functional: Boolean(parsed.functional),
      analytics: Boolean(parsed.analytics),
      version: COOKIE_CONSENT_VERSION,
      updatedAt: parsed.updatedAt,
    };
  } catch {
    return null;
  }
}

function readConsentFromCookie() {
  if (typeof document === 'undefined') {
    return null;
  }

  const cookieValue = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${COOKIE_CONSENT_COOKIE_NAME}=`))
    ?.split('=')
    .slice(1)
    .join('=');

  if (!cookieValue) {
    return null;
  }

  return parseStoredConsent(decodeURIComponent(cookieValue));
}

function isConsentFresh(consent: CookieConsent | null) {
  if (!consent) {
    return false;
  }

  const updatedAtMs = Date.parse(consent.updatedAt);
  if (Number.isNaN(updatedAtMs)) {
    return false;
  }

  return Date.now() - updatedAtMs < COOKIE_CONSENT_MAX_AGE_SECONDS * 1000;
}

function persistConsent(consent: CookieConsent) {
  if (typeof window === 'undefined') {
    return;
  }

  const serialized = JSON.stringify(consent);
  window.localStorage.setItem(COOKIE_CONSENT_STORAGE_KEY, serialized);
  document.cookie = `${COOKIE_CONSENT_COOKIE_NAME}=${encodeURIComponent(serialized)}; path=/; max-age=${COOKIE_CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

export default function CookieConsentBanner() {
  const { locale } = useLocale();
  const isEn = locale === 'en';
  const isMounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false,
  );
  const [bannerOverride, setBannerOverride] = useState<boolean | null>(null);
  // Persisted dismissal: true once the user has ever made a cookie choice.
  // Read lazily to avoid calling setState inside an effect.
  const [bannerDismissed, setBannerDismissed] = useState(() => {
    if (typeof window === 'undefined') {
      return false;
    }

    return Boolean(localStorage.getItem(COOKIE_DISMISSED_KEY));
  });
  const [showSettings, setShowSettings] = useState(false);
  const [functionalEnabled, setFunctionalEnabled] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  const activeConsent = isMounted
    ? (() => {
        const stored = parseStoredConsent(window.localStorage.getItem(COOKIE_CONSENT_STORAGE_KEY)) || readConsentFromCookie();
        return isConsentFresh(stored) ? stored : null;
      })()
    : null;

  // showBanner:
  // - bannerOverride = true  → always show (user opened settings manually)
  // - bannerOverride = false → always hide (just after saving choices)
  // - bannerOverride = null  → show only if user never dismissed + no fresh consent
  const showBanner = bannerOverride ?? (!bannerDismissed && !activeConsent);

  const openSettings = () => {
    setFunctionalEnabled(activeConsent?.functional ?? false);
    setAnalyticsEnabled(activeConsent?.analytics ?? false);
    setBannerOverride(true);
    setShowSettings(true);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const handleOpenSettings = () => {
      setFunctionalEnabled(activeConsent?.functional ?? false);
      setAnalyticsEnabled(activeConsent?.analytics ?? false);
      setBannerOverride(true);
      setShowSettings(true);
    };

    window.addEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
    return () => {
      window.removeEventListener(COOKIE_SETTINGS_EVENT, handleOpenSettings);
    };
  }, [activeConsent]);

  const copy = useMemo(() => ({
    title: isEn ? 'Cookie settings' : 'Paramètres cookies',
    description: isEn
      ? 'Bolo237 uses essential cookies for language, login, and security. Optional cookies remain disabled until you choose otherwise.'
      : 'Bolo237 utilise des cookies essentiels pour la langue, la connexion et la sécurité. Les cookies optionnels restent désactivés tant que vous ne les avez pas acceptés.',
    essentialTitle: isEn ? 'Essential cookies' : 'Cookies essentiels',
    essentialDescription: isEn
      ? 'Required for authentication, fraud protection, and core navigation.'
      : 'Nécessaires à l’authentification, à la protection anti-fraude et à la navigation principale.',
    functionalTitle: isEn ? 'Functional cookies' : 'Cookies fonctionnels',
    functionalDescription: isEn
      ? 'Used to remember optional interface preferences when these features are enabled.'
      : 'Utilisés pour mémoriser certaines préférences d’interface lorsque ces fonctions sont activées.',
    analyticsTitle: isEn ? 'Performance cookies' : 'Cookies de performance',
    analyticsDescription: isEn
      ? 'Used only if anonymous measurement tools are activated later.'
      : 'Utilisés uniquement si des outils de mesure anonymes sont activés ultérieurement.',
    reject: isEn ? 'Reject optional cookies' : 'Refuser les cookies optionnels',
    accept: isEn ? 'Accept all' : 'Tout accepter',
    customize: isEn ? 'Customize' : 'Personnaliser',
    save: isEn ? 'Save choices' : 'Enregistrer mes choix',
    manage: isEn ? 'Cookies' : 'Cookies',
    legal: isEn ? 'See the Cookie Policy' : 'Voir la Politique de Cookies',
    alwaysOn: isEn ? 'Always active' : 'Toujours actifs',
  }), [isEn]);

  const saveConsent = (functional: boolean, analytics: boolean) => {
    const consent: CookieConsent = {
      essential: true,
      functional,
      analytics,
      version: COOKIE_CONSENT_VERSION,
      updatedAt: new Date().toISOString(),
    };

    persistConsent(consent);
    // Mark as dismissed with the simple key so future version bumps don't
    // re-show the banner for users who have already made a choice.
    if (typeof window !== 'undefined') {
      localStorage.setItem(COOKIE_DISMISSED_KEY, 'true');
    }
    setFunctionalEnabled(functional);
    setAnalyticsEnabled(analytics);
    setBannerDismissed(true);
    setBannerOverride(false);
    setShowSettings(false);
  };

  if (!isMounted) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={openSettings}
        className="fixed bottom-[5.5rem] left-4 md:bottom-6 z-[68] rounded-full border border-[#E8C4B0] bg-white px-4 py-2 text-xs font-extrabold text-[#8A442A] shadow-lg hover:bg-[#FFF5EF]"
      >
        {copy.manage}
      </button>

      {showBanner && (
        <div className="fixed inset-x-4 bottom-[5.5rem] md:bottom-6 z-[70] mx-auto max-w-3xl rounded-3xl border border-[#E8C4B0] bg-white p-5 shadow-2xl">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-extrabold text-[#8A442A]">{copy.title}</p>
              <p className="text-sm leading-relaxed text-gray-700">{copy.description}</p>
              <a href={isEn ? '/en/cookies' : '/fr/cookies'} className="text-sm font-bold text-[#C4623F] hover:underline">
                {copy.legal}
              </a>
            </div>

            {showSettings && (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-sm font-extrabold text-gray-900">{copy.essentialTitle}</p>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600">{copy.essentialDescription}</p>
                  <p className="mt-3 text-xs font-bold text-emerald-700">{copy.alwaysOn}</p>
                </div>

                <label className="rounded-2xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{copy.functionalTitle}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">{copy.functionalDescription}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={functionalEnabled}
                      onChange={(event) => setFunctionalEnabled(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#C4623F] focus:ring-[#C4623F]"
                    />
                  </div>
                </label>

                <label className="rounded-2xl border border-gray-200 bg-gray-50 p-4 cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-extrabold text-gray-900">{copy.analyticsTitle}</p>
                      <p className="mt-1 text-xs leading-relaxed text-gray-600">{copy.analyticsDescription}</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={analyticsEnabled}
                      onChange={(event) => setAnalyticsEnabled(event.target.checked)}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-[#C4623F] focus:ring-[#C4623F]"
                    />
                  </div>
                </label>
              </div>
            )}

            <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
              <button
                type="button"
                onClick={() => saveConsent(false, false)}
                className="rounded-full border border-gray-300 px-4 py-2 text-sm font-extrabold text-gray-800 hover:bg-gray-50"
              >
                {copy.reject}
              </button>
              <button
                type="button"
                onClick={() => saveConsent(true, true)}
                className="rounded-full bg-[#C4623F] px-4 py-2 text-sm font-extrabold text-white hover:bg-[#A8502F]"
              >
                {copy.accept}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (showSettings) {
                    saveConsent(functionalEnabled, analyticsEnabled);
                  } else {
                    openSettings();
                  }
                }}
                className="rounded-full border border-[#E8C4B0] bg-[#FFF5EF] px-4 py-2 text-sm font-extrabold text-[#8A442A] hover:bg-[#FEEBD6]"
              >
                {showSettings ? copy.save : copy.customize}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}