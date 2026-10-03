import { AlertCircle, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export const Loading = ({ label = "Chargement…" }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-3 py-16 text-navy/70">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy/20 border-t-green" aria-hidden />
    {label}
  </div>
);
export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-navy/25 px-6 py-14 text-center">
    <SearchX className="h-8 w-8 text-navy/50" aria-hidden />
    <p className="max-w-md text-lg">{message}</p>
    {action}
  </div>
);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-4 rounded-lg border border-red-300 bg-red-50 px-6 py-10 text-center text-red-900">
    <AlertCircle className="h-8 w-8" aria-hidden />
    <p className="max-w-md">{message}</p>
    {onRetry && <button onClick={onRetry} className="rounded-md border border-red-400 px-4 py-2 font-semibold hover:bg-red-100">Réessayer</button>}
  </div>
);
