from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import PublishableModel, Submission, Taxonomy
from apps.core.utils import unique_slugify
from apps.core.validators import validate_image_extension, validate_pdf, validate_upload_size


class EventCategory(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "type d'événement", "types d'événement"


class EventQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_published=True)


class Event(PublishableModel):
    title = models.CharField("titre", max_length=200)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    category = models.ForeignKey(EventCategory, on_delete=models.PROTECT, related_name="events", verbose_name="type")
    description = models.TextField(blank=True)
    audience = models.CharField("public", max_length=200, blank=True)
    start_date = models.DateTimeField("début")
    end_date = models.DateTimeField("fin", null=True, blank=True)
    location = models.CharField("lieu", max_length=255, blank=True)
    image = models.ImageField(upload_to="events/", blank=True, validators=[validate_image_extension, validate_upload_size])
    registration_url = models.URLField("lien d'inscription", blank=True)
    is_featured = models.BooleanField("à la une", default=False)

    objects = EventQuerySet.as_manager()

    class Meta:
        ordering = ["start_date"]
        verbose_name, verbose_name_plural = "événement", "événements"

    def __str__(self):
        return self.title

    def clean(self):
        super().clean()
        if self.end_date and self.start_date and self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fin ne peut pas précéder le début."})

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=100)
        super().save(*args, **kwargs)


class AwardCategory(Taxonomy):
    criteria = models.TextField("critères", blank=True, help_text="[à compléter]")

    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "catégorie d'Awards", "catégories d'Awards"


class AwardApplication(Submission):
    category = models.ForeignKey(AwardCategory, on_delete=models.PROTECT, related_name="applications")
    applicant_name = models.CharField("organisation ou personne", max_length=200)
    organization = models.CharField(max_length=200, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    description = models.TextField()
    supporting_document = models.FileField(upload_to="awards/", blank=True, validators=[validate_pdf, validate_upload_size])
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "candidature Awards", "candidatures Awards"

    def __str__(self):
        return f"{self.applicant_name} — {self.category}"


class BusinessConnectRegistration(Submission):
    event = models.ForeignKey(Event, on_delete=models.PROTECT, related_name="business_connect_registrations")
    participant_name = models.CharField(max_length=150)
    organization = models.CharField(max_length=200, blank=True)
    email = models.EmailField()
    phone = models.CharField(max_length=30, blank=True)
    what_offers = models.TextField("ce que je propose", blank=True)
    what_needs = models.TextField("ce que je recherche", blank=True)
    preferred_meetings = models.TextField("rencontres souhaitées", blank=True)
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "inscription Business Connect", "inscriptions Business Connect"

    def __str__(self):
        return f"{self.participant_name} — {self.event}"


class VolunteerMission(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "mission de bénévolat", "missions de bénévolat"


class VolunteerApplication(Submission):
    name = models.CharField(max_length=150)
    email = models.EmailField()
    phone = models.CharField(max_length=30)
    organization = models.CharField(max_length=200, blank=True)
    missions = models.ManyToManyField(VolunteerMission, blank=True, related_name="applications")
    availability = models.CharField("disponibilités", max_length=255, blank=True)
    message = models.TextField(blank=True)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "candidature bénévole", "candidatures bénévoles"

    def __str__(self):
        return self.name
