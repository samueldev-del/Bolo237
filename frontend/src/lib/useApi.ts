"use client";

import { useCallback, useEffect, useState } from 'react';

type UseApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook générique pour appeler l'API avec fallback sur des données mock.
 * Si le backend est injoignable, `fallback` est retourné à la place.
 */
export function useApi<T>(
  fetcher: () => Promise<T>,
  fallback: T,
  deps: unknown[] = []
): UseApiState<T> & { refetch: () => void } {
  const [state, setState] = useState<UseApiState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      console.warn('[useApi] Fallback activé:', message);
      setState({ data: fallback, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}
