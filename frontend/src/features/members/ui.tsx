import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/** En-tête commun des sections de l'Espace membres : icône, titre, phrase d'aide, action à droite (sous le titre sur mobile). */
export function PanelHeader({ icon: Icon, title, intro, action }: { icon: LucideIcon; title: string; intro?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3 sm:gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green text-white sm:h-12 sm:w-12"><Icon className="h-5 w-5 sm:h-6 sm:w-6" aria-hidden /></span>
        <div className="min-w-0">
          <h2 className="text-2xl leading-tight sm:text-3xl">{title}</h2>
          {intro && <p className="mt-1.5 max-w-3xl text-navy/75">{intro}</p>}
        </div>
      </div>
      {action && <div className="shrink-0 [&>*]:w-full sm:[&>*]:w-auto">{action}</div>}
    </div>
  );
}

/** Carte blanche des sections (bord discret, coins arrondis, marges réduites sur mobile). */
export const Card = ({ children, className = "", as: Tag = "section", ...rest }: { children: ReactNode; className?: string; as?: "section" | "div" | "article" | "li"; "aria-label"?: string }) => (
  <Tag className={`rounded-2xl border border-navy/10 bg-white p-4 shadow-soft sm:p-6 ${className}`} {...rest}>{children}</Tag>
);

const TONES = {
  green: "bg-green/10 text-green",
  gold: "bg-gold/15 text-navy",
  red: "bg-red-50 text-red-800",
  grey: "bg-navy/5 text-navy/75",
  purple: "bg-purple/10 text-purple",
};
export const Badge = ({ tone = "grey", children }: { tone?: keyof typeof TONES; children: ReactNode }) => (
  <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold sm:text-sm ${TONES[tone]}`}>{children}</span>
);

/** Message de retour après une action (succès ou erreur), annoncé aux lecteurs d'écran. */
export const Notice = ({ notice }: { notice: { ok: boolean; text: string } | null }) =>
  notice ? (
    <p role={notice.ok ? "status" : "alert"} className={`rounded-xl border p-4 font-semibold ${notice.ok ? "border-green/30 bg-green/5 text-green" : "border-red-300 bg-red-50 text-red-900"}`}>{notice.text}</p>
  ) : null;

export const primaryBtn = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-green px-5 font-semibold text-white transition-colors hover:bg-green-2 disabled:opacity-60";
export const secondaryBtn = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-navy/20 bg-white px-5 font-semibold text-navy transition-colors hover:border-navy/40 hover:bg-offwhite disabled:opacity-60";
export const dangerBtn = "inline-flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-red-700/60 bg-white px-5 font-semibold text-red-800 transition-colors hover:bg-red-50 disabled:opacity-60";
