import { parseBlocks } from "../../utils/richtext";

/** Affiche un texte d'admin : paragraphes et tableaux d'horaires. `lead` met le premier paragraphe en avant. */
export function RichText({ text, lead = false }: { text: string; lead?: boolean }) {
  return (
    <div className="space-y-4">
      {parseBlocks(text).map((b, i) => b.type === "table" ? (
        <div key={i} className="overflow-x-auto"><table className="w-full text-left"><tbody className="divide-y divide-navy/10 border-y border-navy/10">
          {b.rows.map(([a, c], j) => <tr key={j}><th scope="row" className="whitespace-nowrap py-3 pr-6 align-top font-semibold">{a}</th><td className="py-3">{c}</td></tr>)}
        </tbody></table></div>
      ) : (
        <p key={i} className={`max-w-3xl whitespace-pre-line text-lg leading-relaxed ${lead && i === 0 ? "font-heading text-xl font-bold" : "text-navy/85"}`}>{b.text}</p>
      ))}
    </div>
  );
}
