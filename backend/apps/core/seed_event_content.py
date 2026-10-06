"""Contenus éditoriaux du Grand Week-End 2026, de la page Événements et des Awards, repris du cahier des charges.
Créés une seule fois (get_or_create) : les modifications faites ensuite dans l'admin ne sont jamais écrasées."""
from datetime import datetime
from zoneinfo import ZoneInfo

from django.utils.text import slugify

from apps.core.models import PageContent
from apps.events.models import AwardCategory, EventSection

SECTIONS = [
    ("presentation", "Présentation", """Première édition · 11, 12 et 13 décembre 2026 · Diamniadio ⇄ Lac Rose

Trois jours pour lancer officiellement Urban Hub Connect et réunir, entre Diamniadio et le Lac Rose, les institutions, les entreprises, les investisseurs, les écoles, les associations, les communautés et les jeunes talents des deux pôles. Nos objectifs : 400 participants, 120 organisations, 150 rendez-vous d'affaires, 8 Awards et 1 000 arbres plantés."""),
    ("programme-vendredi", "Vendredi 11 décembre – Ouvrir", """9 h 00 – 12 h 30 | Rencontre des décideurs
14 h 30 – 17 h 30 | Ouverture du Village du Pôle et de l'Espace Talents, conférence de presse
18 h 30 | Soirée officielle de lancement, signature de la Charte par les membres fondateurs et premier After Work Connect"""),
    ("programme-samedi", "Samedi 12 décembre – Connecter et célébrer", """9 h 00 | Forum du Pôle
9 h 30 – 13 h 00 | Vitrine des projets, Business Connect et rencontre Achetons Local
10 h 15 – 12 h 30 | Tables thématiques et Agora Jeunesse
14 h 00 – 17 h 00 | Pôle Portes Ouvertes
14 h 00 – 18 h 00 | Marché du terroir
15 h 00 – 17 h 30 | Finale des Défis Partenaires
19 h 30 | Gala des Awards du Pôle"""),
    ("programme-dimanche", "Dimanche 13 décembre – Agir", """7 h 00 | Départ de la Caravane verte vers le Lac Rose
8 h 30 – 10 h 30 | Randonnée et Challenge inter-entreprises
10 h 30 – 12 h 30 | Plantation de 1 000 arbres
12 h 30 – 15 h 30 | Déjeuner du terroir et Appel du Lac Rose"""),
    ("awards", "Awards du Pôle", "Les Awards du Pôle distinguent les organisations, projets et personnalités qui contribuent positivement aux deux pôles. Huit catégories :"),
    ("awards-calendrier", "Calendrier et notation", """2 – 20 novembre 2026 | Candidatures
23 – 28 novembre | Jury
1er décembre | Annonce des nominés
Jusqu'au 10 décembre | Vote du public
12 décembre | Remise des Awards

Chaque candidature est notée sur 100 points :

30 points | Impact concret
25 points | Caractère exemplaire ou innovant
20 points | Engagement pour l'emploi, les jeunes, les femmes ou l'environnement
15 points | Durabilité
10 points | Qualité du dossier"""),
    ("business-connect", "Business Connect", "Le samedi 12 décembre, de 9 h 30 à 13 h 00, chaque participant arrive avec un agenda de rendez-vous ciblés de vingt minutes, préparé à l'avance selon ce qu'il propose et ce qu'il recherche. La rencontre Achetons Local permet aux donneurs d'ordre de présenter leurs besoins d'achats aux PME des deux pôles. Inscriptions jusqu'au 20 novembre ; agendas envoyés le 5 décembre."),
    ("defis-partenaires", "Défis Partenaires", "Des partenaires soumettent un besoin concret de leur organisation. Startups, PME et étudiants des deux pôles proposent une solution du 2 au 20 novembre ; trois finalistes par défi présentent leur solution le 12 décembre, et le lauréat peut ensuite la tester avec le partenaire. Les porteurs restent propriétaires de leurs idées."),
    ("portes-ouvertes", "Pôle Portes Ouvertes", "Le samedi 12 décembre, de 14 h 00 à 17 h 00, entreprises, établissements et sites des deux pôles ouvrent leurs portes. Deux circuits en navette : circuit A « Cap sur le Lac Rose » et circuit B « Cap sur Diamniadio ». Places limitées, réservation obligatoire."),
    ("caravane-verte", "Caravane verte et Forêt Urban Hub Connect", "Le dimanche 13 décembre, la Caravane verte relie Diamniadio au Lac Rose. Au programme : une randonnée d'environ 6 à 7 km, le Challenge inter-entreprises et la plantation de 1 000 arbres adaptés à la zone des Niayes, avec les services techniques et les communautés locales. Chaque partenaire plante son bosquet ; un comité local assure l'arrosage et le suivi. Prévoir chaussures fermées, couvre-chef et eau ; une décharge de responsabilité est à signer à l'inscription."),
    ("benevoles", "Bénévoles", "Nous recherchons 70 bénévoles pour six missions : accueil et accréditations ; orientation et Village du Pôle ; Forum et Business Connect ; Portes Ouvertes ; Gala et protocole ; Caravane verte et reboisement. Formation obligatoire le samedi 5 décembre ; tenue officielle, repas et transport assurés pendant les jours de mission."),
    ("infos-pratiques", "Infos pratiques", """Lieux : Diamniadio et Lac Rose. Les lieux exacts et plans d'accès seront publiés après confirmation des sites d'accueil.

Navettes entre les sites le samedi et le dimanche. Accueil et accréditations à partir de 8 h 30 le vendredi.

Contact le jour J : +221 78 309 56 56 (appel et WhatsApp)."""),
]

AWARDS = [
    ("Entreprise engagée pour le territoire", "Entreprise installée sur l'un des deux pôles qui contribue au territoire par l'emploi local, les achats locaux, l'accueil de jeunes ou des actions d'intérêt général."),
    ("PME de l'année", "PME ou TPE des deux pôles qui se distingue par sa croissance, la qualité de ses services ou sa capacité d'adaptation."),
    ("Innovation urbaine", "Projet, produit, service ou solution numérique qui répond à un besoin concret de la vie urbaine sur les pôles."),
    ("Jeune talent du Pôle", "Personne de moins de 35 ans dont le parcours inspire."),
    ("Femme leader du Pôle", "Femme dont l'action, dans une entreprise, une institution ou une communauté, fait avancer les deux pôles."),
    ("Initiative communautaire", "Association, groupement ou collectif dont l'action améliore la vie des habitants."),
    ("Engagement environnemental", "Organisation ou personne dont l'action protège l'environnement ou améliore le cadre de vie."),
    ("Prix du public", "Attribué par vote en ligne parmi l'ensemble des nominés."),
]

PAGES = [
    ("after-work-connect", "After Work Connect", """Le rendez-vous bimestriel du réseau

Tous les deux mois, After Work Connect rassemble les membres et leurs invités autour d'un enjeu, d'une problématique ou d'une opportunité clairement identifiés. Chaque édition est accueillie par un membre différent, sur l'un des deux pôles, pour faire découvrir les lieux et les acteurs du territoire.

18 h 30 | Accueil et présentation des nouveaux membres
19 h 00 | Connect Minute : rencontres rapides en tête-à-tête
19 h 30 | Urban Speech ou table ronde sur le thème du jour
20 h 15 | Tables thématiques et Business Connect
21 h 00 | Cocktail réseau et Minute Opportunités : chacun annonce un besoin ou une offre

Chaque rencontre doit ouvrir la voie à de nouvelles relations, opportunités ou coopérations."""),
    ("grand-week-end-presentation", "Le Grand Week-End du Pôle", """Le grand rendez-vous annuel de la communauté

Une fois par an, Urban Hub Connect rassemble sa communauté élargie pour célébrer le chemin parcouru, mettre en lumière les réussites et ouvrir le cycle suivant : Forum du Pôle, Village des membres, Business Connect, visites et découvertes des deux pôles, moments culturels et familiaux au Lac Rose, et soirée des Awards du Pôle."""),
]


def seed_event_content(event):
    """Retourne le nombre d'objets créés (0 au second passage)."""
    created = 0
    if event.registration_opens_at is None:
        event.registration_opens_at = datetime(2026, 11, 2, 0, 0, tzinfo=ZoneInfo("Africa/Dakar"))
        event.save(update_fields=["registration_opens_at", "updated_at"])
    for order, (slug, title, body) in enumerate(SECTIONS, start=1):
        _, new = EventSection.objects.get_or_create(event=event, slug=slug, defaults={"title": title, "body": body, "order": order})
        created += new
    for order, (name, description) in enumerate(AWARDS, start=1):
        _, new = AwardCategory.objects.get_or_create(slug=slugify(name), defaults={"name": name, "description": description, "display_order": order})
        created += new
    for slug, title, content in PAGES:
        _, new = PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})
        created += new
    return created
