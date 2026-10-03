import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { Pagination } from "../components/ui/Pagination";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { OrganizationCard } from "../features/directory/OrganizationCard";
import { useAsync } from "../hooks/useAsync";
import { useDebounce } from "../hooks/useDebounce";
import { useSeo } from "../hooks/useSeo";
import { getOrganizationFilters, listOrganizations } from "../services/api";

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
      <Section tone="navy" className="!py-12">
        <h1 className="text-3xl sm:text-5xl">Annuaire du réseau</h1>
        <p className="mt-3 max-w-2xl text-lg text-white/85">Les acteurs de Diamniadio et du Lac Rose, classés par collège, secteur et commission.</p>
        <Button to="/annuaire/referencer" variant="light" className="mt-6">Référencer mon organisation</Button>
      </Section>
      <Section>
        <form role="search" aria-label="Rechercher dans l'annuaire" onSubmit={(e) => e.preventDefault()} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="sm:col-span-2 lg:col-span-3">
            <label htmlFor="q" className="mb-1.5 block font-semibold">Rechercher un acteur</label>
            <input id="q" type="search" className="field" placeholder="Nom, mot-clé, quartier…" value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          {[["pole", "Pôle", filters.data?.poles.map((p) => ({ slug: p.value, name: p.label }))],
            ["college", "Collège", filters.data?.colleges], ["sector", "Secteur", filters.data?.sectors],
            ["commission", "Commission", filters.data?.commissions]].map(([key, label, options]) => (
            <div key={key as string}>
              <label htmlFor={key as string} className="mb-1.5 block font-semibold">{label as string}</label>
              <select id={key as string} className={select} value={get(key as string)} onChange={(e) => update({ [key as string]: e.target.value })}>
                <option value="">Tous</option>
                {(options as { slug: string; name: string }[] | undefined)?.map((o) => <option key={o.slug} value={o.slug}>{o.name}</option>)}
              </select>
            </div>
          ))}
          <label className="flex min-h-[44px] items-center gap-3 self-end font-semibold">
            <input type="checkbox" className="h-5 w-5 accent-green" checked={get("founder") === "true"} onChange={(e) => update({ founder: e.target.checked ? "true" : "" })} />
            Membres fondateurs
          </label>
        </form>

        <div className="mt-10" aria-live="polite">
          {loading ? <Loading label="Chargement de l'annuaire…" /> : error ? <ErrorState message={error} onRetry={retry} /> :
            !data?.results.length ? (
              <EmptyState message="Nous n'avons trouvé aucun acteur correspondant à votre recherche." action={<Button variant="secondary" onClick={reset}>Réinitialiser les filtres</Button>} />
            ) : (
              <>
                <p className="mb-5 font-semibold">{data.count} acteur{data.count > 1 ? "s" : ""}</p>
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
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
