"use client";

import { useCallback, useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";

interface ResourceState<T> {
  key: string | null;
  data: T | null;
  error: string | null;
}

/**
 * Loads an admin API resource on the client (never cached). `loading` is true
 * until the response for the current path arrives; `reload()` refetches.
 */
export function useAdminResource<T>(path: string | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<ResourceState<T>>({ key: null, data: null, error: null });
  const key = path ? `${path}#${version}` : null;

  useEffect(() => {
    if (!path || !key) return;
    const controller = new AbortController();
    api
      .get<T>(path, controller.signal)
      .then((data) => setState({ key, data, error: null }))
      .catch((error: unknown) => {
        if ((error as Error).name === "AbortError") return;
        setState((s) => ({ key, data: s.data, error: errorMessage(error) }));
      });
    return () => controller.abort();
  }, [path, key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const mutate = useCallback((updater: (data: T | null) => T | null) => setState((s) => ({ ...s, data: updater(s.data) })), []);

  return {
    data: state.data,
    error: state.key === key ? state.error : null,
    loading: !!key && state.key !== key,
    reload,
    mutate,
  };
}
