"""
Django settings for JobTrack API project.
Built for production-readiness, security, and scalability.
Compatible with Render (backend), Vercel (frontend), and Managed MySQL.
"""

from pathlib import Path
from datetime import timedelta
import os
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent

# Load environment variables from .env file
load_dotenv(BASE_DIR / '.env')

# -----------------------------------------------------------------------------
# CORE APPLICATION SETTINGS & SECRETS
# -----------------------------------------------------------------------------

DEBUG = os.getenv('DEBUG', 'True').strip().lower() in ('true', '1', 'yes')

if DEBUG:
    SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-fallback-development-key')
else:
    raw_secret = os.getenv('SECRET_KEY', '').strip()
    if not raw_secret or raw_secret == 'django-insecure-fallback-development-key' or len(raw_secret) < 32:
        raise ImproperlyConfigured(
            "In production (DEBUG=False), a strong, cryptographically secure SECRET_KEY "
            "environment variable (minimum 32 characters) is strictly required. "
            "Never use the development fallback key in production."
        )
    SECRET_KEY = raw_secret

# -----------------------------------------------------------------------------
# HOSTS & NETWORKING CONFIGURATION
# -----------------------------------------------------------------------------

ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]

# Auto-detect Render external hostname if running in Render's container runtime
render_hostname = os.getenv('RENDER_EXTERNAL_HOSTNAME', '').strip()
if render_hostname and render_hostname not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append(render_hostname)

if DEBUG and 'testserver' not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append('testserver')

# -----------------------------------------------------------------------------
# APPLICATION DEFINITION
# -----------------------------------------------------------------------------

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party packages
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',

    # Local Project Apps
    'accounts.apps.AccountsConfig',
    'applications.apps.ApplicationsConfig',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'jobtrack_api.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'jobtrack_api.wsgi.application'

# -----------------------------------------------------------------------------
# DATABASE CONFIGURATION
# -----------------------------------------------------------------------------
# Development: SQLite fallback is permitted when DEBUG=True for local agility.
# Production: Managed MySQL with explicit SSL/TLS is strictly enforced.
# Silent fallback to SQLite in production is explicitly prohibited.

use_sqlite = os.getenv('USE_SQLITE_FALLBACK', 'False').strip().lower() in ('true', '1', 'yes')

if not DEBUG and use_sqlite:
    raise ImproperlyConfigured(
        "USE_SQLITE_FALLBACK=True is strictly prohibited when DEBUG=False. "
        "Production deployments on ephemeral platforms (like Render) require a persistent managed MySQL database."
    )

if DEBUG and use_sqlite:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME': BASE_DIR / 'db.sqlite3',
        }
    }
else:
    db_name = os.getenv('DB_NAME', '').strip()
    db_user = os.getenv('DB_USER', '').strip()
    db_password = os.getenv('DB_PASSWORD', '')
    db_host = os.getenv('DB_HOST', '').strip()
    db_port = os.getenv('DB_PORT', '3306').strip()
    raw_engine = os.getenv('DB_ENGINE', '').strip()

    # Determine Database Engine:
    # Dedicated TiDB custom backend for TiDB Cloud Starter, standard MySQL for traditional instances.
    if raw_engine and raw_engine not in ('django.db.backends.mysql', 'jobtrack_api.db.backends.tidb'):
        db_engine = raw_engine
    elif db_port == '4000' or 'tidb' in db_host.lower() or raw_engine == 'jobtrack_api.db.backends.tidb':
        db_engine = 'jobtrack_api.db.backends.tidb'
    else:
        db_engine = 'django.db.backends.mysql'

    if not DEBUG:
        missing_vars = []
        if not db_name:
            missing_vars.append('DB_NAME')
        if not db_user:
            missing_vars.append('DB_USER')
        if not db_password or not db_password.strip():
            missing_vars.append('DB_PASSWORD')
        if not db_host:
            missing_vars.append('DB_HOST')
        if missing_vars:
            raise ImproperlyConfigured(
                f"Production MySQL configuration is incomplete. Missing environment variable(s): {', '.join(missing_vars)}. "
                "Managed MySQL requires DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, and DB_PORT."
            )

    mysql_options = {
        'charset': 'utf8mb4',
        'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
    }

    # PyMySQL SSL/TLS Configuration:
    # In production (DEBUG=False), TLS encryption, hostname validation, and CA bundle are strictly mandatory.
    ssl_required_raw = os.getenv('DB_SSL_REQUIRED', 'True' if not DEBUG else 'False')
    ssl_required = ssl_required_raw.strip().lower() in ('true', '1', 'yes')

    if not DEBUG and not ssl_required:
        raise ImproperlyConfigured(
            "DB_SSL_REQUIRED=True is strictly required when DEBUG=False. "
            "Production MySQL/TiDB database connections must be encrypted."
        )

    ssl_check_hostname_raw = os.getenv('DB_SSL_CHECK_HOSTNAME', 'True')
    ssl_check_hostname = ssl_check_hostname_raw.strip().lower() in ('true', '1', 'yes')

    if not DEBUG and not ssl_check_hostname:
        raise ImproperlyConfigured(
            "DB_SSL_CHECK_HOSTNAME=True is strictly required when DEBUG=False. "
            "Hostname verification cannot be disabled in production."
        )

    ssl_ca = os.getenv('DB_SSL_CA', '').strip()

    if not DEBUG and not ssl_ca:
        raise ImproperlyConfigured(
            "DB_SSL_CA is strictly required when DEBUG=False. "
            "Configure the path to the CA certificate bundle (e.g. /etc/secrets/tidb-ca.pem)."
        )

    if ssl_ca:
        if not os.path.exists(ssl_ca):
            raise ImproperlyConfigured(
                f"DB_SSL_CA file not found at '{ssl_ca}'. Ensure the CA certificate bundle exists on disk."
            )
        mysql_options['ssl'] = {
            'ca': ssl_ca,
            'check_hostname': ssl_check_hostname,
            'verify_mode': 'required',
        }
    elif ssl_required:
        # Development mode utilizing system CA bundle when DB_SSL_REQUIRED=True
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = ssl_check_hostname
        mysql_options['ssl'] = ctx

    conn_max_age_raw = os.getenv('DB_CONN_MAX_AGE', '60').strip()
    try:
        conn_max_age = int(conn_max_age_raw)
        if conn_max_age < 0:
            raise ValueError("Negative value not allowed")
    except (ValueError, TypeError):
        raise ImproperlyConfigured(
            f"DB_CONN_MAX_AGE must be a non-negative integer, got '{conn_max_age_raw}'."
        )

    DATABASES = {
        'default': {
            'ENGINE': db_engine,
            'NAME': db_name or 'jobtrack',
            'USER': db_user or 'root',
            'PASSWORD': db_password or '',
            'HOST': db_host or '127.0.0.1',
            'PORT': db_port or '3306',
            'OPTIONS': mysql_options,
            'CONN_MAX_AGE': conn_max_age,
            'CONN_HEALTH_CHECKS': True,
        }
    }

# -----------------------------------------------------------------------------
# PASSWORD VALIDATION
# -----------------------------------------------------------------------------

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 8}},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# -----------------------------------------------------------------------------
# INTERNATIONALIZATION & TIMEZONE
# -----------------------------------------------------------------------------

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

# -----------------------------------------------------------------------------
# STATIC FILES (WhiteNoise Configuration)
# -----------------------------------------------------------------------------

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedManifestStaticFilesStorage',
    },
}

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# -----------------------------------------------------------------------------
# DJANGO REST FRAMEWORK CONFIGURATION
# -----------------------------------------------------------------------------

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# -----------------------------------------------------------------------------
# JWT (SimpleJWT) CONFIGURATION
# -----------------------------------------------------------------------------

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
}

# -----------------------------------------------------------------------------
# CORS & CSRF CONFIGURATION
# -----------------------------------------------------------------------------

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOW_CREDENTIALS = True

cors_origins_raw = os.getenv('CORS_ALLOWED_ORIGINS', '')
if cors_origins_raw:
    CORS_ALLOWED_ORIGINS = [
        origin.strip() for origin in cors_origins_raw.split(',') if origin.strip()
    ]
elif DEBUG:
    CORS_ALLOWED_ORIGINS = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
    ]
else:
    CORS_ALLOWED_ORIGINS = []

# CSRF Trusted Origins (required for POST/form requests across origins in Django 4+)
csrf_origins_raw = os.getenv('CSRF_TRUSTED_ORIGINS', '')
if csrf_origins_raw:
    CSRF_TRUSTED_ORIGINS = [
        origin.strip() for origin in csrf_origins_raw.split(',') if origin.strip()
    ]
else:
    # Auto-derive from CORS origins and Render host
    CSRF_TRUSTED_ORIGINS = [
        origin for origin in CORS_ALLOWED_ORIGINS if origin.startswith('http://') or origin.startswith('https://')
    ]
    if render_hostname:
        CSRF_TRUSTED_ORIGINS.append(f'https://{render_hostname}')
    if not CSRF_TRUSTED_ORIGINS and DEBUG:
        CSRF_TRUSTED_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']

# -----------------------------------------------------------------------------
# PRODUCTION HTTPS & REVERSE PROXY SECURITY (Render)
# -----------------------------------------------------------------------------

# Render terminates TLS at edge reverse proxy and forwards with X-Forwarded-Proto header
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

if not DEBUG:
    # Enforce SSL redirect unless explicitly disabled in env (e.g. local container debugging)
    SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'True').strip().lower() in ('true', '1', 'yes')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'

    # HSTS (HTTP Strict Transport Security)
    # Default to 1 year; can be overridden or set to 0 during initial domain verification
    hsts_seconds = int(os.getenv('SECURE_HSTS_SECONDS', '31536000'))
    SECURE_HSTS_SECONDS = hsts_seconds
    SECURE_HSTS_INCLUDE_SUBDOMAINS = hsts_seconds > 0
    SECURE_HSTS_PRELOAD = hsts_seconds > 0
else:
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False
    CSRF_COOKIE_SECURE = False
    SECURE_HSTS_SECONDS = 0

# -----------------------------------------------------------------------------
# LOGGING CONFIGURATION
# -----------------------------------------------------------------------------

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[{asctime}] {levelname} [{name}:{lineno}] {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': os.getenv('DJANGO_LOG_LEVEL', 'INFO'),
            'propagate': False,
        },
        'accounts': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
        'applications': {
            'handlers': ['console'],
            'level': 'DEBUG' if DEBUG else 'INFO',
            'propagate': False,
        },
    },
}
