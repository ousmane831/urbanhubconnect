"""API des badges : page « Mon badge » (publique, code secret + clé du titulaire) et accueil le jour J (Coordination).

Sans la clé du titulaire (lien reçu par e-mail), la page publique ne montre aucune identité : c'est ce que voit une personne
qui scanne le QR code avec un téléphone ordinaire."""
from django.db.models import Q
from django.http import Http404, HttpResponse
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle

from apps.core.coordination_api import IsCoordinationStaff, audit, is_coordination, reception_api, staff_api
from . import badges
from .models import CheckIn, EventRequest


def _get(token):
    r = EventRequest.objects.filter(badge_token=token, kind__in=EventRequest.BADGE_KINDS).first()
    if r is None:
        raise Http404
    return r


def _owner(request, token):
    return badges.is_owner(token, request.query_params.get("cle"))


class ResendThrottle(ScopedRateThrottle):
    scope = "form"


# ---------- public ----------
@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def badge_detail(request, token):
    """Titulaire (avec sa clé) : son badge. Sans clé : seulement l'événement, aucune donnée personnelle."""
    r = _get(token)
    if not _owner(request, token):
        return Response({"owner": False, "event": badges.event_info()})
    return Response({"owner": True, **badges.payload(r), "event": badges.event_info()})


@api_view(["POST"])
@authentication_classes([])
@permission_classes([AllowAny])
@throttle_classes([ResendThrottle])
def badge_resend(request, token):
    """« C'est mon badge » : renvoi à l'adresse de l'inscription. Même réponse dans tous les cas (rien n'est révélé)."""
    r = EventRequest.objects.filter(badge_token=token, kind__in=EventRequest.BADGE_KINDS).first()
    if r is not None:
        badges.resend_if_stale(r)
    return Response({"detail": "Si ce badge est valide, il vient d'être renvoyé à l'adresse e-mail utilisée lors de l'inscription. "
                               "Pensez à vérifier vos courriers indésirables."})


def _image_allowed(request, token):
    return _owner(request, token) or IsCoordinationStaff().has_permission(request, None)


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def badge_qr(request, token):
    r = _get(token)
    if not _image_allowed(request, token):
        raise Http404
    response = HttpResponse(badges.qr_png(r), content_type="image/png")
    response["Cache-Control"] = "private, max-age=86400"
    return response


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def badge_image(request, token):
    """Badge complet (PNG) : le même que dans l'e-mail et à l'impression. Titulaire (clé) ou Coordination uniquement."""
    r = _get(token)
    if not _image_allowed(request, token):
        raise Http404
    response = HttpResponse(badges.badge_png(r), content_type="image/png")
    response["Cache-Control"] = "private, max-age=300"  # court : la fonction ou l'organisation peuvent être corrigées
    if request.query_params.get("telecharger"):
        response["Content-Disposition"] = f'attachment; filename="badge-{r.badge_number or 0:04d}-grand-week-end.png"'
    return response


@api_view(["GET"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def badge_pdf(request, token):
    """Badge PDF (97 × 140 mm) à télécharger : titulaire (clé) ou Coordination uniquement."""
    r = _get(token)
    if not _image_allowed(request, token) or not badges.is_confirmed(r):
        raise Http404
    response = HttpResponse(badges.badge_pdf(r), content_type="application/pdf")
    response["Content-Disposition"] = f'attachment; filename="badge-{r.badge_number or 0:04d}-grand-week-end.pdf"'
    response["Cache-Control"] = "private, max-age=300"
    return response


@api_view(["GET"])
@authentication_classes([])
@permission_classes([AllowAny])
def places(request):
    """Jauge du Grand Week-End : la page annonce la liste d'attente quand elle est atteinte."""
    left = badges.places_left()
    return Response({"limited": left is not None, "full": left == 0})


# ---------- accueil (Coordination) ----------
RESULT_MESSAGES = {
    "ok": "Badge valide : arrivée enregistrée.",
    "already": "Déjà enregistré aujourd'hui.",
    "cancelled": "Inscription annulée : badge non valable.",
    "invalid": "Badge inconnu.",
}


@reception_api(["POST"])
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


def _ref_number(q):
    """« GWE-0007 », « 0007 » ou « 7 » : recherche aussi par référence."""
    digits = q.upper().removeprefix("GWE-").strip()
    return int(digits) if digits.isdigit() else -1


def _mask(email):
    user, _, domain = (email or "").partition("@")
    return f"{user[:2]}…@{domain}" if domain else ""


def _person(r, full):
    """Ligne de recherche : l'agent d'accueil ne voit que l'utile (ni téléphone, ni adresse complète)."""
    return {"id": r.pk, "name": r.name, "organization": r.organization, "email": r.email if full else _mask(r.email),
            "phone": r.phone if full else "", "valid": badges.is_confirmed(r), "status": r.get_status_display(),
            "category": badges.category_label(r), "reference": badges.reference(r), "badge_sent": bool(r.badge_sent_at),
            "badge_error": r.badge_error if full else "", "checkins": [c.day.isoformat() for c in r.checkins.all()]}


@reception_api(["GET"])
def checkin_search(request):
    q = str(request.query_params.get("q", "")).strip()
    if len(q) < 2:
        return Response([])
    qs = (EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS)
          .filter(Q(name__icontains=q) | Q(organization__icontains=q) | Q(email__icontains=q) | Q(phone__icontains=q)
                  | Q(badge_number=_ref_number(q)))
          .prefetch_related("checkins")[:20])
    full = is_coordination(request.user)
    return Response([_person(r, full) for r in qs])


@staff_api(["GET"])
def checkin_unsent(request):
    """Badges non envoyés (échec d'envoi ou jamais parti) : à renvoyer ou à corriger (adresse mal saisie)."""
    qs = (EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS, status="accepted", badge_sent_at__isnull=True)
          .prefetch_related("checkins").order_by("created_at")[:100])
    return Response([_person(r, True) for r in qs])


@staff_api(["GET"])
def attendance_export(request):
    """Export des présences pour le bilan (CSV, sans coordonnées)."""
    import csv
    import io
    out = io.StringIO()
    w = csv.writer(out, delimiter=";")
    days = sorted({c.day for c in CheckIn.objects.all()})
    w.writerow(["Référence", "Prénom et nom", "Fonction", "Organisation", "Catégorie", "Statut"] + [f"Présent le {d:%d/%m}" for d in days])
    qs = EventRequest.objects.filter(kind__in=EventRequest.BADGE_KINDS).exclude(badge_number__isnull=True).prefetch_related("checkins").order_by("badge_number")
    for r in qs:
        here = {c.day for c in r.checkins.all()}
        w.writerow([badges.reference(r), r.name, r.job_title, r.organization, badges.category_label(r), r.get_status_display()]
                   + ["oui" if d in here else "" for d in days])
    response = HttpResponse("\ufeff" + out.getvalue(), content_type="text/csv; charset=utf-8")
    response["Content-Disposition"] = 'attachment; filename="presences-grand-week-end.csv"'
    return response


@staff_api(["POST"])
def checkin_reissue(request):
    """Badge perdu ou compromis : nouveau QR code (l'ancien ne passe plus à l'accueil) et nouvel envoi."""
    r = EventRequest.objects.filter(pk=request.data.get("id"), kind__in=EventRequest.BADGE_KINDS, status="accepted").first()
    if r is None:
        return Response({"detail": "Inscription introuvable ou non confirmée."}, status=404)
    sent = badges.reissue(r)
    audit(request.user, r, "Accueil : badge réémis (nouveau QR code)")
    return Response({"detail": f"Nouveau badge émis : l'ancien QR code n'est plus valable. "
                               + (f"Envoyé à {r.email}." if sent else "L'e-mail n'a pas pu partir : renvoyez-le plus tard.")})


@staff_api(["POST"])
def checkin_cancel(request):
    r = EventRequest.objects.filter(pk=request.data.get("id"), kind__in=EventRequest.BADGE_KINDS, status="accepted").first()
    if r is None:
        return Response({"detail": "Inscription introuvable ou déjà annulée."}, status=404)
    badges.cancel(r)
    audit(request.user, r, "Accueil : inscription annulée")
    return Response({"detail": f"Inscription {badges.reference(r)} annulée : le badge n'est plus valable."})


@reception_api(["POST"])
def checkin_resend(request):
    r = EventRequest.objects.filter(pk=request.data.get("id"), kind__in=EventRequest.BADGE_KINDS).first()
    if r is None:
        return Response({"detail": "Inscription introuvable."}, status=404)
    if not badges.send_badge(r):
        return Response({"detail": "Le badge n'a pas pu être envoyé : vérifiez l'adresse e-mail et la configuration d'envoi."}, status=400)
    audit(request.user, r, "Accueil : badge renvoyé")
    return Response({"detail": f"Badge renvoyé à {r.email if is_coordination(request.user) else _mask(r.email)}."})


@reception_api(["GET"])
def checkin_stats(request):
    return Response(badges.stats())


# ---------- badges à imprimer ----------
def _only_new(request):
    return str(request.query_params.get("nouveaux", "")).lower() in ("1", "true", "oui")


@staff_api(["GET"])
def print_list(request):
    """Badges à imprimer, triés par numéro d'inscription (?nouveaux=1 : seulement ceux pas encore imprimés)."""
    all_rows = badges.printable()
    rows = badges.printable(_only_new(request))
    category = str(request.query_params.get("categorie", ""))
    if category:
        rows = rows.filter(badge_category=category)
    return Response({"total": all_rows.count(), "new": all_rows.filter(badge_printed_at__isnull=True).count(),
                     "categories": [{"value": v, "label": l} for v, l in EventRequest.BadgeCategory.choices],
                     "event": badges.event_info(), "badges": [badges.print_row(r) for r in rows]})


@staff_api(["POST"])
def print_done(request):
    """Marque des badges comme imprimés (après impression réussie)."""
    from django.utils import timezone
    ids = [int(i) for i in request.data.get("ids", []) if str(i).isdigit()]
    n = badges.printable().filter(pk__in=ids, badge_printed_at__isnull=True).update(badge_printed_at=timezone.now())
    return Response({"detail": f"{n} badge{'s' if n > 1 else ''} marqué{'s' if n > 1 else ''} comme imprimé{'s' if n > 1 else ''}."})


@staff_api(["GET"])
def qr_archive(request):
    """ZIP des QR codes (un fichier par inscrit, nommé par numéro) et de la liste en CSV."""
    data, n = badges.qr_zip(_only_new(request))
    response = HttpResponse(data, content_type="application/zip")
    suffix = "-nouveaux" if _only_new(request) else ""
    response["Content-Disposition"] = f'attachment; filename="badges-grand-week-end{suffix}.zip"'
    return response
