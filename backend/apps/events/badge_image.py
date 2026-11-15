"""Image du badge du Grand Week-End (PNG), dessinée sur le serveur.

C'est la même image partout : jointe à l'e-mail d'inscription, affichée sur la page « Mon badge » et imprimée par la
Coordination (format A6 ; 97 × 140 mm de surface utile). Polices : Montserrat et Inter (licence SIL Open Font),
copiées dans badge_assets/ avec le logo.
"""
import io
from functools import lru_cache
from pathlib import Path

import segno
from PIL import Image, ImageDraw, ImageFont

ASSETS = Path(__file__).resolve().parent / "badge_assets"
MM = 10  # pixels par millimètre (≈ 254 dpi) : net à l'impression, léger dans un e-mail
W, H = 97 * MM, 140 * MM
NAVY, GOLD, GOLD_LIGHT, GREEN = (14, 34, 64), (195, 154, 62), (226, 194, 122), (30, 92, 63)
GREY = (110, 122, 140)


@lru_cache(maxsize=None)
def font(name, size_mm):
    files = {"title": "montserrat-latin-800-normal.woff", "bold": "montserrat-latin-700-normal.woff",
             "text": "inter-latin-400-normal.woff", "semibold": "inter-latin-600-normal.woff"}
    return ImageFont.truetype(str(ASSETS / files[name]), round(size_mm * MM))


@lru_cache(maxsize=1)
def logo():
    im = Image.open(ASSETS / "logo.png").convert("RGBA")
    h = 11 * MM
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def _wrap(draw, text, f, max_w):
    words, lines, line = text.split(), [], ""
    for word in words:
        candidate = f"{line} {word}".strip()
        if draw.textlength(candidate, font=f) <= max_w or not line:
            line = candidate
        else:
            lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def _centered(draw, y, text, f, fill, max_w, line_gap=1.15, max_lines=2):
    """Texte centré sur plusieurs lignes ; réduit la police si le texte reste trop long. Retourne le y suivant."""
    size = f.size
    while True:
        lines = _wrap(draw, text, f, max_w)
        if len(lines) <= max_lines or f.size <= size * 0.7:
            break
        f = f.font_variant(size=round(f.size * 0.92))
    for line in lines[:max_lines]:
        draw.text((W / 2, y), line, font=f, fill=fill, anchor="ma")
        y += round(f.size * line_gap)
    return y


def render(*, name, job_title="", organization="", number=None, planting=False, event_title="", dates="", location="", qr_data=""):
    img = Image.new("RGB", (W, H), "white")
    d = ImageDraw.Draw(img)
    inner = W - 10 * MM

    # Logo sur fond blanc
    lg = logo()
    img.paste(lg, ((W - lg.width) // 2, (17 * MM - lg.height) // 2), lg)

    # Bandeau de l'événement (hauteur selon le texte), filet doré
    top = 17 * MM
    band = Image.new("RGB", (W, 60 * MM), NAVY)
    bd = ImageDraw.Draw(band)
    y = round(3.5 * MM)
    y = _centered_on(bd, y, (event_title or "Grand Week-End du Pôle").upper(), font("title", 5.2), "white", inner)
    if dates:
        y += round(0.6 * MM)
        bd.text((W / 2, y), dates, font=font("semibold", 3.4), fill=GOLD_LIGHT, anchor="ma")
        y += round(3.4 * MM * 1.3)
    if location:
        y = _centered(bd, y, location, font("text", 3.0), (207, 214, 224), inner, line_gap=1.3)
    y += round(3.0 * MM)
    img.paste(band.crop((0, 0, W, y)), (0, top))
    top += y
    d.rectangle((0, top, W, top + round(1.2 * MM)), fill=GOLD)
    top += round(1.2 * MM)

    # Identité
    y = top + 6 * MM
    y = _centered(d, y, name, font("title", 7 if len(name) <= 24 else 6), NAVY, inner)
    if job_title:
        y = _centered(d, y + round(1.0 * MM), job_title, font("text", 3.8), NAVY, inner)
    if organization:
        y = _centered(d, y + round(1.0 * MM), organization, font("bold", 4.2), NAVY, inner)

    # QR code (38 mm) au-dessus du pied du badge
    footer = H - round(3 * MM) - round(2.8 * MM)
    q = 38 * MM
    if qr_data:
        buf = io.BytesIO()
        segno.make(qr_data, error="m").save(buf, kind="png", scale=10, border=2, dark="#0E2240")
        qr = Image.open(buf).convert("RGB").resize((q, q), Image.NEAREST)
        bottom = footer - round(2 * MM)
        qr_y = max(y + round(4 * MM), bottom - q - max(0, (bottom - q - y - round(4 * MM)) // 2))  # centré dans l'espace libre
        img.paste(qr, ((W - q) // 2, min(qr_y, bottom - q)))

    # Pied : numéro et reboisement
    small = font("semibold", 2.8)
    if number:
        d.text((5 * MM, footer), f"N° {number:04d}", font=small, fill=GREY)
    if planting:
        d.text((W - 5 * MM, footer), "Reboisement", font=small, fill=GREEN, anchor="ra")

    # Contour fin
    d.rectangle((0, 0, W - 1, H - 1), outline=(208, 213, 221), width=2)
    out = io.BytesIO()
    img.save(out, "PNG", optimize=True)
    return out.getvalue()


def _centered_on(draw, y, text, f, fill, max_w):
    return _centered(draw, y, text, f, fill, max_w, line_gap=1.12, max_lines=3)
