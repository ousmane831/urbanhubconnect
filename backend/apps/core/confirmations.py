"""E-mails de confirmation envoyés à la personne qui remplit un formulaire du site.

Un message par formulaire, avec les prochaines étapes. L'envoi ne bloque jamais l'enregistrement : en cas d'échec, la demande
reste en base et visible par la Coordination. Les formulaires qui envoient déjà leur propre e-mail (adhésion, référencement,
inscription au Grand Week-End avec badge) ne sont pas listés ici.
"""
import logging

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)

def signature(obj=None):
    """Coordonnées lues dans les Paramètres du site : un changement dans l'admin s'applique aussi aux e-mails.
    Dossiers du Grand Week-End : le pied renvoie au lien de suivi et au formulaire d'assistance."""
    from . import dossiers
    from .models import SiteSettings
    s = SiteSettings.load()
    site = getattr(settings, "FRONTEND_URL", settings.SITE_URL).rstrip("/")
    end = (dossiers.footer() if obj is not None and dossiers.is_dossier(obj) else
           "Ce message est automatique. Aucune réponse n'est nécessaire. "
           f"Si vous avez besoin d'aide, utilisez le formulaire de contact : {site}/contact")
    return f"\n\nUrban Hub Connect · Coordination\n{s.phone} (appel et WhatsApp) · {s.email}\n{site.replace('https://', '')}\n\n--\n{end}"


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
            "Votre dossier est en cours d'examen : la Coordination vous recontactera. "
            "Cette demande ne vaut ni convention ni attribution de places.")


def _press(a):
    return (a.email, "Votre demande d'accréditation presse",
            f"Bonjour {a.name},\n\nNous avons bien reçu votre demande d'accréditation pour {a.media}"
            + (f" (jours de présence : {a.attendance_days})" if a.attendance_days else "") + ".\n"
            "Votre demande est en cours d'examen. Le badge n'est émis qu'après validation : vous recevrez un message distinct.")


def _award(a):
    return (a.email, "Votre candidature aux Awards du Pôle",
            f"Bonjour {a.applicant_name},\n\nNous avons bien reçu votre candidature dans la catégorie « {a.category.name} ».\n\n"
            "Prochaines étapes :\n- jury du 23 au 28 novembre ;\n- annonce des nominés le 1er décembre ;\n"
            "- vote du public du 1er au 10 décembre ;\n- remise des Awards le samedi 12 décembre.\n\n"
            "Le dépôt d'une candidature ne vaut ni nomination ni badge d'accès.")


def _business_connect(b):
    return (b.email, "Votre inscription au Business Connect",
            f"Bonjour {b.participant_name},\n\nVotre inscription au Business Connect du Grand Week-End du Pôle est bien enregistrée.\n"
            + (f"\n{_lines(('Ce que vous proposez', b.what_offers), ('Ce que vous recherchez', b.what_needs), ('Objectif', b.objective))}\n"
               if b.what_offers or b.what_needs or b.objective else "")
            + (f"\nVos disponibilités : {', '.join(str(s) for s in b.slots.all())}.\n" if b.slots.exists() else "")
            + "\nVotre demande de rendez-vous est reçue ; ce n'est pas encore un rendez-vous confirmé. "
            "La Coordination vous enverra uniquement les créneaux effectivement attribués.")


def _volunteer(v):
    missions = ", ".join(m.name for m in v.missions.all())
    return (v.email, "Votre candidature de bénévole",
            f"Bonjour {v.name},\n\nMerci de proposer votre aide pour le Grand Week-End du Pôle."
            + (f"\nMissions souhaitées : {missions}." if missions else "") + "\n\n"
            "Votre candidature est en cours d'examen. Après sélection, la Coordination vous enverra votre mission, "
            "l'adresse du rendez-vous et votre badge.")


def _event_request(r):
    texts = {
        "host_afterwork": ("Votre proposition d'accueillir un After Work Connect",
                           "Nous avons bien reçu votre proposition d'accueillir un After Work Connect. La Coordination vous recontactera "
                           "pour convenir du thème et de la date."),
        "challenge": ("Votre solution aux Défis Partenaires",
                      "Nous avons bien reçu votre solution aux Défis Partenaires. Les finalistes présenteront leur solution devant un jury "
                      "le samedi 12 décembre. Vous restez propriétaire de votre idée."),
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


def _stand(s):
    return (s.email, f"Votre demande : {s.get_space_display()}",
            f"Bonjour {s.manager},\n\nNous avons bien reçu la demande de {s.structure} ({s.get_space_display().lower()}, "
            f"{s.team_size} personne{'s' if s.team_size > 1 else ''}).\n"
            "Cette demande ne réserve pas encore de stand. La Coordination vous confirmera l'emplacement, les conditions, le montant "
            "et les badges de votre équipe. Aucun paiement n'est demandé à ce stade.")


BUILDERS = {
    "StandRequest": _stand,
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
        from . import dossiers
        if dossiers.is_dossier(obj):  # référence et lien de suivi (cahier des charges du 20 novembre 2026)
            body += dossiers.received_text(obj)
        send_mail(subject, body + signature(obj), settings.DEFAULT_FROM_EMAIL, [to], fail_silently=False)
        return True
    except Exception:
        logger.exception("Confirmation non envoyée (%s %s)", type(obj).__name__, getattr(obj, "pk", ""))
        return False
