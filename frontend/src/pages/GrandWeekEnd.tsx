import { CalendarDays, Download, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { Countdown } from "../components/Countdown";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Button } from "../components/ui/Button";
import { Container, Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { EventRequestForm } from "../features/events/EventRequestForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getAwardCategories, getDocuments, getEvent, getVolunteerMissions } from "../services/api";
import { fmtDate, fmtRange } from "../utils/format";
import { parseBlocks } from "../utils/richtext";
import { NotFound } from "./ErrorPage";

const SLUG = "grand-week-end-du-pole-2026";
const Block = ({ id, title, tone, children }: { id: string; title: string; tone?: "offwhite"; children: ReactNode }) => (
  <Section id={id} tone={tone}><h2 className="mb-6 text-2xl sm:text-3xl">{title}</h2><div className="space-y-6">{children}</div></Section>);
const DocLink = ({ doc, label, missing }: { doc?: { file: string }; label: string; missing: string }) =>
  doc ? <a href={doc.file} download className="link inline-flex items-center gap-2 font-semibold"><Download className="h-4 w-4" aria-hidden />{label}<span className="sr-only"> (PDF)</span></a>
    : <p className="text-navy/65">{missing}</p>;

export default function GrandWeekEnd() {
  const ev = useAsync(() => getEvent(SLUG));
  const awards = useAsync(getAwardCategories);
  const missions = useAsync(getVolunteerMissions);
  const program = useAsync(() => getDocuments("program"));
  const rules = useAsync(() => getDocuments("awards_rules"));
  useSeo("Le Grand Week-End du Pôle 2026 – 11 au 13 décembre, Diamniadio et Lac Rose",
    "Première édition : Rencontre des décideurs, Forum du Pôle, Business Connect, Portes Ouvertes, Gala des Awards et Caravane verte.", undefined, true);
  const e = ev.data;
  if (ev.notFound) return <NotFound />;
  if (ev.loading) return <Loading />;
  if (ev.error || !e) return <Container className="py-16"><ErrorState message={ev.error ?? "Événement indisponible."} onRetry={ev.retry} /></Container>;

  const sec = (slug: string) => e.sections.find((s) => s.slug === slug);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const intro = parseBlocks(sec("presentation")?.body ?? "");
  const tagline = intro[0]?.type === "p" ? intro[0].text : "";
  const rest = (sec("presentation")?.body ?? "").split(/\n{2,}/).slice(1).join("\n\n");
  const opens = e.registration_opens_at ? new Date(e.registration_opens_at) : null;
  const registrationOpen = !opens || opens.getTime() <= Date.now();

  const bc: FieldDef[] = [
    { name: "participant_name", label: "Nom", type: "text", required: true }, { name: "organization", label: "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true }, { name: "phone", label: "Téléphone", type: "tel" },
    { name: "what_offers", label: "Ce que vous proposez", type: "textarea" }, { name: "what_needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "preferred_meetings", label: "Rencontres souhaitées", type: "textarea" },
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
  const simple = (slug: string, title: string, action: ReactNode, tone?: "offwhite") => {
    const s = sec(slug);
    return s ? <Block id={slug} title={title || s.title} tone={tone}><RichText text={s.body} />{action}</Block> : null;
  };

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-14 sm:py-20">
          <h1 className="text-4xl sm:text-6xl">{e.title}</h1>
          {tagline && <p className="mt-4 text-xl text-white/90">{tagline}</p>}
          <p className="mt-5 flex items-center gap-2 text-lg"><CalendarDays className="h-5 w-5" aria-hidden />{fmtRange(e.start_date, e.end_date)}</p>
          {e.location && <p className="mt-1 flex items-center gap-2 text-lg"><MapPin className="h-5 w-5" aria-hidden />{e.location}</p>}
          <div className="mt-8"><Countdown target={e.start_date} /></div>
          <div className="mt-8 flex flex-wrap gap-3">
            {registrationOpen
              ? <Button to={e.registration_url || "/contact"} variant="light" {...(e.registration_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}>S'inscrire</Button>
              : <button disabled aria-disabled className="min-h-[44px] cursor-not-allowed rounded-md bg-white/20 px-5 font-semibold text-white/90">S'inscrire (à partir du {opens && fmtDate(opens.toISOString()).replace(/ \d{4}$/, "")})</button>}
            <Button to="/partenaires" variant="ghost">Devenir partenaire</Button>
          </div>
        </Container>
      </section>

      {rest && <Section><h2 className="mb-6 text-2xl sm:text-3xl">Présentation</h2><RichText text={rest} /></Section>}

      <Section tone="offwhite" id="programme">
        <h2 className="mb-8 text-2xl sm:text-3xl">Programme</h2>
        <div className="grid gap-10 lg:grid-cols-3">
          {["programme-vendredi", "programme-samedi", "programme-dimanche"].map((k) => sec(k) && (
            <div key={k} className="border-t-4 border-green pt-4"><h3 className="mb-4 text-xl">{sec(k)!.title}</h3><RichText text={sec(k)!.body} /></div>))}
        </div>
        <div className="mt-8"><DocLink doc={program.data?.[0]} label="Télécharger le programme" missing="Le programme à télécharger sera disponible prochainement." /></div>
      </Section>

      {sec("awards") && (
        <Block id="awards" title={sec("awards")!.title}>
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

      {simple("business-connect", "", <Reveal label="M'inscrire au Business Connect"><ConfigForm endpoint="/business-connect/" extra={{ event: SLUG }} fields={bc} submitLabel="Envoyer mon inscription" successFallback="Merci. Votre inscription a bien été transmise." /></Reveal>, "offwhite")}
      {simple("defis-partenaires", "", <Reveal label="Voir les défis et proposer une solution"><EventRequestForm kind="challenge" /></Reveal>)}
      {simple("portes-ouvertes", "", <div className="flex flex-wrap gap-4"><Reveal label="Réserver ma visite"><EventRequestForm kind="book_visit" /></Reveal><Reveal label="Ouvrir les portes de mon organisation"><EventRequestForm kind="open_doors" /></Reveal></div>, "offwhite")}
      {simple("caravane-verte", "", <Reveal label="M'inscrire à la Caravane verte"><EventRequestForm kind="caravan" /></Reveal>)}
      {simple("benevoles", "", <Reveal label="Devenir bénévole"><ConfigForm key={missions.data?.length ?? 0} endpoint="/volunteers/" fields={vol} submitLabel="Proposer mon aide" successFallback="Merci. Votre candidature de bénévole a bien été transmise." /></Reveal>, "offwhite")}
      {simple("infos-pratiques", "", null)}
    </>
  );
}
