from django.contrib.auth.models import Group, Permission
from django.db.models import Q

GROUP_NAME = "Coordination"
PROJECT_APPS = ("core", "organizations", "map", "events", "memberships", "partnerships",
                "news", "press", "newsletter", "contact", "documents")


def sync_coordination_group():
    """La Coordination peut voir/ajouter/modifier le contenu du site, mais ni supprimer ni gérer les comptes."""
    group, _ = Group.objects.get_or_create(name=GROUP_NAME)
    perms = Permission.objects.filter(content_type__app_label__in=PROJECT_APPS).filter(
        Q(codename__startswith="add_") | Q(codename__startswith="change_") | Q(codename__startswith="view_"))
    group.permissions.set(perms)
    return group
