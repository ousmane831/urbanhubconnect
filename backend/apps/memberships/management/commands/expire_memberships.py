from django.core.management.base import BaseCommand

from apps.memberships.services import daily_maintenance


class Command(BaseCommand):
    help = ("Tâche quotidienne : passe en « échue » les cotisations dépassées (fiche retirée de l'Annuaire) "
            "et envoie les rappels d'échéance à J-30 et J-7. À planifier chaque jour (voir deploy/).")

    def handle(self, *args, **options):
        r = daily_maintenance()
        self.stdout.write(self.style.SUCCESS(f"{r['expired']} cotisation(s) échue(s), {r['reminders']} rappel(s) d'échéance envoyé(s)."))
