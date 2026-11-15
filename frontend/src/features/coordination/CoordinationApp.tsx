import { ExternalLink, FileText, Inbox, LayoutDashboard, LogOut, Megaphone, ScanLine, type LucideIcon } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Async } from "../../components/ui/Async";
import { Loading } from "../../components/ui/States";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type Me } from "../../services/coordination";
import { CampaignsPanel } from "./CampaignsPanel";
import { CheckInPanel } from "./CheckInPanel";
import { ContentPanel } from "./ContentPanel";
import { Dashboard } from "./Dashboard";
import { LoginForm } from "./LoginForm";
import { QueuePanel } from "./QueuePanel";

type Auth = { status: "loading" } | { status: "anon" } | { status: "in"; me: Me };
export type Tab = "home" | "queue" | "content" | "campaigns" | "checkin";
const TABS: { id: Tab; label: string; short: string; icon: LucideIcon }[] = [
  { id: "home", label: "Tableau de bord", short: "Accueil", icon: LayoutDashboard },
  { id: "queue", label: "À traiter", short: "À traiter", icon: Inbox },
  { id: "content", label: "Publications", short: "Contenus", icon: FileText },
  { id: "campaigns", label: "Campagnes", short: "Campagnes", icon: Megaphone },
  { id: "checkin", label: "Accueil et badges", short: "Badges", icon: ScanLine },
];
const ROLE_LABEL: Record<string, string> = { ADMIN: "Administrateur", COORDINATION: "Coordination" };

/** Onglet courant gardé dans l'adresse (?onglet=…) : un rechargement ou un lien partagé rouvre le même écran. */
function useTab(): [Tab, (t: Tab) => void] {
  const read = () => {
    const t = new URLSearchParams(window.location.search).get("onglet") as Tab | null;
    return t && TABS.some((x) => x.id === t) ? t : "home";
  };
  const [tab, setTab] = useState<Tab>(read);
  const change = useCallback((t: Tab) => {
    setTab(t);
    const url = new URL(window.location.href);
    if (t === "home") url.searchParams.delete("onglet"); else url.searchParams.set("onglet", t);
    window.history.replaceState(window.history.state, "", url);
    window.scrollTo({ top: 0 });
  }, []);
  return [tab, change];
}

const countLabel = (n: number) => (n > 99 ? "99+" : String(n));

function Workspace({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [tab, setTab] = useTab();
  const [kind, setKind] = useState("organizations");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const summary = useAsync(coordApi.summary, [version]);
  const toHandle = summary.data?.to_handle ?? 0;
  const initials = me.name.split(/\s+/).filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "UH";

  return (
    <div className="min-h-screen bg-offwhite lg:flex">
      {/* Menu latéral (ordinateur) */}
      <aside className="hidden w-64 shrink-0 flex-col bg-navy text-white lg:sticky lg:top-0 lg:flex lg:h-screen">
        <div className="border-b border-white/10 px-5 py-5">
          <div className="rounded-xl bg-white px-3 py-2"><img src={logo} alt="Urban Hub Connect" className="h-9 w-auto" /></div>
          <p className="mt-3 text-xs font-bold uppercase tracking-[0.16em] text-gold-light">Espace Coordination</p>
        </div>
        <nav aria-label="Sections" className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? "page" : undefined}
                className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 text-left font-semibold transition-colors ${active ? "bg-white text-navy" : "text-white/80 hover:bg-white/10 hover:text-white"}`}>
                <t.icon className={`h-5 w-5 shrink-0 ${active ? "text-green" : ""}`} aria-hidden />{t.label}
                {t.id === "queue" && toHandle > 0 && (
                  <span className="ml-auto min-w-[1.5rem] rounded-full bg-gold px-1.5 text-center text-xs font-bold leading-5 text-navy">{countLabel(toHandle)}</span>)}
              </button>);
          })}
        </nav>
        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green text-sm font-bold">{initials}</span>
            <div className="min-w-0"><p className="truncate font-semibold">{me.name}</p><p className="text-xs text-white/60">{ROLE_LABEL[me.role] ?? me.role}</p></div>
          </div>
          <div className="mt-3 grid gap-1 text-sm">
            <a href="/" className="flex items-center gap-2 rounded-lg px-2 py-2 text-white/75 hover:bg-white/10 hover:text-white"><ExternalLink className="h-4 w-4" aria-hidden />Voir le site</a>
            <button onClick={onLogout} className="flex items-center gap-2 rounded-lg px-2 py-2 text-left text-white/75 hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" aria-hidden />Se déconnecter</button>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Barre du haut (téléphone et tablette) */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-navy/10 bg-white/95 px-4 py-2.5 backdrop-blur lg:hidden">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="Urban Hub Connect" className="h-8 w-auto" />
            <span className="hidden truncate text-xs font-bold uppercase tracking-[0.14em] text-green sm:inline">Espace Coordination</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-green text-xs font-bold text-white" title={me.name} aria-hidden>{initials}</span>
            <button onClick={onLogout} className="flex min-h-[40px] items-center gap-1.5 rounded-lg border border-navy/15 px-3 text-sm font-semibold hover:bg-offwhite">
              <LogOut className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Se déconnecter</span><span className="sr-only sm:hidden">Se déconnecter</span></button>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {tab === "home" && <Dashboard me={me} version={version} onOpen={(k) => { setKind(k); setTab("queue"); }} onGo={setTab} />}
          {tab === "queue" && <Async state={summary}>{(s) => <QueuePanel kinds={s.queues} kind={kind} onKind={setKind} version={version} onChanged={refresh} />}</Async>}
          {tab === "content" && <ContentPanel me={me} onChanged={refresh} />}
          {tab === "campaigns" && <CampaignsPanel />}
          {tab === "checkin" && <CheckInPanel />}
        </main>
      </div>

      {/* Onglets en bas d'écran (téléphone et tablette) : à portée de pouce */}
      <nav aria-label="Sections (mobile)" className="fixed inset-x-0 bottom-0 z-30 border-t border-navy/10 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(14,34,64,0.06)] lg:hidden">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)} aria-current={active ? "page" : undefined}
                className={`relative flex min-h-[60px] flex-col items-center justify-center gap-1 text-[11px] font-semibold ${active ? "text-green" : "text-navy/60"}`}>
                {active && <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 rounded-full bg-green" />}
                <span className="relative">
                  <t.icon className="h-5 w-5" aria-hidden />
                  {t.id === "queue" && toHandle > 0 && (
                    <span className="absolute -right-3 -top-2 min-w-[1.1rem] rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-4 text-navy">{countLabel(toHandle)}</span>)}
                </span>
                {t.short}
              </button>);
          })}
        </div>
      </nav>
    </div>
  );
}

export function CoordinationApp() {
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  useEffect(() => {
    coordApi.csrf().then(() => coordApi.me()).then((me) => setAuth({ status: "in", me })).catch(() => setAuth({ status: "anon" }));
    const expired = () => setAuth({ status: "anon" });
    window.addEventListener("coord-expired", expired);
    return () => window.removeEventListener("coord-expired", expired);
  }, []);
  const logout = async () => { try { await coordApi.logout(); } finally { setAuth({ status: "anon" }); } };

  if (auth.status === "loading") return <Loading />;
  if (auth.status === "anon") return <LoginForm onLogin={(me) => setAuth({ status: "in", me })} />;
  return <Workspace me={auth.me} onLogout={logout} />;
}
