import { useEffect, useState } from "react";
import { timeLeft } from "../utils/countdown";

export function Countdown({ target }: { target: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const t = timeLeft(target, now);
  if (t.done) return <p className="font-heading text-xl font-bold">C'est maintenant.</p>;
  const units: [number, string][] = [[t.days, "jours"], [t.hours, "heures"], [t.minutes, "minutes"], [t.seconds, "secondes"]];
  return (
    <div role="timer" aria-live="off" aria-label={`${t.days} jours, ${t.hours} heures et ${t.minutes} minutes restants`} className="flex gap-3 sm:gap-5">
      {units.map(([v, label]) => (
        <div key={label} className="min-w-[4.25rem] border-l border-gold-light/60 pl-3">
          <div className="font-heading text-3xl font-extrabold tabular-nums sm:text-5xl">{String(v).padStart(2, "0")}</div>
          <div className="text-sm text-white/75">{label}</div>
        </div>
      ))}
    </div>
  );
}
