import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Container } from "../components/ui/Container";
import { useSeo } from "../hooks/useSeo";
import { memberApi } from "../services/members";
import { apiErrorMessage } from "../utils/errors";

export default function ForgotPassword() {
  useSeo("Mot de passe oublié – Urban Hub Connect", "Recevez un lien pour choisir un nouveau mot de passe.", undefined, true);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setError("");
    try { await memberApi.csrf(); setMessage(await memberApi.resetPassword(email.trim())); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Container className="max-w-xl py-16">
      <h1 className="text-3xl sm:text-4xl">Mot de passe oublié</h1>
      {message ? <p role="status" className="mt-6 rounded-md border border-green/40 bg-green/5 p-4 text-lg">{message}</p> : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <p className="text-navy/80">Saisissez l'adresse e-mail de votre compte : vous recevrez un lien pour choisir un nouveau mot de passe.</p>
          <div><label htmlFor="fp" className="mb-1.5 block font-semibold">Adresse e-mail</label>
            <input id="fp" type="email" className="field" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
          {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{error}</p>}
          <button disabled={busy} className="min-h-[48px] rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Envoi…" : "Recevoir le lien"}</button>
        </form>)}
      <p className="mt-8"><Link to="/espace-membres" className="link">← Retour à la connexion</Link></p>
    </Container>
  );
}
