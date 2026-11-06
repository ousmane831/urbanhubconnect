from .base import *  # noqa

DEBUG = True

EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"
CORS_ALLOW_ALL_ORIGINS = False
CSRF_TRUSTED_ORIGINS = [
    *CSRF_TRUSTED_ORIGINS,
    "http://localhost:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]

# Local development database: SQLite.
# Staging and production continue to use their PostgreSQL settings.
DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}