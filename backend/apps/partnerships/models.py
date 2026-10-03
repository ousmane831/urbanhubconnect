from django.db import models

from apps.core.models import Submission, TimeStampedModel, Taxonomy
from apps.core.validators import validate_image_extension, validate_upload_size


class PartnershipTier(Taxonomy):
    amount_fcfa = models.PositiveIntegerField("montant (FCFA)")
    benefits = models.TextField("contreparties", blank=True, help_text="[à compléter]")

    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "formule de partenariat", "formules de partenariat"


class PartnershipApplication(Submission):
    company = models.CharField("entreprise / institution", max_length=200)
    tier = models.ForeignKey(PartnershipTier, null=True, blank=True, on_delete=models.SET_NULL, related_name="applications")
    contact_name = models.CharField(max_length=150)
    role = models.CharField("fonction", max_length=150, blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    message = models.TextField(blank=True)
    accept_privacy = models.BooleanField(default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande de partenariat", "demandes de partenariat"

    def __str__(self):
        return self.company


class PartnerQuerySet(models.QuerySet):
    def confirmed(self):
        return self.filter(is_confirmed=True)


class Partner(TimeStampedModel):
    name = models.CharField(max_length=200)
    logo = models.ImageField(upload_to="partners/", validators=[validate_image_extension, validate_upload_size])
    partnership_type = models.ForeignKey(PartnershipTier, null=True, blank=True, on_delete=models.SET_NULL, related_name="partners")
    website = models.URLField(blank=True)
    is_confirmed = models.BooleanField("confirmé (affiché publiquement)", default=False)
    display_order = models.PositiveIntegerField(default=0)

    objects = PartnerQuerySet.as_manager()

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name, verbose_name_plural = "partenaire", "partenaires"

    def __str__(self):
        return self.name
