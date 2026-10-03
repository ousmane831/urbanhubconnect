import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  if (pages <= 1) return null;
  const btn = "flex min-h-[44px] items-center gap-1 rounded-md border border-navy/25 px-4 font-semibold hover:bg-offwhite disabled:opacity-40";
  return (
    <nav aria-label="Pagination" className="mt-10 flex items-center justify-center gap-4">
      <button className={btn} disabled={page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft className="h-4 w-4" aria-hidden />Précédent</button>
      <span aria-live="polite">Page {page} sur {pages}</span>
      <button className={btn} disabled={page >= pages} onClick={() => onChange(page + 1)}>Suivant<ChevronRight className="h-4 w-4" aria-hidden /></button>
    </nav>
  );
}
