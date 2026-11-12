"""
Dedicated TiDB database backend for JobTrack API.

Inherits directly from Django's standard MySQL DatabaseWrapper (django.db.backends.mysql.base.DatabaseWrapper).
Overrides ONLY the minimum-version restriction check for TiDB instances, accommodating TiDB Cloud Starter's
MySQL 5.7 wire-protocol banner (e.g. '5.7.25-TiDB-v...') while maintaining referential integrity, TLS encryption,
and conservative SQL dialect feature detection.
"""

from django.db.backends.mysql.base import DatabaseWrapper as MySQLDatabaseWrapper


class DatabaseWrapper(MySQLDatabaseWrapper):
    # Preserves vendor = 'mysql' (inherited from MySQLDatabaseWrapper) so all Django
    # ORM expressions (as_mysql), SQL compilers, and lookups execute the MySQL dialect cleanly.
    display_name = 'TiDB'

    def check_database_version_supported(self):
        """
        TiDB Cloud Starter reports its version string with a MySQL 5.7 compatibility banner
        (e.g., '5.7.25-TiDB-v8.x.x'), even though it is a modern distributed SQL engine that
        fully supports ACID transactions, foreign keys, and indexes.

        Django's standard MySQL backend requires MySQL >= 8.0.11 and would otherwise reject
        TiDB connections with NotSupportedError.

        This override safely bypasses the version barrier ONLY when connected to a genuine TiDB
        instance, while retaining full standard version checking for non-TiDB MySQL servers.
        """
        server_info = getattr(self, 'mysql_server_info', '') or ''
        if 'tidb' in server_info.lower():
            # Genuine TiDB instance detected: allow connection and migrations
            return

        # For any non-TiDB MySQL instance, enforce Django's standard version requirements
        super().check_database_version_supported()
