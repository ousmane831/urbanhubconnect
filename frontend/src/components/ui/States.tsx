import { AlertCircle, SearchX } from "lucide-react";
import type { ReactNode } from "react";

export const Loading = ({ label = "Chargement…" }: { label?: string }) => (
  <div role="status" className="flex items-center justify-center gap-3 py-16 text-navy/60">
    <span className="h-5 w-5 animate-spin rounded-full border-2 border-navy/15 border-t-green" aria-hidden />
    {label}
  </div>
);
export const EmptyState = ({ message, action }: { message: string; action?: ReactNode }) => (
  <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-navy/20 bg-offwhite/60 px-6 py-14 text-center">
    <span className="icon-tile bg-navy/5 text-navy/50"><SearchX className="h-5 w-5" aria-hidden /></span>
    <p className="max-w-md text-lg text-navy/80">{message}</p>
    {action}
  </div>
);
export const ErrorState = ({ message, onRetry }: { message: string; onRetry?: () => void }) => (
  <div role="alert" className="flex flex-col items-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-10 text-center text-red-900">
    <AlertCircle className="h-8 w-8" aria-hidden />
    <p className="max-w-md">{message}</p>
    {onRetry && <button onClick={onRetry} className="min-h-[44px] rounded-lg border border-red-300 bg-white px-4 font-semibold hover:bg-red-100">Réessayer</button>}
  </div>
);
