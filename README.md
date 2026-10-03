# Urban Hub Connect — site officiel

Réseau des acteurs des pôles urbains de Diamniadio et du Lac Rose.
Backend Django + DRF + PostgreSQL, frontend React + TypeScript + Vite + Tailwind, déploiement Docker + Nginx + Gunicorn.

## Architecture

```
backend/   Django (config/ + apps/ : core, users, organizations, directory, map, events, memberships,
           partnerships, news, press, newsletter, contact, documents)
frontend/  React (src/ : components, layouts, pages, features, hooks, services, types, utils)
nginx/     configuration du reverse proxy
.github/   validation automatique (migrations, tests, build)
```

Principes : tout le contenu public vient de l'API ; les listes (collèges, secteurs, commissions, catégories,
montants d'adhésion, formules de partenariat) sont des objets modifiables dans l'admin ; les contenus non publiés
ne sont jamais renvoyés par l'API (filtrage dans les QuerySets) ; les données privées des organisations
(contact du représentant, offres, besoins) ne sont dans aucun serializer public.

## 1. Installation locale (avec terminal)

Prérequis : Python 3.12+, Node 20+, PostgreSQL 16 (ou `docker compose up -d postgres`).

```bash
cp .env.example .env        # puis adapter : POSTGRES_HOST=localhost, DJANGO_SETTINGS_MODULE=config.settings.dev, DEBUG=True

# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements/dev.txt
python manage.py makemigrations users core organizations map events memberships partnerships news press newsletter contact documents
python manage.py migrate
python manage.py createsuperuser
python manage.py seed_initial_data
python manage.py runserver            # http://localhost:8000/admin/  ·  http://localhost:8000/api/docs/

# Frontend (autre terminal)
cd frontend
npm install
npm run dev                           # http://localhost:5173 (proxy /api vers le backend)
```

Tests : `python manage.py test --settings=config.settings.test` (backend) et `npm test` (frontend).
Une fois les migrations générées, **versionnez-les** (`backend/apps/*/migrations/`).

## 2. Production avec Docker

```bash
cp .env.example .env   # renseigner SECRET_KEY, POSTGRES_PASSWORD, domaines, e-mail
docker compose up -d --build
```

Services : `postgres` (volume persistant), `backend` (Gunicorn, applique les migrations, collecte les statiques),
`frontend` (build React copié vers Nginx), `nginx` (ports 80/443).

Premier démarrage sans terminal : laissez `AUTO_MAKEMIGRATIONS=1`, `SEED_ON_START=1` et renseignez
`DJANGO_SUPERUSER_USERNAME/EMAIL/PASSWORD`. Après la première connexion à `/admin/`, **retirez ces trois variables
de mot de passe** et passez `AUTO_MAKEMIGRATIONS` à `0` une fois les migrations versionnées.

HTTPS : installez un certificat (Let's Encrypt), complétez `nginx/conf.d/default.conf` (voir le commentaire final),
puis `SECURE_SSL_REDIRECT=True`.

## 3. Validation automatique (sans terminal)

Poussez le dépôt sur GitHub : l'onglet **Actions** exécute `Validation` (génération des migrations, `check`,
migrations PostgreSQL, seed ×2, tests SQLite et PostgreSQL, tests et build du frontend). Les migrations générées
sont téléchargeables dans les « Artifacts » de l'exécution.

## 4. API

Documentation interactive : `/api/docs/` (schéma : `/api/schema/`). Lecture publique : organisations, carte,
événements, articles, documents, communiqués, listes de référence. Écriture publique (formulaires, limitée en
fréquence, champ anti-spam, validation serveur) : adhésion, référencement, partenariat, newsletter, contact,
accréditation, suggestion de lieu, Awards, Business Connect, bénévolat.

## 5. Sécurité

CSRF, CORS restreint, JWT préparé (rôles ADMIN / COORDINATION / MEMBER), mots de passe hachés, validation
backend + frontend, uploads contrôlés (taille, extension, signature PDF), en-têtes de sécurité Nginx,
HSTS et cookies sécurisés en production HTTPS, aucun secret dans le frontend.

## 6. Limites connues de cette V1

- Les pages « Le réseau » et « Nos actions » affichent « en cours de construction » tant que les textes sources
  n'ont pas été intégrés.
- SEO : balises et sitemap en place ; le rendu est côté navigateur (pas de pré-rendu serveur), ce qui limite
  les aperçus de partage de liens et l'indexation par certains robots.
- Pas de regroupement de marqueurs (clustering) sur la carte ; filtres « propose/recherche » de l'annuaire reportés.
- Le logo officiel et les photos ne sont pas fournis : logotype provisoire et emplacements d'images marqués.
- Version anglaise et espace membres complet prévus pour 2027 (architecture préparée).
