from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    message = "Accès réservé aux administrateurs."

    def has_permission(self, request, view):
        return bool(
            request.user and request.user.is_authenticated
            and request.user.role == 'admin'
        )


class IsAdminOrReadOnly(BasePermission):
    """Admin : lecture + écriture. Tout utilisateur authentifié : lecture seule."""
    message = "Seuls les administrateurs peuvent modifier ces données."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role == 'admin'


class IsAdminOrAgent(BasePermission):
    """Admin et agent : tout. Propriétaire : refusé (même en lecture)."""
    message = "Action réservée aux agents et administrateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'agent')


class IsAdminOrAgentOrReadOnly(BasePermission):
    """Admin/agent : lecture + écriture. Tout utilisateur authentifié : lecture seule."""
    message = "Action réservée aux agents et administrateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.role in ('admin', 'agent')


class IsAdminOrAgentOrPublicRead(BasePermission):
    """Lecture publique (y compris anonyme). Écriture réservée aux admin/agent."""
    message = "Action réservée aux agents et administrateurs."

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True  # accès anonyme autorisé en lecture
        if not request.user or not request.user.is_authenticated:
            return False
        return request.user.role in ('admin', 'agent')


class AnyAuthenticatedCanReadOrCreate(BasePermission):
    """
    Lecture + création (POST) : tout utilisateur authentifié.
    Modification/suppression : admin et agent uniquement.
    Utilisé pour les litiges — les propriétaires peuvent en signaler.
    """
    message = "Action réservée aux agents et administrateurs."

    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in SAFE_METHODS or request.method == 'POST':
            return True
        return request.user.role in ('admin', 'agent')
