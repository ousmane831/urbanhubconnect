import { ArrowRight, Briefcase, Check, Download, Eye, Handshake, Phone, Sprout, Users } from "lucide-react";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { PartnerBand } from "../features/events/PartnerBand";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";
import { getDocuments, getPartners, getTiers } from "../services/api";
import { fmtFcfa } from "../utils/format";

const WHY = [
  { title: "Gagner en visibilité", description: "Logo sur les supports de l'événement et du réseau, prise de parole et présence au Village du Pôle.", icon: Eye },
  { title: "Développer ses affaires", description: "Business Connect, rencontre Achetons Local et Mur des opportunités.", icon: Briefcase },
  { title: "Fédérer ses équipes", description: "Reboisement du Lac Rose et rendez-vous d'affaires.", icon: Users },
  { title: "Agir pour le territoire", description: "Un bosquet dans la Forêt Urban Hub Connect et un engagement aux côtés des acteurs des deux pôles.", icon: Sprout },
];

/** « Réservé aux PME… : espace PME, Business Connect, … » → phrase d'introduction + liste des contreparties. */
function splitBenefits(text: string) {
  const [intro, rest] = text.includes(" : ") ? [text.slice(0, text.indexOf(" : ")), text.slice(text.indexOf(" : ") + 3)] : ["", text];
  return { intro, items: rest.split(/,\s+/).map((s) => s.trim()).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)) };
}

export default function Partners() {
  useSeo("Partenaires", "Formules de partenariat avec Urban Hub Connect et demande de rappel.");
  const tiers = useAsync(getTiers);
  const partners = useAsync(getPartners);
  const dossier = useAsync(() => getDocuments("partnership"));
  const site = useSiteSettings();
  const fields: FieldDef[] = [
    { name: "company", label: "Entreprise ou institution", type: "text", required: true },
    { name: "tier", label: "Formule envisagée", type: "select", options: tiers.data?.map((t) => ({ value: t.slug, label: `${t.name} · ${fmtFcfa(t.amount_fcfa)} HT` })) },
    { name: "contact_name", label: "Nom du contact", type: "text", required: true }, { name: "role", label: "Fonction", type: "text" },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "message", label: "Message", type: "textarea" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ];
  return (
    <>
      <PageHero eyebrow="Partenaires" title="Cinq formules pour soutenir le réseau et gagner en visibilité"
        intro="Devenez partenaire d'Urban Hub Connect et soutenez le développement des pôles de Diamniadio et du Lac Rose.">
        <Button to="#formules" variant="light" size="lg">Voir les formules<ArrowRight className="h-5 w-5" aria-hidden /></Button>
        <Button to="#rappel" variant="ghost" size="lg"><Phone className="h-5 w-5" aria-hidden />Être rappelé</Button>
        {dossier.data?.[0] && <Button to={dossier.data[0].file} variant="ghost" size="lg" download><Download className="h-5 w-5" aria-hidden />Dossier de partenariat<span className="sr-only"> (PDF)</span></Button>}
      </PageHero>

      <Section>
        <SectionHeading eyebrow="Pourquoi devenir partenaire" title="Ce que vous y gagnez" />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map((w) => (
            <li key={w.title} className="card p-6">
              <span className="icon-tile"><w.icon className="h-5 w-5" aria-hidden /></span>
              <h3 className="mt-5 text-lg">{w.title}</h3>
              <p className="mt-2 leading-relaxed text-navy/70">{w.description}</p>
            </li>))}
        </ul>
      </Section>

      <Section tone="offwhite" id="formules">
        <SectionHeading eyebrow="Édition 2026" title="Formules 2026" intro="Choisissez la formule adaptée à votre engagement pour le Grand Week-End du Pôle et le réseau." />
        <Async state={tiers} empty="Les formules de partenariat seront publiées prochainement.">
          {(list) => (
            <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {list.map((t, i) => {
                const featured = i === 0;
                const { intro, items } = splitBenefits(t.benefits ?? "");
                return (
                  <li key={t.slug} className={`relative flex flex-col rounded-2xl p-6 sm:p-7 ${featured ? "bg-navy text-white shadow-lift" : "card"}`}>
                    {t.description && <span className={`absolute right-5 top-5 rounded-full px-3 py-1 text-xs font-bold ${featured ? "bg-gold text-navy" : "bg-gold/15 text-navy"}`}>{t.description}</span>}
                    <h3 className={`pr-24 text-xl ${featured ? "text-white" : ""}`}>{t.name}</h3>
                    <p className="mt-4 flex items-baseline gap-2">
                      <span className={`font-heading text-3xl font-extrabold ${featured ? "text-gold-light" : "text-green"}`}>{fmtFcfa(t.amount_fcfa)}</span>
                      <span className={`text-sm font-semibold ${featured ? "text-white/60" : "text-navy/50"}`}>HT</span>
                    </p>
                    {intro && <p className={`mt-4 text-sm font-semibold ${featured ? "text-white/85" : "text-navy/80"}`}>{intro}</p>}
                    {!!items.length && (
                      <ul className={`mt-4 flex-1 space-y-2 border-t pt-4 text-[15px] ${featured ? "border-white/15 text-white/85" : "border-navy/10 text-navy/75"}`}>
                        {items.map((b) => <li key={b} className="flex gap-2.5"><Check className={`mt-0.5 h-4 w-4 shrink-0 ${featured ? "text-mint" : "text-green"}`} aria-hidden />{b}</li>)}
                      </ul>)}
                  </li>);
              })}
            </ul>)}
        </Async>
        <p className="mt-8 max-w-4xl text-navy/75">Montants hors taxes, payables en plusieurs fois et combinables avec un apport en nature ou un parrainage thématique. Chaque partenaire reçoit un bilan chiffré et illustré après l'événement. Engagements pour l'édition 2026 jusqu'au 25 novembre 2026 ; les logos des partenaires sont intégrés aux supports dès la signature, au plus tard le 27 novembre.</p>
        {dossier.data?.[0] && <a href={dossier.data[0].file} download className="link mt-5 inline-flex items-center gap-2"><Download className="h-4 w-4" aria-hidden />Télécharger le dossier de l'événement et de partenariat<span className="sr-only"> (PDF)</span></a>}
      </Section>

      {!!partners.data?.length && (
        <Section>
          <SectionHeading eyebrow="Ils nous soutiennent" title="Nos partenaires" center />
          <ul className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            {partners.data.map((p) => {
              const img = <img src={p.logo} alt={p.name} loading="lazy" className="h-12 w-auto max-w-[10rem] object-contain sm:h-14" />;
              return <li key={p.name} className="card flex h-24 items-center px-6">{p.website ? <a href={p.website} target="_blank" rel="noopener noreferrer">{img}</a> : img}</li>;
            })}
          </ul>
        </Section>)}

      <Section tone={partners.data?.length ? "offwhite" : "white"} id="rappel">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
          <div>
            <SectionHeading eyebrow="Contact partenaires" title="Être rappelé" intro="Laissez vos coordonnées : la Coordination vous recontacte sous 72 heures." />
            <div className="-mt-4 card flex items-center gap-4 p-5">
              <span className="icon-tile"><Handshake className="h-5 w-5" aria-hidden /></span>
              <p className="text-navy/75">Une question avant de vous engager ? Appelez le <a className="link whitespace-nowrap" href={`tel:${site.phone.replace(/\s/g, "")}`}>{site.phone}</a>.</p>
            </div>
          </div>
          <div className="card p-6 sm:p-8">
            <ConfigForm key={tiers.data?.length ?? 0} endpoint="/partnerships/" fields={fields} submitLabel="Demander à être rappelé" successFallback="Merci. La Coordination vous rappellera sous 72 heures." />
          </div>
        </div>
      </Section>

      <PartnerBand />
    </>
  );
}
