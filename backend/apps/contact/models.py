from django.db import models

from apps.core.models import TimeStampedModel


class ContactMessage(TimeStampedModel):
    class Subject(models.TextChoices):
        MEMBERSHIP = "membership", "Adhésion"
        PARTNERSHIP = "partnership", "Partenariat"
        EVENTS = "events", "Événements"
        PRESS = "press", "Presse"
        VOLUNTEER = "volunteer", "Bénévolat"
        DIRECTORY = "directory", "Annuaire"
        MAP = "map", "Cartographie"
        OTHER = "other", "Autre"

    name = models.CharField(max_length=150)
    organization = models.CharField(max_length=200, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField()
    subject = models.CharField(max_length=20, choices=Subject.choices)
    message = models.TextField()
    consent = models.BooleanField("consentement", default=False)
    email_sent = models.BooleanField("notification e-mail envoyée", default=False)
    is_handled = models.BooleanField("traité", default=False, db_index=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "message de contact", "messages de contact"

    def __str__(self):
        return f"{self.name} — {self.get_subject_display()}"
