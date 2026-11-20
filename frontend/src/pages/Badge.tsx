import { CalendarDays, CheckCircle2, Download, MapPin, Send, ShieldCheck, Sparkles, XCircle } from "lucide-react";
import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { badgeImageUrl, badgePdfUrl, getBadge, resendBadge, type BadgeEvent } from "../services/api";
import { apiErrorMessage } from "../utils/errors";
import { NotFound } from "./ErrorPage";

const fmtDay = (iso: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Africa/Dakar" }).format(new Date(`${iso}T12:00:00Z`));

function Header({ event, label }: { event: BadgeEvent; label: string }) {
  return (
    <header className="bg-navy px-6 py-5 text-center text-white">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">{label}</p>
      <h1 className="mt-1 text-xl leading-tight sm:text-2xl">{event.title}</h1>
      {event.dates && <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-white/85"><CalendarDays className="h-4 w-4" aria-hidden />{event.dates}</p>}
      {event.location && <p className="mt-0.5 flex items-center justify-center gap-1.5 text-sm text-white/85"><MapPin className="h-4 w-4" aria-hidden />{event.location}</p>}
    </header>);
}

/** Ce que voit une personne qui scanne le QR code avec un téléphone ordinaire : aucune identité. */
function PublicView({ token, event }: { token: string; event: BadgeEvent }) {
  const [state, setState] = useState<{ busy: boolean; text: string; ok: boolean }>({ busy: false, text: "", ok: true });
  const resend = async () => {
    setState({ busy: true, text: "", ok: true });
    try { setState({ busy: false, text: await resendBadge(token), ok: true }); }
    catch (e) { setState({ busy: false, text: apiErrorMessage(e), ok: false }); }
  };
  return (
    <>
      <Header event={event} label="Badge d'accès" />
      <div className="space-y-4 px-6 py-6 text-center">
        <ShieldCheck className="mx-auto h-10 w-10 text-green" aria-hidden />
        <p className="font-semibold">Ce badge est contrôlé à l'accueil de l'événement.</p>
        <p className="text-sm text-navy/70">Pour protéger les participants, aucune information personnelle n'est affichée ici.</p>
        <div className="border-t border-navy/10 pt-4">
          <p className="text-sm text-navy/75">C'est votre badge ? Recevez de nouveau votre lien personnel à l'adresse e-mail utilisée lors de l'inscription.</p>
          <button type="button" onClick={resend} disabled={state.busy}
            className="mt-3 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy/20 px-5 font-semibold hover:bg-offwhite disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden />{state.busy ? "Envoi…" : "Recevoir mon badge par e-mail"}</button>
          {state.text && <p role="status" className={`mt-3 text-sm font-semibold ${state.ok ? "text-green" : "text-red-800"}`}>{state.text}</p>}
        </div>
      </div>
    </>);
}

/** Page « Mon badge » : le titulaire y accède par son lien personnel (…/badge/<code>?cle=<clé>). Page non référencée. */
export default function Badge() {
  const { token = "" } = useParams();
  const [params] = useSearchParams();
  const key = params.get("cle");
  useSeo("Mon badge – Grand Week-End du Pôle", "Votre badge d'accès au Grand Week-End du Pôle.", undefined, true);
  const b = useAsync(() => getBadge(token, key), [token, key]);
  if (b.notFound) return <NotFound />;
  if (b.loading) return <Loading />;
  if (b.error || !b.data) return <Container className="py-16"><ErrorState message={b.error ?? "Badge indisponible."} onRetry={b.retry} /></Container>;
  const d = b.data;
  return (
    <div className="bg-offwhite py-6 sm:py-12">
      <Container className="max-w-md">
        <article className="overflow-hidden rounded-3xl bg-white shadow-lg ring-1 ring-navy/10">
          {!d.owner || !key ? <PublicView token={token} event={d.event} /> : (
            <>
              <Header event={d.event} label="Badge nominatif" />
              <div className="px-6 py-6 text-center">
                {d.valid ? (
                  <>
                    {/* Même image que dans l'e-mail et sur le badge imprimé remis à l'accueil */}
                    <img src={badgeImageUrl(token, key)} alt={`Badge de ${d.name}${d.job_title ? `, ${d.job_title}` : ""}${d.organization ? `, ${d.organization}` : ""}`}
                      width={970} height={1400} className="mx-auto h-auto w-full max-w-[20rem] rounded-xl border border-navy/10 bg-white shadow-sm" />
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      <a href={badgePdfUrl(token, key)} download
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-green px-5 font-semibold text-white hover:bg-green-2">
                        <Download className="h-4 w-4" aria-hidden />Télécharger mon badge (PDF)</a>
                      <a href={badgeImageUrl(token, key, true)} download
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy/20 px-4 font-semibold hover:bg-offwhite">Image (PNG)</a>
                    </div>
                    <p className="mt-4 text-sm text-navy/75">Présentez ce badge à l'accueil, sur votre téléphone ou imprimé. Il est valable pour les deux journées.</p>
                    <p className="mt-1 text-sm font-semibold text-navy/70">Référence : {d.reference} · {d.category}</p>
                    <Link to="/suivi" className="mt-2 inline-block text-sm font-semibold text-green hover:underline">Retrouver ou annuler mon inscription</Link>
                  </>
                ) : (
                  <><p className="font-heading text-2xl font-bold leading-tight">{d.name}</p>
                  <p className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-red-50 p-4 font-semibold text-red-800">
                    <XCircle className="h-5 w-5" aria-hidden />Inscription {d.status.toLowerCase()} : ce badge n'est pas valable.</p></>
                )}
              </div>

              <div className="space-y-4 border-t border-navy/10 px-6 py-5">
                {!!d.days.length && (
                  <div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-navy/60">Jours prévus</h2>
                    <ul className="mt-2 space-y-1.5 text-[15px]">
                      {d.days.map((o) => <li key={o} className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />{o}</li>)}
                    </ul>
                  </div>)}
                {!!d.checkins.length && (
                  <p className="text-sm text-navy/70">Arrivée enregistrée : {d.checkins.map((c) => `${fmtDay(c.day)} à ${c.at}`).join(" · ")}.</p>)}
                <p className="text-sm text-navy/60">Le badge ne donne pas accès au Gala du Pôle : accès sur invitation et par la billetterie commune avec The Ground.</p>
                {d.confirmed && (
                  <Link to={`/evenements/grand-week-end-du-pole-2026?badge=${encodeURIComponent(token)}&cle=${encodeURIComponent(key)}#business-connect`}
                    className="flex min-h-[44px] items-center justify-center rounded-lg border border-navy/20 px-5 font-semibold hover:bg-offwhite">
                    Demander des rendez-vous Business Connect</Link>)}
                {d.confirmed && (
                  <div className="rounded-xl bg-offwhite p-4">
                    <Link to={`/jy-serai?badge=${encodeURIComponent(token)}&cle=${encodeURIComponent(key)}`}
                      className="flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-gold/60 bg-gold/10 px-5 font-semibold text-navy hover:bg-gold/20">
                      <Sparkles className="h-4 w-4 text-gold" aria-hidden />Créer mon visuel « J'y serai ! »</Link>
                    <p className="mt-2 text-center text-xs text-navy/60">Facultatif. Visuel de communication : il ne vaut pas badge d'accès.</p>
                  </div>)}
              </div>
            </>)}
        </article>
      </Container>
    </div>
  );
}
