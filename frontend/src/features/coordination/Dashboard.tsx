import { CheckCircle2 } from "lucide-react";
import { Async } from "../../components/ui/Async";
import { useAsync } from "../../hooks/useAsync";
import { coordApi } from "../../services/coordination";

export function Dashboard({ version, onOpen }: { version: number; onOpen: (kind: string) => void }) {
  const state = useAsync(coordApi.summary, [version]);
  return (
    <Async state={state}>
      {(d) => (
        <div className="space-y-10">
          <p className="text-2xl font-heading font-bold">
            {d.to_handle === 0 ? <span className="flex items-center gap-2 text-green"><CheckCircle2 aria-hidden />Tout est à jour.</span>
              : `${d.to_handle} élément${d.to_handle > 1 ? "s" : ""} à traiter`}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {d.queues.map((q) => (
              <li key={q.kind}>
                <button onClick={() => onOpen(q.kind)} disabled={q.count === 0}
                  className={`flex w-full items-center justify-between gap-4 rounded-md border p-5 text-left ${q.count ? "border-gold bg-gold/10 hover:bg-gold/20" : "border-navy/15 text-navy/60"}`}>
                  <span className="text-lg font-semibold">{q.label}</span>
                  <span className="font-heading text-3xl font-extrabold">{q.count}</span>
                </button>
              </li>))}
          </ul>
          <section aria-label="Chiffres du réseau"><h2 className="mb-4 text-xl">Le réseau en chiffres</h2>
            <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {d.stats.map((s) => <div key={s.label} className="border-t-4 border-navy pt-3"><dd className="font-heading text-3xl font-extrabold">{s.value}</dd><dt className="text-navy/75">{s.label}</dt></div>)}
            </dl></section>
        </div>)}
    </Async>
  );
}
