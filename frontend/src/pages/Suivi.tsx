import { BadgeCheck, CircleHelp, FileSearch, Mail, Send, Sparkles, XCircle } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { ErrorMessage, SuccessMessage } from "../components/forms/FormMessage";
import { Container } from "../components/ui/Container";
import { Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { cancelDossier, completeDossier, getTracking, requestTrackingLink, type DossierRow } from "../services/api";
import { apiErrorMessage } from "../utils/errors";

const GWE = "/evenements/grand-week-end-du-pole-2026";

/** « Retrouver mon inscription ou mon dossier » : même réponse pour toute adresse (rien n'est révélé ici). */
function RequestLink({ title = "Retrouver mon inscription ou mon dossier" }: { title?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<{ busy: boolean; ok?: string; error?: string }>({ busy: false });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setState({ busy: false, error: "Saisissez votre adresse e-mail." });
    setState({ busy: true });
    try { setState({ busy: false, ok: await requestTrackingLink(email.trim()) }); }
    catch (err) { setState({ busy: false, error: apiErrorMessage(err) }); }
  };
  return (
    <section className="card p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-xl"><FileSearch className="h-5 w-5 text-green" aria-hidden />{title}</h2>
      <p className="mt-2 text-navy/75">Indiquez l'adresse e-mail utilisée lors de votre démarche : nous y envoyons un lien personnel, valable 14 jours, pour voir votre badge, l'état de vos dossiers, compléter ou annuler. Aucun compte n'est nécessaire.</p>
      {state.ok ? <SuccessMessage className="mt-4">{state.ok}</SuccessMessage> : (
        <form onSubmit={submit} noValidate className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1"><label htmlFor="suivi-email" className="mb-1.5 block font-semibold">Adresse e-mail</label>
            <input id="suivi-email" type="email" autoComplete="email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
          <button disabled={state.busy} className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-green px-5 font-semibold text-white hover:bg-green-2 disabled:opacity-60">
            <Send className="h-4 w-4" aria-hidden />{state.busy ? "Envoi…" : "Recevoir mon lien"}</button>
        </form>)}
      {state.error && <ErrorMessage className="mt-3">{state.error}</ErrorMessage>}
    </section>);
}

const HELP_FIELDS: FieldDef[] = [
  { name: "name", label: "Prénom et nom", type: "text", required: true },
  { name: "email", label: "E-mail", type: "email", required: true },
  { name: "message", label: "Votre demande", type: "textarea", required: true, hint: "Indiquez votre référence (GWE-…, BC-…) si vous l'avez. N'envoyez pas de pièce d'identité ni de document sensible." },
  { name: "consent", label: "J'accepte que mes données servent à traiter ma demande.", type: "consent" },
];

function Help() {
  const [motif, setMotif] = useState("");
  const MOTIFS = [
    ["badge", "Je n'ai pas reçu mon badge"], ["change", "Je veux modifier ou annuler mon inscription"], ["other", "Autre demande"],
  ] as const;
  return (
    <section id="aide" className="card scroll-mt-28 p-5 sm:p-7">
      <h2 className="flex items-center gap-2 text-xl"><CircleHelp className="h-5 w-5 text-green" aria-hidden />J'ai besoin d'aide</h2>
      <fieldset className="mt-4">
        <legend className="mb-2 font-semibold">Motif</legend>
        <div className="grid gap-2">{MOTIFS.map(([v, l]) => (
          <label key={v} className={`flex min-h-[48px] cursor-pointer items-center gap-3 rounded-lg border-2 px-4 ${motif === v ? "border-green bg-green/5" : "border-navy/15"}`}>
            <input type="radio" name="motif" value={v} checked={motif === v} onChange={() => setMotif(v)} className="h-5 w-5 accent-green" />{l}</label>))}
        </div>
      </fieldset>
      {motif === "badge" && <p className="mt-4 rounded-lg bg-offwhite p-4">Le plus rapide : demandez votre lien personnel ci-dessus. Il contient votre badge, à télécharger en PDF. Vérifiez aussi vos courriers indésirables.</p>}
      {motif === "change" && <p className="mt-4 rounded-lg bg-offwhite p-4">Demandez votre lien personnel ci-dessus : il permet d'annuler votre inscription en un clic. Pour corriger votre nom ou votre adresse, utilisez « Autre demande ».</p>}
      {motif === "other" && (
        <div className="mt-5">
          <ConfigForm endpoint="/contact/" extra={{ subject: "event_help" }} fields={HELP_FIELDS} submitLabel="Envoyer ma demande"
            successFallback="Merci, votre demande est transmise à l'équipe." />
        </div>)}
    </section>);
}

/** Page publique : formulaire « Retrouver mon dossier » et assistance. */
export function SuiviHome() {
  useSeo("Retrouver mon inscription – Grand Week-End du Pôle", "Retrouvez votre badge et l'état de vos dossiers du Grand Week-End du Pôle, sans compte.");
  const { hash } = useLocation();
  useEffect(() => { if (hash) document.getElementById(hash.slice(1))?.scrollIntoView?.(); }, [hash]);
  return (
    <div className="bg-offwhite py-10 sm:py-14">
      <Container className="max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green">Grand Week-End du Pôle</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Mon inscription et mes dossiers</h1>
          <p className="mt-3 text-navy/75">Pas encore inscrit ? <Link to={`${GWE}#inscription`} className="link">S'inscrire aux deux journées</Link></p>
        </header>
        <RequestLink />
        <Help />
      </Container>
    </div>);
}

const TONES: Record<string, string> = {
  accepted: "bg-green/10 text-green", incomplete: "bg-gold/15 text-navy", waitlist: "bg-purple/10 text-purple",
  rejected: "bg-red-50 text-red-800", cancelled: "bg-red-50 text-red-800",
};

function DossierCard({ token, d, onChange }: { token: string; d: DossierRow; onChange: (d: DossierRow, message: string) => void }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const act = async (fn: () => Promise<{ detail: string; dossier: DossierRow }>) => {
    setBusy(true); setError("");
    try { const r = await fn(); onChange(r.dossier, r.detail); }
    catch (e) { setError(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };
  const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 font-semibold";
  return (
    <li className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div><p className="font-heading text-lg font-bold">{d.type}</p><p className="text-sm text-navy/65">{d.reference}{d.name && ` · ${d.name}`}</p></div>
        <span className={`rounded-full px-3 py-1 text-sm font-bold ${TONES[d.status] ?? "bg-navy/5 text-navy"}`}>{d.status_label}</span>
      </div>
      {d.next_step && <p className="mt-3 text-navy/80">{d.next_step}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        {d.badge_url && <a href={d.badge_url} className={`${btn} bg-green text-white hover:bg-green-2`}><BadgeCheck className="h-4 w-4" aria-hidden />Voir et télécharger mon badge</a>}
        {d.visual_url && <a href={d.visual_url} className={`${btn} border border-gold/60 bg-gold/10 text-navy hover:bg-gold/20`}><Sparkles className="h-4 w-4 text-gold" aria-hidden />Créer mon visuel « J'y serai ! »</a>}
        {d.can_cancel && (
          <button type="button" disabled={busy} className={`${btn} border border-red-300 text-red-800 hover:bg-red-50 disabled:opacity-60`}
            onClick={() => window.confirm("Annuler votre inscription ? Votre badge ne sera plus valable.") && act(() => cancelDossier(token, d))}>
            <XCircle className="h-4 w-4" aria-hidden />Annuler mon inscription</button>)}
      </div>
      {d.can_complete && (
        <form className="mt-4 space-y-2" onSubmit={(e) => { e.preventDefault(); if (text.trim()) act(() => completeDossier(token, d, text.trim())); else setError("Saisissez le complément demandé."); }}>
          <label htmlFor={`c-${d.kind}-${d.id}`} className="block font-semibold">Compléter mon dossier</label>
          <textarea id={`c-${d.kind}-${d.id}`} rows={4} className="field" value={text} onChange={(e) => setText(e.target.value)} />
          <button disabled={busy} className={`${btn} bg-green text-white hover:bg-green-2 disabled:opacity-60`}>Envoyer le complément</button>
        </form>)}
      {error && <ErrorMessage className="mt-3">{error}</ErrorMessage>}
    </li>);
}

/** Espace de suivi ouvert par le lien personnel temporaire reçu par e-mail. Page non référencée. */
export default function Suivi() {
  const { token = "" } = useParams();
  useSeo("Mes dossiers – Grand Week-End du Pôle", "Suivi de vos dossiers du Grand Week-End du Pôle.", undefined, true);
  const t = useAsync(() => getTracking(token), [token]);
  const [rows, setRows] = useState<DossierRow[] | null>(null);
  const [notice, setNotice] = useState("");
  if (t.loading) return <Loading />;
  const list = rows ?? t.data?.dossiers ?? [];
  return (
    <div className="bg-offwhite py-10 sm:py-14">
      <Container className="max-w-3xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green">Grand Week-End du Pôle</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Mes dossiers</h1>
          {t.data && <p className="mt-2 flex items-center gap-2 text-navy/70"><Mail className="h-4 w-4" aria-hidden />{t.data.email}</p>}
        </header>
        {!t.data ? (
          <><ErrorMessage>Ce lien a expiré ou n'est pas valable. Demandez un nouveau lien ci-dessous.</ErrorMessage><RequestLink title="Recevoir un nouveau lien" /></>
        ) : (
          <>
            {notice && <SuccessMessage>{notice}</SuccessMessage>}
            {!list.length ? <p className="card p-5">Aucun dossier n'est lié à cette adresse.</p> : (
              <ul className="space-y-4">{list.map((d) => (
                <DossierCard key={`${d.kind}-${d.id}`} token={token} d={d}
                  onChange={(nd, msg) => { setRows(list.map((x) => (x.kind === nd.kind && x.id === nd.id ? nd : x))); setNotice(msg); }} />))}
              </ul>)}
            <p className="text-sm text-navy/60">Besoin d'aide ? <Link to="/suivi#aide" className="link">Formulaire d'assistance</Link></p>
          </>)}
      </Container>
    </div>);
}
