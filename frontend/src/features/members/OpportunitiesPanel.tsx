import { useState, type FormEvent } from "react";
import { Async } from "../../components/ui/Async";
import { Pagination } from "../../components/ui/Pagination";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { memberApi, type OpportunityInput, type OpportunityItem } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";
import { fmtDate } from "../../utils/format";
import { ConnectionForm } from "./ConnectionForm";

const todayIso = () => new Date().toISOString().slice(0, 10);

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
    <form onSubmit={submit} className="grid gap-4 rounded-md border border-navy/15 bg-offwhite p-5 sm:grid-cols-2" aria-label={initial ? "Modifier l'annonce" : "Publier une annonce"}>
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
      <div className="flex flex-wrap gap-3 sm:col-span-2">
        <button disabled={busy} className="min-h-[44px] rounded-md bg-green px-6 font-semibold text-white hover:bg-green-2 disabled:opacity-60">{initial ? "Enregistrer" : "Publier l'annonce"}</button>
        <button type="button" onClick={onCancel} className="min-h-[44px] rounded-md border border-navy/30 px-6 font-semibold hover:bg-white">Annuler</button>
      </div>
    </form>
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

  const close = async (o: OpportunityItem) => {
    if (!window.confirm(`Clôturer l'annonce « ${o.title} » ?`)) return;
    try { setNotice({ ok: true, text: await memberApi.closeOpportunity(o.id) }); reload(); } catch (err) { setNotice({ ok: false, text: apiErrorMessage(err) }); }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl">Urban Opportunities</h2>
        {!form && <button onClick={() => { setNotice(null); setForm({}); }} className="min-h-[44px] rounded-md bg-green px-5 font-semibold text-white hover:bg-green-2">Publier une annonce</button>}
      </div>
      <p className="max-w-3xl text-navy/80">Partenariats, appels d'offres, sous-traitance, emplois, stages : publiez et consultez les opportunités des membres.</p>
      <p role="status" aria-live="polite" className={`min-h-[1.5rem] font-semibold ${notice?.ok ? "text-green" : "text-red-800"}`}>{notice?.text}</p>
      {form && <OpportunityForm types={types.data ?? []} initial={form.edit} onCancel={() => setForm(null)}
        onSubmit={async (input) => { const text = form.edit ? await memberApi.updateOpportunity(form.edit.id, input) : await memberApi.publishOpportunity(input); setNotice({ ok: true, text }); setForm(null); setMine(true); setPage(1); reload(); return text; }} />}

      <form role="search" aria-label="Filtrer les annonces" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
        <div><label htmlFor="op-q" className="mb-1.5 block font-semibold">Recherche</label>
          <input id="op-q" type="search" className="field" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} /></div>
        <div><label htmlFor="op-t" className="mb-1.5 block font-semibold">Type</label>
          <select id="op-t" className="field" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}><option value="">Tous</option>{types.data?.map((t) => <option key={t.slug} value={t.slug}>{t.name}</option>)}</select></div>
        <label className="flex min-h-[44px] items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5 accent-green" checked={mine} onChange={(e) => { setMine(e.target.checked); setPage(1); }} />Mes annonces</label>
      </form>

      <div aria-live="polite">
        <Async state={state} isEmpty={(d) => !d.results.length} empty={mine ? "Vous n'avez publié aucune annonce." : "Aucune annonce ne correspond à votre recherche."}>
          {(d) => (<>
            <ul className="space-y-4">
              {d.results.map((o) => (
                <li key={o.id} className="rounded-md border border-navy/15 bg-white p-5 shadow-soft">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-sm font-semibold text-green">{o.type_name}</p>
                    {o.mine && <span className="rounded bg-offwhite px-2 py-0.5 text-sm font-semibold">{o.status_label}</span>}
                  </div>
                  <h3 className="mt-1 text-xl">{o.title}</h3>
                  <p className="text-sm text-navy/70">{o.organization.name}{o.deadline && ` · jusqu'au ${fmtDate(o.deadline)}`}</p>
                  <p className="mt-3 whitespace-pre-line">{o.description}</p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {o.mine ? (o.status === "pending" || o.status === "published") && (<>
                      <button onClick={() => { setNotice(null); setForm({ edit: o }); }} className="min-h-[44px] rounded-md border border-navy/30 px-5 font-semibold hover:bg-offwhite">Modifier</button>
                      <button onClick={() => close(o)} className="min-h-[44px] rounded-md border border-red-700 px-5 font-semibold text-red-800 hover:bg-red-50">Clôturer</button></>)
                      : <button onClick={() => setResponding(responding === o.id ? null : o.id)} aria-expanded={responding === o.id} className="min-h-[44px] rounded-md bg-green px-5 font-semibold text-white hover:bg-green-2">Répondre à cette annonce</button>}
                  </div>
                  {responding === o.id && <div className="mt-4 rounded-md bg-offwhite p-4"><ConnectionForm id={`resp-${o.id}`} label="Votre réponse" submitLabel="Envoyer ma réponse" onSend={(m) => memberApi.respond(o.id, m)} /></div>}
                </li>))}
            </ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={setPage} />
          </>)}
        </Async>
      </div>
    </div>
  );
}
