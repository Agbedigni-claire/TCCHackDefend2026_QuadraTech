import datetime
import hashlib
import logging
import os
from io import BytesIO

from django.conf import settings
from django.db.models import Count
from django.http import HttpResponse
from django.utils import timezone
from rest_framework import filters, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from .blockchain import ajouter_bloc, verifier_chaine
from .fraude import analyser_transaction
from .models import Alerte, Bloc, Document, Litige, Proprietaire, PushToken, Terrain, Transaction
from .permissions import (
    AnyAuthenticatedCanReadOrCreate,
    IsAdmin,
    IsAdminOrAgent,
    IsAdminOrAgentOrPublicRead,
    IsAdminOrAgentOrReadOnly,
    IsAdminOrReadOnly,
)
from .serializers import (
    AlerteSerializer,
    BlocSerializer,
    DocumentSerializer,
    LitigeSerializer,
    ProprietaireSerializer,
    TerrainSerializer,
    TransactionSerializer,
)

security_logger = logging.getLogger('trustland.security')


class TransactionThrottle(UserRateThrottle):
    scope = 'transaction'


def _get_proprietaire_du_user(user):
    """Retourne le Proprietaire lié à cet utilisateur via l'email, ou None."""
    if user.role != 'proprietaire':
        return None
    return Proprietaire.objects.filter(email=user.email).first()


class ProprietaireViewSet(viewsets.ModelViewSet):
    queryset = Proprietaire.objects.all().order_by('-date_enregistrement')
    serializer_class = ProprietaireSerializer
    permission_classes = [IsAdminOrAgent]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nom', 'prenom', 'email']  # telephone/numero_identite exclus (champs chiffrés)


class TerrainViewSet(viewsets.ModelViewSet):
    queryset = Terrain.objects.select_related('proprietaire_actuel').order_by('-date_enregistrement')
    serializer_class = TerrainSerializer
    permission_classes = [IsAdminOrAgentOrPublicRead]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['adresse', 'statut']
    ordering_fields = ['superficie', 'date_enregistrement']

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtrage par propriétaire (query param)
        prop_id = self.request.query_params.get('proprietaire')
        if prop_id:
            try:
                int(prop_id)
            except (ValueError, TypeError):
                return qs.none()
            qs = qs.filter(proprietaire_actuel_id=prop_id)
        # Filtrage par rôle propriétaire : uniquement ses propres terrains
        if self.request.user.is_authenticated and self.request.user.role == 'proprietaire':
            prop = _get_proprietaire_du_user(self.request.user)
            qs = qs.filter(proprietaire_actuel=prop) if prop else qs.none()
        return qs

    @action(detail=True, methods=['get'], url_path='certificat', permission_classes=[IsAuthenticated])
    def certificat(self, request, pk=None):
        terrain = self.get_object()
        return _generer_certificat_pdf(terrain)

    @action(detail=True, methods=['get'], url_path='litiges', permission_classes=[IsAuthenticated])
    def litiges(self, request, pk=None):
        terrain = self.get_object()
        qs = terrain.litiges.select_related('declarant').order_by('-date_declaration')
        return Response(LitigeSerializer(qs, many=True).data)

    @action(detail=True, methods=['get'], url_path='historique', permission_classes=[IsAuthenticated])
    def historique(self, request, pk=None):
        terrain = self.get_object()
        events = []

        # Transactions
        for tx in terrain.transactions.select_related('vendeur', 'acheteur'):
            bloc = Bloc.objects.filter(data__transaction_id=tx.pk).first()
            events.append({
                'type': 'transaction',
                'date': tx.date_transaction.isoformat(),
                'id': tx.pk,
                'vendeur': str(tx.vendeur),
                'acheteur': str(tx.acheteur),
                'montant': str(tx.montant),
                'signature': tx.signature_numerique[:16] + '…',
                'bloc_hash': bloc.hash[:16] + '…' if bloc else None,
                'bloc_index': bloc.index if bloc else None,
            })

        # Litiges (ouverture + résolution comme 2 événements distincts)
        for l in terrain.litiges.select_related('declarant'):
            events.append({
                'type': 'litige',
                'date': l.date_declaration.isoformat(),
                'id': l.pk,
                'description': l.description,
                'statut': l.statut,
                'declarant': str(l.declarant),
            })
            if l.date_resolution:
                events.append({
                    'type': 'litige_resolu',
                    'date': l.date_resolution.isoformat(),
                    'id': l.pk,
                    'resolution': l.resolution,
                })

        # Alertes IA
        for a in terrain.alertes.all():
            events.append({
                'type': 'alerte',
                'date': a.date.isoformat(),
                'id': a.pk,
                'type_alerte': a.type_alerte,
                'description': a.description,
                'niveau': a.niveau,
            })

        # Documents
        for d in terrain.documents.all():
            events.append({
                'type': 'document',
                'date': d.date_upload.isoformat(),
                'id': d.pk,
                'type_document': d.get_type_document_display(),
                'nom_fichier': d.fichier.name.rsplit('/', 1)[-1] if d.fichier else '—',
            })

        events.sort(key=lambda e: e['date'])
        return Response(events)


class DocumentViewSet(viewsets.ModelViewSet):
    serializer_class = DocumentSerializer
    permission_classes = [IsAdminOrAgentOrReadOnly]

    def get_queryset(self):
        qs = Document.objects.select_related('terrain').order_by('-date_upload')
        terrain_id = self.request.query_params.get('terrain')
        if terrain_id:
            try:
                int(terrain_id)
            except (ValueError, TypeError):
                return qs.none()
            qs = qs.filter(terrain_id=terrain_id)
        return qs

    def perform_destroy(self, instance):
        if self.request.user.role != 'admin':
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied("Seul un administrateur peut supprimer un document.")
        instance.fichier.delete(save=False)
        instance.delete()

    @action(
        detail=False, methods=['post'], url_path='verifier',
        permission_classes=[IsAuthenticated],
        parser_classes=[MultiPartParser, FormParser],
    )
    def verifier(self, request):
        fichier = request.FILES.get('fichier')
        if not fichier:
            return Response({'error': 'Aucun fichier fourni.'}, status=400)

        h = hashlib.sha256()
        for chunk in fichier.chunks():
            h.update(chunk)
        hash_val = h.hexdigest()

        doc = Document.objects.select_related(
            'terrain__proprietaire_actuel'
        ).filter(hash_fichier=hash_val).first()

        if doc:
            return Response({
                'authentique': True,
                'document_id': doc.id,
                'type_document': doc.get_type_document_display(),
                'terrain': TerrainSerializer(doc.terrain).data,
            })
        return Response({'authentique': False})


class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer
    permission_classes = [IsAdminOrAgentOrReadOnly]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['date_transaction', 'montant']
    throttle_classes = [TransactionThrottle]

    def get_queryset(self):
        qs = Transaction.objects.select_related(
            'terrain', 'vendeur', 'acheteur'
        ).order_by('-date_transaction')
        if self.request.user.is_authenticated and self.request.user.role == 'proprietaire':
            prop = _get_proprietaire_du_user(self.request.user)
            if prop:
                qs = qs.filter(vendeur=prop) | qs.filter(acheteur=prop)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        transaction = serializer.save()

        terrain = transaction.terrain
        terrain.statut = Terrain.Statut.EN_TRANSACTION
        terrain.save(update_fields=['statut'])

        ajouter_bloc({
            'type': 'transaction',
            'transaction_id': transaction.pk,
            'terrain_id': str(transaction.terrain.id_unique),
            'terrain_adresse': transaction.terrain.adresse,
            'vendeur': str(transaction.vendeur),
            'acheteur': str(transaction.acheteur),
            'montant': str(transaction.montant),
            'signature': transaction.signature_numerique,
        })

        analyser_transaction(transaction)


class LitigeViewSet(viewsets.ModelViewSet):
    serializer_class = LitigeSerializer
    permission_classes = [AnyAuthenticatedCanReadOrCreate]
    filter_backends = [filters.SearchFilter]
    search_fields = ['statut', 'description']

    def get_queryset(self):
        qs = Litige.objects.select_related('terrain', 'declarant').order_by('-date_declaration')
        if self.request.user.is_authenticated and self.request.user.role == 'proprietaire':
            prop = _get_proprietaire_du_user(self.request.user)
            if prop:
                qs = qs.filter(terrain__proprietaire_actuel=prop)
            else:
                qs = qs.none()
        return qs

    def perform_create(self, serializer):
        litige = serializer.save()
        terrain = litige.terrain
        terrain.statut = Terrain.Statut.LITIGE
        terrain.save(update_fields=['statut'])

    def perform_update(self, serializer):
        litige = serializer.save()
        if litige.statut == Litige.Statut.RESOLU:
            self._liberer_terrain_si_possible(litige.terrain)

    @action(detail=True, methods=['patch'], url_path='resoudre', permission_classes=[IsAdmin])
    def resoudre(self, request, pk=None):
        litige = self.get_object()
        if litige.statut == Litige.Statut.RESOLU:
            return Response({'detail': 'Ce litige est déjà résolu.'}, status=400)

        resolution = request.data.get('resolution', '').strip()
        if not resolution:
            return Response({'resolution': ['Ce champ est obligatoire.']}, status=400)

        litige.statut = Litige.Statut.RESOLU
        litige.resolution = resolution
        litige.date_resolution = timezone.now()
        litige.save()

        self._liberer_terrain_si_possible(litige.terrain)

        return Response(LitigeSerializer(litige).data)

    @staticmethod
    def _liberer_terrain_si_possible(terrain):
        if not terrain.litiges.filter(statut=Litige.Statut.OUVERT).exists():
            terrain.statut = Terrain.Statut.LIBRE
            terrain.save(update_fields=['statut'])


class AlerteViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Alerte.objects.select_related('terrain').order_by('-date')
    serializer_class = AlerteSerializer
    permission_classes = [IsAdminOrAgent]
    filter_backends = [filters.SearchFilter]
    search_fields = ['type_alerte', 'niveau', 'terrain__adresse']


class PushTokenView(APIView):
    """POST /api/push-token/ — enregistre ou met à jour le push token d'un appareil."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        token = request.data.get('token', '').strip()
        if not token:
            return Response({'error': 'Token requis.'}, status=400)
        if not token.startswith('ExponentPushToken['):
            return Response({'error': 'Format de token invalide.'}, status=400)
        PushToken.objects.update_or_create(
            token=token,
            defaults={'utilisateur': request.user},
        )
        return Response({'status': 'ok'})

    def delete(self, request):
        token = request.data.get('token', '').strip()
        PushToken.objects.filter(token=token, utilisateur=request.user).delete()
        return Response(status=204)


class BlockchainView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        blocs = Bloc.objects.order_by('index')
        return Response(BlocSerializer(blocs, many=True).data)


class BlockchainVerifierView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        return Response({'valide': verifier_chaine()})


class StatsView(APIView):
    """GET /api/stats/ — statistiques globales du registre foncier."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        alertes_par_niveau = list(
            Alerte.objects.values('niveau').annotate(count=Count('id'))
        )
        return Response({
            'terrains_total': Terrain.objects.count(),
            'terrains_par_statut': {
                'libre':          Terrain.objects.filter(statut='libre').count(),
                'en_transaction': Terrain.objects.filter(statut='en_transaction').count(),
                'litige':         Terrain.objects.filter(statut='litige').count(),
            },
            'transactions_total': Transaction.objects.count(),
            'litiges_ouverts':    Litige.objects.filter(statut='ouvert').count(),
            'alertes_actives':    Alerte.objects.count(),
            'alertes_critiques':  Alerte.objects.filter(niveau='critique').count(),
            'alertes_par_niveau': alertes_par_niveau,
        })


# ─── PDF Certificate ──────────────────────────────────────────────────────────

def _generer_certificat_pdf(terrain):
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import cm
    from reportlab.lib.utils import ImageReader
    from reportlab.pdfgen import canvas

    transactions = Transaction.objects.filter(terrain=terrain).select_related(
        'vendeur', 'acheteur'
    ).order_by('date_transaction')

    tx_ids = list(transactions.values_list('id', flat=True))
    dernier_bloc = None
    if tx_ids:
        for bloc in Bloc.objects.order_by('-index'):
            if bloc.data and bloc.data.get('transaction_id') in tx_ids:
                dernier_bloc = bloc
                break
    if not dernier_bloc:
        dernier_bloc = Bloc.objects.order_by('-index').first()

    buf = BytesIO()
    w, h = A4
    c = canvas.Canvas(buf, pagesize=A4)
    date_str = datetime.date.today().strftime('%d/%m/%Y')

    def trunc(s, n=55):
        s = str(s) if s else ''
        return s if len(s) <= n else s[:n - 3] + '...'

    # En-tête — dégradé simulé : rectangle bleu logo + bande émeraude logo en bas
    c.setFillColor(colors.HexColor('#1e40af'))  # bleu logo (bouclier intérieur)
    c.rect(0, h - 3.0 * cm, w, 3.0 * cm, fill=1, stroke=0)
    c.setFillColor(colors.HexColor('#10b981'))  # vert émeraude logo (bordure bouclier)
    c.rect(0, h - 3.0 * cm, w, 0.22 * cm, fill=1, stroke=0)

    logo_path = os.path.join(settings.BASE_DIR, 'static', 'logo.jpg')
    if os.path.exists(logo_path):
        try:
            c.drawImage(
                ImageReader(logo_path),
                0.6 * cm, h - 2.85 * cm,
                width=2.6 * cm, height=2.6 * cm,
                preserveAspectRatio=True,
                mask='auto',
            )
            label_x = 3.5 * cm
        except Exception:
            label_x = 1.5 * cm
    else:
        label_x = 1.5 * cm

    c.setFillColor(colors.white)
    c.setFont('Helvetica-Bold', 16)
    c.drawString(label_x, h - 1.25 * cm, 'TrustLand')
    c.setFont('Helvetica', 9)
    c.drawString(label_x, h - 1.9 * cm, 'Certificat de Propriete Fonciere')
    c.setFont('Helvetica', 7)
    c.drawRightString(w - 1.5 * cm, h - 1.25 * cm, f'Genere le {date_str}')
    c.drawRightString(w - 1.5 * cm, h - 1.9 * cm, 'Republique du Togo')

    y = h - 3.5 * cm

    def section_title(title):
        nonlocal y
        c.setFillColor(colors.HexColor('#1e40af'))  # bleu logo
        c.setFont('Helvetica-Bold', 10)
        c.drawString(1.5 * cm, y, title)
        y -= 0.15 * cm
        c.setStrokeColor(colors.HexColor('#10b981'))  # filet émeraude logo
        c.setLineWidth(0.5)
        c.line(1.5 * cm, y, w - 1.5 * cm, y)
        y -= 0.5 * cm

    def field(label, value, label_w=5.5 * cm):
        nonlocal y
        c.setFillColor(colors.HexColor('#475569'))
        c.setFont('Helvetica-Bold', 8)
        c.drawString(1.8 * cm, y, label + ' :')
        c.setFillColor(colors.HexColor('#1e293b'))
        c.setFont('Helvetica', 8)
        c.drawString(1.8 * cm + label_w, y, trunc(value))
        y -= 0.55 * cm

    section_title('INFORMATIONS DU TERRAIN')
    field('Identifiant unique', str(terrain.id_unique))
    field('Adresse', terrain.adresse)
    field('Superficie', f"{float(terrain.superficie):,.0f} m2".replace(',', ' '))
    field('Coordonnees GPS', terrain.coordonnees_gps or 'Non renseignees')
    field('Statut juridique', terrain.get_statut_display())
    field("Date d'enregistrement", terrain.date_enregistrement.strftime('%d/%m/%Y'))

    if terrain.qr_code and terrain.qr_code.name:
        try:
            c.drawImage(
                ImageReader(terrain.qr_code.path),
                w - 5.2 * cm, h - 8.2 * cm,
                width=3.5 * cm, height=3.5 * cm,
                preserveAspectRatio=True,
            )
            c.setFillColor(colors.HexColor('#64748b'))
            c.setFont('Helvetica', 6)
            c.drawCentredString(w - 3.45 * cm, h - 8.5 * cm, 'QR Code du terrain')
        except Exception:
            pass

    y -= 0.3 * cm

    section_title('PROPRIETAIRE ACTUEL')
    prop = terrain.proprietaire_actuel
    field('Nom complet', f"{prop.prenom} {prop.nom}")
    field('Email', prop.email)
    field('Telephone', prop.telephone)
    field("Numero d'identite", prop.numero_identite)

    y -= 0.3 * cm

    section_title('HISTORIQUE DES TRANSACTIONS')
    if transactions.exists():
        c.setFillColor(colors.HexColor('#334155'))
        c.rect(1.5 * cm, y - 0.55 * cm, w - 3 * cm, 0.55 * cm, fill=1, stroke=0)
        c.setFillColor(colors.white)
        c.setFont('Helvetica-Bold', 7)
        cols = [1.7, 5.0, 10.0, 14.5]
        headers = ['Date', 'Vendeur', 'Acheteur', 'Montant (FCFA)']
        for x_cm, h_label in zip(cols, headers):
            c.drawString(x_cm * cm, y - 0.38 * cm, h_label)
        y -= 0.55 * cm
        for i, tx in enumerate(transactions):
            bg = colors.HexColor('#f8fafc') if i % 2 == 0 else colors.white
            c.setFillColor(bg)
            c.rect(1.5 * cm, y - 0.5 * cm, w - 3 * cm, 0.5 * cm, fill=1, stroke=0)
            c.setFillColor(colors.HexColor('#1e293b'))
            c.setFont('Helvetica', 7)
            row = [
                tx.date_transaction.strftime('%d/%m/%Y'),
                trunc(str(tx.vendeur), 22),
                trunc(str(tx.acheteur), 22),
                f"{float(tx.montant):,.0f}".replace(',', ' '),
            ]
            for x_cm, val in zip(cols, row):
                c.drawString(x_cm * cm, y - 0.35 * cm, val)
            y -= 0.5 * cm
    else:
        c.setFillColor(colors.HexColor('#64748b'))
        c.setFont('Helvetica', 8)
        c.drawString(1.8 * cm, y, 'Aucune transaction enregistree.')
        y -= 0.6 * cm

    y -= 0.4 * cm

    section_title('CERTIFICATION BLOCKCHAIN')
    if dernier_bloc:
        field('Bloc', f'#{dernier_bloc.index}')
        field('Hash SHA-256', dernier_bloc.hash, label_w=3.5 * cm)
        field('Horodatage', str(dernier_bloc.timestamp)[:19])
    else:
        c.setFillColor(colors.HexColor('#64748b'))
        c.setFont('Helvetica', 8)
        c.drawString(1.8 * cm, y, 'Aucun bloc blockchain associe.')
        y -= 0.6 * cm

    # Pied de page
    c.setFillColor(colors.HexColor('#ecfdf5'))  # fond émeraude très clair
    c.rect(0, 0, w, 1.8 * cm, fill=1, stroke=0)
    c.setStrokeColor(colors.HexColor('#10b981'))  # ligne émeraude logo
    c.setLineWidth(1.5)
    c.line(0, 1.8 * cm, w, 1.8 * cm)
    c.setFillColor(colors.HexColor('#475569'))
    c.setFont('Helvetica', 7)
    c.drawCentredString(
        w / 2, 1.1 * cm,
        'Ce certificat est genere automatiquement par le systeme TrustLand — Republique du Togo',
    )
    c.drawCentredString(w / 2, 0.55 * cm, f'Reference : {terrain.id_unique} — {date_str}')

    c.showPage()
    c.save()
    buf.seek(0)

    response = HttpResponse(buf.read(), content_type='application/pdf')
    response['Content-Disposition'] = (
        f'attachment; filename="certificat-{terrain.id_unique}.pdf"'
    )
    return response
