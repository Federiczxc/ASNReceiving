from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.db.models import Max
from django.contrib.auth.hashers import make_password, check_password


class User(AbstractBaseUser):
    user_id = models.BigIntegerField(primary_key=True)
    user_code = models.CharField(max_length=30, unique=True)
    password = models.CharField(max_length=255)
    first_name = models.CharField(max_length=100) 
    middle_name = models.CharField(max_length=100) 
    last_name = models.CharField(max_length=100) 
    user_name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    is_super = models.BooleanField(default=True)
    USERNAME_FIELD = 'user_code'
    last_login = None  
    def get_username(self):  
        return self.user_code

    class Meta:
        managed = False
        db_table = 'sys_user'
    

 

class TripTicketModel(models.Model):
    trip_ticket_id = models.BigIntegerField(primary_key=True)
    vehicle_id =models.BigIntegerField()
    plate_no = models.CharField(max_length=20)
    entity_id = models.BigIntegerField()
    asst_entity_id = models.BigIntegerField()
    trip_ticket_date = models.DateTimeField()
    trip_ticket_delivery_type_id = models.BigIntegerField()
    dispatched_by = models.BigIntegerField()
    remarks = models.TextField()

    class Meta:
        db_table = 'scm_tr_trip_ticket'
        managed = False

class TripDriverModel(models.Model):
    entity_id = models.BigIntegerField(primary_key=True)
    entity_name = models.CharField(max_length=255)
    
    
    class Meta:
        db_table = 'fin_mf_entity'
        managed = False

    
class TripDetailsModel(models.Model):
    trip_ticket_id = models.BigIntegerField(primary_key=True)
    branch_id = models.BigIntegerField()
    full_address = models.TextField()
    trans_name = models.CharField(max_length=255)
    remarks = models.TextField()
    branch_charges = models.DecimalField(max_digits=18, decimal_places=2)
    document_amount = models.DecimalField(max_digits=18, decimal_places=2)
    
    
    class Meta:
        db_table = 'scm_tr_trip_ticket_detail'
        managed = False

class TripBranchModel(models.Model):
    branch_id = models.BigIntegerField(primary_key=True)
    branch_name = models.CharField(max_length=255)
    
    class Meta:
        db_table = 'fin_mf_branch'
        managed = False