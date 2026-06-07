from django.urls import path

from .views import (
    ChangePasswordView,
    MeView,
    RegisterView,
    UtilisateurDetailView,
    UtilisateurListView,
)

urlpatterns = [
    path('register/',               RegisterView.as_view(),        name='register'),
    path('me/',                     MeView.as_view(),              name='me'),
    path('changer-mot-de-passe/',   ChangePasswordView.as_view(),  name='change-password'),
    path('utilisateurs/',           UtilisateurListView.as_view(), name='utilisateurs-list'),
    path('utilisateurs/<int:pk>/',  UtilisateurDetailView.as_view(), name='utilisateurs-detail'),
]
