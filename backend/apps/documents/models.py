import os

from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.db import models
from django.utils import timezone

from apps.core.models import TimeStampedModel
from apps.core.validators import validate_pdf, validate_upload_size


class DocumentQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_public=True)


class Document(TimeStampedModel):
    class Category(models.TextChoices):
        BROCHURE = "brochure", "Plaquette"
        PARTNERSHIP = "partnership", "Dossier de l'événement et de partenariat"
        FLYER = "flyer", "Flyer de l'événement"
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


class PrivateStorage(FileSystemStorage):
    """Stockage hors du dossier public (jamais servi par Nginx) : les fichiers ne sortent que par une vue qui vérifie l'accès."""
    @property
    def base_location(self):
        return getattr(settings, "PRIVATE_MEDIA_ROOT", settings.BASE_DIR / "private_media")

    @property
    def location(self):
        return os.path.abspath(self.base_location)

    @property
    def base_url(self):
        return None


def private_storage():
    return PrivateStorage()


class MemberDocumentQuerySet(models.QuerySet):
    def published(self):
        return self.filter(is_published=True)


class MemberDocument(TimeStampedModel):
    """Document réservé aux membres à jour de leur cotisation."""
    class Category(models.TextChoices):
        COMMISSION = "commission", "Compte rendu de commission"
        URBAN_NOTES = "urban_notes", "Urban Notes"
        BAROMETER = "barometer", "Résultats du Baromètre"
        GENERAL_ASSEMBLY = "general_assembly", "Assemblée générale"
        OTHER = "other", "Autre"

    title = models.CharField("titre", max_length=200)
    category = models.CharField("catégorie", max_length=20, choices=Category.choices)
    description = models.TextField(blank=True)
    file = models.FileField(upload_to="members/", storage=private_storage, validators=[validate_pdf, validate_upload_size])
    published_on = models.DateField("date du document", default=timezone.localdate)
    is_published = models.BooleanField("visible des membres", default=False)

    objects = MemberDocumentQuerySet.as_manager()

    class Meta:
        ordering = ["-published_on", "title"]
        verbose_name, verbose_name_plural = "document réservé aux membres", "documents réservés aux membres"

    def __str__(self):
        return self.title
