/** Visuel « J'y serai ! » du Grand Week-End (1080 × 1350, format portrait des réseaux sociaux), dessiné dans le navigateur :
 *  la photo de la personne ne quitte jamais son téléphone. */
export const W = 1080;
export const H = 1350;
export const PHOTO = { cx: W / 2, cy: 685, r: 225 };

const NAVY = "#0E2240", NAVY_2 = "#16305A", GOLD = "#C39A3E", GOLD_LIGHT = "#E2C27A", WHITE = "#FFFFFF";
const HEAD = "Montserrat, system-ui, sans-serif", BODY = "Inter, system-ui, sans-serif";

export interface PhotoState { img: HTMLImageElement; zoom: number; x: number; y: number }
export interface Visual {
  logo: HTMLImageElement | null; photo: PhotoState | null;
  name: string; detail: string; dates: string; location: string;
}

/** Fontes chargées avant de dessiner (sinon le canevas prend la police système). */
export const loadFonts = () => Promise.all([
  `800 100px Montserrat`, `700 40px Montserrat`, `600 30px Inter`, `400 30px Inter`,
].map((f) => document.fonts?.load(f).catch(() => undefined)));

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

/** Texte centré, réduit jusqu'à tenir dans la largeur donnée. */
function centered(ctx: CanvasRenderingContext2D, text: string, y: number, font: (size: number) => string, size: number, maxW: number, color: string) {
  let s = size;
  ctx.font = font(s);
  while (s > 18 && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(s); }
  ctx.fillStyle = color; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
  ctx.fillText(text, W / 2, y);
}

function hexGrid(ctx: CanvasRenderingContext2D) {
  const r = 46, h = Math.sqrt(3) * r;
  ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.045)"; ctx.lineWidth = 2;
  for (let row = -1; row * h < H + h; row++) for (let col = -1; col * 1.5 * r < W + r; col++) {
    const cx = col * 1.5 * r, cy = row * h + (col % 2 ? h / 2 : 0);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 3) * i; ctx[i ? "lineTo" : "moveTo"](cx + r * Math.cos(a), cy + r * Math.sin(a)); }
    ctx.closePath(); ctx.stroke();
  }
  ctx.restore();
}

/** Échelle minimale pour que la photo couvre tout le cercle. */
export const coverScale = (img: HTMLImageElement) => (2 * PHOTO.r) / Math.min(img.naturalWidth, img.naturalHeight);

/** Garde la photo dans le cercle : impossible de faire apparaître un bord vide en la déplaçant. */
export function clampPhoto(p: PhotoState): PhotoState {
  const s = coverScale(p.img) * p.zoom;
  const mx = Math.max(0, (p.img.naturalWidth * s) / 2 - PHOTO.r), my = Math.max(0, (p.img.naturalHeight * s) / 2 - PHOTO.r);
  return { ...p, x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
}

function photo(ctx: CanvasRenderingContext2D, p: PhotoState | null) {
  const { cx, cy, r } = PHOTO;
  // Halo et anneaux dorés
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)"; ctx.shadowBlur = 40; ctx.shadowOffsetY = 12;
  ctx.beginPath(); ctx.arc(cx, cy, r + 18, 0, Math.PI * 2); ctx.fillStyle = GOLD; ctx.fill();
  ctx.restore();
  ctx.beginPath(); ctx.arc(cx, cy, r + 8, 0, Math.PI * 2); ctx.fillStyle = WHITE; ctx.fill();

  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
  if (p) {
    const s = coverScale(p.img) * p.zoom, w = p.img.naturalWidth * s, h = p.img.naturalHeight * s;
    ctx.drawImage(p.img, cx - w / 2 + p.x, cy - h / 2 + p.y, w, h);
  } else {
    // Emplacement vide : silhouette discrète
    ctx.fillStyle = NAVY_2; ctx.fillRect(cx - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.beginPath(); ctx.arc(cx, cy - 55, 78, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx, cy + 165, 150, 120, 0, Math.PI, 0); ctx.fill();
  }
  ctx.restore();
}

export function draw(ctx: CanvasRenderingContext2D, v: Visual) {
  ctx.clearRect(0, 0, W, H);
  // Fond bleu nuit, léger dégradé et motif hexagonal du réseau
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, NAVY_2); bg.addColorStop(1, NAVY);
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  hexGrid(ctx);
  // Lueur dorée derrière la photo
  const glow = ctx.createRadialGradient(PHOTO.cx, PHOTO.cy, PHOTO.r * 0.6, PHOTO.cx, PHOTO.cy, PHOTO.r * 2.1);
  glow.addColorStop(0, "rgba(195,154,62,0.28)"); glow.addColorStop(1, "rgba(195,154,62,0)");
  ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
  // Filets dorés en haut et en bas
  ctx.fillStyle = GOLD; ctx.fillRect(0, 0, W, 12); ctx.fillRect(0, H - 12, W, 12);

  // Logo sur cartouche blanc
  if (v.logo) {
    const lh = 96, lw = Math.min(360, (v.logo.naturalWidth / v.logo.naturalHeight) * lh);
    roundRect(ctx, 60, 50, lw + 48, lh + 28, 20); ctx.fillStyle = WHITE; ctx.fill();
    ctx.drawImage(v.logo, 84, 64, lw, lh);
  }
  // Pastille de date : « 11-12 » en grand, « DÉC. 2026 » dessous
  if (v.dates) {
    const m = v.dates.match(/^(\d{1,2})(?:\s+(?:et|au)\s+(\d{1,2}))?\s+(\S+)\s+(\d{4})$/i);
    const big = m ? (m[2] ? `${m[1]}-${m[2]}` : m[1]) : "";
    const small = m ? `${m[3].slice(0, 3).toUpperCase()}${m[3].length > 3 ? "." : ""} ${m[4]}` : "";
    if (big) {
      const bw = 190, bx = W - 60 - bw;
      roundRect(ctx, bx, 50, bw, 124, 20); ctx.fillStyle = GOLD; ctx.fill();
      ctx.fillStyle = NAVY; ctx.textAlign = "center";
      ctx.font = `800 54px ${HEAD}`; ctx.fillText(big, bx + bw / 2, 112);
      ctx.font = `700 26px ${HEAD}`; ctx.fillText(small, bx + bw / 2, 152);
    }
  }

  // Titre
  ctx.save(); ctx.shadowColor = "rgba(0,0,0,0.3)"; ctx.shadowBlur = 18; ctx.shadowOffsetY = 6;
  centered(ctx, "J'Y SERAI !", 340, (s) => `800 ${s}px ${HEAD}`, 150, 940, WHITE);
  ctx.restore();
  centered(ctx, "au Grand Week-End du Pôle", 400, (s) => `700 ${s}px ${HEAD}`, 42, 900, GOLD_LIGHT);

  photo(ctx, v.photo);

  // Nom et fonction / organisation
  const name = v.name.trim() || "Votre nom";
  centered(ctx, name, 1005, (s) => `800 ${s}px ${HEAD}`, 60, 940, v.name.trim() ? WHITE : "rgba(255,255,255,0.45)");
  if (v.detail.trim()) centered(ctx, v.detail.trim(), 1054, (s) => `600 ${s}px ${BODY}`, 32, 940, GOLD_LIGHT);

  // Bandeau du lieu
  roundRect(ctx, 90, 1100, W - 180, 140, 28);
  ctx.fillStyle = "rgba(255,255,255,0.08)"; ctx.fill();
  ctx.strokeStyle = "rgba(226,194,122,0.55)"; ctx.lineWidth = 2; ctx.stroke();
  centered(ctx, v.dates ? `Les ${v.dates}` : "Grand Week-End du Pôle", 1162, (s) => `700 ${s}px ${HEAD}`, 40, W - 260, WHITE);
  if (v.location) centered(ctx, v.location, 1212, (s) => `400 ${s}px ${BODY}`, 32, W - 260, "rgba(255,255,255,0.8)");

  centered(ctx, "urbanhubconnect.com", 1300, (s) => `600 ${s}px ${BODY}`, 28, 900, "rgba(255,255,255,0.6)");
}
