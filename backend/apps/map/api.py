from django_filters import rest_framework as django_filters
from rest_framework import generics, serializers, viewsets
from rest_framework.permissions import AllowAny

from .models import MapCategory, MapPlace


class MapCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = MapCategory
        fields = ("name", "slug", "description", "icon")


class MapPlaceSerializer(serializers.ModelSerializer):
    category = MapCategorySerializer(read_only=True)
    is_member = serializers.BooleanField(read_only=True)
    organization = serializers.SerializerMethodField()

    class Meta:
        model = MapPlace
        fields = ("name", "slug", "category", "pole", "description", "address", "latitude", "longitude",
                  "phone", "email", "website", "opening_hours", "image", "is_member", "organization")

    def get_organization(self, obj):
        o = obj.public_organization  # lien exposé seulement si la fiche est publique
        return {"name": o.name, "slug": o.slug} if o else None


class MapPlaceFilter(django_filters.FilterSet):
    category = django_filters.CharFilter(field_name="category__slug")

    class Meta:
        model = MapPlace
        fields = ["pole"]


class MapPlaceViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]
    serializer_class = MapPlaceSerializer
    lookup_field = "slug"
    filterset_class = MapPlaceFilter
    search_fields = ["name", "address", "description"]
    pagination_class = None  # jeu de points curaté et borné, nécessaire d'un bloc pour la carte

    def get_queryset(self):
        return MapPlace.objects.public().select_related("category", "organization")


class MapCategoryListView(generics.ListAPIView):
    permission_classes = [AllowAny]
    serializer_class = MapCategorySerializer
    pagination_class = None

    def get_queryset(self):
        return MapCategory.objects.filter(is_active=True)
