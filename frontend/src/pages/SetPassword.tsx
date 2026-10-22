import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { passwordProblem } from "../features/members/password";
import { useSeo } from "../hooks/useSeo";
import { memberApi } from "../services/members";
import { apiErrorMessage } from "../utils/errors";

export default function SetPassword() {
  useSeo("Créer votre mot de passe – Urban Hub Connect", "Choisissez le mot de passe de votre accès à l'Espace membres.", undefined, true);
  const [params] = useSearchParams();
  const uid = params.get("uid") ?? "", token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    const problem = passwordProblem(password, confirm);
    if (problem) return setError(problem);
    setBusy(true); setError("");
    try { await memberApi.csrf(); setDone(await memberApi.setPassword(uid, token, password)); }
    catch (err) { setError(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };
  return (
    <Container className="max-w-xl py-16">
      <h1 className="text-3xl sm:text-4xl">Choisissez votre mot de passe</h1>
      {!uid || !token ? (
        <p role="alert" className="mt-6 rounded-md border border-red-300 bg-red-50 p-4 font-semibold text-red-900">Ce lien est incomplet. Utilisez le lien reçu par e-mail ou « Mot de passe oublié ».</p>
      ) : done ? (
        <div role="status" className="mt-6 space-y-5"><p className="rounded-md border border-green/40 bg-green/5 p-4 text-lg">{done}</p><Button to="/espace-membres">Me connecter</Button></div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-5">
          <p className="text-navy/80">Au moins 10 caractères, pas uniquement des chiffres.</p>
          <div><label htmlFor="pw1" className="mb-1.5 block font-semibold">Nouveau mot de passe</label>
            <input id="pw1" type="password" className="field" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
          <div><label htmlFor="pw2" className="mb-1.5 block font-semibold">Confirmer le mot de passe</label>
            <input id="pw2" type="password" className="field" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required /></div>
          {error && <p role="alert" className="rounded-md border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{error}</p>}
          <button disabled={busy} className="min-h-[48px] rounded-md bg-green px-8 text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
        </form>)}
    </Container>
  );
}
