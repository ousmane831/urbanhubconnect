import { Link, useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { EventRequestForm } from "../features/events/EventRequestForm";
import { PageHero } from "../components/ui/PageHero";
import { Pagination } from "../components/ui/Pagination";
import { EventCard } from "../features/events/EventCard";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getEventCategories, getPage, listEvents } from "../services/api";

export default function Events() {
  useSeo("Événements – Urban Hub Connect", "Agenda du réseau : After Work Connect, commissions, visites et Grand Week-End du Pôle, le rendez-vous annuel de la communauté.", undefined, true);
  const [params, setParams] = useSearchParams();
  const category = params.get("type") ?? "", past = params.get("quand") === "passes", page = Number(params.get("page")) || 1;
  const cats = useAsync(getEventCategories);
  const awc = useAsync(() => getPage("after-work-connect"));
  const gwe = useAsync(() => getPage("grand-week-end-presentation"));
  const list = useAsync(() => listEvents({ category, upcoming: !past, page }), [category, past, page]);
  const go = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setParams(n); };
  const chip = (a: boolean) => `min-h-[44px] rounded-full border px-4 font-semibold ${a ? "border-green bg-green text-white" : "border-navy/25 hover:bg-offwhite"}`;
  return (
    <>
      <PageHero title="Événements" />
      <Section>
        <h2 className="mb-6 text-2xl sm:text-3xl">Agenda</h2>
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
      {awc.data && (
        <Section tone="offwhite" id="after-work-connect">
          <h2 className="mb-6 text-2xl sm:text-3xl">{awc.data.title}</h2>
          <RichText text={awc.data.content} lead />
          <div className="mt-8"><Reveal label="Accueillir un After Work Connect"><EventRequestForm kind="host_afterwork" /></Reveal></div>
        </Section>)}
      {gwe.data && (
        <Section id="grand-week-end">
          <h2 className="mb-6 text-2xl sm:text-3xl">{gwe.data.title}</h2>
          <RichText text={gwe.data.content} lead />
          <Button to="/evenements/grand-week-end-du-pole-2026" className="mt-8">Édition 2026</Button>
          <p className="mt-4 text-sm text-navy/70"><Link to="/partenaires" className="link">Devenir partenaire</Link></p>
        </Section>)}
    </>
  );
}
