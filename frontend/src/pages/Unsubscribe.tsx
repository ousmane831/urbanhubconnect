import { CheckCircle2, MailX } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { ErrorState, Loading } from "../components/ui/States";
import { useAsync } from "../hooks/useAsync";
import { useSeo } from "../hooks/useSeo";
import { confirmUnsubscribe, getUnsubscribe } from "../services/api";
import { apiErrorMessage } from "../utils/errors";
import { NotFound } from "./ErrorPage";

/** Lien « Se désinscrire » des campagnes. La désinscription demande un clic de confirmation :
 *  les antivirus des messageries qui ouvrent les liens automatiquement ne désinscrivent donc personne par erreur. */
export default function Unsubscribe() {
  const { token = "" } = useParams();
  useSeo("Désinscription", "Ne plus recevoir les e-mails d'Urban Hub Connect.", undefined, true);
  const state = useAsync(() => getUnsubscribe(token), [token]);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (state.notFound) return <NotFound />;
  if (state.loading) return <Loading />;
  if (state.error || !state.data) return <Container className="py-16"><ErrorState message={state.error ?? "Lien indisponible."} onRetry={state.retry} /></Container>;

  const confirm = async () => {
    setBusy(true); setError("");
    try { await confirmUnsubscribe(token); setDone(true); }
    catch (e) { setError(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };
  const unsubscribed = done || state.data.unsubscribed;

  return (
    <div className="bg-offwhite py-12 sm:py-20">
      <Container className="max-w-lg">
        <div className="card p-7 text-center sm:p-10">
          {unsubscribed ? (
            <>
              <CheckCircle2 className="mx-auto h-12 w-12 text-green" aria-hidden />
              <h1 className="mt-4 text-2xl sm:text-3xl">Vous êtes désinscrit</h1>
              <p className="mt-3 text-navy/75">
                L'adresse <strong>{state.data.email}</strong> ne recevra plus nos campagnes d'information.
                Les e-mails liés à vos propres démarches (inscription, badge, adhésion) restent envoyés.
              </p>
              <div className="mt-7"><Button to="/">Retour au site</Button></div>
            </>
          ) : (
            <>
              <MailX className="mx-auto h-12 w-12 text-navy/60" aria-hidden />
              <h1 className="mt-4 text-2xl sm:text-3xl">Se désinscrire</h1>
              <p className="mt-3 text-navy/75">
                Ne plus recevoir les campagnes d'information d'Urban Hub Connect à l'adresse <strong>{state.data.email}</strong> ?
              </p>
              {error && <p role="alert" className="mt-4 font-semibold text-red-800">{error}</p>}
              <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
                <button onClick={confirm} disabled={busy}
                  className="min-h-[48px] rounded-lg bg-navy px-6 font-semibold text-white hover:bg-navy-2 disabled:opacity-50">
                  {busy ? "Un instant…" : "Confirmer la désinscription"}
                </button>
                <Button to="/" variant="secondary">Annuler</Button>
              </div>
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
