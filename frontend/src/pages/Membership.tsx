import { Section } from "../components/ui/Container";
import { Async } from "../components/ui/Async";
import { HexPattern } from "../components/ui/HexPattern";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getMembershipCategories, getOrganizationFilters } from "../services/api";
import { fmtFcfa } from "../utils/format";
import { Users, CreditCard, CheckCircle } from "lucide-react";

export default function Membership() {
  useSeo("Adhérer au réseau", "Catégories et cotisations d'adhésion à Urban Hub Connect, et formulaire de demande d'adhésion.");
  const cats = useAsync(getMembershipCategories);
  const filters = useAsync(getOrganizationFilters);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const fields: FieldDef[] = [
    { name: "organization_or_name", label: "Organisation ou nom", type: "text", required: true },
    { name: "category", label: "Catégorie d'adhésion", type: "select", required: true, options: opt(cats.data) },
    { name: "college", label: "Collège", type: "select", options: opt(filters.data?.colleges) },
    { name: "sector", label: "Secteur", type: "text", required: true },
    { name: "pole", label: "Pôle", type: "select", options: filters.data?.poles.map((p) => ({ value: p.value, label: p.label })) },
    { name: "representative", label: "Représentant", type: "text", required: true }, { name: "role", label: "Fonction", type: "text" },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "commissions", label: "Commissions qui vous intéressent", type: "multi", options: opt(filters.data?.commissions) },
    { name: "offers", label: "Ce que vous proposez", type: "textarea" }, { name: "needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "accept_charter", label: "J'accepte la charte du réseau.", type: "consent" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" },
  ];
  return (
    <>
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
              <Users className="h-6 w-6" />
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Adhérer à Urban Hub Connect</h1>
          </div>
          <p className="mt-4 max-w-2xl text-xl text-white/85">
            Choisissez la catégorie qui correspond à votre structure.
          </p>
        </div>
      </section>

      <Section>
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-soft">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-green opacity-10" />
          <div className="flex items-center gap-2 mb-6">
            <CreditCard className="h-6 w-6 text-green" />
            <h2 className="text-2xl font-bold text-navy">Catégories d'adhésion</h2>
          </div>
          <Async state={cats} empty="Les catégories d'adhésion seront publiées prochainement.">
            {(list) => (
              <ul className="grid gap-4 sm:grid-cols-2">
                {list.map((c) => (
                  <li key={c.slug} className="group relative overflow-hidden rounded-xl border border-navy/10 bg-offwhite p-5 transition-all hover:border-green hover:shadow-md">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-lg font-semibold text-navy">{c.name}</span>
                      <span className="whitespace-nowrap font-heading text-xl font-bold text-green">{fmtFcfa(c.amount_fcfa)}</span>
                    </div>
                  </li>))}
              </ul>)}
          </Async>
        </div>
      </Section>

      <Section tone="offwhite">
        <div className="relative overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 sm:p-8 shadow-soft max-w-4xl mx-auto">
          <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-purple opacity-10" />
          <div className="flex items-center gap-2 mb-6">
            <CheckCircle className="h-6 w-6 text-purple" />
            <h2 className="text-2xl font-bold text-navy">Demande d'adhésion</h2>
          </div>
          <ConfigForm key={`${cats.data?.length}-${filters.data ? 1 : 0}`} endpoint="/memberships/" fields={fields} submitLabel="Envoyer ma demande"
            successFallback="Merci. Votre demande a bien été transmise. La Coordination vous contactera sous 72 heures." />
        </div>
      </Section>
    </>
  );
}
