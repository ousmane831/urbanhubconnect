"""API Business Connect : créneaux publiés (public) et tableau des rendez-vous (Coordination)."""
from django.core.exceptions import ValidationError
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.coordination_api import audit, staff_api
from . import business_connect as bc
from .models import BusinessConnectMeeting as Meeting, BusinessConnectRegistration as Registration, BusinessConnectSlot as Slot


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def public_slots(request):
    """Créneaux approuvés uniquement : aucun créneau non publié n'est proposé au public."""
    return Response([{"id": s.pk, "label": str(s)} for s in Slot.objects.filter(is_published=True)])


def _error(e):
    return Response({"detail": " ".join(e.messages)}, status=400)


@staff_api(["GET"])
def board(request):
    return Response(bc.board())


@staff_api(["POST"])
def meeting_create(request):
    try:
        m = bc.create(int(request.data.get("first", 0) or 0), int(request.data.get("second", 0) or 0),
                      int(request.data.get("slot", 0) or 0), request.data.get("table", ""))
    except (ValidationError, ValueError) as e:
        return _error(e) if isinstance(e, ValidationError) else Response({"detail": "Données invalides."}, status=400)
    audit(request.user, m, "Business Connect : rendez-vous proposé")
    return Response({"detail": "Rendez-vous proposé : il n'est pas encore communiqué. Confirmez-le pour prévenir les deux participants.",
                     "board": bc.board()})


def _meeting(pk):
    return Meeting.objects.select_related("first", "second", "slot").filter(pk=pk).first()


@staff_api(["POST"])
def meeting_confirm(request, pk):
    m = _meeting(pk)
    if m is None:
        return Response({"detail": "Rendez-vous introuvable."}, status=404)
    try:
        sent = bc.confirm(m)
    except ValidationError as e:
        return _error(e)
    audit(request.user, m, "Business Connect : rendez-vous confirmé")
    return Response({"detail": f"Rendez-vous confirmé : {sent} e-mail(s) envoyé(s) aux participants.", "board": bc.board()})


@staff_api(["POST"])
def meeting_release(request, pk):
    m = _meeting(pk)
    if m is None:
        return Response({"detail": "Rendez-vous introuvable."}, status=404)
    sent = bc.release(m)
    audit(request.user, m, "Business Connect : créneau libéré")
    return Response({"detail": "Créneau libéré." + (f" Les participants sont prévenus ({sent} e-mail(s))." if sent else ""),
                     "board": bc.board()})


@staff_api(["POST"])
def agenda(request, pk):
    reg = Registration.objects.filter(pk=pk).first()
    if reg is None:
        return Response({"detail": "Participant introuvable."}, status=404)
    try:
        sent = bc.send_agenda(reg)
    except ValidationError as e:
        return _error(e)
    audit(request.user, reg, "Business Connect : agenda envoyé")
    return Response({"detail": f"Agenda envoyé à {reg.email}." if sent else "L'e-mail n'a pas pu partir."})
