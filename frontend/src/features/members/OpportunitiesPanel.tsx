import { CalendarClock, Megaphone, Plus, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Async } from "../../components/ui/Async";
import { Pagination } from "../../components/ui/Pagination";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { memberApi, type OpportunityInput, type OpportunityItem } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { ConnectionForm } from "./ConnectionForm";
import { Badge, Card, Notice, PanelHeader, dangerBtn, primaryBtn, secondaryBtn } from "./ui";

const todayIso = () => new Date().toISOString().slice(0, 10);
const STATUS_TONE: Record<string, "green" | "gold" | "red" | "grey"> = { published: "green", pending: "gold", rejected: "red", closed: "grey" };

function OpportunityForm({ types, initial, onSubmit, onCancel }: {
  types: { name: string; slug: string }[]; initial?: OpportunityItem; onSubmit: (i: OpportunityInput) => Promise<string>; onCancel: () => void;
}) {
  const [v, setV] = useState({ type: initial?.type ?? "", title: initial?.title ?? "", description: initial?.description ?? "", deadline: initial?.deadline ?? "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof v) => (e: { target: { value: string } }) => setV({ ...v, [k]: e.target.value });

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!v.type) return setError("Choisissez un type d'annonce.");
    if (v.title.trim().length < 5) return setError("Donnez un titre à votre annonce (5 caractères minimum).");
    if (v.description.trim().length < 20) return setError("Décrivez votre annonce (20 caractères minimum).");
    setBusy(true); setError("");
    try { await onSubmit({ type: v.type, title: v.title.trim(), description: v.description.trim(), deadline: v.deadline || null }); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Card className="border-green/30">
      <h3 className="mb-4 font-heading text-lg font-bold">{initial ? "Modifier l'annonce" : "Nouvelle annonce"}</h3>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2" aria-label={initial ? "Modifier l'annonce" : "Publier une annonce"}>
        <div><label htmlFor="op-type" className="mb-1.5 block font-semibold">Type d'annonce</label>
          <select id="op-type" className="field" value={v.type} onChange={set("type")}><option value="">Choisir…</option>{types.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></div>
        <div><label htmlFor="op-deadline" className="mb-1.5 block font-semibold">Date limite (facultative)</label>
          <input id="op-deadline" type="date" min={todayIso()} className="field" value={v.deadline} onChange={set("deadline")} /></div>
        <div className="sm:col-span-2"><label htmlFor="op-title" className="mb-1.5 block font-semibold">Titre</label>
          <input id="op-title" maxLength={150} className="field" value={v.title} onChange={set("title")} /></div>
        <div className="sm:col-span-2"><label htmlFor="op-desc" className="mb-1.5 block font-semibold">Description</label>
          <textarea id="op-desc" rows={6} maxLength={2000} className="field" value={v.description} onChange={set("description")} />
          <p className="mt-1 text-sm text-navy/65">{v.description.length} / 2 000 caractères</p></div>
        {error && <p role="alert" className="font-semibold text-red-800 sm:col-span-2">{error}</p>}
        <div className="grid gap-3 sm:col-span-2 sm:flex">
          <button disabled={busy} className={primaryBtn}>{initial ? "Enregistrer" : "Publier l'annonce"}</button>
          <button type="button" onClick={onCancel} className={secondaryBtn}>Annuler</button>
        </div>
      </form>
    </Card>
  );
}

export function OpportunitiesPanel() {
  const types = useAsync(memberApi.opportunityTypes);
  const [mine, setMine] = useState(false);
  const [type, setType] = useState("");
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const [page, setPage] = useState(1);
  const [version, setVersion] = useState(0);
  const [form, setForm] = useState<{ edit?: OpportunityItem } | null>(null);
  const [responding, setResponding] = useState<number | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const state = useAsync(() => memberApi.opportunities({ mine, type, search, page }), [mine, type, search, page, version]);
  const reload = () => setVersion((n) => n + 1);
  const view = (m: boolean) => { setMine(m); setPage(1); };

  const close = async (o: OpportunityItem) => {
    if (!window.confirm(`Clôturer l'annonce « ${o.title} » ?`)) return;
    try { setNotice({ ok: true, text: await memberApi.closeOpportunity(o.id) }); reload(); } catch (err) { setNotice({ ok: false, text: apiErrorMessage(err) }); }
  };
  return (
    <div className="space-y-5">
      <PanelHeader icon={Megaphone} title="Urban Opportunities" intro="Partenariats, appels d'offres, sous-traitance, emplois, stages : publiez et consultez les opportunités des membres."
        action={!form && <button onClick={() => { setNotice(null); setForm({}); }} className={primaryBtn}><Plus className="h-5 w-5" aria-hidden />Publier une annonce</button>} />
      <Notice notice={notice} />
      {form && <OpportunityForm types={types.data ?? []} initial={form.edit} onCancel={() => setForm(null)}
        onSubmit={async (input) => { const text = form.edit ? await memberApi.updateOpportunity(form.edit.id, input) : await memberApi.publishOpportunity(input); setNotice({ ok: true, text }); setForm(null); view(true); reload(); return text; }} />}

      <div role="group" aria-label="Annonces affichées" className="grid grid-cols-2 gap-1 rounded-xl bg-white p-1 shadow-soft sm:inline-grid sm:w-auto">
        {([[false, "Toutes les annonces"], [true, "Mes annonces"]] as const).map(([value, l]) => (
          <button key={l} aria-pressed={mine === value} onClick={() => view(value)}
            className={`min-h-[44px] rounded-lg px-4 text-sm font-semibold transition-colors sm:text-base ${mine === value ? "bg-navy text-white" : "text-navy/75 hover:bg-offwhite"}`}>{l}</button>))}
      </div>

      <form role="search" aria-label="Filtrer les annonces" onSubmit={(e) => e.preventDefault()} className="grid gap-3 sm:grid-cols-[2fr_1fr]">
        <div className="relative"><label htmlFor="op-q" className="sr-only">Recherche</label>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" aria-hidden />
          <input id="op-q" type="search" className="field pl-10" placeholder="Rechercher une annonce…" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} /></div>
        <div><label htmlFor="op-t" className="sr-only">Type</label>
          <select id="op-t" className="field" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">Tous les types</option>{types.data?.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></div>
      </form>

      <div aria-live="polite">
        <Async state={state} isEmpty={(d) => !d.results.length} empty={mine ? "Vous n'avez publié aucune annonce." : "Aucune annonce ne correspond à votre recherche."}>
          {(d) => (<>
            <ul className="space-y-3 sm:space-y-4">
              {d.results.map((o) => (
                <Card as="li" key={o.id}>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="purple">{o.type_name}</Badge>
                    {o.mine && <Badge tone={STATUS_TONE[o.status] ?? "grey"}>{o.status_label}</Badge>}
                    {o.deadline && <span className="inline-flex items-center gap-1 text-sm text-navy/70"><CalendarClock className="h-4 w-4" aria-hidden />Jusqu'au {fmtDate(o.deadline)}</span>}
                  </div>
                  <h3 className="mt-3 text-lg leading-snug sm:text-xl">{o.title}</h3>
                  <p className="text-sm font-semibold text-green">{o.organization.name}</p>
                  <p className="mt-3 whitespace-pre-line leading-relaxed text-navy/85">{o.description}</p>
                  <div className="mt-4 grid gap-2 sm:flex sm:flex-wrap">
                    {o.mine ? (o.status === "pending" || o.status === "published") && (<>
                      <button onClick={() => { setNotice(null); setForm({ edit: o }); window.scrollTo({ top: 0, behavior: "smooth" }); }} className={secondaryBtn}>Modifier</button>
                      <button onClick={() => close(o)} className={dangerBtn}>Clôturer</button></>)
                      : <button onClick={() => setResponding(responding === o.id ? null : o.id)} aria-expanded={responding === o.id} className={primaryBtn}>Répondre à cette annonce</button>}
                  </div>
                  {responding === o.id && <div className="mt-4 rounded-xl bg-offwhite p-4"><ConnectionForm id={`resp-${o.id}`} label="Votre réponse" submitLabel="Envoyer ma réponse" onSend={(m) => memberApi.respond(o.id, m)} /></div>}
                </Card>))}
            </ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={setPage} />
          </>)}
        </Async>
      </div>
    </div>
  );
}
