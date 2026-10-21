import re
from datetime import timedelta
from io import StringIO

from django.contrib.admin.models import LogEntry
from django.core import mail
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APITestCase

from apps.core.models import SiteSettings
from apps.core.testing import make_org
from apps.memberships import services as ms
from apps.memberships.models import Membership, MembershipApplication, MembershipCategory, Payment
from apps.organizations.models import College, Commission, MembershipStatus as OrgMS, Organization, Sector, ValidationStatus as VS
from apps.users.models import User

S = Membership.Status
PW = "mot-de-passe-123"
today = timezone.localdate


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.pme = MembershipCategory.objects.get(amount_fcfa=150000)
        self.indiv = MembershipCategory.objects.get(slug="membre-individuel")

    def dossier(self, status=S.ACCEPTED, category=..., org=None, **kw):
        kw.setdefault("email", "a@x.org")
        return Membership.objects.create(name="Org A", status=status, category=self.pme if category is ... else category,
                                         organization=org, representative="R. Exemple", **kw)

    def accepted_org(self, published=False, **kw):
        return make_org("Org A", status=VS.ACCEPTED, published=published, representative_email="a@x.org", **kw)

    def application_payload(self, **kw):
        return {"organization_or_name": "Exemple SA", "category": self.pme.slug, "representative": "R. Exemple", "phone": "770000000",
                "email": "a@x.org", "accept_charter": True, "accept_privacy": True, **kw}


class OpeningTests(Base):
    def test_application_opens_a_dossier_and_confirms_by_email(self):
        self.assertEqual(self.client.post("/api/memberships/", self.application_payload(), format="json").status_code, 201)
        m = Membership.objects.get()
        self.assertEqual(m.status, S.RECEIVED)
        self.assertRegex(m.reference, r"^UHC-\d{4}-\d{4}$")
        self.assertEqual(m.application, MembershipApplication.objects.get())
        self.assertEqual(mail.outbox[0].to, ["a@x.org"])
        self.assertIn(m.reference, mail.outbox[0].body)

    def test_application_links_the_existing_listing_by_email(self):
        org = make_org("Fiche existante", status=VS.PENDING, published=False, representative_email="a@x.org")
        self.client.post("/api/memberships/", self.application_payload(), format="json")
        self.assertEqual(Membership.objects.get().organization, org)

    def test_referencing_creates_a_dossier_or_joins_the_existing_one(self):
        org_data = {"name": "Nouvelle Org", "college": College.objects.first().slug, "sector": Sector.objects.first().slug, "pole": "DIAMNIADIO",
                    "representative_name": "R", "representative_email": "a@x.org", "phone": "1", "email": "o@x.org",
                    "commissions": [Commission.objects.first().slug], "accept_charter": True, "accept_privacy": True}
        self.assertEqual(self.client.post("/api/organizations/submit/", org_data, format="json").status_code, 201)
        m = Membership.objects.get()
        self.assertEqual((m.status, m.organization.name, m.category), (S.RECEIVED, "Nouvelle Org", None))

    def test_referencing_joins_dossier_opened_by_application(self):
        self.client.post("/api/memberships/", self.application_payload(), format="json")
        org_data = {"name": "Exemple SA", "college": College.objects.first().slug, "sector": Sector.objects.first().slug, "pole": "LAC_ROSE",
                    "representative_name": "R", "representative_email": "a@x.org", "accept_charter": True, "accept_privacy": True}
        self.client.post("/api/organizations/submit/", org_data, format="json")
        self.assertEqual(Membership.objects.count(), 1)
        self.assertIsNotNone(Membership.objects.get().organization)

    def test_listing_description_limited_to_500_characters(self):
        base = {"name": "X", "college": College.objects.first().slug, "sector": Sector.objects.first().slug, "pole": "DIAMNIADIO",
                "accept_charter": True, "accept_privacy": True}
        self.assertEqual(self.client.post("/api/organizations/submit/", {**base, "description": "x" * 501}, format="json").status_code, 400)
        self.assertEqual(self.client.post("/api/organizations/submit/", {**base, "description": "x" * 500}, format="json").status_code, 201)

    def test_backfill_creates_missing_dossiers_once_without_emails(self):
        MembershipApplication.objects.create(organization_or_name="Ancien", category=self.pme, representative="R", phone="1",
                                             email="old@x.org", accept_charter=True, accept_privacy=True)
        mail.outbox.clear()
        self.assertEqual(ms.backfill_dossiers(), 1)
        self.assertEqual(ms.backfill_dossiers(), 0)
        self.assertEqual(len(mail.outbox), 0)


class TransitionTests(Base):
    def test_cannot_accept_without_category(self):
        with self.assertRaises(ms.DossierError):
            ms.accept(self.dossier(status=S.RECEIVED, category=None))

    def test_accept_validates_the_listing_but_does_not_publish_it(self):
        org = make_org("Org A", status=VS.PENDING, published=False)
        m = self.dossier(status=S.REVIEWING, org=org)
        ms.accept(m)
        org.refresh_from_db()
        self.assertEqual((m.status, org.validation_status, org.is_published, org.membership_status), (S.ACCEPTED, VS.ACCEPTED, False, OrgMS.PENDING))

    def test_reject_hides_and_refuses_the_listing(self):
        org = self.accepted_org(published=True)
        ms.reject(self.dossier(status=S.ACCEPTED, org=org))
        org.refresh_from_db()
        self.assertEqual((org.validation_status, org.is_published), (VS.REJECTED, False))

    def test_invalid_transitions_and_payment_rules(self):
        received = self.dossier(status=S.RECEIVED)
        with self.assertRaises(ms.DossierError):
            ms.record_payment(received, amount=150000, method="wave")
        accepted = self.dossier()
        for kwargs in ({"amount": 0, "method": "wave"}, {"amount": 100, "method": "bitcoin"},
                       {"amount": 100, "method": "wave", "paid_on": today() + timedelta(days=1)}):
            with self.assertRaises(ms.DossierError):
                ms.record_payment(accepted, **kwargs)
        ms.accept(self.dossier(status=S.RECEIVED))
        with self.assertRaises(ms.DossierError):
            ms.accept(accepted)  # déjà acceptée

    def test_payment_in_two_instalments_activates_and_publishes(self):
        org = self.accepted_org()
        m = self.dossier(org=org)
        _, msg = ms.record_payment(m, amount=100000, method="wave")
        m.refresh_from_db()
        self.assertIn("partiel", msg)
        self.assertEqual(m.status, S.ACCEPTED)
        ms.record_payment(m, amount=50000, method="virement", reference="VIR-1")
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual(m.status, S.ACTIVE)
        self.assertEqual(m.valid_until, ms.add_months(today(), 12))
        self.assertEqual((org.is_published, org.membership_status), (True, OrgMS.ACTIVE))
        self.assertEqual(Payment.objects.filter(membership=m, applied=True).count(), 2)
        self.assertTrue(any("cotisation" in e.subject.lower() for e in mail.outbox))
        self.assertTrue(Organization.objects.public().filter(pk=org.pk).exists())

    def test_founder_status_depends_on_the_application_date(self):
        m = self.dossier(org=self.accepted_org())
        with override_settings(FOUNDER_DEADLINE=m.created_at.date() + timedelta(days=1)):
            ms.record_payment(m, amount=150000, method="especes")
        m.refresh_from_db(); m.organization.refresh_from_db()
        self.assertTrue(m.is_founder and m.organization.member_founder)
        late = self.dossier(org=None)
        with override_settings(FOUNDER_DEADLINE=late.created_at.date()):
            ms.record_payment(late, amount=150000, method="especes")
        late.refresh_from_db()
        self.assertFalse(late.is_founder)

    def test_individual_members_get_access_but_no_public_listing(self):
        org = self.accepted_org()
        m = self.dossier(org=org, category=self.indiv)
        self.assertFalse(self.indiv.public_listing)
        ms.record_payment(m, amount=self.indiv.amount_fcfa, method="wave")
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published), (S.ACTIVE, False))

    def test_renewal_extends_from_the_end_date_or_from_today_when_expired(self):
        active = self.dossier(status=S.ACTIVE, activated_at=today() - timedelta(days=355), valid_until=today() + timedelta(days=10))
        ms.record_payment(active, amount=150000, method="wave")
        active.refresh_from_db()
        self.assertEqual(active.valid_until, ms.add_months(today() + timedelta(days=10), 12))
        expired = self.dossier(status=S.EXPIRED, activated_at=today() - timedelta(days=400), valid_until=today() - timedelta(days=1))
        ms.record_payment(expired, amount=150000, method="wave")
        expired.refresh_from_db()
        self.assertEqual((expired.status, expired.valid_until), (S.ACTIVE, ms.add_months(today(), 12)))

    def test_expiry_removes_the_listing_from_the_directory(self):
        org = self.accepted_org(published=True)
        m = self.dossier(status=S.ACTIVE, org=org, valid_until=today() - timedelta(days=1), activated_at=today() - timedelta(days=366))
        self.assertEqual(ms.expire_overdue(), 1)
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published, org.membership_status), (S.EXPIRED, False, OrgMS.NONE))
        self.assertEqual(self.client.get("/api/organizations/").json()["count"], 0)
        self.assertEqual(ms.expire_overdue(), 0)

    def test_suspend_and_reinstate(self):
        org = self.accepted_org(published=True)
        m = self.dossier(status=S.ACTIVE, org=org, valid_until=today() + timedelta(days=100), activated_at=today())
        ms.suspend(m); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published), (S.SUSPENDED, False))
        ms.reinstate(m); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published), (S.ACTIVE, True))

    def test_add_months_handles_month_ends(self):
        from datetime import date
        self.assertEqual(ms.add_months(date(2026, 1, 31), 1), date(2026, 2, 28))
        self.assertEqual(ms.add_months(date(2027, 12, 15), 12), date(2028, 12, 15))


class CoordinationScreenTests(Base):
    def setUp(self):
        super().setUp()
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        self.client.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")

    def act(self, kind, pk, action, **data):
        return self.client.post(f"/api/coordination/queue/{kind}/{pk}/{action}/", data, format="json")

    def actions(self, kind, pk):
        items = self.client.get(f"/api/coordination/queue/{kind}/").json()["items"]
        return [a["id"] for i in items if i["id"] == pk for a in i["actions"]]

    def test_full_flow_from_the_boss_screen(self):
        org = make_org("Org A", status=VS.PENDING, published=False, representative_email="a@x.org")
        m = self.dossier(status=S.RECEIVED, category=None, org=org)
        self.assertIn("set_category", self.actions("memberships", m.pk))
        self.assertEqual(self.act("memberships", m.pk, "accept").status_code, 400)  # catégorie manquante
        self.assertEqual(self.act("memberships", m.pk, "set_category", category=self.pme.slug).status_code, 200)
        self.assertEqual(self.act("memberships", m.pk, "accept").status_code, 200)
        self.assertEqual(self.act("memberships", m.pk, "send_bulletin").status_code, 200)
        r = self.act("memberships", m.pk, "payment", amount=150000, method="wave", reference="W-1", paid_on=today().isoformat())
        self.assertEqual(r.status_code, 200)
        self.assertIn("Membre à jour jusqu'au", r.json()["detail"])
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published), (S.ACTIVE, True))
        self.assertEqual(self.client.get("/api/coordination/queue/memberships/").json()["items"], [])
        self.assertTrue(LogEntry.objects.filter(user__username="boss").exists())

    def test_actions_depend_on_the_stage(self):
        received, accepted = self.dossier(status=S.RECEIVED), self.dossier(status=S.ACCEPTED)
        self.assertEqual(set(self.actions("memberships", received.pk)), {"review", "accept", "reject"})
        self.assertEqual(set(self.actions("memberships", accepted.pk)), {"send_bulletin", "payment", "reject"})

    def test_payment_errors_are_reported_not_crashed(self):
        m = self.dossier()
        for data in ({"amount": "abc", "method": "wave"}, {"amount": 0, "method": "wave"}, {"amount": 5000, "method": "bitcoin"},
                     {"amount": 5000, "method": "wave", "paid_on": (today() + timedelta(days=1)).isoformat()}, {"amount": 5000, "method": "wave", "paid_on": "pas-une-date"}):
            self.assertEqual(self.act("memberships", m.pk, "payment", **data).status_code, 400, data)
        self.assertEqual(Payment.objects.count(), 0)
        self.assertEqual(self.act("memberships", m.pk, "explode").status_code, 400)

    def test_payment_refused_before_acceptance(self):
        self.assertEqual(self.act("memberships", self.dossier(status=S.RECEIVED).pk, "payment", amount=150000, method="wave").status_code, 400)

    def test_renewals_queue_lists_soon_due_and_expired_only(self):
        soon = self.dossier(status=S.ACTIVE, valid_until=today() + timedelta(days=5))
        later = self.dossier(status=S.ACTIVE, valid_until=today() + timedelta(days=90))
        expired = self.dossier(status=S.EXPIRED, valid_until=today() - timedelta(days=3))
        ids = [i["id"] for i in self.client.get("/api/coordination/queue/renewals/").json()["items"]]
        self.assertEqual(set(ids), {soon.pk, expired.pk})
        self.assertNotIn(later.pk, ids)
        self.assertEqual(self.act("renewals", expired.pk, "payment", amount=150000, method="wave").status_code, 200)
        expired.refresh_from_db()
        self.assertEqual(expired.status, S.ACTIVE)

    def test_bulletin_email_carries_amount_and_payment_instructions(self):
        s = SiteSettings.load(); s.payment_instructions = "Wave : 77 000 00 00"; s.save()
        m = self.dossier()
        self.assertEqual(self.act("memberships", m.pk, "send_bulletin").status_code, 200)
        body = mail.outbox[-1].body
        self.assertIn("Wave : 77 000 00 00", body)
        self.assertIn("150 000 FCFA", body)
        m.refresh_from_db()
        self.assertIsNotNone(m.charter_sent_at)

    def test_summary_counts_both_queues_and_active_members(self):
        self.dossier(status=S.RECEIVED); self.dossier(status=S.EXPIRED, valid_until=today() - timedelta(days=1))
        data = self.client.get("/api/coordination/summary/").json()
        counts = {q["kind"]: q["count"] for q in data["queues"]}
        self.assertEqual((counts["memberships"], counts["renewals"]), (1, 1))
        self.assertIn("Membres à jour", [s["label"] for s in data["stats"]])


class PublicApiTests(Base):
    def test_fees_hidden_until_confirmed_by_the_coordination(self):
        data = self.client.get("/api/memberships/categories/").json()
        self.assertTrue(all(c["amount_fcfa"] is None for c in data))
        s = SiteSettings.load(); s.show_membership_fees = True; s.save()
        self.assertIn(500000, [c["amount_fcfa"] for c in self.client.get("/api/memberships/categories/").json()])

    def test_propose_and_recherche_filters_never_expose_the_content(self):
        make_org("Avec offre", offers="Fournitures de bureau"); make_org("Sans offre"); make_org("Cherche", needs="Comptable")
        names = lambda **p: sorted(r["name"] for r in self.client.get("/api/organizations/", p).json()["results"])
        self.assertEqual(names(propose="true"), ["Avec offre"])
        self.assertEqual(names(recherche="true"), ["Cherche"])
        body = self.client.get("/api/organizations/", {"propose": "true"}).content.decode()
        self.assertNotIn("Fournitures", body)

    def test_seed_aligns_labels_with_the_source_and_individual_listing_rules(self):
        self.assertTrue(Sector.objects.filter(name="BTP et immobilier").exists())
        self.assertTrue(Sector.objects.filter(name="Enseignement et formation").exists())
        self.assertFalse(Sector.objects.filter(name="Construction et immobilier").exists())
        self.assertEqual(Sector.objects.count(), 15)
        self.assertEqual(self.indiv.name, "Membre individuel (professionnel, expert)")
        listing = {c.name: c.public_listing for c in MembershipCategory.objects.all()}
        self.assertEqual(sum(1 for v in listing.values() if not v), 2)

    def test_adhesion_and_directory_texts_are_seeded(self):
        pages = {p["slug"]: p for p in self.client.get("/api/pages/", {"prefix": "adherer-"}).json()}
        self.assertEqual(set(pages), {"adherer-intro", "adherer-avantages", "adherer-etapes"})
        self.assertIn("membre fondateur", pages["adherer-intro"]["content"])
        regles = self.client.get("/api/pages/annuaire-regles/").json()
        self.assertIn("prospection massive", regles["content"])
