from django.core.exceptions import ValidationError
from django.db import models

from apps.core.models import Submission, Taxonomy
from apps.organizations.models import College, Commission, Pole, Sector


class MembershipCategory(Taxonomy):
    amount_fcfa = models.PositiveIntegerField("cotisation (FCFA)")

    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "catégorie d'adhésion", "catégories d'adhésion"


class MembershipApplication(Submission):
    organization_or_name = models.CharField("organisation ou nom", max_length=200)
    category = models.ForeignKey(MembershipCategory, on_delete=models.PROTECT, related_name="applications")
    college = models.ForeignKey(College, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    sector = models.ForeignKey(Sector, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    pole = models.CharField(max_length=12, choices=Pole.choices, blank=True)
    representative = models.CharField("représentant", max_length=150)
    role = models.CharField("fonction", max_length=150, blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    commissions = models.ManyToManyField(Commission, blank=True, related_name="+")
    offers = models.TextField(blank=True)
    needs = models.TextField(blank=True)
    accept_charter = models.BooleanField("charte acceptée", default=False)
    accept_privacy = models.BooleanField("confidentialité acceptée", default=False)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "demande d'adhésion", "demandes d'adhésion"

    def __str__(self):
        return f"{self.organization_or_name} ({self.category})"

    def clean(self):
        super().clean()
        errors = {f: "Ce consentement est obligatoire." for f in ("accept_charter", "accept_privacy")
                  if not getattr(self, f)}
        if errors:
            raise ValidationError(errors)
