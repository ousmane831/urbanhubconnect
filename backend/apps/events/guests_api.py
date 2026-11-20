"""Lien personnel d'un contact (table du Gala, partenaire, délégation) : il désigne ses invités dans la limite du quota.
Le lien ne donne accès qu'aux invités de ce quota (le référent de délégation ne voit que ses invités)."""
from django.http import Http404
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.core.models import SiteSettings
from . import badges
from .models import GuestQuota


class FormThrottle(ScopedRateThrottle):
    scope = "form"


def _quota(token):
    q = GuestQuota.objects.filter(token=token).first()
    if q is None:
        raise Http404
    return q


def _state(q):
    return {"kind": q.get_kind_display(), "organization": q.organization, "holder": q.holder_name, "quota": q.quota,
            "remaining": q.remaining(), "gala": q.gala_access,
            "guests": [{"id": g.pk, "name": g.name, "job_title": g.job_title, "organization": g.organization,
                        "reference": badges.reference(g), "badge_sent": bool(g.badge_sent_at)}
                       for g in q.active_guests().order_by("created_at")]}


@api_view(["GET", "POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([FormThrottle])
def guests(request, token):
    q = _quota(token)
    if request.method == "GET":
        return Response(_state(q))
    name = str(request.data.get("name", "")).strip()
    if not name:
        return Response({"name": ["Indiquez le prénom et le nom de l'invité."]}, status=400)
    email = str(request.data.get("email", "")).strip()
    try:
        badges.add_guest(q, name, str(request.data.get("job_title", "")), str(request.data.get("organization", "")), email)
    except ValueError as e:
        return Response({"detail": str(e)}, status=400)
    sent_to = email or q.holder_email
    return Response({"detail": f"{name} est ajouté(e). Son badge nominatif est envoyé à {sent_to}.", **_state(q)})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([FormThrottle])
def remove_guest(request, token, pk):
    q = _quota(token)
    g = q.active_guests().filter(pk=pk).first()
    if g is None:
        return Response({"detail": "Invité introuvable."}, status=404)
    badges.cancel(g)  # le badge n'est plus valable ; la place redevient disponible
    return Response({"detail": f"{g.name} est retiré(e) : son badge n'est plus valable.", **_state(q)})


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def gala_info(request):
    """Lien officiel de la billetterie du Gala, s'il est configuré (sinon : demande d'information uniquement)."""
    return Response({"ticket_url": SiteSettings.load().gala_ticket_url or None})
