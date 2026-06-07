"""
Script standalone : vide django_migrations pour permettre --fake-initial.
Utiliser dans le shell Django : manage.py shell < fix_migrations.py
OU directement : python fix_migrations.py
"""
import os, sys, django

sys.path.insert(0, os.path.dirname(__file__))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SELECT COUNT(*) FROM django_migrations")
    avant = cursor.fetchone()[0]
    cursor.execute("DELETE FROM django_migrations")
    cursor.execute("SELECT COUNT(*) FROM django_migrations")
    apres = cursor.fetchone()[0]

print(f"django_migrations: {avant} rows deleted, {apres} remaining.")
print("Ready: run  migrate --fake-initial")
