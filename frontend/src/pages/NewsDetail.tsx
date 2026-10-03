import { Link, useParams } from "react-router-dom";
import { Container } from "../components/ui/Container";
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
    <Container className="max-w-3xl py-12 sm:py-16">
      <Link to="/actualites" className="link">← Toutes les actualités</Link>
      <p className="mt-6 text-sm text-navy/70">{a.category_name} · {fmtDate(a.published_at)}{a.author && ` · ${a.author}`}</p>
      <h1 className="mt-2 text-3xl sm:text-4xl">{a.title}</h1>
      {a.featured_image && <img src={a.featured_image} alt="" className="mt-8 w-full rounded" />}
      <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{a.content}</div>
    </Container>
  );
}
