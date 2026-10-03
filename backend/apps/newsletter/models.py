from django.db import models

from apps.core.models import TimeStampedModel


class NewsletterSubscriber(TimeStampedModel):
    name = models.CharField(max_length=150, blank=True)
    email = models.EmailField(unique=True)
    organization = models.CharField(max_length=200, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "abonné newsletter", "abonnés newsletter"

    def __str__(self):
        return self.email

    def clean(self):
        super().clean()
        self.email = (self.email or "").strip().lower()  # évite les doublons de casse

    def save(self, *args, **kwargs):
        self.email = self.email.strip().lower()
        super().save(*args, **kwargs)
