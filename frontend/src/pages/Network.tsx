import { Section, SectionHeading } from "../components/ui/Container";
import { Button } from "../components/ui/Button";
import { HexPattern } from "../components/ui/HexPattern";
import { useSeo } from "../hooks/useSeo";
import { useAsync } from "../hooks/useAsync";
import { getDocuments, getPage } from "../services/api";
import { RichText } from "../components/ui/RichText";
import { Network, Users, HandHeart, Target, Award, Building2, FileText, Briefcase, GraduationCap, Users2, TrendingUp, DoorOpen, ShieldCheck, Leaf, Download, Eye, Compass } from "lucide-react";

const MISSIONS = [
  { title: "Connecter", description: "Faciliter les rencontres et les échanges entre tous les acteurs du territoire", icon: Network, color: "bg-green" },
  { title: "Coopérer", description: "Créer des espaces de travail collaboratif au sein des commissions thématiques", icon: HandHeart, color: "bg-purple" },
  { title: "Agir", description: "Transformer les idées en projets concrets pour le développement du territoire", icon: Target, color: "bg-gold" },
];

// Textes déjà publiés sur le site (accroche de la page et article de lancement).
const VISION = "Fédérer les acteurs des pôles urbains de Diamniadio et du Lac Rose autour d'une vision commune : construire ensemble un territoire dynamique et inclusif.";
const AMBITION = "Créer un cadre permanent où les acteurs des deux pôles se connaissent, partagent l'information et construisent ensemble des coopérations utiles au territoire.";

const VALEURS = [
  { title: "Ouverture", description: "Le réseau accueille tous les acteurs des deux pôles, quels que soient leur taille, leur secteur ou leur statut.", icon: DoorOpen, color: "bg-green" },
  { title: "Confiance", description: "Les échanges reposent sur la transparence, le respect de la parole donnée et la discrétion due aux membres.", icon: ShieldCheck, color: "bg-purple" },
  { title: "Utilité", description: "Une rencontre n'a de sens que si elle produit un bénéfice concret pour les membres et pour le territoire.", icon: Target, color: "bg-gold" },
  { title: "Exigence", description: "Nous tenons à la qualité des contenus, de l'organisation et de l'accueil réservé à chacun.", icon: Award, color: "bg-green" },
  { title: "Responsabilité", description: "Nos actions servent un développement durable des pôles, attentif aux habitants comme aux générations futures.", icon: Leaf, color: "bg-purple" },
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
  useSeo("Le réseau", "Découvrez Urban Hub Connect : vision, mission, ambition, valeurs et acteurs des pôles de Diamniadio et du Lac Rose.");
  // « Notre trajectoire » : bloc modifiable dans l'admin (Contenus de page, slug reseau-trajectoire), masqué tant qu'il est vide.
  const trajectoire = useAsync(() => getPage("reseau-trajectoire"));
  const plaquette = useAsync(() => getDocuments("brochure"));

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
        <SectionHeading title="Vision, mission, ambition et valeurs" />
        <div className="mb-12 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-navy text-white"><Eye className="h-6 w-6" aria-hidden /></div>
            <h3 className="mt-4 text-2xl font-bold text-navy">Notre vision</h3>
            <p className="mt-3 text-lg text-navy/80">{VISION}</p>
          </div>
          <div className="rounded-2xl border border-navy/10 bg-white p-8 shadow-soft">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gold text-white"><Compass className="h-6 w-6" aria-hidden /></div>
            <h3 className="mt-4 text-2xl font-bold text-navy">Notre ambition</h3>
            <p className="mt-3 text-lg text-navy/80">{AMBITION}</p>
          </div>
        </div>
        <h3 className="mb-2 text-2xl font-bold text-navy">Notre mission</h3>
        <p className="mb-6 text-lg text-navy/75">Trois piliers guident chaque action du réseau.</p>
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
        <h3 className="mb-2 text-2xl font-bold text-navy">Nos valeurs</h3>
        <p className="mb-6 text-lg text-navy/75">Cinq valeurs guident la vie du réseau.</p>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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

      {trajectoire.data?.content && (
        <Section>
          <SectionHeading title={trajectoire.data.title || "Notre trajectoire"} />
          <RichText text={trajectoire.data.content} />
        </Section>)}

      {!!plaquette.data?.length && (
        <Section tone="offwhite">
          <a href={plaquette.data[0].file} download className="link inline-flex items-center gap-2 text-lg font-semibold"><Download className="h-5 w-5" aria-hidden />Télécharger la plaquette du réseau<span className="sr-only"> (PDF)</span></a>
        </Section>)}

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
