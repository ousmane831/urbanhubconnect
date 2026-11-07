import {
  AlertTriangle, ArrowRight, Award, CalendarCheck2, CheckCircle2, Circle, FileLock2, Handshake, LayoutDashboard, LogOut, Megaphone,
  UserRound, UsersRound, type LucideIcon,
} from "lucide-react";
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Container } from "../../components/ui/Container";
import { HexPattern } from "../../components/ui/HexPattern";
import { useAsync } from "../../hooks/useAsync";
import { memberApi, type MemberMe, type ProfileData } from "../../services/members";
import { fmtDate } from "../../utils/format";
import { ConnectionsPanel } from "./ConnectionsPanel";
import { DocumentsPanel } from "./DocumentsPanel";
import { FullDirectory } from "./FullDirectory";
import { OpportunitiesPanel } from "./OpportunitiesPanel";
import { ProfileEditor } from "./ProfileEditor";
import { Badge, Card } from "./ui";

type Tab = "accueil" | "profil" | "annuaire" | "relations" | "annonces" | "documents";
const TABS: { id: Tab; label: string; short: string; icon: LucideIcon; hint: string }[] = [
  { id: "accueil", label: "Accueil", short: "Accueil", icon: LayoutDashboard, hint: "" },
  { id: "profil", label: "Mon profil", short: "Profil", icon: UserRound, hint: "Votre fiche et vos coordonnées" },
  { id: "annuaire", label: "Annuaire complet", short: "Annuaire", icon: UsersRound, hint: "Trouver un membre, voir ses offres et besoins" },
  { id: "annonces", label: "Urban Opportunities", short: "Annonces", icon: Megaphone, hint: "Partenariats, appels d'offres, emplois, stages" },
  { id: "relations", label: "Mises en relation", short: "Relations", icon: Handshake, hint: "Suivre vos demandes de contact" },
  { id: "documents", label: "Documents réservés", short: "Documents", icon: FileLock2, hint: "Comptes rendus, Urban Notes, Baromètre" },
];
const isTab = (v: string | null): v is Tab => TABS.some((t) => t.id === v);

/** Jours restants avant la fin de la cotisation (date de fin incluse). */
function daysLeft(validUntil?: string | null) {
  if (!validUntil) return null;
  const end = new Date(`${validUntil}T23:59:59Z`).getTime();
  return Math.max(0, Math.ceil((end - Date.now()) / 86_400_000));
}
const initials = (s: string) => s.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "UH";

/* ---------- Accueil ---------- */

function Checklist({ profile, go }: { profile: ProfileData; go: (t: Tab) => void }) {
  const org = profile.organization;
  if (!org) return null;
  const items = [
    { done: !!org.description, label: "Présenter votre organisation" },
    { done: !!org.logo, label: "Ajouter votre logo" },
    { done: org.latitude !== null && org.latitude !== "" && org.latitude !== undefined, label: "Placer votre point sur la Cartographie" },
    { done: !!(org.offers || org.needs), label: "Indiquer ce que vous proposez et recherchez" },
  ];
  const done = items.filter((i) => i.done).length;
  if (done === items.length && !profile.pending) return null;
  return (
    <Card aria-label="Compléter votre fiche">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-heading text-lg font-bold">Complétez votre fiche</h3>
        <Badge tone={done === items.length ? "green" : "gold"}>{done} / {items.length}</Badge>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy/10" aria-hidden><div className="h-full rounded-full bg-green" style={{ width: `${(done / items.length) * 100}%` }} /></div>
      {profile.pending && <p className="mt-4 rounded-lg bg-gold/10 p-3 text-sm"><strong>En attente de validation :</strong> {profile.pending.fields.join(", ")}.</p>}
      <ul className="mt-4 space-y-2">
        {items.map((i) => (
          <li key={i.label} className="flex items-center gap-3 text-[15px]">
            {i.done ? <CheckCircle2 className="h-5 w-5 shrink-0 text-green" aria-hidden /> : <Circle className="h-5 w-5 shrink-0 text-navy/30" aria-hidden />}
            <span className={i.done ? "text-navy/60 line-through" : "font-medium"}>{i.label}</span>
            <span className="sr-only">{i.done ? "(fait)" : "(à faire)"}</span>
          </li>))}
      </ul>
      <button onClick={() => go("profil")} className="mt-5 inline-flex min-h-[44px] items-center gap-2 font-semibold text-green hover:text-green-2">
        Compléter ma fiche <ArrowRight className="h-4 w-4" aria-hidden />
      </button>
    </Card>
  );
}

function Home({ me, go }: { me: MemberMe; go: (t: Tab) => void }) {
  const profile = useAsync(memberApi.profile);
  const left = daysLeft(me.valid_until);
  const soon = left !== null && left <= 30;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <section aria-label="Mon adhésion" className="relative overflow-hidden rounded-2xl bg-green p-5 text-white shadow-soft sm:p-7">
          <div aria-hidden className="absolute -right-12 -top-12 h-44 w-44 rounded-full border-[26px] border-white/[0.07]" />
          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/75">Mon adhésion</p>
            <p className="mt-3 font-heading text-2xl font-bold leading-tight sm:text-3xl">{me.organization || me.name}</p>
            {me.category && <p className="mt-1 text-white/80">{me.category}</p>}
            {me.is_founder && <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold"><Award className="h-4 w-4 text-gold-light" aria-hidden />Membre fondateur</p>}
            <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/20 pt-5">
              {me.valid_until && <div><dt className="text-xs text-white/70 sm:text-sm">Valable jusqu'au</dt><dd className="mt-0.5 font-semibold">{fmtDate(me.valid_until)}</dd></div>}
              {me.reference && <div><dt className="text-xs text-white/70 sm:text-sm">Référence</dt><dd className="mt-0.5 font-semibold">{me.reference}</dd></div>}
            </dl>
          </div>
        </section>

        <div className="space-y-4">
          {soon ? (
            <Card className="border-gold/50 bg-gold/10" aria-label="Renouvellement">
              <p className="flex items-center gap-2 font-heading text-lg font-bold"><AlertTriangle className="h-5 w-5 text-gold" aria-hidden />Renouvellement à prévoir</p>
              <p className="mt-2 text-navy/80">Votre cotisation se termine dans <strong>{left} jour{left === 1 ? "" : "s"}</strong>. Un renouvellement anticipé prolonge votre adhésion de 12 mois à partir de l'échéance : contactez la Coordination.</p>
            </Card>
          ) : left !== null && (
            <Card aria-label="Statut">
              <p className="flex items-center gap-2 font-heading text-lg font-bold"><CalendarCheck2 className="h-5 w-5 text-green" aria-hidden />Cotisation à jour</p>
              <p className="mt-1 text-navy/75">Encore {left} jours d'accès à tous les services du réseau.</p>
            </Card>)}
          {profile.data && <Checklist profile={profile.data} go={go} />}
        </div>
      </div>

      <section aria-labelledby="services-titre">
        <h3 id="services-titre" className="mb-3 font-heading text-lg font-bold sm:text-xl">Vos services</h3>
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          {TABS.filter((t) => t.id !== "accueil").map((t) => (
            <li key={t.id} className="[&:last-child:nth-child(odd)]:col-span-2 lg:[&:last-child:nth-child(odd)]:col-span-1">
              <button onClick={() => go(t.id)} className="group flex h-full w-full flex-col items-start gap-3 rounded-2xl border border-navy/10 bg-white p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-green/40 hover:shadow-lg sm:p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-green/10 text-green transition-colors group-hover:bg-green group-hover:text-white"><t.icon className="h-5 w-5" aria-hidden /></span>
                <span className="font-semibold leading-snug text-navy">{t.label}</span>
                <span className="hidden text-sm text-navy/65 sm:block">{t.hint}</span>
              </button>
            </li>))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Espace ---------- */

export function MemberWorkspace({ me, onLogout }: { me: MemberMe; onLogout: () => void }) {
  const [params, setParams] = useSearchParams();
  const raw = params.get("onglet");
  const tab: Tab = isTab(raw) ? raw : "accueil";
  const top = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const go = (t: Tab) => {
    setParams(t === "accueil" ? {} : { onglet: t });
    top.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  useEffect(() => {  // garde l'onglet actif visible dans la barre mobile
    const b = bar.current, chip = b?.querySelector<HTMLElement>(`[data-tab="${tab}"]`);
    if (b && chip) b.scrollTo({ left: chip.offsetLeft - b.clientWidth / 2 + chip.clientWidth / 2, behavior: "smooth" });
  }, [tab]);
  const current = TABS.find((t) => t.id === tab)!;
  const left = daysLeft(me.valid_until);

  return (
    <div className="min-h-[60vh] bg-offwhite">
      {/* En-tête */}
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-5 sm:py-8">
          <div className="flex items-center gap-3 sm:gap-4">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-green font-heading text-lg font-bold sm:h-14 sm:w-14 sm:text-xl">{initials(me.organization || me.name)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Espace membres</p>
              <h1 className="truncate text-xl leading-tight sm:text-3xl">{me.organization || me.name}</h1>
              <p className="truncate text-sm text-white/70 sm:text-base">{me.name}</p>
            </div>
            <button onClick={onLogout} aria-label="Se déconnecter" className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-white/25 px-3 font-semibold transition-colors hover:bg-white/10 sm:px-4">
              <LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Se déconnecter</span>
            </button>
          </div>
          {me.status && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-mint/20 px-3 py-1 text-sm font-semibold"><CheckCircle2 className="h-4 w-4 text-mint" aria-hidden />{me.status}</span>
              {left !== null && left <= 30 && <span className="inline-flex items-center gap-1.5 rounded-full bg-gold/25 px-3 py-1 text-sm font-semibold text-gold-light"><AlertTriangle className="h-4 w-4" aria-hidden />Échéance dans {left} j</span>}
              {me.is_founder && <span className="hidden items-center gap-1.5 rounded-full border border-white/20 px-3 py-1 text-sm sm:inline-flex"><Award className="h-4 w-4 text-gold-light" aria-hidden />Membre fondateur</span>}
            </div>)}
        </Container>
      </section>

      {/* Navigation mobile : barre collante qui défile horizontalement */}
      <nav aria-label="Sections de l'Espace membres" className="sticky top-16 z-30 border-b border-navy/10 bg-white/95 backdrop-blur lg:hidden">
        <div ref={bar} className="flex gap-1.5 overflow-x-auto px-4 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {TABS.map((t) => (
            <button key={t.id} data-tab={t.id} onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-sm font-semibold transition-colors ${tab === t.id ? "bg-green text-white" : "text-navy/75 hover:bg-offwhite"}`}>
              <t.icon className="h-4 w-4" aria-hidden />{t.short}
            </button>))}
        </div>
      </nav>

      <div ref={top} className="scroll-mt-32 lg:scroll-mt-20" />
      <Container className="py-6 sm:py-8 lg:grid lg:grid-cols-[15rem_1fr] lg:gap-8 lg:py-10">
        {/* Navigation ordinateur : colonne latérale */}
        <nav aria-label="Sections de l'Espace membres" className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 rounded-2xl border border-navy/10 bg-white p-2 shadow-soft">
            {TABS.map((t) => (
              <li key={t.id}>
                <button onClick={() => go(t.id)} aria-current={tab === t.id ? "page" : undefined}
                  className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-left font-semibold transition-colors ${tab === t.id ? "bg-green text-white" : "text-navy/80 hover:bg-offwhite hover:text-navy"}`}>
                  <t.icon className="h-5 w-5 shrink-0" aria-hidden />{t.label}
                </button>
              </li>))}
          </ul>
        </nav>

        <section aria-label={current.label} className="min-w-0">
          {tab === "accueil" && <Home me={me} go={go} />}
          {tab === "profil" && <ProfileEditor />}
          {tab === "annuaire" && <FullDirectory />}
          {tab === "relations" && <ConnectionsPanel onFind={() => go("annuaire")} />}
          {tab === "annonces" && <OpportunitiesPanel />}
          {tab === "documents" && <DocumentsPanel />}
        </section>
      </Container>
    </div>
  );
}
