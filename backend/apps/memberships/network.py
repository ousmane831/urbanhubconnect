"""Mises en relation et annonces Urban Opportunities. Toutes les règles sont vérifiées ici (côté serveur)."""
import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import EmailMessage
from django.utils import timezone

from apps.core.models import SiteSettings
from apps.organizations.models import Organization
from .models import ConnectionRequest, Membership, Opportunity
from .services import notify

logger = logging.getLogger(__name__)
CR, OP = ConnectionRequest.Status, Opportunity.Status


class NetworkError(ValueError):
    """Action refusée : le message est affiché tel quel."""


def directory_queryset():
    """Organisations membres à jour de leur cotisation, dont la fiche est publiée (périmètre de l'annuaire complet)."""
    return (Organization.objects.public()
            .filter(membership__status="active", membership__valid_until__gte=timezone.localdate())
            .select_related().prefetch_related("commissions"))


def _since():
    return timezone.now() - timedelta(hours=24)


# ---------- mises en relation ----------
def create_request(sender, recipient, message, opportunity=None):
    message = (message or "").strip()
    if len(message) < 20:
        raise NetworkError("Votre message est trop court : présentez-vous et expliquez l'objet de la demande (20 caractères minimum).")
    if len(message) > 1000:
        raise NetworkError("Votre message est trop long (1 000 caractères maximum).")
    if sender.organization_id and sender.organization_id == recipient.pk:
        raise NetworkError("Vous ne pouvez pas vous adresser à votre propre organisation.")
    if not directory_queryset().filter(pk=recipient.pk).exists():
        raise NetworkError("Cette organisation n'est pas joignable via l'Espace membres.")
    if opportunity is not None and (opportunity.organization_id != recipient.pk or not Opportunity.objects.open().filter(pk=opportunity.pk).exists()):
        raise NetworkError("Cette annonce n'est plus ouverte.")
    if ConnectionRequest.objects.filter(sender=sender, created_at__gte=_since()).count() >= getattr(settings, "MEMBER_REQUESTS_PER_DAY", 8):
        raise NetworkError("Limite quotidienne de demandes atteinte. Pour une demande particulière, contactez la Coordination.")
    if opportunity is None and ConnectionRequest.objects.filter(sender=sender, recipient=recipient, opportunity__isnull=True, status=CR.PENDING).exists():
        raise NetworkError("Vous avez déjà une demande en attente pour cette organisation.")
    req = ConnectionRequest.objects.create(sender=sender, recipient=recipient, opportunity=opportunity, message=message)
    if opportunity is not None:  # l'auteur de l'annonce a sollicité des réponses : transmission directe
        try:
            forward(req, None)
        except NetworkError:
            logger.warning("Réponse à une annonce non transmise automatiquement (demande %s) : elle reste à traiter.", req.pk)
    return req


def forward(req, user=None):
    if req.status != CR.PENDING:
        raise NetworkError("Cette demande a déjà été traitée.")
    org, s = req.recipient, req.sender
    to = org.representative_email or org.email
    if not to:
        raise NetworkError("Aucune adresse e-mail de contact n'est renseignée pour cette organisation : contactez-la directement.")
    context = f" en réponse à votre annonce « {req.opportunity.title} »" if req.opportunity else ""
    body = (f"Bonjour,\n\nUn membre du réseau Urban Hub Connect souhaite vous contacter{context}.\n\n"
            f"De la part de : {s.name}" + (f" ({s.representative}" + (f", {s.role}" if s.role else "") + ")" if s.representative else "") + "\n"
            f"E-mail : {s.email or 'non renseigné'}\nTéléphone : {s.phone or 'non renseigné'}\n\nMessage :\n{req.message}\n\n"
            "Vous pouvez répondre directement à ce message. Cette mise en relation passe par Urban Hub Connect ; "
            "les coordonnées des membres ne doivent pas servir à de la prospection massive.\n\nUrban Hub Connect")
    mail = EmailMessage("Demande de mise en relation via Urban Hub Connect", body, settings.DEFAULT_FROM_EMAIL, [to], reply_to=[s.email] if s.email else None)
    try:
        mail.send(fail_silently=False)
    except Exception:
        logger.exception("Transmission impossible (demande %s)", req.pk)
        raise NetworkError("L'e-mail n'a pas pu être envoyé. Réessayez plus tard ou contactez l'organisation directement.")
    now = timezone.now()
    req.status, req.forwarded_at, req.handled_by, req.handled_at = CR.FORWARDED, now, user, now
    req.save()


def decline(req, user=None):
    if req.status != CR.PENDING:
        raise NetworkError("Cette demande a déjà été traitée.")
    req.status, req.handled_by, req.handled_at = CR.DECLINED, user, timezone.now()
    req.save()
    notify(req.sender, "Votre demande de mise en relation",
           f"Bonjour {req.sender.representative or req.sender.name},\n\nVotre demande de mise en relation avec {req.recipient.name} "
           "n'a pas pu être transmise. Pour plus d'informations, contactez la Coordination.\n\nUrban Hub Connect")


# ---------- annonces ----------
def _publisher(o):
    return Membership.objects.filter(organization=o.organization).first()


def publish_opportunity(m, data, user):
    org = m.organization
    if org is None:
        raise NetworkError("Seules les organisations ayant une fiche dans l'Annuaire peuvent publier une annonce.")
    if Opportunity.objects.filter(organization=org, created_at__gte=_since()).count() >= getattr(settings, "OPPORTUNITIES_PER_DAY", 3):
        raise NetworkError("Limite de 3 annonces par jour atteinte.")
    if Opportunity.objects.filter(organization=org, status__in=[OP.PENDING, OP.PUBLISHED]).count() >= getattr(settings, "OPPORTUNITIES_OPEN_MAX", 10):
        raise NetworkError("Vous avez déjà 10 annonces en cours : clôturez-en une avant d'en publier une nouvelle.")
    moderated = SiteSettings.load().moderate_opportunities
    return Opportunity.objects.create(organization=org, published_by=user, type=data["type"], title=data["title"].strip(),
                                      description=data["description"].strip(), deadline=data.get("deadline"),
                                      status=OP.PENDING if moderated else OP.PUBLISHED, published_at=None if moderated else timezone.now())


def update_opportunity(o, data):
    if o.status not in (OP.PENDING, OP.PUBLISHED):
        raise NetworkError("Cette annonce n'est plus modifiable.")
    o.type, o.title, o.description, o.deadline = data["type"], data["title"].strip(), data["description"].strip(), data.get("deadline")
    if SiteSettings.load().moderate_opportunities:  # une annonce modifiée est revalidée avant de réapparaître
        o.status, o.published_at = OP.PENDING, None
    o.save()


def close_opportunity(o):
    if o.status not in (OP.PENDING, OP.PUBLISHED):
        raise NetworkError("Cette annonce est déjà clôturée.")
    o.status = OP.CLOSED
    o.save()


def approve_opportunity(o, user):
    if o.status != OP.PENDING:
        raise NetworkError("Cette annonce a déjà été traitée.")
    o.status, o.published_at, o.reviewed_by, o.reviewed_at = OP.PUBLISHED, timezone.now(), user, timezone.now()
    o.save()
    m = _publisher(o)
    if m:
        notify(m, "Votre annonce est publiée", f"Bonjour {m.representative or m.name},\n\nVotre annonce « {o.title} » est publiée dans Urban Opportunities.\n\nUrban Hub Connect")


def reject_opportunity(o, user):
    if o.status != OP.PENDING:
        raise NetworkError("Cette annonce a déjà été traitée.")
    o.status, o.reviewed_by, o.reviewed_at = OP.REJECTED, user, timezone.now()
    o.save()
    m = _publisher(o)
    if m:
        notify(m, "Votre annonce n'a pas été retenue",
               f"Bonjour {m.representative or m.name},\n\nVotre annonce « {o.title} » n'a pas pu être publiée. Contactez la Coordination pour en savoir plus.\n\nUrban Hub Connect")
