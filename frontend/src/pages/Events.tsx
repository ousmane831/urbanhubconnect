import { useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { Pagination } from "../components/ui/Pagination";
import { EventCard } from "../features/events/EventCard";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getEventCategories, listEvents } from "../services/api";

export default function Events() {
  useSeo("Événements", "After Work Connect, commissions, visites et Grand Week-End du Pôle : les rendez-vous d'Urban Hub Connect.");
  const [params, setParams] = useSearchParams();
  const category = params.get("type") ?? "", past = params.get("quand") === "passes", page = Number(params.get("page")) || 1;
  const cats = useAsync(getEventCategories);
  const list = useAsync(() => listEvents({ category, upcoming: !past, page }), [category, past, page]);
  const go = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setParams(n); };
  const chip = (a: boolean) => `min-h-[44px] rounded-full border px-4 font-semibold ${a ? "border-green bg-green text-white" : "border-navy/25 hover:bg-offwhite"}`;
  return (
    <>
      <PageHero title="Événements" />
      <Section>
        <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Période">
          <button className={chip(!past)} aria-pressed={!past} onClick={() => go("quand", "")}>À venir</button>
          <button className={chip(past)} aria-pressed={past} onClick={() => go("quand", "passes")}>Passés</button>
        </div>
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Types d'événement">
          <button className={chip(!category)} aria-pressed={!category} onClick={() => go("type", "")}>Tous les types</button>
          {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("type", c.slug)}>{c.name}</button>)}
        </div>
        <Async state={list} isEmpty={(d) => !d.results.length} empty={past ? "Aucun événement passé à afficher." : "Aucun événement à venir pour le moment."}>
          {(d) => (<>
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">{d.results.map((e) => <li key={e.slug} className="flex"><div className="flex w-full"><EventCard event={e} past={past} /></div></li>)}</ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
          </>)}
        </Async>
      </Section>
    </>
  );
}
