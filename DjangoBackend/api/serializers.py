from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from.models import *
class OCRSerializer(serializers.Serializer):
    image = serializers.ImageField()
    
class UserRegistrationSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = User
        fields = ['username', 'password']
        
 
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user
    
class LoginSerializer(serializers.Serializer):
    class Meta:
        model = User
        fields = ['username', 'password']
        
    username =  username = serializers.CharField(required=True, max_length=100)
    password = serializers.CharField(required=True, write_only=True)
    
    def validate(self, data):
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            raise serializers.ValidationError("Username and password are required.")
        try:    
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError("Invalid credentiaals.")
        if not user.check_password(password):
            raise serializers.ValidationError("Invalid creqedentials.")  # Incorrect password
        data['user'] = user
        return data

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = '__all__'
        

class TripTicketSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripTicketModel
        fields = '__all__'
        
class TripDriverSerializer(serializers.ModelSerializer):
    class Meta:
        model = TripDriverModel