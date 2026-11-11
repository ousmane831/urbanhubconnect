import { ArrowLeft, Calendar, User } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getArticle } from "../services/api";
import { fmtDate } from "../utils/format";
import { NotFound } from "./ErrorPage";

export default function NewsDetail() {
  const { slug = "" } = useParams();
  const { data: a, error, loading, notFound, retry } = useAsync(() => getArticle(slug), [slug]);
  useSeo(a?.meta_title || a?.title || "Actualité", a?.meta_description || a?.excerpt || undefined);
  if (notFound) return <NotFound />;
  if (loading) return <Loading />;
  if (error || !a) return <Container className="py-16"><ErrorState message={error ?? "Article indisponible."} onRetry={retry} /></Container>;
  return (
    <article>
      <header className={`relative overflow-hidden bg-navy text-white ${a.featured_image ? "pb-28 sm:pb-40" : ""}`}>
        <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]"><HexPattern className="text-white/[0.07]" /></div>
        <Container className="relative max-w-4xl py-10 sm:py-16">
          <Link to="/actualites" className="inline-flex min-h-[44px] items-center gap-2 text-sm font-semibold text-white/75 hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden />Toutes les actualités
          </Link>
          <p className="mt-4 inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] text-gold-light">{a.category_name}</p>
          <h1 className="mt-4 text-3xl leading-tight sm:text-5xl">{a.title}</h1>
          <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/70">
            <span className="inline-flex items-center gap-1.5"><Calendar className="h-4 w-4" aria-hidden />{fmtDate(a.published_at)}</span>
            {a.author && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" aria-hidden />{a.author}</span>}
          </p>
        </Container>
      </header>
      <Container className="max-w-4xl pb-16 sm:pb-24">
        {a.featured_image
          ? <img src={a.featured_image} alt="" className="-mt-20 aspect-video w-full rounded-3xl object-cover shadow-lift sm:-mt-32" />
          : <div className="h-10" />}
        <div className="mx-auto mt-10 max-w-prose sm:mt-14"><RichText text={a.content} lead /></div>
        <div className="mx-auto mt-14 max-w-prose border-t border-navy/10 pt-6">
          <Link to="/actualites" className="link inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" aria-hidden />Toutes les actualités</Link>
        </div>
      </Container>
    </article>
  );
}
