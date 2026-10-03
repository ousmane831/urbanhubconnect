from django.utils.text import slugify


def unique_slugify(instance, value, max_length=50):
    base = slugify(value)[:max_length] or "item"
    qs = instance.__class__._default_manager.exclude(pk=instance.pk)
    slug, n = base, 2
    while qs.filter(slug=slug).exists():
        suffix = f"-{n}"
        slug = f"{base[:max_length - len(suffix)]}{suffix}"
        n += 1
    return slug
