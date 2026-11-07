import { Eye, EyeOff, FileLock2, Handshake, LockKeyhole, Megaphone, UsersRound } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../../components/ui/Button";
import { Container } from "../../components/ui/Container";
import { HexPattern } from "../../components/ui/HexPattern";
import { RichText } from "../../components/ui/RichText";
import { useAsync } from "../../hooks/useAsync";
import { getPage } from "../../services/api";
import { memberApi, type MemberMe } from "../../services/members";
import { apiErrorMessage } from "../../utils/errors";

const SERVICES = [
  { icon: UsersRound, label: "L'annuaire complet, avec les offres et besoins des membres" },
  { icon: Handshake, label: "Des mises en relation relayées par la Coordination" },
  { icon: Megaphone, label: "Les annonces Urban Opportunities" },
  { icon: FileLock2, label: "Les documents réservés aux membres" },
];

export function LoginPanel({ onLogin, notice }: { onLogin: (me: MemberMe) => void; notice?: string }) {
  const intro = useAsync(() => getPage("espace-membres"));
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
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
    <div className="bg-offwhite">
      <section className="relative overflow-hidden bg-navy text-white">
        <HexPattern className="text-white/[0.05]" />
        <Container className="relative py-8 sm:py-12">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-mint">Urban Hub Connect</p>
          <h1 className="mt-2 text-3xl sm:text-5xl">{intro.data?.title ?? "Espace membres"}</h1>
          <p className="mt-2 max-w-2xl text-white/80">Accès réservé aux membres à jour de leur cotisation.</p>
        </Container>
      </section>

      <Container className="grid gap-8 py-8 sm:py-12 lg:grid-cols-[1fr_26rem] lg:items-start lg:gap-12">
        {/* Sur mobile, le formulaire passe en premier : c'est ce que l'on vient faire ici. */}
        <form onSubmit={submit} className="order-first space-y-5 rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-8 lg:order-last lg:sticky lg:top-24" aria-label="Connexion à l'Espace membres">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-green text-white"><LockKeyhole className="h-5 w-5" aria-hidden /></span>
            <h2 className="text-2xl">Connexion</h2>
          </div>
          {notice && <p role="status" className="rounded-xl border border-gold bg-gold/10 p-3 font-semibold">{notice}</p>}
          <div><label htmlFor="m-id" className="mb-1.5 block font-semibold">Identifiant (votre adresse e-mail)</label>
            <input id="m-id" type="email" inputMode="email" className="field" autoComplete="username" value={identifier} onChange={(e) => setIdentifier(e.target.value)} required /></div>
          <div><label htmlFor="m-pw" className="mb-1.5 block font-semibold">Mot de passe</label>
            <div className="relative">
              <input id="m-pw" type={show ? "text" : "password"} className="field pr-12" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-md text-navy/60 hover:bg-offwhite hover:text-navy">
                {show ? <EyeOff className="h-5 w-5" aria-hidden /> : <Eye className="h-5 w-5" aria-hidden />}
              </button>
            </div></div>
          {error && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-3 font-semibold text-red-900">{error}</p>}
          <button disabled={busy} className="min-h-[52px] w-full rounded-lg bg-green text-lg font-semibold text-white hover:bg-green-2 disabled:opacity-60">{busy ? "Connexion…" : "Se connecter"}</button>
          <p className="text-center"><Link to="/espace-membres/mot-de-passe-oublie" className="link">Mot de passe oublié ?</Link></p>
        </form>

        <div className="space-y-6">
          {intro.data && <div className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-8"><RichText text={intro.data.content} lead /></div>}
          <section aria-labelledby="services-membres" className="rounded-2xl border border-navy/10 bg-white p-5 shadow-soft sm:p-8">
            <h2 id="services-membres" className="font-heading text-lg font-bold sm:text-xl">Ce que vous trouvez dans l'Espace membres</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {SERVICES.map((s) => (
                <li key={s.label} className="flex items-start gap-3 rounded-xl bg-offwhite p-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-green/10 text-green"><s.icon className="h-5 w-5" aria-hidden /></span>
                  <span className="text-[15px] font-medium leading-snug">{s.label}</span>
                </li>))}
            </ul>
            <div className="mt-6 flex flex-col gap-3 border-t border-navy/10 pt-5 sm:flex-row sm:items-center">
              <p className="text-navy/75">Pas encore membre ?</p>
              <Button to="/adherer" variant="secondary">Adhérer au réseau</Button>
            </div>
          </section>
        </div>
      </Container>
    </div>
  );
}
