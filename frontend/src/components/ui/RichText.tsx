import { parseBlocks } from "../../utils/richtext";

/** Affiche un texte d'admin : paragraphes, listes et tableaux d'horaires. `lead` met le premier paragraphe en avant. */
export function RichText({ text, lead = false }: { text: string; lead?: boolean }) {
  return (
    <div className="space-y-4">
      {parseBlocks(text).map((b, i) => {
        if (b.type === "table") return (
          <div key={i} className="overflow-x-auto"><table className="w-full text-left"><tbody className="divide-y divide-navy/10 border-y border-navy/10">
            {b.rows.map(([a, c], j) => <tr key={j}><th scope="row" className="whitespace-nowrap py-3 pr-6 align-top font-semibold">{a}</th><td className="py-3">{c}</td></tr>)}
          </tbody></table></div>);
        if (b.type === "ul" || b.type === "ol") {
          const Tag = b.type;
          return <Tag key={i} className={`max-w-3xl space-y-2 pl-6 text-lg text-navy/85 ${b.type === "ul" ? "list-disc marker:text-green" : "list-decimal marker:font-bold marker:text-green"}`}>
            {b.items.map((it, j) => <li key={j}>{it}</li>)}</Tag>;
        }
        return <p key={i} className={`max-w-3xl whitespace-pre-line text-lg leading-relaxed ${lead && i === 0 ? "font-heading text-xl font-bold" : "text-navy/85"}`}>{b.text}</p>;
      })}
    </div>
  );
}
