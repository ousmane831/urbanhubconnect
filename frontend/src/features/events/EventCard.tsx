import { CalendarDays, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import type { EventItem } from "../../types/api";
import { fmtRange } from "../../utils/format";

export function EventCard({ event: e, past = false }: { event: EventItem; past?: boolean }) {
  return (
    <article className="flex flex-col rounded-md border border-navy/15 bg-white p-5 shadow-soft">
      <p className="text-sm font-semibold text-green">{e.category_name}</p>
      <h2 className="mt-1 text-xl leading-snug"><Link to={`/evenements/${e.slug}`} className="hover:underline">{e.title}</Link></h2>
      <p className="mt-3 flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0" aria-hidden />{fmtRange(e.start_date, e.end_date)}</p>
      {e.location && <p className="mt-1 flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0" aria-hidden />{e.location}</p>}
      {e.audience && <p className="mt-1 text-sm text-navy/75">Public : {e.audience}</p>}
      <div className="mt-5 flex flex-wrap gap-3">
        <Button to={`/evenements/${e.slug}`} variant="secondary">Détails</Button>
        {!past && e.registration_url && <Button to={e.registration_url} target="_blank" rel="noopener noreferrer">S'inscrire<span className="sr-only"> (nouvel onglet)</span></Button>}
      </div>
    </article>
  );
}
