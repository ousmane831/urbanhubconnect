import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { useSeo } from "../hooks/useSeo";

interface Props { code: string; title: string; text: string }

export function ErrorPage({ code, title, text }: Props) {
  useSeo(`${code} · ${title}`, text);
  return (
    <section className="relative overflow-hidden bg-navy py-24 text-white">
      <HexPattern className="text-white/[0.05]" />
      <Container className="relative">
        <p className="font-heading text-6xl font-extrabold text-gold-light sm:text-8xl">{code}</p>
        <h1 className="mt-4 text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/80">{text}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button to="/" variant="light">Retour à l'accueil</Button>
          <Button to="/contact" variant="ghost">Contacter la Coordination</Button>
        </div>
      </Container>
    </section>
  );
}
export const NotFound = () => <ErrorPage code="404" title="Cette page n'existe pas" text="L'adresse est peut-être incorrecte, ou la page a été déplacée." />;
export const Forbidden = () => <ErrorPage code="403" title="Accès non autorisé" text="Cette page est réservée. Si vous pensez avoir droit d'y accéder, contactez la Coordination." />;
export const ServerError = () => <ErrorPage code="500" title="Un problème est survenu de notre côté" text="Réessayez dans quelques instants. Si le problème persiste, écrivez-nous." />;
