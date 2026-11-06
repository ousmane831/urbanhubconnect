"""API de l'Espace membres : mises en relation, annonces Urban Opportunities, documents réservés."""
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import generics, serializers
from rest_framework.authentication import SessionAuthentication
from rest_framework.response import Response

from apps.core.members_api import IsActiveMember, member_api
from apps.documents.models import MemberDocument
from apps.memberships import network
from apps.memberships.models import ConnectionRequest, Opportunity, OpportunityType


def _org(o):
    return {"name": o.name, "slug": o.slug}


# ---------- mises en relation ----------
def _request_payload(r):
    return {"id": r.pk, "organization": _org(r.recipient), "opportunity": r.opportunity.title if r.opportunity else None, "message": r.message,
            "status": r.status, "status_label": r.get_status_display(), "created_at": r.created_at.isoformat(),
            "forwarded_at": r.forwarded_at.isoformat() if r.forwarded_at else None}


@member_api(["GET", "POST"])
def connections(request):
    m = request.membership
    if request.method == "GET":
        qs = ConnectionRequest.objects.filter(sender=m).select_related("recipient", "opportunity")[:50]
        return Response([_request_payload(r) for r in qs])
    org = get_object_or_404(network.directory_queryset(), slug=str(request.data.get("organization", "")))
    try:
        req = network.create_request(m, org, request.data.get("message", ""))
    except network.NetworkError as e:
        return Response({"detail": str(e)}, status=400)
    return Response({"detail": "Votre demande est enregistrée : la Coordination la transmettra à l'organisation.", "request": _request_payload(req)}, status=201)


# ---------- annonces ----------
class OpportunityOutSerializer(serializers.ModelSerializer):
    type = serializers.SlugRelatedField(slug_field="slug", read_only=True)
    type_name = serializers.CharField(source="type.name", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    organization = serializers.SerializerMethodField()
    mine = serializers.SerializerMethodField()

    class Meta:
        model = Opportunity
        fields = ("id", "title", "type", "type_name", "description", "deadline", "status", "status_label", "published_at", "created_at", "organization", "mine")

    def get_organization(self, o):
        return _org(o.organization)

    def get_mine(self, o):
        return bool(self.context["request"].membership.organization_id) and o.organization_id == self.context["request"].membership.organization_id


class OpportunityInSerializer(serializers.Serializer):
    type = serializers.SlugRelatedField(slug_field="slug", queryset=OpportunityType.objects.filter(is_active=True))
    title = serializers.CharField(max_length=150)
    description = serializers.CharField(max_length=2000)
    deadline = serializers.DateField(required=False, allow_null=True)

    def validate_deadline(self, v):
        if v and v < timezone.localdate():
            raise serializers.ValidationError("La date limite ne peut pas être passée.")
        return v


class OpportunitiesView(generics.ListCreateAPIView):
    authentication_classes, permission_classes = [SessionAuthentication], [IsActiveMember]
    serializer_class = OpportunityOutSerializer

    def get_queryset(self):
        qs, p, m = Opportunity.objects.select_related("organization", "type"), self.request.query_params, self.request.membership
        if p.get("mine") == "true":
            qs = qs.filter(organization_id=m.organization_id) if m.organization_id else qs.none()
        else:
            qs = qs.open()  # les autres membres ne voient que les annonces publiées et non échues
        if p.get("type"):
            qs = qs.filter(type__slug=p["type"])
        if p.get("search"):
            qs = qs.filter(title__icontains=p["search"]) | qs.filter(description__icontains=p["search"])
        return qs.order_by("-published_at", "-created_at")

    def create(self, request, *args, **kwargs):
        ser = OpportunityInSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            o = network.publish_opportunity(request.membership, ser.validated_data, request.user)
        except network.NetworkError as e:
            return Response({"detail": str(e)}, status=400)
        detail = ("Merci. Votre annonce sera publiée après validation par la Coordination." if o.status == "pending" else "Votre annonce est publiée.")
        return Response({"detail": detail, "opportunity": OpportunityOutSerializer(o, context=self.get_serializer_context()).data}, status=201)


class OpportunityTypesView(generics.ListAPIView):
    authentication_classes, permission_classes, pagination_class = [SessionAuthentication], [IsActiveMember], None
    queryset = OpportunityType.objects.filter(is_active=True)

    def list(self, request, *args, **kwargs):
        return Response([{"name": t.name, "slug": t.slug} for t in self.get_queryset()])


def _own(request, pk):
    return get_object_or_404(Opportunity, pk=pk, organization_id=request.membership.organization_id or 0)


@member_api(["POST"])
def opportunity_update(request, pk):
    o = _own(request, pk)
    ser = OpportunityInSerializer(data=request.data)
    ser.is_valid(raise_exception=True)
    try:
        network.update_opportunity(o, ser.validated_data)
    except network.NetworkError as e:
        return Response({"detail": str(e)}, status=400)
    return Response({"detail": "Annonce modifiée." if o.status == "published" else "Annonce modifiée : elle sera republiée après validation par la Coordination."})


@member_api(["POST"])
def opportunity_close(request, pk):
    try:
        network.close_opportunity(_own(request, pk))
    except network.NetworkError as e:
        return Response({"detail": str(e)}, status=400)
    return Response({"detail": "Annonce clôturée."})


@member_api(["POST"])
def opportunity_respond(request, pk):
    o = get_object_or_404(Opportunity.objects.open().select_related("organization"), pk=pk)
    try:
        req = network.create_request(request.membership, o.organization, request.data.get("message", ""), opportunity=o)
    except network.NetworkError as e:
        return Response({"detail": str(e)}, status=400)
    detail = "Votre réponse a été transmise à l'organisation." if req.status == "forwarded" else "Votre réponse est enregistrée : la Coordination la transmettra."
    return Response({"detail": detail, "request": _request_payload(req)}, status=201)


# ---------- documents réservés ----------
@member_api(["GET"])
def documents(request):
    return Response([{"id": d.pk, "title": d.title, "category": d.category, "category_label": d.get_category_display(), "description": d.description,
                      "published_on": d.published_on.isoformat(), "download_url": f"/api/members/documents/{d.pk}/download/"}
                     for d in MemberDocument.objects.published()])


@member_api(["GET"])
def document_download(request, pk):
    doc = get_object_or_404(MemberDocument.objects.published(), pk=pk)
    try:
        handle = doc.file.open("rb")
    except FileNotFoundError:
        raise Http404("Fichier introuvable.")
    return FileResponse(handle, as_attachment=True, filename=f"{slugify(doc.title)[:60] or 'document'}.pdf", content_type="application/pdf")
