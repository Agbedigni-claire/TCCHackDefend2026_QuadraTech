from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import (
    AlerteViewSet,
    BlockchainVerifierView,
    BlockchainView,
    DocumentViewSet,
    LitigeViewSet,
    ProprietaireViewSet,
    StatsView,
    TerrainViewSet,
    TransactionViewSet,
)

router = DefaultRouter()
router.register(r'proprietaires', ProprietaireViewSet, basename='proprietaire')
router.register(r'terrains',      TerrainViewSet,      basename='terrain')
router.register(r'documents',     DocumentViewSet,     basename='document')
router.register(r'transactions',  TransactionViewSet,  basename='transaction')
router.register(r'litiges',       LitigeViewSet,       basename='litige')
router.register(r'alertes',       AlerteViewSet,       basename='alerte')

urlpatterns = [
    path('', include(router.urls)),
    path('stats/',               StatsView.as_view(),              name='stats'),
    path('blockchain/verifier/', BlockchainVerifierView.as_view(), name='blockchain-verifier'),
    path('blockchain/',          BlockchainView.as_view(),         name='blockchain'),
]
