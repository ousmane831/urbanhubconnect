"""Itinéraires de la Cartographie du Hub : calcul par OpenRouteService (carte OpenStreetMap), en voiture ou à pied.

Le navigateur envoie sa position et la destination à notre serveur, qui interroge OpenRouteService avec la clé
ORS_API_KEY (jamais exposée dans la page). Les positions ne sont ni enregistrées ni écrites dans les journaux.
"""
import json
import logging
import urllib.error
import urllib.request

from django.conf import settings
from django.core.cache import cache

logger = logging.getLogger(__name__)
# Depuis 2026, l'API publique d'OpenRouteService est servie par HeiGIT (api.heigit.org) ; l'ancienne adresse
# api.openrouteservice.org a été arrêtée. Réglable par ORS_BASE_URL si l'adresse change encore.
def _url(profile):
    base = getattr(settings, "ORS_BASE_URL", "https://api.heigit.org/openrouteservice").rstrip("/")
    return f"{base}/v2/directions/{profile}/geojson"
PROFILES = {"driving": "driving-car", "foot": "foot-walking"}
TIMEOUT = 12


class RouteError(Exception):
    """Message lisible, affiché tel quel sur la carte."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.status = status


def configured():
    return bool(getattr(settings, "ORS_API_KEY", ""))


def parse_point(value):
    """« 14.72,-17.18 » → (14.72, -17.18), dans l'emprise du Sénégal."""
    try:
        lat, lng = (float(x) for x in str(value).split(","))
    except (TypeError, ValueError):
        raise RouteError("Position invalide.")
    b = settings.GEO_BOUNDS
    if not (b["lat_min"] <= lat <= b["lat_max"] and b["lon_min"] <= lng <= b["lon_max"]):
        raise RouteError("Le calcul d'itinéraire est disponible depuis le Sénégal uniquement. "
                         "Utilisez « Lancer la navigation » pour ouvrir votre application de GPS.")
    return lat, lng


def _call(profile, start, end):
    body = json.dumps({"coordinates": [[start[1], start[0]], [end[1], end[0]]], "language": "fr", "instructions": True,
                       "units": "m", "radiuses": [1000, 1000]}).encode()
    req = urllib.request.Request(_url(profile), data=body, method="POST", headers={
        "Authorization": settings.ORS_API_KEY, "Content-Type": "application/json",
        "Accept": "application/geo+json, application/json"})
    try:
        with urllib.request.urlopen(req, timeout=TIMEOUT) as resp:
            return json.load(resp)
    except urllib.error.HTTPError as e:
        detail = ""
        try:
            detail = json.load(e).get("error", {}).get("message", "")
        except Exception:
            pass
        logger.warning("OpenRouteService : erreur %s (%s)", e.code, detail[:200])
        if e.code == 404 or "routable point" in detail or "could not find" in detail.lower():
            raise RouteError("Aucune route n'a été trouvée près de votre position ou de ce lieu.", 404)
        if e.code == 429:
            raise RouteError("Trop de calculs d'itinéraire en ce moment. Réessayez dans quelques minutes, "
                             "ou utilisez « Lancer la navigation ».", 503)
        raise RouteError("Le calcul d'itinéraire est momentanément indisponible. Utilisez « Lancer la navigation ».", 503)
    except (urllib.error.URLError, TimeoutError, OSError):
        logger.warning("OpenRouteService injoignable")
        raise RouteError("Le calcul d'itinéraire est momentanément indisponible. Utilisez « Lancer la navigation ».", 503)


def route(start, end, mode="driving"):
    if not configured():
        raise RouteError("Le calcul d'itinéraire n'est pas encore activé. Utilisez « Lancer la navigation ».", 503)
    profile = PROFILES.get(mode)
    if not profile:
        raise RouteError("Mode de déplacement inconnu.")
    key = f"route:{profile}:{start[0]:.4f},{start[1]:.4f}:{end[0]:.4f},{end[1]:.4f}"  # ~10 m : trajets voisins réutilisés
    cached = cache.get(key)
    if cached:
        return cached

    data = _call(profile, start, end)
    try:
        feature = data["features"][0]
        coords = feature["geometry"]["coordinates"]
        summary = feature["properties"].get("summary", {})
        segment = (feature["properties"].get("segments") or [{}])[0]
    except (KeyError, IndexError, TypeError):
        raise RouteError("Aucune route n'a été trouvée vers ce lieu.", 404)

    geometry = [[round(lat, 6), round(lng, 6)] for lng, lat in coords]
    steps = []
    for s in segment.get("steps", []):
        first = (s.get("way_points") or [0])[0]
        steps.append({"instruction": s.get("instruction", ""), "distance": round(s.get("distance", 0)),
                      "duration": round(s.get("duration", 0)), "type": s.get("type"),
                      "location": geometry[min(first, len(geometry) - 1)] if geometry else None})
    result = {"mode": mode, "distance": round(summary.get("distance", 0)), "duration": round(summary.get("duration", 0)),
              "geometry": geometry, "steps": steps}
    cache.set(key, result, 600)
    return result
