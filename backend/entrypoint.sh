#!/bin/sh
set -e
APPS="${MIGRATION_APPS:-users core organizations map events memberships partnerships news press newsletter contact documents}"
# Premier déploiement sans terminal : génère les migrations initiales dans le conteneur.
if [ "$AUTO_MAKEMIGRATIONS" = "1" ]; then python manage.py makemigrations $APPS --noinput; fi
python manage.py migrate --noinput
python manage.py collectstatic --noinput
if [ "$SEED_ON_START" = "1" ]; then python manage.py seed_initial_data; fi
if [ -n "$DJANGO_SUPERUSER_USERNAME" ] && [ -n "$DJANGO_SUPERUSER_PASSWORD" ]; then
  python manage.py createsuperuser --noinput || true
fi
exec gunicorn config.wsgi:application -b 0.0.0.0:8000 --workers 3 --access-logfile -
