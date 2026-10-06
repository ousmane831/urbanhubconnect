import { useId, useState, type ReactNode } from "react";

/** Bouton qui déplie un formulaire sous le texte (accessible : aria-expanded / aria-controls). */
export function Reveal({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] items-center rounded-md bg-green px-5 font-semibold text-white hover:bg-green-2">{label}</button>
      {open && <div id={id} className="mt-6 max-w-3xl rounded-md border border-navy/15 bg-white p-6 shadow-soft">{children}</div>}
    </div>
  );
}
