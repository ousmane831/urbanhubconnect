import { useState } from "react";
import { ArrowLeft, ArrowRight, ChevronDown, Handshake, MapPin, Phone, Search, SlidersHorizontal, Star, Target, UsersRound } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { Pagination } from "../../components/ui/Pagination";
import { OrganizationLogo } from "../directory/OrganizationCard";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { getOrganizationFilters } from "../../services/api";
import { memberApi, type ContactInfo } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";
import { POLE_LABELS } from "../../utils/constants";
import { ConnectionForm } from "./ConnectionForm";
import { Badge, Card, PanelHeader, primaryBtn } from "./ui";

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
    <div className="space-y-4">
      <button onClick={onClose} className="inline-flex min-h-[44px] items-center gap-2 font-semibold text-green hover:text-green-2">
        <ArrowLeft className="h-4 w-4" aria-hidden />Retour à la liste
      </button>
      <Async state={state}>
        {(o) => (
          <div className="space-y-4">
            <Card aria-label="Fiche complète">
              <div className="flex items-start gap-4">
                <OrganizationLogo org={o} size="h-16 w-16 rounded-xl sm:h-20 sm:w-20" />
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl leading-tight sm:text-3xl">{o.name}</h2>
                  <p className="mt-1.5 text-sm text-navy/70">
                    {[taxonomyLabel(o.college, undefined), taxonomyLabel(o.sector, sectors), POLE_LABELS[o.pole] ?? o.pole, o.neighborhood].filter(Boolean).join(" · ")}
                  </p>
                  {o.member_founder && <span className="mt-2 inline-block"><Badge tone="gold"><Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />Membre fondateur</Badge></span>}
                </div>
              </div>
              {o.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-navy/80">{o.description}</p>}
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="border-green/20 bg-green/5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold"><Handshake className="h-5 w-5 text-green" aria-hidden />Ce qu'elle propose</h3>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-navy/80">{o.offers || "Non renseigné."}</p>
              </Card>
              <Card className="border-purple/20 bg-purple/5">
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold"><Target className="h-5 w-5 text-purple" aria-hidden />Ce qu'elle recherche</h3>
                <p className="mt-2 whitespace-pre-line leading-relaxed text-navy/80">{o.needs || "Non renseigné."}</p>
              </Card>
            </div>

            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <h3 className="flex items-center gap-2 font-heading text-lg font-bold"><Phone className="h-5 w-5 text-green" aria-hidden />Coordonnées directes</h3>
                {contact ? (
                  <dl className="mt-3 space-y-3">
                    {contact.name && <div><dt className="text-sm text-navy/65">Représentant</dt><dd className="font-semibold">{contact.name}{contact.role && ` · ${contact.role}`}</dd></div>}
                    {contact.phone && <div><dt className="text-sm text-navy/65">Téléphone</dt><dd><a className="link text-lg" href={`tel:${contact.phone.replace(/\s/g, "")}`}>{contact.phone}</a></dd></div>}
                    {contact.email && <div><dt className="text-sm text-navy/65">E-mail</dt><dd className="break-all"><a className="link" href={`mailto:${contact.email}`}>{contact.email}</a></dd></div>}
                    {!contact.phone && !contact.email && <p>Aucune coordonnée directe renseignée.</p>}
                  </dl>
                ) : <button onClick={reveal} disabled={busy} className={`${primaryBtn} mt-4 w-full sm:w-auto`}>{busy ? "Chargement…" : "Afficher les coordonnées"}</button>}
                {error && <p role="alert" className="mt-3 font-semibold text-red-800">{error}</p>}
                <p className="mt-4 text-sm text-navy/70">Chaque affichage est enregistré. Les coordonnées des membres ne peuvent pas servir à de la prospection massive ; tout abus entraîne la suspension de l'accès.</p>
              </Card>
              <Card>
                <h3 className="font-heading text-lg font-bold">Demander une mise en relation</h3>
                <p className="mb-4 mt-1 text-navy/75">La Coordination transmet votre demande à l'organisation, avec vos coordonnées de membre.</p>
                <ConnectionForm id={`cf-${slug}`} onSend={(m) => memberApi.requestConnection(slug, m)} />
              </Card>
            </div>
          </div>)}
      </Async>
    </div>
  );
}

const EMPTY = { pole: "", college: "", sector: "", commission: "", founder: false, propose: false, recherche: false };

export function FullDirectory() {
  const filters = useAsync(getOrganizationFilters);
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const state = useAsync(() => memberApi.directory({ search, ...f, page }), [search, JSON.stringify(f), page]);
  const set = (k: keyof typeof f, v: string | boolean) => { setF({ ...f, [k]: v }); setPage(1); };
  const reset = () => { setText(""); setF(EMPTY); setPage(1); };
  const activeFilters = Object.values(f).filter(Boolean).length;

  if (selected) return <OrganizationPanel key={selected} slug={selected} sectors={filters.data?.sectors} onClose={() => setSelected(null)} />;
  const selects: [keyof typeof f, string, { slug: string; name: string }[] | undefined][] = [
    ["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))], ["college", "Collège", filters.data?.colleges],
    ["sector", "Secteur", filters.data?.sectors], ["commission", "Commission", filters.data?.commissions]];
  return (
    <div className="space-y-5">
      <PanelHeader icon={UsersRound} title="Annuaire complet" intro="Les membres à jour, avec leurs offres, leurs besoins et leurs coordonnées directes." />

      <Card className="p-3 sm:p-5">
        <form role="search" aria-label="Rechercher dans l'annuaire complet" onSubmit={(e) => e.preventDefault()} className="space-y-3">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <label htmlFor="fd-q" className="sr-only">Recherche</label>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" aria-hidden />
              <input id="fd-q" type="search" className="field pl-10" placeholder="Organisation, activité, offre, besoin…" value={text} onChange={(e) => { setText(e.target.value); setPage(1); }} />
            </div>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="fd-filtres"
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-navy/20 px-3 font-semibold hover:bg-offwhite sm:px-4 lg:hidden">
              <SlidersHorizontal className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">Filtres</span>
              {activeFilters > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-green px-1.5 text-xs text-white">{activeFilters}</span>}
              <ChevronDown className={`hidden h-4 w-4 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </div>
          <div id="fd-filtres" className={`${open ? "block" : "hidden"} space-y-3 border-t border-navy/10 pt-3 lg:block`}>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {selects.map(([k, l, opts]) => (
                <div key={k}><label htmlFor={`fd-${k}`} className="mb-1 block text-sm font-semibold">{l}</label>
                  <select id={`fd-${k}`} className="field" value={String(f[k])} onChange={(e) => set(k, e.target.value)}><option value="">Tous</option>{opts?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}</select></div>))}
            </div>
            <div className="flex flex-wrap gap-x-5 rounded-xl bg-offwhite px-3">
              {([["founder", "Membres fondateurs"], ["propose", "Propose une offre"], ["recherche", "Recherche une offre"]] as const).map(([k, l]) => (
                <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy/85"><input type="checkbox" className="h-5 w-5 accent-green" checked={f[k]} onChange={(e) => set(k, e.target.checked)} />{l}</label>))}
            </div>
            {(activeFilters > 0 || text) && <button type="button" onClick={reset} className="min-h-[44px] font-semibold text-green hover:text-green-2">Effacer la recherche et les filtres</button>}
          </div>
        </form>
      </Card>

      <div aria-live="polite">
        <Async state={state} isEmpty={(d) => !d.results.length} empty="Nous n'avons trouvé aucun membre correspondant à votre recherche.">
          {(d) => (<>
            <p className="mb-3 text-sm font-semibold text-navy/70">{d.count} membre{d.count > 1 ? "s" : ""}</p>
            <ul className="grid gap-3 sm:grid-cols-2 sm:gap-4">
              {d.results.map((o) => (
                <li key={o.slug}>
                  <button onClick={() => setSelected(o.slug)} aria-label={`Voir la fiche complète de ${o.name}`}
                    className="group flex h-full w-full flex-col rounded-2xl border border-navy/10 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-green/40 hover:shadow-lg sm:p-5">
                    <span className="flex items-start gap-3">
                      <OrganizationLogo org={o} size="h-14 w-14 rounded-xl" />
                      <span className="min-w-0 flex-1">
                        <span className="block font-heading text-lg font-bold leading-snug">{o.name}</span>
                        <span className="mt-1 flex items-center gap-1 text-sm font-medium text-green"><MapPin className="h-4 w-4" aria-hidden />{POLE_LABELS[o.pole] ?? o.pole}</span>
                      </span>
                      <ArrowRight className="mt-1 h-5 w-5 shrink-0 text-green transition-transform group-hover:translate-x-1" aria-hidden />
                    </span>
                    <span className="mt-3 block text-sm text-navy/65">{[taxonomyLabel(o.college, filters.data?.colleges), taxonomyLabel(o.sector, filters.data?.sectors)].filter(Boolean).join(" · ")}</span>
                    {o.short_description && <span className="mt-2 line-clamp-2 block text-[15px] leading-relaxed text-navy/80">{o.short_description}</span>}
                    {o.member_founder && <span className="mt-3"><Badge tone="gold"><Star className="h-3.5 w-3.5 fill-gold text-gold" aria-hidden />Membre fondateur</Badge></span>}
                  </button>
                </li>))}
            </ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={setPage} />
          </>)}
        </Async>
      </div>
    </div>
  );
}
