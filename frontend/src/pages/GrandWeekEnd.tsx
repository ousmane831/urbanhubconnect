import { CalendarDays, MapPin } from "lucide-react";
import { Countdown } from "../components/Countdown";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Container, Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getAwardCategories, getEvent, getVolunteerMissions } from "../services/api";
import { fmtDay, fmtRange } from "../utils/format";
import { NotFound } from "./ErrorPage";

const SLUG = "grand-week-end-du-pole-2026";
// Composantes du Grand Week-End citées dans le cahier des charges ; les textes détaillés se saisissent dans l'admin.
const COMPONENTS = ["Awards", "Business Connect", "Défis Partenaires", "Portes Ouvertes", "Caravane verte"];
const DAY = 86_400_000;

export default function GrandWeekEnd() {
  const ev = useAsync(() => getEvent(SLUG));
  const awards = useAsync(getAwardCategories);
  const missions = useAsync(getVolunteerMissions);
  const e = ev.data;
  useSeo("Grand Week-End du Pôle 2026", "Le Grand Week-End du Pôle 2026 : programme, Awards, Business Connect, Portes Ouvertes, Caravane verte, bénévoles.");
  if (ev.notFound) return <NotFound />;
  if (ev.loading) return <Loading />;
  if (ev.error || !e) return <Container className="py-16"><ErrorState message={ev.error ?? "Événement indisponible."} onRetry={ev.retry} /></Container>;

  const start = new Date(e.start_date).getTime();
  const days = [0, 1, 2].map((i) => new Date(start + i * DAY).toISOString());
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
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

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-14 sm:py-20">
          <h1 className="text-4xl sm:text-6xl">{e.title}</h1>
          <p className="mt-5 flex items-center gap-2 text-xl"><CalendarDays className="h-6 w-6" aria-hidden />{fmtRange(e.start_date, e.end_date)}</p>
          {e.location && <p className="mt-1 flex items-center gap-2 text-xl"><MapPin className="h-6 w-6" aria-hidden />{e.location}</p>}
          <div className="mt-8"><Countdown target={e.start_date} /></div>
        </Container>
      </section>
      {e.description && <Section><div className="max-w-3xl whitespace-pre-line text-lg leading-relaxed">{e.description}</div></Section>}
      <Section tone="offwhite">
        <h2 className="mb-8 text-2xl sm:text-3xl">Programme</h2>
        <ul className="grid gap-6 md:grid-cols-3">{days.map((d) => (
          <li key={d} className="border-t-4 border-green pt-4"><h3 className="text-xl capitalize">{fmtDay(d)}</h3>
            <p className="mt-2 text-navy/75">Le programme détaillé sera publié prochainement.</p></li>))}</ul>
        <h2 className="mb-5 mt-14 text-2xl sm:text-3xl">Au cœur du week-end</h2>
        <ul className="grid gap-x-10 sm:grid-cols-2 lg:grid-cols-3">{COMPONENTS.map((c) => <li key={c} className="border-t border-navy/15 py-4 text-lg font-semibold">{c}</li>)}</ul>
      </Section>
      <Section id="business-connect"><div className="max-w-3xl"><h2 className="mb-6 text-2xl sm:text-3xl">S'inscrire à Business Connect</h2>
        <ConfigForm endpoint="/business-connect/" extra={{ event: SLUG }} fields={bc} submitLabel="Envoyer mon inscription" successFallback="Merci. Votre inscription a bien été transmise." /></div></Section>
      <Section tone="offwhite" id="awards"><div className="max-w-3xl"><h2 className="mb-6 text-2xl sm:text-3xl">Candidater aux Awards</h2>
        {awards.data?.length ? <ConfigForm key={awards.data.length} endpoint="/awards/applications/" fields={aw} submitLabel="Envoyer ma candidature" successFallback="Merci. Votre candidature a bien été transmise." />
          : <p className="text-lg text-navy/75">Les candidatures ouvriront prochainement.</p>}</div></Section>
      <Section id="benevoles"><div className="max-w-3xl"><h2 className="mb-6 text-2xl sm:text-3xl">Devenir bénévole</h2>
        <ConfigForm key={missions.data?.length ?? 0} endpoint="/volunteers/" fields={vol} submitLabel="Proposer mon aide" successFallback="Merci. Votre candidature de bénévole a bien été transmise." /></div></Section>
    </>
  );
}
