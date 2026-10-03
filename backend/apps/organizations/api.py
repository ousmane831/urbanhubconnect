from django_filters import rest_framework as django_filters
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.core.api import TaxonomySerializer
from .models import College, Commission, Organization, Pole, Sector

LIST_FIELDS = ("name", "slug", "logo", "college", "sector", "pole", "neighborhood", "short_description", "member_founder")
DETAIL_FIELDS = LIST_FIELDS + ("description", "address", "latitude", "longitude", "website",
                               "linkedin", "facebook", "instagram", "commissions")


class _Base(serializers.ModelSerializer):
    college = TaxonomySerializer(read_only=True)
    sector = serializers.CharField(read_only=True)
    short_description = serializers.SerializerMethodField()

    def get_short_description(self, obj):
        return obj.description[:200]


class OrganizationListSerializer(_Base):
    class Meta:
        model = Organization
        fields = LIST_FIELDS  # liste blanche explicite : jamais __all__


class OrganizationDetailSerializer(_Base):
    commissions = TaxonomySerializer(many=True, read_only=True)

    class Meta:
        model = Organization
        fields = DETAIL_FIELDS


class OrganizationFilter(django_filters.FilterSet):
    college = django_filters.CharFilter(field_name="college__slug")
    sector = django_filters.CharFilter(field_name="sector")
    commission = django_filters.CharFilter(field_name="commissions__slug", distinct=True)
    founder = django_filters.BooleanFilter(field_name="member_founder")

    class Meta:
        model = Organization
        fields = ["pole"]


class OrganizationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    lookup_field = "slug"
    filterset_class = OrganizationFilter
    search_fields = ["name", "description", "neighborhood"]  # jamais offers/needs (fuite par inférence)
    ordering_fields = ["name", "created_at"]

    def get_queryset(self):
        return (Organization.objects.public()
                .select_related("college").prefetch_related("commissions"))

    def get_serializer_class(self):
        return OrganizationDetailSerializer if self.action == "retrieve" else OrganizationListSerializer

    @action(detail=False, methods=["get"])
    def filters(self, request):
        def tax(model):
            return TaxonomySerializer(model.objects.filter(is_active=True), many=True).data
        return Response({"poles": [{"value": v, "label": l} for v, l in Pole.choices],
                         "colleges": tax(College), "sectors": tax(Sector), "commissions": tax(Commission)})
