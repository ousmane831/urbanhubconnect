"""Suivi des dossiers du Grand Week-End sans compte (cahier des charges du 20 novembre 2026).

Chaque demande a une référence (GWE-0007 pour une inscription, BC-00012 pour Business Connect…). La personne retrouve ses
dossiers grâce à un lien personnel temporaire envoyé à son adresse : le formulaire « Retrouver mon dossier » répond toujours
la même chose, qu'un dossier existe ou non, et n'affiche jamais publiquement une identité ou un statut.
"""
import logging

from django.conf import settings
from django.core import signing
from django.core.mail import send_mail

logger = logging.getLogger(__name__)
LINK_DAYS = 14
SALT = "dossier-suivi"


def _models():
    from apps.events.models import AwardApplication, BusinessConnectRegistration, EventRequest, StandRequest, VolunteerApplication
    from apps.partnerships.models import PartnershipApplication
    from apps.press.models import PressAccreditation
    # (modèle, clé publique, préfixe, libellé du type, champ du nom)
    return [
        (EventRequest, "event-requests", "EVT", None, "name"),
        (BusinessConnectRegistration, "business-connect", "BC", "Business Connect", "participant_name"),
        (AwardApplication, "awards", "AWD", "Candidature aux Awards du Pôle", "applicant_name"),
        (VolunteerApplication, "volunteers", "BEN", "Candidature de bénévole", "name"),
        (PressAccreditation, "press", "PRE", "Accréditation presse", "name"),
        (PartnershipApplication, "partnerships", "PAR", "Demande de partenariat", "contact_name"),
        (StandRequest, "stands", "STD", "Demande de stand", "manager"),
    ]


def spec(obj):
    return next((m for m in _models() if isinstance(obj, m[0])), None)


def model_for(key):
    return next((m for m in _models() if m[1] == key), None)


def is_dossier(obj):
    return spec(obj) is not None


def kind_label(obj):
    s = spec(obj)
    if s and s[3]:
        return s[3]
    return obj.get_kind_display() if hasattr(obj, "get_kind_display") else "Demande"


def reference(obj):
    from apps.events.models import EventRequest
    if isinstance(obj, EventRequest) and obj.kind in EventRequest.BADGE_KINDS:
        from apps.events import badges
        return badges.reference(obj)
    s = spec(obj)
    return f"{s[2] if s else 'DOS'}-{obj.pk:05d}"


def person_name(obj):
    s = spec(obj)
    return getattr(obj, s[4], "") if s else ""


# ---------- Lien personnel temporaire ----------
def site():
    return getattr(settings, "FRONTEND_URL", settings.SITE_URL).rstrip("/")


def token_for(email):
    return signing.TimestampSigner(salt=SALT).sign_object({"e": email.strip().lower()})


def email_from(token):
    """Adresse portée par le lien, ou None s'il est faux ou expiré."""
    try:
        return signing.TimestampSigner(salt=SALT).unsign_object(token, max_age=LINK_DAYS * 86400)["e"]
    except (signing.BadSignature, KeyError, TypeError):
        return None


def tracking_url(email):
    return f"{site()}/suivi/{token_for(email)}"


def find(email):
    """Dossiers de l'événement liés à une adresse, du plus récent au plus ancien."""
    email = (email or "").strip()
    found = []
    for model, *_ in _models():
        found += list(model.objects.filter(email__iexact=email))
    return sorted(found, key=lambda o: o.created_at, reverse=True)


# ---------- Ce que la personne voit ----------
NEXT = {
    "pending": "Votre dossier est reçu ; il sera examiné par la Coordination.",
    "reviewing": "Votre dossier est en cours d'examen.",
    "incomplete": "La Coordination a besoin d'un complément : utilisez le bouton « Compléter mon dossier ».",
    "waitlist": "Votre demande est en liste d'attente. Votre accès n'est pas encore confirmé ; si une place vous est proposée, "
                "vous recevrez un message distinct.",
    "accepted": "Votre demande est acceptée.",
    "rejected": "Votre demande n'a pas été retenue.",
    "cancelled": "Ce dossier est annulé.",
}


def status_label(obj):
    from apps.events.models import EventRequest
    if isinstance(obj, EventRequest) and obj.kind in EventRequest.BADGE_KINDS and obj.status == "accepted":
        return "Confirmée"
    return obj.get_status_display()


def next_step(obj):
    from apps.events.models import EventRequest
    if isinstance(obj, EventRequest) and obj.kind in EventRequest.BADGE_KINDS and obj.status == "accepted":
        return "Votre inscription est confirmée. Présentez votre badge à l'accueil, sur votre téléphone ou imprimé : il est valable pour les deux journées."
    return NEXT.get(obj.status, "")


def public_row(obj):
    """Ligne affichée dans l'espace de suivi (jamais les notes internes)."""
    from apps.events import badges
    from apps.events.models import EventRequest
    s = spec(obj)
    row = {"kind": s[1], "id": obj.pk, "type": kind_label(obj), "reference": reference(obj), "name": person_name(obj),
           "status": obj.status, "status_label": status_label(obj), "next_step": next_step(obj),
           "created_at": obj.created_at.isoformat(), "can_complete": obj.status == "incomplete", "can_cancel": False}
    from apps.events.models import BusinessConnectRegistration
    if isinstance(obj, BusinessConnectRegistration):
        from apps.events import business_connect
        row["meetings"] = business_connect.public_meetings(obj)
        if row["meetings"]:
            row["next_step"] = "Vos rendez-vous confirmés sont listés ci-dessous. Tout changement vous sera signalé par un message distinct."
    if isinstance(obj, EventRequest) and obj.kind in EventRequest.BADGE_KINDS and obj.status == "accepted" and obj.badge_token:
        row.update(badge_url=badges.owner_url(obj), visual_url=badges.visual_url(obj), can_cancel=True,
                   business_connect_url=badges.business_connect_url(obj))
    return row


# ---------- E-mails ----------
FOOTER = ("Ce message est automatique. Aucune réponse n'est nécessaire. Pour retrouver ou suivre votre dossier, utilisez le lien "
          "ci-dessus. Si vous avez besoin d'aide, utilisez le formulaire d'assistance : {help}")


def footer():
    return FOOTER.format(help=f"{site()}/suivi#aide")


def _send(to, subject, body):
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        return True
    except Exception:
        logger.exception("E-mail de suivi non envoyé (%s)", subject)
        return False


def send_tracking_link(email):
    """« Retrouver mon dossier » : envoie le lien seulement si au moins un dossier existe. Retourne True si un e-mail est parti."""
    dossiers = find(email)
    if not dossiers:
        return False
    lines = "\n".join(f"- {kind_label(o)} · {reference(o)} · {status_label(o)}" for o in dossiers[:10])
    body = (f"Bonjour,\n\nVoici votre lien personnel pour retrouver vos dossiers du Grand Week-End du Pôle :\n{tracking_url(email)}\n\n"
            f"Ce lien est valable {LINK_DAYS} jours. Dossiers liés à cette adresse :\n{lines}\n\n"
            f"Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nUrban Hub Connect\n\n--\n{footer()}")
    return _send(email, "Vos dossiers du Grand Week-End du Pôle", body)


def received_text(obj):
    """Phrase « Demande reçue » et lien de suivi, ajoutés aux accusés de réception."""
    return (f"\n\nNous avons reçu votre demande « {kind_label(obj)} » sous la référence {reference(obj)}. "
            "Votre dossier est en cours d'examen. Vous pouvez suivre son état ou compléter les informations depuis votre lien personnel :\n"
            f"{tracking_url(obj.email)}")


def notify_decision(obj, note=""):
    """Décision ou demande de complément, envoyée à la personne (un seul message par changement)."""
    ref, link = reference(obj), tracking_url(obj.email)
    name = person_name(obj) or ""
    hello = f"Bonjour {name},\n\n" if name else "Bonjour,\n\n"
    if obj.status == "incomplete":
        subject = f"Complément demandé pour votre dossier {ref}"
        body = (f"{hello}Pour poursuivre l'examen de votre dossier {ref}, nous avons besoin de : {note}\n\n"
                f"Merci de le transmettre depuis le bouton « Compléter mon dossier » de votre espace de suivi :\n{link}\n\n"
                "Urban Hub Connect")
        return _send(obj.email, subject, body)
    texts = {
        "accepted": "est acceptée",
        "rejected": "n'a pas été retenue",
        "waitlist": "est en liste d'attente. Votre accès n'est pas encore confirmé ; si une place vous est proposée, vous recevrez un message distinct",
        "cancelled": "est annulée",
    }
    if obj.status not in texts:
        return False
    body = (f"{hello}Votre demande « {kind_label(obj)} » (référence {ref}) {texts[obj.status]}."
            + (f"\n\n{note}" if note else "") + f"\n\nSuivre votre dossier : {link}\n\nUrban Hub Connect\n\n--\n{footer()}")
    return _send(obj.email, f"Votre dossier {ref} : {status_label(obj).lower()}", body)
