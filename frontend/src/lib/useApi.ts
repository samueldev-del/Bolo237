"use client";

import { useCallback, useEffect, useRef, useState } from 'react';

type UseApiState<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
};

/**
 * Hook générique pour appeler l'API avec fallback sur des données mock.
 * Si le backend est injoignable, `fallback` est retourné à la place.
 * Annule proprement les setState après démontage / changement de deps.
 */
export function useApi<T>(
  fetcher: (signal?: AbortSignal) => Promise<T>,
  fallback: T,
  deps: unknown[] = [],
  options: { initialData?: T | null } = {}
): UseApiState<T> & { refetch: () => void } {
  const initialData = options.initialData ?? null;
  const [state, setState] = useState<UseApiState<T>>({
    data: initialData,
    loading: initialData === null,
    error: null,
  });

  const mountedRef = useRef(true);
  const controllerRef = useRef<AbortController | null>(null);
  const skipFirstLoadRef = useRef(initialData !== null);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  const load = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;

    if (mountedRef.current) {
      setState((prev) => ({ ...prev, loading: true, error: null }));
    }
    try {
      const data = await fetcher(controller.signal);
      if (controller.signal.aborted || !mountedRef.current) return;
      setState({ data, loading: false, error: null });
    } catch (err) {
      if (controller.signal.aborted || !mountedRef.current) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      setState({ data: fallback, loading: false, error: message });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    if (skipFirstLoadRef.current) {
      skipFirstLoadRef.current = false;
      return;
    }
    load();
  }, [load]);

  return { ...state, refetch: load };
}
