import type { ReactNode } from "react";
import { Container } from "./Container";
import { HexPattern } from "./HexPattern";

export const PageHero = ({ title, intro, children }: { title: string; intro?: string; children?: ReactNode }) => (
  <section className="relative overflow-hidden bg-navy text-white">
    <HexPattern className="text-white/[0.05]" />
    <Container className="relative py-12 sm:py-16">
      <h1 className="text-3xl sm:text-5xl">{title}</h1>
      {intro && <p className="mt-3 max-w-2xl text-lg text-white/85">{intro}</p>}
      {children && <div className="mt-6">{children}</div>}
    </Container>
  </section>
);
