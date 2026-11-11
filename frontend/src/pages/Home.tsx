import {
  ArrowRight, Briefcase, Building2, CalendarDays, GraduationCap, HandHeart, Landmark, Map, MapPin, Network, Store, Users, UsersRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import heroImage from "../assets/banner.png";
import { Countdown } from "../components/Countdown";
import { Button } from "../components/ui/Button";
import { CtaBand, FeatureCard } from "../components/ui/Card";
import { Container, Section, SectionHeading } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getFeaturedEvents, getOrganizationFilters } from "../services/api";
import { fmtDays } from "../utils/format";

const PROFILES = [
  { name: "Entreprises", icon: Building2 },
  { name: "Institutions et collectivités", icon: Landmark },
  { name: "Investisseurs et promoteurs", icon: Briefcase },
  { name: "PME, TPE et entrepreneurs", icon: Store },
  { name: "Universités et formation", icon: GraduationCap },
  { name: "Jeunes et communautés", icon: Users },
];
const PILLARS = [
  { verb: "Connecter", text: "Trouver les acteurs du territoire, leurs activités, leurs offres et leurs besoins.", to: "/annuaire", icon: Network, cta: "Explorer l'Annuaire" },
  { verb: "Coopérer", text: "Rejoindre une commission thématique et construire des projets avec les autres membres.", to: "/nos-actions", icon: HandHeart, cta: "Découvrir nos actions" },
  { verb: "Agir", text: "Devenir membre du réseau et prendre part à la vie des deux pôles.", to: "/adherer", icon: UsersRound, cta: "Adhérer au réseau" },
];

/** Bandeau événement : reste affiché jusqu'à la fin de l'événement (filtre « à venir » côté API) ;
 *  le compte à rebours vise le début (vendredi 11 décembre 2026, 9 h 30 à Dakar). Texte fixé par la note du 5 novembre 2026. */
function EventBand() {
  const { data } = useAsync(getFeaturedEvents);
  const event = data?.[0];
  if (!event) return null;
  const name = event.title.replace(/\s+\d{4}$/, "");
  const line = [name, fmtDays(event.start_date, event.end_date), event.location].filter(Boolean).join(" · ");
  return (
    <section aria-label="Prochain événement" className="relative z-10 -mt-10 sm:-mt-14">
      <Container>
        <div className="overflow-hidden rounded-3xl bg-green text-white shadow-lift">
          <div className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.4fr_auto] lg:items-center">
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-mint"><CalendarDays className="h-4 w-4" aria-hidden />Prochain grand rendez-vous</p>
              <h2 className="mt-3 text-2xl leading-tight sm:text-3xl">{line}.</h2>
              {event.description && <p className="mt-2 text-lg text-white/90">{event.description}</p>}
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button to={`/evenements/${event.slug}#programme`} variant="light">Découvrir le programme<ArrowRight className="h-4 w-4" aria-hidden /></Button>
                <Button to="/partenaires" variant="ghost">Devenir partenaire</Button>
              </div>
            </div>
            <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="mb-3 text-sm font-semibold text-white/75">Ouverture dans</p>
              <Countdown target={event.start_date} />
              <p className="mt-4 border-t border-white/15 pt-3 font-heading text-sm font-bold text-gold-light">Deux pôles, un seul élan.</p>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}

function Commissions() {
  const { data, error, loading } = useAsync(getOrganizationFilters);
  if (loading) return <Loading />;
  if (error) return <ErrorState message={error} />;
  if (!data?.commissions.length) return <EmptyState message="Les commissions seront présentées prochainement." />;
  return (
    <ol className="grid gap-px overflow-hidden rounded-2xl border border-navy/10 bg-navy/10 sm:grid-cols-2 lg:grid-cols-4">
      {data.commissions.map((c, i) => (
        <li key={c.slug} className="flex gap-4 bg-white p-5 sm:p-6">
          <span className="font-heading text-2xl font-extrabold text-gold tabular-nums">{String(i + 1).padStart(2, "0")}</span>
          <span className="font-semibold leading-snug text-navy">{c.name}</span>
        </li>))}
    </ol>
  );
}

export default function Home() {
  useSeo("Urban Hub Connect", "Urban Hub Connect, le réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose : annuaire, cartographie, événements et adhésion.", "/");
  return (
    <>
      {/* En-tête */}
      <section className="relative overflow-hidden bg-navy pb-20 text-white sm:pb-28">
        <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_70%)]"><HexPattern className="text-white/[0.07]" /></div>
        <Container className="relative grid gap-12 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-16">
          <div>
            <p className="eyebrow !text-gold-light">Diamniadio · Lac Rose</p>
            <h1 className="mt-5 text-4xl leading-[1.04] sm:text-6xl lg:text-[4.25rem]">Deux pôles, <span className="text-mint">un seul élan.</span></h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/80 sm:text-xl">Institutions, entreprises, écoles, associations et talents des pôles urbains de Diamniadio et du Lac Rose se connectent pour agir ensemble.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button to="/adherer" variant="light" size="lg">Rejoindre le réseau<ArrowRight className="h-5 w-5" aria-hidden /></Button>
              <Button to="/annuaire" variant="ghost" size="lg">Explorer l'Annuaire</Button>
            </div>
          </div>
          <div className="relative">
            <img src={heroImage} alt="" className="aspect-[4/3] w-full rounded-3xl object-cover shadow-lift ring-1 ring-white/10" />
            <div className="absolute -bottom-6 left-4 right-4 flex items-center gap-3 rounded-2xl bg-white p-4 text-navy shadow-lift sm:left-auto sm:right-6 sm:w-80">
              <span className="icon-tile"><MapPin className="h-5 w-5" aria-hidden /></span>
              <p className="text-sm leading-snug"><strong className="block font-heading text-base">Le réseau des deux pôles</strong>Annuaire, cartographie, commissions et événements.</p>
            </div>
          </div>
        </Container>
      </section>

      <EventBand />

      {/* Piliers */}
      <Section>
        <SectionHeading eyebrow="Notre mission" title="Connecter · Coopérer · Agir" intro="Trois façons de prendre part à la vie des pôles urbains de Diamniadio et du Lac Rose." />
        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p) => <FeatureCard key={p.verb} icon={p.icon} title={p.verb} to={p.to} cta={p.cta}>{p.text}</FeatureCard>)}
        </div>
      </Section>

      {/* Les deux pôles */}
      <Section tone="offwhite">
        <SectionHeading eyebrow="Le territoire" title="Deux pôles, un même territoire" action={<Button to="/cartographie" variant="secondary"><Map className="h-4 w-4" aria-hidden />Ouvrir la Cartographie</Button>} />
        <div className="grid gap-5 md:grid-cols-2">
          {[
            { name: "Diamniadio", pole: "DIAMNIADIO", description: "Pôle urbain en plein essor", accent: "bg-green" },
            { name: "Lac Rose", pole: "LAC_ROSE", description: "Territoire touristique et culturel", accent: "bg-gold" },
          ].map((p) => (
            <Link key={p.pole} to={`/cartographie?pole=${p.pole}`} className="group card card-hover relative flex min-h-[13rem] flex-col justify-end overflow-hidden p-7 sm:p-9">
              <span aria-hidden className={`absolute left-0 top-0 h-1.5 w-full ${p.accent}`} />
              <MapPin className="absolute right-7 top-8 h-10 w-10 text-navy/10 transition-colors group-hover:text-green/30" aria-hidden />
              <h3 className="text-3xl sm:text-4xl">{p.name}</h3>
              <p className="mt-2 text-lg text-navy/70">{p.description}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 font-semibold text-green">Voir sur la carte<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>
            </Link>))}
        </div>
      </Section>

      {/* Outils */}
      <Section>
        <SectionHeading eyebrow="Les outils du réseau" title="Trouver, situer, se rencontrer" />
        <div className="grid gap-5 md:grid-cols-3">
          <FeatureCard icon={UsersRound} title="L'Annuaire du réseau" to="/annuaire" cta="Explorer l'Annuaire">Recherchez un acteur par secteur, collège, pôle ou commission.</FeatureCard>
          <FeatureCard icon={Map} title="La Cartographie du Hub" to="/cartographie" cta="Ouvrir la carte">Situez institutions, entreprises, équipements et services sur la carte.</FeatureCard>
          <FeatureCard icon={CalendarDays} title="Les rendez-vous du réseau" to="/evenements" cta="Voir les événements">After Work Connect, commissions, visites et Grand Week-End du Pôle.</FeatureCard>
        </div>
      </Section>

      {/* Commissions */}
      <Section tone="offwhite">
        <SectionHeading eyebrow="Coopérer" title="Les commissions" intro="Huit espaces de travail thématiques ouverts aux membres du réseau."
          action={<Button to="/nos-actions" variant="secondary">Découvrir nos actions<ArrowRight className="h-4 w-4" aria-hidden /></Button>} />
        <Commissions />
      </Section>

      {/* Pour qui */}
      <Section>
        <SectionHeading eyebrow="Pour qui ?" title="Un réseau ouvert à tous les acteurs du territoire" center />
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          {PROFILES.map((p) => (
            <li key={p.name} className="card flex items-center gap-3 p-4 sm:gap-4 sm:p-5">
              <span className="icon-tile"><p.icon className="h-5 w-5" aria-hidden /></span>
              <span className="font-semibold leading-snug">{p.name}</span>
            </li>))}
        </ul>
      </Section>

      <CtaBand title="Devenez membre fondateur" text="Rejoignez les premiers acteurs du réseau et prenez part à son lancement.">
        <Button to="/adherer" variant="light" size="lg">Adhérer au réseau<ArrowRight className="h-5 w-5" aria-hidden /></Button>
        <Button to="/contact" variant="ghost" size="lg">Nous contacter</Button>
      </CtaBand>
    </>
  );
}
