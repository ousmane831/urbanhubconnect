from django.contrib import admin

from apps.core.admin import PublishActionsMixin, TaxonomyAdmin
from .models import Article, ArticleCategory


@admin.register(ArticleCategory)
class ArticleCategoryAdmin(TaxonomyAdmin):
    pass


@admin.register(Article)
class ArticleAdmin(PublishActionsMixin, admin.ModelAdmin):
    list_display = ("title", "category", "author", "published_at", "publication")
    list_filter = ("is_published", "category")
    search_fields = ("title", "excerpt", "content")
    date_hierarchy = "published_at"
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = ("created_at", "updated_at")
