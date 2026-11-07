#!/bin/sh
# Sauvegarde quotidienne d'Urban Hub Connect : base PostgreSQL, fichiers publics (media) et documents réservés aux membres (private_media).
# Usage : sh deploy/backup.sh [dossier_de_destination]   (par défaut /var/backups/urbanhubconnect)
# Conserve 14 jours de copies. Copiez régulièrement ce dossier HORS du serveur (autre machine, stockage en ligne).
set -eu
APP=/var/www/urbanhubconnect/backend
DEST=${1:-/var/backups/urbanhubconnect}
STAMP=$(date +%Y-%m-%d)
mkdir -p "$DEST"

# Identifiants de la base lus dans backend/.env, sans l'exécuter : les autres valeurs (clé secrète…) contiennent
# des caractères que le shell interpréterait. Seules les lignes POSTGRES_* sont lues, guillemets éventuels retirés.
env_value() {
  grep -E "^$1=" "$APP/.env" | tail -n 1 | cut -d= -f2- | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//' -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}
DB_NAME=$(env_value POSTGRES_DB)
DB_USER=$(env_value POSTGRES_USER)
DB_HOST=$(env_value POSTGRES_HOST); DB_HOST=${DB_HOST:-localhost}
DB_PORT=$(env_value POSTGRES_PORT); DB_PORT=${DB_PORT:-5432}
[ "$DB_HOST" = "postgres" ] && DB_HOST=localhost  # nom du service Docker : sur le VPS, la base est locale
PGPASSWORD=$(env_value POSTGRES_PASSWORD) pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -Fc "$DB_NAME" > "$DEST/base-$STAMP.dump"
tar -czf "$DEST/fichiers-$STAMP.tar.gz" -C "$APP" media private_media 2>/dev/null || tar -czf "$DEST/fichiers-$STAMP.tar.gz" -C "$APP" media

find "$DEST" -type f -mtime +14 -delete
echo "Sauvegarde terminée dans $DEST ($STAMP)."
# Restauration de la base : pg_restore -h HOTE -U UTILISATEUR -d BASE --clean base-AAAA-MM-JJ.dump
