import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState, type FormEvent } from "react";
import logo from "../../assets/logo.png";
import { HexPattern } from "../../components/ui/HexPattern";
import { coordApi, type Me } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";

export function LoginForm({ onLogin }: { onLogin: (me: Me) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
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
    <main className="grid min-h-screen bg-offwhite lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <HexPattern className="text-white/[0.05]" />
        <div className="relative w-fit rounded-xl bg-white px-4 py-3"><img src={logo} alt="Urban Hub Connect" className="h-12 w-auto" /></div>
        <div className="relative max-w-md">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-gold-light">Espace Coordination</p>
          <p className="mt-3 font-heading text-3xl font-extrabold leading-tight">Suivre les demandes, les membres et les événements du réseau.</p>
        </div>
        <p className="relative text-sm text-white/50">Accès réservé à la Coordination d'Urban Hub Connect.</p>
      </div>

      <div className="flex items-center justify-center px-4 py-10">
        <form onSubmit={submit} className="w-full max-w-sm">
          <img src={logo} alt="Urban Hub Connect" className="mb-8 h-12 w-auto lg:hidden" />
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green/10 text-green"><LockKeyhole className="h-5 w-5" aria-hidden /></span>
          <h1 className="mt-4 text-2xl sm:text-3xl">Espace Coordination</h1>
          <p className="mt-1 text-navy/70">Connectez-vous pour suivre l'activité du réseau.</p>
          <div className="mt-8 space-y-5">
            <div><label htmlFor="u" className="mb-1.5 block font-semibold">Identifiant</label>
              <input id="u" className="field" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required /></div>
            <div><label htmlFor="p" className="mb-1.5 block font-semibold">Mot de passe</label>
              <div className="relative">
                <input id="p" type={show ? "text" : "password"} className="field pr-12" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-navy/50 hover:bg-offwhite hover:text-navy">
                  {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
              </div></div>
            {error && <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm font-semibold text-red-900">{error}</p>}
            <button disabled={busy} className="min-h-[50px] w-full rounded-lg bg-green text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Connexion…" : "Se connecter"}</button>
          </div>
          <a href="/" className="mt-8 inline-block text-sm font-semibold text-green hover:underline">← Retour au site</a>
        </form>
      </div>
    </main>
  );
}
