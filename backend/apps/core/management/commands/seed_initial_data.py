
from datetime import datetime
from zoneinfo import ZoneInfo

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

from apps.core.roles import sync_coordination_group
from apps.core.seed_event_content import seed_event_content
from apps.core.utils import unique_slugify
from apps.events.models import Event, EventCategory, VolunteerMission
from apps.map.models import MapCategory
from apps.memberships.models import MembershipCategory
from apps.news.models import Article, ArticleCategory
from apps.organizations.models import College, Commission, Sector
from apps.partnerships.models import PartnershipTier
from apps.users.models import User


COMMISSIONS = [
    "Entreprise et Investissement",
    "Mobilité et Accessibilité",
    "Emploi, Talents et Formation",
    "Services et Cadre de vie",
    "Environnement et Durabilité",
    "Innovation et Numérique",
    "Tourisme, Culture et Attractivité",
    "Inclusion et Communautés",
]

# Libellés dérivés des clés du cahier des charges : à valider avec le document source.
COLLEGES = [
    "Institutions publiques",
    "Entreprises et investissement",
    "Savoir et innovation",
    "Communautés et talents",
]

SECTORS = [
    "Administration et services publics",
    "Industrie et production",
    "Construction et immobilier",
    "Commerce et distribution",
    "Services aux entreprises",
    "Hôtellerie, restauration et tourisme",
    "Transport et logistique",
    "Banque, assurance et finance",
    "Numérique et télécoms",
    "Santé",
    "Éducation et formation",
    "Agriculture et agro-industrie",
    "Environnement et énergie",
    "Culture, sport et loisirs",
    "Associations et ONG",
]

MAP_CATEGORIES = [
    ("Institutions et administrations", "landmark"),
    ("Entreprises et zones d'activité", "building-2"),
    ("Enseignement et formation", "graduation-cap"),
    ("Santé", "heart-pulse"),
    ("Grands équipements", "trophy"),
    ("Services de proximité", "store"),
    ("Mobilité", "bus"),
    ("Tourisme et patrimoine", "tree-palm"),
    ("Initiatives et communautés", "users"),
]

EVENT_CATEGORIES = [
    "After Work Connect",
    "Commission",
    "Visite",
    "Grand Week-End du Pôle",
]

MISSIONS = [
    "Accueil et accréditations",
    "Orientation",
    "Forum et Business Connect",
    "Portes Ouvertes",
    "Gala et protocole",
    "Caravane verte et reboisement",
]

MAP_DESCRIPTIONS = {
    "Institutions et administrations": "Ministères, agences, collectivités, services techniques",
    "Entreprises et zones d'activité": "Sièges, sites de production, parcs et zones d'activité, membres du réseau",
    "Enseignement et formation": "Universités, écoles, centres de formation",
    "Santé": "Hôpitaux, centres et postes de santé, pharmacies",
    "Grands équipements": "Centres de conférences et d'expositions, équipements sportifs et culturels",
    "Services de proximité": "Commerces, restauration, banques, services aux habitants et aux entreprises",
    "Mobilité": "Gares, arrêts, stations, parkings, navettes",
    "Tourisme et patrimoine": "Sites naturels, hébergements, artisanat, lieux culturels",
    "Initiatives et communautés": "Associations, groupements de femmes et de jeunes, projets communautaires, plantations de la Forêt Urban Hub Connect",
}

ARTICLE_CATEGORIES = [
    "Le réseau",
    "Événements",
    "Les visages du Pôle",
    "Opportunités",
]

MEMBERSHIP = [
    ("Grande entreprise, institution, banque, promoteur", 500_000),
    ("PME, établissement d'enseignement supérieur", 150_000),
    ("TPE, startup, cabinet, structure d'accompagnement", 50_000),
    ("Association, groupement de femmes, organisation de jeunes", 25_000),
    ("Membre individuel", 25_000),
    ("Étudiant(e), jeune de moins de 26 ans", 10_000),
]

PARTNERSHIP = [
    ("Partenaire Fondateur", 7_500_000),
    ("Partenaire Officiel", 4_000_000),
    ("Partenaire Associé", 2_000_000),
    ("Partenaire Engagé", 1_000_000),
    ("Pack PME du Pôle", 350_000),
]


class Command(BaseCommand):
    help = (
        "Crée les données institutionnelles de référence "
        "(idempotent, n'écrase jamais les modifications faites dans l'admin)."
    )

    def _seed(self, model, rows):
        created = 0

        for order, (name, defaults) in enumerate(rows, start=1):
            # On recherche d'abord par nom afin de rendre le seed idempotent.
            existing = model.objects.filter(name=name).first()

            if existing:
                continue

            # On crée l'instance sans slug afin que unique_slugify()
            # puisse générer un slug valide de maximum 50 caractères.
            instance = model(
                name=name,
                display_order=order,
                **defaults,
            )

            instance.slug = unique_slugify(instance, name)
            instance.save()

            created += 1

        self.stdout.write(
            f"{model._meta.verbose_name_plural:<28} "
            f"+{created} (total {model.objects.count()})"
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        self._seed(
            Commission,
            [(n, {"number": i}) for i, n in enumerate(COMMISSIONS, 1)],
        )

        self._seed(
            College,
            [(n, {}) for n in COLLEGES],
        )

        self._seed(
            Sector,
            [(n, {}) for n in SECTORS],
        )

        self._seed(
            MapCategory,
            [
                (n, {"icon": i, "description": MAP_DESCRIPTIONS[n]})
                for n, i in MAP_CATEGORIES
            ],
        )

        for name, text in MAP_DESCRIPTIONS.items():
            # Complète les descriptions encore vides,
            # sans écraser les modifications faites dans l'admin.
            MapCategory.objects.filter(
                slug=slugify(name),
                description="",
            ).update(description=text)

        self._seed(
            EventCategory,
            [(n, {}) for n in EVENT_CATEGORIES],
        )

        self._seed(
            VolunteerMission,
            [(n, {}) for n in MISSIONS],
        )

        self._seed(
            ArticleCategory,
            [(n, {}) for n in ARTICLE_CATEGORIES],
        )

        self._seed(
            MembershipCategory,
            [(n, {"amount_fcfa": a}) for n, a in MEMBERSHIP],
        )

        self._seed(
            PartnershipTier,
            [(n, {"amount_fcfa": a}) for n, a in PARTNERSHIP],
        )

        self._seed_content()

        group = sync_coordination_group()
        group.user_set.add(
            *User.objects.filter(role=User.Role.COORDINATION)
        )

        self.stdout.write(
            self.style.SUCCESS(
                "Données de référence prêtes. "
                "Aucun membre, partenaire ni contenu fictif créé."
            )
        )

    def _seed_content(self):
        dakar = ZoneInfo("Africa/Dakar")

        # Dates fournies par le cahier des charges ;
        # description/lieu/programme laissés vides (à saisir dans l'admin).
        event, ev = Event.objects.get_or_create(
            slug="grand-week-end-du-pole-2026",
            defaults={
                "title": "Grand Week-End du Pôle 2026",
                "category": EventCategory.objects.get(
                    slug=slugify("Grand Week-End du Pôle")
                ),
                "start_date": datetime(
                    2026,
                    12,
                    11,
                    0,
                    0,
                    tzinfo=dakar,
                ),
                "end_date": datetime(
                    2026,
                    12,
                    13,
                    23,
                    59,
                    tzinfo=dakar,
                ),
                "is_featured": True,
                "is_published": True,
            },
        )

        # Titre fourni ; le corps n'est pas dans notre source :
        # brouillon masqué à compléter.
        _, art = Article.objects.get_or_create(
            slug="urban-hub-connect-lancement-11-13-decembre-2026",
            defaults={
                "title": (
                    "Urban Hub Connect, le réseau des acteurs de Diamniadio "
                    "et du Lac Rose, sera lancé du 11 au 13 décembre 2026"
                ),
                "category": ArticleCategory.objects.get(
                    slug=slugify("Le réseau")
                ),
                "content": (
                    "[à compléter : texte de l'article fourni "
                    "dans le cahier des charges]"
                ),
                "is_published": False,
            },
        )

        self.stdout.write(
            f"{'contenus événement':<28} +{seed_event_content(event)}"
        )

        self.stdout.write(
            f"{'événement / article':<28} "
            f"+{int(ev)} / +{int(art)} "
            f"(article en brouillon masqué)"
        )
