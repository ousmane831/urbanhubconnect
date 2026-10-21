"""Règles du dossier d'adhésion. Toutes les transitions sont vérifiées ici (côté serveur), jamais dans l'interface."""
import calendar
import logging
from datetime import date, timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.core.models import SiteSettings
from apps.organizations.models import MembershipStatus as OrgMembership
from apps.organizations.models import Organization, ValidationStatus as VS
from .models import Membership, MembershipApplication, Payment

S = Membership.Status
logger = logging.getLogger(__name__)
APP_STATUS = {S.RECEIVED: "pending", S.REVIEWING: "reviewing", S.ACCEPTED: "accepted", S.REJECTED: "rejected"}


class DossierError(ValueError):
    """Action refusée : le message est affiché tel quel à la Coordination."""


def founder_deadline():
    return getattr(settings, "FOUNDER_DEADLINE", date(2026, 12, 11))


def add_months(d, n):
    y, m = divmod(d.month - 1 + n, 12)
    y, m = y + d.year, m + 1
    return date(y, m, min(d.day, calendar.monthrange(y, m)[1]))


fmt_date = lambda d: d.strftime("%d/%m/%Y")
fmt_fcfa = lambda n: f"{n:,}".replace(",", " ") + " FCFA"


def notify(m, subject, body):
    """Envoie un e-mail au demandeur ; retourne False (sans lever d'erreur) si l'envoi échoue."""
    if not m.email:
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [m.email], fail_silently=False)
        return True
    except Exception:
        logger.exception("Envoi d'e-mail impossible (dossier %s)", m.reference)
        return False


def _require(m, allowed):
    if m.status not in allowed:
        raise DossierError(f"Action impossible : le dossier est « {m.get_status_display()} ».")


def _sync_application(m, status):
    if m.application_id:
        MembershipApplication.objects.filter(pk=m.application_id).update(status=status, updated_at=timezone.now())


def sync_organization(m):
    """Répercute le statut du dossier sur la fiche Annuaire liée (publication, membre fondateur, statut d'adhésion)."""
    org = m.organization
    if org is None:
        return
    if m.status == S.ACTIVE:
        org.membership_status = OrgMembership.ACTIVE
        org.member_founder = m.is_founder
        if m.category and m.category.public_listing and org.validation_status == VS.ACCEPTED:
            org.is_published = True
    elif m.status in (S.RECEIVED, S.REVIEWING, S.ACCEPTED):
        org.membership_status = OrgMembership.PENDING
    else:  # échue, suspendue ou refusée : la fiche quitte l'Annuaire
        org.membership_status = OrgMembership.NONE
        org.is_published = False
    org.save()


# ---------- ouverture du dossier ----------
def open_dossier(app, *, status=None, send_mail_to_applicant=True):
    existing = Membership.objects.filter(application=app).first()
    if existing:
        return existing
    with transaction.atomic():
        org = Organization.objects.filter(membership__isnull=True).filter(
            Q(representative_email__iexact=app.email) | Q(name__iexact=app.organization_or_name)).first()
        m = Membership.objects.create(name=app.organization_or_name, category=app.category, application=app, organization=org,
                                      representative=app.representative, role=app.role, phone=app.phone, email=app.email,
                                      status=status or S.RECEIVED)
        sync_organization(m)
    if send_mail_to_applicant:
        notify(m, "Votre demande d'adhésion à Urban Hub Connect",
               f"Bonjour {m.representative},\n\nVotre demande d'adhésion (référence {m.reference}) a bien été reçue. "
               "La Coordination vous contactera sous 72 heures.\n\nUrban Hub Connect")
    return m


def link_org_submission(org):
    """Une fiche « Référencer mon organisation » rejoint le dossier existant du même demandeur, sinon en ouvre un."""
    with transaction.atomic():
        m = Membership.objects.filter(organization__isnull=True).filter(
            Q(email__iexact=org.representative_email) | Q(name__iexact=org.name)).first()
        created = m is None
        if created:
            m = Membership.objects.create(name=org.name, representative=org.representative_name, role=org.representative_role,
                                          phone=org.representative_phone, email=org.representative_email)
        m.organization = org
        m.save()
        sync_organization(m)
    if created:
        notify(m, "Votre fiche Urban Hub Connect",
               f"Bonjour {m.representative},\n\nVotre fiche a bien été transmise (référence {m.reference}). "
               "La Coordination vous contactera sous 72 heures pour finaliser votre adhésion et publier votre fiche.\n\nUrban Hub Connect")
    return m


# ---------- transitions ----------
def review(m):
    _require(m, (S.RECEIVED,))
    m.status = S.REVIEWING
    m.save()
    _sync_application(m, "reviewing")
    sync_organization(m)


def set_category(m, category):
    _require(m, (S.RECEIVED, S.REVIEWING, S.ACCEPTED))
    m.category = category
    m.save()


def accept(m):
    _require(m, (S.RECEIVED, S.REVIEWING))
    if not m.category:
        raise DossierError("Choisissez d'abord la catégorie d'adhésion.")
    with transaction.atomic():
        m.status = S.ACCEPTED
        m.save()
        if m.organization:  # le contenu de la fiche est validé ; la publication suivra le paiement
            m.organization.validation_status = VS.ACCEPTED
            m.organization.reviewed_at = timezone.now()
            m.organization.save()
        _sync_application(m, "accepted")
        sync_organization(m)


def reject(m):
    _require(m, (S.RECEIVED, S.REVIEWING, S.ACCEPTED))
    with transaction.atomic():
        m.status = S.REJECTED
        m.save()
        if m.organization:
            m.organization.validation_status = VS.REJECTED
            m.organization.save()
        _sync_application(m, "rejected")
        sync_organization(m)


def send_bulletin(m):
    """Envoie le bulletin d'adhésion, le lien de la Charte et les modalités de paiement. Retourne True si l'e-mail est parti."""
    from apps.documents.models import Document
    _require(m, (S.ACCEPTED,))
    if not m.category:
        raise DossierError("Choisissez d'abord la catégorie d'adhésion.")
    charter = Document.objects.public().filter(category="charter").first()
    link = f"\nCharte à signer : {settings.SITE_URL}{charter.file.url}\n" if charter else ""
    instructions = SiteSettings.load().payment_instructions or "La Coordination vous indiquera les modalités de paiement."
    m.charter_sent_at = timezone.now()
    m.save()
    return notify(m, "Votre adhésion à Urban Hub Connect : Charte et cotisation",
                  f"Bonjour {m.representative},\n\nVotre demande d'adhésion (référence {m.reference}) est acceptée.\n{link}\n"
                  f"Cotisation annuelle : {fmt_fcfa(m.category.amount_fcfa)}.\nModalités de paiement :\n{instructions}\n\n"
                  "Dès réception de la Charte signée et de votre règlement, votre fiche sera publiée dans l'Annuaire "
                  "et vous recevrez vos accès à l'Espace membres.\n\nUrban Hub Connect")


def suspend(m):
    _require(m, (S.ACTIVE, S.EXPIRED))
    m.status = S.SUSPENDED
    m.save()
    sync_organization(m)


def reinstate(m):
    _require(m, (S.SUSPENDED,))
    m.status = S.ACTIVE if m.valid_until and m.valid_until >= timezone.localdate() else S.EXPIRED
    m.save()
    sync_organization(m)


# ---------- cotisation ----------
def settle(m):
    """Applique les paiements non encore appliqués : activation ou renouvellement quand le montant dû est atteint."""
    if m.status not in (S.ACCEPTED, S.ACTIVE, S.EXPIRED):
        return f"Paiement enregistré, mais le dossier est « {m.get_status_display()} » : la cotisation n'a pas été appliquée."
    if not m.category:
        return "Paiement enregistré, mais aucune catégorie n'est choisie : la cotisation n'a pas été appliquée."
    due = m.category.amount_fcfa
    pending = list(m.payments.filter(applied=False))
    total = sum(p.amount_fcfa for p in pending)
    if total < due:
        return f"Paiement partiel enregistré : il reste {fmt_fcfa(due - total)} à régler."
    paid_on = max(p.paid_on for p in pending)
    Payment.objects.filter(pk__in=[p.pk for p in pending]).update(applied=True)
    first = m.activated_at is None
    base = m.valid_until if m.status == S.ACTIVE and m.valid_until and m.valid_until >= paid_on else paid_on
    m.valid_until = add_months(base, 12)
    m.status = S.ACTIVE
    if first:
        m.activated_at = paid_on
        m.is_founder = m.created_at.date() < founder_deadline()
    if not m.charter_signed_on:
        m.charter_signed_on = paid_on
    m.save()
    _sync_application(m, "accepted")
    sync_organization(m)
    notify(m, "Votre cotisation Urban Hub Connect est enregistrée",
           f"Bonjour {m.representative},\n\nNous avons bien reçu votre cotisation. Vous êtes membre à jour jusqu'au {fmt_date(m.valid_until)}."
           "\nVotre fiche est publiée dans l'Annuaire et vos accès à l'Espace membres vous seront communiqués.\n\nUrban Hub Connect")
    return f"Cotisation enregistrée. Membre à jour jusqu'au {fmt_date(m.valid_until)}."


def record_payment(m, *, amount, method, reference="", paid_on=None, user=None, notes=""):
    _require(m, (S.ACCEPTED, S.ACTIVE, S.EXPIRED))
    if method not in Payment.Method.values:
        raise DossierError("Mode de paiement inconnu.")
    if not isinstance(amount, int) or amount <= 0:
        raise DossierError("Montant invalide.")
    if paid_on and paid_on > timezone.localdate():
        raise DossierError("La date du paiement ne peut pas être dans le futur.")
    with transaction.atomic():
        payment = Payment.objects.create(membership=m, amount_fcfa=amount, method=method, reference=reference[:100],
                                         paid_on=paid_on or timezone.localdate(), recorded_by=user, notes=notes[:255])
        return payment, settle(m)


def expire_overdue(today=None):
    """Passe en « échue » les cotisations dépassées et retire leurs fiches de l'Annuaire. À lancer chaque jour."""
    today = today or timezone.localdate()
    count = 0
    for m in Membership.objects.filter(status=S.ACTIVE, valid_until__lt=today).select_related("organization", "category"):
        m.status = S.EXPIRED
        m.save()
        sync_organization(m)
        count += 1
    return count


def backfill_dossiers():
    """Crée les dossiers manquants pour les demandes et fiches déjà reçues (idempotent, sans envoyer d'e-mail)."""
    created = 0
    for app in MembershipApplication.objects.filter(membership__isnull=True):
        status = {"pending": S.RECEIVED, "reviewing": S.REVIEWING, "accepted": S.ACCEPTED, "rejected": S.REJECTED}.get(app.status, S.RECEIVED)
        open_dossier(app, status=status, send_mail_to_applicant=False)
        created += 1
    for org in Organization.objects.filter(membership__isnull=True, validation_status__in=[VS.PENDING, VS.REVIEWING]).exclude(representative_email=""):
        m = Membership.objects.filter(organization__isnull=True).filter(Q(email__iexact=org.representative_email) | Q(name__iexact=org.name)).first()
        if m:
            m.organization = org
            m.save()
        else:
            Membership.objects.create(name=org.name, representative=org.representative_name, role=org.representative_role,
                                      phone=org.representative_phone, email=org.representative_email, organization=org)
            created += 1
    return created
