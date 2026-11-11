import { ArrowRight, BadgeCheck, ClipboardList, Sparkles, UsersRound } from "lucide-react";
import { Async } from "../components/ui/Async";
import { Button } from "../components/ui/Button";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { RichText } from "../components/ui/RichText";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getMembershipCategories, getOrganizationFilters, getPages } from "../services/api";
import { fmtFcfa } from "../utils/format";

export default function Membership() {
  useSeo("Adhérer à Urban Hub Connect", "Rejoignez le réseau des acteurs de Diamniadio et du Lac Rose : collèges, cotisations et formulaire d'adhésion.", undefined, true);
  const cats = useAsync(getMembershipCategories);
  const filters = useAsync(getOrganizationFilters);
  const pages = useAsync(() => getPages("adherer-"));
  const page = (slug: string) => pages.data?.find((p) => p.slug === slug);
  const intro = page("adherer-intro"), perks = page("adherer-avantages"), steps = page("adherer-etapes");
  const feesPublished = !!cats.data?.some((c) => c.amount_fcfa !== null);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const fields: FieldDef[] = [
    { name: "organization_or_name", label: "Organisation ou nom", type: "text", required: true },
    { name: "category", label: "Catégorie", type: "select", required: true,
      options: cats.data?.map((c) => ({ value: c.slug, label: c.amount_fcfa !== null ? `${c.name} · ${fmtFcfa(c.amount_fcfa)}` : c.name })) },
    { name: "college", label: "Collège", type: "select", options: opt(filters.data?.colleges) },
    { name: "sector", label: "Secteur", type: "select", options: opt(filters.data?.sectors) },
    { name: "pole", label: "Pôle", type: "select", options: filters.data?.poles.map((p) => ({ value: p.value, label: p.label })) },
    { name: "representative", label: "Représentant", type: "text", required: true }, { name: "role", label: "Fonction", type: "text" },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "commissions", label: "Commissions souhaitées", type: "multi", options: opt(filters.data?.commissions) },
    { name: "offers", label: "Ce que vous proposez", type: "textarea" }, { name: "needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "accept_charter", label: "J'accepte la Charte.", type: "consent" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ];
  return (
    <>
      <PageHero eyebrow="Adhésion" title={intro?.title ?? "Rejoignez le réseau"} intro={intro?.content}>
        <Button to="#formulaire" variant="light" size="lg">Demander mon adhésion<ArrowRight className="h-5 w-5" aria-hidden /></Button>
        <Button to="#cotisations" variant="ghost" size="lg">Découvrir les cotisations</Button>
      </PageHero>

      {perks && (
        <Section>
          <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-16">
            <SectionHeading eyebrow="Pourquoi adhérer" title={perks.title} intro="Les atouts d'une adhésion à Urban Hub Connect." />
            <div className="card p-6 sm:p-8">
              <span className="icon-tile mb-5"><Sparkles className="h-5 w-5" aria-hidden /></span>
              <RichText text={perks.content} />
            </div>
          </div>
        </Section>)}

      <Section tone="offwhite" id="cotisations">
        <SectionHeading eyebrow="Cotisations" title="Cotisations annuelles" intro="Consultez les catégories d'adhésion et leurs cotisations." />
        <Async state={cats} empty="Les catégories d'adhésion seront publiées prochainement.">
          {(list) => (
            <>
              <ul className="grid gap-3 md:grid-cols-2">
                {list.map((c) => (
                  <li key={c.slug} className="card flex items-center justify-between gap-4 p-5">
                    <span className="flex items-center gap-3 font-semibold leading-snug">
                      <span className="icon-tile h-10 w-10"><UsersRound className="h-5 w-5" aria-hidden /></span>{c.name}</span>
                    {feesPublished && <span className="shrink-0 font-heading text-lg font-bold text-green">{c.amount_fcfa !== null ? fmtFcfa(c.amount_fcfa) : "À confirmer"}</span>}
                  </li>))}
              </ul>
              {!feesPublished && (
                <p className="mt-6 flex items-start gap-2 text-navy/75"><BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden />
                  Le montant de la cotisation vous est communiqué par la Coordination.</p>)}
            </>)}
        </Async>
      </Section>

      <Section id="formulaire">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.6fr] lg:gap-14">
          <div className="lg:sticky lg:top-24 lg:self-start">
            <SectionHeading eyebrow="Votre demande" title="Votre demande d'adhésion" intro="Complétez les informations ci-dessous pour rejoindre le réseau." />
            {steps && (
              <div className="-mt-4 card p-6">
                <h3 className="mb-3 flex items-center gap-2 text-lg"><ClipboardList className="h-5 w-5 text-green" aria-hidden />{steps.title}</h3>
                <RichText text={steps.content} />
              </div>)}
          </div>
          <div className="card p-6 sm:p-8">
            <ConfigForm key={`${cats.data?.length}-${filters.data ? 1 : 0}`} endpoint="/memberships/" fields={fields} submitLabel="Envoyer ma demande d'adhésion"
              successFallback="Merci. Votre demande a bien été transmise. La Coordination vous contactera sous 72 heures." />
          </div>
        </div>
      </Section>
    </>
  );
}
