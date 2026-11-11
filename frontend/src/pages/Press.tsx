import { BadgeCheck, Download, FileText } from "lucide-react";
import { Async } from "../components/ui/Async";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Section, SectionHeading } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
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
  <a href={href} download className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg border border-navy/20 px-4 font-semibold text-navy hover:bg-offwhite">
    <Download className="h-4 w-4" aria-hidden />{label}<span className="sr-only"> (PDF)</span></a>
);

export default function Press() {
  useSeo("Presse", "Communiqués, dossier de presse et accréditation presse d'Urban Hub Connect.");
  const releases = useAsync(getPressReleases);
  const kit = useAsync(() => getDocuments("press_kit"));
  return (
    <>
      <PageHero eyebrow="Espace presse" title="Presse" intro="Communiqués, dossier de presse et demandes d'accréditation." />
      <Section>
        <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
          <div>
            <SectionHeading eyebrow="Actualité" title="Communiqués" />
            <Async state={releases} empty="Aucun communiqué n'est publié pour le moment.">
              {(l) => <ul className="space-y-3">{l.map((r) => (
                <li key={r.slug} className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex gap-4">
                    <span className="icon-tile"><FileText className="h-5 w-5" aria-hidden /></span>
                    <div><p className="text-sm text-navy/60">{fmtDate(r.published_at)}</p><p className="mt-0.5 font-semibold leading-snug">{r.title}</p></div>
                  </div>
                  {r.document && <DownloadLink href={r.document} label="Télécharger" />}
                </li>))}</ul>}
            </Async>
          </div>
          <div>
            <SectionHeading eyebrow="Ressources" title="Dossier de presse" />
            <Async state={kit} empty="Le dossier de presse sera disponible prochainement.">
              {(l) => <ul className="space-y-3">{l.map((d) => <li key={d.file} className="card flex items-center justify-between gap-3 p-5"><span className="font-semibold">{d.title}</span><DownloadLink href={d.file} label="PDF" /></li>)}</ul>}
            </Async>
          </div>
        </div>
      </Section>
      <Section tone="offwhite">
        <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr] lg:gap-14">
          <SectionHeading eyebrow="Journalistes" title="Demande d'accréditation" intro="Pour couvrir les événements du réseau, demandez votre accréditation : la Coordination vous répond rapidement." />
          <div className="card p-6 sm:p-8">
            <span className="icon-tile mb-6"><BadgeCheck className="h-5 w-5" aria-hidden /></span>
            <ConfigForm endpoint="/press/accreditation/" fields={FIELDS} submitLabel="Demander mon accréditation" successFallback="Merci. Votre demande d'accréditation a bien été transmise." />
          </div>
        </div>
      </Section>
    </>
  );
}
