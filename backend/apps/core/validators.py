from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import FileExtensionValidator, MaxValueValidator, MinValueValidator

LATITUDE_VALIDATORS = [MinValueValidator(-90), MaxValueValidator(90)]
LONGITUDE_VALIDATORS = [MinValueValidator(-180), MaxValueValidator(180)]
validate_image_extension = FileExtensionValidator(["jpg", "jpeg", "png", "webp"])  # SVG exclu (XSS)


def validate_upload_size(f):
    limit = settings.MAX_UPLOAD_MB * 1024 * 1024
    if f.size > limit:
        raise ValidationError(f"Fichier trop volumineux (maximum {settings.MAX_UPLOAD_MB} Mo).")


def coordinate_errors(lat, lon):
    """Retourne un dict d'erreurs {champ: message} (vide si valide)."""
    if lat is None and lon is None:
        return {}
    if lat is None or lon is None:
        return {("latitude" if lat is None else "longitude"):
                "Latitude et longitude doivent être renseignées ensemble."}
    b, errors = settings.GEO_BOUNDS, {}
    if not b["lat_min"] <= float(lat) <= b["lat_max"]:
        errors["latitude"] = "Latitude hors de la zone couverte (vérifiez qu'elle n'est pas inversée avec la longitude)."
    if not b["lon_min"] <= float(lon) <= b["lon_max"]:
        errors["longitude"] = "Longitude hors de la zone couverte (vérifiez qu'elle n'est pas inversée avec la latitude)."
    return errors


def validate_pdf(f):
    if not f.name.lower().endswith(".pdf"):
        raise ValidationError("Seuls les fichiers PDF sont acceptés.")
    head = f.read(5)
    f.seek(0)
    if head != b"%PDF-":
        raise ValidationError("Le contenu du fichier n'est pas un PDF valide.")
