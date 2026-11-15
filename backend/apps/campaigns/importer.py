"""Import des contacts depuis un fichier Excel (.xlsx) ou CSV.

Les colonnes sont reconnues par leur titre, quel que soit leur ordre (« E-mail », « Organisation », « Segment »,
« Activité », « Nom »…). Un contact déjà présent (même e-mail) est mis à jour ; un contact désinscrit reste désinscrit.
"""
import csv
import io
import unicodedata

from django.core.exceptions import ValidationError
from django.core.validators import validate_email

from .models import Contact

MAX_ROWS = 5000
COLUMNS = {
    "email": ["email", "e-mail", "mail", "adresse e-mail", "adresse email", "adresse mail", "courriel", "e mail"],
    "organization": ["organisation", "organization", "entreprise", "structure", "societe", "raison sociale", "partenaire", "nom de l'organisation"],
    "name": ["nom", "name", "contact", "nom du contact", "responsable", "prenom et nom", "nom et prenom", "nom complet", "interlocuteur"],
    "segment": ["segment", "segments", "categorie", "type", "type de partenaire", "college"],
    "activity": ["activite", "activites", "secteur", "secteur d'activite", "domaine", "domaine d'activite"],
}
LIMITS = {"organization": 200, "name": 150, "segment": 100, "activity": 150}


class ImportError_(Exception):
    """Fichier illisible ou sans colonne e-mail : message affiché tel quel à la Coordination."""


def _norm(value):
    text = unicodedata.normalize("NFKD", str(value or "")).encode("ascii", "ignore").decode().lower()
    return " ".join(text.replace("_", " ").replace("’", "'").split())


def _clean(value):
    if value is None:
        return ""
    return " ".join(str(value).split())


def _sheets_from_xlsx(data):
    """Toutes les feuilles du classeur : [(nom de la feuille, lignes)]."""
    from openpyxl import load_workbook
    try:
        wb = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    except Exception:
        raise ImportError_("Ce fichier Excel est illisible. Enregistrez-le au format .xlsx puis réessayez.")
    try:
        return [(ws.title, [list(r) for r in ws.iter_rows(values_only=True)]) for ws in wb.worksheets]
    finally:
        wb.close()


def _rows_from_csv(data):
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            text = data.decode(encoding)
            break
        except UnicodeDecodeError:
            continue
    try:
        dialect = csv.Sniffer().sniff(text[:4096], delimiters=";,\t")
    except csv.Error:
        dialect = csv.excel
    return list(csv.reader(io.StringIO(text), dialect))


def _header_map(row):
    found = {}
    for index, cell in enumerate(row):
        name = _norm(cell)
        for field, aliases in COLUMNS.items():
            if field not in found and name in aliases:
                found[field] = index
    return found if "email" in found else None


def _read_sheet(rows, sheet, parsed, skipped):
    """Lit une feuille (titres sur l'une des 10 premières lignes). Retourne les colonnes trouvées, ou None."""
    mapping, line = None, 0
    for row in rows:
        line += 1
        if mapping is None:
            mapping = _header_map(row)
            if mapping is None and line >= 10:
                return None
            continue
        if not any(_clean(c) for c in row):
            continue
        get = lambda f: _clean(row[mapping[f]]) if f in mapping and mapping[f] < len(row) else ""
        email = get("email").lower().strip("<>;, ")
        try:
            validate_email(email)
        except ValidationError:
            skipped.append({"sheet": sheet, "line": line, "value": email, "reason": "adresse e-mail manquante ou invalide"})
            continue
        parsed[email] = {f: get(f)[:LIMITS[f]] for f in LIMITS}  # une adresse en double : la dernière ligne l'emporte
        if len(parsed) > MAX_ROWS:
            raise ImportError_(f"Le fichier dépasse {MAX_ROWS} contacts.")
    return mapping


def import_contacts(filename, data):
    """Retourne le bilan : créés, mis à jour, lignes écartées (avec la raison). Un classeur Excel est lu feuille par feuille."""
    name = (filename or "").lower()
    if name.endswith(".xlsx"):
        sheets = _sheets_from_xlsx(data)
    elif name.endswith(".csv"):
        sheets = [("", _rows_from_csv(data))]
    else:
        raise ImportError_("Format non pris en charge : envoyez un fichier Excel (.xlsx) ou CSV.")

    parsed, skipped, columns, read, ignored = {}, [], set(), [], []
    for sheet, rows in sheets:
        if not any(any(_clean(c) for c in r) for r in rows):
            continue  # feuille vide
        mapping = _read_sheet(rows, sheet, parsed, skipped)
        if mapping is None:
            ignored.append(sheet)
        else:
            read.append(sheet)
            columns |= set(mapping)
    if not read:
        raise ImportError_("Colonne e-mail introuvable. La première ligne de chaque feuille doit contenir les titres des colonnes, "
                           "dont une colonne « E-mail ».")

    existing = {c.email: c for c in Contact.objects.filter(email__in=parsed)}
    created = updated = 0
    for email, values in parsed.items():
        contact = existing.get(email)
        if contact is None:
            Contact.objects.create(email=email, **values)
            created += 1
            continue
        changes = {f: v for f, v in values.items() if v and getattr(contact, f) != v}
        if changes:
            for f, v in changes.items():
                setattr(contact, f, v)
            contact.save()
            updated += 1
    unsubscribed = sum(1 for c in existing.values() if c.unsubscribed_at)
    return {"created": created, "updated": updated, "unchanged": len(parsed) - created - updated, "skipped": skipped[:50],
            "skipped_count": len(skipped), "unsubscribed_kept": unsubscribed,
            "columns": sorted(columns), "sheets": [x for x in read if x], "ignored_sheets": [x for x in ignored if x]}
