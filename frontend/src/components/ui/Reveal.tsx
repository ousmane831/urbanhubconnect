import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

const TONES = {
  green: "bg-green text-white hover:bg-green-2",
  light: "bg-white text-navy hover:bg-offwhite",
};

/** Bouton qui déplie un formulaire sous le texte (accessible : aria-expanded / aria-controls).
 *  `tone="light"` pour un fond sombre ; `block` : bouton pleine largeur sur mobile. */
export function Reveal({ label, children, tone = "green", block = false }: { label: string; children: ReactNode; tone?: keyof typeof TONES; block?: boolean }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen((o) => !o)}
        className={`inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg px-5 font-semibold transition-colors ${TONES[tone]} ${block ? "w-full sm:w-auto" : ""}`}>
        {label}<ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>
      {open && <div id={id} className="mt-6 max-w-3xl rounded-xl border border-navy/15 bg-white p-4 text-navy shadow-soft sm:p-6">{children}</div>}
    </div>
  );
}
