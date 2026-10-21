export type Block =
  | { type: "p"; text: string }
  | { type: "table"; rows: [string, string][] }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

/** Paragraphes séparés par une ligne vide. Un bloc dont toutes les lignes sont « - texte » devient une liste à puces,
 *  « 1. texte » une liste numérotée, « gauche | droite » un tableau. */
export function parseBlocks(text: string): Block[] {
  return text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b): Block => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => /^[-–•]\s+/.test(l))) return { type: "ul", items: lines.map((l) => l.replace(/^[-–•]\s+/, "")) };
    if (lines.every((l) => /^\d+\.\s+/.test(l))) return { type: "ol", items: lines.map((l) => l.replace(/^\d+\.\s+/, "")) };
    if (lines.every((l) => l.includes(" | "))) {
      return { type: "table", rows: lines.map((l) => { const [a, ...rest] = l.split(" | "); return [a, rest.join(" | ")] as [string, string]; }) };
    }
    return { type: "p", text: lines.join("\n") };
  });
}
