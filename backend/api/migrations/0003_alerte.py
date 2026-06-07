import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0002_terrain_qr_code_document_bloc'),
    ]

    operations = [
        migrations.CreateModel(
            name='Alerte',
            fields=[
                ('id', models.BigAutoField(
                    auto_created=True, primary_key=True,
                    serialize=False, verbose_name='ID',
                )),
                ('type_alerte', models.CharField(
                    choices=[
                        ('transaction_repetee', 'Transaction répétée'),
                        ('vendeur_suspect',     'Vendeur suspect'),
                        ('double_transaction',  'Double transaction'),
                    ],
                    max_length=30,
                )),
                ('description', models.TextField()),
                ('date', models.DateTimeField(auto_now_add=True)),
                ('niveau', models.CharField(
                    choices=[
                        ('faible',   'Faible'),
                        ('moyen',    'Moyen'),
                        ('critique', 'Critique'),
                    ],
                    default='moyen',
                    max_length=10,
                )),
                ('terrain', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='alertes',
                    to='api.terrain',
                )),
            ],
            options={
                'verbose_name': 'Alerte',
                'verbose_name_plural': 'Alertes',
                'ordering': ['-date'],
            },
        ),
    ]
