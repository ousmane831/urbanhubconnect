#!/bin/sh
# Sauvegarde quotidienne d'Urban Hub Connect : base PostgreSQL, fichiers publics (media) et documents réservés aux membres (private_media).
# Usage : sh deploy/backup.sh [dossier_de_destination]   (par défaut /var/backups/urbanhubconnect)
# Conserve 14 jours de copies. Copiez régulièrement ce dossier HORS du serveur (autre machine, stockage en ligne).
set -eu
APP=/var/www/urbanhubconnect/backend
DEST=${1:-/var/backups/urbanhubconnect}
STAMP=$(date +%Y-%m-%d)
mkdir -p "$DEST"

# Identifiants de la base lus dans backend/.env (POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_HOST, POSTGRES_PORT)
set -a; . "$APP/.env"; set +a
PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "${POSTGRES_HOST:-localhost}" -p "${POSTGRES_PORT:-5432}" -U "$POSTGRES_USER" -Fc "$POSTGRES_DB" \
  > "$DEST/base-$STAMP.dump"
tar -czf "$DEST/fichiers-$STAMP.tar.gz" -C "$APP" media private_media 2>/dev/null || tar -czf "$DEST/fichiers-$STAMP.tar.gz" -C "$APP" media

find "$DEST" -type f -mtime +14 -delete
echo "Sauvegarde terminée dans $DEST ($STAMP)."
# Restauration de la base : pg_restore -h HOTE -U UTILISATEUR -d BASE --clean base-AAAA-MM-JJ.dump
