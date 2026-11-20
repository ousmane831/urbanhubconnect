"""Contenus éditoriaux du Grand Week-End 2026, de la page Événements et des Awards : cahier des charges, mis à jour par
la note de la Coordination du 5 novembre 2026 (la migration events 0004 applique cette mise à jour aux bases existantes).
Créés une seule fois (get_or_create) : les modifications faites ensuite dans l'admin ne sont jamais écrasées."""
from datetime import date, datetime
from zoneinfo import ZoneInfo

from django.utils.text import slugify

from apps.core.models import PageContent
from apps.events.models import AwardCategory, EventSection

# Cahier des charges du 20 novembre 2026 : un seul lieu (The Ground, à Diamniadio ; Diamniadio et le Lac Rose sont les deux
# territoires représentés), programme sans horaires détaillés, plus de reboisement, de convoi ni de navette.
EVENT_TITLE = "Le Grand Week-End du Pôle 2026"
EVENT_LOCATION = "The Ground, Diamniadio"
EVENT_TAGLINE = "Deux journées pour lancer officiellement le réseau Urban Hub Connect."
EVENT_START = datetime(2026, 12, 11, 9, 30, tzinfo=ZoneInfo("Africa/Dakar"))  # cible du compte à rebours
EVENT_END = datetime(2026, 12, 12, 23, 59, 59, tzinfo=ZoneInfo("Africa/Dakar"))  # fin d'affichage du bandeau d'accueil
RETIRED_SECTIONS = ["programme-dimanche", "portes-ouvertes", "caravane-verte"]
UNPUBLISHED_SECTIONS = ["reboisement"]  # masquée (conservée dans l'admin) depuis le cahier des charges du 20 novembre
KEEP_BODY = {"awards"}  # « Les huit catégories et la grille de notation restent inchangées »
GALA_TEXT = "Gala du Pôle avec Youssou Ndour. Golden Chic, en partenariat avec The Ground."

SECTIONS = [
    ("presentation", "Présentation", """Première édition · 11 et 12 décembre 2026 · The Ground, Diamniadio

Thème de l'édition 2026 : « Deux pôles, un seul élan : faire de nos pôles urbains des territoires de vie et d'opportunités »

Le Grand Week-End du Pôle est le rendez-vous annuel du réseau Urban Hub Connect, organisé avec l'appui de la DGPU. Son édition 2026 marque le lancement officiel du réseau et réunit à The Ground, à Diamniadio, les acteurs des deux territoires du réseau : Diamniadio et le Lac Rose. Le vendredi : ouverture officielle, Forum du Pôle (panels 1 et 2), Village du Pôle et Business Connect. Le samedi : Forum du Pôle (panels 3 et 4), Village du Pôle, Marché du terroir, Talents du Pôle et clôture, puis le Gala du Pôle en soirée.

Nos objectifs : 400 participants · 120 organisations · 150 rendez-vous d'affaires"""),
    ("programme-vendredi", "Vendredi 11 décembre · The Ground, Diamniadio", """Ouverture | Cérémonie d'ouverture et lancement officiel d'Urban Hub Connect
Forum | Forum du Pôle · Panel 1 : « Diamniadio et le Lac Rose, de la ville planifiée à la ville habitée : bilan d'étape et priorités à l'horizon 2050 »
Forum | Forum du Pôle · Panel 2 : « Faire grandir les entreprises du territoire : commandes locales, financement et compétences »
Village | Village du Pôle : stands des entreprises, institutions, écoles, startups et associations
Rendez-vous | Business Connect : rendez-vous d'affaires programmés à l'avance"""),
    ("programme-samedi", "Samedi 12 décembre · The Ground, Diamniadio", """Forum | Forum du Pôle · Panel 3 : « Vivre entre Diamniadio et le Lac Rose : logement, transport, santé et école au quotidien »
Forum | Forum du Pôle · Panel 4 : « Pôles verts, pôles intelligents : environnement, numérique et intelligence artificielle au service des deux pôles »
Village | Village du Pôle
Terroir | Marché du terroir, espaces par commune
Talents | Talents du Pôle
Clôture | Clôture du Grand Week-End du Pôle
Soirée | """ + GALA_TEXT),
    ("awards", "Awards du Pôle", "Les Awards du Pôle distinguent les organisations, projets et personnalités qui contribuent positivement aux deux pôles. Huit catégories :"),
    ("awards-calendrier", "Calendrier et notation", """Candidatures du 2 au 20 novembre 2026 · jury du 23 au 28 novembre · annonce des nominés le 1er décembre · vote du public du 1er au 10 décembre · remise des Awards le samedi 12 décembre

Seule la catégorie « Jeune talent du Pôle » est prolongée, jusqu'au mercredi 25 novembre 2026.

Chaque candidature est notée sur 100 points :

30 points | Impact concret
25 points | Caractère exemplaire ou innovant
20 points | Engagement pour l'emploi, les jeunes, les femmes ou l'environnement
15 points | Durabilité
10 points | Qualité du dossier"""),
    ("business-connect", "Business Connect", "Des rendez-vous d'affaires programmés à l'avance, le vendredi 11 et le samedi 12 décembre, à The Ground. Indiquez ce que vous proposez et ce que vous recherchez : la Coordination associe les demandes et vous envoie uniquement les rendez-vous confirmés. Une demande reçue n'est pas encore un rendez-vous."),
    ("defis-partenaires", "Défis Partenaires", "Des partenaires soumettent un besoin concret de leur organisation. Startups, PME et étudiants des deux pôles proposent une solution du 2 au 20 novembre. Les finalistes présentent leur solution devant un jury le samedi 12 décembre, et les lauréats peuvent ensuite la tester avec le partenaire. Les porteurs restent propriétaires de leurs idées."),
    # Texte imposé par le cahier des charges du 20 novembre 2026. Ne jamais écrire « co-organisé ».
    ("gala", "Le Gala du Pôle", GALA_TEXT + " Le samedi 12 décembre en soirée, à The Ground, à Diamniadio. Places individuelles à 100 000 ou 150 000 FCFA, par la billetterie commune avec The Ground ou sur invitation ; table nominative de 10 à 1 750 000 FCFA, avec 10 accréditations pour les deux journées. Le badge du Grand Week-End ne donne pas accès au Gala."),
    ("experiences", "Les expériences du week-end", """Le Village du Pôle | Le cœur de l'événement : stands des entreprises, institutions, écoles, startups et associations, espace PME et scène d'animation.
L'Espace Talents du Pôle | Offres de stages et d'emplois, entretiens sur place, ateliers CV et conseils de professionnels pour les jeunes des deux pôles.
Le OFF du Grand Week-End | Les membres organisent leurs propres activités sous le label de l'événement : ateliers, démonstrations, dégustations.
Le Mur des opportunités | Appels d'offres, besoins de prestataires, projets en quête de partenaires : chaque organisation affiche ce qu'elle cherche et ce qu'elle propose.
Culture et familles | Percussions, danses, artisanat et activités pour les enfants, pour ouvrir le week-end aux habitants.
Le Studio du Pôle | Un espace média pour les interviews, portraits de participants et contenus diffusés en direct sur les réseaux sociaux."""),
    ("benevoles", "Bénévoles", "Nous recherchons des bénévoles pour quatre missions : accueil et accréditations ; orientation et Village du Pôle ; Forum et Business Connect ; Awards, Gala et protocole. Après sélection, la Coordination communique à chaque bénévole sa mission, l'adresse du rendez-vous et son badge."),
    ("infos-pratiques", "Infos pratiques et participation", """Lieu : The Ground, Diamniadio, les vendredi 11 et samedi 12 décembre 2026. La gare du TER de Diamniadio est à proximité.

L'inscription se fait en ligne, sans compte, et donne droit à un badge nominatif valable pour les deux journées. Les rendez-vous d'affaires se demandent à l'avance. Le Gala du Pôle est accessible sur invitation et par la billetterie commune avec The Ground : le badge du Grand Week-End n'y donne pas accès.

Contact : +221 78 309 56 56 (appel et WhatsApp)."""),
]

# Quatre missions de bénévolat ; les anciennes sont renommées ou désactivées (« Portes Ouvertes », « Convoi et reboisement »).
MISSIONS = ["Accueil et accréditations", "Orientation et Village du Pôle", "Forum et Business Connect", "Awards, Gala et protocole"]
MISSION_RENAMES = {"Orientation": "Orientation et Village du Pôle", "Gala et protocole": "Awards, Gala et protocole"}

# Formules 2026 : (nom, montant HT, mention, contreparties). Accréditations selon le cahier des charges du 20 novembre.
PARTNERSHIP = [
    ("Partenaire Fondateur", 5_000_000, "2 places", "Mention « avec le soutien de », logo en tête de tous les supports, prise de parole à la cérémonie d'ouverture, remise d'un Award, table de 10 au Gala du Pôle, stand premium, un Défi Partenaire, 10 accréditations, Partenaire Stratégique du réseau pendant 12 mois"),
    ("Partenaire Officiel", 2_500_000, "", "Logo sur tous les supports, intervention au Forum, 6 places au Gala du Pôle, stand, un Défi Partenaire, 6 accréditations, membre fondateur pendant 12 mois"),
    ("Partenaire Associé", 1_500_000, "", "Logo sur les principaux supports, 4 places au Gala du Pôle, stand, 4 accréditations, membre fondateur pendant 12 mois"),
    ("Partenaire Engagé", 750_000, "", "Mur des partenaires et supports numériques, 2 places au Gala du Pôle, espace partagé, 2 accréditations, membre pendant 12 mois"),
    ("Pack PME du Pôle", 250_000, "", "Réservé aux PME, TPE et entrepreneurs des deux pôles : espace PME, Business Connect, Achetons Local, 1 place au Gala du Pôle, 1 accréditation, référencement dans l'Annuaire"),
]

# Clôture des candidatures : seule « Jeune talent du Pôle » est prolongée (cahier des charges du 20 novembre 2026).
AWARDS_CLOSE_ON = date(2026, 11, 20)
AWARDS_EXTENDED = {"jeune-talent-du-pole": date(2026, 11, 25)}

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

Une fois par an, Urban Hub Connect rassemble sa communauté élargie autour du Forum du Pôle, du Village du Pôle, des rendez-vous d'affaires et de la cérémonie des Awards du Pôle, suivie du Gala du Pôle. La première édition se tient les 11 et 12 décembre 2026 à The Ground, à Diamniadio."""),
    # Page « Le réseau » : rubrique « Notre trajectoire », à remplir dans l'admin (masquée tant qu'elle est vide).
    ("reseau-trajectoire", "Notre trajectoire", ""),
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
        slug = slugify(name)
        _, new = AwardCategory.objects.get_or_create(slug=slug, defaults={
            "name": name, "description": description, "display_order": order,
            "closes_on": AWARDS_EXTENDED.get(slug, AWARDS_CLOSE_ON)})
        created += new
    for slug, title, content in PAGES:
        _, new = PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})
        created += new
    return created
