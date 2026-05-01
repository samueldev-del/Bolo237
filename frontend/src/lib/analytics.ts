/* eslint-disable @typescript-eslint/no-explicit-any */
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
export function trackEvent(eventName: string, props?: Record<string, any>): void {
  if (typeof window === 'undefined') return;

  // 1. Vercel Analytics (injected by @vercel/analytics package)
  if (typeof (window as any).va === 'function') {
    (window as any).va('event', eventName, props);
    return;
  }

  // 2. Google Analytics 4 — gtag
  if (typeof (window as any).gtag === 'function') {
    (window as any).gtag('event', eventName, props ?? {});
    return;
  }

  // 3. Plausible
  if (typeof (window as any).plausible === 'function') {
    (window as any).plausible(eventName, { props });
    return;
  }

  // 4. Dev fallback — structured log, silent in production
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Analytics]', eventName, props ?? {});
  }
}
