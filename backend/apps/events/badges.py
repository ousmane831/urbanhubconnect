"""Badges du Grand Week-End du Pôle : QR code envoyé à l'inscription, scanné à l'accueil (comptes Coordination).

Le QR code contient seulement l'adresse de la page « Mon badge » (…/badge/<code>), avec un code aléatoire impossible à deviner :
aucune donnée personnelle n'y figure. L'accueil scanne ce code ; le serveur vérifie le badge et enregistre l'arrivée du jour.
"""
import io
import logging
import re
import secrets
from email.mime.image import MIMEImage

import segno
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.utils import timezone
from django.utils.html import escape

from .models import CheckIn, Event, EventRequest

logger = logging.getLogger(__name__)
EVENT_SLUG = "grand-week-end-du-pole-2026"
TOKEN_RE = re.compile(r"(?:/badge/)?([A-Za-z0-9_-]{16,32})/?$")
_date = lambda d: f"{d.day} {['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][d.month - 1]} {d.year}"


def frontend_url():
    return getattr(settings, "FRONTEND_URL", settings.SITE_URL).rstrip("/")


def ensure_token(r):
    if not r.badge_token:
        r.badge_token = secrets.token_urlsafe(16)
        r.save(update_fields=["badge_token", "updated_at"])
    return r.badge_token


def badge_url(r):
    return f"{frontend_url()}/badge/{ensure_token(r)}"


def qr_png(r, scale=10):
    buf = io.BytesIO()
    segno.make(badge_url(r), error="m").save(buf, kind="png", scale=scale, border=4, dark="#0E2240")
    return buf.getvalue()


def event_info():
    e = Event.objects.filter(slug=EVENT_SLUG).first()
    if not e:
        return {"title": "Le Grand Week-End du Pôle", "dates": "", "location": ""}
    start, end = timezone.localtime(e.start_date).date(), timezone.localtime(e.end_date).date() if e.end_date else None
    if end and end != start and (end.month, end.year) == (start.month, start.year):
        dates = f"{start.day} et {_date(end)}" if (end - start).days == 1 else f"du {start.day} au {_date(end)}"
    else:
        dates = _date(start)
    return {"title": e.title, "dates": dates, "location": e.location}


def payload(r):
    """Informations affichées sur la page « Mon badge » et à l'accueil (jamais l'e-mail ni le téléphone)."""
    return {"name": r.name, "organization": r.organization, "kind": r.get_kind_display(),
            "options": r.options_display() if r.kind == r.Kind.REGISTRATION else ["Grand reboisement du Lac Rose (vendredi après-midi)"],
            "planting": r.wants_planting, "valid": r.status != "rejected",
            "checkins": [{"day": c.day.isoformat(), "at": timezone.localtime(c.at).strftime("%H h %M")} for c in r.checkins.order_by("day")]}


def send_badge(r):
    """Envoie (ou renvoie) le badge par e-mail, avec le QR code dans le message. Retourne True si l'e-mail est parti."""
    info, url, png = event_info(), badge_url(r), qr_png(r)
    choices = payload(r)["options"]
    planting = ("\nVotre place dans le convoi du reboisement (vendredi après-midi) est réservée. Pensez à des chaussures fermées, "
                "un couvre-chef et de l'eau.\n") if r.wants_planting else ""
    text = (f"Bonjour {r.name},\n\nVotre inscription au {info['title']} est confirmée"
            + (f" ({info['dates']} · {info['location']})" if info["dates"] else "") + ".\n\n"
            "Vos temps du programme :\n" + "\n".join(f"- {c}" for c in choices) + "\n" + planting +
            f"\nVotre badge (QR code) est joint à ce message. Présentez-le à l'accueil, sur votre téléphone ou imprimé : "
            f"il est valable pour les deux journées.\nVous pouvez aussi l'afficher à tout moment ici : {url}\n\n"
            "Le Gala du Pôle ne fait pas partie de cette inscription : il est accessible sur invitation et par la billetterie commune avec The Ground.\n\n"
            "Contact : +221 78 309 56 56 (appel et WhatsApp)\n\nUrban Hub Connect")
    items = "".join(f"<li>{escape(c)}</li>" for c in choices)
    html = f"""<div style="font-family:Arial,sans-serif;color:#0E2240;max-width:560px">
<p>Bonjour {escape(r.name)},</p>
<p>Votre inscription au <strong>{escape(info['title'])}</strong> est confirmée{(' (' + escape(info['dates']) + ' · ' + escape(info['location']) + ')') if info['dates'] else ''}.</p>
<p style="margin-bottom:4px"><strong>Vos temps du programme :</strong></p><ul style="margin-top:0">{items}</ul>
{'<p><strong>Votre place dans le convoi du reboisement est réservée.</strong> Pensez à des chaussures fermées, un couvre-chef et de l’eau.</p>' if r.wants_planting else ''}
<div style="text-align:center;border:2px solid #1E5C3F;border-radius:12px;padding:16px;margin:20px 0">
<p style="margin:0 0 8px;font-weight:bold">Votre badge · {escape(r.name)}</p>
<img src="cid:badge" alt="QR code de votre badge" width="240" height="240" style="display:block;margin:0 auto">
<p style="margin:8px 0 0;font-size:13px">À présenter à l’accueil, sur votre téléphone ou imprimé. Valable pour les deux journées.</p>
</div>
<p>Vous pouvez aussi afficher votre badge à tout moment : <a href="{url}">{url}</a></p>
<p style="font-size:13px;color:#555">Le Gala du Pôle ne fait pas partie de cette inscription : il est accessible sur invitation et par la billetterie commune avec The Ground.<br>Contact : +221 78 309 56 56 (appel et WhatsApp)</p>
<p>Urban Hub Connect</p></div>"""
    msg = EmailMultiAlternatives(f"Votre badge pour le {info['title']}", text, settings.DEFAULT_FROM_EMAIL, [r.email])
    msg.attach_alternative(html, "text/html")
    msg.mixed_subtype = "related"
    img = MIMEImage(png, "png")
    img.add_header("Content-ID", "<badge>")
    img.add_header("Content-Disposition", "inline", filename="badge-grand-week-end.png")
    msg.attach(img)
    try:
        msg.send(fail_silently=False)
    except Exception:
        logger.exception("Badge non envoyé (inscription %s)", r.pk)
        return False
    r.badge_sent_at = timezone.now()
    r.save(update_fields=["badge_sent_at", "updated_at"])
    return True


def issue(r):
    """Après une inscription en ligne : inscription confirmée d'office (aucune validation manuelle) et badge envoyé."""
    if r.kind not in EventRequest.BADGE_KINDS:
        return False
    if r.status != "accepted":
        r.status = "accepted"
        r.save(update_fields=["status", "updated_at"])
    return send_badge(r)


def find_by_code(code):
    """Accepte le contenu brut du QR code (adresse complète) ou le code seul."""
    m = TOKEN_RE.search((code or "").strip())
    return EventRequest.objects.filter(badge_token=m.group(1), kind__in=EventRequest.BADGE_KINDS).first() if m else None


def check_in(r, user=None, today=None):
    """Enregistre l'arrivée du jour. Retourne (résultat, données) ; résultat : ok, already, cancelled."""
    today = today or timezone.localdate()
    if r.status == "rejected":
        return "cancelled", payload(r)
    try:
        with transaction.atomic():
            CheckIn.objects.create(registration=r, day=today, by=user if user and user.is_authenticated else None)
        result = "ok"
    except IntegrityError:  # déjà scanné aujourd'hui (même si deux téléphones scannent en même temps)
        result = "already"
    data = payload(r)
    data["today_at"] = next((c["at"] for c in data["checkins"] if c["day"] == today.isoformat()), "")
    return result, data


def stats(today=None):
    today = today or timezone.localdate()
    regs = EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS).exclude(status="rejected")
    from apps.core.models import SiteSettings
    days = {}
    for c in CheckIn.objects.filter(registration__in=regs).values_list("day", flat=True):
        days[c.isoformat()] = days.get(c.isoformat(), 0) + 1
    return {"registered": regs.count(), "today": days.get(today.isoformat(), 0), "by_day": days,
            "planting_taken": EventRequest.planting_taken(), "planting_seats": SiteSettings.load().planting_seats}
