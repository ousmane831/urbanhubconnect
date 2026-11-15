"""API des campagnes : onglet « Campagnes » de l'Espace Coordination, et désinscription publique (lien dans chaque e-mail)."""
import logging

from django.conf import settings
from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, parser_classes, permission_classes, throttle_classes
from rest_framework.parsers import JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle

from apps.core.coordination_api import audit, staff_api

from . import sender
from .importer import ImportError_, import_contacts
from .models import Campaign, Contact

logger = logging.getLogger(__name__)
MAX_UPLOAD = 5 * 1024 * 1024


class CampaignSerializer(serializers.ModelSerializer):
    class Meta:
        model = Campaign
        fields = ["title", "subject", "body", "cta_label", "cta_url", "segments", "activities", "frequency", "weekday",
                  "send_time", "start_date", "end_date"]

    def validate_segments(self, v):
        return self._labels(v)

    def validate_activities(self, v):
        return self._labels(v)

    def _labels(self, v):
        if not isinstance(v, list) or not all(isinstance(x, str) for x in v):
            raise serializers.ValidationError("Liste de valeurs attendue.")
        return sorted({x.strip() for x in v if x.strip()})

    def validate_weekday(self, v):
        if not 0 <= v <= 6:
            raise serializers.ValidationError("Jour invalide.")
        return v

    def validate(self, data):
        start, end = data.get("start_date"), data.get("end_date")
        if start and end and end < start:
            raise serializers.ValidationError({"end_date": "La date de fin doit suivre la date de début."})
        if bool(data.get("cta_label")) != bool(data.get("cta_url")):
            raise serializers.ValidationError({"cta_url": "Renseignez à la fois le texte et le lien du bouton, ou aucun des deux."})
        return data


def _first_error(errors):
    for field, msgs in errors.items():
        msg = msgs[0] if isinstance(msgs, list) else msgs
        return str(msg) if field == "non_field_errors" else f"{field} : {msg}"
    return "Données invalides."


def _actions(c):
    S = Campaign.Status
    acts = []
    if c.status in (S.DRAFT, S.PAUSED):
        acts += ["edit", "activate"]
    if c.status == S.ACTIVE:
        acts.append("pause")
    acts += ["test", "duplicate"]
    if c.status == S.DRAFT or (c.status != S.ACTIVE and not c.deliveries.exists()):
        acts.append("delete")
    return acts


def _campaign(c, now):
    nxt = sender.next_send(c, now)
    return {"id": c.pk, **CampaignSerializer(c).data, "status": c.status, "status_label": c.get_status_display(),
            "schedule": sender.schedule_label(c), "recipients": sender.recipients(c).count(),
            "next_send": nxt.isoformat() if nxt else None, "stats": sender.stats(c), "actions": _actions(c)}


def _values(field):
    rows = (Contact.objects.filter(unsubscribed_at__isnull=True).exclude(**{field: ""})
            .values(field).annotate(n=Count("id")).order_by(field))
    return [{"value": r[field], "count": r["n"]} for r in rows]


@staff_api(["GET"])
def overview(request):
    now = timezone.localtime()
    total = Contact.objects.count()
    unsub = Contact.objects.filter(unsubscribed_at__isnull=False).count()
    return Response({
        "contacts": {"total": total, "active": total - unsub, "unsubscribed": unsub,
                     "segments": _values("segment"), "activities": _values("activity")},
        "campaigns": [_campaign(c, now) for c in Campaign.objects.all()[:50]],
        "sending": {"problem": sender.config_problem(), "daily_limit": settings.CAMPAIGN_DAILY_LIMIT,
                    "sent_today": sender.sent_today(now), "from": settings.CAMPAIGN_FROM_EMAIL},
    })


@staff_api(["GET"])
def contacts(request):
    qs = Contact.objects.all()
    q = request.query_params.get("search", "").strip()
    if q:
        qs = qs.filter(Q(email__icontains=q) | Q(organization__icontains=q) | Q(name__icontains=q)
                       | Q(segment__icontains=q) | Q(activity__icontains=q))
    return Response([{"id": c.pk, "email": c.email, "organization": c.organization, "name": c.name, "segment": c.segment,
                      "activity": c.activity, "unsubscribed": bool(c.unsubscribed_at)} for c in qs[:100]])


@staff_api(["POST"])
@parser_classes([MultiPartParser])
def contacts_import(request):
    f = request.FILES.get("file")
    if not f:
        return Response({"detail": "Choisissez un fichier Excel (.xlsx) ou CSV."}, status=400)
    if f.size > MAX_UPLOAD:
        return Response({"detail": "Fichier trop volumineux (5 Mo au maximum)."}, status=400)
    try:
        result = import_contacts(f.name, f.read())
    except ImportError_ as e:
        return Response({"detail": str(e)}, status=400)
    logger.info("Campagnes : import de contacts par %s (%s)", request.user, result)
    return Response(result)


@staff_api(["POST"])
def contact_toggle(request, pk):
    """Retire un contact des envois (ou le réintègre, s'il ne s'était pas désinscrit lui-même : réservé à l'admin)."""
    c = get_object_or_404(Contact, pk=pk)
    if c.unsubscribed_at:
        return Response({"detail": "Ce contact s'est désinscrit : il ne peut être réintégré que s'il le demande (administration)."}, status=400)
    c.unsubscribed_at = timezone.now()
    c.save(update_fields=["unsubscribed_at", "updated_at"])
    return Response({"detail": f"{c.email} ne recevra plus de campagnes."})


@staff_api(["POST"])
@parser_classes([JSONParser])
def campaign_create(request):
    s = CampaignSerializer(data=request.data)
    if not s.is_valid():
        return Response({"detail": _first_error(s.errors)}, status=400)
    c = s.save(created_by=request.user)
    audit(request.user, c, "Campagne créée")
    return Response(_campaign(c, timezone.localtime()), status=201)


@staff_api(["PUT"])
@parser_classes([JSONParser])
def campaign_update(request, pk):
    c = get_object_or_404(Campaign, pk=pk)
    if c.status not in (Campaign.Status.DRAFT, Campaign.Status.PAUSED):
        return Response({"detail": "Mettez d'abord la campagne en pause pour la modifier."}, status=400)
    s = CampaignSerializer(c, data=request.data)
    if not s.is_valid():
        return Response({"detail": _first_error(s.errors)}, status=400)
    s.save()
    audit(request.user, c, "Campagne modifiée")
    return Response(_campaign(c, timezone.localtime()))


@staff_api(["POST"])
@parser_classes([JSONParser])
def campaign_preview(request):
    """Aperçu de l'e-mail tel que le recevra le premier destinataire, et nombre de destinataires."""
    s = CampaignSerializer(data=request.data, partial=True)  # aperçu possible avant que tout soit rempli
    c = Campaign(**s.validated_data) if s.is_valid() else Campaign(
        subject=str(request.data.get("subject", "")), body=str(request.data.get("body", "")))
    subject, _, html = sender.render(c, sender.sample_contact(c))
    return Response({"subject": subject, "html": html, "recipients": sender.recipients(c).count(),
                     "schedule": sender.schedule_label(c) if c.start_date else ""})


@staff_api(["POST"])
@parser_classes([JSONParser])
def campaign_action(request, pk, action):
    c = get_object_or_404(Campaign, pk=pk)
    S = Campaign.Status
    if action not in _actions(c):
        return Response({"detail": "Action impossible dans l'état actuel de la campagne."}, status=400)

    if action == "test":
        address = (request.data.get("email") or request.user.email or "").strip()
        if not address:
            return Response({"detail": "Indiquez l'adresse qui doit recevoir le test."}, status=400)
        problem = sender.config_problem()
        if problem:
            return Response({"detail": problem}, status=400)
        try:
            sender.send_test(c, address)
        except Exception:
            logger.exception("Campagne %s : test non envoyé", c.pk)
            return Response({"detail": "Le test n'a pas pu partir. Vérifiez la configuration du service d'envoi."}, status=502)
        return Response({"detail": f"E-mail de test envoyé à {address}."})

    if action == "activate":
        problem = sender.config_problem()
        if problem:
            return Response({"detail": problem}, status=400)
        n = sender.recipients(c).count()
        if not n:
            return Response({"detail": "Aucun destinataire ne correspond aux segments et activités choisis."}, status=400)
        today = timezone.localdate()
        if c.end_date and c.end_date < today:
            return Response({"detail": "La date de fin est déjà passée : modifiez-la avant de programmer la campagne."}, status=400)
        c.status, c.activated_at = S.ACTIVE, timezone.now()
        c.save(update_fields=["status", "activated_at", "updated_at"])
        audit(request.user, c, f"Campagne programmée ({n} destinataires)")
        return Response({"detail": f"Campagne programmée : {sender.schedule_label(c)}, {n} destinataires."})

    if action == "pause":
        c.status = S.PAUSED
        c.save(update_fields=["status", "updated_at"])
        audit(request.user, c, "Campagne mise en pause")
        return Response({"detail": "Campagne en pause : plus aucun envoi jusqu'à sa reprise."})

    if action == "duplicate":
        data = CampaignSerializer(c).data
        copy = CampaignSerializer(data={**data, "title": f"{c.title} (copie)", "start_date": max(c.start_date, timezone.localdate())})
        copy.is_valid(raise_exception=True)
        copy.save(created_by=request.user)
        return Response({"detail": "Copie créée en brouillon."})

    if action == "delete":
        audit(request.user, c, "Campagne supprimée")
        c.delete()
        return Response({"detail": "Campagne supprimée."})

    return Response({"detail": "Modifiez la campagne depuis le formulaire."}, status=400)


# ---------- Désinscription publique ----------
class UnsubscribeThrottle(AnonRateThrottle):
    rate = "60/hour"


def _masked(email):
    local, _, domain = email.partition("@")
    return f"{local[:2]}{'•' * max(len(local) - 2, 1)}@{domain}"


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([UnsubscribeThrottle])
def unsubscribe(request, token):
    """GET : état (pour la page de confirmation). POST : désinscription (bouton de la page, ou « un clic » des messageries)."""
    c = Contact.objects.filter(token=token).first()
    if c is None:
        return Response({"detail": "Ce lien de désinscription n'est pas valide."}, status=404)
    if request.method == "POST" and not c.unsubscribed_at:
        c.unsubscribed_at = timezone.now()
        c.save(update_fields=["unsubscribed_at", "updated_at"])
        logger.info("Campagnes : désinscription de %s", c.email)
    return Response({"email": _masked(c.email), "unsubscribed": bool(c.unsubscribed_at)})
