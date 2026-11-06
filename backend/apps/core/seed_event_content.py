"""Contenus éditoriaux du Grand Week-End 2026, de la page Événements et des Awards : cahier des charges, mis à jour par
la note de la Coordination du 5 novembre 2026 (la migration events 0004 applique cette mise à jour aux bases existantes).
Créés une seule fois (get_or_create) : les modifications faites ensuite dans l'admin ne sont jamais écrasées."""
from datetime import datetime
from zoneinfo import ZoneInfo

from django.utils.text import slugify

from apps.core.models import PageContent
from apps.events.models import AwardCategory, EventSection

# Note de la Coordination du 5 novembre 2026 : programme sur deux journées, textes à reprendre tels quels.
EVENT_TITLE = "Le Grand Week-End du Pôle 2026"
EVENT_LOCATION = "Diamniadio · Lac Rose"
EVENT_TAGLINE = "Deux journées pour lancer officiellement le réseau Urban Hub Connect."
EVENT_START = datetime(2026, 12, 11, 9, 30, tzinfo=ZoneInfo("Africa/Dakar"))  # cible du compte à rebours
EVENT_END = datetime(2026, 12, 12, 23, 59, 59, tzinfo=ZoneInfo("Africa/Dakar"))  # fin d'affichage du bandeau d'accueil
RETIRED_SECTIONS = ["programme-dimanche", "portes-ouvertes", "caravane-verte"]
KEEP_BODY = {"awards"}  # « Les huit catégories et la grille de notation restent inchangées »

SECTIONS = [
    ("presentation", "Présentation", """Première édition · 11 et 12 décembre 2026 · Diamniadio · Lac Rose

Thème de l'édition 2026 : « Deux pôles, un seul élan : faire de nos pôles urbains des territoires de vie et d'opportunités »

Le Grand Week-End du Pôle est le rendez-vous annuel du réseau Urban Hub Connect. Son édition 2026 marque le lancement officiel du réseau et réunit, pour la première fois, les acteurs de Diamniadio et du Lac Rose autour d'un même programme : un temps professionnel, un temps de fête et un temps d'action collective. Le vendredi relie les deux pôles en une seule journée, de l'ouverture officielle à Diamniadio au grand reboisement du Lac Rose. Le samedi se tient à Diamniadio, du Forum du Pôle à la cérémonie des Awards, puis au Gala du Pôle.

Nos objectifs : 400 participants · 120 organisations · 150 rendez-vous d'affaires · 1 000 arbres plantés"""),
    ("programme-vendredi", "Vendredi 11 décembre · Diamniadio, puis Lac Rose", """8 h 45 – 9 h 30 | Café des décideurs
9 h 00 – 12 h 30 | Village du Pôle, Espace Talents et Espace innovation
9 h 30 – 10 h 15 | Cérémonie d'ouverture et lancement officiel d'Urban Hub Connect, signature de la Charte par les membres fondateurs
10 h 15 – 11 h 30 | Forum du Pôle · Panel 1 : « Diamniadio et le Lac Rose, de la ville planifiée à la ville habitée : bilan d'étape et priorités à l'horizon 2050 »
11 h 30 – 12 h 30 | Business Connect, première session, et rencontre Achetons Local
12 h 30 – 14 h 30 | Pause : déjeuner et prière du vendredi
14 h 30 | Départ en convoi pour le Lac Rose
15 h 30 – 17 h 00 | Grand reboisement : la Forêt Urban Hub Connect, 1 000 arbres plantés
17 h 00 – 17 h 30 | Causerie sur les rives et Appel du Lac Rose
17 h 30 | Retour vers Diamniadio"""),
    ("programme-samedi", "Samedi 12 décembre · Diamniadio, The Ground, Sports City", """9 h 30 – 10 h 45 | Forum du Pôle · Panel 2 : « Faire grandir les entreprises du territoire : commandes locales, financement et compétences »
10 h 00 – 13 h 00 | Business Connect, seconde session, en parallèle des panels
10 h 45 – 12 h 00 | Forum du Pôle · Panel 3 : « Vivre entre Diamniadio et le Lac Rose : logement, transport, santé et école au quotidien »
12 h 00 – 13 h 15 | Forum du Pôle · Panel 4 : « Pôles verts, pôles intelligents : environnement, numérique et intelligence artificielle au service des deux pôles »
13 h 15 – 14 h 30 | Déjeuner et Marché du terroir, espaces par commune
13 h 45 – 14 h 30 | Finale des Défis Partenaires, à l'Espace innovation
14 h 30 – 16 h 00 | Cérémonie des Awards du Pôle, puis clôture : lecture de la synthèse du Forum et remise aux autorités avec l'Appel du Lac Rose
À partir de 19 h 00 | Le Gala du Pôle, en partenariat avec The Ground"""),
    ("reboisement", "Le grand reboisement et l'Appel du Lac Rose", "Le vendredi 11 décembre après-midi, un convoi de navettes relie The Ground au Lac Rose. Les partenaires et leurs équipes de planteurs y rejoignent les services techniques et les communautés locales pour planter 1 000 arbres d'essences adaptées à la zone des Niayes et nettoyer les abords. Chaque partenaire plante son bosquet ; un comité local assure l'arrosage et le suivi. La journée se termine par une causerie sur les rives, « Le Lac Rose, patrimoine vivant », et par la signature de l'Appel du Lac Rose, remis aux autorités le samedi à la clôture. Retour vers Diamniadio à 17 h 30."),
    ("awards", "Awards du Pôle", "Les Awards du Pôle distinguent les organisations, projets et personnalités qui contribuent positivement aux deux pôles. Huit catégories :"),
    ("awards-calendrier", "Calendrier et notation", """Candidatures du 2 au 20 novembre 2026 · jury du 23 au 28 novembre · annonce des nominés le 1er décembre · vote du public du 1er au 10 décembre · remise des Awards le samedi 12 décembre à 14 h 30.

Chaque candidature est notée sur 100 points :

30 points | Impact concret
25 points | Caractère exemplaire ou innovant
20 points | Engagement pour l'emploi, les jeunes, les femmes ou l'environnement
15 points | Durabilité
10 points | Qualité du dossier"""),
    ("business-connect", "Business Connect", "Deux sessions de rendez-vous d'affaires programmés à l'avance : le vendredi 11 décembre de 11 h 30 à 12 h 30, avec la rencontre Achetons Local, et le samedi 12 décembre de 10 h à 13 h, en parallèle du Forum. Chaque participant reçoit un agenda de rendez-vous ciblés, préparé selon ce qu'il propose et ce qu'il recherche. Inscriptions jusqu'au 20 novembre ; agendas envoyés le 5 décembre."),
    ("defis-partenaires", "Défis Partenaires", "Des partenaires soumettent un besoin concret de leur organisation. Startups, PME et étudiants des deux pôles proposent une solution du 2 au 20 novembre. Les finalistes présentent leur solution devant un jury le samedi 12 décembre à 13 h 45, à l'Espace innovation, et les lauréats peuvent ensuite la tester avec le partenaire. Les porteurs restent propriétaires de leurs idées."),
    # Version sans le nom de l'artiste : ne le publier qu'après le feu vert écrit de la Coordination.
    # Ne jamais écrire « co-organisé » ; « Golden Chic » ne désigne que le concert de The Ground.
    ("gala", "Le Gala du Pôle", "Le samedi 12 décembre à partir de 19 h, le Gala du Pôle, organisé en partenariat avec The Ground, réunit les invités du Grand Week-End du Pôle et le public de The Ground, dans la Sports City de Diamniadio. Au programme : accueil et tapis rouge, mot de bienvenue, dîner de gala, Prix d'honneur et hommage aux membres fondateurs, puis un grand concert. Tenue de soirée ; une touche dorée est la bienvenue. Accès sur invitation et par la billetterie commune avec The Ground."),
    ("experiences", "Les expériences du week-end", """Le Village du Pôle | Le cœur de l'événement : stands des entreprises, institutions, écoles, startups et associations, espace PME et scène d'animation.
L'Espace Talents du Pôle | Offres de stages et d'emplois, entretiens sur place, ateliers CV et conseils de professionnels pour les jeunes des deux pôles.
Le OFF du Grand Week-End | Les membres organisent leurs propres activités sous le label de l'événement : portes ouvertes, ateliers, démonstrations, dégustations.
Le Mur des opportunités | Appels d'offres, besoins de prestataires, projets en quête de partenaires : chaque organisation affiche ce qu'elle cherche et ce qu'elle propose.
Culture et familles | Percussions, danses, artisanat et activités pour les enfants, pour ouvrir le week-end aux habitants.
Le Studio du Pôle | Un espace média pour les interviews, portraits de participants et contenus diffusés en direct sur les réseaux sociaux."""),
    ("benevoles", "Bénévoles", "Nous recherchons des bénévoles pour cinq missions : accueil et accréditations ; orientation et Village du Pôle ; Forum et Business Connect ; convoi et reboisement du Lac Rose ; Awards, Gala et protocole. Formation obligatoire le samedi 5 décembre ; tenue officielle, repas et transport assurés pendant les jours de mission."),
    ("infos-pratiques", "Infos pratiques et participation", """Vendredi matin et samedi : The Ground, Sports City Diamniadio. Vendredi après-midi : Lac Rose, site précis communiqué aux participants inscrits. Accueil et remise des badges à partir de 9 h le vendredi.

Des navettes relient Dakar à Diamniadio pendant les deux jours, et Diamniadio au Lac Rose le vendredi après-midi, aller et retour ; la gare du TER de Diamniadio est à proximité.

L'inscription se fait en ligne et donne droit à un badge nominatif valable pour les deux journées. Les rendez-vous d'affaires se réservent à l'avance. Le Gala du Pôle est accessible sur invitation et par la billetterie commune avec The Ground.

Contact : +221 78 309 56 56 (appel et WhatsApp)."""),
]

# Cinq missions de bénévolat ; les anciennes sont renommées, « Portes Ouvertes » est désactivée.
MISSIONS = ["Accueil et accréditations", "Orientation et Village du Pôle", "Forum et Business Connect",
            "Convoi et reboisement du Lac Rose", "Awards, Gala et protocole"]
MISSION_RENAMES = {"Orientation": "Orientation et Village du Pôle", "Gala et protocole": "Awards, Gala et protocole",
                   "Caravane verte et reboisement": "Convoi et reboisement du Lac Rose"}

# Formules 2026 : (nom, montant HT, mention, contreparties).
PARTNERSHIP = [
    ("Partenaire Fondateur", 5_000_000, "2 places", "Mention « avec le soutien de », logo en tête de tous les supports, prise de parole à la cérémonie d'ouverture, remise d'un Award, table de 10 au Gala du Pôle, stand premium, un Défi Partenaire, bosquet de 200 arbres, 10 accréditations, Partenaire Stratégique du réseau pendant 12 mois"),
    ("Partenaire Officiel", 2_500_000, "", "Logo sur tous les supports, intervention au Forum, 6 places au Gala du Pôle, stand, un Défi Partenaire, bosquet de 100 arbres, 6 accréditations, membre fondateur pendant 12 mois"),
    ("Partenaire Associé", 1_500_000, "", "Logo sur les principaux supports, 4 places au Gala du Pôle, stand, 50 arbres, 4 accréditations, membre fondateur pendant 12 mois"),
    ("Partenaire Engagé", 750_000, "", "Mur des partenaires et supports numériques, 2 places au Gala du Pôle, espace partagé, 25 arbres, 2 accréditations, membre pendant 12 mois"),
    ("Pack PME du Pôle", 250_000, "", "Réservé aux PME, TPE et entrepreneurs des deux pôles : espace PME, Business Connect, Achetons Local, 1 place au Gala du Pôle, 1 accréditation, référencement dans l'Annuaire"),
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

Une fois par an, Urban Hub Connect rassemble sa communauté élargie autour du Forum du Pôle, du Village du Pôle, des rendez-vous d'affaires, d'une action collective pour le territoire et de la cérémonie des Awards du Pôle, suivie du Gala du Pôle. La première édition se tient les 11 et 12 décembre 2026, entre Diamniadio et le Lac Rose."""),
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
        _, new = AwardCategory.objects.get_or_create(slug=slugify(name), defaults={"name": name, "description": description, "display_order": order})
        created += new
    for slug, title, content in PAGES:
        _, new = PageContent.objects.get_or_create(slug=slug, defaults={"title": title, "content": content, "is_published": True})
        created += new
    return created
