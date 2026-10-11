import { Link, useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Section, SectionHeading } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { Pagination } from "../components/ui/Pagination";
import { NewsletterForm } from "../features/newsletter/NewsletterForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getArticleCategories, listArticles } from "../services/api";
import { fmtDate } from "../utils/format";
import { Newspaper, Filter, Mail } from "lucide-react";

export default function News() {
  useSeo("Actualités – Urban Hub Connect", "Les nouvelles du réseau et des pôles de Diamniadio et du Lac Rose, les portraits d'acteurs et La Lettre du Hub.", undefined, true);
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "", page = Number(params.get("page")) || 1;
  const cats = useAsync(getArticleCategories);
  const list = useAsync(() => listArticles({ category__slug: category, page }), [category, page]);
  const go = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setParams(n); };
  const chip = (active: boolean) => `min-h-[44px] rounded-full border px-4 font-semibold ${active ? "border-green bg-green text-white" : "border-navy/25 hover:bg-offwhite"}`;
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Newspaper className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Actualités</h1>
          </div>
          <p className="mt-4 max-w-2xl text-xl text-white/85">
            Les nouvelles du réseau et des pôles de Diamniadio et du Lac Rose, les portraits d'acteurs et La Lettre du Hub.
          </p>
        </div>
      </section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-green" />
            <h3 className="text-lg font-bold text-navy">Filtrer par catégorie</h3>
          </div>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Catégories">
            <button className={chip(!category)} aria-pressed={!category} onClick={() => go("categorie", "")}>Toutes</button>
            {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("categorie", c.slug)}>{c.name}</button>)}
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Dernières actualités" intro="Restez informé de l'actualité du réseau." />
        <Async state={list} isEmpty={(d) => !d.results.length} empty="Aucune actualité n'est publiée pour le moment.">
          {(d) => (<>
            <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{d.results.map((a) => (
              <li key={a.slug} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-soft transition-all hover:border-green hover:shadow-lg">
                {a.featured_image && <img src={a.featured_image} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
                <div className="p-5">
                  <p className="text-sm text-navy/70">{a.category_name} · {fmtDate(a.published_at)}</p>
                  <h2 className="mt-2 text-xl font-bold leading-snug text-navy"><Link to={`/actualites/${a.slug}`} className="hover:text-green transition-colors">{a.title}</Link></h2>
                  {a.excerpt && <p className="mt-3 text-navy/75 line-clamp-3">{a.excerpt}</p>}
                </div>
              </li>))}</ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
          </>)}
        </Async>
      </Section>

      <Section tone="offwhite" id="lettre-du-hub">
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
            <Mail className="h-8 w-8" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-navy">La Lettre du Hub</h2>
          <p className="mt-3 max-w-3xl text-lg text-navy/75">Chaque mois, l'agenda du réseau, les nouveaux membres, les opportunités et les portraits d'acteurs du territoire.</p>
          <div className="mt-8">
            <NewsletterForm variant="full" />
          </div>
        </div>
      </Section>
    </>
  );
}
