from django.test import TestCase
from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
import subprocess
import sys
import os
import tempfile
from pathlib import Path


class UserAuthenticationTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.register_url = reverse('auth-register')
        self.login_url = reverse('auth-login')
        self.refresh_url = reverse('token-refresh')
        self.logout_url = reverse('auth-logout')
        self.profile_url = reverse('auth-profile')
        self.change_password_url = reverse('auth-change-password')

        self.user_data = {
            'username': 'candidate1',
            'email': 'candidate1@example.com',
            'first_name': 'Alex',
            'last_name': 'Dev',
            'password': 'SecurePassword123!',
            'password_confirm': 'SecurePassword123!',
        }
        self.user = User.objects.create_user(
            username='existinguser',
            email='existing@example.com',
            password='ExistingPassword123!',
            first_name='Existing',
            last_name='User'
        )

    def test_successful_registration(self):
        """Test registering a new user returns 201 Created and valid JWT token pair."""
        response = self.client.post(self.register_url, self.user_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'candidate1')
        self.assertEqual(response.data['user']['email'], 'candidate1@example.com')
        self.assertTrue(User.objects.filter(username='candidate1').exists())

    def test_registration_duplicate_username(self):
        """Test registration fails when username is already taken."""
        duplicate_data = self.user_data.copy()
        duplicate_data['username'] = 'existinguser'
        response = self.client.post(self.register_url, duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('username', response.data)

    def test_registration_duplicate_email(self):
        """Test registration fails when email is already in use."""
        duplicate_data = self.user_data.copy()
        duplicate_data['email'] = 'existing@example.com'
        response = self.client.post(self.register_url, duplicate_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('email', response.data)

    def test_registration_mismatched_passwords(self):
        """Test registration rejects mismatched password confirmation."""
        mismatched_data = self.user_data.copy()
        mismatched_data['password_confirm'] = 'DifferentPassword999!'
        response = self.client.post(self.register_url, mismatched_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password_confirm', response.data)

    def test_registration_weak_short_password(self):
        """Test registration enforces minimum 8 character password length."""
        weak_data = self.user_data.copy()
        weak_data['password'] = 'short'
        weak_data['password_confirm'] = 'short'
        response = self.client.post(self.register_url, weak_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('password', response.data)

    def test_login_success(self):
        """Test login with valid credentials returns tokens and user profile."""
        login_data = {
            'username': 'existinguser',
            'password': 'ExistingPassword123!',
        }
        response = self.client.post(self.login_url, login_data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)
        self.assertEqual(response.data['user']['username'], 'existinguser')

    def test_login_invalid_credentials(self):
        """Test login with incorrect password returns 401 Unauthorized."""
        response = self.client.post(self.login_url, {
            'username': 'existinguser',
            'password': 'WrongPassword!',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_token_refresh_and_rotation(self):
        """Test refreshing access token using refresh token."""
        refresh = RefreshToken.for_user(self.user)
        response = self.client.post(self.refresh_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)

    def test_logout_and_blacklisting(self):
        """Test logout blacklists the refresh token preventing reuse."""
        refresh = RefreshToken.for_user(self.user)
        self.client.force_authenticate(user=self.user)

        # Logout with token
        response = self.client.post(self.logout_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        # Attempt to use blacklisted token should fail
        refresh_response = self.client.post(self.refresh_url, {'refresh': str(refresh)}, format='json')
        self.assertEqual(refresh_response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_profile_retrieval_and_update(self):
        """Test authenticated profile retrieval and update."""
        self.client.force_authenticate(user=self.user)

        # Retrieve profile
        get_resp = self.client.get(self.profile_url)
        self.assertEqual(get_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(get_resp.data['username'], 'existinguser')

        # Update profile
        patch_resp = self.client.patch(self.profile_url, {
            'first_name': 'UpdatedFirst',
            'last_name': 'UpdatedLast',
        }, format='json')
        self.assertEqual(patch_resp.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertEqual(self.user.first_name, 'UpdatedFirst')
        self.assertEqual(self.user.last_name, 'UpdatedLast')

    def test_change_password(self):
        """Test authenticated password change endpoint."""
        self.client.force_authenticate(user=self.user)
        payload = {
            'old_password': 'ExistingPassword123!',
            'new_password': 'BrandNewPassword456!',
            'new_password_confirm': 'BrandNewPassword456!',
        }
        response = self.client.post(self.change_password_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('BrandNewPassword456!'))


class ProductionSettingsSecurityTests(TestCase):
    """
    Automated verification of production environment safety guards:
    - Rejection of missing or insecure SECRET_KEY in production (DEBUG=False).
    - Prohibition of SQLite fallback in production.
    - Enforcement of complete MySQL credentials when DEBUG=False.
    - Automatic inclusion of Render external hostname in ALLOWED_HOSTS.
    - Enforcement of existing DB_SSL_CA file path if specified.
    """

    def setUp(self):
        self.backend_dir = Path(__file__).resolve().parent.parent
        self.manage_py = str(self.backend_dir / 'manage.py')

    def run_check(self, env_overrides):
        """Helper to run 'manage.py check' with isolated environment variables."""
        env = os.environ.copy()
        env.update(env_overrides)
        return subprocess.run(
            [sys.executable, self.manage_py, 'check'],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )

    def test_production_missing_secret_key_fails(self):
        """Test that missing or insecure SECRET_KEY in production raises ImproperlyConfigured."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'django-insecure-fallback-development-key',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('ImproperlyConfigured', result.stderr)
        self.assertIn('SECRET_KEY', result.stderr)

    def test_production_sqlite_fallback_prohibited(self):
        """Test that USE_SQLITE_FALLBACK=True is strictly rejected when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'True',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('USE_SQLITE_FALLBACK=True is strictly prohibited when DEBUG=False', result.stderr)

    def test_production_missing_db_credentials_fails(self):
        """Test that missing DB_NAME or DB_HOST raises ImproperlyConfigured when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': '',
            'DB_USER': '',
            'DB_HOST': '',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('Production MySQL configuration is incomplete', result.stderr)

    def test_production_missing_db_password_fails(self):
        """Test that missing DB_PASSWORD raises ImproperlyConfigured when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_HOST': '127.0.0.1',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_PASSWORD', result.stderr)

    def test_production_empty_db_password_fails(self):
        """Test that empty or whitespace-only DB_PASSWORD raises ImproperlyConfigured when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': '   ',
            'DB_HOST': '127.0.0.1',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_PASSWORD', result.stderr)

    def test_production_ssl_required_false_fails(self):
        """Test that setting DB_SSL_REQUIRED=False is strictly rejected when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': '127.0.0.1',
            'DB_SSL_REQUIRED': 'False',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_SSL_REQUIRED=True is strictly required when DEBUG=False', result.stderr)

    def test_production_ssl_check_hostname_false_fails(self):
        """Test that disabling DB_SSL_CHECK_HOSTNAME is strictly rejected when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': '127.0.0.1',
            'DB_SSL_REQUIRED': 'True',
            'DB_SSL_CHECK_HOSTNAME': 'False',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_SSL_CHECK_HOSTNAME=True is strictly required when DEBUG=False', result.stderr)

    def test_production_missing_ssl_ca_fails(self):
        """Test that omitting DB_SSL_CA raises ImproperlyConfigured when DEBUG=False."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': '127.0.0.1',
            'DB_SSL_REQUIRED': 'True',
            'DB_SSL_CA': '',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_SSL_CA is strictly required when DEBUG=False', result.stderr)

    def test_production_conn_health_checks_enabled(self):
        """Test that CONN_HEALTH_CHECKS and CONN_MAX_AGE are configured on MySQL/TiDB default connection."""
        script = (
            "import os, django; "
            "os.environ['DB_PORT'] = '4000'; "
            "os.environ['DB_HOST'] = 'mock-gateway.example.com'; "
            "os.environ['USE_SQLITE_FALLBACK'] = 'False'; "
            "django.setup(); "
            "from django.conf import settings; "
            "db = settings.DATABASES['default']; "
            "assert db['CONN_HEALTH_CHECKS'] is True, 'CONN_HEALTH_CHECKS is not True'; "
            "assert db['CONN_MAX_AGE'] == 60, f'Unexpected CONN_MAX_AGE: {db[\"CONN_MAX_AGE\"]}'"
        )
        env = os.environ.copy()
        env['DB_PORT'] = '4000'
        env['DB_HOST'] = 'mock-gateway.example.com'
        env['USE_SQLITE_FALLBACK'] = 'False'
        proc = subprocess.run(
            [sys.executable, '-c', script],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")

    def test_development_sqlite_fallback_functional(self):
        """Test that existing SQLite fallback remains fully functional in development mode."""
        script = (
            "import os, django; "
            "os.environ['DEBUG'] = 'True'; "
            "os.environ['USE_SQLITE_FALLBACK'] = 'True'; "
            "django.setup(); "
            "from django.conf import settings; "
            "assert settings.DATABASES['default']['ENGINE'] == 'django.db.backends.sqlite3'"
        )
        env = os.environ.copy()
        env['DEBUG'] = 'True'
        env['USE_SQLITE_FALLBACK'] = 'True'
        proc = subprocess.run(
            [sys.executable, '-c', script],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")

    def test_production_invalid_ssl_ca_path_fails(self):
        """Test that pointing DB_SSL_CA to a nonexistent path raises ImproperlyConfigured."""
        result = self.run_check({
            'DEBUG': 'False',
            'SECRET_KEY': 'a' * 50,
            'USE_SQLITE_FALLBACK': 'False',
            'DB_NAME': 'test_db',
            'DB_USER': 'test_user',
            'DB_PASSWORD': 'test_password',
            'DB_HOST': '127.0.0.1',
            'DB_SSL_CA': 'non_existent_certificate_ca.pem',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_SSL_CA file not found', result.stderr)

    def test_production_valid_ssl_ca_path_succeeds(self):
        """Test that a valid, existing CA certificate path passes settings validation."""
        with tempfile.NamedTemporaryFile(suffix='.pem', delete=False) as temp_ca:
            temp_ca.write(b"-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----\n")
            temp_ca_path = temp_ca.name

        try:
            script = (
                "import os, django; "
                "django.setup(); "
                "from django.conf import settings; "
                "db = settings.DATABASES['default']; "
                f"assert db['OPTIONS']['ssl']['ca'] == {repr(temp_ca_path)}, 'CA path mismatch'; "
                "assert db['OPTIONS']['ssl']['verify_mode'] == 'required', 'SSL verify_mode is not required'"
            )
            env = os.environ.copy()
            env['DEBUG'] = 'False'
            env['SECRET_KEY'] = 'a' * 50
            env['USE_SQLITE_FALLBACK'] = 'False'
            env['DB_NAME'] = 'test_db'
            env['DB_USER'] = 'test_user'
            env['DB_PASSWORD'] = 'test_password'
            env['DB_HOST'] = '127.0.0.1'
            env['DB_PORT'] = '4000'
            env['DB_SSL_REQUIRED'] = 'True'
            env['DB_SSL_CHECK_HOSTNAME'] = 'True'
            env['DB_SSL_CA'] = temp_ca_path
            proc = subprocess.run(
                [sys.executable, '-c', script],
                cwd=str(self.backend_dir),
                env=env,
                capture_output=True,
                text=True
            )
            self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")
        finally:
            try:
                os.remove(temp_ca_path)
            except OSError:
                pass

    def test_negative_db_conn_max_age_fails(self):
        """Test that negative DB_CONN_MAX_AGE raises ImproperlyConfigured."""
        result = self.run_check({
            'USE_SQLITE_FALLBACK': 'False',
            'DB_PORT': '4000',
            'DB_HOST': '127.0.0.1',
            'DB_CONN_MAX_AGE': '-10',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_CONN_MAX_AGE must be a non-negative integer', result.stderr)

    def test_non_integer_db_conn_max_age_fails(self):
        """Test that non-integer DB_CONN_MAX_AGE raises ImproperlyConfigured."""
        result = self.run_check({
            'USE_SQLITE_FALLBACK': 'False',
            'DB_PORT': '4000',
            'DB_HOST': '127.0.0.1',
            'DB_CONN_MAX_AGE': 'invalid_integer',
        })
        self.assertNotEqual(result.returncode, 0)
        self.assertIn('DB_CONN_MAX_AGE must be a non-negative integer', result.stderr)

    def test_render_external_hostname_auto_added(self):
        """Test that RENDER_EXTERNAL_HOSTNAME is automatically detected and added to ALLOWED_HOSTS."""
        script = (
            "import os, django; "
            "os.environ['RENDER_EXTERNAL_HOSTNAME'] = 'jobtrack-api.onrender.com'; "
            "django.setup(); "
            "from django.conf import settings; "
            "assert 'jobtrack-api.onrender.com' in settings.ALLOWED_HOSTS"
        )
        env = os.environ.copy()
        env['USE_SQLITE_FALLBACK'] = 'True'
        env['DEBUG'] = 'True'
        env['RENDER_EXTERNAL_HOSTNAME'] = 'jobtrack-api.onrender.com'
        proc = subprocess.run(
            [sys.executable, '-c', script],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")

class TiDBDatabaseBackendTests(TestCase):
    """
    Automated verification of the custom TiDB database backend:
    - Inheritance from Django's standard MySQL DatabaseWrapper.
    - TiDB server-version restriction bypass for TiDB instances only.
    - Standard MySQL backend remains unchanged (no global monkeypatching).
    - Conservative SQL feature detection for TiDB's MySQL 5.7 wire banner.
    - Automatic engine selection when DB_PORT=4000 or TiDB host is specified.
    """

    def setUp(self):
        self.backend_dir = Path(__file__).resolve().parent.parent
        self.default_settings = {
            'ENGINE': 'jobtrack_api.db.backends.tidb',
            'NAME': 'jobtrack',
            'USER': 'root',
            'PASSWORD': '',
            'HOST': '127.0.0.1',
            'PORT': '4000',
            'OPTIONS': {},
            'TIME_ZONE': 'UTC',
            'AUTOCOMMIT': True,
            'CONN_MAX_AGE': 0,
            'CONN_HEALTH_CHECKS': False,
            'ATOMIC_REQUESTS': False,
        }

    def test_tidb_backend_inherits_mysql_wrapper(self):
        """Test that custom TiDB backend inherits from Django's MySQL DatabaseWrapper."""
        from jobtrack_api.db.backends.tidb.base import DatabaseWrapper as TiDBWrapper
        from django.db.backends.mysql.base import DatabaseWrapper as MySQLWrapper

        self.assertTrue(issubclass(TiDBWrapper, MySQLWrapper))
        # Vendor remains 'mysql' so Django ORM compilers (as_mysql) handle all expressions
        self.assertEqual(TiDBWrapper.vendor, 'mysql')
        self.assertEqual(TiDBWrapper.display_name, 'TiDB')

    def test_tidb_backend_bypasses_version_check_for_tidb_instance(self):
        """Test that TiDB backend bypasses the minimum version check when server is TiDB."""
        from jobtrack_api.db.backends.tidb.base import DatabaseWrapper as TiDBWrapper

        wrapper = TiDBWrapper(self.default_settings)
        wrapper.mysql_server_data = {'version': '5.7.25-TiDB-v8.5.0'}
        # Must not raise NotSupportedError
        wrapper.check_database_version_supported()

    def test_tidb_backend_enforces_version_check_for_non_tidb_instance(self):
        """Test that TiDB backend still rejects non-TiDB MySQL servers under 8.0.11."""
        from jobtrack_api.db.backends.tidb.base import DatabaseWrapper as TiDBWrapper
        from django.db.utils import NotSupportedError

        wrapper = TiDBWrapper(self.default_settings)
        wrapper.mysql_server_data = {'version': '5.7.25-standard-mysql'}
        with self.assertRaises(NotSupportedError):
            wrapper.check_database_version_supported()

    def test_tidb_backend_allows_standard_mysql_version_8(self):
        """Test that TiDB backend allows standard MySQL 8.0+ servers without error."""
        from jobtrack_api.db.backends.tidb.base import DatabaseWrapper as TiDBWrapper

        wrapper = TiDBWrapper(self.default_settings)
        wrapper.mysql_server_data = {'version': '8.0.32'}
        # Standard MySQL 8.0+ must pass version check
        wrapper.check_database_version_supported()

    def test_standard_mysql_backend_remains_unchanged(self):
        """Test that standard MySQL backend has NOT been globally monkeypatched."""
        from django.db.backends.mysql.base import DatabaseWrapper as MySQLWrapper
        from django.db.utils import NotSupportedError

        standard_settings = dict(self.default_settings, ENGINE='django.db.backends.mysql', PORT='3306')
        wrapper = MySQLWrapper(standard_settings)
        wrapper.mysql_server_data = {'version': '5.7.25-TiDB-v8.5.0'}
        # Standard MySQL backend must still raise NotSupportedError because it is NOT monkeypatched
        with self.assertRaises(NotSupportedError):
            wrapper.check_database_version_supported()

    def test_mysql_feature_detection_remains_conservative(self):
        """Test that Django feature detection remains conservative with 5.7 TiDB banner."""
        from jobtrack_api.db.backends.tidb.base import DatabaseWrapper as TiDBWrapper

        wrapper = TiDBWrapper(self.default_settings)
        wrapper.mysql_server_data = {
            'version': '5.7.25-TiDB-v8.5.0',
            'default_storage_engine': 'InnoDB',
        }
        # Column check constraints and expression indexes require MySQL >= 8.0.16 / 8.0.13
        self.assertFalse(wrapper.features.supports_column_check_constraints)
        self.assertFalse(wrapper.features.supports_expression_indexes)

    def test_engine_auto_selection_for_tidb_port(self):
        """Test that settings auto-selects jobtrack_api.db.backends.tidb when DB_PORT=4000."""
        script = (
            "import os, django; "
            "django.setup(); "
            "from django.conf import settings; "
            "assert settings.DATABASES['default']['ENGINE'] == 'jobtrack_api.db.backends.tidb'"
        )
        env = os.environ.copy()
        env['USE_SQLITE_FALLBACK'] = 'False'
        env['DB_NAME'] = 'jobtrack'
        env['DB_USER'] = 'root'
        env['DB_PASSWORD'] = 'test'
        env['DB_HOST'] = 'gateway01.us-east-1.prod.aws.tidbcloud.com'
        env['DB_PORT'] = '4000'
        env['DB_ENGINE'] = ''
        proc = subprocess.run(
            [sys.executable, '-c', script],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")
    def test_engine_selection_standard_mysql(self):
        """Test that settings uses django.db.backends.mysql for standard MySQL port 3306."""
        script = (
            "import os, django; "
            "django.setup(); "
            "from django.conf import settings; "
            "assert settings.DATABASES['default']['ENGINE'] == 'django.db.backends.mysql'"
        )
        env = os.environ.copy()
        env['USE_SQLITE_FALLBACK'] = 'False'
        env['DB_NAME'] = 'mysql_db'
        env['DB_USER'] = 'root'
        env['DB_PASSWORD'] = 'test'
        env['DB_HOST'] = '127.0.0.1'
        env['DB_PORT'] = '3306'
        proc = subprocess.run(
            [sys.executable, '-c', script],
            cwd=str(self.backend_dir),
            env=env,
            capture_output=True,
            text=True
        )
        self.assertEqual(proc.returncode, 0, f"Script failed with stderr: {proc.stderr}")

