import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, UsersRound } from "lucide-react";
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
  const select = "field";
  const activeFilters = ["pole", "college", "sector", "commission", "founder", "propose", "recherche"]
    .filter((key) => get(key) !== "").length;

  return (
    <>
      <PageHero title={intro?.title ?? "Annuaire des membres"} intro={intro?.content}>
        <Button to="/annuaire/referencer" variant="light">Référencer mon organisation</Button>
      </PageHero>
      <Section className="pb-16 sm:pb-20">
        <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-7">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green/10 text-green">
                <SlidersHorizontal className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="text-xl sm:text-2xl">Trouvez les bons contacts</h2>
                <p className="mt-1 text-sm text-navy/65">Filtrez les acteurs du réseau selon vos besoins.</p>
              </div>
            </div>
            {activeFilters > 0 && (
              <button type="button" onClick={reset} className="min-h-11 rounded-md px-3 font-semibold text-green underline decoration-green/40 underline-offset-4 hover:decoration-green">
                Effacer les filtres ({activeFilters})
              </button>
            )}
          </div>
          <form role="search" aria-label="Rechercher dans l'annuaire" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-4">
              <label htmlFor="q" className="mb-1.5 block font-semibold">Recherche</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/45" aria-hidden="true" />
                <input id="q" type="search" className="field pl-10" placeholder="Organisation, activité, service…" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            </div>
            {[["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))],
              ["college", "Collège", filters.data?.colleges], ["sector", "Secteur", filters.data?.sectors],
              ["commission", "Commission", filters.data?.commissions]].map(([key, label, options]) => (
              <div key={key as string}>
                <label htmlFor={key as string} className="mb-1.5 block text-sm font-semibold">{label as string}</label>
                <select id={key as string} className={select} value={get(key as string)} onChange={(e) => update({ [key as string]: e.target.value })}>
                  <option value="">Tous</option>
                  {(options as { slug: string; name: string }[] | undefined)?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                </select>
              </div>
            ))}
            <div className="flex flex-wrap gap-x-5 gap-y-1 rounded-xl bg-offwhite px-4 sm:col-span-2 lg:col-span-4">
              {([["founder", "Membres fondateurs"], ["propose", "Propose une offre"], ["recherche", "Recherche une offre"]] as const).map(([k, label]) => (
                <label key={k} className="flex min-h-[48px] items-center gap-2 text-sm font-semibold text-navy/85">
                  <input type="checkbox" className="h-5 w-5 accent-green" checked={get(k) === "true"} onChange={(e) => update({ [k]: e.target.checked ? "true" : "" })} />{label}
                </label>))}
            </div>
          </form>
        </div>

        <div className="mt-10" aria-live="polite">
          {loading ? <Loading label="Chargement de l'annuaire…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
            !data?.results.length ? (
              <EmptyState message="Nous n'avons trouvé aucun acteur correspondant à votre recherche." action={<Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <>
                <div className="mb-5 flex items-center justify-between gap-3 border-b border-navy/10 pb-4">
                  <h2 className="flex items-center gap-2 text-xl sm:text-2xl">
                    <UsersRound className="h-5 w-5 text-green" aria-hidden="true" />
                    Les acteurs du réseau
                  </h2>
                  <p className="rounded-full bg-green/10 px-3 py-1.5 text-sm font-semibold text-green">
                    {data.count} acteur{data.count > 1 ? "s" : ""}
                  </p>
                </div>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {data.results.map((o) => <li key={o.slug} className="flex"><div className="flex w-full"><OrganizationCard org={o} /></div></li>)}
                </ul>
                <Pagination page={page} pages={Math.ceil(data.count / PAGE_SIZE)} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
              </>
            )}
        </div>
      </Section>
      <Section tone="offwhite" id="contenu-fiche">
        <SectionHeading title="Contenu d'une fiche" intro="Chaque fiche présente les informations utiles pour découvrir les membres et entrer en relation." />
        <div className="grid gap-5 md:grid-cols-2">
          {["annuaire-fiche-visible", "annuaire-fiche-reserve"].map((k) => texte(k) && (
            <div key={k} className={`rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-7 ${k === "annuaire-fiche-reserve" ? "border-t-4 border-t-purple" : "border-t-4 border-t-green"}`}>
              <h3 className="mb-3 text-xl">{texte(k)!.title}</h3>
              <RichText text={texte(k)!.content} />
            </div>))}
        </div>
        <Button to="/espace-membres" variant="secondary" className="mt-8">Demander une mise en relation (membres connectés)</Button>
      </Section>
      {texte("annuaire-regles") && (
        <Section id="regles">
          <div className="rounded-2xl border border-gold/30 bg-gold/5 p-6 sm:p-8">
            <h2 className="mb-5 text-2xl sm:text-3xl">{texte("annuaire-regles")!.title}</h2>
            <RichText text={texte("annuaire-regles")!.content} />
          </div>
        </Section>)}
    </>
  );
}
