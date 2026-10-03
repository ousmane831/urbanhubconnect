from django.db import models

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_pdf, validate_upload_size


class DocumentQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_public=True)


class Document(TimeStampedModel):
    class Category(models.TextChoices):
        BROCHURE = "brochure", "Plaquette"
        PARTNERSHIP = "partnership", "Dossier de partenariat"
        CHARTER = "charter", "Charte"
        PROGRAM = "program", "Programme"
        AWARDS = "awards_rules", "Règlement Awards"
        PRESS_KIT = "press_kit", "Dossier de presse"

    title = models.CharField("titre", max_length=200)
    file = models.FileField(upload_to="documents/", validators=[validate_pdf, validate_upload_size])
    category = models.CharField(max_length=20, choices=Category.choices)
    description = models.TextField(blank=True)
    is_public = models.BooleanField("téléchargeable publiquement", default=False)

    objects = DocumentQuerySet.as_manager()

    class Meta:
        ordering = ["category", "title"]

    def __str__(self):
        return self.title
