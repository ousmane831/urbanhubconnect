import { useState } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type ActionDef, type ContentItem, type Me } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";
import { ActionButtons } from "./ui";

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
  const group = (title: string, kind: string, items: ContentItem[]) => (
    <section className="mb-10"><h2 className="mb-4 text-xl">{title}</h2>
      {!items.length ? <p className="text-navy/70">Aucun élément.</p> : (
        <ul className="space-y-3">{items.map((it) => (
          <li key={it.id} className="rounded-md border border-navy/15 bg-white p-4 shadow-soft">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-lg font-semibold">{it.title}</p>
              <span className={`rounded px-2 py-0.5 text-sm font-semibold ${it.state === "Publié" ? "bg-green/10 text-green" : "bg-offwhite"}`}>{it.state}</span>
            </div>
            <ActionButtons actions={it.actions} busy={busy} onAct={(a) => act(kind, it, a)} />
            {me.role === "ADMIN" && <a className="link mt-3 inline-block text-sm" href={it.admin_url}>Modifier dans l'administration</a>}
          </li>))}</ul>)}
    </section>);
  return (
    <div>
      <p role="status" aria-live="polite" className={`mb-4 min-h-[1.5rem] font-semibold ${notice?.ok ? "text-green" : "text-red-800"}`}>{notice?.text}</p>
      <Async state={state}>{(d) => <>{group("Actualités", "articles", d.articles)}{group("Événements", "events", d.events)}</>}</Async>
    </div>
  );
}
