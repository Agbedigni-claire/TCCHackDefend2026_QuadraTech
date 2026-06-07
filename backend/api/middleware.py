import logging

security_logger = logging.getLogger('trustland.security')

# Endpoints sensibles à journaliser systématiquement
_SENSITIVE_PATHS = (
    '/api/token/',
    '/api/users/',
    '/api/transactions/',
    '/api/litiges/',
    '/api/proprietaires/',
    '/api/terrains/',
    '/api/documents/',
    '/api/alertes/',
    '/api/utilisateurs/',
)

# Méthodes qui modifient l'état — toujours loguées
_WRITE_METHODS = {'POST', 'PUT', 'PATCH', 'DELETE'}


def _get_client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    if xff:
        return xff.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR', '')


class AuditLogMiddleware:
    """
    Journalise dans la table JournalAudit et dans security.log
    toutes les opérations d'écriture faites par des utilisateurs authentifiés.
    Ne loggue jamais les GET/HEAD pour éviter le bruit.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)

        method = request.method
        if method not in _WRITE_METHODS:
            return response

        user = getattr(request, 'user', None)
        if not user or not user.is_authenticated:
            # Tentative non authentifiée sur une méthode d'écriture — log security
            if any(request.path.startswith(p) for p in _SENSITIVE_PATHS):
                ip = _get_client_ip(request)
                security_logger.warning(
                    'Tentative non authentifiee | %s %s | IP=%s | HTTP=%s',
                    method, request.path, ip, response.status_code,
                )
            return response

        ip = _get_client_ip(request)
        username = user.username

        # Log dans le fichier de sécurité
        security_logger.info(
            '%s | %s %s | user=%s | IP=%s | HTTP=%s',
            'WRITE', method, request.path, username, ip, response.status_code,
        )

        # Log dans la base de données (asynchrone best-effort)
        try:
            from api.models import JournalAudit
            JournalAudit.objects.create(
                utilisateur=user,
                methode=method,
                endpoint=request.path[:500],
                ip=ip or None,
                statut_http=response.status_code,
            )
        except Exception as exc:
            security_logger.error('Echec JournalAudit: %s', exc)

        return response
