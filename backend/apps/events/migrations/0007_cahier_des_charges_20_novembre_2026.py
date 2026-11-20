"""Cahier des charges du 20 novembre 2026 (Grand Week-End du Pôle) appliqué aux bases existantes :
- un seul lieu : The Ground, Diamniadio (Diamniadio et le Lac Rose sont les deux territoires représentés) ;
- programme sans horaires détaillés, texte du Gala imposé ;
- plus de reboisement, de convoi, de causerie ni de navette : section masquée (conservée dans l'admin), mission bénévole
  désactivée, arbres retirés des contreparties partenaires.
Les dossiers déjà reçus et leurs choix ne sont pas modifiés. Sans effet sur une base vide.
"""
from django.db import migrations
from django.utils.text import slugify

from apps.core.seed_event_content import (EVENT_LOCATION, KEEP_BODY, MISSIONS, PAGES, PARTNERSHIP, SECTIONS,
                                          UNPUBLISHED_SECTIONS)

EVENT_SLUG = "grand-week-end-du-pole-2026"
ARTICLE_FIXES = [
    ("rendez-vous d'affaires, grand reboisement du Lac Rose, Awards et Gala du Pôle",
     "Village du Pôle, rendez-vous d'affaires, Awards et Gala du Pôle"),
]


def forwards(apps, schema_editor):
    Event, EventSection = apps.get_model("events", "Event"), apps.get_model("events", "EventSection")
    VolunteerMission = apps.get_model("events", "VolunteerMission")
    PartnershipTier = apps.get_model("partnerships", "PartnershipTier")
    PageContent = apps.get_model("core", "PageContent")
    Article = apps.get_model("news", "Article")

    event = Event.objects.filter(slug=EVENT_SLUG).first()
    if event:
        event.location = EVENT_LOCATION
        event.save(update_fields=["location"])
        EventSection.objects.filter(event=event, slug__in=UNPUBLISHED_SECTIONS).update(is_published=False)
        for order, (slug, title, body) in enumerate(SECTIONS, start=1):
            section, created = EventSection.objects.get_or_create(event=event, slug=slug, defaults={"title": title, "body": body, "order": order})
            if not created:
                section.order = order
                if slug not in KEEP_BODY:
                    section.title, section.body, section.is_published = title, body, True
                section.save()

    for slug, title, content in PAGES:
        if slug == "grand-week-end-presentation":
            PageContent.objects.filter(slug=slug).update(title=title, content=content)

    for name, amount, description, benefits in PARTNERSHIP:
        PartnershipTier.objects.filter(slug=slugify(name)).update(amount_fcfa=amount, description=description, benefits=benefits)

    if VolunteerMission.objects.exists():
        for order, name in enumerate(MISSIONS, start=1):
            VolunteerMission.objects.update_or_create(name=name, defaults={"slug": slugify(name), "display_order": order, "is_active": True})
        VolunteerMission.objects.exclude(name__in=MISSIONS).update(is_active=False)

    for article in Article.objects.all():
        content = article.content or ""
        for old, new in ARTICLE_FIXES:
            content = content.replace(old, new)
        if content != article.content:
            article.content = content
            article.save(update_fields=["content"])


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0006_badge_number_job_title"),
        ("partnerships", "0002_partner_band_order_partner_dark_tile"),
        ("core", "0007_submissionreceipt"),
        ("news", "0001_initial"),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
