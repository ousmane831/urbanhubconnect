import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";

type Variant = "primary" | "secondary" | "light" | "ghost";
const styles: Record<Variant, string> = {
  primary: "bg-green text-white hover:bg-green-2",
  secondary: "border border-navy/30 text-navy hover:border-navy hover:bg-offwhite",
  light: "bg-white text-navy hover:bg-offwhite",
  ghost: "border border-white/40 text-white hover:bg-white/10",
};
const base = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-md px-5 py-2.5 text-base font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60";

interface Common { variant?: Variant; className?: string }
type ButtonProps = Common & ButtonHTMLAttributes<HTMLButtonElement> & { to?: undefined };
type LinkProps = Common & AnchorHTMLAttributes<HTMLAnchorElement> & { to: string };

export function Button(props: ButtonProps | LinkProps) {
  const { variant = "primary", className = "", ...rest } = props;
  const cls = `${base} ${styles[variant]} ${className}`;
  if ("to" in rest && rest.to) {
    const { to, ...a } = rest as LinkProps;
    return to.startsWith("http") ? <a href={to} className={cls} {...a} /> : <Link to={to} className={cls} {...a} />;
  }
  return <button type="button" className={cls} {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)} />;
}
