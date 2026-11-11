import { Container } from "../components/ui/Container";
import { PageHero } from "../components/ui/PageHero";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";

function LegalPage({ title, text }: { title: string; text: string }) {
  useSeo(title);
  return (
    <>
      <PageHero eyebrow="Informations légales" title={title} />
      <Container className="py-12 sm:py-16">
        <div className="mx-auto max-w-prose whitespace-pre-line text-lg leading-relaxed text-navy/85">{text || "Cette page sera complétée prochainement."}</div>
      </Container>
    </>
  );
}
export const LegalNotice = () => <LegalPage title="Mentions légales" text={useSiteSettings().legal_information} />;
export const PrivacyPolicy = () => <LegalPage title="Politique de confidentialité" text={useSiteSettings().privacy_policy} />;
