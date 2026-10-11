import { Link, useParams } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { HexPattern } from "../components/ui/HexPattern";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getArticle } from "../services/api";
import { fmtDate } from "../utils/format";
import { NotFound } from "./ErrorPage";
import { ArrowLeft, Calendar, User } from "lucide-react";

export default function NewsDetail() {
  const { slug = "" } = useParams();
  const { data: a, error, loading, notFound, retry } = useAsync(() => getArticle(slug), [slug]);
  useSeo(a?.meta_title || a?.title || "Actualité", a?.meta_description || a?.excerpt || undefined);
  if (notFound) return <NotFound />;
  if (loading) return <Loading />;
  if (error || !a) return <Container className="py-16"><ErrorState message={error ?? "Article indisponible."} onRetry={retry} /></Container>;
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <Link to="/actualites" className="inline-flex items-center gap-2 text-white/85 hover:text-white transition-colors mb-6">
            <ArrowLeft className="h-5 w-5" />
            Toutes les actualités
          </Link>
          <div className="flex flex-wrap items-center gap-3 text-sm text-white/70 mb-4">
            <span className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {fmtDate(a.published_at)}
            </span>
            {a.author && (
              <span className="inline-flex items-center gap-1.5">
                <User className="h-4 w-4" />
                {a.author}
              </span>
            )}
            <span className="px-3 py-1 rounded-full bg-white/10 text-white">{a.category_name}</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">{a.title}</h1>
        </div>
      </section>

      <Container className="max-w-4xl py-12 sm:py-16">
        {a.featured_image && (
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 shadow-soft mb-8">
            <img src={a.featured_image} alt="" className="w-full aspect-video object-cover" />
          </div>
        )}
        <div className="prose prose-lg max-w-none">
          <RichText text={a.content} />
        </div>
      </Container>
    </>
  );
}
