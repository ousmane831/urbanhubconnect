"""API de l'Espace Coordination : réservée au personnel (rôles ADMIN / COORDINATION), authentification par session."""
import logging

from django.contrib.admin.models import CHANGE, LogEntry
from django.contrib.auth import authenticate, login, logout
from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.events.models import (AwardApplication, BusinessConnectRegistration, Event, VolunteerApplication)
from apps.contact.models import ContactMessage
from apps.map.models import MapPlace, PlaceSuggestion
from apps.memberships.models import MembershipApplication
from apps.news.models import Article
from apps.newsletter.models import NewsletterSubscriber
from apps.organizations.models import Organization, ValidationStatus as VS
from apps.partnerships.models import PartnershipApplication
from apps.press.models import PressAccreditation
from apps.users.models import User

logger = logging.getLogger(__name__)
OPEN = ("pending", "reviewing")


def get(obj, path, default=""):
    """Lecture tolérante : get(o, "category.name") renvoie default si un maillon n'existe pas."""
    cur = obj
    for part in path.split("."):
        cur = getattr(cur, part, None)
        if cur is None:
            return default
    return cur


def label(obj, field):
    """Libellé lisible d'un champ, qu'il soit un champ à choix, une relation ou un texte."""
    display = getattr(obj, f"get_{field}_display", None)
    if callable(display):
        return display()
    value = getattr(obj, field, None)
    return "" if value is None else str(value)


def names(obj, field):
    try:
        return [str(x) for x in getattr(obj, field).all()]
    except Exception:
        return []


def safe(fn, default=None, what=""):
    try:
        return fn()
    except Exception:
        logger.exception("Espace Coordination : calcul impossible (%s)", what)
        return default


def is_coordination(user):
    return bool(user and user.is_authenticated and user.is_active and (user.is_superuser or user.role in User.STAFF_ROLES))


class IsCoordinationStaff(BasePermission):
    def has_permission(self, request, view):
        return is_coordination(request.user)


def staff_api(methods):
    """Vue DRF réservée à la Coordination. Ordre voulu : permissions et authentification posées AVANT api_view."""
    def decorator(fn):
        fn = permission_classes([IsCoordinationStaff])(fn)
        fn = authentication_classes([SessionAuthentication])(fn)
        return api_view(methods)(fn)
    return decorator


def audit(user, obj, message):
    """Trace chaque action dans le journal de l'administration Django (visible par les développeurs)."""
    LogEntry.objects.log_action(user.pk, ContentType.objects.get_for_model(obj).pk, obj.pk, str(obj)[:200], CHANGE, message)


def rows(*pairs):
    return [[k, str(v)] for k, v in pairs if v not in (None, "", [])]


# ---------- Files « à traiter » ----------
def _status_actions(obj):
    acts = [{"id": "accept", "label": "Accepter", "tone": "primary"}, {"id": "reject", "label": "Refuser", "tone": "danger"}]
    if obj.status != "reviewing":
        acts.append({"id": "review", "label": "Marquer « en cours d'examen »", "tone": "neutral"})
    return acts


def _org_actions(o):
    if o.validation_status == VS.ACCEPTED:
        return [{"id": "publish", "label": "Publier sur le site", "tone": "primary"}, {"id": "reject", "label": "Refuser", "tone": "danger"}]
    acts = [{"id": "accept", "label": "Accepter", "tone": "primary"}, {"id": "reject", "label": "Refuser", "tone": "danger"}]
    if o.validation_status != VS.REVIEWING:
        acts.append({"id": "review", "label": "Marquer « en cours d'examen »", "tone": "neutral"})
    return acts


KINDS = {
    "organizations": dict(
        label="Fiches de l'annuaire", model=Organization,
        qs=lambda: Organization.objects.filter(Q(validation_status__in=OPEN) | Q(validation_status=VS.ACCEPTED, is_published=False)).select_related(),
        title=lambda o: get(o, "name"), subtitle=lambda o: " · ".join(x for x in (label(o, "pole"), label(o, "college"), label(o, "sector")) if x),
        actions=_org_actions,
        state=lambda o: "Acceptée, pas encore publiée" if o.validation_status == VS.ACCEPTED else o.get_validation_status_display(),
        details=lambda o: rows(("Représentant", get(o, "representative_name")), ("Fonction", get(o, "representative_role")),
                               ("Téléphone", get(o, "representative_phone")), ("E-mail", get(o, "representative_email")),
                               ("Quartier", get(o, "neighborhood")), ("Présentation", str(get(o, "description"))[:400]))),
    "memberships": dict(
        label="Demandes d'adhésion", model=MembershipApplication, qs=lambda: MembershipApplication.objects.filter(status__in=OPEN).select_related(),
        title=lambda o: get(o, "organization_or_name"),
        subtitle=lambda o: " · ".join(x for x in (label(o, "category"), f"{get(o, 'category.amount_fcfa')} FCFA" if get(o, "category.amount_fcfa") else "") if x),
        actions=_status_actions,
        details=lambda o: rows(("Représentant", get(o, "representative")), ("Fonction", get(o, "role")), ("Téléphone", get(o, "phone")),
                               ("E-mail", get(o, "email")), ("Propose", get(o, "offers")), ("Recherche", get(o, "needs")))),
    "partnerships": dict(
        label="Demandes de partenariat", model=PartnershipApplication, qs=lambda: PartnershipApplication.objects.filter(status__in=OPEN).select_related(),
        title=lambda o: get(o, "company"), subtitle=lambda o: label(o, "tier") or "Formule non précisée", actions=_status_actions,
        details=lambda o: rows(("Contact", get(o, "contact_name")), ("Fonction", get(o, "role")), ("Téléphone", get(o, "phone")),
                               ("E-mail", get(o, "email")), ("Message", get(o, "message")))),
    "accreditations": dict(
        label="Accréditations presse", model=PressAccreditation, qs=lambda: PressAccreditation.objects.filter(status__in=OPEN),
        title=lambda o: get(o, "name"), subtitle=lambda o: get(o, "media"), actions=_status_actions,
        details=lambda o: rows(("Fonction", get(o, "role")), ("Téléphone", get(o, "phone")), ("E-mail", get(o, "email")),
                               ("Jours de présence", get(o, "attendance_days")))),
    "awards": dict(
        label="Candidatures Awards", model=AwardApplication, qs=lambda: AwardApplication.objects.filter(status__in=OPEN).select_related(),
        title=lambda o: get(o, "applicant_name"), subtitle=lambda o: label(o, "category"), actions=_status_actions,
        details=lambda o: rows(("E-mail", get(o, "email")), ("Téléphone", get(o, "phone")), ("Candidature", str(get(o, "description"))[:400]))),
    "business-connect": dict(
        label="Inscriptions Business Connect", model=BusinessConnectRegistration,
        qs=lambda: BusinessConnectRegistration.objects.filter(status__in=OPEN).select_related(),
        title=lambda o: get(o, "participant_name"), subtitle=lambda o: label(o, "event"), actions=_status_actions,
        details=lambda o: rows(("Organisation", get(o, "organization")), ("E-mail", get(o, "email")), ("Téléphone", get(o, "phone")),
                               ("Propose", get(o, "what_offers")), ("Recherche", get(o, "what_needs")),
                               ("Rencontres souhaitées", get(o, "preferred_meetings")))),
    "volunteers": dict(
        label="Candidatures de bénévoles", model=VolunteerApplication, qs=lambda: VolunteerApplication.objects.filter(status__in=OPEN),
        title=lambda o: get(o, "name"), subtitle=lambda o: ", ".join(names(o, "missions")) or "Aucune mission précisée", actions=_status_actions,
        details=lambda o: rows(("E-mail", get(o, "email")), ("Téléphone", get(o, "phone")), ("Disponibilités", get(o, "availability")),
                               ("Message", get(o, "message")))),
    "suggestions": dict(
        label="Lieux suggérés pour la carte", model=PlaceSuggestion, qs=lambda: PlaceSuggestion.objects.filter(status__in=OPEN).select_related(),
        title=lambda o: get(o, "name"), subtitle=lambda o: label(o, "category"), actions=_status_actions,
        details=lambda o: rows(("Adresse", get(o, "address")), ("Horaires", get(o, "opening_hours")), ("Téléphone du lieu", get(o, "phone")),
                               ("E-mail du lieu", get(o, "email")), ("Description", get(o, "description")),
                               ("Proposé par", f"{get(o, 'submitter_name')} ({get(o, 'submitter_email')})"))),
    "messages": dict(
        label="Messages reçus", model=ContactMessage, qs=lambda: ContactMessage.objects.filter(is_handled=False),
        title=lambda o: f"{get(o, 'name')} · {label(o, 'subject')}", subtitle=lambda o: get(o, "email"),
        actions=lambda o: [{"id": "handle", "label": "Marquer comme traité", "tone": "primary"}],
        details=lambda o: rows(("Message", get(o, "message")), ("Téléphone", get(o, "phone")), ("Organisation", get(o, "organization")))),
}


def _item(kind, o):
    k = KINDS[kind]
    return {"id": o.pk, "title": k["title"](o), "subtitle": k["subtitle"](o), "created_at": o.created_at.isoformat(),
            "state": k["state"](o) if "state" in k else None, "details": k["details"](o), "actions": k["actions"](o)}


def _apply(kind, obj, action, user):
    """Applique l'action ; retourne le message de confirmation. Lève ValidationError si interdit."""
    if kind == "messages":
        if action != "handle":
            raise ValidationError("Action inconnue.")
        obj.is_handled = True
        obj.save(update_fields=["is_handled", "updated_at"])
        return "Message marqué comme traité."
    if kind == "organizations":
        if action == "publish":
            if obj.validation_status != VS.ACCEPTED:
                raise ValidationError("Acceptez d'abord la fiche avant de la publier.")
            obj.is_published = True
            msg = "Fiche publiée sur le site."
        else:
            status = {"accept": VS.ACCEPTED, "reject": VS.REJECTED, "review": VS.REVIEWING}.get(action)
            if not status:
                raise ValidationError("Action inconnue.")
            obj.validation_status, obj.reviewed_at, obj.reviewed_by = status, timezone.now(), user
            msg = {"accept": "Fiche acceptée (pas encore publiée).", "reject": "Fiche refusée.", "review": "Fiche marquée « en cours d'examen »."}[action]
        obj.save()
        return msg
    status = {"accept": "accepted", "reject": "rejected", "review": "reviewing"}.get(action)
    if not status:
        raise ValidationError("Action inconnue.")
    obj.status = status
    obj.save(update_fields=["status", "updated_at"])
    msg = {"accepted": "Demande acceptée.", "rejected": "Demande refusée.", "reviewing": "Demande marquée « en cours d'examen »."}[status]
    if kind == "suggestions" and status == "accepted" and obj.latitude is not None and obj.longitude is not None:
        MapPlace.objects.create(name=obj.name, category=obj.category, address=obj.address, latitude=obj.latitude,
                                longitude=obj.longitude, description=obj.description, website=obj.website, phone=obj.phone,
                                email=obj.email, opening_hours=obj.opening_hours, image=obj.photo.name if obj.photo else "", is_published=False)
        msg += " Un lieu a été créé en brouillon pour la carte."
    return msg


# ---------- Contenus à publier ----------
def _article_state(a):
    if not a.is_published:
        return "Brouillon"
    return "Publié" if a.published_at and a.published_at <= timezone.now() else "Programmé"


def _content_actions(published):
    return [{"id": "unpublish", "label": "Retirer du site", "tone": "neutral"}] if published else [{"id": "publish", "label": "Publier", "tone": "primary"}]


CONTENT = {"articles": Article, "events": Event}


# ---------- Vues ----------
@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"detail": "ok"})


def _me(user):
    return {"username": user.get_username(), "name": user.get_full_name() or user.get_username(),
            "role": "ADMIN" if user.is_superuser else user.role}


class LoginView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes, throttle_scope = [ScopedRateThrottle], "login"

    def post(self, request):
        user = authenticate(request._request, username=str(request.data.get("username", "")), password=str(request.data.get("password", "")))
        if not is_coordination(user):  # même message pour un mauvais mot de passe et un compte non autorisé
            return Response({"detail": "Identifiant ou mot de passe incorrect."}, status=400)
        login(request._request, user)
        return Response(_me(user))


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request._request)
    return Response({"detail": "Déconnecté."})


@staff_api(["GET"])
def me(request):
    return Response(_me(request.user))


@staff_api(["GET"])
def summary(request):
    now = timezone.now()
    queues = [{"kind": k, "label": v["label"], "count": safe(lambda v=v: v["qs"]().count(), 0, k)} for k, v in KINDS.items()]
    stats = [
        {"label": "Fiches publiées dans l'annuaire", "value": safe(lambda: Organization.objects.public().count(), 0, "orgs")},
        {"label": "Abonnés à la newsletter", "value": safe(lambda: NewsletterSubscriber.objects.filter(is_active=True).count(), 0, "newsletter")},
        {"label": "Événements à venir", "value": safe(lambda: Event.objects.public().filter(start_date__gte=now).count(), 0, "events")},
        {"label": "Articles publiés", "value": safe(lambda: Article.objects.public().count(), 0, "articles")},
        {"label": "Articles en brouillon", "value": safe(lambda: Article.objects.filter(is_published=False).count(), 0, "drafts")},
    ]
    return Response({"queues": queues, "stats": stats, "to_handle": sum(q["count"] for q in queues)})


@staff_api(["GET"])
def queue(request, kind):
    if kind not in KINDS:
        return Response({"detail": "Introuvable."}, status=404)
    return Response({"label": KINDS[kind]["label"], "items": [_item(kind, o) for o in KINDS[kind]["qs"]().order_by("created_at")[:50]]})


@staff_api(["POST"])
def queue_action(request, kind, pk, action):
    if kind not in KINDS:
        return Response({"detail": "Introuvable."}, status=404)
    obj = KINDS[kind]["qs"]().filter(pk=pk).first()
    if obj is None:
        return Response({"detail": "Cet élément a déjà été traité ou n'existe plus."}, status=404)
    try:
        message = _apply(kind, obj, action, request.user)
    except ValidationError as e:
        return Response({"detail": e.messages[0]}, status=400)
    audit(request.user, obj, f"Espace Coordination : {action}")
    return Response({"detail": message})


@staff_api(["GET"])
def content(request):
    articles = [{"id": a.pk, "title": a.title, "state": _article_state(a), "actions": _content_actions(a.is_published),
                 "admin_url": f"/admin/news/article/{a.pk}/change/"} for a in Article.objects.all()[:15]]
    events = [{"id": e.pk, "title": e.title, "state": "Publié" if e.is_published else "Masqué", "actions": _content_actions(e.is_published),
               "admin_url": f"/admin/events/event/{e.pk}/change/"} for e in Event.objects.order_by("-start_date")[:15]]
    return Response({"articles": articles, "events": events})


@staff_api(["POST"])
def content_action(request, kind, pk, action):
    model = CONTENT.get(kind)
    if not model or action not in ("publish", "unpublish"):
        return Response({"detail": "Introuvable."}, status=404)
    obj = model.objects.filter(pk=pk).first()
    if obj is None:
        return Response({"detail": "Élément introuvable."}, status=404)
    obj.is_published = action == "publish"
    obj.save()
    audit(request.user, obj, f"Espace Coordination : {action}")
    return Response({"detail": "Publié sur le site." if obj.is_published else "Retiré du site."})
