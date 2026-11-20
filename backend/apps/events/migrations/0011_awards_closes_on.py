"""Cahier des charges du 20 novembre 2026 : candidatures aux Awards closes le 20 novembre, sauf « Jeune talent du Pôle »,
seule catégorie prolongée jusqu'au mercredi 25 novembre 2026. Une date déjà saisie dans l'admin n'est pas modifiée."""
from datetime import date

from django.db import migrations

from apps.core.seed_event_content import AWARDS_CLOSE_ON, AWARDS_EXTENDED


def forwards(apps, schema_editor):
    AwardCategory = apps.get_model("events", "AwardCategory")
    for c in AwardCategory.objects.filter(closes_on__isnull=True):
        c.closes_on = AWARDS_EXTENDED.get(c.slug, AWARDS_CLOSE_ON)
        c.save(update_fields=["closes_on"])


class Migration(migrations.Migration):
    dependencies = [("events", "0010_lot3a")]
    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
