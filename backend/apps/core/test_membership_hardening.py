"""Parcours « du visiteur au membre » : trous de logique corrigés après la relecture (publication, rattachement, paiements, échéances…)."""
from datetime import timedelta
from io import StringIO

from django.core import mail
from django.core.cache import cache
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.core.testing import make_org
from apps.memberships import accounts
from apps.memberships import services as ms
from apps.memberships.models import Membership, MembershipApplication, MembershipCategory, Opportunity, OpportunityType, Payment
from apps.organizations.models import Organization, ValidationStatus as VS
from apps.users.models import User

S = Membership.Status
PW = "Mot-de-passe-123"
today = timezone.localdate


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.pme = MembershipCategory.objects.get(amount_fcfa=150000)
        self.indiv = MembershipCategory.objects.get(slug="membre-individuel")
        cache.clear()

    def dossier(self, status=S.ACCEPTED, org=None, category=..., **kw):
        kw.setdefault("email", "a@x.org")
        kw.setdefault("name", "Org A")
        return Membership.objects.create(status=status, category=self.pme if category is ... else category,
                                         organization=org, representative="R. Exemple", **kw)

    def active(self, org=None, days=100, **kw):
        return self.dossier(status=S.ACTIVE, org=org, valid_until=today() + timedelta(days=days), activated_at=today() - timedelta(days=10), **kw)

    def boss(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c

    def items(self, c, kind):
        return {i["id"]: i for i in c.get(f"/api/coordination/queue/{kind}/").json()["items"]}

    def application(self, **kw):
        data = {"organization_or_name": "Exemple SA", "category": self.pme.slug, "representative": "R. Exemple", "phone": "770000000",
                "email": "a@x.org", "accept_charter": True, "accept_privacy": True, **kw}
        return self.client.post("/api/memberships/", data, format="json")


class PublicationTests(Base):
    def test_unpaid_listing_cannot_be_published_from_the_coordination_screen(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=False)
        m = self.dossier(org=org)
        c = self.boss()
        self.assertNotIn(org.pk, self.items(c, "organizations"))  # elle se publiera au paiement : pas dans la file
        r = c.post(f"/api/coordination/queue/organizations/{org.pk}/publish/", format="json")
        self.assertEqual(r.status_code, 404)
        self.assertIn(m.reference, ms.publication_blocker(org))

    def test_listing_hidden_by_the_member_is_not_offered_for_publication(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=False, hidden_by_member=True)
        self.active(org=org)
        self.assertNotIn(org.pk, self.items(self.boss(), "organizations"))
        self.assertIn("retirée", ms.publication_blocker(org))

    def test_admin_publish_action_respects_the_dossier(self):
        User.objects.create_superuser("root", "root@x.org", PW)
        self.client.login(username="root", password=PW)
        blocked = make_org("Bloquée", status=VS.ACCEPTED, published=False)
        self.dossier(org=blocked)
        free = make_org("Libre", status=VS.ACCEPTED, published=False)
        self.client.post("/admin/organizations/organization/", {"action": "publish", "_selected_action": [blocked.pk, free.pk]})
        blocked.refresh_from_db(); free.refresh_from_db()
        self.assertEqual((blocked.is_published, free.is_published), (False, True))

    def test_accepting_the_listing_of_an_up_to_date_member_publishes_it(self):
        org = make_org("Org A", status=VS.PENDING, published=False)
        self.active(org=org)
        r = self.boss().post(f"/api/coordination/queue/organizations/{org.pk}/accept/", format="json")
        org.refresh_from_db()
        self.assertTrue(org.is_published)
        self.assertIn("publiée", r.json()["detail"])

    def test_changing_to_a_category_without_public_listing_unpublishes(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=True)
        m = self.active(org=org)
        m.category = self.indiv
        m.save()
        ms.sync_organization(m)
        org.refresh_from_db()
        self.assertFalse(org.is_published)


class LinkingTests(Base):
    def test_a_published_listing_is_never_taken_over_by_name(self):
        org = make_org("Exemple SA", status=VS.ACCEPTED, published=True)
        self.application(email="pirate@x.org")
        m = Membership.objects.get()
        self.assertIsNone(m.organization)
        ms.reject(m)
        org.refresh_from_db()
        self.assertEqual((org.is_published, org.validation_status), (True, VS.ACCEPTED))

    def test_an_unpublished_listing_with_the_same_name_is_linked_with_a_note(self):
        org = make_org("Exemple SA", status=VS.PENDING, published=False, representative_email="autre@x.org")
        self.application()
        m = Membership.objects.get()
        self.assertEqual(m.organization, org)
        self.assertIn("même nom", m.notes)

    def test_a_new_listing_does_not_join_a_rejected_dossier(self):
        rejected = self.dossier(status=S.REJECTED)
        org = make_org("Nouvelle", status=VS.PENDING, published=False, representative_email="a@x.org")
        m = ms.link_org_submission(org)
        self.assertNotEqual(m.pk, rejected.pk)
        self.assertEqual(m.status, S.RECEIVED)

    def test_the_same_application_sent_twice_keeps_one_dossier(self):
        self.application()
        self.application(representative="Autre contact")
        self.assertEqual(Membership.objects.count(), 1)
        self.assertEqual(MembershipApplication.objects.count(), 2)
        self.assertIn("doublon", Membership.objects.get().notes)
        self.assertIn("déjà enregistrée", mail.outbox[-1].body)

    def test_a_new_application_after_a_refusal_opens_a_new_dossier(self):
        self.application()
        ms.reject(Membership.objects.get())
        self.application()
        self.assertEqual(Membership.objects.count(), 2)


class PaymentTests(Base):
    def test_a_mistaken_payment_is_cancelled_and_the_period_recomputed(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=False)
        m = self.dossier(org=org)
        ms.record_payment(m, amount=150000, method="wave", reference="W-1")
        ms.record_payment(m, amount=150000, method="wave", reference="W-2")  # double saisie
        m.refresh_from_db()
        self.assertEqual(m.valid_until, ms.add_months(ms.add_months(today(), 12), 12))
        msg = ms.cancel_payment(ms.last_payment(m))
        m.refresh_from_db()
        self.assertEqual(m.valid_until, ms.add_months(today(), 12))
        self.assertIn("annulé", msg)
        ms.cancel_payment(ms.last_payment(m))
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual((m.status, m.valid_until, org.is_published), (S.ACCEPTED, None, False))
        self.assertEqual(Payment.objects.filter(cancelled=True).count(), 2)

    def test_the_same_payment_reference_is_refused(self):
        m = self.dossier()
        ms.record_payment(m, amount=50000, method="wave", reference="W-1")
        with self.assertRaises(ms.DossierError):
            ms.record_payment(m, amount=50000, method="wave", reference="w-1")

    def test_cancelling_from_the_coordination_screen(self):
        m = self.dossier()
        ms.record_payment(m, amount=150000, method="wave")
        c = self.boss()
        r = c.post(f"/api/coordination/queue/members/{m.pk}/cancel_payment/", format="json")
        self.assertEqual(r.status_code, 200, r.content)
        m.refresh_from_db()
        self.assertEqual(m.status, S.ACCEPTED)

    def test_rejecting_after_a_payment_warns_about_the_refund(self):
        m = self.dossier()
        ms.record_payment(m, amount=50000, method="wave")
        self.assertIn("remboursement", ms.reject(m))

    def test_founder_status_uses_the_application_date(self):
        self.application()
        m = Membership.objects.get()
        ms.set_category(m, self.pme); ms.accept(m)
        app_day = m.application.created_at.date()
        Membership.objects.filter(pk=m.pk).update(created_at=timezone.now() + timedelta(days=30))  # dossier repris plus tard
        m.refresh_from_db()
        with override_settings(FOUNDER_DEADLINE=app_day + timedelta(days=1)):
            ms.record_payment(m, amount=150000, method="wave")
        m.refresh_from_db()
        self.assertTrue(m.is_founder)
        self.assertIsNone(m.charter_signed_on)  # la Charte n'est jamais réputée signée sans l'avoir reçue


class EmailTests(Base):
    def test_no_login_promise_when_no_account_could_be_created(self):
        User.objects.create_user("coord", "a@x.org", PW, role=User.Role.COORDINATION)
        m = self.dossier(org=make_org("Org A", status=VS.ACCEPTED, published=False))
        msg = ms.record_payment(m, amount=150000, method="wave")[1]
        self.assertIn("Coordination", msg)
        self.assertNotIn("connecter", mail.outbox[-1].body)

    def test_individual_members_are_not_told_their_listing_is_published(self):
        m = self.dossier(category=self.indiv, org=make_org("Org A", status=VS.ACCEPTED, published=False))
        ms.record_payment(m, amount=self.indiv.amount_fcfa, method="wave")
        self.assertNotIn("fiche est publiée", mail.outbox[-1].body)
        self.assertIn("mot de passe", mail.outbox[-1].body)

    def test_password_reset_goes_to_the_login_address_and_follows_an_email_change(self):
        m = self.active()
        user, _ = accounts.ensure_account(m)
        user.set_password(PW); user.save()
        m.email = "nouveau@x.org"
        m.save()
        accounts.sync_user_email(m)
        user.refresh_from_db()
        self.assertEqual((user.email, user.username), ("nouveau@x.org", "nouveau@x.org"))
        mail.outbox.clear()
        accounts.request_password_reset("nouveau@x.org")
        self.assertEqual(mail.outbox[0].to, ["nouveau@x.org"])

    def test_suspended_member_gets_an_accurate_message(self):
        m = self.active()
        user, _ = accounts.ensure_account(m)
        user.set_password(PW); user.save()
        ms.suspend(m)
        r = self.client.post("/api/members/login/", {"identifier": "a@x.org", "password": PW}, format="json")
        self.assertIn("suspendue", r.json()["detail"])

    def test_bulletin_warns_when_no_charter_is_online(self):
        m = self.dossier()
        r = self.boss().post(f"/api/coordination/queue/memberships/{m.pk}/send_bulletin/", format="json")
        self.assertIn("aucune Charte", r.json()["detail"])

    def test_changing_the_category_after_the_bulletin_asks_to_resend_it(self):
        m = self.dossier(charter_sent_at=timezone.now())
        c = self.boss()
        r = c.post(f"/api/coordination/queue/memberships/{m.pk}/set_category/", {"category": self.indiv.slug}, format="json")
        self.assertIn("renvoyez", r.json()["detail"])


class SuspensionTests(Base):
    def test_suspended_dossiers_can_be_reinstated_from_the_coordination_screen(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=True)
        m = self.active(org=org)
        ms.suspend(m)
        c = self.boss()
        self.assertIn(m.pk, self.items(c, "suspended"))
        r = c.post(f"/api/coordination/queue/suspended/{m.pk}/reinstate/", format="json")
        self.assertEqual(r.status_code, 200, r.content)
        m.refresh_from_db(); org.refresh_from_db()
        self.assertEqual((m.status, org.is_published), (S.ACTIVE, True))


class DeadlineTests(Base):
    def test_expired_listing_leaves_the_directory_without_the_scheduled_task(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=True)
        m = self.dossier(status=S.ACTIVE, org=org, valid_until=today() - timedelta(days=1), activated_at=today() - timedelta(days=370))
        self.assertEqual(self.client.get("/api/organizations/").json()["count"], 0)
        m.refresh_from_db()
        self.assertEqual(m.status, S.EXPIRED)

    def test_reminders_are_sent_once_at_30_and_7_days(self):
        self.active(days=20)
        self.assertEqual(ms.send_reminders(), 1)
        self.assertEqual(ms.send_reminders(), 0)  # pas deux fois pour la même échéance
        self.assertEqual(ms.send_reminders(today() + timedelta(days=15)), 1)  # J-5 : rappel J-7
        self.assertEqual(ms.send_reminders(today() + timedelta(days=15)), 0)
        self.assertIn("arrive à échéance", mail.outbox[-1].subject)

    def test_daily_command_expires_and_reminds(self):
        self.active(days=25)
        self.dossier(status=S.ACTIVE, valid_until=today() - timedelta(days=2), activated_at=today() - timedelta(days=400), email="b@x.org", name="Org B")
        out = StringIO()
        call_command("expire_memberships", stdout=out)
        self.assertIn("1 cotisation(s) échue(s), 1 rappel(s)", out.getvalue())

    def test_opportunities_of_expired_members_are_hidden(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=False)
        m = self.dossier(status=S.EXPIRED, org=org, valid_until=today() - timedelta(days=3), activated_at=today() - timedelta(days=400))
        Opportunity.objects.create(organization=org, type=OpportunityType.objects.first() or OpportunityType.objects.create(name="Partenariat"),
                                   title="Annonce", description="Texte", status="published")
        self.assertEqual(Opportunity.objects.open().count(), 0)
        m.status, m.valid_until = S.ACTIVE, today() + timedelta(days=30)
        m.save()
        self.assertEqual(Opportunity.objects.open().count(), 1)


class SecurityTests(Base):
    def test_jwt_endpoint_is_gone(self):
        self.assertEqual(self.client.post("/api/auth/token/", {"username": "x", "password": "y"}, format="json").status_code, 404)

    def test_api_documentation_is_reserved_to_staff(self):
        self.assertIn(self.client.get("/api/schema/").status_code, (401, 403))

    def test_status_cannot_be_edited_by_hand_in_the_admin(self):
        from django.contrib import admin
        self.assertIn("status", admin.site._registry[Membership].readonly_fields)

    def test_admin_refuses_an_email_already_used_by_another_account(self):
        from apps.memberships.admin import MembershipForm
        User.objects.create_user("autre", "pris@x.org", PW)
        m = self.active()
        accounts.ensure_account(m)
        m.refresh_from_db()
        data = {f.name: getattr(m, f.attname) for f in Membership._meta.concrete_fields if f.editable}
        data.update(email="pris@x.org", status=m.status)
        form = MembershipForm(data=data, instance=m)
        self.assertFalse(form.is_valid())
        self.assertIn("email", form.errors)
