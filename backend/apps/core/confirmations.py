"""E-mails de confirmation envoyés à la personne qui remplit un formulaire du site.

Un message par formulaire, avec les prochaines étapes. L'envoi ne bloque jamais l'enregistrement : en cas d'échec, la demande
reste en base et visible par la Coordination. Les formulaires qui envoient déjà leur propre e-mail (adhésion, référencement,
inscription au Grand Week-End avec badge) ne sont pas listés ici.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def signature():
    """Coordonnées lues dans les Paramètres du site : un changement dans l'admin s'applique aussi aux e-mails."""
    from .models import SiteSettings
    s = SiteSettings.load()
    return (f"\n\nUrban Hub Connect · Coordination\n{s.phone} (appel et WhatsApp) · {s.email}\n{settings.SITE_URL.replace('https://', '')}\n\n"
            "Cet e-mail confirme la réception de votre demande. Pour toute question, répondez simplement à ce message.")


def _lines(*pairs):
    return "\n".join(f"- {k} : {v}" for k, v in pairs if v)


def _contact(m):
    return (m.email, "Nous avons bien reçu votre message",
            f"Bonjour {m.name},\n\nNous avons bien reçu votre message ({m.get_subject_display().lower()}). "
            "La Coordination vous répondra dans les meilleurs délais.\n\nVotre message :\n" + m.message)


def _partnership(p):
    return (p.email, "Votre demande de partenariat avec Urban Hub Connect",
            f"Bonjour {p.contact_name},\n\nNous avons bien reçu la demande de partenariat de {p.company}"
            + (f" (formule envisagée : {p.tier.name})" if p.tier_id else "") + ".\n"
            "La Coordination vous rappellera sous 72 heures pour en parler avec vous.")


def _press(a):
    return (a.email, "Votre demande d'accréditation presse",
            f"Bonjour {a.name},\n\nNous avons bien reçu votre demande d'accréditation pour {a.media}"
            + (f" (jours de présence : {a.attendance_days})" if a.attendance_days else "") + ".\n"
            "La Coordination vous confirmera votre accréditation par e-mail.")


def _award(a):
    return (a.email, "Votre candidature aux Awards du Pôle",
            f"Bonjour {a.applicant_name},\n\nNous avons bien reçu votre candidature dans la catégorie « {a.category.name} ».\n\n"
            "Prochaines étapes :\n- jury du 23 au 28 novembre ;\n- annonce des nominés le 1er décembre ;\n"
            "- vote du public du 1er au 10 décembre ;\n- remise des Awards le samedi 12 décembre à 14 h 30.")


def _business_connect(b):
    return (b.email, "Votre inscription au Business Connect",
            f"Bonjour {b.participant_name},\n\nVotre inscription au Business Connect du Grand Week-End du Pôle est bien enregistrée.\n"
            + (f"\n{_lines(('Ce que vous proposez', b.what_offers), ('Ce que vous recherchez', b.what_needs))}\n" if b.what_offers or b.what_needs else "")
            + "\nVotre agenda de rendez-vous ciblés vous sera envoyé le 5 décembre.")


def _volunteer(v):
    missions = ", ".join(m.name for m in v.missions.all())
    return (v.email, "Votre candidature de bénévole",
            f"Bonjour {v.name},\n\nMerci de proposer votre aide pour le Grand Week-End du Pôle."
            + (f"\nMissions souhaitées : {missions}." if missions else "") + "\n\n"
            "La Coordination vous recontactera pour confirmer votre mission. La formation des bénévoles est obligatoire "
            "le samedi 5 décembre ; tenue officielle, repas et transport sont assurés pendant les jours de mission.")


def _event_request(r):
    texts = {
        "host_afterwork": ("Votre proposition d'accueillir un After Work Connect",
                           "Nous avons bien reçu votre proposition d'accueillir un After Work Connect. La Coordination vous recontactera "
                           "pour convenir du thème et de la date."),
        "challenge": ("Votre solution aux Défis Partenaires",
                      "Nous avons bien reçu votre solution aux Défis Partenaires. Les finalistes présenteront leur solution devant un jury "
                      "le samedi 12 décembre à 13 h 45, à l'Espace innovation. Vous restez propriétaire de votre idée."),
    }
    subject, text = texts.get(r.kind, ("Votre demande à Urban Hub Connect",
                                       "Nous avons bien reçu votre demande. La Coordination vous recontactera rapidement."))
    return (r.email, subject, f"Bonjour {r.name},\n\n{text}")


def _place(s):
    return (s.submitter_email, "Votre proposition de lieu pour la Cartographie",
            f"Bonjour {s.submitter_name},\n\nMerci d'avoir proposé « {s.name} » pour la Cartographie du Hub.\n"
            "La Coordination vérifie chaque information avant publication ; le lieu apparaîtra sur la carte une fois validé.")


def _newsletter(n):
    return (n.email, "Bienvenue dans La Lettre du Hub",
            (f"Bonjour {n.name},\n\n" if n.name else "Bonjour,\n\n") + "Votre inscription à La Lettre du Hub est confirmée. "
            "Chaque mois : l'agenda du réseau, les nouveaux membres, les opportunités et les portraits d'acteurs des deux pôles.")


BUILDERS = {
    "ContactMessage": _contact, "PartnershipApplication": _partnership, "PressAccreditation": _press, "AwardApplication": _award,
    "BusinessConnectRegistration": _business_connect, "VolunteerApplication": _volunteer, "EventRequest": _event_request,
    "PlaceSuggestion": _place, "NewsletterSubscriber": _newsletter,
}


def send_confirmation(obj):
    """Envoie l'accusé de réception adapté au formulaire. Retourne True si un e-mail est parti."""
    build = BUILDERS.get(type(obj).__name__)
    if build is None:
        return False
    try:
        to, subject, body = build(obj)
        if not to:
            return False
        send_mail(subject, body + signature(), settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        return True
    except Exception:
        logger.exception("Confirmation non envoyée (%s %s)", type(obj).__name__, getattr(obj, "pk", ""))
        return False
