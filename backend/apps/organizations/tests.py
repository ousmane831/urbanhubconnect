from decimal import Decimal

from django.core.exceptions import ValidationError
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase

from apps.core.testing import make_org
from apps.organizations.api import DETAIL_FIELDS, LIST_FIELDS
from apps.organizations.models import (PRIVATE_FIELDS, College, Commission, Organization, Pole,
                                       ValidationStatus as VS)
from apps.users.models import User

SECRETS = ("SECRET-PHONE", "SECRET-MAIL@x.org", "SECRET-OFFER", "SECRET-NEED", "SECRET-REP")


def secret_org(name="Org Secrète", **kw):
    return make_org(name, representative_phone="SECRET-PHONE", representative_email="SECRET-MAIL@x.org",
                    offers="SECRET-OFFER", needs="SECRET-NEED", representative_name="SECRET-REP",
                    phone="SECRET-PHONE", email="SECRET-MAIL@x.org", **kw)


class OrganizationModelTests(TestCase):
    def test_slug_generated_and_unique(self):
        a, b = make_org("Alpha Corp"), make_org("Alpha Corp")
        self.assertEqual((a.slug, b.slug), ("alpha-corp", "alpha-corp-2"))

    def test_default_status_is_pending(self):
        self.assertEqual(Organization._meta.get_field("validation_status").default, VS.PENDING)
        self.assertFalse(Organization._meta.get_field("is_published").default)

    def test_cannot_publish_unless_accepted(self):
        o = make_org(status=VS.PENDING, published=True)
        self.assertFalse(o.is_published)  # forcé à False par save()
        o.is_published = True
        with self.assertRaises(ValidationError):
            o.full_clean()

    def test_workflow_accepted_is_not_auto_published(self):
        o = make_org(status=VS.PENDING, published=False)
        for status in (VS.REVIEWING, VS.ACCEPTED):
            o.validation_status = status
            o.save()
        self.assertFalse(o.is_published)
        self.assertFalse(Organization.objects.public().filter(pk=o.pk).exists())
        o.is_published = True
        o.save()
        self.assertTrue(Organization.objects.public().filter(pk=o.pk).exists())
        o.validation_status = VS.REJECTED
        o.save()
        o.refresh_from_db()
        self.assertFalse(o.is_published)

    def test_public_queryset_requires_accepted_and_published(self):
        ok = make_org("Ok")
        make_org("Masquée", published=False)
        pending = make_org("Pending", status=VS.PENDING)
        Organization.objects.filter(pk=pending.pk).update(is_published=True)  # contournement ORM
        self.assertEqual(list(Organization.objects.public()), [ok])

    def test_commissions_many_to_many(self):
        o = make_org()
        c1 = Commission.objects.create(name="Commission A", number=1)
        c2 = Commission.objects.create(name="Commission B", number=2)
        o.commissions.add(c1, c2)
        self.assertEqual(o.commissions.count(), 2)
        self.assertEqual(list(c1.organizations.all()), [o])

    def test_college_is_protected(self):
        o = make_org()
        from django.db.models import ProtectedError
        with self.assertRaises(ProtectedError):
            o.college.delete()

    def test_coordinates_validation(self):
        o = make_org()
        cases = [(Decimal("14.72"), Decimal("-17.18"), True), (Decimal("95"), Decimal("-17"), False),
                 (Decimal("14.7"), None, False), (Decimal("-17.18"), Decimal("14.72"), False)]
        for lat, lon, valid in cases:
            o.latitude, o.longitude = lat, lon
            if valid:
                o.full_clean()
            else:
                with self.assertRaises(ValidationError):
                    o.full_clean()


class OrganizationApiTests(APITestCase):
    def test_only_public_organizations_listed(self):
        make_org("Visible")
        make_org("Masquée", published=False)
        make_org("En attente", status=VS.PENDING)
        make_org("Refusée", status=VS.REJECTED)
        names = [r["name"] for r in self.client.get(reverse("organization-list")).json()["results"]]
        self.assertEqual(names, ["Visible"])

    def test_unpublished_detail_is_404(self):
        o = make_org("Masquée", published=False)
        self.assertEqual(self.client.get(reverse("organization-detail", args=[o.slug])).status_code, 404)

    def test_private_data_never_exposed(self):
        o = secret_org()
        listing = self.client.get(reverse("organization-list"))
        detail = self.client.get(reverse("organization-detail", args=[o.slug]))
        for resp in (listing, detail):
            for secret in SECRETS:
                self.assertNotIn(secret, resp.content.decode())
        self.assertEqual(set(listing.json()["results"][0]), set(LIST_FIELDS))
        self.assertEqual(set(detail.json()), set(DETAIL_FIELDS))
        self.assertFalse(set(PRIVATE_FIELDS) & set(DETAIL_FIELDS))

    def test_filters_and_search(self):
        c = Commission.objects.create(name="Commission A", number=1)
        a = make_org("Alpha", pole=Pole.LAC_ROSE, member_founder=True)
        a.commissions.add(c)
        make_org("Beta", pole=Pole.DIAMNIADIO, description="restauration")
        url = reverse("organization-list")
        names = lambda **p: sorted(r["name"] for r in self.client.get(url, p).json()["results"])
        self.assertEqual(names(pole="LAC_ROSE"), ["Alpha"])
        self.assertEqual(names(commission=c.slug), ["Alpha"])
        self.assertEqual(names(founder="true"), ["Alpha"])
        self.assertEqual(names(college=College.objects.get().slug), ["Alpha", "Beta"])
        self.assertEqual(names(search="restauration"), ["Beta"])

    def test_search_does_not_leak_private_fields(self):
        secret_org()
        self.assertEqual(self.client.get(reverse("organization-list"), {"search": "SECRET-OFFER"}).json()["count"], 0)

    def test_filters_endpoint(self):
        make_org()
        data = self.client.get(reverse("organization-filters")).json()
        self.assertEqual(set(data), {"poles", "colleges", "sectors", "commissions"})

    def test_api_is_read_only(self):
        admin = User.objects.create_superuser("root", "root@x.org", "pw")
        url = reverse("organization-list")
        self.assertEqual(self.client.post(url, {"name": "x"}).status_code, 405)
        self.client.force_login(admin)
        self.assertEqual(self.client.post(url, {"name": "x"}).status_code, 405)


class OrganizationAdminTests(TestCase):
    def setUp(self):
        self.url = reverse("admin:organizations_organization_changelist")
        self.admin = User.objects.create_superuser("root", "root@x.org", "pw")

    def test_anonymous_redirected_to_login(self):
        self.assertEqual(self.client.get(self.url).status_code, 302)

    def test_staff_without_permissions_forbidden(self):
        coord = User.objects.create_user("coord", "c@x.org", "pw", role=User.Role.COORDINATION)
        self.assertTrue(coord.is_staff)
        self.client.force_login(coord)
        self.assertEqual(self.client.get(self.url).status_code, 403)

    def test_superuser_can_open_changelist_and_forms(self):
        o = make_org()
        self.client.force_login(self.admin)
        self.assertEqual(self.client.get(self.url).status_code, 200)
        self.assertEqual(self.client.get(reverse("admin:organizations_organization_change", args=[o.pk])).status_code, 200)

    def _act(self, action, *orgs):
        self.client.force_login(self.admin)
        self.client.post(self.url, {"action": action, "index": 0, "_selected_action": [o.pk for o in orgs]})
        for o in orgs:
            o.refresh_from_db()

    def test_accept_action_does_not_publish(self):
        o = make_org(status=VS.PENDING, published=False)
        self._act("accept", o)
        self.assertEqual((o.validation_status, o.is_published, o.reviewed_by), (VS.ACCEPTED, False, self.admin))

    def test_publish_action_skips_non_accepted(self):
        pending = make_org("P", status=VS.PENDING, published=False)
        accepted = make_org("A", published=False)
        self._act("publish", pending, accepted)
        self.assertFalse(pending.is_published)
        self.assertTrue(accepted.is_published)

    def test_reject_action_hides(self):
        o = make_org()
        self._act("reject", o)
        self.assertEqual((o.validation_status, o.is_published), (VS.REJECTED, False))
