import jsQR from "jsqr";
import { Camera, CameraOff, CircleCheckBig, CircleX, ScanLine, Search, Send, TriangleAlert, Trees } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAsync } from "../../hooks/useAsync";
import { useDebounce } from "../../hooks/useDebounce";
import { coordApi, type CheckinPerson, type CheckinResult } from "../../services/coordination";
import { apiErrorMessage } from "../../utils/errors";

const todayIso = () => new Date().toISOString().slice(0, 10); // Dakar = GMT

/** Lecture du QR code avec l'appareil photo arrière, directement dans le navigateur (Android et iPhone). */
function Scanner({ paused, onCode, onStop }: { paused: boolean; onCode: (code: string) => void; onStop: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const pausedRef = useRef(paused);
  const onCodeRef = useRef(onCode);
  const [error, setError] = useState("");
  pausedRef.current = paused;
  onCodeRef.current = onCode;

  useEffect(() => {
    let stream: MediaStream | undefined, timer = 0, stopped = false;
    const tick = () => {
      if (stopped) return;
      const v = video.current, c = canvas.current;
      if (!pausedRef.current && v && c && v.readyState >= 2 && v.videoWidth) {
        const scale = Math.min(1, 640 / v.videoWidth);  // image réduite : décodage rapide même sur un téléphone modeste
        c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
        const ctx = c.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(v, 0, 0, c.width, c.height);
          const found = jsQR(ctx.getImageData(0, 0, c.width, c.height).data, c.width, c.height, { inversionAttempts: "dontInvert" });
          if (found?.data) onCodeRef.current(found.data);
        }
      }
      timer = window.setTimeout(tick, 180);
    };
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Cet appareil ou ce navigateur ne permet pas d'utiliser l'appareil photo. Utilisez la recherche par nom ci-dessous.");
      return;
    }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((s) => {
        if (stopped) { s.getTracks().forEach((t) => t.stop()); return; }
        stream = s;
        if (video.current) { video.current.srcObject = s; video.current.play().catch(() => {}); }
        tick();
      })
      .catch(() => setError("Accès à l'appareil photo refusé. Autorisez-le dans les réglages du navigateur, ou utilisez la recherche par nom."));
    return () => { stopped = true; window.clearTimeout(timer); stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  if (error) return (
    <div className="space-y-3">
      <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{error}</p>
      <button onClick={onStop} className="min-h-[48px] rounded-lg border border-navy/20 bg-white px-5 font-semibold">Fermer</button>
    </div>);
  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden rounded-2xl bg-black">
        <video ref={video} muted playsInline className="h-full w-full object-cover" aria-label="Image de l'appareil photo" />
        <div aria-hidden className="pointer-events-none absolute inset-[15%] rounded-2xl border-4 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]" />
        {paused && <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-lg font-semibold text-white">Lecture en pause</div>}
      </div>
      <canvas ref={canvas} className="hidden" />
      <button onClick={onStop} className="mx-auto flex min-h-[48px] items-center gap-2 rounded-lg border border-navy/20 bg-white px-5 font-semibold"><CameraOff className="h-5 w-5" aria-hidden />Arrêter l'appareil photo</button>
    </div>
  );
}

const STYLES: Record<CheckinResult["result"], { box: string; icon: typeof CircleCheckBig; title: string }> = {
  ok: { box: "border-green bg-green text-white", icon: CircleCheckBig, title: "Badge valide" },
  already: { box: "border-gold bg-gold/20 text-navy", icon: TriangleAlert, title: "Déjà enregistré aujourd'hui" },
  cancelled: { box: "border-red-700 bg-red-50 text-red-900", icon: CircleX, title: "Inscription annulée" },
  invalid: { box: "border-red-700 bg-red-50 text-red-900", icon: CircleX, title: "Badge inconnu" },
};

function ResultCard({ r, onNext }: { r: CheckinResult; onNext: () => void }) {
  const s = STYLES[r.result];
  return (
    <section aria-live="assertive" className={`rounded-2xl border-2 p-5 ${s.box}`}>
      <p className="flex items-center gap-2 font-heading text-2xl font-extrabold"><s.icon className="h-8 w-8 shrink-0" aria-hidden />{s.title}</p>
      {r.name && <p className="mt-3 font-heading text-xl font-bold">{r.name}</p>}
      {r.organization && <p className="opacity-85">{r.organization}</p>}
      {r.result === "already" && r.today_at && <p className="mt-2 font-semibold">Arrivé(e) aujourd'hui à {r.today_at}.</p>}
      {r.result === "invalid" && <p className="mt-2">Ce QR code ne correspond à aucune inscription. Cherchez la personne par son nom ci-dessous.</p>}
      {r.planting && r.result !== "invalid" && (
        <p className={`mt-3 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${r.result === "ok" ? "bg-white/20" : "bg-green/10 text-green"}`}>
          <Trees className="h-4 w-4" aria-hidden />Place dans le convoi du reboisement</p>)}
      {!!r.options?.length && (
        <ul className="mt-3 space-y-1 text-sm opacity-90">{r.options.map((o) => <li key={o}>· {o}</li>)}</ul>)}
      <button onClick={onNext} className={`mt-5 min-h-[52px] w-full rounded-lg text-lg font-semibold ${r.result === "ok" ? "bg-white text-green" : "bg-navy text-white"}`}>
        Scanner le badge suivant</button>
    </section>
  );
}

function ManualSearch({ onDone }: { onDone: () => void }) {
  const [q, setQ] = useState("");
  const query = useDebounce(q);
  const [version, setVersion] = useState(0);
  const list = useAsync(() => (query.trim().length >= 2 ? coordApi.checkinSearch(query.trim()) : Promise.resolve([] as CheckinPerson[])), [query, version]);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const run = async (p: CheckinPerson, action: "checkin" | "resend") => {
    setBusy(p.id); setNotice(null);
    try {
      if (action === "checkin") {
        const r = await coordApi.checkin({ id: p.id });
        setNotice({ ok: r.result === "ok", text: `${p.name} : ${r.message}${r.today_at && r.result === "already" ? ` (à ${r.today_at})` : ""}` });
        onDone();
      } else setNotice({ ok: true, text: await coordApi.checkinResend(p.id) });
      setVersion((v) => v + 1);
    } catch (e) { setNotice({ ok: false, text: apiErrorMessage(e) }); }
    finally { setBusy(null); }
  };
  return (
    <section aria-labelledby="recherche-titre" className="rounded-2xl border border-navy/10 bg-white p-4 shadow-soft sm:p-6">
      <h3 id="recherche-titre" className="font-heading text-lg font-bold">Sans QR code : rechercher la personne</h3>
      <div className="relative mt-3">
        <label htmlFor="ci-q" className="sr-only">Nom, organisation, e-mail ou téléphone</label>
        <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-navy/40" aria-hidden />
        <input id="ci-q" type="search" className="field pl-10" placeholder="Nom, organisation, e-mail ou téléphone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {notice && <p role="status" className={`mt-3 rounded-xl p-3 font-semibold ${notice.ok ? "bg-green/10 text-green" : "bg-gold/15 text-navy"}`}>{notice.text}</p>}
      <ul className="mt-3 divide-y divide-navy/10">
        {list.data?.map((p) => {
          const here = p.checkins.includes(todayIso());
          return (
            <li key={p.id} className="py-3">
              <p className="font-semibold">{p.name}{!p.valid && <span className="ml-2 text-sm text-red-800">(annulée)</span>}</p>
              <p className="text-sm text-navy/70">{[p.organization, p.phone, p.email].filter(Boolean).join(" · ")}</p>
              <p className="mt-1 text-sm">{here ? "✅ Arrivé(e) aujourd'hui" : "Pas encore arrivé(e) aujourd'hui"}{p.planting && " · 🌳 convoi du reboisement"}</p>
              <div className="mt-2 grid gap-2 sm:flex">
                {p.valid && !here && <button disabled={busy === p.id} onClick={() => run(p, "checkin")} className="min-h-[44px] rounded-lg bg-green px-4 font-semibold text-white disabled:opacity-60">Valider l'arrivée</button>}
                {p.valid && <button disabled={busy === p.id} onClick={() => run(p, "resend")} className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy/20 px-4 font-semibold disabled:opacity-60"><Send className="h-4 w-4" aria-hidden />Renvoyer le badge</button>}
              </div>
            </li>);
        })}
        {query.trim().length >= 2 && list.data && !list.data.length && <li className="py-3 text-navy/70">Aucune inscription trouvée.</li>}
      </ul>
    </section>
  );
}

/** Accueil du Grand Week-End : scan des badges, arrivées du jour, recherche manuelle (comptes Coordination). */
export function CheckInPanel() {
  const [version, setVersion] = useState(0);
  const stats = useAsync(coordApi.checkinStats, [version]);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState("");
  const last = useRef<{ code: string; at: number }>({ code: "", at: 0 });

  const onCode = useCallback(async (code: string) => {
    const now = Date.now();
    if (busy || result || (code === last.current.code && now - last.current.at < 4000)) return;
    last.current = { code, at: now };
    setBusy(true); setFailure("");
    try {
      const r = await coordApi.checkin({ code });
      setResult(r);
      navigator.vibrate?.(r.result === "ok" ? 120 : [120, 80, 120]);
      setVersion((v) => v + 1);
    } catch (e) { setFailure(apiErrorMessage(e)); }
    finally { setBusy(false); }
  }, [busy, result]);

  useEffect(() => {  // badge valide : retour automatique au scan pour fluidifier la file d'attente
    if (result?.result !== "ok") return;
    const t = window.setTimeout(() => setResult(null), 4000);
    return () => window.clearTimeout(t);
  }, [result]);

  const s = stats.data;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green text-white"><ScanLine className="h-6 w-6" aria-hidden /></span>
        <div><h2 className="text-2xl">Accueil · scan des badges</h2>
          <p className="text-navy/75">Scannez le QR code du participant. Un badge est valable une fois par jour, pour les deux journées.</p></div>
      </div>

      {s && (
        <dl className="grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl bg-white p-3 text-center shadow-soft"><dd className="font-heading text-2xl font-extrabold sm:text-3xl">{s.today}</dd><dt className="text-xs text-navy/70 sm:text-sm">arrivés aujourd'hui</dt></div>
          <div className="rounded-xl bg-white p-3 text-center shadow-soft"><dd className="font-heading text-2xl font-extrabold sm:text-3xl">{s.registered}</dd><dt className="text-xs text-navy/70 sm:text-sm">inscrits</dt></div>
          <div className="rounded-xl bg-white p-3 text-center shadow-soft"><dd className="font-heading text-2xl font-extrabold sm:text-3xl">{s.planting_taken}{s.planting_seats !== null && <span className="text-base font-bold text-navy/50"> / {s.planting_seats}</span>}</dd><dt className="text-xs text-navy/70 sm:text-sm">au reboisement</dt></div>
        </dl>)}

      {failure && <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{failure}</p>}
      {result && <ResultCard r={result} onNext={() => setResult(null)} />}
      {scanning
        ? <Scanner paused={!!result || busy} onCode={onCode} onStop={() => { setScanning(false); setResult(null); }} />
        : <button onClick={() => { setResult(null); setScanning(true); }} className="flex min-h-[64px] w-full items-center justify-center gap-3 rounded-2xl bg-green text-xl font-semibold text-white shadow-soft hover:bg-green-2">
            <Camera className="h-7 w-7" aria-hidden />Démarrer le scan</button>}

      <ManualSearch onDone={() => setVersion((v) => v + 1)} />
    </div>
  );
}
