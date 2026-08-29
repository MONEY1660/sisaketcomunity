from django.contrib.auth.backends import ModelBackend
from django.contrib.auth.models import User
from django.db.models import Q

class EmailOrUsernameModelBackend(ModelBackend):
    """
    Authentication backend that allows users to authenticate using either
    their username or their email address.
    """
    def authenticate(self, request, username=None, password=None, **kwargs):
        if username is None:
            username = kwargs.get('email')
        
        if not username or not password:
            return None

        username = username.strip()
        try:
            # Case-insensitive lookup for username or email
            user = User.objects.filter(
                Q(username__iexact=username) | Q(email__iexact=username)
            ).first()

            if user and user.check_password(password) and self.user_can_authenticate(user):
                return user
        except Exception:
            return None

        return None
