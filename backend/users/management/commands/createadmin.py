from django.core.management.base import BaseCommand
from users.models import Utilisateur


class Command(BaseCommand):
    help = 'Crée un compte administrateur TrustLand'

    def add_arguments(self, parser):
        parser.add_argument('--username', default='admin')
        parser.add_argument('--email', default='admin@trustland.tg')
        parser.add_argument('--password', required=True)

    def handle(self, *args, **options):
        username = options['username']
        if Utilisateur.objects.filter(username=username).exists():
            self.stdout.write(self.style.WARNING(f"L'utilisateur '{username}' existe déjà."))
            u = Utilisateur.objects.get(username=username)
            u.role = Utilisateur.Role.ADMIN
            u.is_superuser = True
            u.is_staff = True
            u.set_password(options['password'])
            u.save()
            self.stdout.write(self.style.SUCCESS(f"Rôle admin + mot de passe mis à jour pour '{username}'."))
            return

        u = Utilisateur.objects.create_superuser(
            username=username,
            email=options['email'],
            password=options['password'],
        )
        u.role = Utilisateur.Role.ADMIN
        u.save()
        self.stdout.write(self.style.SUCCESS(f"Admin '{username}' créé avec succès."))
