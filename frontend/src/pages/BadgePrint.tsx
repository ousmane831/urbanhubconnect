import { ArrowLeft, CheckCheck, Printer, Trees } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import logo from "../assets/logo.png";
import { Loading } from "../components/ui/States";
import { useSeo } from "../hooks/useSeo";
import { badgeQrUrl } from "../services/api";
import { coordApi, type BadgePrintList, type PrintBadge } from "../services/coordination";
import { apiErrorMessage } from "../utils/errors";

/** Mise en page d'impression : badges au format A6 (10,5 × 14,8 cm), quatre par feuille A4, traits de coupe légers. */
const PRINT_CSS = `
@page { size: A4 portrait; margin: 0; }
@media print {
  .no-print { display: none !important; }
  body { background: #fff !important; }
  .sheet { margin: 0 !important; box-shadow: none !important; break-after: page; }
  .sheet:last-child { break-after: auto; }
}
.sheet { width: 210mm; height: 297mm; display: grid; grid-template-columns: 105mm 105mm; grid-template-rows: 148.5mm 148.5mm;
  background: #fff; margin: 0 auto 12mm; box-shadow: 0 2px 12px rgb(14 34 64 / .15); -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.cell { border: 0.2mm dashed #c9ced6; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.badge { width: 97mm; height: 140mm; display: flex; flex-direction: column; overflow: hidden; border-radius: 3mm; }
`;

function Badge({ b, event }: { b: PrintBadge; event: BadgePrintList["event"] }) {
  const long = b.name.length > 24;
  return (
    <div className="badge border border-navy/15">
      <div className="flex h-[17mm] items-center justify-center bg-white px-[5mm]">
        <img src={logo} alt="Urban Hub Connect" className="h-[11mm] w-auto" />
      </div>
      <div className="border-b-[1.2mm] border-gold bg-navy px-[5mm] py-[3.5mm] text-center text-white">
        <p className="font-heading text-[5.2mm] font-extrabold uppercase leading-tight tracking-wide">{event.title.replace(/\s+\d{4}$/, "")}</p>
        {event.dates && <p className="mt-[1mm] text-[3.4mm] font-semibold text-gold-light">{event.dates}</p>}
        {event.location && <p className="text-[3mm] text-white/80">{event.location}</p>}
      </div>
      <div className="flex flex-1 flex-col items-center px-[5mm] pt-[5mm] text-center text-navy">
        <p className={`font-heading font-extrabold leading-tight ${long ? "text-[6mm]" : "text-[7mm]"}`}>{b.name}</p>
        {b.job_title && <p className="mt-[1.5mm] text-[3.8mm] leading-snug">{b.job_title}</p>}
        {b.organization && <p className="mt-[1.5mm] text-[4.2mm] font-bold leading-snug">{b.organization}</p>}
        <img src={badgeQrUrl(b.token)} alt="" className="mt-auto h-[38mm] w-[38mm]" />
        <div className="mb-[3mm] mt-[2mm] flex w-full items-center justify-between text-[2.8mm] text-navy/60">
          <span>N° {String(b.number).padStart(4, "0")}</span>
          {b.planting && <span className="inline-flex items-center gap-[1mm] font-semibold text-green"><Trees className="h-[3mm] w-[3mm]" aria-hidden />Reboisement</span>}
        </div>
      </div>
    </div>
  );
}

const chunk = <T,>(items: T[], size: number) => Array.from({ length: Math.ceil(items.length / size) }, (_, i) => items.slice(i * size, i * size + size));

/** Badges à imprimer pour le jour J : même QR code que celui envoyé à chaque inscrit, triés par numéro d'inscription. */
export default function BadgePrint() {
  useSeo("Badges à imprimer", "Espace Coordination.", undefined, true);
  const [params] = useSearchParams();
  const onlyNew = params.get("nouveaux") === "1";
  const [data, setData] = useState<BadgePrintList | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    coordApi.csrf().then(() => coordApi.badgesPrint(onlyNew)).then(setData)
      .catch((e) => setError([401, 403].includes(e?.response?.status) ? "Connectez-vous d'abord à l'Espace Coordination." : apiErrorMessage(e)));
  }, [onlyNew]);

  const markPrinted = async () => {
    if (!data || !window.confirm(`Marquer ces ${data.badges.length} badges comme imprimés ? Ils ne figureront plus dans « nouveaux badges ».`)) return;
    setBusy(true);
    try { setNotice(await coordApi.badgesPrinted(data.badges.map((b) => b.id))); }
    catch (e) { setNotice(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };

  if (error) return (
    <div className="mx-auto max-w-lg p-8 text-center">
      <p role="alert" className="rounded-xl border border-red-300 bg-red-50 p-4 font-semibold text-red-900">{error}</p>
      <Link to="/coordination" className="mt-4 inline-block font-semibold text-green underline">Espace Coordination</Link>
    </div>);
  if (!data) return <Loading />;

  const first = data.badges[0]?.number, last = data.badges[data.badges.length - 1]?.number;
  return (
    <div className="min-h-screen bg-offwhite pb-10">
      <style>{PRINT_CSS}</style>
      <div className="no-print sticky top-0 z-10 border-b border-navy/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <Link to="/coordination" className="inline-flex items-center gap-1 text-sm font-semibold text-green"><ArrowLeft className="h-4 w-4" aria-hidden />Espace Coordination</Link>
            <h1 className="text-xl">{onlyNew ? "Nouveaux badges" : "Tous les badges"} : {data.badges.length}
              {!!data.badges.length && <span className="font-normal text-navy/60"> (n° {first} à {last})</span>}</h1>
            <p className="text-sm text-navy/60">Format A6, 4 badges par feuille A4. Dans la fenêtre d'impression : échelle 100 %, marges « aucune ».</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => window.print()} disabled={!data.badges.length}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-green px-5 font-semibold text-white hover:bg-green-2 disabled:opacity-50"><Printer className="h-4 w-4" aria-hidden />Imprimer</button>
            {!!data.badges.length && (
              <button onClick={markPrinted} disabled={busy}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-navy/20 bg-white px-5 font-semibold hover:bg-offwhite disabled:opacity-50"><CheckCheck className="h-4 w-4" aria-hidden />Marquer comme imprimés</button>)}
          </div>
        </div>
        {notice && <p role="status" className="mx-auto max-w-5xl px-4 pb-3 font-semibold text-green">{notice}</p>}
      </div>
      {!data.badges.length
        ? <p className="mx-auto mt-10 max-w-lg text-center text-navy/70">Aucun badge à imprimer{onlyNew ? " : tous les badges ont déjà été imprimés." : "."}</p>
        : <div className="mt-6 overflow-x-auto">{chunk(data.badges, 4).map((page, i) => (
            <div key={i} className="sheet">{page.map((b) => <div key={b.id} className="cell"><Badge b={b} event={data.event} /></div>)}</div>))}
          </div>}
    </div>
  );
}
