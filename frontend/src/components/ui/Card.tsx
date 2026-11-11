import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";

/** Carte de présentation : pastille d'icône, titre, texte ; devient un lien entier si `to` est fourni. */
export function FeatureCard({ icon: Icon, title, children, to, cta = "En savoir plus", className = "" }: {
  icon?: LucideIcon; title: string; children?: ReactNode; to?: string; cta?: string; className?: string;
}) {
  const body = (
    <>
      {Icon && <span className="icon-tile mb-5 transition-colors group-hover:bg-green group-hover:text-white"><Icon className="h-5 w-5" aria-hidden /></span>}
      <h3 className="text-lg leading-snug text-navy sm:text-xl">{title}</h3>
      {children && <div className="mt-2 flex-1 leading-relaxed text-navy/70">{children}</div>}
      {to && <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-green">{cta}<ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden /></span>}
    </>
  );
  const cls = `group flex h-full flex-col card p-6 sm:p-7 ${to ? "card-hover" : ""} ${className}`;
  if (!to) return <div className={cls}>{body}</div>;
  return /^https?:/.test(to)
    ? <a href={to} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
    : <Link to={to} className={cls}>{body}</Link>;
}

/** Bandeau d'appel à l'action (fond bleu nuit), utilisé en bas des pages. */
export function CtaBand({ title, text, children }: { title: string; text?: string; children: ReactNode }) {
  return (
    <section className="bg-white py-14 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl bg-navy px-6 py-10 text-white sm:px-12 sm:py-14">
          <div aria-hidden className="absolute inset-y-0 right-0 w-1/2 opacity-60 [background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.12)_1px,transparent_0)] [background-size:22px_22px]" />
          <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 className="text-3xl leading-tight sm:text-4xl">{title}</h2>
              {text && <p className="mt-3 text-lg text-white/75">{text}</p>}
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">{children}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
