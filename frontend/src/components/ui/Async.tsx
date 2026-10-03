import type { ReactNode } from "react";
import { EmptyState, ErrorState, Loading } from "./States";

interface Props<T> { state: { data?: T; error?: string; loading: boolean; retry: () => void }; empty?: string; isEmpty?: (d: T) => boolean; children: (d: T) => ReactNode }

/** Rend les trois états (chargement, erreur, vide) de façon uniforme, puis les données. */
export function Async<T>({ state, empty, isEmpty, children }: Props<T>) {
  if (state.loading) return <Loading />;
  if (state.error || state.data === undefined) return <ErrorState message={state.error ?? "Données indisponibles."} onRetry={state.retry} />;
  if (empty && (isEmpty ? isEmpty(state.data) : Array.isArray(state.data) && !state.data.length)) return <EmptyState message={empty} />;
  return <>{children(state.data)}</>;
}
