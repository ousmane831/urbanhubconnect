import { CircleAlert, CircleCheck } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Amène un message à l'écran dès qu'il apparaît (ou change) : défilement doux jusqu'au centre de l'écran, puis focus
 *  pour les lecteurs d'écran. Sans animation si l'utilisateur a demandé à réduire les mouvements. */
export function useReveal<T extends HTMLElement>(trigger: unknown) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!trigger || !el) return;
    const reduce = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.focus({ preventScroll: true });
  }, [trigger]);
  return ref;
}

/** Confirmation après l'envoi d'un formulaire : toujours visible, même si la personne était en bas de la page. */
export function SuccessMessage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>(children);
  return (
    <div ref={ref} tabIndex={-1} role="status"
      className={`flex scroll-mt-24 items-start gap-3 rounded-xl border border-green/40 bg-green/5 p-5 text-lg outline-none ${className}`}>
      <CircleCheck className="mt-0.5 h-6 w-6 shrink-0 text-green" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/** Erreur générale d'un formulaire (les erreurs de champ restent sous chaque champ). */
export function ErrorMessage({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useReveal<HTMLDivElement>(children);
  return (
    <div ref={ref} tabIndex={-1} role="alert"
      className={`flex scroll-mt-24 items-start gap-3 rounded-lg border border-red-300 bg-red-50 p-4 font-semibold text-red-900 outline-none ${className}`}>
      <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" aria-hidden />
      <div className="min-w-0">{children}</div>
    </div>
  );
}
