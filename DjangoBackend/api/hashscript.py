from api.models import User
from django.contrib.auth.hashers import make_password

# Update all users who have "123qwe" as their password
User.objects.filter(password='123qwe').update(password=make_password('123qwe'))
