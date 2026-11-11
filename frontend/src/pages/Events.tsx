import { ArrowRight, CalendarHeart, Coffee } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { Pagination } from "../components/ui/Pagination";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { EventCard } from "../features/events/EventCard";
import { EventRequestForm } from "../features/events/EventRequestForm";
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
  const chip = (a: boolean) => `inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${a ? "bg-navy text-white" : "bg-white text-navy/75 ring-1 ring-navy/15 hover:ring-navy/30"}`;
  return (
    <>
      <PageHero eyebrow="Agenda du réseau" title="Événements"
        intro="Découvrez l'agenda du réseau : After Work Connect, commissions, visites et Grand Week-End du Pôle." />

      <Section tone="offwhite" className="!pt-10 sm:!pt-12">
        <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div role="group" aria-label="Période" className="inline-grid w-full grid-cols-2 gap-1 rounded-xl bg-white p-1 ring-1 ring-navy/10 sm:w-auto">
            {[[false, "À venir"], [true, "Passés"]].map(([v, l]) => (
              <button key={String(l)} aria-pressed={past === v} onClick={() => go("quand", v ? "passes" : "")}
                className={`min-h-[40px] rounded-lg px-5 font-semibold transition-colors ${past === v ? "bg-green text-white" : "text-navy/70 hover:text-navy"}`}>{l as string}</button>))}
          </div>
          <div role="group" aria-label="Types d'événement" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
            <button className={chip(!category)} aria-pressed={!category} onClick={() => go("type", "")}>Tous les types</button>
            {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("type", c.slug)}>{c.name}</button>)}
          </div>
        </div>
        <Async state={list} isEmpty={(d) => !d.results.length} empty={past ? "Aucun événement passé à afficher." : "Aucun événement à venir pour le moment."}>
          {(d) => (<>
            <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{d.results.map((e) => <li key={e.slug} className="flex"><EventCard event={e} past={past} /></li>)}</ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
          </>)}
        </Async>
      </Section>

      <Section>
        <SectionHeading eyebrow="Nos formats" title="Les rendez-vous du réseau" />
        <div className="grid gap-5 lg:grid-cols-2">
          {gwe.data && (
            <article id="grand-week-end" className="card relative flex scroll-mt-24 flex-col overflow-hidden p-7 sm:p-9">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-gold" />
              <span className="icon-tile bg-gold/15 text-gold"><CalendarHeart className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-2xl sm:text-3xl">{gwe.data.title}</h3>
              <div className="mt-3 flex-1"><RichText text={gwe.data.content} lead /></div>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button to="/evenements/grand-week-end-du-pole-2026">Édition 2026<ArrowRight className="h-4 w-4" aria-hidden /></Button>
                <Button to="/partenaires" variant="secondary">Devenir partenaire</Button>
              </div>
            </article>)}
          {awc.data && (
            <article id="after-work-connect" className="card relative flex scroll-mt-24 flex-col overflow-hidden p-7 sm:p-9">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1.5 bg-green" />
              <span className="icon-tile"><Coffee className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-2xl sm:text-3xl">{awc.data.title}</h3>
              <div className="mt-3 flex-1"><RichText text={awc.data.content} lead /></div>
              <div className="mt-7"><Reveal label="Accueillir un After Work Connect" block><EventRequestForm kind="host_afterwork" /></Reveal></div>
            </article>)}
        </div>
      </Section>
    </>
  );
}
