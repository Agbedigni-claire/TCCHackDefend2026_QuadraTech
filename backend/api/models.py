import hashlib
import json
import secrets
import uuid
from io import BytesIO

from django.conf import settings
from django.core.files import File
from django.db import models


# ── Champ chiffré (Fernet / symétrique) ──────────────────────────────────────

_FERNET_PREFIX = '$ENC$'


def _get_fernet():
    from cryptography.fernet import Fernet
    key = settings.FIELD_ENCRYPTION_KEY
    if not key:
        return None
    return Fernet(key.encode() if isinstance(key, str) else key)


class EncryptedField(models.TextField):
    """
    TextField qui chiffre la valeur avec Fernet avant l'écriture en base
    et la déchiffre à la lecture. Les valeurs déjà en clair (antérieures)
    sont renvoyées telles quelles (migration transparente).
    """

    def from_db_value(self, value, expression, connection):
        if not value or not value.startswith(_FERNET_PREFIX):
            return value  # Valeur en clair (legacy) ou NULL
        f = _get_fernet()
        if not f:
            return value
        try:
            return f.decrypt(value[len(_FERNET_PREFIX):].encode()).decode()
        except Exception:
            return value  # Retour sûr si clé changée

    def get_prep_value(self, value):
        if not value or value.startswith(_FERNET_PREFIX):
            return value  # Vide ou déjà chiffré
        f = _get_fernet()
        if not f:
            return value  # Pas de clé → stockage en clair (dev sans config)
        return _FERNET_PREFIX + f.encrypt(value.encode()).decode()

    def deconstruct(self):
        name, path, args, kwargs = super().deconstruct()
        return name, path, args, kwargs


# ── Modèles métier ────────────────────────────────────────────────────────────

class Proprietaire(models.Model):
    nom = models.CharField(max_length=100)
    prenom = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    # Champs sensibles chiffrés au repos
    telephone = EncryptedField()
    numero_identite = EncryptedField()
    date_enregistrement = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.prenom} {self.nom}"

    class Meta:
        verbose_name = "Propriétaire"
        verbose_name_plural = "Propriétaires"


class Terrain(models.Model):
    class Statut(models.TextChoices):
        LIBRE = 'libre', 'Libre'
        LITIGE = 'litige', 'En litige'
        EN_TRANSACTION = 'en_transaction', 'En transaction'

    id_unique = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    superficie = models.DecimalField(max_digits=12, decimal_places=2, help_text="Superficie en m²")
    coordonnees_gps = models.CharField(max_length=100, help_text="Format: latitude,longitude")
    adresse = models.TextField()
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.LIBRE)
    proprietaire_actuel = models.ForeignKey(
        Proprietaire, on_delete=models.PROTECT, related_name='terrains'
    )
    qr_code = models.ImageField(upload_to='qrcodes/', blank=True, null=True)
    date_enregistrement = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            self._generer_qr_code()

    def _generer_qr_code(self):
        import qrcode

        url = f"/api/terrains/{self.pk}/"
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(url)
        qr.make(fit=True)
        img = qr.make_image(fill_color='black', back_color='white')

        buf = BytesIO()
        img.save(buf, format='PNG')
        buf.seek(0)

        filename = f"terrain_{self.id_unique}.png"
        self.qr_code.save(filename, File(buf), save=False)
        Terrain.objects.filter(pk=self.pk).update(qr_code=self.qr_code.name)

    def __str__(self):
        return f"Terrain {self.id_unique} — {self.adresse}"

    class Meta:
        verbose_name = "Terrain"
        verbose_name_plural = "Terrains"


class Document(models.Model):
    class TypeDocument(models.TextChoices):
        TITRE_FONCIER = 'titre_foncier', 'Titre foncier'
        CONTRAT = 'contrat', 'Contrat'
        AUTRE = 'autre', 'Autre'

    terrain = models.ForeignKey(Terrain, on_delete=models.CASCADE, related_name='documents')
    fichier = models.FileField(upload_to='documents/')
    type_document = models.CharField(
        max_length=20, choices=TypeDocument.choices, default=TypeDocument.AUTRE
    )
    hash_fichier = models.CharField(max_length=64, blank=True, null=True, editable=False)
    date_upload = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_type_document_display()} — {self.terrain}"

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"


class Transaction(models.Model):
    terrain = models.ForeignKey(Terrain, on_delete=models.PROTECT, related_name='transactions')
    vendeur = models.ForeignKey(
        Proprietaire, on_delete=models.PROTECT, related_name='ventes'
    )
    acheteur = models.ForeignKey(
        Proprietaire, on_delete=models.PROTECT, related_name='achats'
    )
    date_transaction = models.DateTimeField(auto_now_add=True)
    signature_numerique = models.CharField(max_length=64, editable=False, unique=True)
    montant = models.DecimalField(max_digits=15, decimal_places=2)

    def save(self, *args, **kwargs):
        if not self.signature_numerique:
            self.signature_numerique = secrets.token_hex(32)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Transaction {self.pk} — {self.terrain}"

    class Meta:
        verbose_name = "Transaction"
        verbose_name_plural = "Transactions"


class Litige(models.Model):
    class Statut(models.TextChoices):
        OUVERT = 'ouvert', 'Ouvert'
        RESOLU = 'resolu', 'Résolu'

    terrain = models.ForeignKey(Terrain, on_delete=models.PROTECT, related_name='litiges')
    declarant = models.ForeignKey(
        Proprietaire, on_delete=models.PROTECT, related_name='litiges_declares'
    )
    description = models.TextField()
    date_declaration = models.DateTimeField(auto_now_add=True)
    statut = models.CharField(max_length=10, choices=Statut.choices, default=Statut.OUVERT)
    resolution = models.TextField(blank=True, default='')
    date_resolution = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Litige {self.pk} — {self.terrain} ({self.statut})"

    class Meta:
        verbose_name = "Litige"
        verbose_name_plural = "Litiges"


class Alerte(models.Model):
    class TypeAlerte(models.TextChoices):
        TRANSACTION_REPETEE = 'transaction_repetee', 'Transaction répétée'
        VENDEUR_SUSPECT     = 'vendeur_suspect',     'Vendeur suspect'
        DOUBLE_TRANSACTION  = 'double_transaction',  'Double transaction'

    class Niveau(models.TextChoices):
        FAIBLE   = 'faible',   'Faible'
        MOYEN    = 'moyen',    'Moyen'
        CRITIQUE = 'critique', 'Critique'

    terrain     = models.ForeignKey('Terrain', on_delete=models.CASCADE, related_name='alertes')
    type_alerte = models.CharField(max_length=30, choices=TypeAlerte.choices)
    description = models.TextField()
    date        = models.DateTimeField(auto_now_add=True)
    niveau      = models.CharField(max_length=10, choices=Niveau.choices, default=Niveau.MOYEN)

    class Meta:
        ordering = ['-date']
        verbose_name = 'Alerte'
        verbose_name_plural = 'Alertes'

    def __str__(self):
        return f"[{self.niveau.upper()}] {self.type_alerte} — {self.terrain.adresse}"


class Bloc(models.Model):
    index = models.PositiveIntegerField(unique=True)
    timestamp = models.DateTimeField()
    data = models.JSONField()
    hash = models.CharField(max_length=64, unique=True)
    previous_hash = models.CharField(max_length=64)

    def __str__(self):
        return f"Bloc #{self.index} — {self.hash[:12]}…"

    class Meta:
        ordering = ['index']
        verbose_name = "Bloc"
        verbose_name_plural = "Blocs"


# ── Push tokens (mobile) ─────────────────────────────────────────────────────

class PushToken(models.Model):
    """Stocke les tokens Expo Push des appareils mobiles par utilisateur."""
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='push_tokens',
    )
    token = models.CharField(max_length=250, unique=True)
    date_enregistrement = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Push Token'
        verbose_name_plural = 'Push Tokens'

    def __str__(self):
        return f"{self.utilisateur.username} — {self.token[:30]}…"


# ── Journal d'audit ───────────────────────────────────────────────────────────

class JournalAudit(models.Model):
    utilisateur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_audits',
    )
    methode = models.CharField(max_length=10)
    endpoint = models.CharField(max_length=500)
    ip = models.GenericIPAddressField(null=True, blank=True, unpack_ipv4=True)
    statut_http = models.PositiveSmallIntegerField(default=200)
    details = models.JSONField(default=dict, blank=True)
    date = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journal d'audit"

    def __str__(self):
        user = self.utilisateur.username if self.utilisateur else 'anonymous'
        return f"[{self.methode}] {self.endpoint} | {user} | {self.date:%Y-%m-%d %H:%M}"
