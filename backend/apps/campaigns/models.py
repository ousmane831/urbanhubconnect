"""Campagnes d'e-mails de la Coordination : contacts partenaires (importés d'Excel), campagnes programmées, envois.

Les e-mails de campagne partent par un service d'envoi dédié (Brevo), jamais par la boîte coordination@ qui envoie
les confirmations et les badges du site : un signalement de spam sur une campagne ne doit pas bloquer ces e-mails.
"""
import uuid
from datetime import date, time

from django.conf import settings
from django.db import models
from django.utils import timezone


class Contact(models.Model):
    email = models.EmailField(unique=True)
    organization = models.CharField("organisation", max_length=200, blank=True)
    name = models.CharField("nom du contact", max_length=150, blank=True)
    segment = models.CharField(max_length=100, blank=True, db_index=True)
    activity = models.CharField("activité", max_length=150, blank=True, db_index=True)
    unsubscribed_at = models.DateTimeField("désinscrit le", null=True, blank=True)
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["organization", "email"]
        verbose_name = "contact de campagne"
        verbose_name_plural = "contacts de campagne"

    def __str__(self):
        return f"{self.organization} <{self.email}>" if self.organization else self.email

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)


class Campaign(models.Model):
    class Frequency(models.TextChoices):
        ONCE = "once", "Une seule fois"
        WEEKLY = "weekly", "Chaque semaine"
        WEEKEND = "weekend", "Chaque week-end (samedi)"

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        ACTIVE = "active", "Programmée"
        PAUSED = "paused", "En pause"
        DONE = "done", "Terminée"

    title = models.CharField("nom interne", max_length=150)
    subject = models.CharField("objet de l'e-mail", max_length=200)
    body = models.TextField("message")
    cta_label = models.CharField("texte du bouton", max_length=60, blank=True)
    cta_url = models.URLField("lien du bouton", blank=True)
    segments = models.JSONField(default=list, blank=True, help_text="Vide : tous les segments.")
    activities = models.JSONField(default=list, blank=True, help_text="Vide : toutes les activités.")
    frequency = models.CharField("fréquence", max_length=10, choices=Frequency.choices, default=Frequency.ONCE)
    weekday = models.PositiveSmallIntegerField("jour d'envoi (0 = lundi)", default=0)
    send_time = models.TimeField("heure d'envoi", default=time(9, 0))
    start_date = models.DateField("à partir du", default=date.today)
    end_date = models.DateField("jusqu'au", null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.DRAFT)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    activated_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name = "campagne"

    def __str__(self):
        return self.title


class Delivery(models.Model):
    """Un e-mail d'une campagne à un contact, pour une date d'envoi donnée (une campagne hebdomadaire a une date par semaine)."""
    class State(models.TextChoices):
        SENT = "sent", "Envoyé"
        FAILED = "failed", "Échec"

    campaign = models.ForeignKey(Campaign, on_delete=models.CASCADE, related_name="deliveries")
    contact = models.ForeignKey(Contact, on_delete=models.CASCADE, related_name="deliveries")
    occurrence = models.DateField()
    state = models.CharField(max_length=10, choices=State.choices)
    error = models.CharField(max_length=300, blank=True)
    sent_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=["campaign", "contact", "occurrence"], name="one_delivery_per_occurrence")]
        verbose_name = "envoi"
