from django.db import models


class TimeStampedModel(models.Model):
    created_at = models.DateTimeField("créé le", auto_now_add=True)
    updated_at = models.DateTimeField("modifié le", auto_now=True)

    class Meta:
        abstract = True


class PublishableModel(TimeStampedModel):
    is_published = models.BooleanField("publié", default=False, db_index=True)

    class Meta:
        abstract = True


class SiteSettings(models.Model):
    """Singleton : paramètres globaux éditables dans l'admin."""
    site_name = models.CharField(max_length=120, default="Urban Hub Connect")
    phone = models.CharField(max_length=30, default="+221 78 309 56 56")
    whatsapp = models.CharField(max_length=30, default="221783095656", help_text="Format international sans +")
    email = models.EmailField(default="infosurbanhubconnect@gmail.com")
    address = models.CharField(max_length=255, default="SD City, Villa 115, Pôle urbain de Diamniadio")
    linkedin = models.URLField(blank=True)
    facebook = models.URLField(blank=True)
    instagram = models.URLField(blank=True)
    footer_text = models.CharField(max_length=255, default="Association en cours de constitution · Initiative portée par M'ma Conciergerie")
    legal_information = models.TextField("mentions légales", blank=True, help_text="[à compléter]")
    privacy_policy = models.TextField("confidentialité", blank=True, help_text="[à compléter]")

    class Meta:
        verbose_name = verbose_name_plural = "Paramètres du site"

    def save(self, *args, **kwargs):
        self.pk = 1
        super().save(*args, **kwargs)

    @classmethod
    def load(cls):
        return cls.objects.get_or_create(pk=1)[0]


class PageContent(PublishableModel):
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)
    content = models.TextField(blank=True)

    def __str__(self):
        return self.title


class Taxonomy(models.Model):
    """Base des listes administrables (collèges, secteurs, commissions, catégories…)."""
    name = models.CharField("nom", max_length=120, unique=True)
    slug = models.SlugField(unique=True, blank=True)
    description = models.TextField(blank=True)
    display_order = models.PositiveIntegerField("ordre d'affichage", default=0)
    is_active = models.BooleanField("actif", default=True)

    class Meta:
        abstract = True
        ordering = ["display_order", "name"]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from .utils import unique_slugify
            self.slug = unique_slugify(self, self.name)
        super().save(*args, **kwargs)


class SubmissionStatus(models.TextChoices):
    PENDING = "pending", "En attente"
    REVIEWING = "reviewing", "En cours d'examen"
    ACCEPTED = "accepted", "Acceptée"
    REJECTED = "rejected", "Refusée"


class Submission(TimeStampedModel):
    """Base des demandes reçues via les formulaires publics (traitées par la Coordination)."""
    status = models.CharField("statut", max_length=10, choices=SubmissionStatus.choices,
                              default=SubmissionStatus.PENDING, db_index=True)
    internal_notes = models.TextField("notes internes", blank=True)

    class Meta:
        abstract = True
        ordering = ["-created_at"]
