import { CalendarDays, MapPin } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getEvent } from "../services/api";
import { fmtRange } from "../utils/format";
import { NotFound } from "./ErrorPage";

export default function EventDetail() {
  const { slug = "" } = useParams();
  const { data: e, error, loading, notFound, retry } = useAsync(() => getEvent(slug), [slug]);
  useSeo(e?.title ?? "Événement", e?.description?.slice(0, 155) || undefined);
  if (notFound) return <NotFound />;
  if (loading) return <Loading />;
  if (error || !e) return <Container className="py-16"><ErrorState message={error ?? "Événement indisponible."} onRetry={retry} /></Container>;
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <Link to="/evenements" className="link">← Tous les événements</Link>
      <p className="mt-6 font-semibold text-green">{e.category_name}</p>
      <h1 className="mt-1 text-3xl sm:text-4xl">{e.title}</h1>
      <p className="mt-5 flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" aria-hidden />{fmtRange(e.start_date, e.end_date)}</p>
      {e.location && <p className="mt-1 flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" aria-hidden />{e.location}</p>}
      {e.image && <img src={e.image} alt="" className="mt-8 w-full rounded" />}
      {e.description && <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{e.description}</div>}
      {e.sections.map((s) => <section key={s.slug} className="mt-10"><h2 className="mb-4 text-2xl">{s.title}</h2><RichText text={s.body} /></section>)}
      {e.registration_url && <Button to={e.registration_url} target="_blank" rel="noopener noreferrer" className="mt-8">S'inscrire<span className="sr-only"> (nouvel onglet)</span></Button>}
    </Container>
  );
}
