import { ArrowRight, Building2, CalendarDays, Compass, LockKeyhole, UsersRound } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Container, Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { useSeo } from "../hooks/useSeo";

export default function MembersSoon() {
  useSeo("Espace membres", "L'espace membres d'Urban Hub Connect sera disponible prochainement.");
  return (
    <>
      <PageHero
        title="L’espace membres"
        intro="Un espace dédié aux membres d’Urban Hub Connect pour faire vivre les collaborations et les projets du réseau."
      >
        <div className="flex flex-wrap gap-3">
          <Button to="/adherer" variant="primary">Rejoindre le réseau <ArrowRight className="h-5 w-5" aria-hidden="true" /></Button>
          <Button to="/annuaire" variant="ghost">Explorer l’annuaire</Button>
        </div>
      </PageHero>

      <Section tone="offwhite" className="pt-10 sm:pt-14">
        <Container className="max-w-5xl !px-0">
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-10">
            <div className="absolute -right-10 -top-10 h-44 w-44 rounded-full bg-gold opacity-[0.09]" />
            <div className="relative grid gap-8 md:grid-cols-[auto_1fr] md:items-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-purple text-white shadow-soft md:mx-0">
                <LockKeyhole className="h-9 w-9" aria-hidden="true" />
              </div>
              <div>
                <span className="inline-flex rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-navy">Bientôt disponible</span>
                <h2 className="mt-3 text-2xl sm:text-3xl">Le réseau se prépare à vous accueillir</h2>
                <p className="mt-3 max-w-2xl leading-relaxed text-navy/75">
                  L’espace membre est en préparation. Il réunira progressivement les ressources et les services réservés aux membres. En attendant son ouverture, découvrez le réseau et déposez votre demande d’adhésion.
                </p>
                <Button to="/adherer" className="mt-6">Découvrir l’adhésion <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
              </div>
            </div>
          </div>
        </Container>
      </Section>

      <Section>
        <SectionHeading title="Explorez le réseau dès maintenant" intro="Découvrez les espaces publics d’Urban Hub Connect en attendant l’ouverture de votre espace dédié." />
        <ul className="grid gap-5 md:grid-cols-3">
          {[
            { title: "Les membres", description: "Parcourez les organisations référencées et découvrez les acteurs du territoire.", to: "/annuaire", label: "Consulter l’annuaire", icon: Building2, color: "green" },
            { title: "Les événements", description: "Retrouvez les rendez-vous, rencontres et temps forts du réseau.", to: "/evenements", label: "Voir l’agenda", icon: CalendarDays, color: "purple" },
            { title: "La cartographie", description: "Repérez les lieux, services et initiatives de Diamniadio et du Lac Rose.", to: "/cartographie", label: "Explorer la carte", icon: Compass, color: "gold" },
          ].map(({ title, description, to, label, icon: Icon, color }) => (
            <li key={title} className="group flex flex-col rounded-2xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:border-green/30 hover:shadow-lg">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${color === "green" ? "bg-green" : color === "purple" ? "bg-purple" : "bg-gold"}`}>
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <h3 className="mt-5 text-xl">{title}</h3>
              <p className="mt-2 flex-1 leading-relaxed text-navy/75">{description}</p>
              <Button to={to} variant="secondary" className="mt-6 w-full justify-between">
                {label}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="navy">
        <div className="mx-auto max-w-3xl text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-green text-white">
            <UsersRound className="h-7 w-7" aria-hidden="true" />
          </span>
          <h2 className="mt-5 text-2xl sm:text-3xl">Pas encore membre du réseau ?</h2>
          <p className="mt-3 text-lg text-white/80">Rejoignez les acteurs de Diamniadio et du Lac Rose et prenez part aux échanges et aux initiatives du territoire.</p>
          <Button to="/adherer" variant="light" className="mt-7">Faire une demande d’adhésion <ArrowRight className="h-4 w-4" aria-hidden="true" /></Button>
        </div>
      </Section>
    </>
  );
}
