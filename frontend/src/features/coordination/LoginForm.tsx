import { useState, type FormEvent } from "react";
import { coordApi, type Me } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";

export function LoginForm({ onLogin }: { onLogin: (me: Me) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await coordApi.csrf(); onLogin(await coordApi.login(username.trim(), password)); }
    catch (err) { setError(apiErrorMessage(err)); setPassword(""); }
    finally { setBusy(false); }
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-offwhite px-4">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-lg border border-navy/15 bg-white p-8 shadow-soft">
        <h1 className="text-2xl">Espace Coordination</h1>
        <p className="text-navy/75">Connectez-vous pour suivre l'activité du réseau.</p>
        <div><label htmlFor="u" className="mb-1.5 block font-semibold">Identifiant</label>
          <input id="u" className="field" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
        <div><label htmlFor="p" className="mb-1.5 block font-semibold">Mot de passe</label>
          <input id="p" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{error}</p>}
        <button disabled={busy} className="min-h-[48px] w-full rounded-md bg-green text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Connexion…" : "Se connecter"}</button>
      </form>
    </main>
  );
}
