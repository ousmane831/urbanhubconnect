import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { NewsletterForm } from "../../features/newsletter/NewsletterForm";
import { useSiteSettings } from "../../hooks/useSiteSettings";
import { HexPattern } from "../ui/HexPattern";
import { Logo } from "./Logo";

const COLUMNS: { title: string; links: [string, string][] }[] = [
  { title: "Le réseau", links: [["/le-reseau", "Qui sommes-nous"], ["/nos-actions", "Nos actions"], ["/evenements", "Événements"],
    ["/evenements/grand-week-end-du-pole-2026", "Grand Week-End du Pôle"], ["/actualites", "Actualités"]] },
  { title: "Services", links: [["/annuaire", "Annuaire"], ["/cartographie", "Cartographie"], ["/adherer", "Adhérer"],
    ["/espace-membres", "Espace membres"], ["/partenaires", "Partenaires"], ["/presse", "Presse"]] },
];

export function Footer() {
  const s = useSiteSettings();
  const socials = [[s.linkedin, Linkedin, "LinkedIn"], [s.facebook, Facebook, "Facebook"], [s.instagram, Instagram, "Instagram"]] as const;
  const linkCls = "text-white/75 transition-colors hover:text-white";
  return (
    <footer className="relative overflow-hidden bg-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 [mask-image:linear-gradient(to_bottom,black,transparent_60%)]"><HexPattern className="text-white/[0.04]" /></div>
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Lettre d'information */}
        <div className="grid gap-6 border-b border-white/10 py-10 lg:grid-cols-[1fr_1.1fr] lg:items-center lg:py-12">
          <div>
            <p className="font-heading text-2xl font-bold leading-tight sm:text-3xl">Deux pôles, un seul élan.</p>
            <p className="mt-2 text-white/70">L'agenda du réseau, les nouveaux membres et les opportunités, chaque mois dans La Lettre du Hub.</p>
          </div>
          <NewsletterForm onDark />
        </div>

        {/* Colonnes */}
        <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.3fr]">
          <div className="space-y-5">
            <Logo onDark />
            <p className="max-w-xs text-white/70">Le réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose : connecter, coopérer, agir.</p>
            {socials.some(([url]) => url) && (
              <ul className="flex gap-2">
                {socials.filter(([url]) => url).map(([url, Icon, label]) => (
                  <li key={label}><a href={url} target="_blank" rel="noopener noreferrer" aria-label={`${label} (nouvel onglet)`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/20 transition-colors hover:border-white/50 hover:bg-white/10"><Icon className="h-4 w-4" aria-hidden /></a></li>))}
              </ul>)}
          </div>
          {COLUMNS.map((c) => (
            <nav key={c.title} aria-label={c.title}>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-gold-light">{c.title}</h2>
              <ul className="space-y-2.5">{c.links.map(([to, label]) => <li key={to}><Link className={linkCls} to={to}>{label}</Link></li>)}</ul>
            </nav>))}
          <div>
            <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.14em] text-gold-light">Coordination</h2>
            <ul className="space-y-3 text-white/75">
              <li className="flex gap-3"><MapPin className="mt-1 h-4 w-4 shrink-0 text-mint" aria-hidden /><address className="not-italic">{s.address}</address></li>
              <li className="flex gap-3"><Phone className="mt-1 h-4 w-4 shrink-0 text-mint" aria-hidden /><a className={linkCls} href={`tel:${s.phone.replace(/\s/g, "")}`}>{s.phone}</a></li>
              <li className="flex gap-3"><Mail className="mt-1 h-4 w-4 shrink-0 text-mint" aria-hidden /><a className={`${linkCls} break-all`} href={`mailto:${s.email}`}>{s.email}</a></li>
            </ul>
            <Link to="/contact" className="mt-5 inline-flex min-h-[40px] items-center rounded-lg border border-white/25 px-4 text-sm font-semibold transition-colors hover:bg-white/10">Nous écrire</Link>
          </div>
        </div>

        {/* Mentions */}
        <div className="flex flex-col gap-3 border-t border-white/10 py-6 text-sm text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <p>{s.footer_text}</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link className="hover:text-white" to="/mentions-legales">Mentions légales</Link></li>
            <li><Link className="hover:text-white" to="/confidentialite">Confidentialité</Link></li>
            <li>© {new Date().getFullYear()} Urban Hub Connect</li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
