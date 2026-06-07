from django.conf import settings
from rest_framework_simplejwt.authentication import JWTAuthentication


class CookieJWTAuthentication(JWTAuthentication):
    """
    Vérifie d'abord le header Authorization: Bearer (mobile / API),
    puis l'httpOnly cookie 'trustland_access' (navigateur web).
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is not None:
            raw_token = self.get_raw_token(header)
        else:
            cookie_val = request.COOKIES.get(settings.JWT_COOKIE_NAME, '')
            raw_token = cookie_val.encode() if cookie_val else None

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token
