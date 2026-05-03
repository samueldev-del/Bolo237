/**
 * Generic event tracking utility for Bolo237.
 *
 * Resolution order (first provider found wins):
 *   1. Vercel Analytics  — window.va()
 *   2. Google Analytics  — window.gtag()
 *   3. Plausible         — window.plausible()
 *   4. Dev fallback      — console.log (development only, silent in production)
 *
 * This function is a no-op when called server-side (SSR / RSC context).
 */

type AnalyticsProps = Record<string, string | number | boolean>;

declare global {
  interface Window {
    /** Vercel Analytics — injected by @vercel/analytics */
    va?: (event: 'event', name: string, props?: AnalyticsProps) => void;
    /** Google Analytics 4 — gtag.js */
    gtag?: (command: 'event', name: string, params?: Record<string, unknown>) => void;
    /** Plausible Analytics */
    plausible?: (event: string, options?: { props?: AnalyticsProps }) => void;
  }
}

export function trackEvent(eventName: string, props?: AnalyticsProps): void {
  if (typeof window === 'undefined') return;

  // 1. Vercel Analytics (injected by @vercel/analytics package)
  if (typeof window.va === 'function') {
    window.va('event', eventName, props);
    return;
  }

  // 2. Google Analytics 4 — gtag
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, props ?? {});
    return;
  }

  // 3. Plausible
  if (typeof window.plausible === 'function') {
    window.plausible(eventName, { props });
    return;
  }

  // 4. Dev fallback — structured log, silent in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', eventName, props ?? {});
  }
}
