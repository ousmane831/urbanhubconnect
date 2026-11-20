"""Business Connect (cahier des charges du 20 novembre 2026, lot 3b) : créneaux publiés, demande ≠ rendez-vous confirmé,
chevauchements refusés, confirmation et libération communiquées, agenda individuel, reprise des coordonnées du badge."""
from datetime import date, time
from io import StringIO

from django.core import mail
from django.core.management import call_command
from rest_framework.test import APIClient, APITestCase

from apps.core import dossiers
from apps.events import badges
from apps.events.models import BusinessConnectMeeting, BusinessConnectRegistration, BusinessConnectSlot, EventRequest
from apps.users.models import User

PW = "Mot-de-passe-123"
URL = "/api/coordination/business-connect/"


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.s1 = BusinessConnectSlot.objects.create(day=date(2026, 12, 11), start=time(11, 30), end=time(11, 50), is_published=True)
        self.s2 = BusinessConnectSlot.objects.create(day=date(2026, 12, 12), start=time(10, 0), end=time(10, 20), is_published=True)
        self.hidden = BusinessConnectSlot.objects.create(day=date(2026, 12, 12), start=time(15, 0), end=time(15, 20))
        mail.outbox.clear()

    def apply(self, name, email, **kw):
        r = self.client.post("/api/business-connect/", {"event": "grand-week-end-du-pole-2026", "participant_name": name, "email": email,
                                                        "accept_privacy": True, **kw}, format="json")
        self.assertEqual(r.status_code, 201, r.content)
        return BusinessConnectRegistration.objects.get(email=email)

    def staff(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c


class FormTests(Base):
    def test_only_published_slots_and_300_characters(self):
        slots = self.client.get("/api/business-connect/slots/").json()
        self.assertEqual([s["id"] for s in slots], [self.s1.pk, self.s2.pk])
        bad = self.client.post("/api/business-connect/", {"event": "grand-week-end-du-pole-2026", "participant_name": "A", "email": "a@x.org",
                                                          "slots": [self.hidden.pk], "accept_privacy": True}, format="json")
        self.assertEqual(bad.status_code, 400)
        long = self.client.post("/api/business-connect/", {"event": "grand-week-end-du-pole-2026", "participant_name": "A", "email": "a@x.org",
                                                           "what_offers": "x" * 301, "accept_privacy": True}, format="json")
        self.assertIn("what_offers", long.json())
        reg = self.apply("Awa", "a@x.org", what_offers="Conseil", objective="Trouver des clients", slots=[self.s1.pk])
        self.assertEqual(list(reg.slots.all()), [self.s1])
        body = mail.outbox[-1].body
        self.assertIn("pas encore un rendez-vous", body)
        self.assertIn("Vendredi 11/12 · 11:30–11:50", body)

    def test_badge_owner_can_reuse_registration_details(self):
        self.client.post("/api/event-requests/", {"kind": "registration", "name": "Awa Ndiaye", "email": "a@x.org", "organization": "Sen Agro",
                                                  "accept_privacy": True}, format="json")
        reg = EventRequest.objects.get()
        key = badges.owner_key(reg.badge_token)
        self.assertEqual(self.client.get(f"/api/badges/{reg.badge_token}/coordonnees/").status_code, 404)
        data = self.client.get(f"/api/badges/{reg.badge_token}/coordonnees/", {"cle": key}).json()
        self.assertEqual((data["participant_name"], data["email"], data["organization"]), ("Awa Ndiaye", "a@x.org", "Sen Agro"))


class MeetingTests(Base):
    def setUp(self):
        super().setUp()
        self.a = self.apply("Awa", "a@x.org")
        self.b = self.apply("Bintou", "b@x.org")
        self.c = self.apply("Cheikh", "c@x.org")
        self.coord = self.staff()
        mail.outbox.clear()

    def create(self, first, second, slot, table=""):
        return self.coord.post(f"{URL}meetings/", {"first": first.pk, "second": second.pk, "slot": slot.pk, "table": table}, format="json")

    def test_a_proposed_meeting_is_not_communicated_until_confirmed(self):
        self.assertEqual(self.create(self.a, self.b, self.s1, "T1").status_code, 200)
        self.assertEqual(len(mail.outbox), 0)
        m = BusinessConnectMeeting.objects.get()
        r = self.coord.post(f"{URL}meetings/{m.pk}/confirm/")
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual(sorted(x.to[0] for x in mail.outbox), ["a@x.org", "b@x.org"])
        self.assertIn("Vendredi 11/12 · 11:30–11:50 · avec Bintou · table T1", mail.outbox[0].body + mail.outbox[1].body)
        self.a.refresh_from_db()
        self.assertEqual(self.a.status, "accepted")
        row = next(d for d in self.client.get(f"/api/suivi/{dossiers.token_for('a@x.org')}/").json()["dossiers"] if d["kind"] == "business-connect")
        self.assertEqual(row["meetings"], ["Vendredi 11/12 · 11:30–11:50 · avec Bintou · table T1"])

    def test_overlaps_are_refused(self):
        self.create(self.a, self.b, self.s1, "T1")
        busy = self.create(self.a, self.c, self.s1, "T2")
        self.assertEqual(busy.status_code, 400)
        self.assertIn("Awa a déjà un rendez-vous sur ce créneau", busy.json()["detail"])
        table = self.create(self.c, self.apply("Diop", "d@x.org"), self.s1, "t1")
        self.assertIn("La table t1 est déjà occupée", table.json()["detail"])
        self.assertEqual(self.create(self.a, self.c, self.s2).status_code, 200)  # autre créneau : possible
        self.assertEqual(self.create(self.a, self.a, self.s2).status_code, 400)
        self.assertEqual(self.create(self.b, self.c, self.hidden).status_code, 400)  # créneau non publié

    def test_release_tells_both_that_the_old_slot_is_cancelled(self):
        self.create(self.a, self.b, self.s1)
        m = BusinessConnectMeeting.objects.get()
        self.coord.post(f"{URL}meetings/{m.pk}/confirm/")
        mail.outbox.clear()
        self.coord.post(f"{URL}meetings/{m.pk}/release/")
        self.assertEqual(len(mail.outbox), 2)
        self.assertIn("est annulé et ce créneau est libéré", mail.outbox[0].body)
        self.assertEqual(self.create(self.a, self.c, self.s1).status_code, 200)  # créneau de nouveau libre

    def test_individual_agenda_lists_only_confirmed_meetings(self):
        self.create(self.a, self.b, self.s1)
        self.create(self.a, self.c, self.s2)
        first = BusinessConnectMeeting.objects.get(second=self.b)
        self.assertEqual(self.coord.post(f"{URL}agenda/{self.c.pk}/").status_code, 400)  # rien de confirmé
        self.coord.post(f"{URL}meetings/{first.pk}/confirm/")
        mail.outbox.clear()
        self.assertEqual(self.coord.post(f"{URL}agenda/{self.a.pk}/").status_code, 200)
        body = mail.outbox[0].body
        self.assertIn("avec Bintou", body)
        self.assertNotIn("Cheikh", body)

    def test_board_and_staff_only(self):
        self.create(self.a, self.b, self.s1)
        board = self.coord.get(URL).json()
        self.assertEqual(len(board["slots"]), 3)
        self.assertEqual({p["name"]: p["meetings"] for p in board["participants"]}["Awa"], 1)
        self.assertIn(APIClient().get(URL).status_code, (401, 403))
