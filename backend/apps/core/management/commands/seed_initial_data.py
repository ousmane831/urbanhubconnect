from apps.core.seed_membership import seed_membership_content
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify
from apps.core.seed_actions import seed_actions
from apps.core.roles import sync_coordination_group
from apps.core.seed_article import seed_first_article
from apps.core.seed_event_content import (EVENT_END, EVENT_LOCATION, EVENT_START, EVENT_TAGLINE, EVENT_TITLE, MISSIONS,
                                          PARTNERSHIP, seed_event_content)
from apps.events.models import Event, EventCategory, VolunteerMission
from apps.map.models import MapCategory
from apps.memberships.models import MembershipCategory
from apps.news.models import Article, ArticleCategory
from apps.organizations.models import College, Commission, Sector
from apps.partnerships.models import PartnershipTier
from apps.users.models import User

COMMISSIONS = ["Entreprise et Investissement", "Mobilité et Accessibilité", "Emploi, Talents et Formation",
               "Services et Cadre de vie", "Environnement et Durabilité", "Innovation et Numérique",
               "Tourisme, Culture et Attractivité", "Inclusion et Communautés"]
# Libellés dérivés des clés du cahier des charges : à valider avec le document source.
COLLEGES = ["Institutions publiques", "Entreprises et investissement", "Savoir et innovation", "Communautés et talents"]
SECTORS = ["Administration et services publics", "Industrie et production", "Construction et immobilier",
           "Commerce et distribution", "Services aux entreprises", "Hôtellerie, restauration et tourisme",
           "Transport et logistique", "Banque, assurance et finance", "Numérique et télécoms", "Santé",
           "Éducation et formation", "Agriculture et agro-industrie", "Environnement et énergie",
           "Culture, sport et loisirs", "Associations et ONG"]
MAP_CATEGORIES = [("Institutions et administrations", "landmark"), ("Entreprises et zones d'activité", "building-2"),
                  ("Enseignement et formation", "graduation-cap"), ("Santé", "heart-pulse"),
                  ("Grands équipements", "trophy"), ("Services de proximité", "store"), ("Mobilité", "bus"),
                  ("Tourisme et patrimoine", "tree-palm"), ("Initiatives et communautés", "users")]
EVENT_CATEGORIES = ["After Work Connect", "Commission", "Visite", "Grand Week-End du Pôle"]
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
ARTICLE_CATEGORIES = ["Le réseau", "Événements", "Les visages du Pôle", "Opportunités"]
MEMBERSHIP = [("Grande entreprise, institution, banque, promoteur", 500_000),
              ("PME, établissement d'enseignement supérieur", 150_000),
              ("TPE, startup, cabinet, structure d'accompagnement", 50_000),
              ("Association, groupement de femmes, organisation de jeunes", 25_000),
              ("Membre individuel", 25_000), ("Étudiant(e), jeune de moins de 26 ans", 10_000)]


class Command(BaseCommand):
    help = "Crée les données institutionnelles de référence (idempotent, n'écrase jamais les modifications faites dans l'admin)."


    def _seed(self, model, rows):
        created = 0

        for order, (name, defaults) in enumerate(rows, start=1):
            slug = slugify(name)

            # Rechercher d'abord par slug
            obj = model.objects.filter(slug=slug).first()

            # Si le slug n'existe pas, rechercher par nom
            if obj is None:
                obj = model.objects.filter(name=name).first()

            # Créer uniquement si l'enregistrement n'existe pas
            if obj is None:
                model.objects.create(
                    name=name,
                    slug=slug,
                    display_order=order,
                    **defaults,
                )
                created += 1

        self.stdout.write(
            f"{model._meta.verbose_name_plural:<28} "
            f"+{created} (total {model.objects.count()})"
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        self._seed(Commission, [(n, {"number": i}) for i, n in enumerate(COMMISSIONS, 1)])
        self._seed(College, [(n, {}) for n in COLLEGES])
        self._seed(Sector, [(n, {}) for n in SECTORS])
        self._seed(MapCategory, [(n, {"icon": i, "description": MAP_DESCRIPTIONS[n]}) for n, i in MAP_CATEGORIES])
        for name, text in MAP_DESCRIPTIONS.items():  # complète les descriptions encore vides, sans écraser l'admin
            MapCategory.objects.filter(slug=slugify(name), description="").update(description=text)
        self._seed(EventCategory, [(n, {}) for n in EVENT_CATEGORIES])
        self._seed(VolunteerMission, [(n, {}) for n in MISSIONS])
        self._seed(ArticleCategory, [(n, {}) for n in ARTICLE_CATEGORIES])
        self._seed(MembershipCategory, [(n, {"amount_fcfa": a, "public_listing": not n.startswith(("Membre individuel", "Étudiant"))}) for n, a in MEMBERSHIP])
        self._seed(PartnershipTier, [(n, {"amount_fcfa": a, "description": d, "benefits": b}) for n, a, d, b in PARTNERSHIP])
        self._seed_content()
        group = sync_coordination_group()
        group.user_set.add(*User.objects.filter(role=User.Role.COORDINATION))
        self.stdout.write(self.style.SUCCESS("Données de référence prêtes. Aucun membre, partenaire ni contenu fictif créé."))

    def _seed_content(self):
        # Dates de la note du 5 novembre 2026 : compte à rebours sur le vendredi 9 h 30, fin le samedi à minuit.
        event, ev = Event.objects.get_or_create(
            slug="grand-week-end-du-pole-2026",
            defaults={"title": EVENT_TITLE, "location": EVENT_LOCATION, "description": EVENT_TAGLINE,
                      "category": EventCategory.objects.get(slug=slugify("Grand Week-End du Pôle")),
                      "start_date": EVENT_START, "end_date": EVENT_END,
                      "is_featured": True, "is_published": True})
        art_created, art_updated = seed_first_article()
        self.stdout.write(f"{'contenus événement':<28} +{seed_event_content(event)}")
        self.stdout.write(f"{'événement / article':<28} +{int(ev)} / +{art_created} (mis à jour : {art_updated})")
        self.stdout.write(f"{'nos actions':<28} +{seed_actions()}")
        texts, dossiers = seed_membership_content()
        self.stdout.write(f"{'adhésion / annuaire':<28} +{texts} (dossiers créés : {dossiers})")