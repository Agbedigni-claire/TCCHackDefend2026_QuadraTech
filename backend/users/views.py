import logging

from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenObtainPairView

from api.permissions import IsAdmin
from .models import Utilisateur
from .serializers import (
    AdminCreateSerializer,
    AdminUtilisateurSerializer,
    ChangePasswordSerializer,
    RegisterSerializer,
    TokenPairSerializer,
    UtilisateurSerializer,
)

security_logger = logging.getLogger('trustland.security')


class LoginRateThrottle(AnonRateThrottle):
    scope = 'login'


class LoginView(TokenObtainPairView):
    serializer_class = TokenPairSerializer
    throttle_classes = [LoginRateThrottle]

    def post(self, request, *args, **kwargs):
        xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
        ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')
        username = request.data.get('username', '')
        try:
            response = super().post(request, *args, **kwargs)
            security_logger.info('LOGIN_OK | user=%s | IP=%s', username, ip)
            return response
        except (InvalidToken, TokenError) as exc:
            security_logger.warning('LOGIN_FAIL | user=%s | IP=%s | reason=%s', username, ip, str(exc))
            raise


class RegisterView(generics.CreateAPIView):
    queryset = Utilisateur.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [LoginRateThrottle]


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/users/me/ — profil de l'utilisateur connecté."""
    serializer_class = UtilisateurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class ChangePasswordView(APIView):
    """POST /api/users/changer-mot-de-passe/"""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = request.user
        if not user.check_password(serializer.validated_data['old_password']):
            return Response(
                {'old_password': 'Mot de passe actuel incorrect.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        user.set_password(serializer.validated_data['new_password'])
        user.save()
        return Response({'detail': 'Mot de passe modifié avec succès.'})


class UtilisateurListView(generics.ListCreateAPIView):
    """GET /api/utilisateurs/ — liste tous les comptes (admin seulement).
    POST /api/utilisateurs/ — crée un compte avec n'importe quel rôle (admin seulement)."""
    queryset = Utilisateur.objects.all().order_by('date_joined')
    permission_classes = [IsAdmin]
    pagination_class = None

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AdminCreateSerializer
        return AdminUtilisateurSerializer


class UtilisateurDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/utilisateurs/<id>/ — détail, modification et suppression (admin)."""
    queryset = Utilisateur.objects.all()
    serializer_class = AdminUtilisateurSerializer
    permission_classes = [IsAdmin]

    def update(self, request, *args, **kwargs):
        if self.get_object() == request.user and 'role' in request.data:
            return Response(
                {'detail': 'Vous ne pouvez pas modifier votre propre rôle.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if self.get_object() == request.user:
            return Response(
                {'detail': 'Vous ne pouvez pas supprimer votre propre compte.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().destroy(request, *args, **kwargs)
