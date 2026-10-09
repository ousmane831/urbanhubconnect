import { Facebook, Instagram, Linkedin } from "lucide-react";
import { Link } from "react-router-dom";
import { NewsletterForm } from "../../features/newsletter/NewsletterForm";
import { useSiteSettings } from "../../hooks/useSiteSettings";
import { HexPattern } from "../ui/HexPattern";
import { Logo } from "./Logo";
import { NAV_LINKS } from "./nav";

export function Footer() {
  const s = useSiteSettings();
  const links = [...NAV_LINKS.filter((l) => l.to !== "/contact"), { to: "/adherer", label: "Adhérer" }, { to: "/presse", label: "Presse" }, { to: "/contact", label: "Contact" }];
  const socials = [[s.linkedin, Linkedin, "LinkedIn"], [s.facebook, Facebook, "Facebook"], [s.instagram, Instagram, "Instagram"]] as const;
  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <HexPattern className="text-white/[0.04]" />
      <div className="relative mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div className="space-y-4">
          <Logo />
          <address className="not-italic text-white/85">{s.address.split(",").map((l) => <span key={l} className="block">{l.trim()}</span>)}</address>
          <p><a className="underline-offset-4 hover:underline" href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></p>
          <p><a className="underline-offset-4 hover:underline" href={`mailto:${s.email}`}>{s.email}</a></p>
        </div>
        <nav aria-label="Pied de page"><h2 className="mb-3 text-base">Explorer</h2>
          <ul className="space-y-2">{links.map((l) => <li key={l.to}><Link className="text-white/85 underline-offset-4 hover:underline" to={l.to}>{l.label}</Link></li>)}</ul>
        </nav>
        <div><h2 className="mb-3 text-base">Informations légales</h2>
          <ul className="space-y-2">
            <li><Link className="text-white/85 underline-offset-4 hover:underline" to="/mentions-legales">Mentions légales</Link></li>
            <li><Link className="text-white/85 underline-offset-4 hover:underline" to="/confidentialite">Confidentialité</Link></li>
          </ul>
          <ul className="mt-5 flex gap-3">
            {socials.filter(([url]) => url).map(([url, Icon, label]) => (
              <li key={label}><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (nouvel onglet)`}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-white/30 hover:bg-white/10"><Icon className="h-5 w-5" aria-hidden /></a></li>
            ))}
          </ul>
        </div>
        <NewsletterForm onDark />
      </div>
      <p className="relative border-t border-white/15 px-4 py-5 text-center text-sm text-white/75">{s.footer_text}</p>
    </footer>
  );
}
