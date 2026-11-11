import { ArrowRight, CalendarDays, MapPin, UsersRound } from "lucide-react";
import { Link } from "react-router-dom";
import type { EventItem } from "../../types/api";
import { fmtRange } from "../../utils/format";

const DAY = new Intl.DateTimeFormat("fr-FR", { day: "numeric", timeZone: "Africa/Dakar" });
const MONTH = new Intl.DateTimeFormat("fr-FR", { month: "short", timeZone: "Africa/Dakar" });

export function EventCard({ event: e, past = false }: { event: EventItem; past?: boolean }) {
  const start = new Date(e.start_date);
  return (
    <article className={`group card card-hover relative flex w-full flex-col p-6 ${past ? "opacity-90" : ""}`}>
      <div className="flex items-start gap-4">
        <div className={`flex w-16 shrink-0 flex-col items-center rounded-xl py-2 ${past ? "bg-navy/5 text-navy/70" : "bg-navy text-white"}`} aria-hidden>
          <span className="font-heading text-2xl font-extrabold leading-none">{DAY.format(start)}</span>
          <span className="mt-1 text-xs font-semibold uppercase tracking-wider">{MONTH.format(start).replace(".", "")}</span>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-green">{e.category_name}</p>
          <h2 className="mt-1 text-lg leading-snug">
            <Link to={`/evenements/${e.slug}`} className="after:absolute after:inset-0 after:rounded-2xl">{e.title}</Link>
          </h2>
        </div>
      </div>
      <ul className="mt-5 flex-1 space-y-1.5 text-[15px] text-navy/75">
        <li className="flex items-center gap-2"><CalendarDays className="h-4 w-4 shrink-0 text-navy/40" aria-hidden />{fmtRange(e.start_date, e.end_date)}</li>
        {e.location && <li className="flex items-center gap-2"><MapPin className="h-4 w-4 shrink-0 text-navy/40" aria-hidden />{e.location}</li>}
        {e.audience && <li className="flex items-center gap-2"><UsersRound className="h-4 w-4 shrink-0 text-navy/40" aria-hidden />Public : {e.audience}</li>}
      </ul>
      <div className="mt-5 flex items-center justify-between border-t border-navy/10 pt-4">
        <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-green">Voir le détail<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
        {!past && e.registration_url && (
          <a href={e.registration_url} target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex min-h-[40px] items-center rounded-lg bg-green px-4 text-sm font-semibold text-white hover:bg-green-2">
            S'inscrire<span className="sr-only"> (nouvel onglet)</span></a>)}
      </div>
    </article>
  );
}
