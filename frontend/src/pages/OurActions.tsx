import { ArrowRight, CircleDot, Rocket, UsersRound, Wrench, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { CtaBand } from "../components/ui/Card";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getActions } from "../services/api";
import type { ActionItem } from "../types/api";

const NAV: [string, string, LucideIcon][] = [
  ["commissions", "Les commissions", UsersRound], ["programmes", "Les programmes", Rocket],
  ["cercles", "Les cercles du réseau", CircleDot], ["outils", "Les outils du réseau", Wrench],
];

function ItemLink({ link, name }: { link: string; name: string }) {
  if (!link) return null;
  const cls = "mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green hover:text-green-2";
  const label = <>Découvrir<span className="sr-only"> : {name}</span><ArrowRight className="h-4 w-4" aria-hidden /></>;
  return link.startsWith("http") ? <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a> : <Link to={link} className={cls}>{label}</Link>;
}

function Items({ items, icon: Icon }: { items: ActionItem[]; icon: LucideIcon }) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((i) => (
        <li key={i.slug} className="card flex flex-col p-6 sm:p-7">
          <span className="icon-tile"><Icon className="h-5 w-5" aria-hidden /></span>
          <h3 className="mt-5 text-xl leading-snug">{i.name}</h3>
          <p className="mt-2 flex-1 leading-relaxed text-navy/70">{i.description}</p>
          <ItemLink link={i.link} name={i.name} />
        </li>))}
    </ul>
  );
}

export default function OurActions() {
  useSeo("Nos actions – commissions, programmes et outils d'Urban Hub Connect",
    "Huit commissions, huit programmes, six cercles et des outils permanents pour transformer les connexions en coopérations.", undefined, true);
  const state = useAsync(getActions);
  return (
    <>
      <PageHero eyebrow="Le réseau en action" title="Nos actions"
        intro="Huit commissions, huit programmes, six cercles et des outils permanents pour transformer les connexions en coopérations." />
      <nav aria-label="Dans cette page" className="sticky top-16 z-30 border-b border-navy/10 bg-white/95 backdrop-blur">
        <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
          {NAV.map(([id, label, Icon]) => (
            <li key={id}><a href={`#${id}`} className="inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 text-sm font-semibold text-navy/75 hover:bg-offwhite hover:text-navy">
              <Icon className="h-4 w-4 text-green" aria-hidden />{label}</a></li>))}
        </ul>
      </nav>

      <Async state={state}>
        {(d) => (
          <>
            <Section id="commissions">
              <SectionHeading eyebrow="Coopérer" title={d.pages.commissions?.title || "Les commissions"} intro={d.pages.commissions?.content} />
              <ol className="grid gap-5 md:grid-cols-2">
                {d.commissions.map((c, i) => (
                  <li key={c.slug} className="card flex gap-5 p-6 sm:p-7">
                    <span className="font-heading text-3xl font-extrabold leading-none text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h3 className="text-xl leading-snug">{c.name}</h3>
                      {c.description && <p className="mt-2 leading-relaxed text-navy/70">{c.description}</p>}
                      {c.actions && <p className="mt-3 rounded-lg bg-offwhite px-3 py-2 text-sm"><span className="font-semibold text-green">Actions : </span>{c.actions}</p>}
                    </div>
                  </li>))}
              </ol>
              {d.pages["commissions-fin"]?.content && (
                <p className="mt-12 max-w-3xl border-l-4 border-gold pl-5 font-heading text-2xl font-bold leading-snug">{d.pages["commissions-fin"].content}</p>)}
              <Button to="/adherer" size="lg" className="mt-8">Rejoindre une commission<ArrowRight className="h-5 w-5" aria-hidden /></Button>
            </Section>

            <Section id="programmes" tone="offwhite">
              <SectionHeading eyebrow="Programmes" title={d.pages.programmes?.title || "Les programmes"} intro={d.pages.programmes?.content} />
              <Items items={d.programmes} icon={Rocket} />
            </Section>

            <Section id="cercles">
              <SectionHeading eyebrow="Entre pairs" title="Les cercles du réseau" intro={d.pages.cercles?.content} />
              <Items items={d.cercles} icon={CircleDot} />
            </Section>

            <Section id="outils" tone="offwhite">
              <SectionHeading eyebrow="Au quotidien" title="Les outils du réseau" intro={d.pages.outils?.content} />
              <Items items={d.outils} icon={Wrench} />
            </Section>
          </>)}
      </Async>

      <CtaBand title="Envie de vous impliquer ?" text="Rejoignez une commission, un cercle ou un programme en devenant membre du réseau.">
        <Button to="/adherer" variant="light" size="lg">Adhérer au réseau<ArrowRight className="h-5 w-5" aria-hidden /></Button>
      </CtaBand>
    </>
  );
}
