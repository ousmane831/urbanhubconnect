import type { ReactNode } from "react";

export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

export const Section = ({ children, className = "", id, tone = "white" }: {
  children: ReactNode; className?: string; id?: string; tone?: "white" | "offwhite" | "navy";
}) => (
  <section id={id} className={`py-14 sm:py-20 ${tone === "navy" ? "bg-navy text-white" : tone === "offwhite" ? "bg-offwhite" : "bg-white"} ${className}`}>
    <Container>{children}</Container>
  </section>
);

export const SectionHeading = ({ title, intro, onDark = false }: { title: string; intro?: string; onDark?: boolean }) => (
  <div className="mb-8 max-w-2xl sm:mb-10">
    <h2 className="text-2xl sm:text-3xl lg:text-4xl">{title}</h2>
    {intro && <p className={`mt-3 text-lg ${onDark ? "text-white/80" : "text-navy/75"}`}>{intro}</p>}
  </div>
);
