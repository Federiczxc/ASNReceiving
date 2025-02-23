from django.shortcuts import render, get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .serializers import *
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.utils.timezone import now
from PIL import Image

import logging
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
logger = logging.getLogger(__name__)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)  # ✅ This will show the exact problem
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        user = serializer.validated_data['user']
        refresh = RefreshToken.for_user(user)
        access_token = refresh.access_token

        access_token['username'] = user.user_code
        access_token['user_id'] = user.user_id

        return Response({
            'access': str(access_token),
            'refresh': str(refresh),
            'user': {
                'username': user.user_code,
                'user_id': user.user_id,
            }
        }, status=status.HTTP_200_OK)

    
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
        logger.warning("prorpfi", user.user_id)
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
class TripListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
                
        trips = TripTicketModel.objects.using('default').all()
        drivers = TripDriverModel.objects.using('default').all()
        driver_mapping = {driver.entity_id: driver.entity_name for driver in drivers}
        
        trip_serializer = TripTicketSerializer(trips, many=True)

        for trip in trip_serializer.data:
            trip['entity_name'] = driver_mapping.get(trip['entity_id'], '')
            trip['asst_entity_name'] = driver_mapping.get(trip['asst_entity_id'], '')
            trip['dispatcher'] = driver_mapping.get(trip['dispatched_by'], '')

        return Response({'triplist': trip_serializer.data})

class TripBranchView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        trip_ticket_id = request.query_params.get('id')
        if not trip_ticket_id:  
            return Response({"error": "ID is required."}, status=400)
        
        try:
            tripdetail_data = TripDetailsModel.objects.using('default').filter(trip_ticket_id=trip_ticket_id)
            
            if not tripdetail_data.exists():
                return Response({"error": "Trip ticket not found."}, status=404)
        except ValueError:
            return Response({"error": "Invalid ID format."}, status=400)
        
        tripdetail_serializer = TripDetailsSerializer(tripdetail_data, many=True)
        tripdetails = tripdetail_serializer.data

        branch_ids = list(set([detail['branch_id'] for detail in tripdetails])) #convert to list and remove duplicates of branch id

        branch_data = TripBranchModel.objects.using('default').filter(branch_id__in=branch_ids) # match
        branch_serializer = TripBranchSerializer(branch_data, many=True)


        response_data = [ 
            { 
            'branch_id': branch['branch_id'], 
            'branch_name': branch['branch_name'] 
            } 
            for branch in branch_serializer.data 
        ]
        return Response(response_data)
    
class TripDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        trip_ticket_id = request.query_params.get('trip_ticket_id')  
        branch_id = request.query_params.get('branch_id') 
        if trip_ticket_id:
            try:
                tripdetail_data = TripDetailsModel.objects.using('default').filter(trip_ticket_id=trip_ticket_id, branch_id=branch_id)
                
                if not tripdetail_data.exists():
                    return Response({"error": "Trip ticket not found."}, status=404)
            except ValueError:
                return Response({"error": "Invalid ID format."}, status=400)
        else:
            return Response({"error": "ID is required."}, status=400)
        
        tripdetail_serializer = TripDetailsSerializer(tripdetail_data, many=True)
        tripdetails = tripdetail_serializer.data
        branch_ids = list(set([detail['branch_id'] for detail in tripdetails])) 
        branch_data = TripBranchModel.objects.using('default').filter(branch_id__in=branch_ids) # match
        branch_serializer = TripBranchSerializer(branch_data, many=True)
        response_data = {
            'tripdetails': tripdetail_serializer.data,
            'branches': branch_serializer.data
        }

        return Response(response_data)

    
class ManageTripDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get unique trip_ticket_ids from OutslipImagesModel
        trip_ids = list(
            OutslipImagesModel.objects.using('default')
            .filter(created_by=user.user_id)
            .values_list('trip_ticket_id', flat=True)
            .distinct()
        )

        if not trip_ids:
            return Response({"error": "No trip tickets found."}, status=404)

        logger.warning(f"Unique trip_ticket_ids: {trip_ids}")

        trip_data = TripDetailsModel.objects.using('default').filter(trip_ticket_id__in=trip_ids)

        seen_trip_ids = set()
        filtered_trip_data = []
        for trip in trip_data:
            if trip.trip_ticket_id not in seen_trip_ids:
                seen_trip_ids.add(trip.trip_ticket_id)
                filtered_trip_data.append(trip)

        trip_serializer = TripDetailsSerializer(filtered_trip_data, many=True)
        logger.warning(f"Filtered Trip details: {trip_serializer.data}")

        response_data = {
            'tripdetails': trip_serializer.data  
        }

        return Response(response_data)
class OutslipDetailView(APIView):
    permission_classes = [AllowAny]
    
    def get(self, request):
        
        trip_ticket_detail_id = request.query_params.get('trip_ticket_detail_id')  
        if trip_ticket_detail_id:
            try:
                tripdetail_data = TripDetailsModel.objects.using('default').filter(trip_ticket_detail_id=trip_ticket_detail_id)
                
                if not tripdetail_data.exists():
                    return Response({"error": "Trip ticket not found."}, status=404)
            except ValueError:
                return Response({"error": "Invalid ID format."}, status=400)
        else:
            return Response({"error": "ID is required."}, status=400)
        
        tripdetail_serializer = TripDetailsSerializer(tripdetail_data, many=True)
        tripdetails = tripdetail_serializer.data
        branch_ids = list(set([detail['branch_id'] for detail in tripdetails])) 
        branch_data = TripBranchModel.objects.using('default').filter(branch_id__in=branch_ids) # match
        branch_serializer = TripBranchSerializer(branch_data, many=True)
        response_data = {
            'tripdetails': tripdetail_serializer.data,
            'branches': branch_serializer.data
        }

        return Response(response_data)




class OCRView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        file = request.FILES.get('image')
        logger.warning(file)
        if not file:
            return Response ({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            image = Image.open(file)
            text = pytesseract.image_to_string(image)
            return Response({'text':text})
        except Exception as e:

            return Response({'error':str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        

class UploadOutslipView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        upload_images = request.FILES.getlist('image',)    #should be same name from frointend
        upload_remarks = request.data.getlist('upload_remarks', '')
        upload_text = request.data.getlist('upload_text', '')
        trip_ticket_id = request.data.get('trip_ticket_id')
        trip_ticket_detail_id = request.data.get('trip_ticket_detail_id')
        user_id = request.data.get('created_by')
        date_now = request.data.get('created_date')
        logger.warning(f"Upload Images: {upload_images}")
        logger.warning(f"Upload Remarks: {upload_remarks}")
        logger.warning(f"Trip Ticket ID: {trip_ticket_id}")
        logger.warning(f"Trip Ticket Detail ID: {trip_ticket_detail_id}")
        if not upload_images:
            return Response({'error': 'Image is required'}, status=status.HTTP_402_BAD_REQUEST)
        uploaded_files = []
        errors = []
        for i, upload_image in enumerate(upload_images): #pambukod if wala, magiging json yung data sa db
        
            remark = upload_remarks[i] if i < len(upload_remarks) else None
            upload_txt = upload_text[i] if i < len(upload_text) else None
            data = request.data.copy()
            data['upload_remarks'] = remark
            data['upload_text'] = upload_txt
            serializer = OutslipImagesSerializer(data=data)
            
            if serializer.is_valid():
                try:
                    file_path = f'outslips/{upload_image.name}'
                    saved_path = default_storage.save(file_path, ContentFile(upload_image.read()))
                    file_url = default_storage.url(saved_path)
                    outslip_image = serializer.save(
                        upload_files=file_url,
                        trip_ticket_id = trip_ticket_id,
                        trip_ticket_detail_id = trip_ticket_detail_id,
                        upload_remarks = remark,
                        upload_text = upload_txt,  
                        created_by=user_id,
                        created_date=date_now,
                        updated_by=user_id,
                        updated_date=date_now,
                    )
                    uploaded_files.append(OutslipImagesSerializer(outslip_image).data)
                    
                except Exception as e:
                    errors.append({'upload_image': upload_image.name, 'error':str(e)})
            else:
                errors.append({'upload_image': upload_image.name, 'errors': serializer.errors})
        
        if uploaded_files:
            return Response({
                'message': 'Upload success',
                'uploaded_files': uploaded_files,
                'errors': errors if errors else None
            }, status=status.HTTP_201_CREATED)
        return Response({'error': 'All images failed to upload', 'details': errors}, status=status.HTTP_400_BAD_REQUEST)
