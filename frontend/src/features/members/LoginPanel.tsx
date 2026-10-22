import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { RichText } from "../../components/ui/RichText";
import { useAsync } from "../../hooks/useAsync";
import { getPage } from "../../services/api";
import { memberApi, type MemberMe } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";

export function LoginPanel({ onLogin, notice }: { onLogin: (me: MemberMe) => void; notice?: string }) {
  const intro = useAsync(() => getPage("espace-membres"));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await memberApi.csrf(); onLogin(await memberApi.login(identifier.trim(), password)); }
    catch (err) { setError(apiErrorMessage(err)); setPassword(""); }
    finally { setBusy(false); }
  };
  return (
    <Container className="grid gap-12 py-14 lg:grid-cols-[1.2fr_1fr] lg:py-20">
      <div>
        <h1 className="text-3xl sm:text-5xl">{intro.data?.title ?? "Espace membres"}</h1>
        <div className="mt-6">{intro.data && <RichText text={intro.data.content} lead />}</div>
        <Button to="/adherer" variant="secondary" className="mt-8">Adhérer au réseau</Button>
      </div>
      <form onSubmit={submit} className="space-y-5 self-start rounded-lg border border-navy/15 bg-white p-8 shadow-soft" aria-label="Connexion à l'Espace membres">
        <h2 className="text-2xl">Connexion</h2>
        {notice && <p role="status" className="rounded-md border border-gold bg-gold/10 p-3 font-semibold">{notice}</p>}
        <div><label htmlFor="m-id" className="mb-1.5 block font-semibold">Identifiant (votre adresse e-mail)</label>
          <input id="m-id" className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div>
        <div><label htmlFor="m-pw" className="mb-1.5 block font-semibold">Mot de passe</label>
          <input id="m-pw" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{error}</p>}
        <button disabled={busy} className="min-h-[48px] w-full rounded-md bg-green text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Connexion…" : "Se connecter"}</button>
        <p className="text-center"><Link to="/espace-membres/mot-de-passe-oublie" className="link">Mot de passe oublié ?</Link></p>
      </form>
    </Container>
  );
}
