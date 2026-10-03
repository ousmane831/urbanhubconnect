from django.db import models
from django.utils import timezone

from apps.core.models import PublishableModel, Taxonomy
from apps.core.utils import unique_slugify
from apps.core.validators import validate_image_extension, validate_upload_size


class ArticleCategory(Taxonomy):
    class Meta(Taxonomy.Meta):
        verbose_name, verbose_name_plural = "catégorie d'article", "catégories d'article"


class ArticleQuerySet(models.QuerySet):
    def public(self):
        """Publié ET date de publication échue (permet la programmation)."""
        return self.filter(is_published=True, published_at__lte=timezone.now())


class Article(PublishableModel):
    title = models.CharField("titre", max_length=250)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    category = models.ForeignKey(ArticleCategory, on_delete=models.PROTECT, related_name="articles")
    excerpt = models.TextField("chapô", blank=True)
    content = models.TextField("contenu", blank=True)
    featured_image = models.ImageField(upload_to="news/", blank=True, validators=[validate_image_extension, validate_upload_size])
    author = models.CharField("auteur", max_length=150, blank=True)
    published_at = models.DateTimeField("date de publication", null=True, blank=True)
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)

    objects = ArticleQuerySet.as_manager()

    class Meta:
        ordering = ["-published_at", "-created_at"]
        verbose_name, verbose_name_plural = "article", "articles"

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = unique_slugify(self, self.title, max_length=120)
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)
