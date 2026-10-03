import { Button } from "../components/ui/Button";
import { Section } from "../components/ui/Container";
import { useSeo } from "../hooks/useSeo";

export default function MembersSoon() {
  useSeo("Espace membres", "L'espace membres d'Urban Hub Connect sera disponible prochainement.");
  return (
    <Section>
      <h1 className="text-3xl sm:text-5xl">Espace membres bientôt disponible</h1>
      <p className="mt-5 max-w-xl text-lg text-navy/75">Les membres du réseau y retrouveront prochainement leurs outils. En attendant, rejoignez le réseau.</p>
      <Button to="/adherer" className="mt-8">Adhérer au réseau</Button>
    </Section>
  );
}
