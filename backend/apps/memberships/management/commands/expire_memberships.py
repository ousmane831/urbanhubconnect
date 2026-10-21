from django.core.management.base import BaseCommand

from apps.memberships.services import expire_overdue


class Command(BaseCommand):
    help = "Passe en « échue » les cotisations dépassées et retire leurs fiches de l'Annuaire (à planifier chaque jour)."

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS(f"{expire_overdue()} cotisation(s) échue(s)."))
