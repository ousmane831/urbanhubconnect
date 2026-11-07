# Guide de la Coordination — administration du site

Adresse : `https://www.urbanhubconnect.com/admin/`

## Démarrage

1. Connectez-vous avec votre compte. Les comptes **Coordination** peuvent consulter, ajouter et modifier le
   contenu ; seuls les **Administrateurs** peuvent supprimer et gérer les comptes.
2. Le tableau de bord liste toutes les rubriques (organisations, lieux de la carte, événements, articles,
   demandes reçues, documents, paramètres du site).
3. **Création d'un compte** (Administrateur) : Utilisateurs → Ajouter, choisir le rôle « Coordination » ou
   « Administrateur ».

## Organisations (Annuaire)

Chaque fiche a **deux statuts distincts** :

- **Validation** : En attente → En cours d'examen → Acceptée ou Refusée.
- **Publication** : Publiée ou Masquée.

Une fiche acceptée n'est **pas** publiée automatiquement. Une fiche non acceptée ne peut jamais être publiée.
Une fiche liée à un dossier d'adhésion est publiée automatiquement au paiement de la cotisation (voir « Adhésions »).

Pour valider une demande de référencement reçue par le formulaire :
1. Organisations → filtrer « Validation : En attente », ouvrir la fiche.
2. Vérifier les informations, compléter le collège, le secteur et les commissions si besoin.
3. Dans la liste, cocher la fiche → action **Accepter (sans publier)**, puis, quand tout est prêt,
   **Publier (fiches acceptées uniquement)**.
4. Pour retirer une fiche : action **Dépublier (masquer)**.

La section « 🔒 Informations privées » (représentant, téléphone, e-mail, offres, besoins) n'apparaît jamais
sur le site public. Ajoutez une organisation à la main avec « Ajouter », comme pour une demande reçue.

## Cartographie

- **Catégories de carte** : modifiables (nom, icône, ordre, actif). Désactiver une catégorie masque ses lieux.
- **Lieux de la carte** → Ajouter : nom, catégorie, adresse, latitude/longitude (le lien « OpenStreetMap »
  permet de vérifier). Si le lieu est une organisation membre, choisissez-la : l'adresse, les coordonnées et le
  pôle sont repris automatiquement et un lien vers la fiche s'affiche (si la fiche est publiée).
- **Suggestions de lieu** (reçues du site) : action « Créer un lieu (brouillon masqué) », puis vérifier et publier.

## Événements

Événements → Ajouter : titre, type, dates, lieu, public, image, lien d'inscription, « à la une » (apparaît
sur l'accueil avec le compte à rebours). Cocher **Publié** pour l'afficher. Le Grand Week-End du Pôle 2026 existe
déjà : complétez sa description et son lieu. Le programme détaillé se saisit dans la description.

## Actualités

Articles → Ajouter : titre, catégorie, chapô, contenu, image, auteur. **Publié** + date de publication
(une date future programme la parution). Le premier article est créé en **brouillon** : collez-y le texte
officiel, puis publiez.

## Partenaires et formules

- **Formules de partenariat** et **catégories d'adhésion** : montants modifiables directement dans la liste.
- **Partenaires** → Ajouter : nom, logo, formule. Cocher **Confirmé** pour l'afficher. Tant qu'aucun partenaire
  n'est confirmé, le bloc « Nos partenaires » reste masqué.

## Adhésions : du visiteur au membre

Tout se pilote depuis l'**Espace Coordination** (`/coordination`) ; l'admin propose les mêmes actions.

1. **Demande** : le formulaire « Adhérer » ou « Référencer mon organisation » ouvre un dossier (référence `UHC-AAAA-NNNN`)
   et envoie un e-mail de confirmation. Une fiche non publiée du même demandeur (même e-mail, ou même nom : à vérifier)
   y est rattachée ; la note du dossier l'indique. Une fiche **déjà publiée n'est jamais rattachée automatiquement**.
   Une demande renvoyée (même e-mail, même nom) complète le dossier existant au lieu d'en ouvrir un second.
2. **Examen** : choisir (ou changer) la catégorie, « en cours d'examen », puis **Accepter** ou **Refuser**.
   Accepter valide la fiche mais ne la publie pas.
3. **Bulletin** : « Envoyer le bulletin et la Charte ». La Charte doit être déposée dans Documents (catégorie « Charte »,
   téléchargeable publiquement), sinon l'Espace Coordination vous prévient. À réception : « Charte signée reçue ».
4. **Paiement** : « Enregistrer le paiement ». Un montant inférieur à la cotisation est un paiement partiel.
   Dès que la cotisation est atteinte : membre à jour 12 mois, fiche publiée, compte membre créé, lien d'accès envoyé.
   **Erreur de saisie** : « Annuler le dernier paiement » (le paiement reste visible, barré, et la cotisation est recalculée).
   Une même référence de paiement ne peut pas être saisie deux fois.
5. **Échéances** : rappels automatiques par e-mail à J-30 et J-7 ; à la date, l'accès est coupé et la fiche retirée.
   Renouveler = enregistrer un nouveau paiement. **Suspendre / Réactiver** : file « Adhésions suspendues ».

Le statut d'un dossier ne se modifie jamais à la main dans l'admin : utilisez les actions, qui mettent aussi la fiche à jour.
Une fiche liée à un dossier ne peut pas être publiée tant que la cotisation n'est pas à jour, ni si l'organisation l'a
elle-même retirée de l'Annuaire.

## Demandes reçues

Adhésions, partenariats, accréditations presse, candidatures Awards, inscriptions Business Connect, bénévoles,
suggestions de lieu : chaque liste a un badge de statut et des actions groupées (examen, accepter, refuser).
**Messages de contact** : à traiter / traité (une copie est aussi envoyée à l'adresse de contact).
**Newsletter** : abonnés, export CSV (action « Exporter la sélection »).

## Documents et presse

- **Documents** → Ajouter : PDF uniquement, catégorie, cocher **Téléchargeable publiquement**.
  Le dossier de presse (catégorie « Dossier de presse ») apparaît sur la page Presse.
- **Communiqués** : titre, résumé, PDF, publier.

## Paramètres du site

Paramètres du site : téléphone, WhatsApp (format international sans +), e-mail, adresse, réseaux sociaux,
mention de pied de page, **mentions légales** et **politique de confidentialité** (textes à compléter).

## Sauvegardes

- Serveur sans Docker (VPS actuel) : script `deploy/backup.sh`, à planifier chaque jour (voir `deploy/README.md`).
  Il sauvegarde la base, les fichiers publics (`media`) et les documents réservés aux membres (`private_media`).
- Avec Docker : `docker compose exec postgres pg_dump -U urbanhub urbanhub > sauvegarde.sql`, et les volumes `media` et `private_media`.
- Conserver les copies **hors du serveur**.

## Déploiement et mises à jour

Voir `deploy/README.md` : mise à jour du code, tâche quotidienne (échéances et rappels), sauvegardes, réglages e-mail.
Avec Docker : `docker compose up -d --build` (les migrations s'appliquent au démarrage).
