from django.urls import path
from rest_framework import serializers, status
from rest_framework.response import Response

from apps.contact.models import ContactMessage
from apps.events.models import (AwardApplication, AwardCategory, BusinessConnectRegistration, Event, EventRequest,
                                VolunteerApplication, VolunteerMission)
from apps.map.models import MapCategory, PlaceSuggestion
from apps.memberships.models import MembershipApplication, MembershipCategory
from apps.newsletter.models import NewsletterSubscriber
from apps.organizations.models import College, Commission, Organization, Sector
from apps.partnerships.models import PartnershipApplication, PartnershipTier
from apps.press.models import PressAccreditation
from .forms_api import (CleanedModelSerializer, SubmissionCreateView, build_serializer, notify_contact,
                        submission_view)

active = lambda m: m.objects.filter(is_active=True)
college, sector = (active(College), False), (active(Sector), False)
commissions = (active(Commission), False)
CONSENT = lambda *n: {k: serializers.BooleanField(write_only=True) for k in n}

# -- Membership
membership = build_serializer(
    MembershipApplication,
    [
        "organization_or_name", "category", "college", "sector", "pole",
        "representative", "role", "phone", "email", "commissions",
        "offers", "needs", "accept_charter", "accept_privacy",
    ],
    slugs={
        "category": (active(MembershipCategory), True),
        "college": college,
    },
    many_slugs={"commissions": commissions},
    extra=CONSENT("accept_charter", "accept_privacy"),
)
# -- Annuaire : demande de référencement -> fiche "pending", jamais publiée
class OrganizationSubmitSerializer(CleanedModelSerializer):
    college = serializers.SlugRelatedField(slug_field="slug", queryset=active(College))
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
    sector = models.CharField(
    max_length=255,
    verbose_name="secteur"
)
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

    commissions = serializers.SlugRelatedField(slug_field="slug", many=True, required=False, queryset=active(Commission))
    accept_charter = serializers.BooleanField(write_only=True)
    accept_privacy = serializers.BooleanField(write_only=True)

    class Meta:  # liste blanche : validation_status, is_published, member_founder ne sont jamais modifiables ici
        model = Organization
        fields = ["name", "logo", "college", "sector", "commissions", "pole", "neighborhood", "address",
                  "latitude", "longitude", "description", "website", "linkedin", "facebook", "instagram",
                  "representative_name", "representative_role", "phone", "email", "representative_phone",
                  "representative_email", "offers", "needs", "accept_charter", "accept_privacy"]

    def create(self, data):
        data.pop("accept_charter"), data.pop("accept_privacy")
        comms = data.pop("commissions", [])
        org = Organization.objects.create(**data)
        org.commissions.set(comms)
        return org


class NewsletterView(SubmissionCreateView):
    """Idempotent : une adresse déjà inscrite reçoit la même réponse (pas d'énumération d'abonnés)."""
    success_message = "Merci, votre inscription à la newsletter est enregistrée."

    class serializer_class(serializers.Serializer):
        name = serializers.CharField(max_length=150, required=False, allow_blank=True)
        email = serializers.EmailField()
        organization = serializers.CharField(max_length=200, required=False, allow_blank=True)

        def create(self, data):
            email = data.pop("email").strip().lower()
            sub, _ = NewsletterSubscriber.objects.get_or_create(email=email, defaults=data)
            if not sub.is_active:
                sub.is_active = True
                sub.save(update_fields=["is_active", "updated_at"])
            return sub


urlpatterns = [
    path("memberships/", submission_view(membership, name="MembershipCreate")),
    path("organizations/submit/", submission_view(
        OrganizationSubmitSerializer, name="OrganizationSubmit",
        message="Merci. Votre fiche a bien été transmise. La Coordination vous contactera sous 72 heures "
                "pour finaliser votre adhésion et publier votre fiche.")),
    path("partnerships/", submission_view(build_serializer(
        PartnershipApplication, ["company", "tier", "contact_name", "role", "phone", "email", "message", "accept_privacy"],
        slugs={"tier": (active(PartnershipTier), False)}, extra=CONSENT("accept_privacy")), name="PartnershipCreate")),
    path("newsletter/", NewsletterView.as_view()),
    path("contact/", submission_view(build_serializer(
        ContactMessage, ["name", "organization", "phone", "email", "subject", "message", "consent"],
        extra=CONSENT("consent")), "Merci. Votre message a bien été envoyé.", "ContactCreate", notify_contact)),
    path("press/accreditation/", submission_view(build_serializer(
        PressAccreditation, ["media", "name", "role", "phone", "email", "attendance_days"]), name="AccreditationCreate")),
    path("map/suggest/", submission_view(build_serializer(
        PlaceSuggestion, ["name", "category", "address", "latitude", "longitude", "description", "website", "phone",
                          "email", "opening_hours", "photo", "submitter_name", "submitter_email"],
        slugs={"category": (active(MapCategory), True)}),
        "Merci. Votre proposition a bien été transmise : la Coordination vérifie chaque information avant publication.", "PlaceSuggest")),
    path("awards/applications/", submission_view(build_serializer(
        AwardApplication, ["category", "applicant_name", "organization", "email", "phone", "description",
                           "supporting_document", "accept_privacy"],
        slugs={"category": (active(AwardCategory), True)}, extra=CONSENT("accept_privacy")), name="AwardApply")),
    path("business-connect/", submission_view(build_serializer(
        BusinessConnectRegistration, ["event", "participant_name", "organization", "email", "phone", "what_offers",
                                      "what_needs", "preferred_meetings", "accept_privacy"],
        slugs={"event": (Event.objects.public(), True)}, extra=CONSENT("accept_privacy")), name="BusinessConnect")),
    path("event-requests/", submission_view(build_serializer(
        EventRequest, ["kind", "name", "organization", "email", "phone", "circuit", "message", "accept_waiver", "accept_privacy"],
        extra=CONSENT("accept_privacy")), "Merci. Votre demande a bien été transmise. La Coordination vous recontactera rapidement.", "EventRequestCreate")),
    path("volunteers/", submission_view(build_serializer(
        VolunteerApplication, ["name", "email", "phone", "organization", "missions", "availability", "message"],
        many_slugs={"missions": (active(VolunteerMission), False)}), name="VolunteerApply")),
]
