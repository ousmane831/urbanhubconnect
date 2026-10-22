import { useEffect, useState } from "react";
import { Loading } from "../components/ui/States";
import { LoginPanel } from "../features/members/LoginPanel";
import { MemberWorkspace } from "../features/members/MemberWorkspace";
import { useSeo } from "../hooks/useSeo";
import { memberApi, type MemberMe } from "../services/members";

type Auth = { status: "loading" } | { status: "anon" } | { status: "in"; me: MemberMe };

export default function MembersArea() {
  useSeo("Espace membres – Urban Hub Connect", "Accès réservé aux membres du réseau.", undefined, true);
  const [auth, setAuth] = useState<Auth>({ status: "loading" });
  const [notice, setNotice] = useState("");

  useEffect(() => {
    memberApi.csrf().then(() => memberApi.me()).then((me) => setAuth({ status: "in", me })).catch(() => setAuth({ status: "anon" }));
    const expired = () => { setAuth({ status: "anon" }); setNotice("Votre session a pris fin ou votre accès n'est plus actif. Reconnectez-vous ; en cas de doute, contactez la Coordination."); };
    window.addEventListener("member-expired", expired);
    return () => window.removeEventListener("member-expired", expired);
  }, []);
  const logout = async () => { try { await memberApi.logout(); } finally { setNotice(""); setAuth({ status: "anon" }); } };

  if (auth.status === "loading") return <Loading />;
  if (auth.status === "anon") return <LoginPanel notice={notice} onLogin={(me) => { setNotice(""); setAuth({ status: "in", me }); }} />;
  return <MemberWorkspace me={auth.me} onLogout={logout} />;
}
