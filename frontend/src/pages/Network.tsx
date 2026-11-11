import {
  ArrowRight, Award, Briefcase, Building2, Compass, DoorOpen, Download, Eye, GraduationCap, HandHeart, Landmark, Leaf, Network, ShieldCheck,
  Store, Target, Users, UsersRound,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { CtaBand } from "../components/ui/Card";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { RichText } from "../components/ui/RichText";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getDocuments, getOrganizationFilters, getPage } from "../services/api";

const MISSIONS = [
  { title: "Connecter", description: "Faciliter les rencontres et les échanges entre tous les acteurs du territoire", icon: Network },
  { title: "Coopérer", description: "Créer des espaces de travail collaboratif au sein des commissions thématiques", icon: HandHeart },
  { title: "Agir", description: "Transformer les idées en projets concrets pour le développement du territoire", icon: Target },
];

// Textes déjà publiés sur le site (accroche de la page et article de lancement).
const VISION = "Fédérer les acteurs des pôles urbains de Diamniadio et du Lac Rose autour d'une vision commune : construire ensemble un territoire dynamique et inclusif.";
const AMBITION = "Créer un cadre permanent où les acteurs des deux pôles se connaissent, partagent l'information et construisent ensemble des coopérations utiles au territoire.";

const VALEURS = [
  { title: "Ouverture", description: "Le réseau accueille tous les acteurs des deux pôles, quels que soient leur taille, leur secteur ou leur statut.", icon: DoorOpen },
  { title: "Confiance", description: "Les échanges reposent sur la transparence, le respect de la parole donnée et la discrétion due aux membres.", icon: ShieldCheck },
  { title: "Utilité", description: "Une rencontre n'a de sens que si elle produit un bénéfice concret pour les membres et pour le territoire.", icon: Target },
  { title: "Exigence", description: "Nous tenons à la qualité des contenus, de l'organisation et de l'accueil réservé à chacun.", icon: Award },
  { title: "Responsabilité", description: "Nos actions servent un développement durable des pôles, attentif aux habitants comme aux générations futures.", icon: Leaf },
];

const PROFILS = [
  { name: "Entreprises", icon: Building2 }, { name: "Institutions et collectivités", icon: Landmark },
  { name: "Investisseurs et promoteurs", icon: Briefcase }, { name: "PME, TPE et entrepreneurs", icon: Store },
  { name: "Universités et formation", icon: GraduationCap }, { name: "Jeunes et communautés", icon: Users },
];

const STEPS = [
  { title: "Adhérer", description: "Remplissez le formulaire d'adhésion et choisissez votre collège" },
  { title: "Intégrer", description: "Rejoignez les commissions qui vous intéressent" },
  { title: "Agir", description: "Participez aux événements et co-créez des projets" },
];

export default function NetworkPage() {
  useSeo("Le réseau", "Découvrez Urban Hub Connect : vision, mission, ambition, valeurs et acteurs des pôles de Diamniadio et du Lac Rose.");
  // « Notre trajectoire » : bloc modifiable dans l'admin (Contenus de page, slug reseau-trajectoire), masqué tant qu'il est vide.
  const trajectoire = useAsync(() => getPage("reseau-trajectoire"));
  const plaquette = useAsync(() => getDocuments("brochure"));
  const filters = useAsync(getOrganizationFilters);
  const figures = [
    { value: "2", label: "pôles urbains" },
    { value: filters.data ? String(filters.data.commissions.length) : "–", label: "commissions" },
    { value: filters.data ? String(filters.data.colleges.length) : "–", label: "collèges" },
    { value: String(VALEURS.length), label: "valeurs partagées" },
  ];

  return (
    <>
      <PageHero eyebrow="Le réseau" title="Le réseau Urban Hub Connect" size="lg"
        intro="Urban Hub Connect fédère les acteurs des pôles urbains de Diamniadio et du Lac Rose autour d'une vision commune : construire ensemble un territoire dynamique et inclusif.">
        <Button to="/adherer" variant="light" size="lg">Rejoindre le réseau<ArrowRight className="h-5 w-5" aria-hidden /></Button>
        <Button to="/annuaire" variant="ghost" size="lg">Explorer l'annuaire</Button>
        {!!plaquette.data?.length && <Button to={plaquette.data[0].file} variant="ghost" size="lg" download><Download className="h-5 w-5" aria-hidden />La plaquette<span className="sr-only"> (PDF)</span></Button>}
      </PageHero>

      {/* Chiffres clés */}
      <div className="border-b border-navy/10 bg-white">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {figures.map((f, i) => (
            <div key={f.label} className={`border-navy/10 px-2 py-7 even:border-l even:pl-6 sm:py-9 lg:border-l lg:pl-8 lg:first:border-l-0 lg:first:pl-2 ${i >= 2 ? "border-t lg:border-t-0" : ""}`}>
              <dd className="font-heading text-4xl font-extrabold text-navy sm:text-5xl">{f.value}</dd>
              <dt className="mt-1 text-navy/65">{f.label}</dt>
            </div>))}
        </dl>
      </div>

      <Section>
        <SectionHeading eyebrow="Qui sommes-nous" title="Vision, mission, ambition et valeurs" />
        <div className="grid gap-5 md:grid-cols-2">
          {[{ t: "Notre vision", text: VISION, icon: Eye }, { t: "Notre ambition", text: AMBITION, icon: Compass }].map((b) => (
            <div key={b.t} className="card relative overflow-hidden p-7 sm:p-9">
              <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-gold" />
              <span className="icon-tile"><b.icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-2xl">{b.t}</h3>
              <p className="mt-3 text-lg leading-relaxed text-navy/75">{b.text}</p>
            </div>))}
        </div>

        <div className="mt-14">
          <h3 className="text-2xl">Notre mission</h3>
          <p className="mt-2 text-lg text-navy/70">Trois piliers guident chaque action du réseau.</p>
          <ol className="mt-6 grid gap-5 md:grid-cols-3">
            {MISSIONS.map((m, i) => (
              <li key={m.title} className="card p-6 sm:p-7">
                <div className="flex items-center justify-between">
                  <span className="icon-tile"><m.icon className="h-5 w-5" aria-hidden /></span>
                  <span className="font-heading text-3xl font-extrabold text-navy/10">0{i + 1}</span>
                </div>
                <h4 className="mt-5 font-heading text-xl font-bold">{m.title}</h4>
                <p className="mt-2 leading-relaxed text-navy/70">{m.description}</p>
              </li>))}
          </ol>
        </div>
      </Section>

      <Section tone="offwhite">
        <SectionHeading eyebrow="Ce qui nous engage" title="Nos valeurs" intro="Cinq valeurs guident la vie du réseau." />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {VALEURS.map((v) => (
            <li key={v.title} className="card p-6 sm:p-7">
              <span className="icon-tile"><v.icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-xl">{v.title}</h3>
              <p className="mt-2 leading-relaxed text-navy/70">{v.description}</p>
            </li>))}
        </ul>
      </Section>

      {trajectoire.data?.content && (
        <Section>
          <SectionHeading eyebrow="Notre histoire" title={trajectoire.data.title || "Notre trajectoire"} />
          <div className="max-w-3xl"><RichText text={trajectoire.data.content} /></div>
        </Section>)}

      <Section tone={trajectoire.data?.content ? "offwhite" : "white"}>
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHeading eyebrow="Adhésion" title="Qui peut adhérer ?" intro="Le réseau est ouvert à tous les acteurs du territoire." />
            <ul className="-mt-4 grid gap-3 sm:grid-cols-2">
              {PROFILS.map((p) => (
                <li key={p.name} className="card flex items-center gap-3 p-4">
                  <span className="icon-tile h-10 w-10"><p.icon className="h-5 w-5" aria-hidden /></span>
                  <span className="font-semibold leading-snug">{p.name}</span>
                </li>))}
            </ul>
          </div>
          <div>
            <SectionHeading eyebrow="En trois étapes" title="Comment ça marche ?" />
            <ol className="-mt-4 space-y-4">
              {STEPS.map((s, i) => (
                <li key={s.title} className="card flex gap-5 p-5 sm:p-6">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-navy font-heading text-lg font-bold text-white">{i + 1}</span>
                  <div><h3 className="text-xl">{s.title}</h3><p className="mt-1 text-navy/70">{s.description}</p></div>
                </li>))}
            </ol>
            <Button to="/adherer" size="lg" className="mt-6 w-full sm:w-auto"><UsersRound className="h-5 w-5" aria-hidden />Devenir membre</Button>
          </div>
        </div>
      </Section>

      <CtaBand title="Prêt à rejoindre le réseau ?" text="Devenez acteur du changement et construisez avec nous l'avenir des pôles de Diamniadio et du Lac Rose.">
        <Button to="/adherer" variant="light" size="lg">Adhérer maintenant<ArrowRight className="h-5 w-5" aria-hidden /></Button>
        <Button to="/contact" variant="ghost" size="lg">Nous contacter</Button>
      </CtaBand>
    </>
  );
}
