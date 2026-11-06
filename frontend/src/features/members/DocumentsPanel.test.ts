import { groupByCategory } from "./DocumentsPanel";

const doc = (id: number, category_label: string) => ({ id, title: `Doc ${id}`, category: "x", category_label, description: "", published_on: "2026-12-01", download_url: `/d/${id}` });

describe("groupByCategory", () => {
  it("regroupe les documents par catégorie en conservant l'ordre", () => {
    const groups = groupByCategory([doc(1, "Urban Notes"), doc(2, "Assemblée générale"), doc(3, "Urban Notes")]);
    expect(groups.map(([label, items]) => [label, items.map((d) => d.id)])).toEqual([["Urban Notes", [1, 3]], ["Assemblée générale", [2]]]);
  });
});
