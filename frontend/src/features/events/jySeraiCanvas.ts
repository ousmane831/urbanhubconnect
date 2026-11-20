/** Visuel « J'y serai ! » du Grand Week-End (1080 × 1350, format portrait des réseaux sociaux), dessiné dans le navigateur :
 *  la photo de la personne ne quitte jamais son téléphone.
 *  Parti pris : fond crème uni, aplats de couleur de l'identité (bleu nuit, vert, or), grande photo en arche,
 *  pastille-sticker pour la date et bandeau d'informations en pied, sans dégradé. */
export const W = 1080;
export const H = 1350;
/** Formats d'export : publication (1080 × 1350) et story ou statut (1080 × 1920). */
export const FORMATS = {
  post: { h: 1350, label: "Publication", size: "1080 × 1350" },
  story: { h: 1920, label: "Story ou statut", size: "1080 × 1920" },
} as const;
export type Format = keyof typeof FORMATS;
/** Cadre de la photo (arche : haut en demi-cercle). */
export const PHOTO = { x: 250, y: 452, w: 580, h: 590 };

const NAVY = "#0E2240", GREEN = "#1E5C3F", GOLD = "#C39A3E", GOLD_LIGHT = "#E2C27A", CREAM = "#F7F3EA", WHITE = "#FFFFFF";
const HEAD = "Montserrat, system-ui, sans-serif", BODY = "Inter, system-ui, sans-serif";

export interface PhotoState { img: HTMLImageElement; zoom: number; x: number; y: number }
export interface Visual {
  logo: HTMLImageElement | null; photo: PhotoState | null;
  name: string; detail: string; dates: string; location: string; format?: Format;
}

/** Fontes chargées avant de dessiner (sinon le canevas prend la police système). */
export const loadFonts = () => Promise.all([
  `800 100px Montserrat`, `700 40px Montserrat`, `600 30px Inter`, `400 30px Inter`,
].map((f) => document.fonts?.load(f).catch(() => undefined)));

type Ctx = CanvasRenderingContext2D & { letterSpacing?: string };

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Arche : rectangle dont le haut est un demi-cercle, bas légèrement arrondi. */
function arch(ctx: Ctx, x: number, y: number, w: number, h: number) {
  const r = w / 2, b = 28;
  ctx.beginPath();
  ctx.moveTo(x, y + r);
  ctx.arc(x + r, y + r, r, Math.PI, 0);
  ctx.lineTo(x + w, y + h - b); ctx.arcTo(x + w, y + h, x + w - b, y + h, b);
  ctx.lineTo(x + b, y + h); ctx.arcTo(x, y + h, x, y + h - b, b);
  ctx.closePath();
}

/** Texte réduit jusqu'à tenir dans la largeur donnée ; retourne la taille retenue. */
function fit(ctx: Ctx, text: string, font: (s: number) => string, size: number, maxW: number) {
  let s = size;
  ctx.font = font(s);
  while (s > 16 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(s); }
  return s;
}

function text(ctx: Ctx, t: string, x: number, y: number, font: (s: number) => string, size: number, maxW: number, color: string,
  align: CanvasTextAlign = "center", spacing = 0) {
  ctx.save();
  ctx.letterSpacing = `${spacing}px`;
  fit(ctx, t, font, size, maxW);
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = "alphabetic";
  ctx.fillText(t, x, y);
  ctx.restore();
}

/** Échelle minimale pour que la photo couvre tout le cadre. */
export const coverScale = (img: HTMLImageElement) => Math.max(PHOTO.w / img.naturalWidth, PHOTO.h / img.naturalHeight);

/** Garde la photo dans le cadre : impossible de faire apparaître un bord vide en la déplaçant. */
export function clampPhoto(p: PhotoState): PhotoState {
  const s = coverScale(p.img) * p.zoom;
  const mx = Math.max(0, (p.img.naturalWidth * s - PHOTO.w) / 2), my = Math.max(0, (p.img.naturalHeight * s - PHOTO.h) / 2);
  return { ...p, x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
}

function photo(ctx: Ctx, p: PhotoState | null, logo: HTMLImageElement | null) {
  const { x, y, w, h } = PHOTO;
  // Aplat vert décalé derrière la photo et filet doré décalé de l'autre côté : profondeur sans ombre ni dégradé
  arch(ctx, x + 26, y + 26, w, h); ctx.fillStyle = GREEN; ctx.fill();
  arch(ctx, x - 22, y - 22, w, h); ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.stroke();

  ctx.save();
  arch(ctx, x, y, w, h); ctx.clip();
  if (p) {
    const s = coverScale(p.img) * p.zoom, iw = p.img.naturalWidth * s, ih = p.img.naturalHeight * s;
    ctx.drawImage(p.img, x + (w - iw) / 2 + p.x, y + (h - ih) / 2 + p.y, iw, ih);
  } else {
    // Version sans photo : le logo du réseau sur fond blanc
    ctx.fillStyle = WHITE; ctx.fillRect(x, y, w, h);
    if (logo) {
      const lw = w - 120, lh = (logo.naturalHeight / logo.naturalWidth) * lw;
      ctx.drawImage(logo, x + 60, y + (h - lh) / 2 + 30, lw, lh);
    }
  }
  ctx.restore();
}

/** « 11-12 » + « DÉC. 2026 » à partir de « 11 et 12 décembre 2026 ». */
function dateParts(dates: string) {
  const m = dates.match(/^(\d{1,2})(?:\s+(?:et|au)\s+(\d{1,2}))?\s+(\S+)\s+(\d{4})$/i);
  if (!m) return null;
  return { days: m[2] ? `${m[1]}-${m[2]}` : m[1], month: `${m[3].slice(0, 3).toUpperCase()}${m[3].length > 3 ? "." : ""}`, year: m[4] };
}

/** Pastille ronde inclinée, façon sticker. */
function sticker(ctx: Ctx, cx: number, cy: number, d: { days: string; month: string; year: string }) {
  ctx.save();
  ctx.translate(cx, cy); ctx.rotate(-0.16);
  ctx.beginPath(); ctx.arc(0, 0, 112, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 0, 98, 0, Math.PI * 2); ctx.strokeStyle = "rgba(14,34,64,0.35)"; ctx.lineWidth = 2; ctx.setLineDash([6, 6]); ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = NAVY; ctx.textAlign = "center";
  fit(ctx, d.days, (s) => `800 ${s}px ${HEAD}`, 62, 170); ctx.fillText(d.days, 0, 8);
  ctx.font = `700 26px ${HEAD}`; ctx.fillText(`${d.month} ${d.year}`, 0, 48);
  ctx.restore();
}

function pin(ctx: Ctx, x: number, y: number, color: string) {
  ctx.save(); ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, 15, Math.PI, 0); ctx.lineTo(x, y + 30); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fillStyle = NAVY; ctx.fill();
  ctx.restore();
}

export function draw(context: CanvasRenderingContext2D, v: Visual) {
  const ctx = context as Ctx;
  const story = v.format === "story", H = FORMATS[v.format ?? "post"].h;
  // Story : en-tête et bandeau éloignés des bords (barres des applications), contenu centré entre les deux
  const hy = story ? 150 : 0, bandY = story ? H - 320 : 1200, dy = story ? (hy + bandY - 1200) / 2 : 0;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = CREAM; ctx.fillRect(0, 0, W, H);

  // Formes de l'identité : quart de cercle vert en haut à droite, petit disque or, arc fin bleu nuit à gauche
  ctx.beginPath(); ctx.arc(W, 0, 232 + hy, Math.PI / 2, Math.PI); ctx.lineTo(W, 0); ctx.closePath(); ctx.fillStyle = GREEN; ctx.fill();
  ctx.beginPath(); ctx.arc(W - 232 - hy, 22, 16, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  ctx.beginPath(); ctx.arc(0, 760 + dy, 170, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.stroke();
  ctx.beginPath(); ctx.arc(0, 760 + dy, 130, -Math.PI / 2, Math.PI / 2); ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.stroke();

  ctx.save(); ctx.translate(0, hy);
  // En-tête : logo, mention de l'édition
  if (v.logo) {
    // Cartouche blanc assumé (le logo a un fond blanc)
    const lh = 88, lw = Math.min(340, (v.logo.naturalWidth / v.logo.naturalHeight) * lh);
    roundRect(ctx, 60, 52, lw + 40, lh + 28, 18); ctx.fillStyle = WHITE; ctx.fill();
    ctx.strokeStyle = "rgba(14,34,64,0.08)"; ctx.lineWidth = 2; ctx.stroke();
    ctx.drawImage(v.logo, 80, 66, lw, lh);
  }
  text(ctx, "ÉDITION", W - 58, 90, (s) => `700 ${s}px ${HEAD}`, 22, 220, GOLD_LIGHT, "right", 4);
  text(ctx, "2026", W - 58, 140, (s) => `800 ${s}px ${HEAD}`, 48, 220, WHITE, "right", 2);
  ctx.restore();

  ctx.save(); ctx.translate(0, dy);
  // Titre : « J'Y SERAI » bleu nuit, « ! » or
  const size = fit(ctx, "J'Y SERAI !", (s) => `800 ${s}px ${HEAD}`, 150, 880);
  ctx.font = `800 ${size}px ${HEAD}`;
  const main = "J'Y SERAI ", bang = "!";
  const total = ctx.measureText(main + bang).width, x0 = (W - total) / 2;
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  ctx.fillStyle = NAVY; ctx.fillText(main, x0, 338);
  ctx.fillStyle = GOLD; ctx.fillText(bang, x0 + ctx.measureText(main).width, 338);
  // Sous-titre encadré de filets
  ctx.font = `700 28px ${HEAD}`;
  const sub = "AU GRAND WEEK-END DU PÔLE";
  ctx.save(); ctx.letterSpacing = "5px"; const sw = ctx.measureText(sub).width; ctx.restore();
  text(ctx, sub, W / 2, 396, (s) => `700 ${s}px ${HEAD}`, 28, 820, GREEN, "center", 5);
  ctx.fillStyle = GOLD; ctx.fillRect(W / 2 - sw / 2 - 74, 386, 50, 3); ctx.fillRect(W / 2 + sw / 2 + 24, 386, 50, 3);

  photo(ctx, v.photo, v.logo);
  const d = dateParts(v.dates);
  if (d) sticker(ctx, PHOTO.x + PHOTO.w - 6, PHOTO.y + 96, d);

  // Nom et fonction : facultatifs, choisis par la personne (rien n'est écrit si le champ est vide)
  if (v.name.trim()) text(ctx, v.name.trim(), W / 2, 1122, (s) => `800 ${s}px ${HEAD}`, 58, 920, NAVY);
  if (v.detail.trim()) text(ctx, v.detail.trim(), W / 2, v.name.trim() ? 1164 : 1130, (s) => `600 ${s}px ${BODY}`, 30, 920, GREEN);
  ctx.restore();

  // Bandeau d'informations (ancré en bas)
  ctx.fillStyle = NAVY; ctx.fillRect(0, bandY, W, H - bandY);
  ctx.fillStyle = GOLD; ctx.fillRect(0, bandY, W, 6);
  ctx.save(); ctx.translate(0, bandY - 1200);
  pin(ctx, 92, 1262, GOLD);
  // Lieu de l'événement, tel que demandé par la Coordination
  text(ctx, "The GROUND Dakar Diamniadio", 128, 1278, (s) => `800 ${s}px ${HEAD}`, 36, 560, WHITE, "left");
  text(ctx, d ? `${v.dates.replace(/\s+\d{4}$/, "")} ${d.year}` : "Pôle urbain de Diamniadio", 128, 1318, (s) => `600 ${s}px ${BODY}`, 26, 560, "rgba(255,255,255,0.75)", "left");
  text(ctx, "urbanhubconnect.com", W - 70, 1300, (s) => `700 ${s}px ${HEAD}`, 26, 340, GOLD_LIGHT, "right");
  ctx.restore();
}
