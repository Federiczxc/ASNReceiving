from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Max
from django.contrib.auth.hashers import make_password, check_password

class UserManager(BaseUserManager):
    def create_user(self,username,password, **extra_fields):
        if not username:
            raise ValueError("The username must  be set")
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self,username, password, **extra_fields):
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('is_staff', True)
        
        if extra_fields.get('is_superuser') is not True:
            raise ValueError('Superuser must be  true')
        if extra_fields.get('is_staff') is not True:
            raise ValueError('Superstaff mut be trueee')
        
        return self.create_user(username, password, **extra_fields)
class User(AbstractBaseUser):
    username = models.CharField(max_length=100, unique=True)
    password = models.CharField(max_length=255)
    emp_no = models.CharField(max_length=10, unique=True) 
    date_created = models.DateField(auto_now_add=True)
    updated_by = models.DateField(auto_now=True)
    updated_date = models.DateField(auto_now=True)
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=True)
    USERNAME_FIELD = 'username'
    objects = UserManager()

    def save(self, *args, **kwargs):
        if not self.emp_no:
            max_emp_no = User.objects.aggregate(Max('emp_no'))['emp_no__max']
            if max_emp_no:
                next_emp_no = int(max_emp_no) + 1
            else:
                next_emp_no = 1
            self.emp_no = f"{next_emp_no:05}" 
        super(User, self).save(*args, **kwargs)

class TripTicketModel(models.Model):
    trip_ticket_id = models.BigIntegerField(primary_key=True)
    vehicle_id =models.BigIntegerField()
    plate_no = models.CharField(max_length=20)
    entity_id = models.BigIntegerField()
    asst_entity_id = models.BigIntegerField()
    trip_ticket_date = models.DateTimeField()
    trip_ticket_delivery_type_id = models.BigIntegerField()
    remarks = models.TextField()

    class Meta:
        db_table = 'scm_tr_trip_ticket'
        managed = False

class TripDriverModel(models.Model):
    entity_id = models.BigIntegerField()
    entity_name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'fin_mf_entity'
        managed = False