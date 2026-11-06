"""Note de la Coordination du 5 novembre 2026 : le Grand Week-End du Pôle passe à deux journées (11 et 12 décembre).

Les contenus avaient été créés une seule fois par seed_initial_data (get_or_create) : relancer la commande ne les
modifierait pas. Cette migration remplace donc, dans les bases existantes, les textes que la note demande de reprendre
tels quels. Les catégories et la grille des Awards ne sont pas touchées. Sans effet sur une base vide.
"""
from django.db import migrations
from django.utils.text import slugify

from apps.core.seed_article import OLD_SLUG, OLD_TITLE, SLUG, TITLE
from apps.core.seed_event_content import (EVENT_END, EVENT_LOCATION, EVENT_START, EVENT_TAGLINE, EVENT_TITLE, KEEP_BODY,
                                          MISSION_RENAMES, MISSIONS, PAGES, PARTNERSHIP, RETIRED_SECTIONS, SECTIONS)

EVENT_SLUG = "grand-week-end-du-pole-2026"
TEXT_FIXES = [
    (OLD_TITLE, TITLE),
    ("du vendredi 11 au dimanche 13 décembre 2026", "les vendredi 11 et samedi 12 décembre 2026"),
    ("Rencontre des décideurs, Forum du Pôle, rendez-vous d'affaires, Portes Ouvertes, Gala des Awards du Pôle et plantation de 1 000 arbres au Lac Rose",
     "ouverture officielle, Forum du Pôle en quatre panels, rendez-vous d'affaires, grand reboisement du Lac Rose, Awards et Gala du Pôle"),
    ("du 11 au 13 décembre 2026", "les 11 et 12 décembre 2026"),
]


def _fix(text):
    for old, new in TEXT_FIXES:
        text = text.replace(old, new)
    return text


def _fix_fields(model, fields):
    for obj in model.objects.all():
        changed = [f for f in fields if _fix(getattr(obj, f) or "") != (getattr(obj, f) or "")]
        for f in changed:
            setattr(obj, f, _fix(getattr(obj, f)))
        if changed:
            obj.save(update_fields=changed)


def forwards(apps, schema_editor):
    Event, EventSection = apps.get_model("events", "Event"), apps.get_model("events", "EventSection")
    VolunteerMission = apps.get_model("events", "VolunteerMission")
    PartnershipTier = apps.get_model("partnerships", "PartnershipTier")
    PageContent = apps.get_model("core", "PageContent")

    event = Event.objects.filter(slug=EVENT_SLUG).first()
    if event:
        event.title, event.location, event.description = EVENT_TITLE, EVENT_LOCATION, EVENT_TAGLINE
        event.start_date, event.end_date = EVENT_START, EVENT_END
        event.save()
        EventSection.objects.filter(event=event, slug__in=RETIRED_SECTIONS).delete()
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
        elif slug == "reseau-trajectoire":
            PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})

    for order, (name, amount, description, benefits) in enumerate(PARTNERSHIP, start=1):
        PartnershipTier.objects.filter(slug=slugify(name)).update(amount_fcfa=amount, description=description, benefits=benefits)

    for old, new in MISSION_RENAMES.items():
        if not VolunteerMission.objects.filter(name=new).exists():
            VolunteerMission.objects.filter(name=old).update(name=new, slug=slugify(new))
    if VolunteerMission.objects.exists():
        for order, name in enumerate(MISSIONS, start=1):
            VolunteerMission.objects.update_or_create(name=name, defaults={"slug": slugify(name), "display_order": order, "is_active": True})
        VolunteerMission.objects.exclude(name__in=MISSIONS).update(is_active=False)

    Article = apps.get_model("news", "Article")
    if not Article.objects.filter(slug=SLUG).exists():
        Article.objects.filter(slug=OLD_SLUG).update(slug=SLUG)
    _fix_fields(apps.get_model("news", "Article"), ["title", "excerpt", "content"])
    _fix_fields(apps.get_model("press", "PressRelease"), ["title", "summary"])


class Migration(migrations.Migration):
    dependencies = [
        ("events", "0003_eventrequest_options_eventrequest_what_needs_and_more"),
        ("partnerships", "0002_partner_band_order_partner_dark_tile"),
        ("core", "0001_initial"),
        ("news", "0001_initial"),
        ("press", "0001_initial"),
    ]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
