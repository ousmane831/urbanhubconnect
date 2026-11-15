import { CalendarDays, ExternalLink, Newspaper, type LucideIcon } from "lucide-react";
import { useState } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type ActionDef, type ContentItem, type Me } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";
import { ActionButtons, Notice, PageHeader, Panel, Pill } from "./ui";

export function ContentPanel({ me, onChanged }: { me: Me; onChanged: () => void }) {
  const [version, setVersion] = useState(0);
  const state = useAsync(coordApi.content, [version]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  const act = async (kind: string, item: ContentItem, a: ActionDef) => {
    setBusy(true); setNotice(null);
    try { setNotice({ ok: true, text: await coordApi.contentAct(kind, item.id, a.id) }); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(false); setVersion((v) => v + 1); onChanged(); }
  };
  const group = (title: string, icon: LucideIcon, kind: string, items: ContentItem[]) => (
    <Panel title={title} icon={icon}>
      {!items.length ? <p className="text-navy/60">Aucun élément.</p> : (
        <ul className="divide-y divide-navy/10">{items.map((it) => (
          <li key={it.id} className="py-4 first:pt-0 last:pb-0">
            <div className="flex items-start justify-between gap-3">
              <p className="min-w-0 break-words font-semibold leading-snug">{it.title}</p>
              <Pill tone={it.state === "Publié" ? "green" : "grey"}>{it.state}</Pill>
            </div>
            <ActionButtons actions={it.actions} busy={busy} onAct={(a) => act(kind, it, a)} />
            {me.role === "ADMIN" && (
              <a className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-green hover:underline" href={it.admin_url}>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />Modifier dans l'administration</a>)}
          </li>))}</ul>)}
    </Panel>);
  return (
    <div>
      <PageHeader title="Publications" description="Publiez ou masquez les actualités et les événements du site." />
      <Notice notice={notice} onClose={() => setNotice(null)} />
      <Async state={state}>{(d) => (
        <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
          {group("Actualités", Newspaper, "articles", d.articles)}
          {group("Événements", CalendarDays, "events", d.events)}
        </div>)}
      </Async>
    </div>
  );
}
