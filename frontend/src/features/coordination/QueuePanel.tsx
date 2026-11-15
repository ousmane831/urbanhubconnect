import { CalendarClock, Search, X } from "lucide-react";
import { useState } from "react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type ActionDef, type QueueItem } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { ActionButtons, ActionForm, confirmAction, kindIcon, Notice, PageHeader, Pill } from "./ui";

type Kind = { kind: string; label: string; count: number };

/** Liste des types de demandes : colonne à gauche sur ordinateur, menu déroulant sur téléphone. */
function KindPicker({ kinds, kind, onKind }: { kinds: Kind[]; kind: string; onKind: (k: string) => void }) {
  return (
    <>
      <div className="lg:hidden">
        <label htmlFor="queue-kind" className="mb-1.5 block text-sm font-semibold text-navy/70">Type de demandes</label>
        <select id="queue-kind" className="field" value={kind} onChange={(e) => onKind(e.target.value)}>
          {kinds.map((k) => <option key={k.kind} value={k.kind}>{k.label}{k.count ? ` (${k.count})` : ""}</option>)}
        </select>
      </div>
      <nav aria-label="Type de demandes" className="hidden lg:block">
        <ul className="space-y-1 rounded-2xl border border-navy/10 bg-white p-2 shadow-soft">
          {kinds.map((k) => {
            const Icon = kindIcon(k.kind), active = k.kind === kind;
            return (
              <li key={k.kind}>
                <button onClick={() => onKind(k.kind)} aria-pressed={active}
                  className={`flex min-h-[42px] w-full items-center gap-2.5 rounded-lg px-3 text-left text-sm transition-colors ${active ? "bg-navy font-semibold text-white" : "hover:bg-offwhite"}`}>
                  <Icon className={`h-4 w-4 shrink-0 ${active ? "text-gold-light" : "text-navy/50"}`} aria-hidden />
                  <span className="min-w-0 flex-1 leading-snug">{k.label}</span>
                  {k.count > 0 && <span className={`rounded-full px-2 text-xs font-bold leading-5 ${active ? "bg-gold text-navy" : "bg-gold/20 text-navy"}`}>{k.count}</span>}
                </button>
              </li>);
          })}
        </ul>
      </nav>
    </>
  );
}

export function QueuePanel({ kinds, kind, onKind, version, onChanged }: {
  kinds: Kind[]; kind: string; onKind: (k: string) => void; version: number; onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [open, setOpen] = useState<{ id: number; action: ActionDef } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [search, setSearch] = useState("");
  const state = useAsync(() => coordApi.queue(kind, kind === "members" ? search : undefined), [kind, version, search]);
  const current = kinds.find((k) => k.kind === kind);
  const CurrentIcon = kindIcon(kind);

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
  const pick = (k: string) => { setNotice(null); setOpen(null); setSearchText(""); setSearch(""); onKind(k); };

  return (
    <div>
      <PageHeader title="À traiter" description="Demandes reçues par le site, de la plus ancienne à la plus récente." />
      <div className="grid gap-6 lg:grid-cols-[17rem_1fr] lg:items-start">
        <div className="lg:sticky lg:top-6"><KindPicker kinds={kinds} kind={kind} onKind={pick} /></div>

        <div className="min-w-0">
          <h2 className="mb-4 flex items-center gap-2 text-xl">
            <CurrentIcon className="h-5 w-5 text-green" aria-hidden />{current?.label}
            {!!current?.count && <Pill tone="gold">{current.count}</Pill>}
          </h2>
          <Notice notice={notice} onClose={() => setNotice(null)} />

          {kind === "members" && (
            <form className="mb-5 flex gap-2" onSubmit={(e) => { e.preventDefault(); setSearch(searchText.trim()); }} role="search">
              <div className="relative flex-1">
                <label htmlFor="member-search" className="sr-only">Rechercher un membre (nom, représentant, e-mail ou référence)</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40" aria-hidden />
                <input id="member-search" className="field pl-9" placeholder="Nom, représentant, e-mail ou référence" value={searchText} onChange={(e) => setSearchText(e.target.value)} />
              </div>
              <button className="min-h-[48px] rounded-lg bg-navy px-4 font-semibold text-white hover:bg-navy-2">Rechercher</button>
              {search && <button type="button" aria-label="Effacer la recherche" className="min-h-[48px] rounded-lg border border-navy/20 px-3 hover:bg-offwhite"
                onClick={() => { setSearchText(""); setSearch(""); }}><X className="h-4 w-4" /></button>}
            </form>
          )}

          <Async state={state} isEmpty={(d) => !d.items.length}
            empty={kind === "members" && search ? "Aucun membre ne correspond à cette recherche." : "Rien à traiter ici pour le moment."}>
            {(d) => (
              <ul className="space-y-4">
                {d.items.map((it) => (
                  <li key={it.id} className="rounded-2xl border border-navy/10 bg-white p-4 shadow-soft sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                      <h3 className="min-w-0 break-words text-lg leading-snug">{it.title}</h3>
                      <span className="flex items-center gap-1.5 text-sm text-navy/55">
                        <CalendarClock className="h-4 w-4" aria-hidden />{kind === "members" ? "Dossier ouvert le" : "Reçu le"} {fmtDate(it.created_at)}
                      </span>
                    </div>
                    {(it.subtitle || it.state) && (
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-navy/75">{it.subtitle}{it.state && <Pill tone="navy">{it.state}</Pill>}</p>)}
                    {!!it.details.length && (
                      <dl className="mt-4 grid gap-x-6 gap-y-3 rounded-xl bg-offwhite p-4 text-sm sm:grid-cols-2">
                        {it.details.map(([k, v]) => (
                          <div key={k} className="min-w-0"><dt className="text-xs font-semibold uppercase tracking-wide text-navy/50">{k}</dt>
                            <dd className="mt-0.5 whitespace-pre-line break-words text-navy">{v}</dd></div>))}
                      </dl>)}
                    <ActionButtons actions={it.actions} busy={busy} onAct={(a) => choose(it, a)} />
                    {open?.id === it.id && <ActionForm key={open.action.id} action={open.action} busy={busy} onSubmit={(data) => run(it, open.action, data)} onCancel={() => setOpen(null)} />}
                  </li>))}
              </ul>)}
          </Async>
        </div>
      </div>
    </div>
  );
}
