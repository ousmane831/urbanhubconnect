import { LogOut } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Async } from "../../components/ui/Async";
import { Loading } from "../../components/ui/States";
import { useAsync } from "../../hooks/useAsync";
import { coordApi, type Me } from "../../services/coordination";
import { ContentPanel } from "./ContentPanel";
import { Dashboard } from "./Dashboard";
import { LoginForm } from "./LoginForm";
import { QueuePanel } from "./QueuePanel";

type Auth = { status: "loading" } | { status: "anon" } | { status: "in"; me: Me };
type Tab = "home" | "queue" | "content";
const TABS: [Tab, string][] = [["home", "Accueil"], ["queue", "À traiter"], ["content", "Publications"]];

function Workspace({ me, onLogout }: { me: Me; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>("home");
  const [kind, setKind] = useState("organizations");
  const [version, setVersion] = useState(0);
  const refresh = useCallback(() => setVersion((v) => v + 1), []);
  const summary = useAsync(coordApi.summary, [version]);

  return (
    <div className="min-h-screen bg-offwhite">
      <header className="bg-navy text-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <p className="font-heading text-xl font-extrabold">Espace Coordination</p>
          <div className="flex items-center gap-4"><span>{me.name}</span>
            <button onClick={onLogout} className="flex min-h-[44px] items-center gap-2 rounded-md border border-white/40 px-4 hover:bg-white/10"><LogOut className="h-4 w-4" aria-hidden />Se déconnecter</button></div>
        </div>
        <nav aria-label="Sections" className="mx-auto flex max-w-5xl gap-2 px-4">
          {TABS.map(([id, label]) => (
            <button key={id} aria-current={tab === id ? "page" : undefined} onClick={() => setTab(id)}
              className={`min-h-[48px] rounded-t-md px-5 font-semibold ${tab === id ? "bg-offwhite text-navy" : "text-white/85 hover:bg-white/10"}`}>
              {label}{id === "queue" && !!summary.data?.to_handle && <span className="ml-2 rounded-full bg-gold px-2 text-sm text-navy">{summary.data.to_handle}</span>}</button>))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">
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
