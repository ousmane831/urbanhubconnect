import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";
import { NAV_LINKS } from "./nav";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `rounded px-2 py-2 text-[0.95rem] font-semibold hover:text-green ${isActive ? "text-green underline decoration-2 underline-offset-8" : "text-navy"}`;

export function Header() {
  const [open, setOpen] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="sticky top-0 z-40 border-b border-navy/10 bg-white/95 backdrop-blur">
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        Aller au contenu
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-1 xl:flex">
          {NAV_LINKS.map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
          <Button to="/adherer" className="ml-3 !min-h-[40px] !py-2">Adhérer</Button>
        </nav>
        <button ref={toggle} className="flex h-11 w-11 items-center justify-center rounded-md border border-navy/20 xl:hidden"
          aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>
      {open && (
        <div id="menu-mobile" ref={menu} className="max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-navy/10 bg-white xl:hidden">
          <nav aria-label="Navigation mobile" className="mx-auto flex max-w-7xl flex-col px-4 py-4 sm:px-6">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => `border-b border-navy/10 py-3.5 text-lg font-semibold ${isActive ? "text-green" : ""}`}>{l.label}</NavLink>
            ))}
            <Button to="/adherer" className="mt-5">Adhérer</Button>
          </nav>
        </div>
      )}
    </header>
  );
}
