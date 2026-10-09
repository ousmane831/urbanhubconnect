import { Link, useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { Section, SectionHeading } from "../components/ui/Container";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { EventRequestForm } from "../features/events/EventRequestForm";
import { HexPattern } from "../components/ui/HexPattern";
import { Pagination } from "../components/ui/Pagination";
import { EventCard } from "../features/events/EventCard";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getEventCategories, getPage, listEvents } from "../services/api";
import { Calendar, Filter } from "lucide-react";

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
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Calendar className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Événements</h1>
          </div>
          <p className="mt-4 max-w-2xl text-xl text-white/85">
            Découvrez l'agenda du réseau : After Work Connect, commissions, visites et Grand Week-End du Pôle.
          </p>
        </div>
      </section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-green" />
            <h3 className="text-lg font-bold text-navy">Filtrer les événements</h3>
          </div>
          <div className="mb-4 flex flex-wrap gap-2" role="group" aria-label="Période">
            <button className={chip(!past)} aria-pressed={!past} onClick={() => go("quand", "")}>À venir</button>
            <button className={chip(past)} aria-pressed={past} onClick={() => go("quand", "passes")}>Passés</button>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Types d'événement">
            <button className={chip(!category)} aria-pressed={!category} onClick={() => go("type", "")}>Tous les types</button>
            {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("type", c.slug)}>{c.name}</button>)}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Agenda" intro="Les prochains rendez-vous du réseau." />
        <Async state={list} isEmpty={(d) => !d.results.length} empty={past ? "Aucun événement passé à afficher." : "Aucun événement à venir pour le moment."}>
          {(d) => (<>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{d.results.map((e) => <li key={e.slug} className="flex"><div className="flex w-full"><EventCard event={e} past={past} /></div></li>)}</ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
          </>)}
        </Async>
      </Section>

      {awc.data && (
        <Section tone="offwhite" id="after-work-connect">
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
              <Calendar className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-navy">{awc.data.title}</h2>
            <RichText text={awc.data.content} lead />
            <div className="mt-8"><Reveal label="Accueillir un After Work Connect"><EventRequestForm kind="host_afterwork" /></Reveal></div>
          </div>
        </Section>)}

      {gwe.data && (
        <Section id="grand-week-end">
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gold opacity-10" />
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-gold text-white">
              <Calendar className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-3xl font-bold text-navy">{gwe.data.title}</h2>
            <RichText text={gwe.data.content} lead />
            <div className="mt-8 flex flex-wrap gap-4">
              <Button to="/evenements/grand-week-end-du-pole-2026">Édition 2026</Button>
              <Link to="/partenaires" className="inline-flex items-center px-6 py-2.5 rounded-md border border-navy/15 font-semibold text-navy hover:bg-offwhite transition-colors">Devenir partenaire</Link>
            </div>
          </div>
        </Section>)}
    </>
  );
}
