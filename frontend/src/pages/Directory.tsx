import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { OrganizationCard } from "../features/directory/OrganizationCard";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { getOrganizationFilters, listOrganizations } from "../services/api";
import { Search, Filter, Building2 } from "lucide-react";

const PAGE_SIZE = 12;

export default function Directory() {
  useSeo("Annuaire du réseau", "Recherchez les acteurs du réseau Urban Hub Connect par secteur, collège, pôle ou commission.");
  const [params, setParams] = useSearchParams();
  const get = (k: string) => params.get(k) ?? "";
  const [text, setText] = useState(get("search"));
  const debounced = useDebounce(text);
  const filters = useAsync(getOrganizationFilters);

  const update = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!("page" in changes)) next.delete("page");
    setParams(next, { replace: true });
  };
  useEffect(() => { if (debounced !== get("search")) update({ search: debounced }); /* eslint-disable-next-line */ }, [debounced]);

  const page = Number(get("page")) || 1;
  const query = { search: get("search"), pole: get("pole"), college: get("college"), sector: get("sector"),
    commission: get("commission"), founder: get("founder") === "true", page };
  const { data, error, loading, retry } = useAsync(() => listOrganizations(query), [params.toString()]);
  const reset = () => { setText(""); setParams({}, { replace: true }); };
  const select = "field";

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Building2 className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Annuaire du réseau</h1>
          </div>
          <p className="mt-4 max-w-2xl text-xl text-white/85">
            Trouvez les institutions, entreprises, écoles, associations et talents des pôles de Diamniadio et du Lac Rose : activités, offres, besoins et contacts
          </p>
          <Button to="/annuaire/referencer" variant="light" className="mt-6">Référencer mon organisation</Button>
        </div>
      </section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-green" />
            <h3 className="text-lg font-bold text-navy">Filtrer l'annuaire</h3>
          </div>
          <form role="search" aria-label="Rechercher dans l'annuaire" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 lg:col-span-3">
              <label htmlFor="q" className="mb-1.5 block font-semibold text-navy">Rechercher un acteur</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" />
                <input id="q" type="search" className="field pl-10" placeholder="Nom, mot-clé, quartier…" value={text} onChange={(e) => setText(e.target.value)} />
              </div>
            </div>
            {[["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))],
              ["college", "Collège", filters.data?.colleges], ["sector", "Secteur", filters.data?.sectors],
              ["commission", "Commission", filters.data?.commissions]].map(([key, label, options]) => (
              <div key={key as string}>
                <label htmlFor={key as string} className="mb-1.5 block font-semibold text-navy">{label as string}</label>
                <select id={key as string} className={select} value={get(key as string)} onChange={(e) => update({ [key as string]: e.target.value })}>
                  <option value="">Tous</option>
                  {(options as { slug: string; name: string }[] | undefined)?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
                </select>
              </div>
            ))}
            <label className="flex min-h-[44px] items-center gap-3 self-end font-semibold text-navy">
              <input type="checkbox" className="h-5 w-5 accent-green" checked={get("founder") === "true"} onChange={(e) => update({ founder: e.target.checked ? "true" : "" })} />
              Membres fondateurs
            </label>
          </form>
        </div>
      </Section>

      <Section>
        <div className="mt-10" aria-live="polite">
          {loading ? <Loading label="Chargement de l'annuaire…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
            !data?.results.length ? (
              <EmptyState message="Nous n'avons trouvé aucun acteur correspondant à votre recherche." action={<Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <>
                <p className="mb-5 font-semibold text-navy">{data.count} acteur{data.count > 1 ? "s" : ""}</p>
                <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {data.results.map((o) => <li key={o.slug} className="flex"><div className="flex w-full"><OrganizationCard org={o} /></div></li>)}
                </ul>
                <Pagination page={page} pages={Math.ceil(data.count / PAGE_SIZE)} onChange={(p) => { update({ page: String(p) }); window.scrollTo({ top: 0 }); }} />
              </>
            )}
        </div>
      </Section>
    </>
  );
}
