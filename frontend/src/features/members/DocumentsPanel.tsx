import { Download } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { memberApi, type MemberDocumentItem } from "../../services/members";
import { fmtDate } from "../../utils/format";

export function groupByCategory(docs: MemberDocumentItem[]): [string, MemberDocumentItem[]][] {
  const groups = new Map<string, MemberDocumentItem[]>();
  docs.forEach((d) => groups.set(d.category_label, [...(groups.get(d.category_label) ?? []), d]));
  return [...groups.entries()];
}

export function DocumentsPanel() {
  const state = useAsync(memberApi.documents);
  return (
    <div className="space-y-8">
      <h2 className="text-2xl">Documents réservés</h2>
      <Async state={state} empty="Aucun document n'est disponible pour le moment.">
        {(docs) => groupByCategory(docs).map(([category, items]) => (
          <section key={category} aria-label={category}>
            <h3 className="mb-3 text-xl">{category}</h3>
            <ul className="divide-y divide-navy/10 border-y border-navy/10">
              {items.map((d) => (
                <li key={d.id} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
                  <div><p className="text-lg font-semibold">{d.title}</p><p className="text-sm text-navy/65">{fmtDate(d.published_on)}</p>
                    {d.description && <p className="mt-1 max-w-2xl text-navy/80">{d.description}</p>}</div>
                  <a href={d.download_url} className="link inline-flex items-center gap-2 font-semibold"><Download className="h-4 w-4" aria-hidden />Télécharger<span className="sr-only"> {d.title} (PDF)</span></a>
                </li>))}
            </ul>
          </section>))}
      </Async>
    </div>
  );
}
