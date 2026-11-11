import { ArrowRight, Mail, Newspaper } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { Pagination } from "../components/ui/Pagination";
import { NewsletterForm } from "../features/newsletter/NewsletterForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getArticleCategories, listArticles } from "../services/api";
import type { Article } from "../types/api";
import { fmtDate } from "../utils/format";

function Cover({ a, className }: { a: Pick<Article, "featured_image">; className: string }) {
  return a.featured_image
    ? <img src={a.featured_image} alt="" loading="lazy" className={`${className} object-cover`} />
    : <div aria-hidden className={`${className} flex items-center justify-center bg-navy`}><Newspaper className="h-10 w-10 text-white/25" /></div>;
}

export default function News() {
  useSeo("Actualités – Urban Hub Connect", "Les nouvelles du réseau et des pôles de Diamniadio et du Lac Rose, les portraits d'acteurs et La Lettre du Hub.", undefined, true);
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "", page = Number(params.get("page")) || 1;
  const cats = useAsync(getArticleCategories);
  const list = useAsync(() => listArticles({ category__slug: category, page }), [category, page]);
  const go = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setParams(n); };
  const chip = (active: boolean) => `inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${active ? "bg-navy text-white" : "bg-white text-navy/75 ring-1 ring-navy/15 hover:ring-navy/30"}`;
  return (
    <>
      <PageHero eyebrow="Actualités" title="Les nouvelles du réseau"
        intro="Les nouvelles du réseau et des pôles de Diamniadio et du Lac Rose, les portraits d'acteurs et La Lettre du Hub." />

      <Section tone="offwhite" className="!pt-10 sm:!pt-12">
        <div role="group" aria-label="Catégories" className="-mx-4 mb-8 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden">
          <button className={chip(!category)} aria-pressed={!category} onClick={() => go("categorie", "")}>Toutes</button>
          {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("categorie", c.slug)}>{c.name}</button>)}
        </div>
        <Async state={list} isEmpty={(d) => !d.results.length} empty="Aucune actualité n'est publiée pour le moment.">
          {(d) => {
            const [first, ...rest] = d.results;
            const showFeature = page === 1 && !category;
            const cards = showFeature ? rest : d.results;
            return (<>
              {showFeature && first && (
                <article className="group card card-hover relative mb-6 grid overflow-hidden md:grid-cols-[1.2fr_1fr]">
                  <Cover a={first} className="aspect-video h-full w-full md:aspect-auto md:min-h-[20rem]" />
                  <div className="flex flex-col justify-center p-6 sm:p-9">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-green">{first.category_name} · {fmtDate(first.published_at)}</p>
                    <h2 className="mt-3 text-2xl leading-tight sm:text-3xl">
                      <Link to={`/actualites/${first.slug}`} className="after:absolute after:inset-0">{first.title}</Link>
                    </h2>
                    {first.excerpt && <p className="mt-3 line-clamp-4 text-navy/70">{first.excerpt}</p>}
                    <span className="mt-5 inline-flex items-center gap-1.5 font-semibold text-green">Lire l'article<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
                  </div>
                </article>)}
              {!!cards.length && (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{cards.map((a) => (
                  <li key={a.slug} className="group card card-hover relative flex flex-col overflow-hidden">
                    <Cover a={a} className="aspect-video w-full" />
                    <div className="flex flex-1 flex-col p-5 sm:p-6">
                      <p className="text-xs font-bold uppercase tracking-[0.14em] text-green">{a.category_name} · {fmtDate(a.published_at)}</p>
                      <h2 className="mt-2 text-lg leading-snug"><Link to={`/actualites/${a.slug}`} className="after:absolute after:inset-0">{a.title}</Link></h2>
                      {a.excerpt && <p className="mt-2 line-clamp-3 text-navy/70">{a.excerpt}</p>}
                    </div>
                  </li>))}</ul>)}
              <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
            </>);
          }}
        </Async>
      </Section>

      <Section id="lettre-du-hub">
        <div className="grid gap-8 rounded-3xl bg-navy p-6 text-white sm:p-12 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <span className="icon-tile bg-white/10 text-gold-light"><Mail className="h-5 w-5" aria-hidden /></span>
            <h2 className="mt-5 text-3xl text-white">La Lettre du Hub</h2>
            <p className="mt-3 text-lg text-white/75">Chaque mois, l'agenda du réseau, les nouveaux membres, les opportunités et les portraits d'acteurs du territoire.</p>
          </div>
          <div className="rounded-2xl bg-white p-5 text-navy sm:p-7"><NewsletterForm variant="full" /></div>
        </div>
      </Section>
    </>
  );
}
