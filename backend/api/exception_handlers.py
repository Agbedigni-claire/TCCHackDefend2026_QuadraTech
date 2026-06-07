import logging

from rest_framework.response import Response
from rest_framework.views import exception_handler

security_logger = logging.getLogger('trustland.security')


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions DRF étendu :
    - Ratelimited → 429 avec message clair
    - Autres exceptions → comportement DRF par défaut
    """
    try:
        from django_ratelimit.exceptions import Ratelimited
        if isinstance(exc, Ratelimited):
            request = context.get('request')
            ip = ''
            if request:
                xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
                ip = xff.split(',')[0].strip() if xff else request.META.get('REMOTE_ADDR', '')
                security_logger.warning(
                    'RATE_LIMIT | %s %s | IP=%s',
                    request.method, request.path, ip,
                )
            return Response(
                {'detail': 'Trop de requêtes. Veuillez patienter avant de réessayer.'},
                status=429,
            )
    except ImportError:
        pass

    return exception_handler(exc, context)
