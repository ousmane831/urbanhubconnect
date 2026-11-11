import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "light" | "ghost";
type Size = "md" | "lg";
const styles: Record<Variant, string> = {
  primary: "bg-green text-white shadow-sm hover:bg-green-2",
  secondary: "border border-navy/20 bg-white text-navy hover:border-navy/40 hover:bg-offwhite",
  light: "bg-white text-navy shadow-sm hover:bg-offwhite",
  ghost: "border border-white/35 text-white hover:border-white/60 hover:bg-white/10",
};
const sizes: Record<Size, string> = { md: "min-h-[44px] px-5 text-base", lg: "min-h-[52px] px-6 text-[1.05rem]" };
const base = "inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

interface Common { variant?: Variant; size?: Size; className?: string }
type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type LinkProps = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", size = "md", className = "", ...rest } = props;
  const cls = `${base} ${sizes[size]} ${styles[variant]} ${className}`;
  if ("to" in rest && rest.to) {
    const { to, ...a } = rest as LinkProps;
    // Liens externes, ancres, fichiers (/media, téléchargement) : vrai lien <a>, jamais une navigation interne de l'application.
    const plain = /^(https?:|#|mailto:|tel:|\/media\/)/.test(to) || a.download !== undefined;
    return plain ? <a href={to} className={cls} {...a} /> : <Link to={to} className={cls} {...a} />;
  }
  return <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
