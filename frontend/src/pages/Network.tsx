import { Section, SectionHeading } from "../components/ui/Container";
import { Button } from "../components/ui/Button";
import { HexPattern } from "../components/ui/HexPattern";
import { useSeo } from "../hooks/useSeo";
import { Network, Users, HandHeart, Target, Award, Globe, Building2, FileText, Briefcase, GraduationCap, Users2, Sparkles, TrendingUp } from "lucide-react";

const MISSIONS = [
  { title: "Connecter", description: "Faciliter les rencontres et les échanges entre tous les acteurs du territoire", icon: Network, color: "bg-green" },
  { title: "Coopérer", description: "Créer des espaces de travail collaboratif au sein des commissions thématiques", icon: HandHeart, color: "bg-purple" },
  { title: "Agir", description: "Transformer les idées en projets concrets pour le développement du territoire", icon: Target, color: "bg-gold" },
];

const VALEURS = [
  { title: "Inclusion", description: "Ouvert à tous les acteurs, sans distinction de taille ou de secteur", icon: Users, color: "bg-green" },
  { title: "Excellence", description: "Recherche de la qualité et de l'impact dans chaque initiative", icon: Award, color: "bg-purple" },
  { title: "Innovation", description: "Encourager les nouvelles idées et les approches créatives", icon: Sparkles, color: "bg-gold" },
  { title: "Transparence", description: "Gestion claire et ouverte des ressources et des décisions", icon: Globe, color: "bg-green" },
];

const CHIFFRES = [
  { value: "2", label: "Pôles urbains", icon: Building2 },
  { value: "8", label: "Commissions", icon: FileText },
  { value: "6", label: "Collèges", icon: Users2 },
  { value: "∞", label: "Opportunités", icon: TrendingUp },
];

const PROFILS = [
  { name: "Entreprises", icon: Building2 },
  { name: "Institutions et collectivités", icon: Briefcase },
  { name: "Investisseurs et promoteurs", icon: Users2 },
  { name: "PME, TPE et entrepreneurs", icon: Briefcase },
  { name: "Universités et formation", icon: GraduationCap },
  { name: "Jeunes et communautés", icon: Users },
];

export default function NetworkPage() {
  useSeo("Le réseau", "Découvrez Urban Hub Connect : missions, valeurs et acteurs des pôles de Diamniadio et du Lac Rose.");

  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold">Le réseau Urban Hub Connect </h1>
          <p className="mt-5 max-w-2xl text-xl text-white/85">
            Urban Hub Connect fédère les acteurs des pôles urbains de Diamniadio et du Lac Rose autour d'une vision commune : construire ensemble un territoire dynamique et inclusif.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button to="/adherer" variant="light">Rejoindre le réseau</Button>
            <Button to="/annuaire" variant="ghost">Explorer l'annuaire</Button>
          </div>
        </div>
      </section>

      <Section>
        <SectionHeading title="Notre mission" intro="Trois piliers guident chaque action du réseau." />
        <div className="grid gap-8 md:grid-cols-3">
          {MISSIONS.map((mission) => {
            const Icon = mission.icon;
            return (
              <div key={mission.title} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${mission.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-xl ${mission.color} text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="mt-6 text-2xl font-bold text-navy">{mission.title}</h3>
                <p className="mt-3 text-lg text-navy/75">{mission.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="offwhite">
        <SectionHeading title="Nos valeurs" intro="Les principes qui fondent notre démarche collective." />
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {VALEURS.map((valeur) => {
            const Icon = valeur.icon;
            return (
              <div key={valeur.title} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-white p-6 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full ${valeur.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${valeur.color} text-white`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-lg font-bold text-navy">{valeur.title}</h3>
                <p className="mt-2 text-base text-navy/75">{valeur.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section>
        <SectionHeading title="Le réseau en chiffres" />
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {CHIFFRES.map((chiffre, index) => {
            const Icon = chiffre.icon;
            return (
              <div key={chiffre.label} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg text-center">
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${
                  index % 2 === 0 ? "bg-green" : "bg-purple"
                } opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-xl mx-auto ${
                  index % 2 === 0 ? "bg-green" : "bg-purple"
                } text-white`}>
                  <Icon className="h-8 w-8" />
                </div>
                <div className="mt-6 text-5xl font-extrabold text-navy">{chiffre.value}</div>
                <p className="mt-2 text-lg font-semibold text-navy/75">{chiffre.label}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <Section tone="offwhite">
        <SectionHeading title="Qui peut adhérer ?" intro="Le réseau est ouvert à tous les acteurs du territoire." />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROFILS.map((profile, index) => {
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
        <div className="mt-10 text-center">
          <Button to="/adherer" variant="primary" className="text-lg px-8 py-4">Devenir membre</Button>
        </div>
      </Section>

      <Section>
        <SectionHeading title="Comment ça marche ?" />
        <div className="grid gap-8 md:grid-cols-3">
          {[
            { step: "1", title: "Adhérer", description: "Remplissez le formulaire d'adhésion et choisissez votre collège", icon: Users, color: "bg-green" },
            { step: "2", title: "Intégrer", description: "Rejoignez les commissions qui vous intéressent", icon: HandHeart, color: "bg-purple" },
            { step: "3", title: "Agir", description: "Participez aux événements et co-créez des projets", icon: Target, color: "bg-gold" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="group relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-8 shadow-soft transition-all hover:border-green hover:shadow-lg">
                <div className={`absolute -right-8 -top-8 h-32 w-32 rounded-full ${item.color} opacity-10 transition-opacity group-hover:opacity-20`} />
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${item.color} text-white font-bold text-xl`}>
                  {item.step}
                </div>
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-lg ${item.color} text-white mt-4`}>
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-2xl font-bold text-navy">{item.title}</h3>
                <p className="mt-3 text-lg text-navy/75">{item.description}</p>
              </div>
            );
          })}
        </div>
      </Section>

      <section className="relative overflow-hidden bg-navy py-16 text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-bold">Prêt à rejoindre le réseau ?</h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-white/85">
            Devenez acteur du changement et construisez avec nous l'avenir des pôles de Diamniadio et du Lac Rose.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button to="/adherer" variant="light" className="text-lg px-8 py-4">Adhérer maintenant</Button>
            <Button to="/contact" variant="ghost" className="text-lg px-8 py-4">Nous contacter</Button>
          </div>
        </div>
      </section>
    </>
  );
}
