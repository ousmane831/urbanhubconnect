"""Règles du dossier d'adhésion. Toutes les transitions sont vérifiées ici (côté serveur), jamais dans l'interface."""
import calendar
import logging
from datetime import date, timedelta

from django.conf import settings
from django.core.cache import cache
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
APP_STATUS = {S.RECEIVED: "pending", S.REVIEWING: "reviewing", S.ACCEPTED: "accepted", S.REJECTED: "rejected",
              S.ACTIVE: "accepted", S.EXPIRED: "accepted", S.SUSPENDED: "accepted"}
OPEN_STATUSES = (S.RECEIVED, S.REVIEWING, S.ACCEPTED)


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


def send_to(address, subject, body, ref=""):
    """Envoie un e-mail ; retourne False (sans lever d'erreur) si l'adresse manque ou si l'envoi échoue."""
    if not address:
        return False
    try:
        send_mail(subject, body, settings.DEFAULT_FROM_EMAIL, [address], fail_silently=False)
        return True
    except Exception:
        logger.exception("Envoi d'e-mail impossible (dossier %s)", ref)
        return False


def notify(m, subject, body):
    """E-mail au demandeur (adresse du dossier)."""
    return send_to(m.email, subject, body, m.reference)


def mail_note(m, sent):
    """Complément du message affiché à la Coordination quand l'e-mail au demandeur n'est pas parti."""
    if sent:
        return ""
    if not m.email:
        return " Le dossier n'a pas d'adresse e-mail : prévenez le demandeur directement."
    return " Attention : l'e-mail n'a pas pu être envoyé, prévenez le demandeur directement."


def _add_note(m, text):
    stamp = timezone.localdate().strftime("%d/%m/%Y")
    m.notes = f"{m.notes}\n{stamp} · {text}".strip()


def _require(m, allowed):
    if m.status not in allowed:
        raise DossierError(f"Action impossible : le dossier est « {m.get_status_display()} ».")


def _sync_application(m, status):
    if m.application_id:
        MembershipApplication.objects.filter(pk=m.application_id).update(status=status, updated_at=timezone.now())


def application_date(m):
    """Date de la demande (et non de la création du dossier) : sert au statut de membre fondateur."""
    return (m.application.created_at if m.application_id else m.created_at).date()


def charter_available():
    from apps.documents.models import Document
    return Document.objects.public().filter(category="charter").exists()


# ---------- fiche Annuaire ----------
def membership_of(org):
    return Membership.objects.filter(organization=org).select_related("category").first() if org and org.pk else None


def publication_blocker(org):
    """Raison pour laquelle la fiche ne peut pas être publiée, ou None. Utilisé par l'Espace Coordination et l'admin."""
    if org.validation_status != VS.ACCEPTED:
        return "Acceptez d'abord la fiche avant de la publier."
    if org.hidden_by_member:
        return "Cette fiche a été retirée de l'Annuaire par l'organisation elle-même : elle seule peut la remettre en ligne."
    m = membership_of(org)
    if m is not None:
        if not m.is_current:
            return (f"Cette fiche dépend du dossier {m.reference} (« {m.get_status_display()} ») : "
                    "elle sera publiée automatiquement quand la cotisation sera à jour.")
        if not (m.category and m.category.public_listing):
            return "La catégorie d'adhésion de ce membre ne comporte pas de fiche publique dans l'Annuaire."
    return None


def sync_organization(m):
    """Répercute le statut du dossier sur la fiche Annuaire liée (publication, membre fondateur, statut d'adhésion)."""
    org = m.organization
    if org is None:
        return
    if m.status == S.ACTIVE and m.is_current:
        org.membership_status = OrgMembership.ACTIVE
        org.member_founder = m.is_founder
        public = bool(m.category and m.category.public_listing)
        if not public:
            org.is_published = False
        elif org.validation_status == VS.ACCEPTED and not org.hidden_by_member:
            org.is_published = True
    elif m.status in OPEN_STATUSES:
        org.membership_status = OrgMembership.PENDING
        org.is_published = False  # la fiche d'un dossier en attente n'est publiée qu'au paiement
    else:  # échue, suspendue, refusée ou date dépassée : la fiche quitte l'Annuaire
        org.membership_status = OrgMembership.NONE
        org.member_founder = False if m.status == S.REJECTED else org.member_founder
        org.is_published = False
    org.save()


def listing_sentence(m):
    """Phrase exacte sur la fiche, pour les e-mails au membre (jamais « publiée » si ce n'est pas le cas)."""
    org = m.organization
    if not (m.category and m.category.public_listing):
        return ""
    if org is None:
        return "Contactez la Coordination pour créer la fiche de votre organisation dans l'Annuaire."
    org.refresh_from_db(fields=["is_published", "hidden_by_member", "validation_status"])
    if org.is_published:
        return "Votre fiche est publiée dans l'Annuaire."
    if org.hidden_by_member:
        return "Votre fiche reste retirée de l'Annuaire, comme vous l'avez demandé : vous pouvez la remettre en ligne depuis l'Espace membres."
    return "Votre fiche sera publiée dans l'Annuaire dès sa validation par la Coordination."


# ---------- ouverture du dossier ----------
def _find_listing(email, name):
    """Fiche à rattacher automatiquement : jamais une fiche déjà publiée ni refusée (rattachement manuel dans l'admin)."""
    base = Organization.objects.filter(membership__isnull=True, is_published=False).exclude(validation_status=VS.REJECTED)
    if email:
        org = base.filter(Q(representative_email__iexact=email) | Q(email__iexact=email)).first()
        if org:
            return org, "même adresse e-mail"
    org = base.filter(name__iexact=(name or "").strip()).first() if name else None
    return (org, "même nom : à vérifier") if org else (None, "")


def open_dossier(app, *, status=None, send_mail_to_applicant=True):
    """Ouvre le dossier d'une demande « Adhérer ». Une même demande renvoyée (même e-mail et même nom) rejoint le dossier en cours."""
    existing = Membership.objects.filter(application=app).first()
    if existing:
        return existing
    duplicate = (Membership.objects.filter(email__iexact=app.email, name__iexact=app.organization_or_name.strip())
                 .exclude(status=S.REJECTED).order_by("-created_at").first())
    if duplicate:
        _add_note(duplicate, f"Nouvelle demande reçue (doublon), contact : {app.representative} · {app.phone}.")
        duplicate.save(update_fields=["notes", "updated_at"])
        MembershipApplication.objects.filter(pk=app.pk).update(status=APP_STATUS[duplicate.status], updated_at=timezone.now())
        if send_mail_to_applicant:
            notify(duplicate, "Votre demande d'adhésion à Urban Hub Connect",
                   f"Bonjour {app.representative},\n\nUne demande d'adhésion au nom de {duplicate.name} est déjà enregistrée "
                   f"(référence {duplicate.reference}, « {duplicate.get_status_display()} »). Nous l'avons complétée avec votre nouveau message ; "
                   "inutile de la renvoyer. La Coordination reste à votre disposition.\n\nUrban Hub Connect")
        return duplicate
    with transaction.atomic():
        org, how = _find_listing(app.email, app.organization_or_name)
        m = Membership(name=app.organization_or_name, category=app.category, application=app, organization=org,
                       representative=app.representative, role=app.role, phone=app.phone, email=app.email,
                       status=status or S.RECEIVED)
        if org:
            _add_note(m, f"Fiche « {org.name} » rattachée automatiquement ({how}).")
        same_email = Membership.objects.filter(email__iexact=app.email).exclude(status=S.REJECTED).first()
        if same_email:
            _add_note(m, f"Même adresse e-mail que le dossier {same_email.reference} ({same_email.name}).")
        m.save()
        sync_organization(m)
    if send_mail_to_applicant:
        notify(m, "Votre demande d'adhésion à Urban Hub Connect",
               f"Bonjour {m.representative},\n\nVotre demande d'adhésion (référence {m.reference}) a bien été reçue. "
               "La Coordination vous contactera sous 72 heures.\n\nUrban Hub Connect")
    return m


def link_org_submission(org):
    """Une fiche « Référencer mon organisation » rejoint le dossier en cours du même demandeur, sinon en ouvre un."""
    email = (org.representative_email or "").strip()
    with transaction.atomic():
        candidates = Membership.objects.filter(organization__isnull=True).exclude(status__in=[S.REJECTED, S.SUSPENDED])
        m, how = (candidates.filter(email__iexact=email).first(), "même adresse e-mail") if email else (None, "")
        if m is None:  # rapprochement par le nom : seulement pour une demande encore à l'étude
            m, how = candidates.filter(name__iexact=org.name.strip(), status__in=[S.RECEIVED, S.REVIEWING]).first(), "même nom : à vérifier"
        created = m is None
        if created:
            m = Membership(name=org.name, representative=org.representative_name, role=org.representative_role,
                           phone=org.representative_phone, email=email)
        else:
            _add_note(m, f"Fiche « {org.name} » rattachée automatiquement ({how}).")
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
    """Choisit ou change la catégorie. Retourne True si le bulletin (avec l'ancien montant) a déjà été envoyé."""
    _require(m, OPEN_STATUSES)
    m.category = category
    m.save()
    sync_organization(m)
    return m.charter_sent_at is not None


def ensure_listing(m):
    """Crée la fiche Annuaire à partir de la demande « Adhérer » quand le dossier n'en a pas (catégories avec fiche publique).
    Les informations viennent du formulaire ; la fiche est validée avec le dossier et publiée au paiement. Retourne la fiche créée ou None."""
    from apps.organizations.models import College, Pole
    if m.organization_id or not (m.category and m.category.public_listing):
        return None
    app = m.application
    college = (app.college if app and app.college_id else None) or College.objects.filter(is_active=True).first()
    if college is None:
        return None
    org = Organization.objects.create(
        name=(app.organization_or_name if app else m.name), college=college,
        sector=app.sector.name if app and app.sector_id else "", pole=(app.pole if app and app.pole else Pole.BOTH),
        offers=app.offers if app else "", needs=app.needs if app else "",
        representative_name=m.representative, representative_role=m.role, representative_phone=m.phone, representative_email=m.email,
        validation_status=VS.ACCEPTED if m.status != S.RECEIVED and m.status != S.REVIEWING else VS.PENDING, reviewed_at=timezone.now())
    if app:
        org.commissions.set(app.commissions.all())
    m.organization = org
    _add_note(m, f"Fiche « {org.name} » créée à partir de la demande d'adhésion : le membre peut la compléter (présentation, logo, site web) depuis l'Espace membres.")
    m.save(update_fields=["organization", "notes", "updated_at"])
    return org


def accept(m):
    _require(m, (S.RECEIVED, S.REVIEWING))
    if not m.category:
        raise DossierError("Choisissez d'abord la catégorie d'adhésion.")
    with transaction.atomic():
        m.status = S.ACCEPTED
        m.save()
        ensure_listing(m)  # demande « Adhérer » sans fiche : la fiche est créée avec les informations du formulaire
        if m.organization:  # le contenu de la fiche est validé ; la publication suivra le paiement
            m.organization.validation_status = VS.ACCEPTED
            m.organization.reviewed_at = timezone.now()
            m.organization.save()
        _sync_application(m, "accepted")
        sync_organization(m)


def reject(m):
    """Refuse la demande. Retourne un avertissement si des paiements sont déjà enregistrés (remboursement à prévoir)."""
    _require(m, OPEN_STATUSES)
    paid = sum(p.amount_fcfa for p in m.payments.filter(cancelled=False))
    with transaction.atomic():
        m.status = S.REJECTED
        if paid:
            _add_note(m, f"Demande refusée alors que {fmt_fcfa(paid)} avaient été encaissés : remboursement à prévoir.")
        m.save()
        if m.organization:
            m.organization.validation_status = VS.REJECTED
            m.organization.save()
        _sync_application(m, "rejected")
        sync_organization(m)
    return f" Attention : {fmt_fcfa(paid)} ont déjà été encaissés, un remboursement est à prévoir." if paid else ""


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
                  "Dès réception de la Charte signée et de votre règlement, vous recevrez vos accès à l'Espace membres"
                  + (" et votre fiche sera publiée dans l'Annuaire." if m.category.public_listing else ".") + "\n\nUrban Hub Connect")


def record_charter(m, signed_on=None):
    _require(m, (S.ACCEPTED, S.ACTIVE, S.EXPIRED, S.SUSPENDED))
    m.charter_signed_on = signed_on or timezone.localdate()
    m.save()


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
def _welcome(m, user, first):
    """E-mail au membre après une cotisation : invitation si l'accès n'est pas encore créé, sinon confirmation."""
    from . import accounts  # import tardif : accounts dépend de ce module
    if user is not None and not user.has_usable_password():
        return accounts.send_invitation(m, user)
    lines = [f"Bonjour {m.representative},", "",
             f"Nous avons bien reçu votre cotisation. Vous êtes membre à jour jusqu'au {fmt_date(m.valid_until)}."]
    if sentence := listing_sentence(m):
        lines.append(sentence)
    if user is not None:
        lines.append("Vous pouvez vous connecter à l'Espace membres avec votre adresse e-mail et votre mot de passe.")
    return notify(m, "Votre cotisation Urban Hub Connect est enregistrée", "\n".join(lines + ["", "Urban Hub Connect"]))


def settle(m):
    """Applique les paiements non encore appliqués : activation ou renouvellement quand le montant dû est atteint."""
    if m.status not in (S.ACCEPTED, S.ACTIVE, S.EXPIRED):
        return f"Paiement enregistré, mais le dossier est « {m.get_status_display()} » : la cotisation n'a pas été appliquée."
    if not m.category:
        return "Paiement enregistré, mais aucune catégorie n'est choisie : la cotisation n'a pas été appliquée."
    due = m.category.amount_fcfa
    pending = list(m.payments.filter(applied=False, cancelled=False))
    total = sum(p.amount_fcfa for p in pending)
    if total < due:
        return f"Paiement partiel enregistré : il reste {fmt_fcfa(due - total)} à régler."
    paid_on = max(p.paid_on for p in pending)
    Payment.objects.filter(pk__in=[p.pk for p in pending]).update(applied=True)
    first = m.activated_at is None
    base = m.valid_until if m.valid_until and m.valid_until >= paid_on and m.status == S.ACTIVE else paid_on
    m.valid_until = add_months(base, 12)
    m.status = S.ACTIVE
    if first:
        m.activated_at = paid_on
        m.is_founder = application_date(m) < founder_deadline()
    m.save()
    ensure_listing(m)  # dossier accepté avant cette règle : la fiche est créée au paiement
    _sync_application(m, "accepted")
    sync_organization(m)
    from . import accounts
    note = ""
    try:
        user, _ = accounts.ensure_account(m)
    except accounts.AccountError as e:
        user, note = None, f" Attention : {e}"
    sent = _welcome(m, user, first)
    msg = f"Cotisation enregistrée. Membre à jour jusqu'au {fmt_date(m.valid_until)}."
    if total > due:
        msg += f" Le trop-perçu de {fmt_fcfa(total - due)} n'est pas reporté."
    return msg + note + mail_note(m, sent)


def check_payment(m, *, amount, method, reference="", paid_on=None):
    """Contrôles communs à l'Espace Coordination et à l'admin. Retourne un avertissement éventuel (texte)."""
    _require(m, (S.ACCEPTED, S.ACTIVE, S.EXPIRED))
    if method not in Payment.Method.values:
        raise DossierError("Mode de paiement inconnu.")
    if not isinstance(amount, int) or amount <= 0:
        raise DossierError("Montant invalide.")
    if paid_on and paid_on > timezone.localdate():
        raise DossierError("La date du paiement ne peut pas être dans le futur.")
    reference = (reference or "").strip()
    if reference and Payment.objects.filter(reference__iexact=reference, cancelled=False).exists():
        raise DossierError(f"Un paiement portant la référence « {reference} » est déjà enregistré : vérifiez qu'il ne s'agit pas d'une double saisie.")
    same = m.payments.filter(cancelled=False, amount_fcfa=amount, paid_on=paid_on or timezone.localdate()).exists()
    return (" Attention : un paiement du même montant et de la même date existait déjà. S'il s'agit d'une double saisie, "
            "utilisez « Annuler le dernier paiement ».") if same else ""


def record_payment(m, *, amount, method, reference="", paid_on=None, user=None, notes=""):
    warning = check_payment(m, amount=amount, method=method, reference=reference, paid_on=paid_on)
    with transaction.atomic():
        payment = Payment.objects.create(membership=m, amount_fcfa=amount, method=method, reference=(reference or "").strip()[:100],
                                         paid_on=paid_on or timezone.localdate(), recorded_by=user, notes=notes[:255])
        return payment, settle(m) + warning


def recompute(m):
    """Recalcule la cotisation à partir des paiements non annulés (après une annulation). N'envoie aucun e-mail."""
    due = m.category.amount_fcfa if m.category else None
    valid_until = activated = None
    pending, applied = [], []
    for p in m.payments.filter(cancelled=False).order_by("paid_on", "id"):
        pending.append(p)
        if due and sum(x.amount_fcfa for x in pending) >= due:
            base = valid_until if valid_until and valid_until >= p.paid_on else p.paid_on
            valid_until = add_months(base, 12)
            activated = activated or p.paid_on
            applied += [x.pk for x in pending]
            pending = []
    m.payments.update(applied=False)
    m.payments.filter(pk__in=applied).update(applied=True)
    m.valid_until, m.activated_at = valid_until, activated
    m.is_founder = bool(activated) and application_date(m) < founder_deadline()
    if m.status != S.SUSPENDED:
        m.status = S.ACCEPTED if not activated else (S.ACTIVE if valid_until >= timezone.localdate() else S.EXPIRED)
    m.save()
    sync_organization(m)


def last_payment(m):
    return m.payments.filter(cancelled=False).order_by("-created_at", "-id").first()


def cancel_payment(payment, user=None):
    """Annule un paiement saisi par erreur (il reste visible, barré) et recalcule la cotisation."""
    if payment.cancelled:
        raise DossierError("Ce paiement est déjà annulé.")
    m = payment.membership
    _require(m, (S.ACCEPTED, S.ACTIVE, S.EXPIRED, S.SUSPENDED))
    with transaction.atomic():
        payment.cancelled, payment.cancelled_at, payment.cancelled_by = True, timezone.now(), user
        payment.save(update_fields=["cancelled", "cancelled_at", "cancelled_by", "updated_at"])
        _add_note(m, f"Paiement annulé : {payment}.")
        m.save(update_fields=["notes", "updated_at"])
        recompute(m)
    state = (f"Membre à jour jusqu'au {fmt_date(m.valid_until)}." if m.status == S.ACTIVE
             else f"Le dossier est maintenant « {m.get_status_display()} ».")
    return f"Paiement de {fmt_fcfa(payment.amount_fcfa)} annulé. {state}"


# ---------- échéances (tâche quotidienne) ----------
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


def send_reminders(today=None):
    """Rappels d'échéance à J-30 et J-7 ; chaque rappel n'est envoyé qu'une fois par période, même si la tâche tourne en double."""
    today = today or timezone.localdate()
    instructions = SiteSettings.load().payment_instructions or "La Coordination vous indiquera les modalités de paiement."
    sent = 0
    for field, low, high in (("reminder_30_for", 8, 30), ("reminder_7_for", 0, 7)):
        qs = Membership.objects.filter(status=S.ACTIVE, valid_until__gte=today + timedelta(days=low), valid_until__lte=today + timedelta(days=high))
        for m in qs.select_related("category"):
            claimed = Membership.objects.filter(pk=m.pk).exclude(**{field: m.valid_until}).update(**{field: m.valid_until})
            if not claimed:
                continue
            amount = f"Montant de la cotisation : {fmt_fcfa(m.category.amount_fcfa)}.\n" if m.category else ""
            sent += notify(m, "Votre cotisation Urban Hub Connect arrive à échéance",
                           f"Bonjour {m.representative},\n\nVotre adhésion à Urban Hub Connect (référence {m.reference}) arrive à échéance "
                           f"le {fmt_date(m.valid_until)}.\n{amount}Modalités de paiement :\n{instructions}\n\n"
                           "Sans renouvellement, votre fiche sera retirée de l'Annuaire et votre accès à l'Espace membres suspendu "
                           "à cette date. Un renouvellement anticipé prolonge votre adhésion de 12 mois à partir de l'échéance.\n\nUrban Hub Connect")
    return sent


def daily_maintenance(today=None):
    return {"expired": expire_overdue(today), "reminders": send_reminders(today)}


def run_daily_if_needed():
    """Filet de sécurité si la tâche planifiée n'est pas installée : constate les échéances une fois par jour et par processus."""
    if cache.add(f"uhc-daily-{timezone.localdate().isoformat()}", True, 60 * 60 * 24):
        try:
            expire_overdue()
        except Exception:
            logger.exception("Constat des échéances impossible")


# ---------- reprise de l'existant ----------
def backfill_dossiers():
    """Crée les dossiers manquants pour les demandes et fiches déjà reçues (idempotent, sans envoyer d'e-mail)."""
    created = 0
    for app in MembershipApplication.objects.filter(membership__isnull=True):
        status = {"pending": S.RECEIVED, "reviewing": S.REVIEWING, "accepted": S.ACCEPTED, "rejected": S.REJECTED}.get(app.status, S.RECEIVED)
        if open_dossier(app, status=status, send_mail_to_applicant=False).application_id == app.pk:
            created += 1
    for org in Organization.objects.filter(membership__isnull=True, validation_status__in=[VS.PENDING, VS.REVIEWING]).exclude(representative_email=""):
        m = (Membership.objects.filter(organization__isnull=True).exclude(status__in=[S.REJECTED, S.SUSPENDED])
             .filter(email__iexact=org.representative_email).first())
        if m:
            m.organization = org
            m.save()
        else:
            Membership.objects.create(name=org.name, representative=org.representative_name, role=org.representative_role,
                                      phone=org.representative_phone, email=org.representative_email, organization=org)
            created += 1
    return created
