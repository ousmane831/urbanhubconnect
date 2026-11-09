import {
  ArrowRight, Award, CalendarDays, Clock, Download, Drum, GraduationCap, HandHeart, Handshake, Info, Lightbulb, MapPin,
  Megaphone, Quote, Sparkles, Store, Ticket, Trees, Video, type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { Countdown } from "../components/Countdown";
import { ConfigForm, type FieldDef } from "../components/forms/ConfigForm";
import { Button } from "../components/ui/Button";
import { Container, Section } from "../components/ui/Container";
import { HexPattern } from "../components/ui/HexPattern";
import { Reveal } from "../components/ui/Reveal";
import { RichText } from "../components/ui/RichText";
import { ErrorState, Loading } from "../components/ui/States";
import { EventRequestForm } from "../features/events/EventRequestForm";
import { PartnerBand } from "../features/events/PartnerBand";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { getAwardCategories, getDocuments, getEvent, getPlantingSeats, getVolunteerMissions } from "../services/api";
import type { EventDetail } from "../types/api";
import { fmtDate, fmtDays } from "../utils/format";
import { parseBlocks } from "../utils/richtext";
import { NotFound } from "./ErrorPage";

const SLUG = "grand-week-end-du-pole-2026";
const SIGNATURE = "Deux pôles, un seul élan.";
// Les rubriques s'arrêtent sous l'en-tête du site (64 px) et la barre de navigation de la page (≈ 56 px).
const ANCHOR = "scroll-mt-32";

type Sec = EventDetail["sections"][number];
type Icon = LucideIcon;

// Tous les textes viennent de l'admin (blocs de l'événement) : la page ne fait que les mettre en forme.
const rowsOf = (text: string) => parseBlocks(text).flatMap((b) => (b.type === "table" ? b.rows : []));
const paragraphs = (text: string) => text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);

const Eyebrow = ({ children, light = false }: { children: ReactNode; light?: boolean }) => (
  <p className={`mb-3 text-xs font-bold uppercase tracking-[0.18em] ${light ? "text-gold-light" : "text-green"}`}>{children}</p>);
const H2 = ({ children, light = false }: { children: ReactNode; light?: boolean }) => (
  <h2 className={`text-2xl leading-tight sm:text-3xl lg:text-4xl ${light ? "text-white" : "text-navy"}`}>{children}</h2>);
const IconBadge = ({ icon: I, className = "bg-green text-white" }: { icon: Icon; className?: string }) => (
  <span className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${className}`}><I className="h-6 w-6" aria-hidden /></span>);

function DocButton({ doc, label, light = false }: { doc?: { file: string }; label: string; light?: boolean }) {
  if (!doc) return null;
  return (
    <a href={doc.file} download className={`inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-md border px-5 font-semibold transition-colors sm:w-auto ${light ? "border-white/40 text-white hover:bg-white/10" : "border-navy/20 bg-white text-navy hover:border-navy"}`}>
      <Download className="h-4 w-4" aria-hidden />{label}<span className="sr-only"> (PDF)</span>
    </a>);
}

/* ---------- Navigation interne : collante, défilement horizontal sur mobile ---------- */

function SectionNav({ items }: { items: { id: string; label: string }[] }) {
  const [active, setActive] = useState("");
  const bar = useRef<HTMLDivElement>(null);
  const ids = items.map((i) => i.id).join();
  useEffect(() => {
    const obs = new IntersectionObserver((entries) => {
      const hit = entries.filter((x) => x.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
      if (hit) setActive(hit.target.id);
    }, { rootMargin: "-35% 0px -60% 0px" });
    ids.split(",").forEach((id) => { const el = document.getElementById(id); if (el) obs.observe(el); });
    return () => obs.disconnect();
  }, [ids]);
  useEffect(() => {  // garde l'onglet actif visible dans la barre, sans faire défiler la page
    const b = bar.current, chip = b?.querySelector<HTMLElement>(`[data-id="${active}"]`);
    if (b && chip) b.scrollTo({ left: chip.offsetLeft - b.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [active]);
  return (
    <nav aria-label="Sur cette page" className="sticky top-16 z-30 border-b border-navy/10 bg-white/95 backdrop-blur">
      <div ref={bar} className="relative mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-2.5 [scrollbar-width:none] sm:px-6 lg:px-8 [&::-webkit-scrollbar]:hidden">
        {items.map((i) => {
          const cta = i.id === "inscription", on = active === i.id;
          return (
            <a key={i.id} href={`#${i.id}`} data-id={i.id} aria-current={on ? "true" : undefined}
              className={`inline-flex min-h-[40px] shrink-0 items-center whitespace-nowrap rounded-full px-4 text-sm font-semibold transition-colors ${
                cta ? "bg-green text-white hover:bg-green-2" : on ? "bg-navy text-white" : "text-navy/75 hover:bg-offwhite hover:text-navy"}`}>
              {i.label}
            </a>);
        })}
      </div>
    </nav>
  );
}

/* ---------- Présentation : thème, texte, objectifs ---------- */

function Presentation({ text }: { text: string }) {
  const paras = paragraphs(text);
  const theme = paras.find((p) => p.startsWith("Thème"));
  const goals = paras.find((p) => p.startsWith("Nos objectifs"));
  const rest = paras.filter((p) => p !== theme && p !== goals).join("\n\n");
  const [themeLabel, themeText] = theme ? theme.split(/\s:\s(.+)/s) : [];
  // « 400 participants » → chiffre + libellé. Ce sont des objectifs, jamais des résultats.
  const stats = goals?.replace(/^Nos objectifs\s*:\s*/, "").split("·").map((g) => g.trim()).filter(Boolean)
    .map((g) => { const m = g.match(/^([\d\s\u00a0\u202f]+)\s(.+)$/); return m ? { n: m[1].trim(), l: m[2] } : { n: "", l: g }; }) ?? [];
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:items-start">
      <div className="space-y-8">
        {theme && (
          <figure className="relative overflow-hidden rounded-2xl bg-navy p-6 text-white sm:p-8">
            <Quote className="absolute -right-2 -top-2 h-24 w-24 text-white/[0.06]" aria-hidden />
            <figcaption className="text-xs font-bold uppercase tracking-[0.18em] text-gold-light">{themeLabel}</figcaption>
            <p className="mt-3 font-heading text-xl font-bold leading-snug sm:text-2xl">{themeText}</p>
          </figure>)}
        {rest && <RichText text={rest} />}
      </div>
      {!!stats.length && (
        <div className="rounded-2xl border border-navy/10 bg-offwhite p-5 sm:p-6">
          <h3 className="text-lg font-bold text-navy">Nos objectifs</h3>
          <ul className="mt-4 grid grid-cols-2 gap-3">
            {stats.map((s) => (
              <li key={s.l} className="rounded-xl bg-white p-4 shadow-soft">
                {s.n && <span className="block whitespace-nowrap font-heading text-3xl font-extrabold text-green sm:text-4xl">{s.n}</span>}
                <span className="mt-1 block text-sm font-semibold leading-snug text-navy/80">{s.l}</span>
              </li>))}
          </ul>
        </div>)}
    </div>
  );
}

/* ---------- Programme : deux onglets et frise horaire lisible sur mobile ---------- */

function Timeline({ text }: { text: string }) {
  const rows = rowsOf(text);
  if (!rows.length) return <RichText text={text} />;
  return (
    <ol className="relative space-y-3 border-l-2 border-green/25 pl-5 sm:pl-7">
      {rows.map(([time, what]) => {
        const panel = what.match(/^(Forum du Pôle · Panel \d+)\s*:\s*(.+)$/);
        const gala = /Gala du Pôle/.test(what);
        return (
          <li key={time + what} className="relative">
            <span aria-hidden className={`absolute -left-[1.65rem] top-5 h-3 w-3 rounded-full ring-4 ring-offwhite sm:-left-[2.15rem] ${gala ? "bg-gold" : "bg-green"}`} />
            <div className={`rounded-xl p-4 shadow-soft sm:flex sm:gap-6 sm:p-5 ${gala ? "bg-navy text-white" : "bg-white"}`}>
              <p className={`flex shrink-0 items-center gap-1.5 text-sm font-bold tabular-nums sm:w-40 sm:text-base ${gala ? "text-gold-light" : "text-green"}`}>
                <Clock className="h-4 w-4" aria-hidden />{time}
              </p>
              {panel ? (
                <div className="mt-1.5 sm:mt-0">
                  <span className="inline-block rounded-full bg-purple/10 px-2.5 py-0.5 text-xs font-bold uppercase tracking-wide text-purple">{panel[1]}</span>
                  <p className="mt-1.5 font-semibold leading-snug text-navy">{panel[2]}</p>
                </div>
              ) : <p className={`mt-1.5 leading-snug sm:mt-0 ${gala ? "font-semibold" : "text-navy/90"}`}>{what}</p>}
            </div>
          </li>);
      })}
    </ol>
  );
}

function ProgramTabs({ days }: { days: Sec[] }) {
  const [active, setActive] = useState(0);
  if (!days.length) return null;
  const current = days[Math.min(active, days.length - 1)];
  return (
    <div>
      <div role="tablist" aria-label="Jours du programme" className="grid grid-cols-2 gap-2 rounded-2xl bg-white p-1.5 shadow-soft sm:inline-grid sm:min-w-[36rem]">
        {days.map((d, i) => {
          const [day, place] = d.title.split(" · ");
          const on = i === active;
          return (
            <button key={d.slug} role="tab" id={`tab-${d.slug}`} aria-controls={`panel-${d.slug}`} aria-selected={on} tabIndex={on ? 0 : -1}
              onClick={() => setActive(i)}
              onKeyDown={(e) => { if (e.key === "ArrowRight" || e.key === "ArrowLeft") { const n = (i + (e.key === "ArrowRight" ? 1 : days.length - 1)) % days.length; setActive(n); document.getElementById(`tab-${days[n].slug}`)?.focus(); } }}
              className={`rounded-xl px-3 py-3 text-left transition-colors sm:px-5 ${on ? "bg-green text-white" : "text-navy hover:bg-offwhite"}`}>
              <span className="block font-heading text-sm font-bold sm:text-lg">{day}</span>
              {place && <span className={`mt-0.5 block text-xs leading-snug sm:text-sm ${on ? "text-white/85" : "text-navy/65"}`}>{place}</span>}
            </button>);
        })}
      </div>
      <div role="tabpanel" id={`panel-${current.slug}`} aria-labelledby={`tab-${current.slug}`} className="mt-8 max-w-4xl"><Timeline text={current.body} /></div>
    </div>
  );
}

/* ---------- Awards : calendrier en étapes ---------- */

function Steps({ sentence }: { sentence: string }) {
  const steps = sentence.split(" · ").map((s) => s.trim()).filter(Boolean);
  if (steps.length < 2) return <p className="text-lg text-white/85">{sentence}</p>;
  return (
    <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {steps.map((s, i) => (
        <li key={s} className={`flex gap-3 rounded-xl p-4 lg:flex-col ${i === steps.length - 1 ? "bg-gold/15 ring-1 ring-gold/40" : "bg-white/[0.06] ring-1 ring-white/10"}`}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold font-bold text-navy">{i + 1}</span>
          <span className="text-white/90 first-letter:uppercase">{s}</span>
        </li>))}
    </ol>
  );
}

/* ---------- Expériences du week-end ---------- */

const EXP_ICONS: Icon[] = [Store, GraduationCap, Sparkles, Megaphone, Drum, Video];
const EXP_COLORS = ["bg-green", "bg-purple", "bg-gold", "bg-navy", "bg-green-2", "bg-purple"];

function Experiences({ text }: { text: string }) {
  const rows = rowsOf(text);
  if (!rows.length) return <RichText text={text} />;
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {rows.map(([name, body], i) => (
        <li key={name} className="flex gap-4 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft transition-shadow hover:shadow-lg sm:flex-col sm:p-6">
          <IconBadge icon={EXP_ICONS[i % EXP_ICONS.length]} className={`${EXP_COLORS[i % EXP_COLORS.length]} text-white`} />
          <div><h3 className="text-lg font-bold text-navy">{name}</h3><p className="mt-1.5 text-navy/80">{body}</p></div>
        </li>))}
    </ul>
  );
}

/* ---------- Carte de rubrique (Business Connect, Défis, Bénévoles, Infos pratiques) ---------- */

function Card({ id, icon, iconClass, title, children }: { id: string; icon: Icon; iconClass?: string; title: string; children: ReactNode }) {
  return (
    <article id={id} className={`${ANCHOR} flex flex-col rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-8`}>
      <div className="mb-4 flex items-center gap-4"><IconBadge icon={icon} className={iconClass} /><h2 className="text-xl leading-tight text-navy sm:text-2xl">{title}</h2></div>
      <div className="flex flex-1 flex-col gap-6">{children}</div>
    </article>);
}

/* ---------- Bouton « S'inscrire » fixe sur mobile ---------- */

function MobileCta({ hero, open }: { hero: RefObject<HTMLElement>; open: boolean }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const target = hero.current, form = document.getElementById("inscription");
    if (!target) return;
    let pastHero = false, atForm = false;
    const update = () => setShow(pastHero && !atForm);
    const o1 = new IntersectionObserver(([x]) => { pastHero = !x.isIntersecting; update(); });
    const o2 = new IntersectionObserver(([x]) => { atForm = x.isIntersecting; update(); });
    o1.observe(target); if (form) o2.observe(form);
    return () => { o1.disconnect(); o2.disconnect(); };
  }, [hero]);
  if (!open) return null;
  return (  // laisse la place au bouton WhatsApp, en bas à droite
    <div className={`fixed bottom-4 left-4 right-20 z-30 transition-all duration-300 sm:hidden ${show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"}`} aria-hidden={!show}>
      <a href="#inscription" tabIndex={show ? 0 : -1} className="flex h-12 items-center justify-center gap-2 rounded-full bg-navy font-semibold text-white shadow-lg ring-2 ring-white">
        <Ticket className="h-5 w-5" aria-hidden />S'inscrire
      </a>
    </div>);
}

/* ---------- Page ---------- */

export default function GrandWeekEnd() {
  const ev = useAsync(() => getEvent(SLUG));
  const awards = useAsync(getAwardCategories);
  const missions = useAsync(getVolunteerMissions);
  const dossier = useAsync(() => getDocuments("partnership"));
  const rules = useAsync(() => getDocuments("awards_rules"));
  const flyer = useAsync(() => getDocuments("flyer"));
  const seats = useAsync(getPlantingSeats);
  const heroRef = useRef<HTMLElement>(null);
  useSeo("Le Grand Week-End du Pôle 2026 – 11 et 12 décembre, Diamniadio et Lac Rose",
    "Première édition : ouverture officielle du réseau, Forum du Pôle en quatre panels, Business Connect, grand reboisement du Lac Rose, Awards et Gala du Pôle.",
    undefined, true, ev.data?.image);
  const { hash } = useLocation();
  useEffect(() => { if (ev.data && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView(); }, [ev.data, hash]);
  const e = ev.data;
  if (ev.notFound) return <NotFound />;
  if (ev.loading) return <Loading />;
  if (ev.error || !e) return <Container className="py-16"><ErrorState message={ev.error ?? "Événement indisponible."} onRetry={ev.retry} /></Container>;

  const sec = (slug: string) => e.sections.find((s) => s.slug === slug);
  const opt = (l?: { slug: string; name: string }[]) => l?.map((x) => ({ value: x.slug, label: x.name })) ?? [];
  const [surtitre, ...presentationRest] = paragraphs(sec("presentation")?.body ?? "");
  const days = ["programme-vendredi", "programme-samedi"].map(sec).filter((s): s is Sec => !!s);
  const dossierDoc = dossier.data?.[0], flyerDoc = flyer.data?.[0];
  const opens = e.registration_opens_at ? new Date(e.registration_opens_at) : null;
  const registrationOpen = !opens || opens.getTime() <= Date.now();
  const reboisement = sec("reboisement"), award = sec("awards"), calendar = sec("awards-calendrier"), gala = sec("gala");
  const bcSec = sec("business-connect"), defis = sec("defis-partenaires"), exp = sec("experiences");
  const benevoles = sec("benevoles"), infos = sec("infos-pratiques");
  const [calendarSentence, ...grading] = paragraphs(calendar?.body ?? "");

  const nav = [
    { id: "programme", label: "Programme", on: days.length > 0 },
    { id: "reboisement", label: "Reboisement", on: !!reboisement },
    { id: "awards", label: "Awards", on: !!award },
    { id: "business-connect", label: "Business Connect", on: !!bcSec },
    { id: "defis-partenaires", label: "Défis", on: !!defis },
    { id: "gala", label: "Gala", on: !!gala },
    { id: "experiences", label: "Expériences", on: !!exp },
    { id: "benevoles", label: "Bénévoles", on: !!benevoles },
    { id: "infos-pratiques", label: "Infos pratiques", on: !!infos },
    { id: "inscription", label: "S'inscrire", on: true },
  ].filter((i) => i.on);

  const bc: FieldDef[] = [
    { name: "participant_name", label: "Nom", type: "text", required: true }, { name: "organization", label: "Organisation", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true }, { name: "phone", label: "Téléphone", type: "tel" },
    { name: "what_offers", label: "Ce que vous proposez", type: "textarea" }, { name: "what_needs", label: "Ce que vous recherchez", type: "textarea" },
    { name: "preferred_meetings", label: "Rencontres souhaitées (vendredi, samedi ou les deux)", type: "textarea" },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" }];
  const aw: FieldDef[] = [
    { name: "category", label: "Catégorie", type: "select", required: true, options: opt(awards.data) },
    { name: "applicant_name", label: "Organisation ou personne", type: "text", required: true }, { name: "organization", label: "Structure", type: "text" },
    { name: "email", label: "E-mail", type: "email", required: true }, { name: "phone", label: "Téléphone", type: "tel" },
    { name: "description", label: "Présentation de la candidature", type: "textarea", required: true },
    { name: "accept_privacy", label: "J'accepte la politique de confidentialité.", type: "consent" }];
  const vol: FieldDef[] = [
    { name: "name", label: "Nom", type: "text", required: true }, { name: "email", label: "E-mail", type: "email", required: true },
    { name: "phone", label: "Téléphone", type: "tel", required: true }, { name: "organization", label: "Organisation", type: "text" },
    { name: "missions", label: "Missions souhaitées", type: "multi", options: opt(missions.data) },
    { name: "availability", label: "Disponibilités", type: "text", full: true }, { name: "message", label: "Message", type: "textarea" }];

  return (
    <>
      {/* ---- En-tête ---- */}
      <section ref={heroRef} className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-12 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-[1.25fr_1fr] lg:items-center">
            <div>
              {surtitre && <p className="inline-flex rounded-full border border-gold-light/40 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-light sm:text-sm">{surtitre}</p>}
              <h1 className="mt-5 text-4xl leading-[1.05] sm:text-5xl lg:text-6xl">{e.title}</h1>
              <div className="mt-6 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-semibold"><CalendarDays className="h-4 w-4 text-gold-light" aria-hidden />{fmtDays(e.start_date, e.end_date)}</span>
                {e.location && <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 font-semibold"><MapPin className="h-4 w-4 text-gold-light" aria-hidden />{e.location}</span>}
              </div>
              <div className="mt-8 grid gap-3 sm:flex sm:flex-wrap">
                {registrationOpen
                  ? <Button to={e.registration_url || "#inscription"} variant="light" className="h-12 text-lg" {...(e.registration_url ? { target: "_blank", rel: "noopener noreferrer" } : {})}>S'inscrire<ArrowRight className="h-5 w-5" aria-hidden /></Button>
                  : <button disabled aria-disabled className="h-12 cursor-not-allowed rounded-md bg-white/20 px-5 font-semibold text-white/90">S'inscrire (à partir du {opens && fmtDate(opens.toISOString()).replace(/ \d{4}$/, "")})</button>}
                <Button to="/partenaires" variant="ghost" className="h-12">Devenir partenaire</Button>
                <DocButton doc={dossierDoc} label="Télécharger le dossier" light />
              </div>
            </div>
            <div className="rounded-2xl border border-white/15 bg-[#16305a] p-4 sm:p-6">
              <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-white/70">Ouverture dans</p>
              <Countdown target={e.start_date} />
              <p className="mt-6 border-t border-white/15 pt-4 font-heading text-lg font-bold text-gold-light">{SIGNATURE}</p>
            </div>
          </div>
        </Container>
      </section>

      <SectionNav items={nav} />

      {/* ---- Présentation ---- */}
      {presentationRest.length > 0 && (
        <Section id="presentation" className={ANCHOR}>
          <div className="mb-8"><H2>Présentation</H2></div>
          <Presentation text={presentationRest.join("\n\n")} />
        </Section>)}

      {/* ---- Programme ---- */}
      {days.length > 0 && (
        <Section tone="offwhite" id="programme" className={ANCHOR}>
          <Eyebrow>Deux journées</Eyebrow>
          <div className="mb-8"><H2>Programme</H2></div>
          <ProgramTabs days={days} />
          <div className="mt-10 grid gap-3 sm:flex sm:flex-wrap">
            <DocButton doc={dossierDoc} label="Télécharger le dossier de l'événement" />
            <DocButton doc={flyerDoc} label="Télécharger le flyer" />
          </div>
          {!dossierDoc && <p className="text-navy/65">Le dossier de l'événement sera disponible prochainement.</p>}
        </Section>)}

      {/* ---- Reboisement ---- */}
      {reboisement && (
        <Section id="reboisement" className={ANCHOR}>
          <div className="overflow-hidden rounded-3xl shadow-soft lg:grid lg:grid-cols-[2fr_3fr]">
            <div className="relative flex flex-col justify-end gap-4 overflow-hidden bg-green p-6 text-white sm:p-10">
              <Trees aria-hidden className="absolute -right-6 -top-6 h-40 w-40 text-white/10" />
              <IconBadge icon={Trees} className="bg-white/15 text-white" />
              <h2 className="text-2xl leading-tight text-white sm:text-3xl">{reboisement.title}</h2>
            </div>
            <div className="space-y-6 border border-t-0 border-navy/10 bg-white p-6 sm:p-10 lg:border-l-0 lg:border-t">
              <RichText text={reboisement.body} />
              {seats.data?.remaining != null && (
                <p className={`inline-flex rounded-full px-4 py-1.5 font-semibold ${seats.data.remaining > 0 ? "bg-green/10 text-green" : "bg-red-50 text-red-800"}`}>
                  {seats.data.remaining > 0 ? `${seats.data.remaining} place${seats.data.remaining > 1 ? "s" : ""} restante${seats.data.remaining > 1 ? "s" : ""} dans le convoi`
                    : "Convoi complet : contactez la Coordination pour la liste d'attente"}</p>)}
              {seats.data?.remaining !== 0 && <Reveal label="M'inscrire au reboisement" block><EventRequestForm kind="caravan" /></Reveal>}
            </div>
          </div>
        </Section>)}

      {/* ---- Awards ---- */}
      {award && (
        <section id="awards" className={`${ANCHOR} relative overflow-hidden bg-navy py-14 text-white sm:py-20`}>
          <HexPattern className="text-white/[0.04]" />
          <Container className="relative space-y-10">
            <div className="max-w-3xl">
              <Eyebrow light>Samedi 12 décembre</Eyebrow>
              <H2 light>{award.title}</H2>
              <p className="mt-4 text-lg text-white/85">{award.body}</p>
            </div>
            {!!awards.data?.length && (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {awards.data.map((c) => (
                  <li key={c.slug} className="flex gap-3 rounded-xl bg-white/[0.06] p-4 ring-1 ring-white/10 sm:flex-col sm:gap-2 sm:p-5">
                    <Award className="mt-0.5 h-5 w-5 shrink-0 text-gold-light" aria-hidden />
                    <div>
                      <h3 className="text-base font-bold leading-snug text-white">{c.name}</h3>
                      {c.description && <p className="mt-1 text-sm text-white/75">{c.description}</p>}
                    </div>
                  </li>))}
              </ul>)}
            {calendar && (
              <div className="space-y-5">
                <h3 className="text-xl text-white">{calendar.title}</h3>
                {calendarSentence && <Steps sentence={calendarSentence} />}
                {!!grading.length && <div className="rounded-2xl bg-white p-5 text-navy sm:p-6"><RichText text={grading.join("\n\n")} /></div>}
              </div>)}
            <div className="grid gap-3 sm:flex sm:flex-wrap sm:items-start">
              {awards.data?.length
                ? <Reveal label="Déposer une candidature" tone="light" block><ConfigForm key={awards.data.length} endpoint="/awards/applications/" fields={aw} submitLabel="Envoyer ma candidature" successFallback="Merci. Votre candidature a bien été transmise." /></Reveal>
                : <p className="text-white/75">Les candidatures ouvriront prochainement.</p>}
              {rules.data?.[0] ? <DocButton doc={rules.data[0]} label="Télécharger le règlement" light /> : <p className="self-center text-white/65">Le règlement sera disponible prochainement.</p>}
            </div>
          </Container>
        </section>)}

      {/* ---- Business Connect et Défis Partenaires ---- */}
      {(bcSec || defis) && (
        <Section tone="offwhite">
          <div className="grid gap-6 lg:grid-cols-2">
            {bcSec && (
              <Card id="business-connect" icon={Handshake} title={bcSec.title}>
                <RichText text={bcSec.body} />
                <div className="mt-auto"><Reveal label="M'inscrire au Business Connect" block><ConfigForm endpoint="/business-connect/" extra={{ event: SLUG }} fields={bc} submitLabel="Envoyer mon inscription" successFallback="Merci. Votre inscription a bien été transmise." /></Reveal></div>
              </Card>)}
            {defis && (
              <Card id="defis-partenaires" icon={Lightbulb} iconClass="bg-purple text-white" title={defis.title}>
                <RichText text={defis.body} />
                <div className="mt-auto"><Reveal label="Voir les défis et proposer une solution" block><EventRequestForm kind="challenge" /></Reveal></div>
              </Card>)}
          </div>
        </Section>)}

      {/* ---- Gala du Pôle ---- */}
      {gala && (
        <section id="gala" className={`${ANCHOR} relative overflow-hidden bg-navy py-14 text-white sm:py-20`}>
          <Container className="relative">
            <div className="mx-auto max-w-3xl text-center">
              <Sparkles className="mx-auto mb-4 h-10 w-10 text-gold-light" aria-hidden />
              <Eyebrow light>Samedi 12 décembre · à partir de 19 h</Eyebrow>
              <h2 className="font-heading text-3xl text-gold-light sm:text-5xl">{gala.title}</h2>
              <div className="mx-auto mt-6 h-px w-24 bg-gold/60" />
              <p className="mt-6 text-left text-lg leading-relaxed text-white/90 sm:text-center">{gala.body}</p>
            </div>
          </Container>
        </section>)}

      {/* ---- Expériences du week-end ---- */}
      {exp && (
        <Section id="experiences" className={ANCHOR}>
          <Eyebrow>Au cœur du week-end</Eyebrow>
          <div className="mb-8"><H2>{exp.title}</H2></div>
          <Experiences text={exp.body} />
        </Section>)}

      {/* ---- Bénévoles et infos pratiques ---- */}
      {(benevoles || infos) && (
        <Section tone="offwhite">
          <div className="grid gap-6 lg:grid-cols-2">
            {benevoles && (
              <Card id="benevoles" icon={HandHeart} iconClass="bg-gold text-white" title={benevoles.title}>
                <RichText text={benevoles.body} />
                <div className="mt-auto"><Reveal label="Devenir bénévole" block><ConfigForm key={missions.data?.length ?? 0} endpoint="/volunteers/" fields={vol} submitLabel="Proposer mon aide" successFallback="Merci. Votre candidature de bénévole a bien été transmise." /></Reveal></div>
              </Card>)}
            {infos && (
              <Card id="infos-pratiques" icon={Info} iconClass="bg-navy text-white" title={infos.title}>
                <RichText text={infos.body} />
              </Card>)}
          </div>
        </Section>)}

      {/* ---- Inscription ---- */}
      <section id="inscription" className={`${ANCHOR} relative overflow-hidden bg-green py-14 sm:py-20`}>
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative">
          <div className="mx-auto max-w-4xl">
            <div className="mb-8 text-white">
              <Eyebrow light>{fmtDays(e.start_date, e.end_date)}</Eyebrow>
              <H2 light>S'inscrire au Grand Week-End du Pôle</H2>
              <p className="mt-4 text-lg text-white/85">L'inscription donne droit à un badge nominatif valable pour les deux journées. Le Gala du Pôle ne fait pas l'objet d'une inscription : il est accessible sur invitation et par la billetterie commune avec The Ground.</p>
              <p className="mt-3 text-white/85">Dès votre inscription, votre badge (QR code) vous est envoyé par e-mail : présentez-le à l'accueil, sur votre téléphone ou imprimé.</p>
              {seats.data?.remaining === 0 && <p className="mt-3 rounded-xl bg-white/10 p-3 font-semibold">Le convoi du reboisement est complet ; les autres temps du programme restent ouverts.</p>}
            </div>
            <div className="rounded-2xl bg-white p-4 shadow-lg sm:p-8">
              {registrationOpen ? <EventRequestForm kind="registration" /> : <p className="text-navy/75">Les inscriptions ouvriront le {opens && fmtDate(opens.toISOString())}.</p>}
            </div>
          </div>
        </Container>
      </section>

      <PartnerBand />
      <MobileCta hero={heroRef} open={registrationOpen} />
    </>
  );
}
