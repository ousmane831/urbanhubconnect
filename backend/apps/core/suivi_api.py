"""Espace de suivi sans compte du Grand Week-End : « Retrouver mon inscription ou mon dossier »."""
import logging

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import dossiers

logger = logging.getLogger(__name__)
SAME_ANSWER = ("Si un dossier correspond à cette adresse, un lien personnel vient d'y être envoyé. Il est valable "
               f"{dossiers.LINK_DAYS} jours. Pensez à vérifier vos courriers indésirables.")
EXPIRED = "Ce lien a expiré ou n'est pas valable. Demandez un nouveau lien ci-dessous."


class FormThrottle(ScopedRateThrottle):
    scope = "form"


def public(methods):
    def decorator(fn):
        fn = throttle_classes([FormThrottle])(fn)
        fn = permission_classes([AllowAny])(fn)
        fn = authentication_classes([])(fn)
        return api_view(methods)(fn)
    return decorator


@public(["POST"])
def request_link(request):
    """Même réponse pour toute adresse : on ne révèle jamais si un dossier existe."""
    field = serializers.EmailField()
    try:
        email = field.run_validation(str(request.data.get("email", "")).strip())
    except serializers.ValidationError:
        return Response({"email": ["Saisissez une adresse e-mail valide."]}, status=400)
    dossiers.send_tracking_link(email)
    return Response({"detail": SAME_ANSWER})


def _mask(email):
    user, _, domain = email.partition("@")
    return f"{user[:2]}{'•' * max(1, len(user) - 2)}@{domain}"


def _dossier(token, kind, pk):
    email = dossiers.email_from(token)
    entry = dossiers.model_for(kind)
    if not email or entry is None:
        return None, None
    obj = entry[0].objects.filter(pk=pk, email__iexact=email).first()
    return email, obj


@public(["GET"])
def tracking(request, token):
    email = dossiers.email_from(token)
    if not email:
        return Response({"detail": EXPIRED}, status=410)
    return Response({"email": _mask(email), "dossiers": [dossiers.public_row(o) for o in dossiers.find(email)]})


@public(["POST"])
def cancel(request, token, kind, pk):
    """Annulation par la personne elle-même (inscription confirmée) : le badge n'est plus valable."""
    from apps.events import badges
    from apps.events.models import EventRequest
    email, obj = _dossier(token, kind, pk)
    if email is None:
        return Response({"detail": EXPIRED}, status=410)
    if not isinstance(obj, EventRequest) or obj.kind not in EventRequest.BADGE_KINDS or obj.status != "accepted":
        return Response({"detail": "Ce dossier ne peut pas être annulé en ligne. Utilisez le formulaire d'assistance."}, status=400)
    badges.cancel(obj)
    dossiers.notify_decision(obj)
    return Response({"detail": f"Votre inscription {badges.reference(obj)} est annulée : le badge n'est plus valable.",
                     "dossier": dossiers.public_row(obj)})


@public(["POST"])
def complete(request, token, kind, pk):
    """Complément demandé par la Coordination : texte ajouté au dossier, qui repasse « en cours d'examen »."""
    email, obj = _dossier(token, kind, pk)
    if email is None:
        return Response({"detail": EXPIRED}, status=410)
    if obj is None or obj.status != "incomplete":
        return Response({"detail": "Aucun complément n'est attendu pour ce dossier."}, status=400)
    text = str(request.data.get("message", "")).strip()
    if not text:
        return Response({"message": ["Saisissez le complément demandé."]}, status=400)
    stamp = timezone.localtime().strftime("%d/%m/%Y %H:%M")
    obj.internal_notes = f"{obj.internal_notes}\n\n[Complément reçu le {stamp}]\n{text[:4000]}".strip()
    obj.status = "reviewing"
    obj.save(update_fields=["internal_notes", "status", "updated_at"])
    ref = dossiers.reference(obj)
    try:  # une seule notification à la Coordination
        send_mail(f"[Site] Complément reçu · {ref}", f"Le dossier {ref} ({dossiers.kind_label(obj)}) a été complété :\n\n{text[:4000]}",
                  settings.DEFAULT_FROM_EMAIL, [settings.CONTACT_RECIPIENT], fail_silently=False)
    except Exception:
        logger.exception("Notification de complément non envoyée (%s)", ref)
    return Response({"detail": "Merci, votre complément est transmis. Votre dossier est de nouveau en cours d'examen.",
                     "dossier": dossiers.public_row(obj)})
