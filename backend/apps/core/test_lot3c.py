"""Cahier des charges du 20 novembre 2026, lot 3c : Gala (information, billetterie officielle, quotas d'invités, contrôle
séparé), rôle Équipe Awards, brouillons, rappel pratique unique."""
from datetime import date
from io import StringIO

from django.core import mail
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from apps.core.models import FormDraft, SiteSettings
from apps.events import badges
from apps.events.models import AwardCategory, EventRequest, GalaRequest, GuestQuota
from apps.users.models import User

PW = "Mot-de-passe-123"


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        mail.outbox.clear()

    def register(self, email="a@x.org", name="Awa Ndiaye"):
        self.client.post("/api/event-requests/", {"kind": "registration", "name": name, "email": email, "accept_privacy": True}, format="json")
        return EventRequest.objects.get(email=email, name=name)

    def login(self, role=User.Role.COORDINATION, username="boss"):
        User.objects.create_user(username, f"{username}@x.org", PW, role=role)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": username, "password": PW}, format="json")
        return c


class GalaTests(Base):
    def test_information_request_only_without_official_link(self):
        self.assertEqual(self.client.get("/api/gwe/gala/").json(), {"ticket_url": None})
        r = self.client.post("/api/gala/", {"name": "Awa", "email": "g@x.org", "interest": "table", "seats": 10, "accept_privacy": True}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        self.assertEqual(r.json()["reference"], f"GAL-{GalaRequest.objects.get().pk:05d}")
        self.assertIn("ni un achat ni une réservation", mail.outbox[-1].body)
        SiteSettings.objects.update_or_create(pk=1, defaults={"gala_ticket_url": "https://billetterie.example/gala"})
        self.assertEqual(self.client.get("/api/gwe/gala/").json(), {"ticket_url": "https://billetterie.example/gala"})

    def test_a_visitor_badge_is_refused_at_the_gala(self):
        reg = self.register()
        c = self.login()
        refused = c.post("/api/coordination/checkin/", {"code": badges.badge_url(reg), "point": "gala"}, format="json").json()
        self.assertEqual(refused["result"], "gala_refused")
        EventRequest.objects.filter(pk=reg.pk).update(gala_access=True)
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": badges.badge_url(reg), "point": "gala"}, format="json").json()["result"], "ok")
        # le passage au Gala ne compte pas comme une arrivée sur le site, et inversement
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": badges.badge_url(reg)}, format="json").json()["result"], "ok")
        self.assertEqual(c.post("/api/coordination/checkin/", {"code": badges.badge_url(reg), "point": "gala"}, format="json").json()["result"], "already")


class QuotaTests(Base):
    def setUp(self):
        super().setUp()
        self.q = GuestQuota.objects.create(kind="gala_table", holder_name="Directeur", holder_email="dir@x.org", organization="Banque X",
                                           quota=2, gala_access=True)

    def test_contact_designates_guests_within_the_quota(self):
        self.assertTrue(badges.send_quota_link(self.q))
        self.assertIn(f"/invites/{self.q.token}", mail.outbox[-1].body)
        url = f"/api/invites/{self.q.token}/"
        self.assertEqual(self.client.get(url).json()["remaining"], 2)
        r = self.client.post(url, {"name": "Invité Un", "email": "un@x.org"}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.client.post(url, {"name": "Invité Deux"}, format="json")  # sans adresse : badge envoyé au contact
        self.assertEqual(self.client.post(url, {"name": "Invité Trois"}, format="json").status_code, 400)  # quota atteint
        guests = EventRequest.objects.filter(guest_quota=self.q)
        self.assertEqual(set(guests.values_list("status", "gala_access", "organization")), {("accepted", True, "Banque X")})
        self.assertEqual(guests.get(name="Invité Deux").email, "dir@x.org")
        # retirer un invité libère la place et invalide son badge
        one = guests.get(name="Invité Un")
        self.client.post(f"/api/invites/{self.q.token}/{one.pk}/retirer/")
        one.refresh_from_db()
        self.assertEqual(one.status, "cancelled")
        self.assertEqual(self.client.get(url).json()["remaining"], 1)

    def test_guests_bypass_the_waitlist_and_a_link_only_shows_its_guests(self):
        SiteSettings.objects.update_or_create(pk=1, defaults={"gwe_capacity": 0})
        self.client.post(f"/api/invites/{self.q.token}/", {"name": "Invité Un"}, format="json")
        self.assertEqual(EventRequest.objects.get(name="Invité Un").status, "accepted")
        other = GuestQuota.objects.create(kind="delegation", holder_name="Référent", holder_email="ref@x.org", quota=1)
        self.assertEqual(self.client.get(f"/api/invites/{other.token}/").json()["guests"], [])
        self.assertEqual(self.client.get("/api/invites/inconnu/").status_code, 404)


class AwardsRoleTests(Base):
    def test_awards_team_sees_only_applications(self):
        team = self.login(User.Role.AWARDS, "jury")
        self.assertEqual(team.get("/api/coordination/me/").json()["role"], "AWARDS")
        self.assertEqual([q["kind"] for q in team.get("/api/coordination/summary/").json()["queues"]], ["awards"])
        self.assertEqual(team.get("/api/coordination/queue/awards/").status_code, 200)
        self.assertEqual(team.get("/api/coordination/queue/memberships/").status_code, 403)
        self.assertIn(team.get("/api/coordination/checkin/stats/").status_code, (401, 403))
        self.assertIn(team.get("/api/coordination/content/").status_code, (401, 403))
        self.assertFalse(User.objects.get(username="jury").is_staff)


class DraftTests(Base):
    def test_save_and_resume_later_without_submitting(self):
        r = self.client.post("/api/brouillons/", {"form": "awards", "email": "a@x.org",
                                                  "data": {"applicant_name": "Awa", "description": "Mon parcours", "secret": "x"}}, format="json")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertIn("n'est pas encore déposée", r.json()["detail"])
        token = r.json()["token"]
        self.assertIn(f"brouillon={token}", mail.outbox[-1].body)
        data = self.client.get(f"/api/brouillons/{token}/").json()["data"]
        self.assertEqual(data, {"applicant_name": "Awa", "description": "Mon parcours"})  # champs non prévus ignorés
        self.client.post("/api/brouillons/", {"form": "awards", "email": "a@x.org", "token": token, "data": {"applicant_name": "Awa N."}}, format="json")
        self.assertEqual(FormDraft.objects.count(), 1)
        self.assertEqual(self.client.get("/api/brouillons/inconnu/").status_code, 410)


class ReminderTests(Base):
    def test_one_reminder_per_person_only_when_enabled(self):
        self.register()
        self.register(email="b@x.org", name="Moussa Fall")
        EventRequest.objects.filter(email="b@x.org").update(status="cancelled")
        mail.outbox.clear()
        call_command("send_campaigns", stdout=StringIO())
        self.assertEqual(len(mail.outbox), 0)  # pas activé
        SiteSettings.objects.update_or_create(pk=1, defaults={"reminder_enabled": True, "reminder_text": "Accueil à partir de 9 h."})
        call_command("send_campaigns", stdout=StringIO())
        call_command("send_campaigns", stdout=StringIO())
        self.assertEqual([m.to for m in mail.outbox], [["a@x.org"]])  # une seule fois, jamais aux annulés
        body = mail.outbox[0].body
        self.assertIn("Accueil à partir de 9 h.", body)
        self.assertIn("à The Ground, à Diamniadio", body)
        self.assertIn("GWE-0001", body)
