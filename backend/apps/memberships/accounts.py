"""Comptes membres : création, invitation, mot de passe, profil, annuaire complet."""
import logging
from datetime import timedelta
from decimal import Decimal

from django.conf import settings
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

from apps.core.validators import coordinate_errors
from apps.map.models import MapPlace
from apps.organizations.models import ValidationStatus as VS
from apps.users.models import User
from .models import ContactReveal, Membership, ProfileChange
from .services import fmt_date, notify

logger = logging.getLogger(__name__)
S = Membership.Status
MIN_PASSWORD = 10

# Partie publique de la fiche : soumise à validation avant publication.
MODERATED = ("description", "website", "linkedin", "facebook", "instagram", "neighborhood", "address", "latitude", "longitude")
# Informations réservées aux membres : appliquées tout de suite.
IMMEDIATE = ("phone", "email", "representative_name", "representative_role", "representative_phone", "representative_email", "offers", "needs")
LABELS = {"description": "Présentation", "website": "Site web", "linkedin": "LinkedIn", "facebook": "Facebook", "instagram": "Instagram",
          "neighborhood": "Quartier", "address": "Adresse", "latitude": "Latitude", "longitude": "Longitude", "logo": "Logo"}


class AccountError(ValueError):
    """Action refusée : le message est affiché tel quel."""


def frontend_url():
    return getattr(settings, "FRONTEND_URL", settings.SITE_URL).rstrip("/")


def current_membership(user):
    """Dossier de l'utilisateur s'il est membre à jour, sinon None. Vérifié à chaque requête : l'accès se coupe aussitôt."""
    if not (user and user.is_authenticated and user.is_active and user.role == User.Role.MEMBER):
        return None
    m = Membership.objects.filter(user=user).select_related("organization", "category").first()
    return m if m and m.is_current else None


# ---------- compte, invitation, mot de passe ----------
def ensure_account(m):
    """Crée le compte membre (sans mot de passe) si nécessaire. Retourne (utilisateur, créé)."""
    if m.user_id:
        return m.user, False
    email = (m.email or "").strip().lower()
    if not email:
        raise AccountError("Le dossier n'a pas d'adresse e-mail : aucun compte membre n'a été créé.")
    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        if existing.role != User.Role.MEMBER:
            raise AccountError("Cette adresse correspond à un compte de la Coordination : aucun compte membre n'a été créé.")
        if Membership.objects.filter(user=existing).exclude(pk=m.pk).exists():
            raise AccountError("Cette adresse est déjà utilisée par un autre membre : aucun compte n'a été créé.")
        user, created = existing, False
    else:
        user = User.objects.create_user(username=email, email=email, role=User.Role.MEMBER, first_name=(m.representative or "")[:150])
        created = True
    m.user = user
    m.save(update_fields=["user", "updated_at"])
    return user, created


def password_link(user):
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    return f"{frontend_url()}/espace-membres/mot-de-passe?uid={uid}&token={default_token_generator.make_token(user)}"


def send_invitation(m, user=None):
    user = user or m.user
    ok = notify(m, "Votre cotisation est enregistrée : créez votre accès à l'Espace membres",
                f"Bonjour {m.representative},\n\nVotre cotisation est enregistrée : vous êtes membre à jour jusqu'au "
                f"{fmt_date(m.valid_until)}. Votre fiche est publiée dans l'Annuaire.\n\n"
                f"Pour accéder à l'Espace membres, choisissez votre mot de passe (lien valable 3 jours) :\n{password_link(user)}\n\n"
                f"Votre identifiant de connexion est votre adresse e-mail : {user.email}\n\nUrban Hub Connect")
    return ok


def user_from_uid(uid):
    try:
        return User.objects.filter(pk=force_str(urlsafe_base64_decode(uid)), is_active=True, role=User.Role.MEMBER).first()
    except (ValueError, TypeError, OverflowError):
        return None


def check_password_strength(password):
    if len(password) < MIN_PASSWORD:
        raise AccountError(f"Le mot de passe doit contenir au moins {MIN_PASSWORD} caractères.")
    if password.isdigit():
        raise AccountError("Le mot de passe ne peut pas être composé uniquement de chiffres.")
    try:
        validate_password(password)
    except ValidationError as e:
        raise AccountError(" ".join(e.messages))


def set_password(uid, token, password):
    user = user_from_uid(uid or "")
    if not user or not default_token_generator.check_token(user, token or ""):
        raise AccountError("Ce lien n'est plus valide. Demandez un nouveau lien avec « Mot de passe oublié ».")
    check_password_strength(password)
    user.set_password(password)  # le jeton devient invalide : un lien ne sert qu'une fois
    user.save()


def request_password_reset(email):
    """Envoie un lien si l'adresse correspond à un compte membre ; ne révèle jamais si elle existe."""
    user = User.objects.filter(email__iexact=(email or "").strip(), is_active=True, role=User.Role.MEMBER).first()
    m = Membership.objects.filter(user=user).first() if user else None
    if user and m:
        notify(m, "Urban Hub Connect : choisir un nouveau mot de passe",
               f"Bonjour {m.representative},\n\nPour choisir un nouveau mot de passe (lien valable 3 jours) :\n{password_link(user)}\n\n"
               "Si vous n'êtes pas à l'origine de cette demande, ignorez ce message.\n\nUrban Hub Connect")


# ---------- profil ----------
def _norm(field, value):
    if field in ("latitude", "longitude"):
        return None if value in (None, "") else format(Decimal(str(value)).quantize(Decimal("0.000001")), "f")
    return str(value or "").strip()


def current_values(org):
    return {f: _norm(f, getattr(org, f)) for f in MODERATED} | {f: getattr(org, f) or "" for f in IMMEDIATE}


def pending_change(org):
    return org.profile_changes.filter(status=ProfileChange.Status.PENDING).first()


def submit_profile(m, data, logo=None, user=None):
    """Applique tout de suite les informations privées ; met la partie publique en attente de validation."""
    org = m.organization
    if org is None:
        raise AccountError("Aucune fiche n'est liée à votre adhésion. Contactez la Coordination.")
    applied = []
    with transaction.atomic():
        for f in IMMEDIATE:
            if f in data and (data[f] or "") != (getattr(org, f) or ""):
                setattr(org, f, data[f] or "")
                applied.append(f)
        if applied:
            org.save(update_fields=[*applied, "updated_at"])
        pending = pending_change(org)
        changes = dict(pending.changes) if pending else {}
        for f in MODERATED:
            if f in data:
                new = _norm(f, data[f])
                if new != _norm(f, getattr(org, f)):
                    changes[f] = new
                else:
                    changes.pop(f, None)  # remis à la valeur publiée : plus rien à valider pour ce champ
        if changes or logo or (pending and pending.logo):
            if pending is None:
                pending = ProfileChange(organization=org)
            pending.changes = changes
            if logo:
                pending.logo = logo
            pending.requested_by = user
            pending.save()
        elif pending:
            pending.delete()
    return {"applied": applied, "pending": pending_change(org) is not None}


def approve_change(change, reviewer):
    if change.status != ProfileChange.Status.PENDING:
        raise AccountError("Cette modification a déjà été traitée.")
    org = change.organization
    old = (org.latitude, org.longitude)
    for f, v in change.changes.items():
        setattr(org, f, (Decimal(v) if v is not None else None) if f in ("latitude", "longitude") else v)
    errors = coordinate_errors(org.latitude, org.longitude)
    if errors:
        raise AccountError(" ".join(errors.values()))
    with transaction.atomic():
        if change.logo:
            org.logo = change.logo.name
        org.save()
        if ("latitude" in change.changes or "longitude" in change.changes) and old[0] is not None:
            # le point de la Cartographie suit la fiche, pour les lieux qui utilisaient l'ancien point
            MapPlace.objects.filter(organization=org, latitude=old[0], longitude=old[1]).update(
                latitude=org.latitude, longitude=org.longitude, updated_at=timezone.now())
        change.status, change.reviewed_by, change.reviewed_at = ProfileChange.Status.APPROVED, reviewer, timezone.now()
        change.save()


def reject_change(change, reviewer):
    if change.status != ProfileChange.Status.PENDING:
        raise AccountError("Cette modification a déjà été traitée.")
    change.status, change.reviewed_by, change.reviewed_at = ProfileChange.Status.REJECTED, reviewer, timezone.now()
    change.save()


def hide_listing(m):
    org = m.organization
    if org is None:
        raise AccountError("Aucune fiche n'est liée à votre adhésion.")
    org.hidden_by_member, org.is_published = True, False
    org.save()


def show_listing(m):
    org = m.organization
    if org is None or not m.category or not m.category.public_listing:
        raise AccountError("Votre catégorie d'adhésion ne comporte pas de fiche publique.")
    if org.validation_status != VS.ACCEPTED:
        raise AccountError("Votre fiche n'a pas encore été validée par la Coordination.")
    org.hidden_by_member, org.is_published = False, True
    org.save()


# ---------- annuaire complet ----------
def reveal_contact(user, org):
    """Affiche les coordonnées directes du représentant ; chaque affichage est journalisé et limité par jour."""
    limit = getattr(settings, "MEMBER_REVEALS_PER_DAY", 30)
    since = timezone.now() - timedelta(hours=24)
    if not ContactReveal.objects.filter(member=user, organization=org, created_at__gte=since).exists():
        if ContactReveal.objects.filter(member=user, created_at__gte=since).count() >= limit:
            raise AccountError("Limite quotidienne d'affichage de coordonnées atteinte. Pour une demande particulière, contactez la Coordination.")
        ContactReveal.objects.create(member=user, organization=org)
    return {"name": org.representative_name, "role": org.representative_role, "phone": org.representative_phone, "email": org.representative_email}
