import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { memberApi } from "../../services/members";
import { fmtDate } from "../../utils/format";

const TONE: Record<string, string> = { pending: "bg-gold/20 text-navy", forwarded: "bg-green/10 text-green", declined: "bg-red-50 text-red-800" };

export function ConnectionsPanel() {
  const state = useAsync(memberApi.connections);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl">Mes mises en relation</h2>
      <p className="max-w-3xl text-navy/80">Les demandes sont transmises par la Coordination. Les réponses à une annonce partent directement vers son auteur.</p>
      <Async state={state} empty="Vous n'avez envoyé aucune demande pour le moment. Rendez-vous dans l'Annuaire complet pour en faire une.">
        {(list) => (
          <ul className="space-y-4">
            {list.map((r) => (
              <li key={r.id} className="rounded-md border border-navy/15 bg-white p-5 shadow-soft">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-lg">{r.organization.name}</h3>
                  <span className={`rounded px-2 py-0.5 text-sm font-semibold ${TONE[r.status] ?? ""}`}>{r.status_label}</span>
                </div>
                <p className="mt-1 text-sm text-navy/65">Envoyée le {fmtDate(r.created_at)}{r.opportunity && ` · en réponse à « ${r.opportunity} »`}</p>
                <p className="mt-3 whitespace-pre-line">{r.message}</p>
              </li>))}
          </ul>)}
      </Async>
    </div>
  );
}
