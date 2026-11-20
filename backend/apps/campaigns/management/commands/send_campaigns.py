"""Envoie les campagnes dont l'heure est venue. Lancée toutes les 15 minutes par le minuteur du serveur."""
from django.core.management.base import BaseCommand

from apps.campaigns import sender


class Command(BaseCommand):
    help = "Envoie les campagnes d'e-mails programmées dont l'heure est venue."

    def handle(self, *args, **options):
        # Rappel pratique du Grand Week-End (si la Coordination l'a activé) : envoyé par lots, une seule fois par personne
        from apps.events.badges import send_reminders
        reminded = send_reminders()
        if reminded:
            self.stdout.write(f"Rappel du Grand Week-End : {reminded} e-mail(s) envoyé(s)")
        problem = sender.config_problem()
        if problem:
            self.stdout.write(problem)
            return
        report = sender.run()
        if not report:
            self.stdout.write("Aucun envoi dû.")
        for title, n in report.items():
            self.stdout.write(f"{title} : {n} e-mail(s) envoyé(s)")
