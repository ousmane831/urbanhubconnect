import { ArrowRight } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { useSeo } from "../hooks/useSeo";

interface Props { code: string; title: string; text: string }

export function ErrorPage({ code, title, text }: Props) {
  useSeo(`${code} · ${title}`, text);
  return (
    <section className="relative overflow-hidden bg-navy py-20 text-white sm:py-28">
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_left,black,transparent_75%)]"><HexPattern className="text-white/[0.07]" /></div>
      <Container className="relative">
        <p className="eyebrow !text-gold-light">Erreur {code}</p>
        <p className="mt-4 font-heading text-7xl font-extrabold leading-none text-white/15 sm:text-9xl" aria-hidden>{code}</p>
        <h1 className="mt-4 text-3xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/75">{text}</p>
        <div className="mt-9 flex flex-col gap-3 sm:flex-row">
          <Button to="/" variant="light" size="lg">Retour à l'accueil<ArrowRight className="h-5 w-5" aria-hidden /></Button>
          <Button to="/contact" variant="ghost" size="lg">Contacter la Coordination</Button>
        </div>
      </Container>
    </section>
  );
}
export const NotFound = () => <ErrorPage code="404" title="Cette page n'existe pas" text="L'adresse est peut-être incorrecte, ou la page a été déplacée." />;
export const Forbidden = () => <ErrorPage code="403" title="Accès non autorisé" text="Cette page est réservée. Si vous pensez avoir droit d'y accéder, contactez la Coordination." />;
export const ServerError = () => <ErrorPage code="500" title="Un problème est survenu de notre côté" text="Réessayez dans quelques instants. Si le problème persiste, écrivez-nous." />;
