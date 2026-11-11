import type { ReactNode } from "react";

export const Container = ({ children, className = "" }: { children: ReactNode; className?: string }) => (
  <div className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>
);

type Tone = "white" | "offwhite" | "navy";
const TONES: Record<Tone, string> = { white: "bg-white", offwhite: "bg-offwhite", navy: "bg-navy text-white" };

export const Section = ({ children, className = "", id, tone = "white" }: {
  children: ReactNode; className?: string; id?: string; tone?: Tone;
}) => (
  <section id={id} className={`scroll-mt-24 py-14 sm:py-20 lg:py-24 ${TONES[tone]} ${className}`}>
    <Container>{children}</Container>
  </section>
);

/** Titre de section : surtitre facultatif, titre, introduction, action à droite (sous le texte sur mobile). */
export const SectionHeading = ({ title, intro, eyebrow, onDark = false, center = false, action }: {
  title: string; intro?: string; eyebrow?: string; onDark?: boolean; center?: boolean; action?: ReactNode;
}) => (
  <div className={`mb-10 flex flex-col gap-5 sm:mb-12 ${center ? "items-center text-center" : "lg:flex-row lg:items-end lg:justify-between"}`}>
    <div className={`max-w-2xl ${center ? "mx-auto" : ""}`}>
      {eyebrow && <p className={`eyebrow mb-3 ${onDark ? "!text-gold-light" : ""}`}>{eyebrow}</p>}
      <h2 className={`text-3xl leading-tight sm:text-4xl ${onDark ? "text-white" : "text-navy"}`}>{title}</h2>
      {intro && <p className={`mt-4 text-lg leading-relaxed ${onDark ? "text-white/80" : "text-navy/70"}`}>{intro}</p>}
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
