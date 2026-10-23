import {
  ArrowRight,
  Award,
  BriefcaseBusiness,
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  FileLock2,
  FolderLock,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useState } from "react";
import { Container } from "../../components/ui/Container";
import { HexPattern } from "../../components/ui/HexPattern";
import type { MemberMe } from "../../services/members";
import { fmtDate } from "../../utils/format";
import { FullDirectory } from "./FullDirectory";
import { ProfileEditor } from "./ProfileEditor";

type Tab = "home" | "profile" | "directory" | "opportunities" | "documents";
const TABS = [
  { id: "home", label: "Accueil", icon: LayoutDashboard },
  { id: "profile", label: "Mon profil", icon: UserRound },
  { id: "directory", label: "Annuaire complet", icon: UsersRound },
  { id: "opportunities", label: "Urban Opportunities", icon: BriefcaseBusiness },
  { id: "documents", label: "Documents réservés", icon: FolderLock },
] satisfies { id: Tab; label: string; icon: typeof LayoutDashboard }[];
const SOON: Record<"opportunities" | "documents", { title: string; text: string }> = {
  opportunities: { title: "Urban Opportunities", text: "Publier et consulter partenariats, appels d'offres, sous-traitance, emplois, stages." },
  documents: { title: "Documents réservés", text: "Comptes rendus des commissions, Urban Notes, résultats du Baromètre, documents de l'Assemblée générale." },
};

export function MemberWorkspace({ me, onLogout }: { me: MemberMe; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const statusTone = me.status?.toLocaleLowerCase("fr").includes("à jour")
    ? "bg-mint/15 text-white"
    : "bg-gold/20 text-gold-light";
  const StatusIcon = me.status?.toLocaleLowerCase("fr").includes("à jour") ? CheckCircle2 : Clock3;
  return (
    <div className="min-h-[60vh] bg-offwhite">
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-8 sm:py-11">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-green text-white shadow-soft">
                <UsersRound className="h-7 w-7" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.16em] text-mint">Urban Hub Connect</p>
                <h1 className="mt-1 text-2xl sm:text-3xl">Espace membres</h1>
                <p className="mt-1 text-white/75">Bienvenue, {me.name}</p>
              </div>
            </div>
            <button onClick={onLogout} className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/25 px-4 font-semibold text-white transition-colors hover:bg-white/10">
              <LogOut className="h-4 w-4" aria-hidden="true" /> Se déconnecter
            </button>
          </div>
          {me.status && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold ${statusTone}`}>
                <StatusIcon className="h-4 w-4" aria-hidden="true" />{me.status}
              </span>
              {me.reference && <span className="rounded-full border border-white/20 px-3 py-1.5 text-sm text-white/80">Réf. {me.reference}</span>}
            </div>
          )}
        </Container>
      </section>

      <div className="border-b border-navy/10 bg-white shadow-sm">
        <Container>
          <nav aria-label="Sections de l'Espace membres" className="-mb-px flex gap-1 overflow-x-auto">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}
                className={`inline-flex min-h-[56px] shrink-0 items-center gap-2 border-b-[3px] px-4 text-sm font-semibold transition-colors sm:text-base ${tab === id ? "border-green text-green" : "border-transparent text-navy/70 hover:border-navy/20 hover:text-navy"}`}>
                <Icon className="h-4 w-4" aria-hidden="true" />{label}
              </button>))}
          </nav>
        </Container>
      </div>

      <Container className="py-8 sm:py-10">
        {tab === "home" && (
          <div className="space-y-8">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-green">Votre espace</p>
              <h2 className="mt-1 text-2xl sm:text-3xl">Vue d’ensemble</h2>
              <p className="mt-2 text-navy/70">Retrouvez vos informations et accédez aux services du réseau.</p>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
              <section className="relative overflow-hidden rounded-2xl bg-green p-6 text-white shadow-soft sm:p-8" aria-label="Adhésion">
                <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full border-[24px] border-white/[0.08]" />
                <div className="relative">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white/80">
                    <ShieldCheck className="h-4 w-4" aria-hidden="true" /> MON ADHÉSION
                  </div>
                  <p className="mt-5 font-heading text-2xl font-bold sm:text-3xl">{me.organization || me.name}</p>
                  {me.category && <p className="mt-1 text-white/80">{me.category}</p>}
                  <div className="mt-7 grid gap-4 border-t border-white/20 pt-5 sm:grid-cols-2">
                    {me.valid_until && (
                      <div className="flex items-start gap-3">
                        <CalendarCheck2 className="mt-0.5 h-5 w-5 shrink-0 text-mint" aria-hidden="true" />
                        <div><p className="text-sm text-white/70">Cotisation valable jusqu’au</p><p className="mt-0.5 font-semibold">{fmtDate(me.valid_until)}</p></div>
                      </div>
                    )}
                    {me.reference && (
                      <div className="flex items-start gap-3">
                        <FileLock2 className="mt-0.5 h-5 w-5 shrink-0 text-gold-light" aria-hidden="true" />
                        <div><p className="text-sm text-white/70">Référence membre</p><p className="mt-0.5 font-semibold">{me.reference}</p></div>
                      </div>
                    )}
                  </div>
                </div>
              </section>

              <section className="rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-7" aria-label="Profil membre">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-purple/10 text-purple">
                    <UserRound className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div><p className="text-sm text-navy/60">VOTRE COMPTE</p><h3 className="font-heading text-lg font-bold">Profil membre</h3></div>
                </div>
                <dl className="mt-5 space-y-4 border-t border-navy/10 pt-4">
                  <div><dt className="text-sm text-navy/60">Nom</dt><dd className="font-semibold">{me.name}</dd></div>
                  <div><dt className="text-sm text-navy/60">Adresse e-mail</dt><dd className="break-all font-semibold">{me.email}</dd></div>
                  {me.is_founder && <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-3 py-1.5 text-sm font-semibold text-navy"><Award className="h-4 w-4 text-gold" aria-hidden="true" />Membre fondateur</div>}
                </dl>
                <button onClick={() => setTab("profile")} className="mt-5 inline-flex min-h-10 items-center gap-2 font-semibold text-green hover:text-green-2">
                  Gérer mon profil <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </section>
            </div>

            <section aria-labelledby="member-services-title">
              <div className="mb-4">
                <h3 id="member-services-title" className="text-xl sm:text-2xl">Les services du réseau</h3>
                <p className="mt-1 text-navy/70">Accédez aux outils et informations réservés aux membres.</p>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {TABS.filter(({ id }) => id !== "home").map(({ id, label, icon: Icon }, index) => (
                  <li key={id}>
                    <button onClick={() => setTab(id)} className="group flex h-full min-h-40 w-full flex-col rounded-2xl border border-navy/10 bg-white p-5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:border-green/30 hover:shadow-lg">
                      <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${index % 3 === 0 ? "bg-purple" : index % 3 === 1 ? "bg-green" : index % 3 === 2 ? "bg-gold" : "bg-navy"}`}>
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <span className="mt-4 flex flex-1 items-center justify-between gap-2 font-semibold text-navy">
                        {label}<ArrowRight className="h-4 w-4 shrink-0 text-green transition-transform group-hover:translate-x-1" aria-hidden="true" />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>)}
        {tab === "profile" && <ProfileEditor />}
        {tab === "directory" && <FullDirectory />}
        {(tab === "opportunities" || tab === "documents") && (
          <section className="relative max-w-3xl overflow-hidden rounded-2xl border border-navy/10 bg-white p-6 shadow-soft sm:p-9">
            <div className={`absolute -right-10 -top-10 h-40 w-40 rounded-full opacity-[0.08] ${tab === "opportunities" ? "bg-purple" : "bg-gold"}`} />
            <div className="relative">
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl text-white ${tab === "opportunities" ? "bg-purple" : "bg-gold"}`}>
                {tab === "opportunities" ? <BriefcaseBusiness className="h-6 w-6" aria-hidden="true" /> : <FolderLock className="h-6 w-6" aria-hidden="true" />}
              </span>
              <span className="mt-5 inline-flex rounded-full bg-gold/15 px-3 py-1 text-sm font-semibold text-navy">Bientôt disponible</span>
              <h2 className="mt-3 text-2xl sm:text-3xl">{SOON[tab].title}</h2>
              <p className="mt-3 text-lg leading-relaxed text-navy/75">{SOON[tab].text}</p>
              <p className="mt-6 rounded-xl border border-navy/10 bg-offwhite p-4 text-sm text-navy/75">
                Ce service est en préparation et sera accessible prochainement depuis votre espace membre.
              </p>
            </div>
          </section>)}
      </Container>
    </div>
  );
}
