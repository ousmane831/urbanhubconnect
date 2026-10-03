import os
os.environ.setdefault("SECRET_KEY", "cle-locale-pour-essai-seulement")
for _k in ("POSTGRES_DB", "POSTGRES_USER", "POSTGRES_PASSWORD"):
    os.environ.setdefault(_k, "x")

from .base import *  # noqa

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1"]
DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}
EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
CORS_ALLOWED_ORIGINS = ["http://localhost:5174"]
CSRF_TRUSTED_ORIGINS = ["http://localhost:5174", "http://localhost:8000"]