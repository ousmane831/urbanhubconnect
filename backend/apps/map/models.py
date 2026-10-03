from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import PublishableModel, Submission, Taxonomy
from apps.core.utils import unique_slugify
from apps.core.validators import (LATITUDE_VALIDATORS, LONGITUDE_VALIDATORS, coordinate_errors,
                                  validate_image_extension, validate_upload_size)
from apps.organizations.models import Organization, Pole


class MapCategory(Taxonomy):
    icon = models.CharField("icône (nom Lucide)", max_length=50, blank=True, help_text="ex. landmark, graduation-cap")

    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "catégorie de carte", "catégories de carte"


class MapPlaceQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_published=True, category__is_active=True)


class MapPlace(PublishableModel):
    # Champs publics hérités de l'organisation liée si laissés vides.
    # phone/email de l'organisation ne sont JAMAIS copiés (données privées).
    INHERITED = ("address", "website", "description", "latitude", "longitude", "pole")

    name = models.CharField("nom", max_length=200)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    category = models.ForeignKey(MapCategory, on_delete=models.PROTECT, related_name="places", verbose_name="catégorie")
    organization = models.ForeignKey(Organization, null=True, blank=True, on_delete=models.SET_NULL,
                                     related_name="map_places", verbose_name="organisation membre")
    pole = models.CharField("pôle", max_length=12, choices=Pole.choices, blank=True)
    description = models.TextField(blank=True)
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LATITUDE_VALIDATORS)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LONGITUDE_VALIDATORS)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    website = models.URLField(blank=True)
    opening_hours = models.CharField("horaires", max_length=255, blank=True)
    image = models.ImageField(upload_to="map/places/", blank=True,
                              validators=[validate_image_extension, validate_upload_size])

    objects = MapPlaceQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        verbose_name, verbose_name_plural = "lieu de la carte", "lieux de la carte"

    def __str__(self):
        return self.name

    @property
    def public_organization(self):
        o = self.organization
        return o if o is not None and o.is_public else None

    @property
    def is_member(self):
        return self.public_organization is not None

    def _inherit(self):
        o = self.organization
        if o is None:
            return
        for f in self.INHERITED:
            if getattr(self, f) in (None, "") and getattr(o, f) not in (None, ""):
                setattr(self, f, getattr(o, f))

    def clean(self):
        super().clean()
        self._inherit()
        errors = coordinate_errors(self.latitude, self.longitude)
        if not errors and (self.latitude is None or self.longitude is None):
            errors["latitude"] = "Coordonnées requises (saisies ici ou héritées de l'organisation liée)."
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self._inherit()
        if not self.slug:
            self.slug = unique_slugify(self, self.name, max_length=100)
        super().save(*args, **kwargs)


class PlaceSuggestion(Submission):
    name = models.CharField("nom du lieu", max_length=200)
    category = models.ForeignKey(MapCategory, on_delete=models.PROTECT, related_name="suggestions")
    address = models.CharField(max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LATITUDE_VALIDATORS)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LONGITUDE_VALIDATORS)
    description = models.TextField(blank=True)
    website = models.URLField(blank=True)
    submitter_name = models.CharField(max_length=150)
    submitter_email = models.EmailField()

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "suggestion de lieu", "suggestions de lieu"

    def __str__(self):
        return self.name

    def clean(self):
        super().clean()
        errors = coordinate_errors(self.latitude, self.longitude)
        if errors:
            raise ValidationError(errors)
