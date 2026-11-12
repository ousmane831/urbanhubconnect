"""Adresses e-mail professionnelles (novembre 2026) : infos@urbanhubconnect.com remplace l'ancienne adresse Gmail.

Remplace l'ancienne adresse partout où elle est encore enregistrée (Paramètres du site, articles, pages, blocs d'événement,
communiqués). Une adresse déjà modifiée à la main dans l'admin n'est pas touchée.
"""
from django.db import migrations, models

OLD, NEW = "infosurbanhubconnect@gmail.com", "infos@urbanhubconnect.com"
TEXTS = [("core", "PageContent", ["content"]), ("news", "Article", ["content", "excerpt"]), ("events", "EventSection", ["body"]),
         ("events", "Event", ["description"]), ("press", "PressRelease", ["summary"])]


def forwards(apps, schema_editor):
    apps.get_model("core", "SiteSettings").objects.filter(email__iexact=OLD).update(email=NEW)
    for app, model, fields in TEXTS:
        M = apps.get_model(app, model)
        for obj in M.objects.all():
            changed = [f for f in fields if OLD in (getattr(obj, f) or "")]
            for f in changed:
                setattr(obj, f, getattr(obj, f).replace(OLD, NEW))
            if changed:
                obj.save(update_fields=changed)


class Migration(migrations.Migration):

    dependencies = [
        ("core", "0005_sitesettings_planting_seats"),
        ("news", "0001_initial"),
        ("events", "0005_eventrequest_badge_sent_at_eventrequest_badge_token_and_more"),
        ("press", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="sitesettings",
            name="email",
            field=models.EmailField(default="infos@urbanhubconnect.com", max_length=254),
        ),
        migrations.RunPython(forwards, migrations.RunPython.noop),
    ]
