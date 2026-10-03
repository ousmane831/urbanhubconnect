import { Download } from "lucide-react";
import { Async } from "../components/ui/Async";
import { Section } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getDocuments, getPressReleases } from "../services/api";
import { fmtDate } from "../utils/format";

const FIELDS: FieldDef[] = [
  { name: "media", label: "Média", type: "text", required: true }, { name: "name", label: "Nom", type: "text", required: true },
  { name: "role", label: "Fonction", type: "text" }, { name: "phone", label: "Téléphone", type: "tel", required: true },
  { name: "email", label: "E-mail", type: "email", required: true },
  { name: "attendance_days", label: "Jours de présence", type: "text", hint: "Exemple : vendredi et samedi" },
];
const DownloadLink = ({ href, label }: { href: string; label: string }) => (
  <a href={href} download className="link inline-flex items-center gap-2 font-semibold"><Download className="h-4 w-4" aria-hidden />{label}<span className="sr-only"> (PDF)</span></a>
);

export default function Press() {
  useSeo("Presse", "Communiqués, dossier de presse et accréditation presse d'Urban Hub Connect.");
  const releases = useAsync(getPressReleases);
  const kit = useAsync(() => getDocuments("press_kit"));
  return (
    <>
      <PageHero title="Presse" />
      <Section><h2 className="mb-6 text-2xl">Communiqués</h2>
        <Async state={releases} empty="Aucun communiqué n'est publié pour le moment.">
          {(l) => <ul className="divide-y divide-navy/10 border-y border-navy/10">{l.map((r) => (
            <li key={r.slug} className="flex flex-wrap items-baseline justify-between gap-3 py-4">
              <div><p className="text-sm text-navy/70">{fmtDate(r.published_at)}</p><p className="text-lg font-semibold">{r.title}</p></div>
              {r.document && <DownloadLink href={r.document} label="Télécharger" />}
            </li>))}</ul>}
        </Async></Section>
      <Section tone="offwhite"><h2 className="mb-6 text-2xl">Dossier de presse</h2>
        <Async state={kit} empty="Le dossier de presse sera disponible prochainement.">
          {(l) => <ul className="space-y-3">{l.map((d) => <li key={d.file}><DownloadLink href={d.file} label={d.title} /></li>)}</ul>}
        </Async></Section>
      <Section><div className="max-w-3xl"><h2 className="mb-6 text-2xl">Demande d'accréditation</h2>
        <ConfigForm endpoint="/press/accreditation/" fields={FIELDS} submitLabel="Demander mon accréditation" successFallback="Merci. Votre demande d'accréditation a bien été transmise." /></div></Section>
    </>
  );
}
