import { ArrowLeft, CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
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
    <>
      <PageHero eyebrow={e.category_name} title={e.title}>
        {e.registration_url && <Button to={e.registration_url} variant="light" size="lg" target="_blank" rel="noopener noreferrer">S'inscrire<span className="sr-only"> (nouvel onglet)</span></Button>}
      </PageHero>
      <Container className="grid gap-10 py-12 sm:py-16 lg:grid-cols-[1.6fr_1fr] lg:gap-14">
        <div className="min-w-0">
          <Link to="/evenements" className="link inline-flex items-center gap-2"><ArrowLeft className="h-4 w-4" aria-hidden />Tous les événements</Link>
          {e.image && <img src={e.image} alt="" className="mt-6 aspect-video w-full rounded-2xl object-cover" />}
          {e.description && <div className="mt-8 whitespace-pre-line text-lg leading-relaxed text-navy/85">{e.description}</div>}
          {e.sections.map((s) => <section key={s.slug} className="mt-10"><h2 className="mb-4 text-2xl">{s.title}</h2><RichText text={s.body} /></section>)}
        </div>
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <dl className="card divide-y divide-navy/10">
            <div className="flex gap-4 p-5"><span className="icon-tile"><CalendarDays className="h-5 w-5" aria-hidden /></span>
              <div><dt className="text-sm font-bold uppercase tracking-wider text-navy/55">Date</dt><dd className="mt-1 font-semibold">{fmtRange(e.start_date, e.end_date)}</dd></div></div>
            {e.location && <div className="flex gap-4 p-5"><span className="icon-tile"><MapPin className="h-5 w-5" aria-hidden /></span>
              <div><dt className="text-sm font-bold uppercase tracking-wider text-navy/55">Lieu</dt><dd className="mt-1 font-semibold">{e.location}</dd></div></div>}
            {e.audience && <div className="flex gap-4 p-5"><span className="icon-tile"><UsersRound className="h-5 w-5" aria-hidden /></span>
              <div><dt className="text-sm font-bold uppercase tracking-wider text-navy/55">Public</dt><dd className="mt-1 font-semibold">{e.audience}</dd></div></div>}
          </dl>
          {e.registration_url && <Button to={e.registration_url} size="lg" className="mt-4 w-full" target="_blank" rel="noopener noreferrer">S'inscrire<span className="sr-only"> (nouvel onglet)</span></Button>}
        </aside>
      </Container>
    </>
  );
}
