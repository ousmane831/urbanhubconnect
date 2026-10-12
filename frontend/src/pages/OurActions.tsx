import { ArrowRight, Users, Target, Circle, Wrench } from "lucide-react";
import { Link } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getActions } from "../services/api";
import type { ActionItem } from "../types/api";

const NAV = [["commissions", "Les commissions"], ["programmes", "Les programmes"], ["cercles", "Les cercles du réseau"], ["outils", "Les outils du réseau"]];

function ItemLink({ link, name }: { link: string; name: string }) {
  if (!link) return null;
  const cls = "mt-3 inline-flex items-center gap-2 font-semibold text-green hover:text-green-2 transition-colors";
  const label = <>Découvrir<span className="sr-only"> : {name}</span><ArrowRight className="h-4 w-4" aria-hidden /></>;
  return link.startsWith("http") ? <a href={link} target="_blank" rel="noopener noreferrer" className={cls}>{label}</a> : <Link to={link} className={cls}>{label}</Link>;
}

function Items({ items }: { items: ActionItem[] }) {
  return (
    <ul className="grid gap-6 sm:grid-cols-2">
      {items.map((i) => (
        <li key={i.slug} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green opacity-5 transition-opacity group-hover:opacity-10" />
          <h3 className="text-xl font-bold text-navy">{i.name}</h3>
          <p className="mt-3 text-navy/75">{i.description}</p>
          <ItemLink link={i.link} name={i.name} />
        </li>))}
    </ul>
  );
}

const Heading = ({ title, subtitle, intro, icon }: { title: string; subtitle?: string; intro?: string; icon?: any }) => (
  <div className="mb-8 max-w-3xl">
    <div className="flex items-center gap-3 mb-4">
      {icon && <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">{icon}</div>}
      <h2 className="text-3xl font-bold text-navy">{title}</h2>
    </div>
    {subtitle && <p className="mt-3 font-heading text-xl font-bold text-green">{subtitle}</p>}
    {intro && <p className="mt-3 text-lg text-navy/75">{intro}</p>}
  </div>
);

export default function OurActions() {
  useSeo("Nos actions – commissions, programmes et outils d'Urban Hub Connect",
    "Huit commissions, huit programmes, six cercles et des outils permanents pour transformer les connexions en coopérations.", undefined, true);
  const state = useAsync(getActions);
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Nos actions</h1>
          <p className="mt-4 max-w-2xl text-xl text-white/85">
            Huit commissions, huit programmes, six cercles et des outils permanents pour transformer les connexions en coopérations.
          </p>
          <nav aria-label="Dans cette page" className="mt-8">
            <ul className="flex flex-wrap gap-2">
              {NAV.map(([id, label]) => <li key={id}><a href={`#${id}`} className="inline-flex min-h-[44px] items-center rounded-full border border-white/40 px-4 font-semibold hover:bg-white/10 transition-colors">{label}</a></li>)}
            </ul>
          </nav>
        </div>
      </section>

      <Async state={state}>
        {(d) => (
          <>
            <Section id="commissions">
              <Heading title="Les commissions" subtitle={d.pages.commissions?.title} intro={d.pages.commissions?.content} icon={<Users className="h-6 w-6" />} />
              <ul className="grid gap-6 sm:grid-cols-2">
                {d.commissions.map((c) => (
                  <li key={c.slug} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
                    <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-green opacity-5 transition-opacity group-hover:opacity-10" />
                    <h3 className="text-xl font-bold text-navy">{c.name}</h3>
                    {c.description && <p className="mt-3 text-navy/75">{c.description}</p>}
                    {c.actions && <p className="mt-3"><span className="font-semibold text-green">Actions : </span>{c.actions}</p>}
                  </li>))}
              </ul>
              {d.pages["commissions-fin"]?.content && <p className=" mt-10 max-w-3xl font-heading text-2xl font-bold text-navy">{d.pages["commissions-fin"].content}</p>}
              <Button to="/adherer" className="mt-6">Rejoindre une commission</Button>
            </Section>

            <Section id="programmes" tone="offwhite">
              <Heading title="Les programmes" subtitle={d.pages.programmes?.title} intro={d.pages.programmes?.content} icon={<Target className="h-6 w-6" />} />
              <Items items={d.programmes} />
            </Section>

            <Section id="cercles">
              <Heading title="Les cercles du réseau" intro={d.pages.cercles?.content} icon={<Circle className="h-6 w-6" />} />
              <Items items={d.cercles} />
            </Section>

            <Section id="outils" tone="offwhite">
              <Heading title="Les outils du réseau" intro={d.pages.outils?.content} icon={<Wrench className="h-6 w-6" />} />
              <Items items={d.outils} />
            </Section>
          </>)}
      </Async>
    </>
  );
}
