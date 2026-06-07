import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('api', '0001_initial'),
    ]

    operations = [
        # 1. QR Code sur Terrain
        migrations.AddField(
            model_name='terrain',
            name='qr_code',
            field=models.ImageField(blank=True, null=True, upload_to='qrcodes/'),
        ),

        # 2. Modèle Document
        migrations.CreateModel(
            name='Document',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fichier', models.FileField(upload_to='documents/')),
                ('type_document', models.CharField(
                    choices=[
                        ('titre_foncier', 'Titre foncier'),
                        ('contrat', 'Contrat'),
                        ('autre', 'Autre'),
                    ],
                    default='autre',
                    max_length=20,
                )),
                ('date_upload', models.DateTimeField(auto_now_add=True)),
                ('terrain', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='documents',
                    to='api.terrain',
                )),
            ],
            options={
                'verbose_name': 'Document',
                'verbose_name_plural': 'Documents',
            },
        ),

        # 3. Modèle Bloc (blockchain)
        migrations.CreateModel(
            name='Bloc',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('index', models.PositiveIntegerField(unique=True)),
                ('timestamp', models.DateTimeField()),
                ('data', models.JSONField()),
                ('hash', models.CharField(max_length=64, unique=True)),
                ('previous_hash', models.CharField(max_length=64)),
            ],
            options={
                'verbose_name': 'Bloc',
                'verbose_name_plural': 'Blocs',
                'ordering': ['index'],
            },
        ),
    ]
