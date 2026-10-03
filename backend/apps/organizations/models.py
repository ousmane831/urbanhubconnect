from django.conf import settings
from django.db import models

from apps.core.models import PublishableModel, Taxonomy
from apps.core.utils import unique_slugify
from apps.core.validators import (LATITUDE_VALIDATORS, LONGITUDE_VALIDATORS, coordinate_errors,
                                  validate_image_extension, validate_upload_size)


class College(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "collège", "collèges"


class Sector(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "secteur", "secteurs"


class Commission(Taxonomy):
    number = models.PositiveSmallIntegerField("numéro", unique=True)

    class Meta(Taxonomy.Meta):
        ordering = ["number"]
        verbose_name, verbose_name_plural = "commission", "commissions"


class Pole(models.TextChoices):
    DIAMNIADIO = "DIAMNIADIO", "Diamniadio"
    LAC_ROSE = "LAC_ROSE", "Lac Rose"
    BOTH = "BOTH", "Les deux pôles"


class ValidationStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    REVIEWING = "reviewing", "En cours d'examen"
    ACCEPTED = "accepted", "Acceptée"
    REJECTED = "rejected", "Refusée"


class MembershipStatus(models.TextChoices):
    NONE = "none", "Non adhérent"
    PENDING = "pending", "Adhésion en cours"
    ACTIVE = "active", "Membre actif"


# Champs JAMAIS exposés par l'API publique (réservés aux membres connectés, à partir de 2027).
PRIVATE_FIELDS = ("representative_name", "representative_role", "representative_phone",
                  "representative_email", "phone", "email", "offers", "needs")


class OrganizationQuerySet(models.QuerySet):
    def public(self):
        """Seule source autorisée pour les vues publiques : acceptée ET publiée."""
        return self.filter(is_published=True, validation_status=ValidationStatus.ACCEPTED)


class Organization(PublishableModel):
    name = models.CharField("nom", max_length=200)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    logo = models.ImageField(upload_to="organizations/logos/", blank=True,
                             validators=[validate_image_extension, validate_upload_size])
    college = models.ForeignKey(College, on_delete=models.PROTECT, related_name="organizations", verbose_name="collège")
    sector = models.ForeignKey(Sector, on_delete=models.PROTECT, related_name="organizations", verbose_name="secteur")
    commissions = models.ManyToManyField(Commission, blank=True, related_name="organizations")
    pole = models.CharField("pôle", max_length=12, choices=Pole.choices)
    neighborhood = models.CharField("quartier", max_length=120, blank=True)
    address = models.CharField("adresse", max_length=255, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LATITUDE_VALIDATORS)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True, validators=LONGITUDE_VALIDATORS)
    description = models.TextField("présentation", blank=True)
    website = models.URLField(blank=True)
    linkedin = models.URLField(blank=True)
    facebook = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    member_founder = models.BooleanField("membre fondateur", default=False)
    membership_status = models.CharField(max_length=10, choices=MembershipStatus.choices, default=MembershipStatus.NONE)
    # --- Données PRIVÉES ---
    phone = models.CharField("téléphone de l'organisation", max_length=30, blank=True)
    email = models.EmailField("email de l'organisation", blank=True)
    representative_name = models.CharField("représentant", max_length=150, blank=True)
    representative_role = models.CharField("fonction", max_length=150, blank=True)
    representative_phone = models.CharField("téléphone direct", max_length=30, blank=True)
    representative_email = models.EmailField("email direct", blank=True)
    offers = models.TextField("ce que l'organisation propose", blank=True)
    needs = models.TextField("ce que l'organisation recherche", blank=True)
    # --- Workflow : validation (Coordination) distincte de la publication ---
    validation_status = models.CharField(max_length=10, choices=ValidationStatus.choices,
                                         default=ValidationStatus.PENDING, db_index=True)
    review_notes = models.TextField("notes internes", blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True,
                                    on_delete=models.SET_NULL, related_name="+")

    objects = OrganizationQuerySet.as_manager()

    class Meta:
        ordering = ["name"]
        verbose_name, verbose_name_plural = "organisation", "organisations"

    def __str__(self):
        return self.name

    @property
    def is_public(self):
        return self.is_published and self.validation_status == ValidationStatus.ACCEPTED

    def clean(self):
        super().clean()
        errors = coordinate_errors(self.latitude, self.longitude)
        if self.is_published and self.validation_status != ValidationStatus.ACCEPTED:
            errors["is_published"] = "Une fiche ne peut être publiée que si elle est acceptée."
        if errors:
            from django.core.exceptions import ValidationError
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.name, max_length=100)
        if self.validation_status != ValidationStatus.ACCEPTED:
            self.is_published = False  # invariant garanti même hors admin
        super().save(*args, **kwargs)
