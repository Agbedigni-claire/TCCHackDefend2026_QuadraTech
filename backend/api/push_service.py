"""
Service d'envoi de notifications push via l'API Expo.
https://docs.expo.dev/push-notifications/sending-notifications/
"""
import json
import logging
import urllib.request
import urllib.error

logger = logging.getLogger('trustland.security')

EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'


def send_push(tokens, title, body, data=None):
    """
    Envoie des notifications push Expo à une liste de tokens.

    Args:
        tokens  — liste de chaînes ExponentPushToken[…]
        title   — titre de la notification
        body    — corps du message
        data    — dict optionnel (ex: {'terrainId': 42})
    """
    if not tokens:
        return

    messages = [
        {
            'to':    token,
            'title': title,
            'body':  body,
            'data':  data or {},
            'sound': 'default',
            'priority': 'high',
        }
        for token in tokens
        if token.startswith('ExponentPushToken[')
    ]
    if not messages:
        return

    payload = json.dumps(messages).encode('utf-8')
    req = urllib.request.Request(
        EXPO_PUSH_URL,
        data=payload,
        headers={
            'Accept':           'application/json',
            'Accept-Encoding':  'gzip, deflate',
            'Content-Type':     'application/json',
        },
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            if resp.status >= 400:
                logger.error('Expo push error HTTP %s', resp.status)
    except urllib.error.URLError as exc:
        logger.error('Expo push request failed: %s', exc)


def notify_admins_agents(title, body, data=None):
    """Envoie une notification à tous les admin/agents qui ont un push token."""
    from .models import PushToken
    from users.models import Utilisateur

    staff_ids = Utilisateur.objects.filter(role__in=['admin', 'agent']).values_list('id', flat=True)
    tokens = list(
        PushToken.objects.filter(utilisateur_id__in=staff_ids).values_list('token', flat=True)
    )
    send_push(tokens, title, body, data)
