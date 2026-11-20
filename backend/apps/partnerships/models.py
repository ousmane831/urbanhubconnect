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
    sector = models.CharField("secteur", max_length=150, blank=True)
    contact_name = models.CharField(max_length=150)
    role = models.CharField("fonction", max_length=150, blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    wants_discussion = models.BooleanField("souhaite en discuter", default=False)
    in_kind = models.BooleanField("apport en nature", default=False)
    in_kind_description = models.TextField("description de l'apport en nature", blank=True)
    institutional = models.BooleanField("partenariat institutionnel", default=False)
    message = models.TextField(blank=True)
    accept_privacy = models.BooleanField(default=False)
    # Quota d'accréditations saisi d'après la convention ou la validation écrite (jamais déduit de la demande)
    accreditations_quota = models.PositiveSmallIntegerField("quota d'accréditations validé", null=True, blank=True)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande de partenariat", "demandes de partenariat"

    def clean(self):
        from django.core.exceptions import ValidationError
        super().clean()
        if self.in_kind and not self.in_kind_description.strip():
            raise ValidationError({"in_kind_description": "Décrivez l'apport en nature envisagé."})

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
    band_order = models.PositiveIntegerField(
        "position dans le bandeau « En partenariat avec »", null=True, blank=True,
        help_text="Laisser vide pour ne pas afficher ce logo dans le bandeau. 1 = premier logo (DGPU), affiché plus grand.")
    dark_tile = models.BooleanField("logo sur tuile noire", default=False,
                                    help_text="Affiche le logo sur une tuile noire aux angles arrondis (M'ma Conciergerie).")

    objects = PartnerQuerySet.as_manager()

    class Meta:
        ordering = ["display_order", "name"]
        verbose_name, verbose_name_plural = "partenaire", "partenaires"

    def __str__(self):
        return self.name
