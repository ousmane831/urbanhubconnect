# Mise en production sur le VPS (sans Docker)

Toutes les commandes se lancent sur le serveur, en SSH.

## 1. Tâche quotidienne : échéances et rappels de cotisation

Chaque jour, elle passe en « échue » les cotisations dépassées (la fiche quitte l'Annuaire) et envoie les rappels d'échéance à J-30 et J-7.
Sans elle, le site constate quand même les échéances à la première visite de l'Annuaire ou de l'Espace Coordination, mais **n'envoie aucun rappel**.

```bash
sudo cp /var/www/urbanhubconnect/deploy/urbanhubconnect-daily.service /var/www/urbanhubconnect/deploy/urbanhubconnect-daily.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now urbanhubconnect-daily.timer
sudo systemctl start urbanhubconnect-daily.service      # premier passage tout de suite
journalctl -u urbanhubconnect-daily.service -n 5        # doit afficher « … cotisation(s) échue(s), … rappel(s) … »
```

Si l'utilisateur du serveur n'est pas `ubuntu`, corrigez la ligne `User=` du fichier `.service` avant de le copier.

## 2. Sauvegardes quotidiennes

```bash
sudo mkdir -p /var/backups/urbanhubconnect && sudo chown ubuntu /var/backups/urbanhubconnect
( crontab -l 2>/dev/null; echo "30 2 * * * sh /var/www/urbanhubconnect/deploy/backup.sh >> /var/backups/urbanhubconnect/journal.txt 2>&1" ) | crontab -
sh /var/www/urbanhubconnect/deploy/backup.sh            # test immédiat
```

Copiez régulièrement `/var/backups/urbanhubconnect` **hors du serveur** : une sauvegarde restée sur la même machine ne protège pas d'une panne du serveur.

## 3. Vérifications du fichier backend/.env

| Variable | Rôle |
|---|---|
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Envoi des e-mails (confirmation, bulletin, invitation, rappels). Sans elles, aucun e-mail ne part. |
| `SITE_URL` | Adresse du site dans les liens des e-mails (`https://www.urbanhubconnect.com`). |
| `MAX_UPLOAD_MB` | Taille maximale des fichiers envoyés (10 pour le dossier de 6 Mo). |

Test d'envoi : `python manage.py sendtestemail votre@adresse.com --settings=config.settings.prod`.

## 4. Après chaque mise à jour du code

```bash
cd /var/www/urbanhubconnect && git pull
cd frontend && npm run build
cd ../backend && source env/bin/activate
python manage.py migrate --settings=config.settings.prod
sudo systemctl restart urbanhubconnect.service
```

`--settings=config.settings.prod` est indispensable : sans lui, la commande vise la base de test SQLite, pas celle du site.
