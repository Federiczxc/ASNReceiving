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

from PIL import Image
import pytesseract
pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
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
        upload_images = request.FILES.getlist('upload_images')    #should be same name from frointend
        upload_remarks = request.data.getlist('upload_remarks', '')
        
        if not upload_images:
            return Response({'error': 'Image is required'}, status=status.HTTP_400_BAD_REQUEST)
        uploaded_files = []
        errors = []
        
        for i, upload_image in enumerate(upload_images):
        
            remark = upload_remarks[i] if i < len(upload_remarks) else None
            
            data = request.data.copy()
            data['upload_remarks'] = remark
            serializer = OutslipImagesSerializer(data=request.data)
            
            if serializer.is_valid():
                try:
                    file_path = f'outslips/{upload_image.name}'
                    saved_path = default_storage.save(file_path, ContentFile(upload_image.read()))
                    file_url = default_storage.url(saved_path)

                    outslip_image = serializer.save(
                        upload_files=file_url,
                        upload_remarks = remark,
                        created_date=now(),
                        updated_date=now()
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
