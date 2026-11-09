"""API des badges : page « Mon badge » (publique, par code secret) et accueil le jour J (comptes Coordination uniquement)."""
from django.db.models import Q
from django.http import Http404, HttpResponse
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.coordination_api import audit, staff_api
from . import badges
from .models import EventRequest


def _get(token):
    r = EventRequest.objects.filter(badge_token=token, kind__in=EventRequest.BADGE_KINDS).first()
    if r is None:
        raise Http404
    return r


# ---------- public ----------
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def badge_detail(request, token):
    return Response({**badges.payload(_get(token)), "event": badges.event_info()})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def badge_qr(request, token):
    response = HttpResponse(badges.qr_png(_get(token)), content_type="image/png")
    response["Cache-Control"] = "private, max-age=86400"
    return response


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def planting_seats(request):
    seats = EventRequest.planting_remaining()
    from apps.core.models import SiteSettings
    return Response({"seats": SiteSettings.load().planting_seats, "remaining": seats})


# ---------- accueil (Coordination) ----------
RESULT_MESSAGES = {
    "ok": "Badge valide : arrivée enregistrée.",
    "already": "Déjà enregistré aujourd'hui.",
    "cancelled": "Inscription annulée : badge non valable.",
    "invalid": "Badge inconnu.",
}


@staff_api(["POST"])
def checkin(request):
    """Scan d'un badge (contenu du QR code) ou validation manuelle (id d'une inscription trouvée par la recherche)."""
    if request.data.get("id"):
        r = EventRequest.objects.filter(pk=request.data["id"], kind__in=EventRequest.BADGE_KINDS).first()
    else:
        r = badges.find_by_code(str(request.data.get("code", "")))
    if r is None:
        return Response({"result": "invalid", "message": RESULT_MESSAGES["invalid"]})
    result, data = badges.check_in(r, request.user)
    if result == "ok":
        audit(request.user, r, "Accueil : arrivée enregistrée")
    return Response({"result": result, "message": RESULT_MESSAGES[result], "id": r.pk, **data})


@staff_api(["GET"])
def checkin_search(request):
    q = str(request.query_params.get("q", "")).strip()
    if len(q) < 2:
        return Response([])
    qs = (EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS)
          .filter(Q(name__icontains=q) | Q(organization__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q))
          .prefetch_related("checkins")[:20])
    return Response([{"id": r.pk, "name": r.name, "organization": r.organization, "email": r.email, "phone": r.phone,
                      "valid": r.status != "rejected", "planting": r.wants_planting, "badge_sent": bool(r.badge_sent_at),
                      "checkins": [c.day.isoformat() for c in r.checkins.all()]} for r in qs])


@staff_api(["POST"])
def checkin_resend(request):
    r = EventRequest.objects.filter(pk=request.data.get("id"), kind__in=EventRequest.BADGE_KINDS).first()
    if r is None:
        return Response({"detail": "Inscription introuvable."}, status=404)
    if not badges.send_badge(r):
        return Response({"detail": "Le badge n'a pas pu être envoyé : vérifiez l'adresse e-mail et la configuration d'envoi."}, status=400)
    audit(request.user, r, "Accueil : badge renvoyé")
    return Response({"detail": f"Badge renvoyé à {r.email}."})


@staff_api(["GET"])
def checkin_stats(request):
    return Response(badges.stats())
