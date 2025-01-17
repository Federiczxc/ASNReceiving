from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import *

from PIL import Image
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token

            access_token['username'] = user.username
            access_token['emp_no'] = user.emp_no

            return Response({
                'access': str(access_token),
                'refresh': str(refresh),
                'user': {
                    'username': user.username,
                }
            }, status=status.HTTP_200_OK)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class RegisterView(APIView):
    def post(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.save()
            return Response({
                "message": "User registed successfully",
                "user": {
                    "username": user.username,
                    "emp_no": user.emp_no,
                    "date_created": user.date_created,
                }
            }, status=status.HTTP_201_CREATED)
            
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        serializer = UserSerializer(user)

        return Response(serializer.data)
    
class TripListView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        trip_data = TripTicketModel.objects.using('trips').all()
        tripdriver_data = TripDriverModel.objects.using('trips').all()
        trip_serializer = TripTicketSerializer(trip_data, many=True)
        tripdriver_serializer = TripDriverSerializer(tripdriver_data, many=True)
        
        triplist = trip_serializer.data
        
        tripdriver = tripdriver_serializer.data
        entity_id_to_name = {driver['entity_id']: driver['entity_name'] for driver in tripdriver}
        for driver in tripdriver: 
            driver['entity_name'] = entity_id_to_name.get(driver['entity_id'], '') 
            driver['asst_entity_name'] = entity_id_to_name.get(driver['asst_entity_id'], '')
        response_data = {
            'triplist': trip_serializer.data,
            'tripdriver': tripdriver_serializer.data,
        }
        
        return Response(response_data)

class OCRView(APIView):
    def post(self, request):
        file = request.FILES.get('image')
        if not file:
            return Response ({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            image = Image.open(file)
            text = pytesseract.image_to_string(image)
            return Response({'text':text})
        except Exception as e:

            return Response({'error':str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)