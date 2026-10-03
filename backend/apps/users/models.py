from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN = "ADMIN", "Administrateur"
        COORDINATION = "COORDINATION", "Coordination"
        MEMBER = "MEMBER", "Membre (2027)"

    email = models.EmailField("email", unique=True)
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)

    STAFF_ROLES = (Role.ADMIN, Role.COORDINATION)

    def save(self, *args, **kwargs):
        if self.is_superuser:
            self.role = self.Role.ADMIN
        self.is_staff = self.is_superuser or self.role in self.STAFF_ROLES
        super().save(*args, **kwargs)
        if self.role == self.Role.COORDINATION:
            from django.contrib.auth.models import Group
            group = Group.objects.filter(name="Coordination").first()
            if group:
                self.groups.add(group)
