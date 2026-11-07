import { Download, FileLock2, FileText } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { memberApi, type MemberDocumentItem } from "../../services/members";
import { fmtDate } from "../../utils/format";
import { Card, PanelHeader } from "./ui";

export function groupByCategory(docs: MemberDocumentItem[]): [string, MemberDocumentItem[]][] {
  const groups = new Map<string, MemberDocumentItem[]>();
  docs.forEach((d) => groups.set(d.category_label, [...(groups.get(d.category_label) ?? []), d]));
  return [...groups.entries()];
}

export function DocumentsPanel() {
  const state = useAsync(memberApi.documents);
  return (
    <div className="space-y-5">
      <PanelHeader icon={FileLock2} title="Documents réservés" intro="Comptes rendus, Urban Notes, résultats du Baromètre : téléchargeables uniquement par les membres à jour." />
      <Async state={state} empty="Aucun document n'est disponible pour le moment.">
        {(docs) => (
          <div className="space-y-6">
            {groupByCategory(docs).map(([category, items]) => (
              <section key={category} aria-label={category}>
                <h3 className="mb-3 font-heading text-lg font-bold">{category} <span className="font-normal text-navy/60">({items.length})</span></h3>
                <ul className="grid gap-3 md:grid-cols-2">
                  {items.map((d) => (
                    <Card as="li" key={d.id} className="flex flex-col">
                      <div className="flex items-start gap-3">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-700"><FileText className="h-5 w-5" aria-hidden /></span>
                        <div className="min-w-0">
                          <p className="font-semibold leading-snug">{d.title}</p>
                          <p className="text-sm text-navy/65">{fmtDate(d.published_on)} · PDF</p>
                        </div>
                      </div>
                      {d.description && <p className="mt-3 text-[15px] text-navy/80">{d.description}</p>}
                      <a href={d.download_url} className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy/20 font-semibold text-navy hover:border-navy/40 hover:bg-offwhite sm:mt-auto sm:self-start sm:px-4">
                        <Download className="h-4 w-4" aria-hidden />Télécharger<span className="sr-only"> {d.title} (PDF)</span>
                      </a>
                    </Card>))}
                </ul>
              </section>))}
          </div>)}
      </Async>
    </div>
  );
}
