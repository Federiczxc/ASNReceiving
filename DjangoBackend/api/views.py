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
        tripdriver_mapping = {driver['entity_id']: driver['entity_name'] for driver in tripdriver_serializer.data}

        triplist = []
        for trip in trip_serializer.data:
            trip['entity_name'] = tripdriver_mapping.get(trip['entity_id'], '')
            trip['asst_entity_name'] = tripdriver_mapping.get(trip['asst_entity_id'], '')
            trip['dispatcher'] = tripdriver_mapping.get(trip['dispatched_by'], '')
            triplist.append(trip)

        response_data = {
            'triplist': triplist,
        }

        return Response(response_data)
class TripBranchView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        trip_ticket_id = request.query_params.get('id')
        if not trip_ticket_id:  
            return Response({"error": "ID is required."}, status=400)
        
        try:
            tripdetail_data = TripDetailsModel.objects.using('trips').filter(trip_ticket_id=trip_ticket_id)
            
            if not tripdetail_data.exists():
                return Response({"error": "Trip ticket not found."}, status=404)
        except ValueError:
            return Response({"error": "Invalid ID format."}, status=400)
        
        tripdetail_serializer = TripDetailsSerializer(tripdetail_data, many=True)
        tripdetails = tripdetail_serializer.data

        branch_ids = list(set([detail['branch_id'] for detail in tripdetails]))

        branch_data = TripBranchModel.objects.using('trips').filter(branch_id__in=branch_ids)  
        branch_serializer = TripBranchSerializer(branch_data, many=True)

        branch_mapping = {branch['branch_id']: branch['branch_name'] for branch in branch_serializer.data}
        for detail in tripdetails:
            detail['branch_name'] = branch_mapping.get(detail['branch_id'], 'Unknown')

        response_data = {
            'tripbranch': tripdetails,  
        }
        return Response(response_data)
class TripDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        trip_ticket_id = request.query_params.get('id')  # Use `id` as the query parameter
        if trip_ticket_id:
            try:
                # Filter by trip_ticket_id
                tripdetail_data = TripDetailsModel.objects.using('trips').filter(trip_ticket_id=trip_ticket_id)
                
                # If no records found, return a 404
                if not tripdetail_data.exists():
                    return Response({"error": "Trip ticket not found."}, status=404)
            except ValueError:
                return Response({"error": "Invalid ID format."}, status=400)
        else:
            return Response({"error": "ID is required."}, status=400)
        
        tripdetail_serializer = TripDetailsSerializer(tripdetail_data, many=True)
        
        response_data = {
            'tripdetails': tripdetail_serializer.data,
        }

        return Response(response_data)
    
class OCRView(APIView):
    permission_classes = [AllowAny]
    
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