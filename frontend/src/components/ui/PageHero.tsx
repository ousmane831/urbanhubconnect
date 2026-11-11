import type { ReactNode } from "react";
import { Container } from "./Container";
import { HexPattern } from "./HexPattern";

/** En-tête unique des pages intérieures : surtitre, titre, introduction, actions ; colonne optionnelle à droite. */
export function PageHero({ title, intro, eyebrow, children, aside, size = "md" }: {
  title: string; intro?: string; eyebrow?: string; children?: ReactNode; aside?: ReactNode; size?: "md" | "lg";
}) {
  return (
    <section className="relative overflow-hidden bg-navy text-white">
      {/* motif hexagonal, seulement à droite : signature discrète de l'identité */}
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-full [mask-image:linear-gradient(to_left,black,transparent_75%)] sm:w-2/3">
        <HexPattern className="text-white/[0.07]" />
      </div>
      <Container className={`relative ${size === "lg" ? "py-16 sm:py-24" : "py-12 sm:py-16 lg:py-20"}`}>
        <div className={aside ? "grid gap-10 lg:grid-cols-[1.3fr_1fr] lg:items-center" : ""}>
          <div className="max-w-3xl">
            {eyebrow && <p className="eyebrow mb-4 !text-gold-light">{eyebrow}</p>}
            <h1 className={`leading-[1.05] ${size === "lg" ? "text-4xl sm:text-5xl lg:text-6xl" : "text-3xl sm:text-4xl lg:text-5xl"}`}>{title}</h1>
            {intro && <p className="mt-5 max-w-2xl text-lg leading-relaxed text-white/80 sm:text-xl">{intro}</p>}
            {children && <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">{children}</div>}
          </div>
          {aside}
        </div>
      </Container>
    </section>
  );
}
