import { useCallback, useEffect, useState } from "react";
import { apiErrorMessage, isNotFound } from "../utils/errors";

interface AsyncState<T> { data?: T; error?: string; notFound?: boolean; loading: boolean }

export function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []): AsyncState<T> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<T>>({ loading: true });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: undefined, notFound: false }));
    fn().then((data) => !cancelled && setState({ data, loading: false }))
      .catch((e) => !cancelled && setState({ loading: false, error: apiErrorMessage(e), notFound: isNotFound(e) }));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
