import { useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Handshake, MapPin, Search, SlidersHorizontal, Star } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { Button } from "../../components/ui/Button";
import { Pagination } from "../../components/ui/Pagination";
import { OrganizationLogo } from "../directory/OrganizationCard";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { getOrganizationFilters } from "../../services/api";
import { memberApi, type ContactInfo } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";
import { POLE_LABELS } from "../../utils/constants";

const label = (x: unknown) => (typeof x === "string" ? x : (x as { name?: string } | null)?.name ?? "");
const taxonomyLabel = (value: unknown, options: { slug: string; name: string }[] | undefined) => {
  if (typeof value !== "string") return label(value);
  return options?.find((option) => option.slug === value)?.name ?? value;
};

function OrganizationPanel({ slug, onClose, sectors }: { slug: string; onClose: () => void; sectors?: { slug: string; name: string }[] }) {
  const state = useAsync(() => memberApi.directoryDetail(slug), [slug]);
  const [contact, setContact] = useState<ContactInfo | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reveal = async () => {
    setBusy(true); setError("");
    try { setContact(await memberApi.reveal(slug)); } catch (e) { setError(apiErrorMessage(e)); } finally { setBusy(false); }
  };
  return (
    <section aria-label="Fiche complète" className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-navy/10 bg-offwhite px-5 py-4 sm:px-7">
        <button onClick={onClose} className="inline-flex min-h-10 items-center gap-2 font-semibold text-green hover:text-green-2">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />Retour à la liste
        </button>
        <span className="inline-flex items-center gap-2 text-sm text-navy/65"><Building2 className="h-4 w-4 text-green" aria-hidden="true" />Fiche membre</span>
      </div>
      <Async state={state}>
        {(o) => (
          <div className="space-y-7 p-5 sm:p-8">
            <div className="flex flex-wrap items-start gap-4">
              <OrganizationLogo org={o} size="h-20 w-20 rounded-xl" />
              <div className="min-w-0 flex-1">
                <h2 className="text-2xl sm:text-3xl">{o.name}</h2>
                <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-navy/70">
                  {[taxonomyLabel(o.college, undefined), taxonomyLabel(o.sector, sectors), POLE_LABELS[o.pole] ?? o.pole, o.neighborhood].filter(Boolean).map((item, index) => (
                    <span key={`${item}-${index}`} className="inline-flex items-center gap-2">
                      {index > 0 && <span aria-hidden="true" className="text-navy/30">·</span>}{item}
                    </span>
                  ))}
                </p>
                {o.member_founder && <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-sm font-semibold text-navy"><Star className="h-4 w-4 fill-gold text-gold" aria-hidden="true" />Membre fondateur</span>}
              </div>
            </div>
            {o.description && <p className="max-w-4xl whitespace-pre-line leading-relaxed text-navy/80">{o.description}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-green/15 bg-green/5 p-5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold"><Handshake className="h-5 w-5 text-green" aria-hidden="true" />Ce que l’organisation propose</h3>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-navy/80">{o.offers || "Non renseigné."}</p>
              </div>
              <div className="rounded-xl border border-purple/15 bg-purple/5 p-5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold"><MapPin className="h-5 w-5 text-purple" aria-hidden="true" />Ce qu’elle recherche</h3>
                <p className="mt-3 whitespace-pre-line leading-relaxed text-navy/80">{o.needs || "Non renseigné."}</p>
              </div>
            </div>
            <div className="rounded-xl border border-navy/10 bg-offwhite p-5 sm:p-6">
              <h3 className="text-lg font-heading font-bold">Coordonnées directes</h3>
              {contact ? (
                <dl className="mt-3 grid gap-3 sm:grid-cols-2">
                  {contact.name && <div><dt className="text-sm text-navy/65">Représentant</dt><dd className="font-semibold">{contact.name}{contact.role && ` · ${contact.role}`}</dd></div>}
                  {contact.phone && <div><dt className="text-sm text-navy/65">Téléphone</dt><dd><a className="link" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></dd></div>}
                  {contact.email && <div><dt className="text-sm text-navy/65">E-mail</dt><dd><a className="link" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
                  {!contact.phone && !contact.email && <p>Aucune coordonnée directe renseignée.</p>}
                </dl>
              ) : <Button onClick={reveal} disabled={busy} className="mt-4">{busy ? "Chargement…" : "Afficher les coordonnées"}</Button>}
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
  const reset = () => { setText(""); setF({ pole: "", college: "", sector: "", commission: "", founder: false, propose: false, recherche: false }); setPage(1); };
  const activeFilters = Object.values(f).filter(Boolean).length + (text.trim() ? 1 : 0);

  if (selected) return <OrganizationPanel key={selected} slug={selected} sectors={filters.data?.sectors} onClose={() => setSelected(null)} />;
  const selects: [keyof typeof f, string, { slug: string; name: string }[] | undefined][] = [
    ["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))], ["college", "Collège", filters.data?.colleges],
    ["sector", "Secteur", filters.data?.sectors], ["commission", "Commission", filters.data?.commissions]];
  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-green">Le réseau</p>
        <h2 className="mt-1 text-2xl sm:text-3xl">Annuaire complet</h2>
        <p className="mt-2 text-navy/70">Trouvez les membres, explorez leurs activités et identifiez des pistes de collaboration.</p>
      </div>
      <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green"><SlidersHorizontal className="h-5 w-5" aria-hidden="true" /></span>
            <div><h3 className="font-heading text-lg font-bold">Rechercher un membre</h3><p className="text-sm text-navy/65">Affinez les résultats avec les filtres.</p></div>
          </div>
          {activeFilters > 0 && <button type="button" onClick={reset} className="min-h-10 rounded-md px-3 font-semibold text-green hover:bg-green/5">Effacer les filtres ({activeFilters})</button>}
        </div>
        <form role="search" aria-label="Rechercher dans l'annuaire complet" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="sm:col-span-2 xl:col-span-4">
            <label htmlFor="fd-q" className="mb-1.5 block text-sm font-semibold">Recherche</label>
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" aria-hidden="true" />
              <input id="fd-q" type="search" className="field pl-10" placeholder="Organisation, activité, service, offre ou besoin…" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} /></div>
          </div>
          {selects.map(([k, l, opts]) => (
            <div key={k}><label htmlFor={`fd-${k}`} className="mb-1.5 block text-sm font-semibold">{l}</label>
              <select id={`fd-${k}`} className="field" value={String(f[k])} onChange={(e) => set(k, e.target.value)}><option value="">Tous</option>{opts?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>))}
          <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-offwhite px-4 sm:col-span-2 xl:col-span-4">
            {([["founder", "Membres fondateurs"], ["propose", "Propose une offre"], ["recherche", "Recherche une offre"]] as const).map(([k, l]) => (
              <label key={k} className="flex min-h-[48px] items-center gap-2 text-sm font-semibold text-navy/85"><input type="checkbox" className="h-5 w-5 accent-green" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>))}
          </div>
        </form>
      </div>
      <div aria-live="polite">
        <Async state={state} isEmpty={(d) => !d.results.length} empty="Nous n'avons trouvé aucun membre correspondant à votre recherche.">
          {(d) => (<>
            <div className="mb-4 flex items-center justify-between gap-3 border-b border-navy/10 pb-4">
              <h3 className="text-xl font-heading font-bold">Membres du réseau</h3>
              <span className="rounded-full bg-green/10 px-3 py-1.5 text-sm font-semibold text-green">{d.count} membre{d.count > 1 ? "s" : ""}</span>
            </div>
            <ul className="grid gap-4 sm:grid-cols-2">
              {d.results.map((o) => (
                <li key={o.slug} className="flex">
                  <article className="group flex w-full flex-col rounded-2xl border border-navy/10 bg-white p-5 shadow-soft transition-all hover:-translate-y-0.5 hover:border-green/35 hover:shadow-lg sm:p-6">
                    <div className="flex items-start gap-4">
                      <OrganizationLogo org={o} size="h-16 w-16 rounded-xl" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-lg leading-snug">{o.name}</h4>
                        {o.member_founder && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-gold/10 px-2.5 py-1 text-xs font-semibold text-navy"><Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden="true" />Membre fondateur</span>}
                      </div>
                    </div>
                    <div className="mt-4 flex-1 border-t border-navy/10 pt-3">
                      <p className="text-sm text-navy/70">{[taxonomyLabel(o.college, filters.data?.colleges), taxonomyLabel(o.sector, filters.data?.sectors)].filter(Boolean).join(" · ")}</p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-green"><MapPin className="h-4 w-4" aria-hidden="true" />{POLE_LABELS[o.pole] ?? o.pole}</p>
                      {o.short_description && <p className="mt-3 line-clamp-3 leading-relaxed text-navy/75">{o.short_description}</p>}
                    </div>
                    <button onClick={() => setSelected(o.slug)} className="mt-5 inline-flex min-h-11 items-center justify-between gap-2 border-t border-navy/10 pt-4 text-left font-semibold text-green transition-colors hover:text-green-2" aria-label={`Voir la fiche complète de ${o.name}`}>
                      Voir la fiche complète <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </button>
                  </article>
                </li>))}
            </ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={setPage} />
          </>)}
        </Async>
      </div>
    </div>
  );
}
