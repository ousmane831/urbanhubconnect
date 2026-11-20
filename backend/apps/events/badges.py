"""Badges du Grand Week-End du Pôle : QR code envoyé à l'inscription, scanné à l'accueil (comptes Coordination).

Le QR code contient seulement l'adresse …/badge/<code>, avec un code aléatoire impossible à deviner : aucune donnée personnelle
n'y figure, et une personne qui le scanne avec un téléphone ordinaire ne voit aucune identité. Le titulaire consulte son badge
grâce à son lien personnel (…/badge/<code>?cle=<clé>), envoyé uniquement par e-mail. L'accueil scanne le code depuis
l'Espace Coordination ; le serveur vérifie le badge et enregistre l'arrivée du jour.
"""
import csv
import io
import logging
import re
import secrets
import unicodedata
import zipfile
from datetime import timedelta
from email.mime.application import MIMEApplication
from email.mime.image import MIMEImage

import segno
from django.conf import settings
from django.core.mail import EmailMultiAlternatives
from django.db import IntegrityError, transaction
from django.db.models import Max
from django.utils import timezone
from django.utils.crypto import constant_time_compare, salted_hmac
from django.utils.html import escape

from .models import CheckIn, Event, EventRequest

logger = logging.getLogger(__name__)
EVENT_SLUG = "grand-week-end-du-pole-2026"
TOKEN_RE = re.compile(r"(?:/badge/)?([A-Za-z0-9_-]{16,32})/?(?:\?.*)?$")
RESEND_DELAY = timedelta(minutes=10)
_date = lambda d: f"{d.day} {['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'][d.month - 1]} {d.year}"



def frontend_url():
    return getattr(settings, "FRONTEND_URL", settings.SITE_URL).rstrip("/")


def ensure_token(r):
    if not r.badge_token:
        r.badge_token = secrets.token_urlsafe(16)
        r.save(update_fields=["badge_token", "updated_at"])
    return r.badge_token


def ensure_number(r):
    """Numéro d'ordre du badge, attribué une fois pour toutes (1, 2, 3… dans l'ordre des inscriptions)."""
    for _ in range(5):
        if r.badge_number:
            return r.badge_number
        n = (EventRequest.objects.aggregate(m=Max("badge_number"))["m"] or 0) + 1
        try:
            with transaction.atomic():
                EventRequest.objects.filter(pk=r.pk, badge_number__isnull=True).update(badge_number=n)
        except IntegrityError:  # deux inscriptions au même instant : on reprend avec le numéro suivant
            continue
        r.refresh_from_db(fields=["badge_number"])
    return r.badge_number


def reference(r):
    """Référence communiquée à la personne : GWE-0007."""
    return f"GWE-{ensure_number(r) or 0:04d}"


# ---------- Liens ----------
def owner_key(token):
    """Clé du titulaire : dérivée du code du badge et de la clé secrète du site (rien à stocker)."""
    return salted_hmac("badge-owner", token).hexdigest()[:24]


def is_owner(token, key):
    return bool(key) and constant_time_compare(owner_key(token), str(key))


def badge_url(r):
    """Contenu du QR code : sans la clé, donc sans accès à l'identité."""
    return f"{frontend_url()}/badge/{ensure_token(r)}"


def owner_url(r):
    """Lien personnel du titulaire (e-mail uniquement)."""
    token = ensure_token(r)
    return f"{frontend_url()}/badge/{token}?cle={owner_key(token)}"


def download_url(r):
    """Badge PDF (A6) : lien de repli si la pièce jointe n'arrive pas."""
    token = ensure_token(r)
    return f"{frontend_url()}/api/badges/{token}/badge.pdf?cle={owner_key(token)}"


def visual_url(r):
    token = ensure_token(r)
    return f"{frontend_url()}/jy-serai?badge={token}&cle={owner_key(token)}"


def business_connect_url(r):
    """Demande Business Connect préremplie avec les coordonnées de l'inscription (titulaire uniquement)."""
    token = ensure_token(r)
    return f"{frontend_url()}/evenements/{EVENT_SLUG}?badge={token}&cle={owner_key(token)}#business-connect"


def is_confirmed(r):
    """Seule une inscription confirmée a un badge valide (pas en attente, refusée ni annulée)."""
    return r.status == "accepted"


def category_label(r):
    return r.get_badge_category_display()


def qr_png(r, scale=10):
    buf = io.BytesIO()
    segno.make(badge_url(r), error="m").save(buf, kind="png", scale=scale, border=4, dark="#0E2240")
    return buf.getvalue()


def badge_png(r):
    """Image complète du badge : identique dans l'e-mail, sur la page « Mon badge » et à l'impression."""
    from .badge_image import render
    info = event_info()
    return render(name=r.name, job_title=r.job_title, organization=r.organization, number=ensure_number(r),
                  category=category_label(r), event_title=re.sub(r"\s+\d{4}$", "", info["title"]), dates=info["dates"],
                  location=info["location"], qr_data=badge_url(r))


def badge_pdf(r):
    """Badge au format PDF (97 × 140 mm, à imprimer sur A6) : même image que le PNG."""
    from PIL import Image
    out = io.BytesIO()
    Image.open(io.BytesIO(badge_png(r))).convert("RGB").save(out, "PDF", resolution=254.0)
    return out.getvalue()


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
    """Informations du badge pour son titulaire et pour l'accueil (jamais l'e-mail ni le téléphone)."""
    return {"name": r.name, "organization": r.organization, "job_title": r.job_title, "number": r.badge_number,
            "reference": reference(r), "kind": r.get_kind_display(), "category": category_label(r), "days": r.days_display(),
            "valid": is_confirmed(r), "confirmed": is_confirmed(r), "status": r.get_status_display(),
            "checkins": [{"day": c.day.isoformat(), "at": timezone.localtime(c.at).strftime("%H h %M")} for c in r.checkins.order_by("day")]}


# ---------- E-mail ----------
def _where(location):
    """« The Ground, Diamniadio » → « à The Ground, à Diamniadio »."""
    parts = [p.strip() for p in (location or "").split(",") if p.strip()]
    return ", ".join(f"à {p}" for p in parts)


def send_badge(r):
    """Envoie (ou renvoie) le badge par e-mail : bouton de téléchargement, badge dans le message et en pièce jointe.
    Retourne True si l'e-mail est parti."""
    info, png = event_info(), badge_png(r)
    ref, mine, download, visual = reference(r), owner_url(r), download_url(r), visual_url(r)
    contact = f"{frontend_url()}/suivi#aide"
    title = re.sub(r"^(le|la)\s+", "", info["title"], flags=re.I)  # « au Grand Week-End », pas « au Le Grand Week-End »
    title = re.sub(r"\s+\d{4}$", "", title)
    sentence = (f"Votre inscription au {title}" + (f" des {info['dates']}" if info["dates"] else "")
                + (f" {_where(info['location'])}," if info["location"] else "") + " est confirmée.")
    from apps.core import dossiers
    footer = dossiers.footer()
    text = (f"Bonjour {r.name},\n\n{sentence}\n\n"
            f"Téléchargez votre badge nominatif (PDF) : {download}\n"
            "Présentez-le à l'accueil, sur votre téléphone ou imprimé. Il est valable pour les deux journées.\n\n"
            f"Référence : {ref}\nVotre badge en ligne : {mine}\n\n"
            f"Facultatif : créez votre visuel « J'y serai ! » pour vos réseaux : {visual}\n\n"
            f"Urban Hub Connect\n\n--\n{footer}")
    html = f"""<div style="font-family:Arial,sans-serif;color:#0E2240;max-width:560px">
<p>Bonjour {escape(r.name)},</p>
<p>{escape(sentence)}</p>
<p style="text-align:center;margin:22px 0"><a href="{download}" style="display:inline-block;background:#1E5C3F;color:#ffffff;text-decoration:none;font-weight:bold;padding:13px 24px;border-radius:8px">Télécharger mon badge</a></p>
<p>Présentez-le à l’accueil, sur votre téléphone ou imprimé. Il est valable pour les deux journées.</p>
<div style="text-align:center;margin:20px 0">
<img src="cid:badge" alt="Votre badge nominatif" width="300" height="433" style="display:block;margin:0 auto;max-width:100%;height:auto;border:1px solid #d0d5dd;border-radius:8px">
</div>
<p style="font-size:14px">Référence : <strong>{ref}</strong><br>Votre badge en ligne : <a href="{mine}">afficher mon badge</a></p>
<p style="font-size:14px">Facultatif : <a href="{visual}">créer mon visuel « J’y serai ! »</a> pour l’annoncer sur vos réseaux.</p>
<p>Urban Hub Connect</p>
<p style="margin-top:24px;padding-top:12px;border-top:1px solid #e4e7ec;font-size:12px;color:#667085">Ce message est automatique. Aucune réponse n’est nécessaire. Pour retrouver ou suivre votre dossier, utilisez le lien ci-dessus. Si vous avez besoin d’aide, utilisez le <a href="{contact}" style="color:#667085">formulaire d’assistance</a>.</p></div>"""
    msg = EmailMultiAlternatives(f"Votre inscription au {title} est confirmée", text, settings.DEFAULT_FROM_EMAIL, [r.email])
    msg.attach_alternative(html, "text/html")
    msg.mixed_subtype = "related"
    img = MIMEImage(png, "png")
    img.add_header("Content-ID", "<badge>")
    img.add_header("Content-Disposition", "inline", filename=f"badge-{r.badge_number or 0:04d}-grand-week-end.png")
    msg.attach(img)
    pdf = MIMEApplication(badge_pdf(r), "pdf")
    pdf.add_header("Content-Disposition", "attachment", filename=f"badge-{r.badge_number or 0:04d}-grand-week-end.pdf")
    msg.attach(pdf)
    try:
        msg.send(fail_silently=False)
    except Exception as exc:
        logger.exception("Badge non envoyé (inscription %s)", r.pk)
        r.badge_error = f"{timezone.localtime():%d/%m %H:%M} · {type(exc).__name__} : {exc}"[:255]
        r.save(update_fields=["badge_error", "updated_at"])
        return False
    r.badge_sent_at, r.badge_error = timezone.now(), ""
    r.save(update_fields=["badge_sent_at", "badge_error", "updated_at"])
    return True


def capacity():
    from apps.core.models import SiteSettings
    return SiteSettings.load().gwe_capacity


def confirmed_count():
    return EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted").count()


def places_left():
    """Places restantes selon la jauge (None : pas de jauge)."""
    cap = capacity()
    return None if cap is None else max(0, cap - confirmed_count())


def issue(r, force=False):
    """Inscription en ligne : confirmée d'office et badge envoyé, sauf jauge atteinte (liste d'attente, sans badge ni QR code).
    force : confirmation par la Coordination d'une personne en liste d'attente (place libérée)."""
    if r.kind not in EventRequest.BADGE_KINDS:
        return False
    if r.status != "accepted":
        if not force and places_left() == 0:
            r.status = "waitlist"
            r.save(update_fields=["status", "updated_at"])
            ensure_number(r)  # sert de référence ; aucun QR code n'est créé
            send_waitlist(r)
            return False
        r.status = "accepted"
        r.save(update_fields=["status", "updated_at"])
    ensure_number(r)  # le badge à imprimer est prêt dès l'inscription, dans l'ordre d'arrivée
    return send_badge(r)


def send_waitlist(r):
    """« Liste d'attente » : texte du cahier des charges, sans badge."""
    from django.core.mail import send_mail
    from apps.core import dossiers
    body = (f"Bonjour {r.name},\n\nVotre demande est en liste d'attente. Votre accès n'est pas encore confirmé. "
            "Si une place vous est proposée, vous recevrez un message distinct.\n\n"
            f"Référence : {reference(r)}\nSuivre votre demande : {dossiers.tracking_url(r.email)}\n\nUrban Hub Connect\n\n--\n{dossiers.footer()}")
    try:
        send_mail("Grand Week-End du Pôle : votre demande est en liste d'attente", body, settings.DEFAULT_FROM_EMAIL, [r.email],
                  fail_silently=False)
        return True
    except Exception:
        logger.exception("E-mail de liste d'attente non envoyé (inscription %s)", r.pk)
        return False


def reissue(r):
    """Nouveau QR code (l'ancien devient inconnu à l'accueil et ne sera jamais réactivé), puis envoi du badge."""
    r.badge_token = secrets.token_urlsafe(16)
    r.badge_printed_at = None  # à réimprimer
    r.save(update_fields=["badge_token", "badge_printed_at", "updated_at"])
    return send_badge(r)


def cancel(r):
    """Annulation : le badge n'est plus valable à l'accueil ; le dossier et son historique sont conservés."""
    r.status = "cancelled"
    r.save(update_fields=["status", "updated_at"])


def same_person(name, email):
    """Inscription déjà enregistrée pour la même personne (même nom, même adresse, à la casse et aux espaces près).
    Une même adresse peut servir à inscrire plusieurs personnes : seul le couple nom + adresse compte."""
    norm = lambda s: re.sub(r"\s+", " ", s or "").strip().casefold()
    for r in EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS, email__iexact=(email or "").strip()).exclude(status__in=["rejected", "cancelled"]):
        if norm(r.name) == norm(name):
            return r
    return None


def resend_if_stale(r):
    """Renvoie le badge sauf s'il est parti il y a moins de 10 minutes (pas de second envoi après un double clic)."""
    if not is_confirmed(r) or (r.badge_sent_at and timezone.now() - r.badge_sent_at < RESEND_DELAY):
        return False
    return send_badge(r)


def find_by_code(code):
    """Accepte le contenu brut du QR code (adresse complète) ou le code seul."""
    m = TOKEN_RE.search((code or "").strip())
    return EventRequest.objects.filter(badge_token=m.group(1), kind__in=EventRequest.BADGE_KINDS).first() if m else None


def check_in(r, user=None, today=None):
    """Enregistre l'arrivée du jour. Retourne (résultat, données) ; résultat : ok, already, cancelled."""
    today = today or timezone.localdate()
    if not is_confirmed(r):
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
    regs = EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted")
    days = {}
    for c in CheckIn.objects.filter(registration__in=regs).values_list("day", flat=True):
        days[c.isoformat()] = days.get(c.isoformat(), 0) + 1
    base = EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS)
    return {"registered": regs.count(), "today": days.get(today.isoformat(), 0), "by_day": days,
            "waitlist": base.filter(status="waitlist").count(), "capacity": capacity(),
            "unsent": regs.filter(badge_sent_at__isnull=True).count()}


# ---------- Badges à imprimer (Coordination) ----------
def printable(only_new=False):
    """Inscriptions valides, dans l'ordre de leur numéro ; only_new : celles dont le badge n'a pas encore été imprimé."""
    qs = EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted")
    for r in qs.filter(badge_number__isnull=True).order_by("created_at", "pk"):
        ensure_number(r)
    qs = qs.order_by("badge_number")
    return qs.filter(badge_printed_at__isnull=True) if only_new else qs


def print_row(r):
    token = ensure_token(r)
    return {"id": r.pk, "number": r.badge_number, "name": r.name, "job_title": r.job_title, "organization": r.organization,
            "category": category_label(r), "reference": reference(r), "token": token, "key": owner_key(token), "printed_at": r.badge_printed_at.isoformat() if r.badge_printed_at else None}


def _slug(text):
    text = unicodedata.normalize("NFKD", text or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-")[:60] or "badge"


def qr_zip(only_new=False):
    """Archive ZIP : le badge complet (dossier badges/) et le QR code seul (dossier qr/) de chaque inscrit
    (« 0007-Awa-Ndiaye.png », triés par numéro) et la liste correspondante (CSV, sans coordonnées)."""
    buf = io.BytesIO()
    rows = list(printable(only_new))
    listing = io.StringIO()
    writer = csv.writer(listing, delimiter=";")
    writer.writerow(["N°", "Référence", "Prénom et nom", "Fonction", "Organisation", "Catégorie", "Fichier"])
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as z:
        for r in rows:
            name = f"{r.badge_number:04d}-{_slug(r.name)}.png"
            z.writestr(f"qr/{name}", qr_png(r, scale=12))
            z.writestr(f"badges/{name}", badge_png(r))
            writer.writerow([r.badge_number, reference(r), r.name, r.job_title, r.organization, category_label(r), name])
        z.writestr("liste-des-badges.csv", "﻿" + listing.getvalue())  # BOM : accents corrects à l'ouverture dans Excel
    return buf.getvalue(), len(rows)
