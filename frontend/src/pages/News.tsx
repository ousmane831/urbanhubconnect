import { Link, useSearchParams } from "react-router-dom";
import { Async } from "../components/ui/Async";
import { Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { Pagination } from "../components/ui/Pagination";
import { NewsletterForm } from "../features/newsletter/NewsletterForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getArticleCategories, listArticles } from "../services/api";
import { fmtDate } from "../utils/format";

export default function News() {
  useSeo("Actualités", "Les actualités du réseau Urban Hub Connect : le réseau, événements, visages du Pôle, opportunités.");
  const [params, setParams] = useSearchParams();
  const category = params.get("categorie") ?? "", page = Number(params.get("page")) || 1;
  const cats = useAsync(getArticleCategories);
  const list = useAsync(() => listArticles({ category__slug: category, page }), [category, page]);
  const go = (k: string, v: string) => { const n = new URLSearchParams(params); v ? n.set(k, v) : n.delete(k); if (k !== "page") n.delete("page"); setParams(n); };
  const chip = (active: boolean) => `min-h-[44px] rounded-full border px-4 font-semibold ${active ? "border-green bg-green text-white" : "border-navy/25 hover:bg-offwhite"}`;
  return (
    <>
      <PageHero title="Actualités" />
      <Section>
        <div className="mb-8 flex flex-wrap gap-2" role="group" aria-label="Catégories">
          <button className={chip(!category)} aria-pressed={!category} onClick={() => go("categorie", "")}>Toutes</button>
          {cats.data?.map((c) => <button key={c.slug} className={chip(category === c.slug)} aria-pressed={category === c.slug} onClick={() => go("categorie", c.slug)}>{c.name}</button>)}
        </div>
        <Async state={list} isEmpty={(d) => !d.results.length} empty="Aucune actualité n'est publiée pour le moment.">
          {(d) => (<>
            <ul className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">{d.results.map((a) => (
              <li key={a.slug} className="flex flex-col border-t-2 border-navy pt-4">
                {a.featured_image && <img src={a.featured_image} alt="" loading="lazy" className="mb-4 aspect-video w-full rounded object-cover" />}
                <p className="text-sm text-navy/70">{a.category_name} · {fmtDate(a.published_at)}</p>
                <h2 className="mt-1 text-xl leading-snug"><Link to={`/actualites/${a.slug}`} className="hover:underline">{a.title}</Link></h2>
                {a.excerpt && <p className="mt-2 text-navy/80">{a.excerpt}</p>}
              </li>))}</ul>
            <Pagination page={page} pages={Math.ceil(d.count / 12)} onChange={(p) => go("page", String(p))} />
          </>)}
        </Async>
      </Section>
      <Section tone="offwhite"><div className="max-w-xl"><NewsletterForm /></div></Section>
    </>
  );
}
