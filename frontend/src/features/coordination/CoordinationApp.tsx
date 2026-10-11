import { LogOut, LayoutDashboard, Inbox, FileText } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Async } from "../../components/ui/Async";
import { Loading } from "../../components/ui/States";
import { HexPattern } from "../../components/ui/HexPattern";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type Me } from "../../services/coordination";
import { ContentPanel } from "./ContentPanel";
import { Dashboard } from "./Dashboard";
import { LoginForm } from "./LoginForm";
import { QueuePanel } from "./QueuePanel";

type Auth = { status: "loading" } | { status: "anon" } | { status: "in"; me: Me };
type Tab = "home" | "queue" | "content";
const TABS: [Tab, string, any][] = [
  ["home", "Accueil", LayoutDashboard],
  ["queue", "À traiter", Inbox],
  ["content", "Publications", FileText]
];

function Workspace({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [kind, setKind] = useState("organizations");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const summary = useAsync(coordApi.summary, [version]);

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green text-white">
                <LayoutDashboard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-heading text-2xl font-extrabold">Espace Coordination</p>
                <p className="text-sm text-white/70">Bienvenue, {me.name}</p>
              </div>
            </div>
            <button onClick={onLogout} className="flex min-h-[44px] items-center gap-2 rounded-md border border-white/40 px-4 hover:bg-white/10 transition-colors">
              <LogOut className="h-4 w-4" aria-hidden />
              <span className="hidden sm:inline">Se déconnecter</span>
              <span className="sm:hidden">Déconnexion</span>
            </button>
          </div>
          <nav aria-label="Sections" className="flex gap-1 overflow-x-auto pb-2 sm:gap-2 sm:pb-0">
            {TABS.map(([id, label, Icon]) => (
              <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}
                className={`flex min-h-[48px] items-center gap-2 rounded-t-lg px-4 sm:px-5 font-semibold transition-colors ${
                  tab === id 
                    ? "bg-offwhite text-navy" 
                    : "text-white/85 hover:bg-white/10"
                }`}>
                <Icon className="h-5 w-5" />
                <span>{label}</span>
                {id === "queue" && !!summary.data?.to_handle && (
                  <span className="ml-2 rounded-full bg-gold px-2 text-sm font-bold text-navy">{summary.data.to_handle}</span>
                )}
              </button>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {tab === "home" && <Dashboard version={version} onOpen={(k) => { setKind(k); setTab("queue"); }} />}
        {tab === "queue" && <Async state={summary}>{(s) => <QueuePanel kinds={s.queues} kind={kind} onKind={setKind} version={version} onChanged={refresh} />}</Async>}
        {tab === "content" && <ContentPanel me={me} onChanged={refresh} />}
      </main>
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
