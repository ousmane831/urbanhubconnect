import { Download, ImagePlus, Move, RotateCcw, Share2, ShieldCheck, Trash2, UserRound, ZoomIn } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import { useSearchParams } from "react-router-dom";
import logoSrc from "../assets/logo.png";
import { Container } from "../components/ui/Container";
import { clampPhoto, draw, FORMATS, loadFonts, W, type Format, type PhotoState } from "../features/events/jySeraiCanvas";
import { useSeo } from "../hooks/useSeo";
import { getBadge } from "../services/api";

const DEFAULT_EVENT = { dates: "11 et 12 décembre 2026", location: "The Ground, Diamniadio" };
const ACCEPTED = ["image/jpeg", "image/png"];
const fileName = (f: Format) => `jy-serai-grand-week-end-du-pole${f === "story" ? "-story" : ""}.png`;

const loadImage = (src: string) => new Promise<HTMLImageElement>((ok, ko) => {
  const img = new Image(); img.onload = () => ok(img); img.onerror = ko; img.src = src;
});

/** « J'y serai ! » : chacun ajoute (ou non) son portrait et obtient un visuel à partager. Tout se passe dans le navigateur :
 *  le portrait n'est envoyé nulle part. Avec le lien personnel du badge (?badge=<code>&cle=<clé>), la personne peut
 *  reprendre son nom d'un clic ; rien n'est prérempli sans son action, et un lien sans clé n'expose aucune donnée. */
export default function JySerai() {
  useSeo("J'y serai ! – Grand Week-End du Pôle", "Créez votre visuel « J'y serai ! » pour le Grand Week-End du Pôle et partagez-le sur vos réseaux.");
  const [params] = useSearchParams();
  const canvas = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const [logo, setLogo] = useState<HTMLImageElement | null>(null);
  const [photo, setPhoto] = useState<PhotoState | null>(null);
  const [name, setName] = useState("");
  const [detail, setDetail] = useState("");
  const [format, setFormat] = useState<Format>("post");
  const [mine, setMine] = useState<{ name: string; detail: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [canShare, setCanShare] = useState(false);

  useEffect(() => {
    loadFonts().then(() => setReady(true));
    loadImage(logoSrc).then(setLogo).catch(() => undefined);
    setCanShare(typeof navigator !== "undefined" && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [new File([""], fileName("post"), { type: "image/png" })] }));
  }, []);

  // Lien personnel du badge : on propose (sans l'appliquer) de reprendre le nom de l'inscription confirmée
  const token = params.get("badge"), key = params.get("cle");
  useEffect(() => {
    if (!token || !key) return;
    getBadge(token, key).then((b) => {
      if (b.owner && b.confirmed) setMine({ name: b.name, detail: [b.job_title, b.organization].filter(Boolean).join(" · ") });
    }).catch(() => undefined);
  }, [token, key]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && ready) draw(ctx, { logo, photo, name, detail, format, ...DEFAULT_EVENT });
  }, [logo, photo, name, detail, format, ready]);

  const pick = async (file?: File) => {
    setError("");
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      return setError("Ce format n'est pas pris en charge. Choisissez une photo JPG ou PNG (sur iPhone : Réglages › Appareil photo › Formats › « Le plus compatible », ou faites une capture d'écran de la photo).");
    }
    try { setPhoto({ img: await loadImage(URL.createObjectURL(file)), zoom: 1, x: 0, y: 0 }); }
    catch { setError("Cette image ne peut pas être ouverte. Essayez une autre photo JPG ou PNG."); }
  };

  // Déplacement de la photo au doigt ou à la souris (coordonnées ramenées à l'échelle du visuel)
  const scale = () => W / (canvas.current?.getBoundingClientRect().width || W);
  const down = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!photo) return;
    e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY };
  };
  const move = (e: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current || !photo) return;
    const k = scale(), dx = (e.clientX - drag.current.x) * k, dy = (e.clientY - drag.current.y) * k;
    drag.current = { x: e.clientX, y: e.clientY };
    setPhoto((p) => p && clampPhoto({ ...p, x: p.x + dx, y: p.y + dy }));
  };
  const up = () => { drag.current = null; };

  const blob = useCallback(() => new Promise<Blob | null>((ok) => {
    if (canvas.current) canvas.current.toBlob(ok, "image/png"); else ok(null);
  }), []);
  const download = async () => {
    const b = await blob(); if (!b) return;
    const a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fileName(format); a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  const share = async () => {
    const b = await blob(); if (!b) return;
    try {
      await navigator.share({ files: [new File([b], fileName(format), { type: "image/png" })], title: "J'y serai !",
        text: "J'y serai au Grand Week-End du Pôle, les 11 et 12 décembre 2026 à The Ground, à Diamniadio ! urbanhubconnect.com" });
    } catch { /* partage annulé : rien à faire */ }
  };

  const btn = "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-navy/20 px-4 text-sm font-semibold hover:bg-offwhite";
  return (
    <div className="bg-offwhite py-8 sm:py-14">
      <Container className="max-w-5xl">
        <header className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-green">Grand Week-End du Pôle</p>
          <h1 className="mt-2 text-3xl sm:text-4xl">Créez votre visuel « J'y serai ! »</h1>
          <p className="mt-3 text-navy/75">Ajoutez votre portrait si vous le souhaitez, choisissez le nom à afficher, puis téléchargez l'image et partagez-la vous-même sur WhatsApp ou vos réseaux.</p>
        </header>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
          <div className="mx-auto w-full max-w-[26rem]">
            <canvas ref={canvas} width={W} height={FORMATS[format].h} role="img" aria-label="Aperçu de votre visuel « J'y serai ! »"
              onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
              className={`h-auto w-full touch-none rounded-2xl bg-offwhite shadow-lift ${photo ? "cursor-grab active:cursor-grabbing" : ""}`} />
            {photo && <p className="mt-2 flex items-center justify-center gap-1.5 text-sm text-navy/65"><Move className="h-4 w-4" aria-hidden />Faites glisser la photo pour la cadrer.</p>}
          </div>

          <div className="card space-y-6 p-5 sm:p-7">
            <div>
              <p className="mb-2 font-semibold">1. Votre portrait <span className="font-normal text-navy/60">(facultatif)</span></p>
              <label className="flex min-h-[52px] cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-green/40 bg-green/5 px-4 font-semibold text-green hover:bg-green/10">
                <ImagePlus className="h-5 w-5" aria-hidden />{photo ? "Changer de photo" : "Ajouter votre photo (JPG ou PNG)"}
                <input type="file" accept="image/jpeg,image/png" className="sr-only" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {error && <p role="alert" className="mt-2 text-sm font-semibold text-red-800">{error}</p>}
              {!photo && <p className="mt-2 text-sm text-navy/60">Sans photo, le logo du réseau apparaît à sa place.</p>}
              {photo && (
                <>
                  <label className="mt-4 block">
                    <span className="mb-1 flex items-center gap-1.5 text-sm font-semibold"><ZoomIn className="h-4 w-4" aria-hidden />Zoom</span>
                    <input type="range" min={1} max={3} step={0.01} value={photo.zoom} className="w-full accent-green"
                      onChange={(e) => setPhoto((p) => p && clampPhoto({ ...p, zoom: Number(e.target.value) }))} />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btn} onClick={() => setPhoto((p) => p && { ...p, zoom: 1, x: 0, y: 0 })}>
                      <RotateCcw className="h-4 w-4" aria-hidden />Réinitialiser le cadrage</button>
                    <button type="button" className={btn} onClick={() => setPhoto(null)}>
                      <Trash2 className="h-4 w-4" aria-hidden />Retirer la photo</button>
                  </div>
                </>)}
            </div>

            <div className="space-y-4">
              <p className="font-semibold">2. Le nom affiché <span className="font-normal text-navy/60">(facultatif)</span></p>
              {mine && (name !== mine.name || detail !== mine.detail) && (
                <button type="button" className={`${btn} w-full`} onClick={() => { setName(mine.name); setDetail(mine.detail); }}>
                  <UserRound className="h-4 w-4" aria-hidden />Reprendre le nom de mon inscription</button>)}
              <div><label htmlFor="js-name" className="mb-1.5 block text-sm font-semibold">Nom à afficher</label>
                <input id="js-name" className="field" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label htmlFor="js-detail" className="mb-1.5 block text-sm font-semibold">Fonction · organisation</label>
                <input id="js-detail" className="field" maxLength={60} value={detail} onChange={(e) => setDetail(e.target.value)} /></div>
            </div>

            <fieldset>
              <legend className="mb-2 font-semibold">3. Le format</legend>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(FORMATS) as Format[]).map((f) => (
                  <label key={f} className={`cursor-pointer rounded-lg border-2 p-3 text-center text-sm ${format === f ? "border-green bg-green/5" : "border-navy/15"}`}>
                    <input type="radio" name="format" value={f} checked={format === f} onChange={() => setFormat(f)} className="sr-only" />
                    <span className="block font-semibold">{FORMATS[f].label}</span>
                    <span className="block text-navy/60">{FORMATS[f].size} px</span>
                  </label>))}
              </div>
            </fieldset>

            <div>
              <p className="mb-2 font-semibold">4. Téléchargez ou partagez</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <button type="button" onClick={download}
                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg bg-green px-5 font-semibold text-white hover:bg-green-2">
                  <Download className="h-5 w-5" aria-hidden />Télécharger mon visuel</button>
                {canShare && (
                  <button type="button" onClick={share} className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-lg border border-navy/20 px-5 font-semibold hover:bg-offwhite">
                    <Share2 className="h-5 w-5" aria-hidden />Partager</button>)}
              </div>
              <p className="mt-3 text-center text-sm font-semibold text-navy/70">Visuel de communication. Ne vaut pas badge d'accès.</p>
            </div>

            <p className="flex items-start gap-2 rounded-lg bg-offwhite p-3 text-sm text-navy/70">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-green" aria-hidden />
              Votre photo reste sur votre appareil : elle n'est envoyée nulle part, ni à Urban Hub Connect ni à personne d'autre. Rien n'est publié automatiquement.</p>
          </div>
        </div>
      </Container>
    </div>
  );
}
