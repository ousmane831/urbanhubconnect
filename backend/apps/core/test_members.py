import re
from datetime import timedelta
from decimal import Decimal
from io import BytesIO, StringIO
from urllib.parse import parse_qs, urlparse

from django.contrib.auth.tokens import default_token_generator
from django.core import mail
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from PIL import Image
from rest_framework.test import APIClient, APITestCase

from apps.core.testing import make_org
from apps.map.models import MapCategory, MapPlace
from apps.memberships import accounts, services as ms
from apps.memberships.models import ContactReveal, Membership, MembershipCategory, ProfileChange
from apps.organizations.models import ValidationStatus as VS
from apps.users.models import User

S = Membership.Status
PW = "Mot-de-passe-123"
today = timezone.localdate


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.pme = MembershipCategory.objects.get(amount_fcfa=150000)

    def member(self, name="Org A", email="a@x.org", published=True, **orgkw):
        org = make_org(name, status=VS.ACCEPTED, published=published, representative_email=email, representative_name=f"Rep {name}",
                       representative_phone="770000000", **orgkw)
        m = Membership.objects.create(name=name, status=S.ACTIVE, category=self.pme, organization=org, representative="Rep", email=email,
                                      valid_until=today() + timedelta(days=200), activated_at=today())
        user, _ = accounts.ensure_account(m)
        user.set_password(PW)
        user.save()
        return m

    def login(self, email="a@x.org", password=PW, client=None):
        return (client or self.client).post("/api/members/login/", {"identifier": email, "password": password}, format="json")

    def boss(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c

    @staticmethod
    def link_params(text):
        url = re.search(r"https?://\S+/espace-membres/mot-de-passe\?\S+", text).group(0)
        q = parse_qs(urlparse(url).query)
        return q["uid"][0], q["token"][0]

    def post(self, url, data, **kw):
        return self.client.post(url, data, format=kw.pop("format", "json"), **kw)


class AccountTests(Base):
    def test_first_payment_creates_the_account_and_sends_the_invitation(self):
        org = make_org("Org A", status=VS.ACCEPTED, published=False, representative_email="a@x.org")
        m = Membership.objects.create(name="Org A", status=S.ACCEPTED, category=self.pme, organization=org, representative="Rep", email="a@x.org")
        mail.outbox.clear()
        ms.record_payment(m, amount=150000, method="wave")
        m.refresh_from_db()
        self.assertEqual(m.user.role, User.Role.MEMBER)
        self.assertFalse(m.user.has_usable_password())
        invitations = [e for e in mail.outbox if "espace-membres/mot-de-passe" in e.body]
        self.assertEqual(len(invitations), 1)
        self.assertEqual(invitations[0].to, ["a@x.org"])
        uid, token = self.link_params(invitations[0].body)
        self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": token, "password": PW}).status_code, 200)
        self.assertEqual(self.login().status_code, 200)

    def test_staff_address_never_becomes_a_member_account(self):
        User.objects.create_user("staff", "a@x.org", PW, role=User.Role.COORDINATION)
        m = Membership.objects.create(name="Org A", status=S.ACCEPTED, category=self.pme, representative="Rep", email="a@x.org")
        _, msg = ms.record_payment(m, amount=150000, method="wave")
        m.refresh_from_db()
        self.assertIsNone(m.user)
        self.assertIn("compte de la Coordination", msg)
        self.assertEqual(m.status, S.ACTIVE)  # la cotisation reste enregistrée

    def test_password_rules_and_single_use_link(self):
        m = self.member()
        User.objects.filter(pk=m.user_id).update(password="!")  # compte sans mot de passe
        user = User.objects.get(pk=m.user_id)
        uid, token = self.link_params(accounts.password_link(user))
        for bad in ("court", "12345678901234", ""):
            self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": token, "password": bad}).status_code, 400, bad)
        self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": "faux", "password": PW}).status_code, 400)
        self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": token, "password": "Nouveau-mdp-456"}).status_code, 200)
        self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": token, "password": "Autre-mdp-789012"}).status_code, 400)

    def test_login_rules(self):
        m = self.member()
        ok = self.login()
        self.assertEqual(ok.status_code, 200)
        self.assertIn("valid_until", ok.json())
        wrong = self.login(password="faux")
        User.objects.create_user("staff", "st@x.org", PW, role=User.Role.COORDINATION)
        staff = self.login("staff")
        self.assertEqual((wrong.status_code, staff.status_code), (400, 400))
        self.assertEqual(wrong.json(), staff.json())  # aucun indice sur les comptes
        Membership.objects.filter(pk=m.pk).update(status=S.EXPIRED)
        expired = self.login()
        self.assertEqual(expired.status_code, 400)
        self.assertIn("cotisation", expired.json()["detail"])

    def test_access_is_cut_as_soon_as_the_membership_stops(self):
        m = self.member()
        self.login()
        self.assertEqual(self.client.get("/api/members/me/").status_code, 200)
        Membership.objects.filter(pk=m.pk).update(status=S.SUSPENDED)
        self.assertEqual(self.client.get("/api/members/me/").status_code, 403)

    def test_password_reset_reveals_nothing_and_works(self):
        self.member()
        mail.outbox.clear()
        unknown = self.post("/api/members/password-reset/", {"email": "inconnu@x.org"})
        self.assertEqual((unknown.status_code, len(mail.outbox)), (200, 0))
        known = self.post("/api/members/password-reset/", {"email": "a@x.org"})
        self.assertEqual(known.json(), unknown.json())
        uid, token = self.link_params(mail.outbox[0].body)
        self.assertEqual(self.post("/api/members/set-password/", {"uid": uid, "token": token, "password": "Autre-mdp-98765"}).status_code, 200)
        self.assertEqual(self.login(password="Autre-mdp-98765").status_code, 200)

    def test_member_area_is_closed_to_visitors_and_staff(self):
        for url in ("/api/members/me/", "/api/members/profile/", "/api/members/directory/"):
            self.assertIn(self.client.get(url).status_code, (401, 403), url)
        self.boss()
        self.client.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        self.assertEqual(self.client.get("/api/members/profile/").status_code, 403)


class ProfileTests(Base):
    URL = "/api/members/profile/"

    def test_profile_exposes_private_data_to_its_owner(self):
        self.member(offers="Fournitures")
        self.login()
        data = self.client.get(self.URL).json()
        self.assertEqual(data["organization"]["representative_phone"], "770000000")
        self.assertEqual(data["organization"]["offers"], "Fournitures")
        self.assertTrue(data["listing"]["published"])
        self.assertRegex(data["membership"]["reference"], r"^UHC-")

    def test_private_fields_apply_now_public_fields_wait_for_validation(self):
        m = self.member(description="Ancienne présentation")
        self.login()
        r = self.post(self.URL, {"offers": "Nouvelle offre", "description": "Nouvelle présentation", "website": "https://exemple.org"})
        self.assertEqual(r.status_code, 200)
        org = m.organization
        org.refresh_from_db()
        self.assertEqual((org.offers, org.description, org.website), ("Nouvelle offre", "Ancienne présentation", ""))
        change = ProfileChange.objects.get(status="pending")
        self.assertEqual(set(change.changes), {"description", "website"})
        self.assertEqual(sorted(r.json()["pending"]["fields"]), ["Présentation", "Site web"])
        public = APIClient().get(f"/api/organizations/{org.slug}/").json()
        self.assertEqual(public["description"], "Ancienne présentation")

    def test_new_submissions_merge_and_reverting_a_field_drops_it(self):
        m = self.member(description="Ancienne présentation")
        self.login()
        self.post(self.URL, {"description": "A", "website": "https://exemple.org"})
        self.post(self.URL, {"description": "B"})
        self.assertEqual(ProfileChange.objects.filter(status="pending").count(), 1)
        self.assertEqual(ProfileChange.objects.get().changes, {"description": "B", "website": "https://exemple.org"})
        self.post(self.URL, {"description": "Ancienne présentation", "website": ""})
        self.assertFalse(ProfileChange.objects.exists())  # plus rien à valider

    def test_validation_errors(self):
        self.member()
        self.login()
        for bad in ({"description": "x" * 501}, {"latitude": "95", "longitude": "-17"}, {"latitude": "14.7"}, {"website": "pas une url"},
                    {"email": "pas-un-email"}):
            self.assertEqual(self.post(self.URL, bad).status_code, 400, bad)
        self.assertFalse(ProfileChange.objects.exists())

    def test_logo_waits_for_validation_then_replaces_the_current_one(self):
        m = self.member()
        self.login()
        buf = BytesIO()
        Image.new("RGB", (4, 4), "green").save(buf, "PNG")
        logo = SimpleUploadedFile("logo.png", buf.getvalue(), content_type="image/png")
        self.assertEqual(self.client.post(self.URL, {"logo": logo}, format="multipart").status_code, 200)
        change = ProfileChange.objects.get()
        self.assertTrue(change.logo)
        m.organization.refresh_from_db()
        self.assertFalse(m.organization.logo)
        boss = self.boss()
        self.assertEqual(boss.post(f"/api/coordination/queue/profile-changes/{change.pk}/accept/").status_code, 200)
        m.organization.refresh_from_db()
        self.assertTrue(m.organization.logo.name.startswith("organizations/pending-logos/"))

    def test_approval_updates_the_listing_and_the_map_point(self):
        m = self.member(latitude=Decimal("14.70"), longitude=Decimal("-17.20"))
        place = MapPlace.objects.create(name="Siège", category=MapCategory.objects.first(), organization=m.organization,
                                        latitude=Decimal("14.70"), longitude=Decimal("-17.20"), is_published=True)
        other = MapPlace.objects.create(name="Autre site", category=MapCategory.objects.first(), organization=m.organization,
                                        latitude=Decimal("14.90"), longitude=Decimal("-17.00"), is_published=True)
        self.login()
        self.post(self.URL, {"latitude": "14.75", "longitude": "-17.25", "description": "Nouvelle"})
        change = ProfileChange.objects.get()
        boss = self.boss()
        self.assertEqual(boss.post(f"/api/coordination/queue/profile-changes/{change.pk}/accept/").status_code, 200)
        for obj in (m.organization, place, other):
            obj.refresh_from_db()
        self.assertEqual((m.organization.latitude, m.organization.description), (Decimal("14.75"), "Nouvelle"))
        self.assertEqual((place.latitude, place.longitude), (Decimal("14.75"), Decimal("-17.25")))
        self.assertEqual(other.latitude, Decimal("14.90"))  # un autre site de l'organisation n'est pas déplacé
        self.assertEqual(boss.post(f"/api/coordination/queue/profile-changes/{change.pk}/accept/").status_code, 404)  # déjà traitée

    def test_rejection_keeps_the_published_data(self):
        m = self.member(description="Avant")
        self.login()
        self.post(self.URL, {"description": "Après"})
        change = ProfileChange.objects.get()
        self.assertEqual(self.boss().post(f"/api/coordination/queue/profile-changes/{change.pk}/reject/").status_code, 200)
        m.organization.refresh_from_db(); change.refresh_from_db()
        self.assertEqual((m.organization.description, change.status), ("Avant", "rejected"))

    def test_coordination_sees_before_and_after(self):
        self.member(description="Avant")
        self.login()
        self.post(self.URL, {"description": "Après"})
        items = self.boss().get("/api/coordination/queue/profile-changes/").json()["items"]
        details = dict(items[0]["details"])
        self.assertEqual((details["Présentation · avant"], details["Présentation · après"]), ("Avant", "Après"))
        self.assertEqual({a["id"] for a in items[0]["actions"]}, {"accept", "reject"})

    def test_hiding_and_showing_the_listing(self):
        m = self.member()
        self.login()
        self.assertEqual(self.post("/api/members/listing/", {"action": "hide"}).status_code, 200)
        m.organization.refresh_from_db()
        self.assertEqual((m.organization.is_published, m.organization.hidden_by_member), (False, True))
        self.assertEqual(APIClient().get(f"/api/organizations/{m.organization.slug}/").status_code, 404)
        ms.sync_organization(m)  # un renouvellement ne republie pas une fiche retirée par son organisation
        m.organization.refresh_from_db()
        self.assertFalse(m.organization.is_published)
        self.assertEqual(self.post("/api/members/listing/", {"action": "show"}).status_code, 200)
        m.organization.refresh_from_db()
        self.assertTrue(m.organization.is_published)
        self.assertEqual(self.post("/api/members/listing/", {"action": "explode"}).status_code, 400)

    def test_cannot_publish_an_unvalidated_listing(self):
        m = self.member(published=False)
        m.organization.validation_status = VS.PENDING
        m.organization.save()
        self.login()
        self.assertEqual(self.post("/api/members/listing/", {"action": "show"}).status_code, 400)


class DirectoryTests(Base):
    def test_scope_and_privacy_of_the_complete_directory(self):
        self.member("Org A", "a@x.org")
        self.member("Org D", "d@x.org", offers="Fournitures de bureau", needs="Comptable")
        make_org("Org Legacy", status=VS.ACCEPTED, published=True)  # publiée sans dossier : hors annuaire complet
        make_org("Org Retiree", status=VS.ACCEPTED, published=False)
        self.login()
        listing = self.client.get("/api/members/directory/")
        self.assertEqual(sorted(r["name"] for r in listing.json()["results"]), ["Org A", "Org D"])
        body = listing.content.decode()
        for private in ("770000000", "d@x.org", "Fournitures"):
            self.assertNotIn(private, body)
        detail = self.client.get("/api/members/directory/org-d/").json()
        self.assertEqual((detail["offers"], detail["needs"]), ("Fournitures de bureau", "Comptable"))
        self.assertNotIn("representative_email", detail)
        self.assertEqual(self.client.get("/api/members/directory/org-legacy/").status_code, 404)

    def test_members_can_search_offers_and_needs_but_visitors_cannot(self):
        self.member("Org A", "a@x.org")
        self.member("Org D", "d@x.org", offers="Fournitures de bureau")
        self.login()
        found = [r["name"] for r in self.client.get("/api/members/directory/", {"search": "Fournitures"}).json()["results"]]
        self.assertEqual(found, ["Org D"])
        self.assertEqual(APIClient().get("/api/organizations/", {"search": "Fournitures"}).json()["count"], 0)

    def test_expired_members_leave_the_complete_directory(self):
        self.member("Org A", "a@x.org")
        old = self.member("Org D", "d@x.org")
        Membership.objects.filter(pk=old.pk).update(valid_until=today() - timedelta(days=1))
        ms.expire_overdue()
        self.login()
        self.assertEqual([r["name"] for r in self.client.get("/api/members/directory/").json()["results"]], ["Org A"])

    @override_settings(MEMBER_REVEALS_PER_DAY=2)
    def test_direct_contacts_are_logged_and_limited(self):
        for name, email in (("Org A", "a@x.org"), ("Org D", "d@x.org"), ("Org E", "e@x.org"), ("Org F", "f@x.org")):
            self.member(name, email)
        self.login()
        first = self.post("/api/members/directory/org-d/contact/", {})
        self.assertEqual((first.status_code, first.json()["email"], first.json()["phone"]), (200, "d@x.org", "770000000"))
        self.assertEqual(self.post("/api/members/directory/org-d/contact/", {}).status_code, 200)  # même fiche : pas comptée deux fois
        self.assertEqual(self.post("/api/members/directory/org-e/contact/", {}).status_code, 200)
        blocked = self.post("/api/members/directory/org-f/contact/", {})
        self.assertEqual(blocked.status_code, 400)
        self.assertIn("Limite quotidienne", blocked.json()["detail"])
        self.assertEqual(ContactReveal.objects.filter(member__email="a@x.org").count(), 2)

    def test_contacts_of_non_members_cannot_be_revealed(self):
        self.member("Org A", "a@x.org")
        make_org("Org Legacy", status=VS.ACCEPTED, published=True, representative_email="l@x.org")
        self.login()
        self.assertEqual(self.post("/api/members/directory/org-legacy/contact/", {}).status_code, 404)
