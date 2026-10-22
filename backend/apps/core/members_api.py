"""API de l'Espace membres : réservée aux membres à jour de leur cotisation (authentification par session, vérifiée à chaque requête)."""
from django.contrib.auth import authenticate, login, logout
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.decorators import api_view, authentication_classes, permission_classes
from rest_framework.permissions import AllowAny, BasePermission
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.core.validators import coordinate_errors, validate_image_extension, validate_upload_size
from apps.memberships import accounts
from apps.organizations.api import OrganizationDetailSerializer, OrganizationFilter, OrganizationListSerializer
from apps.organizations.models import Organization
from apps.users.models import User


class IsActiveMember(BasePermission):
    def has_permission(self, request, view):
        request.membership = accounts.current_membership(request.user)
        return request.membership is not None


def member_api(methods):
    """Vue réservée aux membres à jour. Ordre voulu : permissions et authentification posées AVANT api_view."""
    def decorator(fn):
        fn = permission_classes([IsActiveMember])(fn)
        fn = authentication_classes([SessionAuthentication])(fn)
        return api_view(methods)(fn)
    return decorator


def _membership_payload(m):
    return {"reference": m.reference, "status": m.get_status_display(), "valid_until": m.valid_until.isoformat() if m.valid_until else None,
            "is_founder": m.is_founder, "category": m.category.name if m.category else "", "organization": m.organization.name if m.organization else ""}


def _me(user):
    m = accounts.current_membership(user)
    return {"name": user.get_full_name() or user.email, "email": user.email, **(_membership_payload(m) if m else {})}


# ---------- connexion ----------
class LoginView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes, throttle_scope = [ScopedRateThrottle], "login"

    def post(self, request):
        ident = str(request.data.get("identifier", "")).strip().lower()
        user = authenticate(request._request, username=ident, password=str(request.data.get("password", "")))
        if user is None or user.role != User.Role.MEMBER or user.is_superuser:  # même message : aucun indice sur les comptes
            return Response({"detail": "Identifiant ou mot de passe incorrect."}, status=400)
        if accounts.current_membership(user) is None:
            return Response({"detail": "Votre accès est suspendu : votre cotisation n'est pas à jour. Contactez la Coordination."}, status=400)
        login(request._request, user)
        return Response(_me(user))


@api_view(["POST"])
@authentication_classes([SessionAuthentication])
@permission_classes([AllowAny])
def logout_view(request):
    logout(request._request)
    return Response({"detail": "Déconnecté."})


@member_api(["GET"])
def me(request):
    return Response(_me(request.user))


class PasswordResetRequestView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes, throttle_scope = [ScopedRateThrottle], "login"

    def post(self, request):
        accounts.request_password_reset(str(request.data.get("email", "")))
        return Response({"detail": "Si cette adresse correspond à un compte membre, un e-mail vient d'être envoyé."})


class SetPasswordView(APIView):
    authentication_classes, permission_classes = [], [AllowAny]
    throttle_classes, throttle_scope = [ScopedRateThrottle], "login"

    def post(self, request):
        try:
            accounts.set_password(str(request.data.get("uid", "")), str(request.data.get("token", "")), str(request.data.get("password", "")))
        except accounts.AccountError as e:
            return Response({"detail": str(e)}, status=400)
        return Response({"detail": "Votre mot de passe est enregistré. Vous pouvez vous connecter."})


# ---------- profil ----------
class ProfileSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=500, allow_blank=True, required=False)
    website = serializers.URLField(max_length=200, allow_blank=True, required=False)
    linkedin = serializers.URLField(max_length=200, allow_blank=True, required=False)
    facebook = serializers.URLField(max_length=200, allow_blank=True, required=False)
    instagram = serializers.URLField(max_length=200, allow_blank=True, required=False)
    neighborhood = serializers.CharField(max_length=120, allow_blank=True, required=False)
    address = serializers.CharField(max_length=255, allow_blank=True, required=False)
    latitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=9, decimal_places=6, required=False, allow_null=True)
    phone = serializers.CharField(max_length=30, allow_blank=True, required=False)
    email = serializers.EmailField(allow_blank=True, required=False)
    representative_name = serializers.CharField(max_length=150, allow_blank=True, required=False)
    representative_role = serializers.CharField(max_length=150, allow_blank=True, required=False)
    representative_phone = serializers.CharField(max_length=30, allow_blank=True, required=False)
    representative_email = serializers.EmailField(allow_blank=True, required=False)
    offers = serializers.CharField(max_length=2000, allow_blank=True, required=False)
    needs = serializers.CharField(max_length=2000, allow_blank=True, required=False)
    logo = serializers.ImageField(required=False, validators=[validate_image_extension, validate_upload_size])

    def validate(self, attrs):
        if "latitude" in attrs or "longitude" in attrs:
            errors = coordinate_errors(attrs.get("latitude"), attrs.get("longitude"))
            if errors:
                raise serializers.ValidationError(errors)
        return attrs


def _profile_payload(m):
    org = m.organization
    pending = accounts.pending_change(org) if org else None
    return {
        "membership": _membership_payload(m),
        "organization": ({"name": org.name, "logo": org.logo.url if org.logo else None, **accounts.current_values(org)} if org else None),
        "pending": ({"fields": [accounts.LABELS[f] for f in pending.changes] + (["Logo"] if pending.logo else []),
                     "since": pending.created_at.isoformat()} if pending else None),
        "listing": {"published": bool(org and org.is_published), "hidden_by_member": bool(org and org.hidden_by_member),
                    "public_listing": bool(m.category and m.category.public_listing),
                    "validated": bool(org and org.validation_status == "accepted")},
    }


@member_api(["GET", "POST"])
def profile(request):
    m = request.membership
    if request.method == "GET":
        return Response(_profile_payload(m))
    ser = ProfileSerializer(data=request.data, partial=True)
    ser.is_valid(raise_exception=True)
    data = dict(ser.validated_data)
    logo = data.pop("logo", None)
    try:
        result = accounts.submit_profile(m, data, logo, request.user)
    except accounts.AccountError as e:
        return Response({"detail": str(e)}, status=400)
    if result["pending"]:
        detail = "Merci. Vos informations privées sont à jour ; la partie publique de votre fiche sera mise en ligne après validation par la Coordination."
    elif result["applied"]:
        detail = "Vos informations sont enregistrées."
    else:
        detail = "Aucune modification à enregistrer."
    return Response({"detail": detail, **_profile_payload(m)})


@member_api(["POST"])
def listing(request):
    action = request.data.get("action")
    try:
        if action == "hide":
            accounts.hide_listing(request.membership)
            detail = "Votre fiche est retirée de l'Annuaire. Vous pouvez la remettre en ligne à tout moment."
        elif action == "show":
            accounts.show_listing(request.membership)
            detail = "Votre fiche est de nouveau visible dans l'Annuaire."
        else:
            return Response({"detail": "Action inconnue."}, status=400)
    except accounts.AccountError as e:
        return Response({"detail": str(e)}, status=400)
    return Response({"detail": detail, **_profile_payload(request.membership)})


# ---------- annuaire complet ----------
def directory_queryset():
    """Seules les organisations membres à jour de leur cotisation, dont la fiche est publiée."""
    return (Organization.objects.public()
            .filter(membership__status="active", membership__valid_until__gte=timezone.localdate())
            .select_related().prefetch_related("commissions"))


class MemberOrganizationDetailSerializer(OrganizationDetailSerializer):
    class Meta(OrganizationDetailSerializer.Meta):
        fields = OrganizationDetailSerializer.Meta.fields + ("offers", "needs")  # réservés aux membres connectés


class MemberDirectoryList(generics.ListAPIView):
    authentication_classes, permission_classes = [SessionAuthentication], [IsActiveMember]
    serializer_class = OrganizationListSerializer
    filterset_class = OrganizationFilter
    search_fields = ["name", "description", "neighborhood", "offers", "needs"]  # les membres peuvent chercher dans les offres et besoins
    ordering_fields = ["name"]

    def get_queryset(self):
        return directory_queryset()


class MemberDirectoryDetail(generics.RetrieveAPIView):
    authentication_classes, permission_classes = [SessionAuthentication], [IsActiveMember]
    serializer_class = MemberOrganizationDetailSerializer
    lookup_field = "slug"

    def get_queryset(self):
        return directory_queryset()


@member_api(["POST"])
def reveal_contact(request, slug):
    org = get_object_or_404(directory_queryset(), slug=slug)
    try:
        return Response(accounts.reveal_contact(request.user, org))
    except accounts.AccountError as e:
        return Response({"detail": str(e)}, status=400)
