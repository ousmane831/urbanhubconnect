import { LogOut } from "lucide-react";
import { useState } from "react";
import { Container } from "../../components/ui/Container";
import type { MemberMe } from "../../services/members";
import { fmtDate } from "../../utils/format";
import { FullDirectory } from "./FullDirectory";
import { ProfileEditor } from "./ProfileEditor";

type Tab = "home" | "profile" | "directory" | "opportunities" | "documents";
const TABS: [Tab, string][] = [["home", "Accueil"], ["profile", "Mon profil"], ["directory", "Annuaire complet"], ["opportunities", "Urban Opportunities"], ["documents", "Documents réservés"]];
const SOON: Record<"opportunities" | "documents", { title: string; text: string }> = {
  opportunities: { title: "Urban Opportunities", text: "Publier et consulter partenariats, appels d'offres, sous-traitance, emplois, stages." },
  documents: { title: "Documents réservés", text: "Comptes rendus des commissions, Urban Notes, résultats du Baromètre, documents de l'Assemblée générale." },
};

export function MemberWorkspace({ me, onLogout }: { me: MemberMe; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  return (
    <>
      <div className="border-b border-navy/10 bg-offwhite">
        <Container className="flex flex-wrap items-center justify-between gap-3 py-4">
          <p className="font-heading text-lg font-bold">Espace membres <span className="font-body text-base font-normal text-navy/75">· {me.name}</span></p>
          <button onClick={onLogout} className="flex min-h-[44px] items-center gap-2 rounded-md border border-navy/30 px-4 font-semibold hover:bg-white"><LogOut className="h-4 w-4" aria-hidden />Se déconnecter</button>
        </Container>
        <Container><nav aria-label="Sections de l'Espace membres" className="-mb-px flex gap-1 overflow-x-auto">
          {TABS.map(([id, label]) => (
            <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}
              className={`min-h-[48px] shrink-0 border-b-4 px-4 font-semibold ${tab === id ? "border-green text-green" : "border-transparent hover:border-navy/20"}`}>{label}</button>))}
        </nav></Container>
      </div>
      <Container className="py-10">
        {tab === "home" && (
          <div className="space-y-8">
            <h1 className="text-3xl sm:text-4xl">Bonjour {me.name}</h1>
            <dl className="grid max-w-3xl gap-4 sm:grid-cols-2">
              {[["Organisation", me.organization], ["Catégorie", me.category], ["Statut", me.status],
                ["Cotisation valable jusqu'au", me.valid_until ? fmtDate(me.valid_until) : ""], ["Référence", me.reference], ["Membre fondateur", me.is_founder ? "Oui" : ""]]
                .filter(([, v]) => v).map(([k, v]) => <div key={k} className="border-t-4 border-navy pt-3"><dt className="text-sm text-navy/65">{k}</dt><dd className="text-lg font-semibold">{v}</dd></div>)}
            </dl>
            <ul className="flex flex-wrap gap-3">
              {TABS.filter(([id]) => id !== "home").map(([id, label]) => <li key={id}><button onClick={() => setTab(id)} className="min-h-[44px] rounded-md border border-navy/25 px-5 font-semibold hover:bg-offwhite">{label}</button></li>)}
            </ul>
          </div>)}
        {tab === "profile" && <ProfileEditor />}
        {tab === "directory" && <FullDirectory />}
        {(tab === "opportunities" || tab === "documents") && (
          <div className="max-w-2xl space-y-3"><h2 className="text-2xl">{SOON[tab].title}</h2><p className="text-lg">{SOON[tab].text}</p>
            <p className="rounded-md bg-offwhite p-4 font-semibold">Cette fonction arrive prochainement dans l'Espace membres.</p></div>)}
      </Container>
    </>
  );
}
