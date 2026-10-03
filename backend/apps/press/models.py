from django.db import models
from django.utils import timezone

from apps.core.models import PublishableModel, Submission
from apps.core.utils import unique_slugify
from apps.core.validators import validate_pdf, validate_upload_size


class PressReleaseQuerySet(models.QuerySet):
    def public(self):
        return self.filter(is_published=True, published_at__lte=timezone.now())


class PressRelease(PublishableModel):
    title = models.CharField("titre", max_length=250)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    summary = models.TextField("résumé", blank=True)
    document = models.FileField(upload_to="press/", blank=True, validators=[validate_pdf, validate_upload_size])
    published_at = models.DateTimeField("date de publication", null=True, blank=True)

    objects = PressReleaseQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at"]
        verbose_name, verbose_name_plural = "communiqué", "communiqués"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=120)
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


class PressAccreditation(Submission):
    media = models.CharField("média", max_length=200)
    name = models.CharField(max_length=150)
    role = models.CharField("fonction", max_length=150, blank=True)
    phone = models.CharField(max_length=30)
    email = models.EmailField()
    attendance_days = models.CharField("jours de présence", max_length=200, blank=True)

    class Meta(Submission.Meta):
        verbose_name, verbose_name_plural = "accréditation presse", "accréditations presse"

    def __str__(self):
        return f"{self.name} ({self.media})"
