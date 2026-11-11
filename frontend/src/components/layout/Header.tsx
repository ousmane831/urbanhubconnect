import { ArrowRight, LogOut, Menu, Phone, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { useMaintenanceAuth } from "../../hooks/useMaintenanceAuth";
import { useSiteSettings } from "../../hooks/useSiteSettings";
import { Button } from "../ui/Button";
import { Logo } from "./Logo";
import { NAV_LINKS } from "./nav";

const linkCls = ({ isActive }: { isActive: boolean }) =>
  `relative whitespace-nowrap rounded-lg px-2.5 py-2 text-[0.93rem] font-semibold transition-colors ${isActive
    ? "text-green after:absolute after:inset-x-2.5 after:-bottom-[13px] after:h-[3px] after:rounded-full after:bg-green"
    : "text-navy/80 hover:bg-offwhite hover:text-navy"}`;

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const { pathname } = useLocation();
  const { isAuthenticated, logout } = useMaintenanceAuth();
  const s = useSiteSettings();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";  // le menu mobile occupe l'écran : la page ne défile pas derrière
    if (!open) return;
    menu.current?.querySelector<HTMLElement>("a")?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); toggle.current?.focus(); } };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open]);

  return (
    <header className={`sticky top-0 z-40 border-b bg-white/95 backdrop-blur transition-shadow ${scrolled ? "border-navy/10 shadow-soft" : "border-transparent"}`}>
      <a href="#contenu" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded focus:bg-navy focus:px-4 focus:py-2 focus:text-white">
        Aller au contenu
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav aria-label="Navigation principale" className="hidden items-center gap-0.5 xl:flex">
          {/* « Accueil » n'apparaît que dans le menu mobile : sur ordinateur, le logo y ramène */}
          {NAV_LINKS.filter((l) => l.to !== "/").map((l) => <NavLink key={l.to} to={l.to} className={linkCls}>{l.label}</NavLink>)}
        </nav>
        <div className="hidden items-center gap-2 xl:flex">
          <Link to="/espace-membres" aria-label="Espace membres" title="Espace membres"
            className="inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 text-sm font-semibold text-navy/80 hover:bg-offwhite hover:text-navy">
            <UserRound className="h-4 w-4" aria-hidden /><span className="hidden 2xl:inline">Espace membres</span>
          </Link>
          <Button to="/adherer" className="!min-h-[40px] !px-4 text-sm">Adhérer</Button>
          {isAuthenticated && (
            <button onClick={logout} title="Déconnexion du mode maintenance" aria-label="Quitter le mode maintenance"
              className="flex h-10 w-10 items-center justify-center rounded-lg text-navy/60 hover:bg-red-50 hover:text-red-700">
              <LogOut className="h-4 w-4" aria-hidden />
            </button>)}
        </div>
        <button ref={toggle} className="flex h-11 w-11 items-center justify-center rounded-lg border border-navy/15 text-navy xl:hidden"
          aria-expanded={open} aria-controls="menu-mobile" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} onClick={() => setOpen((o) => !o)}>
          {open ? <X aria-hidden /> : <Menu aria-hidden />}
        </button>
      </div>

      {open && (
        <div id="menu-mobile" ref={menu} className="fixed inset-x-0 bottom-0 top-16 overflow-y-auto bg-white xl:hidden">
          <nav aria-label="Navigation mobile" className="mx-auto flex max-w-7xl flex-col px-4 pb-10 pt-2 sm:px-6">
            {NAV_LINKS.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === "/"}
                className={({ isActive }) => `flex items-center justify-between border-b border-navy/10 py-4 font-heading text-xl font-bold ${isActive ? "text-green" : "text-navy"}`}>
                {l.label}<ArrowRight className="h-5 w-5 text-navy/30" aria-hidden />
              </NavLink>
            ))}
            <div className="mt-6 grid gap-3">
              <Button to="/adherer" size="lg">Adhérer au réseau</Button>
              <Button to="/espace-membres" variant="secondary" size="lg"><UserRound className="h-5 w-5" aria-hidden />Espace membres</Button>
            </div>
            <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="mt-6 inline-flex items-center gap-2 font-semibold text-navy/80"><Phone className="h-4 w-4 text-green" aria-hidden />{s.phone}</a>
            {isAuthenticated && (
              <button onClick={logout} className="mt-4 flex items-center gap-2 py-2 font-semibold text-navy/70 hover:text-red-700">
                <LogOut className="h-5 w-5" aria-hidden />Quitter le mode maintenance
              </button>)}
          </nav>
        </div>
      )}
    </header>
  );
}
