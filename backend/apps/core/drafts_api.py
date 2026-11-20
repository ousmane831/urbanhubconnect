"""« Enregistrer et reprendre plus tard » pour un dossier long (candidature aux Awards) : le brouillon n'est pas déposé ;
la personne le reprend par un lien personnel temporaire envoyé à son adresse. Les pièces jointes ne sont pas conservées."""
import logging
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework import serializers
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from . import dossiers
from .models import FormDraft

logger = logging.getLogger(__name__)
DAYS = 30
FORMS = {  # formulaire → (adresse de reprise, champs conservés)
    "awards": ("/evenements/grand-week-end-du-pole-2026?brouillon={token}#awards",
               ["category", "category_2", "applicant_name", "organization", "commune", "email", "phone", "description", "evidence",
                "on_behalf", "submitter_name", "candidate_agrees"]),
}


class FormThrottle(ScopedRateThrottle):
    scope = "form"


def _public():
    def decorator(fn):
        fn = throttle_classes([FormThrottle])(fn)
        fn = permission_classes([AllowAny])(fn)
        fn = authentication_classes([])(fn)
        return fn
    return decorator


@api_view(["POST"])
@_public()
def save(request):
    form = str(request.data.get("form", ""))
    if form not in FORMS:
        return Response({"detail": "Formulaire inconnu."}, status=400)
    try:
        email = serializers.EmailField().run_validation(str(request.data.get("email", "")).strip())
    except serializers.ValidationError:
        return Response({"email": ["Saisissez une adresse e-mail valide."]}, status=400)
    raw = request.data.get("data") or {}
    keep = FORMS[form][1]
    data = {k: (v if isinstance(v, bool) else str(v)[:5000]) for k, v in (raw.items() if isinstance(raw, dict) else []) if k in keep}
    token = str(request.data.get("token", ""))
    draft = FormDraft.objects.filter(token=token, form=form).first() if token else None
    if draft is None:
        draft = FormDraft(token=secrets.token_urlsafe(16), form=form)
    draft.email, draft.data = email, data
    draft.save()
    url = dossiers.site() + FORMS[form][0].format(token=draft.token)
    body = (f"Bonjour,\n\nVotre brouillon est enregistré. Il n'est pas encore déposé : pour le reprendre et l'envoyer, ouvrez ce lien "
            f"(valable {DAYS} jours) :\n{url}\n\nLes pièces jointes ne sont pas conservées dans le brouillon : ajoutez-les au moment "
            f"de l'envoi.\n\nUrban Hub Connect\n\n--\n{dossiers.footer()}")
    try:
        send_mail("Votre brouillon de candidature (non déposé)", body, settings.DEFAULT_FROM_EMAIL, [email], fail_silently=False)
    except Exception:
        logger.exception("Lien de brouillon non envoyé")
    return Response({"detail": f"Brouillon enregistré : le lien pour le reprendre est envoyé à {email}. "
                               "Attention, votre candidature n'est pas encore déposée.", "token": draft.token})


@api_view(["GET"])
@_public()
def load(request, token):
    draft = FormDraft.objects.filter(token=token, updated_at__gte=timezone.now() - timedelta(days=DAYS)).first()
    if draft is None:
        return Response({"detail": "Ce brouillon a expiré ou n'existe pas."}, status=410)
    return Response({"form": draft.form, "data": draft.data, "token": draft.token})
