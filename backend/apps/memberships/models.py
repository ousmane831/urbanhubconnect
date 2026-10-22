from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.core.models import Submission, Taxonomy, TimeStampedModel
from apps.core.validators import validate_image_extension, validate_upload_size
from apps.organizations.models import College, Commission, Organization, Pole, Sector


class MembershipCategory(Taxonomy):
    amount_fcfa = models.PositiveIntegerField("cotisation (FCFA)")
    public_listing = models.BooleanField("fiche publique dans l'Annuaire", default=True,
                                         help_text="Décocher pour les membres individuels et étudiants.")

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


class Membership(TimeStampedModel):
    """Dossier d'adhésion : source de vérité du statut de membre (traitement, cotisation, publication, accès)."""
    class Status(models.TextChoices):
        RECEIVED = "received", "Demande reçue"
        REVIEWING = "reviewing", "En cours d'examen"
        ACCEPTED = "accepted", "Acceptée, en attente de la Charte et du paiement"
        ACTIVE = "active", "Membre à jour"
        EXPIRED = "expired", "Cotisation échue"
        SUSPENDED = "suspended", "Suspendue"
        REJECTED = "rejected", "Refusée"

    reference = models.CharField("référence", max_length=20, unique=True, null=True, blank=True, editable=False)
    status = models.CharField("statut", max_length=10, choices=Status.choices, default=Status.RECEIVED, db_index=True)
    name = models.CharField("organisation ou nom", max_length=200)
    category = models.ForeignKey(MembershipCategory, null=True, blank=True, on_delete=models.PROTECT, related_name="memberships",
                                 verbose_name="catégorie d'adhésion")
    organization = models.OneToOneField(Organization, null=True, blank=True, on_delete=models.SET_NULL, related_name="membership",
                                        verbose_name="fiche Annuaire")
    application = models.OneToOneField(MembershipApplication, null=True, blank=True, on_delete=models.SET_NULL, related_name="membership")
    representative = models.CharField("représentant", max_length=150, blank=True)
    role = models.CharField("fonction", max_length=150, blank=True)
    phone = models.CharField(max_length=30, blank=True)
    email = models.EmailField(blank=True)
    is_founder = models.BooleanField("membre fondateur", default=False)
    charter_sent_at = models.DateTimeField("bulletin et Charte envoyés le", null=True, blank=True)
    charter_signed_on = models.DateField("Charte signée le", null=True, blank=True)
    activated_at = models.DateField("membre depuis le", null=True, blank=True)
    valid_until = models.DateField("cotisation valable jusqu'au", null=True, blank=True)
    notes = models.TextField("notes internes", blank=True)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="membership",
                                verbose_name="compte membre")

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "dossier d'adhésion", "dossiers d'adhésion"

    def __str__(self):
        return f"{self.reference or '—'} · {self.name}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        if not self.reference:
            self.reference = f"UHC-{self.created_at.year}-{self.pk:04d}"
            super().save(update_fields=["reference"])

    @property
    def is_current(self):
        return self.status == self.Status.ACTIVE and self.valid_until is not None and self.valid_until >= timezone.localdate()


class Payment(TimeStampedModel):
    """Cotisation encaissée, enregistrée à la main par la Coordination."""
    class Method(models.TextChoices):
        TRANSFER = "virement", "Virement"
        WAVE = "wave", "Wave"
        ORANGE = "orange_money", "Orange Money"
        CASH = "especes", "Espèces"

    membership = models.ForeignKey(Membership, on_delete=models.PROTECT, related_name="payments")
    amount_fcfa = models.PositiveIntegerField("montant (FCFA)")
    method = models.CharField("mode de paiement", max_length=15, choices=Method.choices)
    reference = models.CharField("référence du paiement", max_length=100, blank=True)
    paid_on = models.DateField("date du paiement", default=timezone.localdate)
    recorded_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    notes = models.CharField(max_length=255, blank=True)
    applied = models.BooleanField("appliqué à la cotisation", default=False, editable=False)

    class Meta:
        ordering = ["-paid_on", "-id"]
        verbose_name, verbose_name_plural = "paiement", "paiements"

    def __str__(self):
        return f"{self.amount_fcfa} FCFA · {self.get_method_display()} · {self.paid_on}"


class ProfileChange(TimeStampedModel):
    """Modification de la partie publique d'une fiche, proposée par le membre : elle n'est visible qu'après validation."""
    class Status(models.TextChoices):
        PENDING = "pending", "En attente de validation"
        APPROVED = "approved", "Approuvée"
        REJECTED = "rejected", "Refusée"

    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="profile_changes")
    requested_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    changes = models.JSONField("champs modifiés", default=dict)
    logo = models.ImageField(upload_to="organizations/pending-logos/", blank=True,
                             validators=[validate_image_extension, validate_upload_size])
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING, db_index=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    reviewed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "modification de fiche", "modifications de fiches"

    def __str__(self):
        return f"{self.organization} · {self.get_status_display()}"


class ContactReveal(TimeStampedModel):
    """Journal des affichages de coordonnées directes (limite anti-prospection massive, preuve en cas d'abus)."""
    member = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="+")
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name="+")

    class Meta:
        ordering = ["-created_at"]
        verbose_name, verbose_name_plural = "affichage de coordonnées", "affichages de coordonnées"
