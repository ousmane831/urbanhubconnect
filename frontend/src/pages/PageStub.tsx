import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { useSeo } from "../hooks/useSeo";

/** TEMPORAIRE : remplacé page par page dans les lots suivants (voir routes.tsx). */
export function PageStub({ title }: { title: string }) {
  useSeo(title);
  return (
    <Section>
      <h1 className="text-3xl sm:text-4xl">{title}</h1>
      <p className="mt-4 text-lg text-navy/75">Cette page est en cours de construction.</p>
      <Button to="/" variant="secondary" className="mt-6">Retour à l'accueil</Button>
    </Section>
  );
}
