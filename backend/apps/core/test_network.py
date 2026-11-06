import shutil
import tempfile
from datetime import timedelta
from io import StringIO

from django.core import mail
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.core.management import call_command
from django.test import override_settings
from django.utils import timezone
from rest_framework.test import APIClient, APITestCase

from apps.core.models import SiteSettings
from apps.core.testing import make_org
from apps.documents.models import MemberDocument
from apps.memberships import accounts
from apps.memberships.models import ConnectionRequest, Membership, MembershipCategory, Opportunity
from apps.organizations.models import Organization, ValidationStatus as VS
from apps.users.models import User

S = Membership.Status
PW = "Mot-de-passe-123"
MSG = "Bonjour, nous cherchons un fournisseur de matériel de bureau pour notre site de Diamniadio."
today = timezone.localdate


class Base(APITestCase):
    def setUp(self):
        call_command("seed_initial_data", stdout=StringIO())
        self.pme = MembershipCategory.objects.get(amount_fcfa=150000)

    def member(self, name, email, **orgkw):
        org = make_org(name, status=VS.ACCEPTED, published=True, representative_email=email, representative_name=f"Rep {name}", **orgkw)
        m = Membership.objects.create(name=name, status=S.ACTIVE, category=self.pme, organization=org, representative=f"Rep {name}", email=email,
                                      valid_until=today() + timedelta(days=200), activated_at=today())
        user, _ = accounts.ensure_account(m)
        user.set_password(PW)
        user.save()
        return m

    def client_for(self, email):
        c = APIClient()
        assert c.post("/api/members/login/", {"identifier": email, "password": PW}, format="json").status_code == 200
        return c

    def boss(self):
        User.objects.create_user("boss", "b@x.org", PW, role=User.Role.COORDINATION)
        c = APIClient()
        c.post("/api/coordination/login/", {"username": "boss", "password": PW}, format="json")
        return c

    def opp(self, **kw):
        return {"type": "partenariat", "title": "Recherche partenaire logistique", "description": "Nous recherchons un partenaire pour la logistique.", **kw}


class ConnectionTests(Base):
    def setUp(self):
        super().setUp()
        self.a, self.d = self.member("Org A", "a@x.org"), self.member("Org D", "d@x.org")
        Membership.objects.filter(pk=self.a.pk).update(phone="770001122")
        self.ca = self.client_for("a@x.org")

    def send(self, slug="org-d", message=MSG, client=None):
        return (client or self.ca).post("/api/members/connections/", {"organization": slug, "message": message}, format="json")

    def test_request_is_stored_for_the_coordination_and_not_sent(self):
        mail.outbox.clear()
        self.assertEqual(self.send().status_code, 201)
        req = ConnectionRequest.objects.get()
        self.assertEqual((req.status, req.sender, req.recipient.slug), ("pending", self.a, "org-d"))
        self.assertEqual(len(mail.outbox), 0)
        listed = self.ca.get("/api/members/connections/").json()
        self.assertEqual((len(listed), listed[0]["status_label"]), (1, "À transmettre"))

    def test_validation_rules(self):
        self.assertEqual(self.send(message="court").status_code, 400)
        self.assertEqual(self.send(message="x" * 1001).status_code, 400)
        self.assertEqual(self.send(slug="org-a").status_code, 400)  # soi-même
        make_org("Org Legacy", status=VS.ACCEPTED, published=True)
        self.assertEqual(self.send(slug="org-legacy").status_code, 404)  # non membre
        self.assertEqual(self.send().status_code, 201)
        self.assertEqual(self.send().status_code, 400)  # déjà en attente

    @override_settings(MEMBER_REQUESTS_PER_DAY=1)
    def test_daily_limit(self):
        self.member("Org E", "e@x.org")
        self.assertEqual(self.send().status_code, 201)
        blocked = self.send(slug="org-e")
        self.assertEqual(blocked.status_code, 400)
        self.assertIn("Limite quotidienne", blocked.json()["detail"])

    def test_coordination_forwards_with_reply_to_and_sender_contact(self):
        self.send()
        boss = self.boss()
        item = boss.get("/api/coordination/queue/connections/").json()["items"][0]
        self.assertEqual({a["id"] for a in item["actions"]}, {"accept", "reject"})
        mail.outbox.clear()
        self.assertEqual(boss.post(f"/api/coordination/queue/connections/{item['id']}/accept/").status_code, 200)
        sent = mail.outbox[0]
        self.assertEqual((sent.to, sent.reply_to), (["d@x.org"], ["a@x.org"]))
        self.assertIn(MSG, sent.body)
        self.assertIn("770001122", sent.body)
        self.assertEqual(ConnectionRequest.objects.get().status, "forwarded")
        self.assertEqual(boss.post(f"/api/coordination/queue/connections/{item['id']}/accept/").status_code, 404)  # déjà traitée

    def test_decline_informs_the_sender(self):
        self.send()
        req = ConnectionRequest.objects.get()
        mail.outbox.clear()
        self.assertEqual(self.boss().post(f"/api/coordination/queue/connections/{req.pk}/reject/").status_code, 200)
        req.refresh_from_db()
        self.assertEqual(req.status, "declined")
        self.assertEqual(mail.outbox[0].to, ["a@x.org"])

    def test_forwarding_fails_cleanly_without_a_contact_address(self):
        Organization.objects.filter(pk=self.d.organization_id).update(representative_email="", email="")
        self.send()
        req = ConnectionRequest.objects.get()
        r = self.boss().post(f"/api/coordination/queue/connections/{req.pk}/accept/")
        self.assertEqual(r.status_code, 400)
        req.refresh_from_db()
        self.assertEqual(req.status, "pending")

    def test_closed_to_visitors_and_to_members_who_are_no_longer_current(self):
        self.assertEqual(APIClient().get("/api/members/connections/").status_code, 403)
        Membership.objects.filter(pk=self.a.pk).update(status=S.EXPIRED)
        self.assertEqual(self.ca.get("/api/members/connections/").status_code, 403)


class OpportunityTests(Base):
    URL = "/api/members/opportunities/"

    def setUp(self):
        super().setUp()
        self.a, self.d = self.member("Org A", "a@x.org"), self.member("Org D", "d@x.org")
        self.ca, self.cd = self.client_for("a@x.org"), self.client_for("d@x.org")

    def unmoderated(self):
        s = SiteSettings.load(); s.moderate_opportunities = False; s.save()

    def test_moderated_publication_flow(self):
        r = self.ca.post(self.URL, self.opp(deadline=(today() + timedelta(days=30)).isoformat()), format="json")
        self.assertEqual(r.status_code, 201)
        self.assertIn("validation", r.json()["detail"])
        self.assertEqual(Opportunity.objects.get().status, "pending")
        self.assertEqual(self.cd.get(self.URL).json()["count"], 0)  # invisible aux autres membres
        self.assertEqual(self.ca.get(self.URL, {"mine": "true"}).json()["results"][0]["status"], "pending")
        boss = self.boss()
        item = boss.get("/api/coordination/queue/opportunities/").json()["items"][0]
        mail.outbox.clear()
        self.assertEqual(boss.post(f"/api/coordination/queue/opportunities/{item['id']}/accept/").status_code, 200)
        results = self.cd.get(self.URL).json()["results"]
        self.assertEqual((len(results), results[0]["organization"]["name"], results[0]["mine"]), (1, "Org A", False))
        self.assertTrue(self.ca.get(self.URL).json()["results"][0]["mine"])
        self.assertEqual(mail.outbox[0].to, ["a@x.org"])

    def test_immediate_publication_when_moderation_is_off(self):
        self.unmoderated()
        self.assertEqual(self.ca.post(self.URL, self.opp(), format="json").status_code, 201)
        self.assertEqual(Opportunity.objects.get().status, "published")
        self.assertEqual(self.cd.get(self.URL).json()["count"], 1)

    def test_rejection_notifies_the_publisher(self):
        self.ca.post(self.URL, self.opp(), format="json")
        o = Opportunity.objects.get()
        mail.outbox.clear()
        self.assertEqual(self.boss().post(f"/api/coordination/queue/opportunities/{o.pk}/reject/").status_code, 200)
        self.assertEqual((Opportunity.objects.get().status, mail.outbox[0].to), ("rejected", ["a@x.org"]))
        self.assertEqual(self.cd.get(self.URL).json()["count"], 0)

    def test_validation_rules(self):
        for bad in (self.opp(deadline=(today() - timedelta(days=1)).isoformat()), self.opp(type="inconnu"), self.opp(title=""), self.opp(description="x" * 2001)):
            self.assertEqual(self.ca.post(self.URL, bad, format="json").status_code, 400, bad)
        indiv = Membership.objects.create(name="Indiv", status=S.ACTIVE, category=self.pme, representative="I", email="i@x.org",
                                          valid_until=today() + timedelta(days=100), activated_at=today())
        user, _ = accounts.ensure_account(indiv)
        user.set_password(PW); user.save()
        refused = self.client_for("i@x.org").post(self.URL, self.opp(), format="json")
        self.assertEqual(refused.status_code, 400)
        self.assertIn("fiche", refused.json()["detail"])

    @override_settings(OPPORTUNITIES_PER_DAY=2)
    def test_daily_limit(self):
        self.unmoderated()
        for _ in range(2):
            self.assertEqual(self.ca.post(self.URL, self.opp(), format="json").status_code, 201)
        self.assertEqual(self.ca.post(self.URL, self.opp(), format="json").status_code, 400)

    @override_settings(OPPORTUNITIES_OPEN_MAX=1)
    def test_open_announcements_cap(self):
        self.unmoderated()
        self.ca.post(self.URL, self.opp(), format="json")
        self.assertEqual(self.ca.post(self.URL, self.opp(), format="json").status_code, 400)

    def test_edit_close_and_expiry(self):
        self.unmoderated()
        self.ca.post(self.URL, self.opp(), format="json")
        o = Opportunity.objects.get()
        edit = lambda client, **kw: client.post(f"{self.URL}{o.pk}/", self.opp(**kw), format="json")
        self.assertEqual(edit(self.cd).status_code, 404)  # pas l'annonce d'un autre
        self.assertEqual(edit(self.ca, title="Titre modifié").status_code, 200)
        o.refresh_from_db()
        self.assertEqual((o.title, o.status), ("Titre modifié", "published"))
        s = SiteSettings.load(); s.moderate_opportunities = True; s.save()
        edit(self.ca, title="Revalidation")
        o.refresh_from_db()
        self.assertEqual(o.status, "pending")  # une annonce modifiée est revalidée
        Opportunity.objects.filter(pk=o.pk).update(status="published")
        self.assertEqual(self.ca.post(f"{self.URL}{o.pk}/close/").status_code, 200)
        self.assertEqual(self.cd.get(self.URL).json()["count"], 0)
        self.assertEqual(self.ca.post(f"{self.URL}{o.pk}/close/").status_code, 400)
        Opportunity.objects.create(organization=self.a.organization, type=o.type, title="Échue", description="d", status="published",
                                   published_at=timezone.now(), deadline=today() - timedelta(days=1))
        self.assertEqual(self.cd.get(self.URL).json()["count"], 0)  # date limite dépassée

    def test_filters_search_and_types(self):
        self.unmoderated()
        self.ca.post(self.URL, self.opp(title="Partenaire logistique"), format="json")
        self.ca.post(self.URL, self.opp(type="emploi", title="Chauffeur", description="Poste de chauffeur livreur"), format="json")
        names = lambda **p: [r["title"] for r in self.cd.get(self.URL, p).json()["results"]]
        self.assertEqual(names(type="emploi"), ["Chauffeur"])
        self.assertEqual(names(search="livreur"), ["Chauffeur"])
        types = [t["name"] for t in self.cd.get(f"{self.URL}types/").json()]
        self.assertEqual(len(types), 8)
        self.assertIn("Appel d'offres", types)

    def test_response_goes_straight_to_the_publisher(self):
        self.unmoderated()
        self.ca.post(self.URL, self.opp(), format="json")
        o = Opportunity.objects.get()
        mail.outbox.clear()
        r = self.cd.post(f"{self.URL}{o.pk}/respond/", {"message": MSG}, format="json")
        self.assertEqual(r.status_code, 201)
        req = ConnectionRequest.objects.get()
        self.assertEqual((req.status, req.opportunity), ("forwarded", o))
        self.assertEqual((mail.outbox[0].to, mail.outbox[0].reply_to), (["a@x.org"], ["d@x.org"]))
        self.assertIn(o.title, mail.outbox[0].body)
        self.assertEqual(self.ca.post(f"{self.URL}{o.pk}/respond/", {"message": MSG}, format="json").status_code, 400)  # sa propre annonce
        self.ca.post(f"{self.URL}{o.pk}/close/")
        self.assertEqual(self.cd.post(f"{self.URL}{o.pk}/respond/", {"message": MSG}, format="json").status_code, 404)

    def test_response_stays_for_the_coordination_when_the_publisher_has_no_address(self):
        self.unmoderated()
        self.ca.post(self.URL, self.opp(), format="json")
        o = Opportunity.objects.get()
        Organization.objects.filter(pk=self.a.organization_id).update(representative_email="", email="")
        r = self.cd.post(f"{self.URL}{o.pk}/respond/", {"message": MSG}, format="json")
        self.assertEqual(r.status_code, 201)
        self.assertEqual(ConnectionRequest.objects.get().status, "pending")


class DocumentTests(Base):
    def setUp(self):
        super().setUp()
        self.tmp = tempfile.mkdtemp()
        patch = override_settings(PRIVATE_MEDIA_ROOT=self.tmp)
        patch.enable()
        self.addCleanup(patch.disable)
        self.addCleanup(shutil.rmtree, self.tmp, ignore_errors=True)
        self.m = self.member("Org A", "a@x.org")
        self.ca = self.client_for("a@x.org")

    def doc(self, title, published, content=b"%PDF-1.4 contenu"):
        d = MemberDocument(title=title, category="urban_notes", is_published=published)
        d.file.save("notes.pdf", ContentFile(content), save=False)
        d.save()
        return d

    def test_members_see_and_download_only_published_documents(self):
        pub, draft = self.doc("Urban Notes n°1", True), self.doc("Brouillon", False)
        self.assertEqual([d["title"] for d in self.ca.get("/api/members/documents/").json()], ["Urban Notes n°1"])
        r = self.ca.get(f"/api/members/documents/{pub.pk}/download/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(b"".join(r.streaming_content), b"%PDF-1.4 contenu")
        self.assertIn("attachment", r["Content-Disposition"])
        self.assertEqual(self.ca.get(f"/api/members/documents/{draft.pk}/download/").status_code, 404)

    def test_files_are_never_publicly_reachable(self):
        d = self.doc("Urban Notes n°1", True)
        self.assertTrue(d.file.path.startswith(self.tmp))
        self.assertFalse(d.file.path.startswith(str(__import__("django.conf", fromlist=["settings"]).settings.MEDIA_ROOT)))
        with self.assertRaises(ValueError):
            d.file.url  # aucun lien public n'existe
        self.assertIn(APIClient().get(f"/api/members/documents/{d.pk}/download/").status_code, (401, 403))
        self.assertIn(APIClient().get("/api/members/documents/").status_code, (401, 403))

    def test_access_ends_with_the_membership(self):
        d = self.doc("Urban Notes n°1", True)
        Membership.objects.filter(pk=self.m.pk).update(status=S.EXPIRED)
        self.assertEqual(self.ca.get(f"/api/members/documents/{d.pk}/download/").status_code, 403)

    def test_only_pdf_files_are_accepted(self):
        d = MemberDocument(title="t", category="other", file=SimpleUploadedFile("x.txt", b"hello"))
        with self.assertRaises(ValidationError):
            d.full_clean()
