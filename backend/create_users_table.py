import os, sys, django
sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()
from django.db import connection

with connection.cursor() as c:
    c.execute(
        "CREATE TABLE IF NOT EXISTS users_utilisateur ("
        "id BIGSERIAL PRIMARY KEY,"
        "password VARCHAR(128) NOT NULL,"
        "last_login TIMESTAMPTZ,"
        "is_superuser BOOLEAN NOT NULL DEFAULT false,"
        "username VARCHAR(150) NOT NULL UNIQUE,"
        "first_name VARCHAR(150) NOT NULL DEFAULT '',"
        "last_name VARCHAR(150) NOT NULL DEFAULT '',"
        "email VARCHAR(254) NOT NULL DEFAULT '',"
        "is_staff BOOLEAN NOT NULL DEFAULT false,"
        "is_active BOOLEAN NOT NULL DEFAULT true,"
        "date_joined TIMESTAMPTZ NOT NULL DEFAULT NOW(),"
        "role VARCHAR(20) NOT NULL DEFAULT 'agent'"
        ")"
    )
    print("Created users_utilisateur")

    c.execute(
        "CREATE TABLE IF NOT EXISTS users_utilisateur_groups ("
        "id BIGSERIAL PRIMARY KEY,"
        "utilisateur_id BIGINT NOT NULL REFERENCES users_utilisateur(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,"
        "group_id INTEGER NOT NULL REFERENCES auth_group(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,"
        "UNIQUE (utilisateur_id, group_id)"
        ")"
    )
    print("Created users_utilisateur_groups")

    c.execute(
        "CREATE TABLE IF NOT EXISTS users_utilisateur_user_permissions ("
        "id BIGSERIAL PRIMARY KEY,"
        "utilisateur_id BIGINT NOT NULL REFERENCES users_utilisateur(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,"
        "permission_id INTEGER NOT NULL REFERENCES auth_permission(id) ON DELETE CASCADE DEFERRABLE INITIALLY DEFERRED,"
        "UNIQUE (utilisateur_id, permission_id)"
        ")"
    )
    print("Created users_utilisateur_user_permissions")

    c.execute(
        "INSERT INTO django_migrations (app, name, applied) VALUES (%s, %s, NOW()) ON CONFLICT DO NOTHING",
        ['users', '0001_initial']
    )
    print("Inserted users.0001_initial into django_migrations")

print("Done.")
