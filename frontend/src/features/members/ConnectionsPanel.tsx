import { Handshake, Megaphone, UsersRound } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { memberApi } from "../../services/members";
import { fmtDate } from "../../utils/format";
import { Badge, Card, PanelHeader, secondaryBtn } from "./ui";

const TONE: Record<string, "gold" | "green" | "red"> = { pending: "gold", forwarded: "green", declined: "red" };

export function ConnectionsPanel({ onFind }: { onFind?: () => void }) {
  const state = useAsync(memberApi.connections);
  const find = onFind && <button onClick={onFind} className={secondaryBtn}><UsersRound className="h-5 w-5" aria-hidden />Trouver un membre</button>;
  return (
    <div className="space-y-5">
      <PanelHeader icon={Handshake} title="Mises en relation" action={find}
        intro="Vos demandes sont transmises par la Coordination. Les réponses à une annonce partent directement vers son auteur." />
      <Async state={state} empty="Vous n'avez envoyé aucune demande pour le moment. Ouvrez la fiche d'un membre dans l'Annuaire complet pour en faire une.">
        {(list) => (
          <ul className="space-y-3 sm:space-y-4">
            {list.map((r) => (
              <Card as="li" key={r.id}>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-heading text-lg font-bold leading-snug">{r.organization.name}</h3>
                  <Badge tone={TONE[r.status] ?? "gold"}>{r.status_label}</Badge>
                </div>
                <p className="mt-1 text-sm text-navy/65">Envoyée le {fmtDate(r.created_at)}{r.forwarded_at && ` · transmise le ${fmtDate(r.forwarded_at)}`}</p>
                {r.opportunity && <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold text-purple"><Megaphone className="h-4 w-4" aria-hidden />En réponse à « {r.opportunity} »</p>}
                <p className="mt-3 whitespace-pre-line rounded-xl bg-offwhite p-3 text-navy/85">{r.message}</p>
              </Card>))}
          </ul>)}
      </Async>
    </div>
  );
}
