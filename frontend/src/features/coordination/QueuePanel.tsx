import { useState } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type ActionDef, type QueueItem } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { ActionButtons, ActionForm, confirmAction } from "./ui";

export function QueuePanel({ kinds, kind, onKind, version, onChanged }: {
  kinds: { kind: string; label: string; count: number }[]; kind: string; onKind: (k: string) => void; version: number; onChanged: () => void;
}) {
  const state = useAsync(() => coordApi.queue(kind), [kind, version]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<{ id: number; action: ActionDef } | null>(null);

  const run = async (item: QueueItem, a: ActionDef, data?: Record<string, string>) => {
    setBusy(true); setNotice(null);
    try { setNotice({ ok: true, text: await coordApi.act(kind, item.id, a.id, data) }); setOpen(null); }
    catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }  // le formulaire reste ouvert pour corriger
    finally { setBusy(false); onChanged(); }
  };
  const choose = (item: QueueItem, a: ActionDef) => {
    if (a.form) { setNotice(null); setOpen({ id: item.id, action: a }); return; }
    if (confirmAction(a)) run(item, a);
  };
  return (
    <div>
      <div className="mb-6 flex flex-wrap gap-2" role="group" aria-label="Type de demandes">
        {kinds.map((k) => (
          <button key={k.kind} aria-pressed={k.kind === kind} onClick={() => { setNotice(null); setOpen(null); onKind(k.kind); }}
            className={`min-h-[44px] rounded-full border px-4 font-semibold ${k.kind === kind ? "border-navy bg-navy text-white" : "border-navy/25 hover:bg-offwhite"}`}>
            {k.label} <span className="ml-1 rounded-full bg-gold px-2 text-sm text-navy">{k.count}</span></button>))}
      </div>
      <p role="status" aria-live="polite" className={`mb-4 min-h-[1.5rem] font-semibold ${notice?.ok ? "text-green" : "text-red-800"}`}>{notice?.text}</p>
      <Async state={state} isEmpty={(d) => !d.items.length} empty="Rien à traiter ici pour le moment.">
        {(d) => (
          <ul className="space-y-5">
            {d.items.map((it) => (
              <li key={it.id} className="rounded-md border border-navy/15 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl">{it.title}</h3>
                  <span className="text-sm text-navy/65">reçu le {fmtDate(it.created_at)}</span>
                </div>
                <p className="mt-1 text-navy/80">{it.subtitle}{it.state && <span className="ml-2 rounded bg-offwhite px-2 py-0.5 text-sm font-semibold">{it.state}</span>}</p>
                <dl className="mt-4 grid gap-x-8 gap-y-2 sm:grid-cols-2">
                  {it.details.map(([k, v]) => <div key={k}><dt className="text-sm text-navy/65">{k}</dt><dd className="whitespace-pre-line break-words">{v}</dd></div>)}
                </dl>
                <ActionButtons actions={it.actions} busy={busy} onAct={(a) => choose(it, a)} />
                {open?.id === it.id && <ActionForm key={open.action.id} action={open.action} busy={busy} onSubmit={(data) => run(it, open.action, data)} onCancel={() => setOpen(null)} />}
              </li>))}
          </ul>)}
      </Async>
    </div>
  );
}
