import { CalendarDays, Download, MapPin } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Button } from "../components/ui/Button";
import { Container, Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { EventRequestForm } from "../features/events/EventRequestForm";
import { PartnerBand } from "../features/events/PartnerBand";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getAwardCategories, getDocuments, getEvent, getVolunteerMissions } from "../services/api";
import type { EventDetail } from "../types/api";
import { fmtDate, fmtDays } from "../utils/format";
import { parseBlocks } from "../utils/richtext";
import { NotFound } from "./ErrorPage";

const SLUG = "grand-week-end-du-pole-2026";
const SIGNATURE = "Deux pôles, un seul élan.";
const Block = ({ id, title, tone, children }: { id: string; title: string; tone?: "offwhite"; children: ReactNode }) => (
  <Section id={id} tone={tone}><h2 className="mb-6 text-2xl sm:text-3xl">{title}</h2><div className="space-y-6">{children}</div></Section>);
const DocLink = ({ doc, label, missing }: { doc?: { file: string }; label: string; missing?: string }) =>
  doc ? <a href={doc.file} download className="link inline-flex items-center gap-2 font-semibold"><Download className="h-4 w-4" aria-hidden />{label}<span className="sr-only"> (PDF)</span></a>
    : missing ? <p className="text-navy/65">{missing}</p> : null;

type Section = EventDetail["sections"][number];

/** Deux onglets (vendredi, samedi). Les horaires et titres des panels se modifient dans l'admin (blocs « programme-… »). */
function ProgramTabs({ days }: { days: Section[] }) {
  const [active, setActive] = useState(0);
  if (!days.length) return null;
  const current = days[Math.min(active, days.length - 1)];
  return (
    <div>
      <div role="tablist" aria-label="Jours du programme" className="flex flex-wrap gap-2 border-b border-navy/15">
        {days.map((d, i) => (
          <button key={d.slug} role="tab" id={`tab-${d.slug}`} aria-controls={`panel-${d.slug}`} aria-selected={i === active} tabIndex={i === active ? 0 : -1}
            onClick={() => setActive(i)}
            onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = (i + (e.key === "ArrowRight" ? 1 : days.length - 1)) % days.length; setActive(n); document.getElementById(`tab-${days[n].slug}`)?.focus(); } }}
            className={`-mb-px min-h-[44px] border-b-4 px-4 py-2 text-left font-semibold ${i === active ? "border-green text-navy" : "border-transparent text-navy/65 hover:text-navy"}`}>
            {d.title}
          </button>))}
      </div>
      <div role="tabpanel" id={`panel-${current.slug}`} aria-labelledby={`tab-${current.slug}`} className="pt-6"><RichText text={current.body} /></div>
    </div>
  );
}

/** Bloc « Nom | texte » rendu en cartes (rubrique « Les expériences du week-end »). */
function Cards({ text }: { text: string }) {
  const rows = parseBlocks(text).flatMap((b) => (b.type === "table" ? b.rows : []));
  if (!rows.length) return <RichText text={text} />;
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([name, body]) => (
        <li key={name} className="rounded-xl border border-navy/10 bg-white p-6 shadow-soft">
          <h3 className="text-lg font-bold text-navy">{name}</h3><p className="mt-2 text-navy/80">{body}</p>
        </li>))}
    </ul>
  );
}

/** Présentation : thème mis en avant, objectifs en chiffres (jamais présentés comme des résultats). */
function Presentation({ text }: { text: string }) {
  const paras = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  const theme = paras.find((p) => p.startsWith("Thème"));
  const goals = paras.find((p) => p.startsWith("Nos objectifs"));
  const rest = paras.filter((p) => p !== theme && p !== goals).join("\n\n");
  const [themeLabel, themeText] = theme ? theme.split(/\s:\s(.+)/s) : [];
  return (
    <div className="space-y-8">
      {theme && <figure className="max-w-3xl border-l-4 border-gold pl-5"><figcaption className="text-sm font-semibold uppercase tracking-wider text-navy/65">{themeLabel}</figcaption>
        <p className="mt-2 font-heading text-xl font-bold sm:text-2xl">{themeText}</p></figure>}
      {rest && <RichText text={rest} />}
      {goals && (
        <div><h3 className="text-lg font-bold">Nos objectifs</h3>
          <ul className="mt-3 flex flex-wrap gap-3">{goals.replace(/^Nos objectifs\s*:\s*/, "").split("·").map((g) => (
            <li key={g} className="rounded-full border border-green/40 bg-green/5 px-4 py-2 font-semibold">{g.trim()}</li>))}</ul>
        </div>)}
    </div>
  );
}

export default function GrandWeekEnd() {
  const ev = useAsync(() => getEvent(SLUG));
  const awards = useAsync(getAwardCategories);
  const missions = useAsync(getVolunteerMissions);
  const dossier = useAsync(() => getDocuments("partnership"));
  const rules = useAsync(() => getDocuments("awards_rules"));
  const flyer = useAsync(() => getDocuments("flyer"));
  useSeo("Le Grand Week-End du Pôle 2026 – 11 et 12 décembre, Diamniadio et Lac Rose",
    "Première édition : ouverture officielle du réseau, Forum du Pôle en quatre panels, Business Connect, grand reboisement du Lac Rose, Awards et Gala du Pôle.",
    undefined, true, ev.data?.image);
  const { hash } = useLocation();
  useEffect(() => { if (ev.data && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); }, [ev.data, hash]);
  const e = ev.data;
  if (ev.notFound) return <NotFound />;
  if (ev.loading) return <Loading />;
  if (ev.error || !e) return <Container className="py-16"><ErrorState message={ev.error ?? "Événement indisponible."} onRetry={ev.retry} /></Container>;

  const sec = (slug: string) => e.sections.find((s) => s.slug === slug);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const presentation = sec("presentation")?.body ?? "";
  const [surtitre, ...presentationRest] = presentation.split(/\n{2,}/);
  const days = ["programme-vendredi", "programme-samedi"].map(sec).filter((s): s is Section => !!s);
  const dossierDoc = dossier.data?.[0];
  const opens = e.registration_opens_at ? new Date(e.registration_opens_at) : null;
  const registrationOpen = !opens || opens.getTime() <= Date.now();

  const bc: FieldDef[] = [
    { name: "participant_name", label: "Nom", type: "text", required: true }, { name: "organization", label: "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true }, { name: "phone", label: "Téléphone", type: "tel" },
    { name: "what_offers", label: "Ce que vous proposez", type: "textarea" }, { name: "what_needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "preferred_meetings", label: "Rencontres souhaitées (vendredi, samedi ou les deux)", type: "textarea" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" }];
  const aw: FieldDef[] = [
    { name: "category", label: "Catégorie", type: "select", required: true, options: opt(awards.data) },
    { name: "applicant_name", label: "Organisation ou personne", type: "text", required: true }, { name: "organization", label: "Structure", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true }, { name: "phone", label: "Téléphone", type: "tel" },
    { name: "description", label: "Présentation de la candidature", type: "textarea", required: true },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" }];
  const vol: FieldDef[] = [
    { name: "name", label: "Nom", type: "text", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "organization", label: "Organisation", type: "text" },
    { name: "missions", label: "Missions souhaitées", type: "multi", options: opt(missions.data) },
    { name: "availability", label: "Disponibilités", type: "text", full: true }, { name: "message", label: "Message", type: "textarea" }];
  const simple = (slug: string, action: ReactNode, tone?: "offwhite") => {
    const s = sec(slug);
    return s ? <Block id={slug} title={s.title} tone={tone}><RichText text={s.body} />{action}</Block> : null;
  };

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-14 sm:py-20">
          {surtitre && <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-gold-light">{surtitre}</p>}
          <h1 className="text-4xl sm:text-6xl">{e.title}</h1>
          <p className="mt-5 flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" aria-hidden />{fmtDays(e.start_date, e.end_date)}</p>
          {e.location && <p className="mt-1 flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" aria-hidden />{e.location}</p>}
          <div className="mt-8"><Countdown target={e.start_date} /></div>
          <div className="mt-8 flex flex-wrap gap-3">
            {registrationOpen
              ? <Button to={e.registration_url || "#inscription"} variant="light" {...(e.registration_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}>S'inscrire</Button>
              : <button disabled aria-disabled className="min-h-[44px] cursor-not-allowed rounded-md bg-white/20 px-5 font-semibold text-white/90">S'inscrire (à partir du {opens && fmtDate(opens.toISOString()).replace(/ \d{4}$/, "")})</button>}
            <Button to="/partenaires" variant="ghost">Devenir partenaire</Button>
            {dossierDoc && <a href={dossierDoc.file} download className="inline-flex min-h-[44px] items-center gap-2 rounded-md border border-white/40 px-5 font-semibold hover:bg-white/10"><Download className="h-4 w-4" aria-hidden />Télécharger le dossier<span className="sr-only"> (PDF)</span></a>}
          </div>
          <p className="mt-8 font-heading text-lg text-white/80">{SIGNATURE}</p>
        </Container>
      </section>

      {presentationRest.length > 0 && <Section><h2 className="mb-6 text-2xl sm:text-3xl">Présentation</h2><Presentation text={presentationRest.join("\n\n")} /></Section>}

      <Section tone="offwhite" id="programme">
        <h2 className="mb-6 text-2xl sm:text-3xl">Programme</h2>
        <ProgramTabs days={days} />
        <div className="mt-8 flex flex-wrap gap-6"><DocLink doc={dossierDoc} label="Télécharger le dossier de l'événement" missing="Le dossier de l'événement sera disponible prochainement." /><DocLink doc={flyer.data?.[0]} label="Télécharger le flyer" /></div>
      </Section>

      {simple("reboisement", <Reveal label="M'inscrire au reboisement"><EventRequestForm kind="caravan" /></Reveal>)}

      {sec("awards") && (
        <Block id="awards" title={sec("awards")!.title} tone="offwhite">
          <RichText text={sec("awards")!.body} />
          {!!awards.data?.length && (
            <ul className="grid gap-x-10 sm:grid-cols-2">{awards.data.map((c) => (
              <li key={c.slug} className="border-t border-navy/15 py-4"><h3 className="text-lg">{c.name}</h3>{c.description && <p className="mt-1 text-navy/80">{c.description}</p>}</li>))}</ul>)}
          {sec("awards-calendrier") && <><h3 className="text-xl">{sec("awards-calendrier")!.title}</h3><RichText text={sec("awards-calendrier")!.body} /></>}
          <div className="flex flex-wrap items-center gap-6">
            {awards.data?.length ? <Reveal label="Déposer une candidature"><ConfigForm key={awards.data.length} endpoint="/awards/applications/" fields={aw} submitLabel="Envoyer ma candidature" successFallback="Merci. Votre candidature a bien été transmise." /></Reveal> : <p className="text-navy/75">Les candidatures ouvriront prochainement.</p>}
            <DocLink doc={rules.data?.[0]} label="Télécharger le règlement" missing="Le règlement sera disponible prochainement." />
          </div>
        </Block>)}

      {simple("business-connect", <Reveal label="M'inscrire au Business Connect"><ConfigForm endpoint="/business-connect/" extra={{ event: SLUG }} fields={bc} submitLabel="Envoyer mon inscription" successFallback="Merci. Votre inscription a bien été transmise." /></Reveal>)}
      {simple("defis-partenaires", <Reveal label="Voir les défis et proposer une solution"><EventRequestForm kind="challenge" /></Reveal>, "offwhite")}
      {simple("gala", null)}
      {sec("experiences") && <Block id="experiences" title={sec("experiences")!.title} tone="offwhite"><Cards text={sec("experiences")!.body} /></Block>}
      {simple("benevoles", <Reveal label="Devenir bénévole"><ConfigForm key={missions.data?.length ?? 0} endpoint="/volunteers/" fields={vol} submitLabel="Proposer mon aide" successFallback="Merci. Votre candidature de bénévole a bien été transmise." /></Reveal>)}
      {simple("infos-pratiques", null, "offwhite")}

      <Section id="inscription">
        <div className="max-w-4xl">
          <h2 className="mb-3 text-2xl sm:text-3xl">S'inscrire au Grand Week-End du Pôle</h2>
          <p className="mb-6 text-lg text-navy/80">L'inscription donne droit à un badge nominatif valable pour les deux journées. Le Gala du Pôle ne fait pas l'objet d'une inscription : il est accessible sur invitation et par la billetterie commune avec The Ground.</p>
          {registrationOpen ? <EventRequestForm kind="registration" /> : <p className="text-navy/75">Les inscriptions ouvriront le {opens && fmtDate(opens.toISOString())}.</p>}
        </div>
      </Section>

      <PartnerBand />
    </>
  );
}
