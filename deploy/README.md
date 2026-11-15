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

## 2. Campagnes d'e-mails (onglet « Campagnes » de l'Espace Coordination)

Les campagnes partent par **Brevo** (relais SMTP), jamais par la boîte `coordination@`, qui envoie les confirmations et les badges.

1. Créez un compte sur brevo.com, puis dans *Expéditeurs, domaines et IP* : ajoutez le domaine `urbanhubconnect.com`
   et créez chez OVH (zone DNS) les enregistrements que Brevo indique (code Brevo, DKIM, DMARC). Ajoutez l'expéditeur
   `infos@urbanhubconnect.com` (alias de `coordination@` chez OVH : le code de vérification de Brevo arrive dans cette boîte).
2. Dans *SMTP et API › SMTP*, générez une clé SMTP, puis complétez `backend/.env` :
   ```
   CAMPAIGN_EMAIL_HOST=smtp-relay.brevo.com
   CAMPAIGN_EMAIL_PORT=587
   CAMPAIGN_EMAIL_USER=identifiant-smtp-affiché-par-brevo
   CAMPAIGN_EMAIL_PASSWORD=clé-smtp-brevo
   CAMPAIGN_FROM_EMAIL=Urban Hub Connect <infos@urbanhubconnect.com>
   CAMPAIGN_DAILY_LIMIT=280
   ```
   `CAMPAIGN_DAILY_LIMIT` doit rester sous le plafond quotidien de votre offre Brevo.
3. Installez le minuteur (passage toutes les 15 minutes) :
   ```bash
   sudo cp /var/www/urbanhubconnect/deploy/urbanhubconnect-campaigns.service /var/www/urbanhubconnect/deploy/urbanhubconnect-campaigns.timer /etc/systemd/system/
   sudo systemctl daemon-reload
   sudo systemctl enable --now urbanhubconnect-campaigns.timer
   sudo systemctl start urbanhubconnect-campaigns.service
   journalctl -u urbanhubconnect-campaigns.service -n 5    # « Aucun envoi dû. » ou le bilan des envois
   ```

## 3. Sauvegardes quotidiennes

```bash
sudo mkdir -p /var/backups/urbanhubconnect && sudo chown ubuntu /var/backups/urbanhubconnect
( crontab -l 2>/dev/null; echo "30 2 * * * sh /var/www/urbanhubconnect/deploy/backup.sh >> /var/backups/urbanhubconnect/journal.txt 2>&1" ) | crontab -
sh /var/www/urbanhubconnect/deploy/backup.sh            # test immédiat
```

Copiez régulièrement `/var/backups/urbanhubconnect` **hors du serveur** : une sauvegarde restée sur la même machine ne protège pas d'une panne du serveur.

## 4. Vérifications du fichier backend/.env

| Variable | Rôle |
|---|---|
| `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Envoi des e-mails (confirmation, bulletin, invitation, rappels). Sans elles, aucun e-mail ne part. |
| `SITE_URL` | Adresse du site dans les liens des e-mails (`https://www.urbanhubconnect.com`). |
| `MAX_UPLOAD_MB` | Taille maximale des fichiers envoyés (10 pour le dossier de 6 Mo). |

Test d'envoi : `python manage.py sendtestemail votre@adresse.com --settings=config.settings.prod`.

## 5. Après chaque mise à jour du code

```bash
cd /var/www/urbanhubconnect && git pull
cd frontend && npm run build
cd ../backend && source env/bin/activate
pip install -r requirements/prod.txt     # nouvelles dépendances éventuelles
python manage.py migrate --settings=config.settings.prod
sudo systemctl restart urbanhubconnect.service
```

`--settings=config.settings.prod` est indispensable : sans lui, la commande vise la base de test SQLite, pas celle du site.
