import { BadgeCheck, ChevronRight, ClipboardList, UsersRound } from "lucide-react";
import { Container, Section, SectionHeading } from "../components/ui/Container";
import { Async } from "../components/ui/Async";
import { PageHero } from "../components/ui/PageHero";
import { RichText } from "../components/ui/RichText";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
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
      <PageHero title={intro?.title ?? "Rejoignez le réseau"} intro={intro?.content}>
        <div className="flex flex-wrap gap-3">
          <a href="#formulaire" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-green px-5 font-semibold text-white transition-colors hover:bg-green-2">
            Demander mon adhésion <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </a>
          <a href="#cotisations" className="inline-flex min-h-12 items-center rounded-md border border-white/35 px-5 font-semibold text-white transition-colors hover:bg-white/10">
            Découvrir les cotisations
          </a>
        </div>
      </PageHero>

      {perks && (
        <Section>
          <SectionHeading title={perks.title} intro="Les atouts d'une adhésion à Urban Hub Connect." />
          <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
            <div className="absolute -right-10 -top-10 h-36 w-36 rounded-full bg-gold opacity-[0.08]" />
            <div className="relative">
              <RichText text={perks.content} />
            </div>
          </div>
        </Section>
      )}

      <Section tone="offwhite" id="cotisations">
        <SectionHeading title="Cotisations annuelles" intro="Consultez les catégories d'adhésion et leurs cotisations." />
        <Async state={cats} empty="Les catégories d'adhésion seront publiées prochainement.">
          {(list) => feesPublished ? (
            <ul className="grid gap-4 md:grid-cols-2">
              {list.map((c) => (
                <li key={c.slug} className="flex flex-col justify-between gap-3 rounded-2xl border border-navy/10 bg-offwhite p-5 transition-shadow hover:shadow-soft sm:flex-row sm:items-center sm:p-6">
                  <h3 className="text-lg font-semibold text-navy">{c.name}</h3>
                  <p className="shrink-0 font-heading text-xl font-bold text-green">
                    {c.amount_fcfa !== null ? fmtFcfa(c.amount_fcfa) : "À confirmer"}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
              <ul className="grid gap-3 sm:grid-cols-2">{list.map((c, index) => (
                <li key={c.slug} className="flex items-center gap-3 rounded-xl bg-offwhite px-4 py-3 font-semibold text-navy">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${index % 3 === 0 ? "bg-green" : index % 3 === 1 ? "bg-purple" : "bg-gold"}`}>
                    <UsersRound className="h-4 w-4" aria-hidden="true" />
                  </span>
                  {c.name}
                </li>))}</ul>
              <p className="mt-6 flex items-start gap-2 border-t border-navy/10 pt-5 text-navy/75">
                <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-gold" aria-hidden="true" />
                Le montant de la cotisation vous est communiqué par la Coordination.
              </p>
            </div>)}
        </Async>
      </Section>

      {steps && (
        <Section>
          <SectionHeading title={steps.title} intro="Quelques étapes pour rejoindre le réseau." />
          <div className="rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-8">
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl bg-purple/10 text-purple">
              <ClipboardList className="h-6 w-6" aria-hidden="true" />
            </div>
            <RichText text={steps.content} />
          </div>
        </Section>
      )}

      <Section tone="offwhite" id="formulaire">
        <Container className="max-w-4xl !px-0">
          <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-soft">
            <div className="border-b border-navy/10 bg-white px-6 py-6 sm:px-8">
              <div className="flex items-center gap-3">
                <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gold text-white">
                  <UsersRound className="h-6 w-6" aria-hidden="true" />
                </span>
                <div>
                  <h2 className="text-2xl sm:text-3xl">Votre demande d'adhésion</h2>
                  <p className="mt-1 text-navy/70">Complétez les informations ci-dessous pour rejoindre le réseau.</p>
                </div>
              </div>
            </div>
            <div className="p-6 sm:p-8">
              <ConfigForm key={`${cats.data?.length}-${filters.data ? 1 : 0}`} endpoint="/memberships/" fields={fields} submitLabel="Envoyer ma demande d'adhésion"
                successFallback="Merci. Votre demande a bien été transmise. La Coordination vous contactera sous 72 heures." />
            </div>
          </div>
        </Container>
      </Section>
    </>
  );
}
