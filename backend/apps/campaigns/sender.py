"""Mise en forme et envoi des campagnes.

`run()` est appelé toutes les 15 minutes par le minuteur du serveur (commande send_campaigns) : il envoie les campagnes
dont l'heure est venue, en respectant un plafond quotidien (offre du service d'envoi). Un contact ne reçoit jamais
deux fois la même campagne pour une même date, même si la commande est relancée.
"""
import logging
import re
from datetime import datetime, timedelta

from django.conf import settings
from django.core.mail import EmailMultiAlternatives, get_connection
from django.db.models import Count, Q
from django.utils import timezone
from django.utils.html import escape

from .models import Campaign, Contact, Delivery

logger = logging.getLogger(__name__)
SATURDAY = 5
DAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
NAVY, GREEN, GOLD = "#0E2240", "#1E5C3F", "#C39A3E"


# ---------- Configuration ----------
def config_problem():
    """Raison pour laquelle aucun envoi réel n'est possible, ou "" si tout est prêt."""
    if settings.CAMPAIGN_EMAIL_HOST:
        return ""
    if settings.EMAIL_BACKEND.endswith("smtp.EmailBackend"):
        return ("Le service d'envoi des campagnes (Brevo) n'est pas encore configuré sur le serveur. "
                "Les campagnes peuvent être préparées, mais aucun e-mail ne partira.")
    return ""  # développement et tests : e-mails affichés dans la console ou conservés en mémoire


def connection():
    if not settings.CAMPAIGN_EMAIL_HOST:
        return get_connection()
    return get_connection("django.core.mail.backends.smtp.EmailBackend", host=settings.CAMPAIGN_EMAIL_HOST,
                          port=settings.CAMPAIGN_EMAIL_PORT, username=settings.CAMPAIGN_EMAIL_USER,
                          password=settings.CAMPAIGN_EMAIL_PASSWORD, use_tls=True, timeout=30)


# ---------- Destinataires et calendrier ----------
def recipients(campaign):
    qs = Contact.objects.filter(unsubscribed_at__isnull=True)
    if campaign.segments:
        qs = qs.filter(segment__in=campaign.segments)
    if campaign.activities:
        qs = qs.filter(activity__in=campaign.activities)
    return qs


def is_send_day(campaign, day):
    if day < campaign.start_date or (campaign.end_date and day > campaign.end_date):
        return False
    if campaign.frequency == Campaign.Frequency.ONCE:
        return True  # envoi unique : dû à partir de sa date (rattrapé si le serveur était arrêté)
    weekday = SATURDAY if campaign.frequency == Campaign.Frequency.WEEKEND else campaign.weekday
    return day.weekday() == weekday


def occurrence(campaign, now):
    """Date d'envoi due maintenant, ou None."""
    today = now.date()
    if not is_send_day(campaign, today):
        return None
    if campaign.frequency == Campaign.Frequency.ONCE:
        due = datetime.combine(campaign.start_date, campaign.send_time, tzinfo=now.tzinfo)
        return campaign.start_date if now >= due else None
    return today if now.time() >= campaign.send_time else None


def next_send(campaign, now=None):
    """Prochain envoi prévu (pour l'affichage), ou None."""
    if campaign.status != Campaign.Status.ACTIVE:
        return None
    now = timezone.localtime(now)
    if campaign.frequency == Campaign.Frequency.ONCE:
        return datetime.combine(campaign.start_date, campaign.send_time, tzinfo=now.tzinfo)
    for offset in range(0, 15):
        day = now.date() + timedelta(days=offset)
        if is_send_day(campaign, day) and (offset > 0 or now.time() < campaign.send_time):
            return datetime.combine(day, campaign.send_time, tzinfo=now.tzinfo)
    return None


def schedule_label(campaign):
    hour = campaign.send_time.strftime("%H h %M").replace(" 00", "")
    if campaign.frequency == Campaign.Frequency.ONCE:
        return f"Le {campaign.start_date:%d/%m/%Y} à {hour}"
    day = "samedi" if campaign.frequency == Campaign.Frequency.WEEKEND else DAYS[campaign.weekday]
    until = f", jusqu'au {campaign.end_date:%d/%m/%Y}" if campaign.end_date else ""
    return f"Chaque {day} à {hour}, à partir du {campaign.start_date:%d/%m/%Y}{until}"


# ---------- Mise en forme ----------
def _fill(text, contact):
    name = contact.name or contact.organization or "Madame, Monsieur"
    return text.replace("{nom}", name).replace("{organisation}", contact.organization or "votre organisation")


def _paragraphs_html(text):
    url = re.compile(r"(https?://[^\s<]+[^\s<.,;:!?)\]])")
    out = []
    for block in re.split(r"\n\s*\n", text.strip()):
        html = escape(block)
        html = url.sub(lambda m: f'<a href="{m.group(1)}" style="color:{GREEN};font-weight:600">{m.group(1)}</a>', html)
        out.append(f'<p style="margin:0 0 16px">{html.replace(chr(10), "<br>")}</p>')
    return "".join(out)


def unsubscribe_url(contact):
    return f"{settings.SITE_URL}/desinscription/{contact.token}"


def render(campaign, contact):
    """Retourne (objet, texte brut, HTML) personnalisés pour un contact."""
    subject = _fill(campaign.subject, contact)
    body = _fill(campaign.body, contact)
    unsub = unsubscribe_url(contact)
    site = settings.SITE_URL.replace("https://", "")

    text = body.strip()
    if campaign.cta_label and campaign.cta_url:
        text += f"\n\n{campaign.cta_label} : {campaign.cta_url}"
    text += (f"\n\n--\nUrban Hub Connect · Coordination\n{site}\n\n"
             f"Vous recevez cet e-mail en tant que partenaire d'Urban Hub Connect.\nSe désinscrire : {unsub}")

    button = ""
    if campaign.cta_label and campaign.cta_url:
        button = (f'<p style="margin:24px 0 8px"><a href="{escape(campaign.cta_url)}" style="display:inline-block;background:{GREEN};'
                  f'color:#ffffff;text-decoration:none;font-weight:700;padding:14px 26px;border-radius:8px">{escape(campaign.cta_label)}</a></p>')
    html = f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(subject)}</title></head>
<body style="margin:0;padding:0;background:#F4F6F3;font-family:Arial,Helvetica,sans-serif;color:{NAVY}">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#F4F6F3"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:12px;overflow:hidden">
<tr><td style="background:{NAVY};padding:22px 28px;border-bottom:4px solid {GOLD}">
<span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.3px">Urban Hub Connect</span><br>
<span style="color:#cfd6e0;font-size:13px">Pôles urbains de Diamniadio et du Lac Rose</span></td></tr>
<tr><td style="padding:28px;font-size:16px;line-height:1.6">{_paragraphs_html(body)}{button}</td></tr>
<tr><td style="padding:20px 28px;background:#F4F6F3;font-size:12px;line-height:1.6;color:#55606f">
Urban Hub Connect · Coordination · <a href="{settings.SITE_URL}" style="color:#55606f">{site}</a><br>
Vous recevez cet e-mail en tant que partenaire d'Urban Hub Connect.
<a href="{unsub}" style="color:#55606f">Se désinscrire</a></td></tr>
</table></td></tr></table></body></html>"""
    return subject, text, html


def build_message(campaign, contact, subject_prefix=""):
    subject, text, html = render(campaign, contact)
    msg = EmailMultiAlternatives(
        subject_prefix + subject, text, settings.CAMPAIGN_FROM_EMAIL, [contact.email],
        reply_to=[settings.CAMPAIGN_REPLY_TO] if settings.CAMPAIGN_REPLY_TO else None,
        headers={"List-Unsubscribe": f"<{settings.SITE_URL}/api/unsubscribe/{contact.token}/>",
                 "List-Unsubscribe-Post": "List-Unsubscribe=One-Click"})
    msg.attach_alternative(html, "text/html")
    return msg


def sample_contact(campaign):
    return recipients(campaign).first() or Contact(email="exemple@partenaire.sn", organization="Entreprise Exemple", name="Awa Ndiaye")


def send_test(campaign, address):
    contact = sample_contact(campaign)
    test = Contact(email=address, organization=contact.organization, name=contact.name, token=contact.token)
    with connection() as conn:
        conn.send_messages([build_message(campaign, test, "[TEST] ")])


# ---------- Envoi programmé ----------
def sent_today(now=None):
    now = timezone.localtime(now)
    start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    return Delivery.objects.filter(sent_at__gte=start, state=Delivery.State.SENT).count()


def stats(campaign):
    agg = campaign.deliveries.aggregate(sent=Count("id", filter=Q(state=Delivery.State.SENT)),
                                        failed=Count("id", filter=Q(state=Delivery.State.FAILED)))
    last = campaign.deliveries.order_by("-sent_at").values_list("sent_at", flat=True).first()
    return {**agg, "last_sent_at": last}


def run(now=None):
    """Envoie ce qui est dû. Retourne le bilan {campagne: nombre d'e-mails envoyés}."""
    now = timezone.localtime(now)
    report = {}
    if config_problem():
        logger.warning("Campagnes : %s", config_problem())
        return report
    budget = settings.CAMPAIGN_DAILY_LIMIT - sent_today(now)
    for campaign in Campaign.objects.filter(status=Campaign.Status.ACTIVE).order_by("start_date", "pk"):
        if campaign.end_date and now.date() > campaign.end_date:
            campaign.status = Campaign.Status.DONE
            campaign.save(update_fields=["status", "updated_at"])
            continue
        occ = occurrence(campaign, now)
        if occ is None:
            continue
        done = Delivery.objects.filter(campaign=campaign, occurrence=occ).values("contact")
        pending = list(recipients(campaign).exclude(pk__in=done)[:max(budget, 0)])
        if pending:
            try:
                conn = connection()
                conn.open()
            except Exception:
                logger.exception("Campagnes : connexion au service d'envoi impossible")
                return report  # rien n'est marqué : nouvel essai au prochain passage
            sent = 0
            try:
                for contact in pending:
                    try:
                        conn.send_messages([build_message(campaign, contact)])
                        Delivery.objects.create(campaign=campaign, contact=contact, occurrence=occ, state=Delivery.State.SENT, sent_at=now)
                        sent += 1
                    except Exception as exc:
                        logger.exception("Campagne %s : échec pour %s", campaign.pk, contact.email)
                        Delivery.objects.create(campaign=campaign, contact=contact, occurrence=occ,
                                                state=Delivery.State.FAILED, error=str(exc)[:300], sent_at=now)
            finally:
                conn.close()
            budget -= sent
            report[campaign.title] = sent
        finished = not recipients(campaign).exclude(
            pk__in=Delivery.objects.filter(campaign=campaign, occurrence=occ).values("contact")).exists()
        if finished and campaign.frequency == Campaign.Frequency.ONCE:
            campaign.status = Campaign.Status.DONE
            campaign.save(update_fields=["status", "updated_at"])
        if budget <= 0:
            logger.info("Campagnes : plafond quotidien atteint, la suite partira demain.")
            break
    return report
