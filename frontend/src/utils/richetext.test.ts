import { parseBlocks } from "./richtext";

describe("parseBlocks", () => {
  it("sépare les paragraphes", () => expect(parseBlocks("Un\n\nDeux")).toEqual([{ type: "p", text: "Un" }, { type: "p", text: "Deux" }]));
  it("transforme les lignes « heure | texte » en tableau", () =>
    expect(parseBlocks("18 h 30 | Accueil\n19 h 00 | Connect Minute")).toEqual([{ type: "table", rows: [["18 h 30", "Accueil"], ["19 h 00", "Connect Minute"]] }]));
  it("garde un paragraphe mixte comme texte", () => expect(parseBlocks("Titre\n18 h | Accueil")[0].type).toBe("p"));
  it("ignore les blocs vides", () => expect(parseBlocks("\n\n  \n\nTexte")).toHaveLength(1));
  it("reconnaît les listes à puces", () => expect(parseBlocks("- Un\n- Deux")).toEqual([{ type: "ul", items: ["Un", "Deux"] }]));
  it("reconnaît les listes numérotées", () => expect(parseBlocks("1. Un\n2. Deux")).toEqual([{ type: "ol", items: ["Un", "Deux"] }]));
});
