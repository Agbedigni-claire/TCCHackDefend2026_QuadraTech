from django.core.management.base import BaseCommand
from users.models import Utilisateur


class Command(BaseCommand):
    help = 'Supprime tous les comptes administrateurs de la base de données'

    def add_arguments(self, parser):
        parser.add_argument('--confirm', action='store_true', help='Confirmer la suppression')

    def handle(self, *args, **options):
        count = Utilisateur.objects.filter(role='admin').count()
        if not options['confirm']:
            self.stdout.write(self.style.WARNING(
                f'{count} compte(s) admin trouvé(s). Ajoutez --confirm pour confirmer la suppression.'
            ))
            return
        Utilisateur.objects.filter(role='admin').delete()
        self.stdout.write(self.style.SUCCESS(f'{count} compte(s) admin supprimé(s) avec succès.'))
