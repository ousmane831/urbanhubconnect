import { useState } from "react";
import { Async } from "../../components/ui/Async";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { EmptyState } from "../../components/ui/States";
import { OrganizationLogo } from "../directory/OrganizationCard";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { getOrganizationFilters } from "../../services/api";
import { memberApi, type ContactInfo } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";
import { POLE_LABELS } from "../../utils/constants";

const label = (x: unknown) => (typeof x === "string" ? x : (x as { name?: string } | null)?.name ?? "");

function OrganizationPanel({ slug, onClose }: { slug: string; onClose: () => void }) {
  const state = useAsync(() => memberApi.directoryDetail(slug), [slug]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    setBusy(true); setError("");
    try { setContact(await memberApi.reveal(slug)); } catch (e) { setError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Fiche complète" className="rounded-md border-2 border-green bg-white p-6 shadow-soft">
      <button onClick={onClose} className="link mb-4 font-semibold">← Retour à la liste</button>
      <Async state={state}>
        {(o) => (
          <div className="space-y-6">
            <div className="flex items-start gap-4"><OrganizationLogo org={o} size="h-20 w-20" /><div>
              <h3 className="text-2xl">{o.name}</h3>
              <p className="text-navy/75">{[label(o.college), label(o.sector), POLE_LABELS[o.pole] ?? o.pole, o.neighborhood].filter(Boolean).join(" · ")}</p>
              {o.member_founder && <p className="font-semibold text-green">Membre fondateur</p>}</div></div>
            {o.description && <p className="max-w-3xl whitespace-pre-line text-lg">{o.description}</p>}
            <div className="grid gap-6 md:grid-cols-2">
              <div><h4 className="text-lg">Ce que cette organisation propose</h4><p className="mt-1 whitespace-pre-line">{o.offers || "Non renseigné."}</p></div>
              <div><h4 className="text-lg">Ce qu'elle recherche</h4><p className="mt-1 whitespace-pre-line">{o.needs || "Non renseigné."}</p></div>
            </div>
            <div className="rounded-md bg-offwhite p-5">
              <h4 className="text-lg">Coordonnées directes</h4>
              {contact ? (
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {contact.name && <div><dt className="text-sm text-navy/65">Représentant</dt><dd className="font-semibold">{contact.name}{contact.role && ` · ${contact.role}`}</dd></div>}
                  {contact.phone && <div><dt className="text-sm text-navy/65">Téléphone</dt><dd><a className="link" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></dd></div>}
                  {contact.email && <div><dt className="text-sm text-navy/65">E-mail</dt><dd><a className="link" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
                  {!contact.phone && !contact.email && <p>Aucune coordonnée directe renseignée.</p>}
                </dl>
              ) : <Button onClick={reveal} disabled={busy} className="mt-3">Afficher les coordonnées</Button>}
              {error && <p role="alert" className="mt-3 font-semibold text-red-800">{error}</p>}
              <p className="mt-4 text-sm text-navy/75">Chaque affichage est enregistré. Les coordonnées des membres ne peuvent pas être utilisées à des fins de prospection massive ; toute utilisation abusive entraîne la suspension de l'accès.</p>
            </div>
          </div>)}
      </Async>
    </section>
  );
}

export function FullDirectory() {
  const filters = useAsync(getOrganizationFilters);
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const [f, setF] = useState({ pole: "", college: "", sector: "", commission: "", founder: false, propose: false, recherche: false });
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const state = useAsync(() => memberApi.directory({ search, ...f, page }), [search, JSON.stringify(f), page]);
  const set = (k: keyof typeof f, v: string | boolean) => { setF({ ...f, [k]: v }); setPage(1); };

  if (selected) return <OrganizationPanel key={selected} slug={selected} onClose={() => setSelected(null)} />;
  const selects: [keyof typeof f, string, { slug: string; name: string }[] | undefined][] = [
    ["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))], ["college", "Collège", filters.data?.colleges],
    ["sector", "Secteur", filters.data?.sectors], ["commission", "Commission", filters.data?.commissions]];
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Annuaire complet</h2>
      <form role="search" aria-label="Rechercher dans l'annuaire complet" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="sm:col-span-2 lg:col-span-4"><label htmlFor="fd-q" className="mb-1.5 block font-semibold">Recherche</label>
          <input id="fd-q" type="search" className="field" placeholder="Rechercher une organisation, une activité, un service, une offre, un besoin…" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} /></div>
        {selects.map(([k, l, opts]) => (
          <div key={k}><label htmlFor={`fd-${k}`} className="mb-1.5 block font-semibold">{l}</label>
            <select id={`fd-${k}`} className="field" value={String(f[k])} onChange={(e) => set(k, e.target.value)}><option value="">Tous</option>{opts?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>))}
        <div className="flex flex-wrap items-center gap-x-6 sm:col-span-2 lg:col-span-4">
          {([["founder", "Membres fondateurs"], ["propose", "Propose"], ["recherche", "Recherche"]] as const).map(([k, l]) => (
            <label key={k} className="flex min-h-[44px] items-center gap-2 font-semibold"><input type="checkbox" className="h-5 w-5 accent-green" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>))}
        </div>
      </form>
      <div aria-live="polite">
        <Async state={state} isEmpty={(d) => !d.results.length} empty="Nous n'avons trouvé aucun membre correspondant à votre recherche.">
          {(d) => (<>
            <p className="mb-4 font-semibold">{d.count} membre{d.count > 1 ? "s" : ""}</p>
            <ul className="grid gap-4 sm:grid-cols-2">
              {d.results.map((o) => (
                <li key={o.slug} className="flex flex-col rounded-md border border-navy/15 bg-white p-5 shadow-soft">
                  <div className="flex items-start gap-3"><OrganizationLogo org={o} /><div><h3 className="text-lg leading-snug">{o.name}</h3>
                    <p className="text-sm text-navy/75">{[label(o.college), label(o.sector), POLE_LABELS[o.pole] ?? o.pole].filter(Boolean).join(" · ")}</p></div></div>
                  {o.short_description && <p className="mt-3 line-clamp-3">{o.short_description}</p>}
                  <button onClick={() => setSelected(o.slug)} className="link mt-4 self-start font-semibold" aria-label={`Voir la fiche complète de ${o.name}`}>Voir la fiche complète</button>
                </li>))}
            </ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={setPage} />
          </>)}
        </Async>
        {state.data && !state.loading && state.data.results.length === 0 && <EmptyState message="Aucun résultat." />}
      </div>
    </div>
  );
}
