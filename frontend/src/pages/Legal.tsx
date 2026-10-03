import { Container } from "../components/ui/Container";
import { useSeo } from "../hooks/useSeo";
import { useSiteSettings } from "../hooks/useSiteSettings";

function LegalPage({ title, text }: { title: string; text: string }) {
  useSeo(title);
  return (
    <Container className="max-w-3xl py-12 sm:py-16">
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <div className="mt-8 whitespace-pre-line text-lg leading-relaxed">{text || "Cette page sera complétée prochainement."}</div>
    </Container>
  );
}
export const LegalNotice = () => <LegalPage title="Mentions légales" text={useSiteSettings().legal_information} />;
export const PrivacyPolicy = () => <LegalPage title="Politique de confidentialité" text={useSiteSettings().privacy_policy} />;
