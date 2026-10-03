import { Link } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { Button } from "../components/ui/Button";
import { Container, Section, SectionHeading } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { ImagePlaceholder } from "../components/ui/ImagePlaceholder";
import { EmptyState, ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getFeaturedEvents, getOrganizationFilters } from "../services/api";
import { Network, Users, HandHeart, MapPin, Building2, Calendar, FileText, Briefcase, GraduationCap, Users2 } from "lucide-react";

const fmt = new Intl.DateTimeFormat("fr-FR", { dateStyle: "long", timeZone: "Africa/Dakar" });

const PROFILES = [
  { name: "Entreprises", icon: Building2 },
  { name: "Institutions et collectivités", icon: Briefcase },
  { name: "Investisseurs et promoteurs", icon: Users2 },
  { name: "PME, TPE et entrepreneurs", icon: Briefcase },
  { name: "Universités et formation", icon: GraduationCap },
  { name: "Jeunes et communautés", icon: Users },
];
const VERBS = [
  { verb: "Connecter", text: "Trouver les acteurs du territoire", to: "/annuaire", icon: Network, color: "bg-green" },
  { verb: "Coopérer", text: "Rejoindre une commission", to: "/nos-actions", icon: HandHeart, color: "bg-purple" },
  { verb: "Agir", text: "Devenir membre du réseau", to: "/adherer", icon: Users, color: "bg-gold" },
];

function EventBand() {
  const { data } = useAsync(getFeaturedEvents);
  const event = data?.[0];
  if (!event) return null;
  const range = event.end_date ? `Du ${fmt.format(new Date(event.start_date))} au ${fmt.format(new Date(event.end_date))}` : fmt.format(new Date(event.start_date));
  return (
    <section aria-label="Prochain événement" className="bg-green text-white">
      <Container className="flex flex-col gap-6 py-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl sm:text-3xl">{event.title}</h2>
          <p className="mt-1 text-white/85">{range}{event.location && ` · ${event.location}`}</p>
          <Button to={`/evenements/${event.slug}`} variant="light" className="mt-4">Voir le programme</Button>
        </div>
        <Countdown target={event.start_date} />
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
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {data.commissions.map((c, index) => (
        <div key={c.slug} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
          <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${
            index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
          } opacity-10 transition-opacity group-hover:opacity-20`} />
          <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${
            index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
          } text-white`}>
            <FileText className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-bold text-navy">{c.name}</h3>
        </div>
      ))}
    </div>
  );
}

export default function Home() {
  useSeo("Urban Hub Connect", "Urban Hub Connect, le réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose : annuaire, cartographie, événements et adhésion.", "/");
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative grid gap-10 py-16 sm:py-24 lg:grid-cols-[1.2fr_1fr] lg:items-center">
          <div>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl">Urban Hub Connect</h1>
            <p className="mt-5 max-w-xl text-xl text-white/85">Le réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button to="/adherer" variant="light">Rejoindre le réseau</Button>
              <Button to="/annuaire" variant="ghost">Explorer l'Annuaire</Button>
            </div>
          </div>
          <ImagePlaceholder label="photo principale du réseau" className="aspect-[4/3] w-full rounded-md border-white/30 bg-white/5 text-white/70" />
        </Container>
      </section>

      <EventBand />

      <Section>
        <SectionHeading title="Connecter · Coopérer · Agir" />
        <div className="grid gap-8 md:grid-cols-3">
          {VERBS.map((v) => {
            const Icon = v.icon;
            return (
              <Link key={v.verb} to={v.to} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-6 -top-6 h-24 w-24 rounded-full ${v.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-14 w-14 items-center justify-center rounded-lg ${v.color} text-white`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 text-2xl font-bold text-navy">{v.verb}</h3>
                <p className="mt-3 text-lg text-navy/75">{v.text}</p>
                <span className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-green group-hover:gap-3 transition-all">
                  En savoir plus
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section tone="offwhite">
        <SectionHeading title="Deux pôles, un même territoire" />
        <div className="grid gap-8 md:grid-cols-2">
          {[
            { name: "Diamniadio", pole: "DIAMNIADIO", description: "Pôle urbain en plein essor", icon: Building2, color: "bg-green" },
            { name: "Lac Rose", pole: "LAC_ROSE", description: "Territoire touristique et culturel", icon: MapPin, color: "bg-purple" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.pole} to={`/cartographie?pole=${item.pole}`} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${item.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-xl ${item.color} text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-3xl font-bold text-navy">{item.name}</h3>
                <p className="mt-2 text-lg text-navy/75">{item.description}</p>
                <div className="mt-6 flex items-center gap-2 text-sm font-semibold text-green group-hover:gap-3 transition-all">
                  <span>Voir sur la carte</span>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            );
          })}
        </div>
      </Section>

      <Section>
        <div className="grid gap-8 md:grid-cols-2">
          {[
            {
              title: "L'Annuaire du réseau",
              description: "Recherchez un acteur par secteur, collège, pôle ou commission.",
              button: "Explorer l'Annuaire",
              to: "/annuaire",
              icon: Users2,
              color: "bg-green",
            },
            {
              title: "La Cartographie du Hub",
              description: "Situez institutions, entreprises, équipements et services sur la carte.",
              button: "Ouvrir la carte",
              to: "/cartographie",
              icon: MapPin,
              color: "bg-purple",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${item.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-xl ${item.color} text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-navy">{item.title}</h3>
                <p className="mt-3 text-lg text-navy/75">{item.description}</p>
                <Button to={item.to} variant="secondary" className="mt-6">{item.button}</Button>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="offwhite">
        <SectionHeading title="Les commissions" intro="Huit espaces de travail thématiques ouverts aux membres du réseau." />
        <Commissions />
        <Button to="/nos-actions" variant="secondary" className="mt-8">Découvrir nos actions</Button>
      </Section>

      <Section>
        <SectionHeading title="Pour qui ?" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILES.map((profile, index) => {
            const Icon = profile.icon;
            return (
              <div key={profile.name} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${
                  index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
                } opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${
                  index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"
                } text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy">{profile.name}</h3>
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <SectionHeading title="Les rendez-vous du réseau" intro="After Work Connect, commissions, visites et Grand Week-End du Pôle." />
        <div className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10 transition-opacity group-hover:opacity-20" />
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-xl bg-purple text-white">
            <Calendar className="h-8 w-8" />
          </div>
          <h3 className="mt-6 text-2xl font-bold text-navy">Événements à venir</h3>
          <p className="mt-3 text-lg text-navy/75">Découvrez tous les événements du réseau : afterworks, réunions de commissions, visites de terrain et le Grand Week-End du Pôle.</p>
          <Button to="/evenements" className="mt-6">Voir les événements</Button>
        </div>
      </Section>

      <section className="relative overflow-hidden bg-navy py-16 text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative">
          <h2 className="text-3xl sm:text-4xl">Devenez membre fondateur</h2>
          <Button to="/adherer" variant="light" className="mt-6">Adhérer au réseau</Button>
        </Container>
      </section>
    </>
  );
}
