import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronDown, Eye, Lock, Plus, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Section, SectionHeading } from "../components/ui/Container";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { PageHero } from "../components/ui/PageHero";
import { RichText } from "../components/ui/RichText";
import { OrganizationCard } from "../features/directory/OrganizationCard";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { getOrganizationFilters, getPages, listOrganizations } from "../services/api";

const PAGE_SIZE = 12;

export default function Directory() {
  useSeo("Annuaire des membres – Urban Hub Connect", "Trouvez les institutions, entreprises, écoles, associations et talents des pôles de Diamniadio et du Lac Rose : activités, offres, besoins et contacts.", undefined, true);
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const [text, setText] = useState(get("search"));
  const [open, setOpen] = useState(false);
  const debounced = useDebounce(text);
  const filters = useAsync(getOrganizationFilters);
  const pages = useAsync(() => getPages("annuaire-"));
  const texte = (slug: string) => pages.data?.find((p) => p.slug === slug);
  const intro = texte("annuaire-intro");

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };
  useEffect(() => { if (debounced !== get("search")) update({ search: debounced }); /* eslint-disable-next-line */ }, [debounced]);

  const page = Number(get("page")) || 1;
  const query = { search: get("search"), pole: get("pole"), college: get("college"), sector: get("sector"),
    commission: get("commission"), founder: get("founder") === "true", propose: get("propose") === "true", recherche: get("recherche") === "true", page };
  const { data, error, loading, retry } = useAsync(() => listOrganizations(query), [params.toString()]);
  const reset = () => { setText(""); setParams({}, { replace: true }); };
  const activeFilters = ["pole", "college", "sector", "commission", "founder", "propose", "recherche"].filter((key) => get(key) !== "").length;
  const selects: [string, string, { slug: string; name: string }[] | undefined][] = [
    ["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))],
    ["college", "Collège", filters.data?.colleges], ["sector", "Secteur", filters.data?.sectors], ["commission", "Commission", filters.data?.commissions]];

  return (
    <>
      <PageHero eyebrow="Annuaire" title={intro?.title ?? "Annuaire des membres"} intro={intro?.content}>
        <Button to="/annuaire/referencer" variant="light" size="lg"><Plus className="h-5 w-5" aria-hidden />Référencer mon organisation</Button>
      </PageHero>

      <Section tone="offwhite" className="!pt-8 sm:!pt-10">
        <form role="search" aria-label="Rechercher dans l'annuaire" onSubmit={(e) => e.preventDefault()} className="card p-3 sm:p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <label htmlFor="q" className="sr-only">Recherche</label>
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" aria-hidden />
              <input id="q" type="search" className="field pl-11" placeholder="Organisation, activité, service…" value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-controls="filtres"
              className="inline-flex min-h-[48px] shrink-0 items-center gap-2 rounded-lg border border-navy/20 px-3 font-semibold hover:bg-offwhite sm:px-4 lg:hidden">
              <SlidersHorizontal className="h-5 w-5" aria-hidden /><span className="hidden sm:inline">Filtres</span>
              {activeFilters > 0 && <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-green px-1.5 text-xs text-white">{activeFilters}</span>}
              <ChevronDown className={`hidden h-4 w-4 transition-transform sm:block ${open ? "rotate-180" : ""}`} aria-hidden />
            </button>
          </div>
          <div id="filtres" className={`${open ? "block" : "hidden"} mt-3 space-y-3 border-t border-navy/10 pt-3 lg:block`}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {selects.map(([key, label, options]) => (
                <div key={key}>
                  <label htmlFor={key} className="mb-1 block text-sm font-semibold">{label}</label>
                  <select id={key} className="field" value={get(key)} onChange={(e) => update({ [key]: e.target.value })}>
                    <option value="">Tous</option>{options?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                  </select>
                </div>))}
            </div>
            <div className="flex flex-wrap items-center gap-x-5 rounded-xl bg-offwhite px-3">
              {([["founder", "Membres fondateurs"], ["propose", "Propose une offre"], ["recherche", "Recherche une offre"]] as const).map(([k, label]) => (
                <label key={k} className="flex min-h-[44px] items-center gap-2 text-sm font-semibold text-navy/85">
                  <input type="checkbox" className="h-5 w-5 accent-green" checked={get(k) === "true"} onChange={(e) => update({ [k]: e.target.checked ? "true" : "" })} />{label}
                </label>))}
              {(activeFilters > 0 || text) && <button type="button" onClick={reset} className="ml-auto min-h-[44px] text-sm font-semibold text-green hover:text-green-2">Effacer les filtres</button>}
            </div>
          </div>
        </form>

        <div className="mt-8" aria-live="polite">
          {loading ? <Loading label="Chargement de l'annuaire…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
            !data?.results.length ? (
              <EmptyState message="Nous n'avons trouvé aucun acteur correspondant à votre recherche." action={<Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <>
                <p className="mb-4 text-sm font-semibold text-navy/60">{data.count} acteur{data.count > 1 ? "s" : ""} du réseau</p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.results.map((o) => <li key={o.slug} className="flex"><OrganizationCard org={o} sectors={filters.data?.sectors} /></li>)}
                </ul>
                <Pagination page={page} pages={Math.ceil(data.count / PAGE_SIZE)} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
              </>
            )}
        </div>
      </Section>

      <Section id="contenu-fiche">
        <SectionHeading eyebrow="Bon à savoir" title="Contenu d'une fiche" intro="Chaque fiche présente les informations utiles pour découvrir les membres et entrer en relation." />
        <div className="grid gap-5 md:grid-cols-2">
          {([["annuaire-fiche-visible", Eye], ["annuaire-fiche-reserve", Lock]] as const).map(([k, Icon]) => texte(k) && (
            <div key={k} className="card p-6 sm:p-8">
              <span className={`icon-tile ${k === "annuaire-fiche-reserve" ? "bg-purple/10 text-purple" : ""}`}><Icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mb-3 mt-5 text-xl">{texte(k)!.title}</h3>
              <RichText text={texte(k)!.content} />
            </div>))}
        </div>
        <Button to="/espace-membres" variant="secondary" className="mt-8">Demander une mise en relation (membres connectés)<ArrowRight className="h-4 w-4" aria-hidden /></Button>
      </Section>

      {texte("annuaire-regles") && (
        <Section id="regles" tone="offwhite">
          <div className="card border-l-4 border-l-gold p-6 sm:p-10">
            <h2 className="mb-5 text-2xl sm:text-3xl">{texte("annuaire-regles")!.title}</h2>
            <RichText text={texte("annuaire-regles")!.content} />
          </div>
        </Section>)}
    </>
  );
}
