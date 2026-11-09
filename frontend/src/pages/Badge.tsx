import { CalendarDays, CheckCircle2, MapPin, Trees, XCircle } from "lucide-react";
import { useParams } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { badgeQrUrl, getBadge } from "../services/api";
import { NotFound } from "./ErrorPage";

const fmtDay = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Dakar" }).format(new Date(`${iso}T12:00:00Z`));

/** Page « Mon badge » : le QR code à présenter à l'accueil. Le lien est secret ; la page n'est pas référencée. */
export default function Badge() {
  const { token = "" } = useParams();
  useSeo("Mon badge – Grand Week-End du Pôle", "Votre badge d'accès au Grand Week-End du Pôle.", undefined, true);
  const b = useAsync(() => getBadge(token), [token]);
  if (b.notFound) return <NotFound />;
  if (b.loading) return <Loading />;
  if (b.error || !b.data) return <Container className="py-16"><ErrorState message={b.error ?? "Badge indisponible."} onRetry={b.retry} /></Container>;
  const d = b.data;
  return (
    <div className="bg-offwhite py-6 sm:py-12">
      <Container className="max-w-md">
        <article className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-navy/10">
          <header className="bg-navy px-6 py-5 text-center text-white">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">Badge nominatif</p>
            <h1 className="mt-1 text-xl leading-tight sm:text-2xl">{d.event.title}</h1>
            {d.event.dates && <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/85"><CalendarDays className="h-4 w-4" aria-hidden />{d.event.dates}</p>}
            {d.event.location && <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-white/85"><MapPin className="h-4 w-4" aria-hidden />{d.event.location}</p>}
          </header>

          <div className="px-6 py-6 text-center">
            <p className="font-heading text-2xl font-bold leading-tight">{d.name}</p>
            {d.organization && <p className="mt-1 text-navy/70">{d.organization}</p>}

            {d.valid ? (
              <>
                <img src={badgeQrUrl(token)} alt={`QR code du badge de ${d.name}`} width={288} height={288}
                  className="mx-auto mt-5 aspect-square w-full max-w-[18rem] rounded-xl border border-navy/10 bg-white p-2" />
                <p className="mt-4 text-sm text-navy/75">Présentez ce QR code à l'accueil. Il est valable pour les deux journées.<br />
                  Astuce : faites une capture d'écran, il restera disponible sans connexion.</p>
              </>
            ) : (
              <p className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-red-50 p-4 font-semibold text-red-800">
                <XCircle className="h-5 w-5" aria-hidden />Cette inscription a été annulée : le badge n'est plus valable.</p>
            )}
          </div>

          <div className="space-y-4 border-t border-navy/10 px-6 py-5">
            {d.planting && (
              <p className="flex items-start gap-2 rounded-xl bg-green/10 p-3 text-sm font-semibold text-green">
                <Trees className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />Place réservée dans le convoi du reboisement (vendredi après-midi).</p>)}
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-navy/60">Vos temps du programme</h2>
              <ul className="mt-2 space-y-1.5 text-[15px]">
                {d.options.map((o) => <li key={o} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />{o}</li>)}
              </ul>
            </div>
            {!!d.checkins.length && (
              <p className="text-sm text-navy/70">Arrivée enregistrée : {d.checkins.map((c) => `${fmtDay(c.day)} à ${c.at}`).join(" · ")}.</p>)}
            <p className="text-sm text-navy/60">Le Gala du Pôle n'est pas inclus : accès sur invitation et par la billetterie commune avec The Ground.</p>
          </div>
        </article>
      </Container>
    </div>
  );
}
