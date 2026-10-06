export type Block = { type: "p"; text: string } | { type: "table"; rows: [string, string][] };

/** Paragraphes séparés par une ligne vide ; un bloc dont toutes les lignes sont « gauche | droite » devient un tableau. */
export function parseBlocks(text: string): Block[] {
  return text.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean).map((b): Block => {
    const lines = b.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.every((l) => l.includes(" | "))) {
      return { type: "table", rows: lines.map((l) => { const [a, ...rest] = l.split(" | "); return [a, rest.join(" | ")] as [string, string]; }) };
    }
    return { type: "p", text: lines.join("\n") };
  });
}
