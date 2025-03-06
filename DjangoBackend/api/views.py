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
from django.conf import settings
from django.utils import timezone
from django.contrib.gis.geoip2 import GeoIP2
import logging
import pytesseract
from django.http import JsonResponse
import requests
from datetime import date,datetime

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

class ManageAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        user_logs = TripTicketBranchLogsModel.objects.using('default').filter(created_by=user.user_id)
        log_ids = list(user_logs.values_list('log_id', flat=True).distinct())
        if not user_logs.exists():
            return Response({"userlogs": []}, status=status.HTTP_200_OK)
        if not log_ids :
            return Response({"error": "No attendance found."}, status=404)

        logger.warning(f"Unique log id: {log_ids}")
        userlog_data = TripTicketBranchLogsModel.objects.using('default').filter(log_id__in=log_ids)

        seen_logs_ids = set()
        filtered_user_data = []
        for userlog in userlog_data:
            if userlog.trip_ticket_id not in seen_logs_ids:
                seen_logs_ids.add(userlog.trip_ticket_id)
                filtered_user_data.append(userlog)

        grouped_trips = {}
        for userlog in userlog_data:
            if userlog.trip_ticket_id not in grouped_trips:
                grouped_trips[userlog.trip_ticket_id] = {
                    "trip_ticket_id": userlog.trip_ticket_id,
                    "trip_ticket_detail_id": [],
                }
           
        logger.warning(f"booorat, {list(grouped_trips.values())}")
        trip_serializer = TripDetailsSerializer(filtered_user_data, many=True)
        logger.warning(f"Filtered Trip details: {trip_serializer.data}")

        response_data = {
            'tripdetails': list(grouped_trips.values())
        }

        return Response(response_data)
    
class ManageTripDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get unique trip_ticket_ids from OutslipImagesModel
        user_trips = OutslipImagesModel.objects.using('default').filter(created_by=user.user_id)
        trip_ids = list(user_trips.values_list('trip_ticket_id', flat=True).distinct())
        trip_detail_ids = list(user_trips.values_list('trip_ticket_detail_id', flat=True).distinct())
        if not user_trips.exists():
            return Response({"tripdetails": []}, status=status.HTTP_200_OK)
        if not trip_ids or not trip_detail_ids:
            return Response({"error": "No trip tickets found."}, status=404)

        logger.warning(f"Unique trip_ticket_ids: {trip_ids}, trip_ticket_detail_ids: {trip_detail_ids}")
        trip_data = TripDetailsModel.objects.using('default').filter(trip_ticket_id__in=trip_ids, trip_ticket_detail_id__in=trip_detail_ids)

        seen_trip_ids = set()
        filtered_trip_data = []
        for trip in trip_data:
            if trip.trip_ticket_id not in seen_trip_ids:
                seen_trip_ids.add(trip.trip_ticket_id)
                filtered_trip_data.append(trip)

        grouped_trips = {}
        for trip in trip_data:
            if trip.trip_ticket_id not in grouped_trips:
                grouped_trips[trip.trip_ticket_id] = {
                    "trip_ticket_id": trip.trip_ticket_id,
                    "trip_ticket_detail_id": [],
                }
            grouped_trips[trip.trip_ticket_id]["trip_ticket_detail_id"].append({
                "trip_ticket_detail_id": trip.trip_ticket_detail_id,
                "trip_ticket_id": trip.trip_ticket_id,
                "trans_name": trip.trans_name,
                "branch_name": trip.branch_name,
                "ref_trans_date": trip.ref_trans_date,
            })
        logger.warning(f"booorat, {list(grouped_trips.values())}")
        trip_serializer = TripDetailsSerializer(filtered_trip_data, many=True)
        logger.warning(f"Filtered Trip details: {trip_serializer.data}")

        response_data = {
            'tripdetails': list(grouped_trips.values())
        }

        return Response(response_data)
    
class ManageUploadedPictures(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        trip_ticket_detail_id = request.query_params.get('id')
        
        if trip_ticket_detail_id:
            try:
                upload_data = OutslipImagesModel.objects.using('default').filter(trip_ticket_detail_id=trip_ticket_detail_id, created_by = user.user_id)
                tripdetails_data = TripDetailsModel.objects.using('default').filter(trip_ticket_detail_id=trip_ticket_detail_id)
                if not upload_data.exists():
                    return Response({"error": "Trip ticket Detail not found."}, status=404)
            except ValueError:
                return Response ({"error": "Invalid Format"}, status=404)
        else:
            return Response({"Error": "ID is required."}, status=400)
        
        upload_data_serializer = OutslipImagesSerializer(upload_data, many=True)
        tripdetails_data_serializer = TripDetailsSerializer(tripdetails_data, many=True)
        uploadDetails = upload_data_serializer.data
        logger.warning(f"tite: {uploadDetails}" )
        response_data = {
            'upload_data':uploadDetails,
            'trip_details':tripdetails_data_serializer.data
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
                    base_url = settings.BASE_URL
                    file_url = f"{settings.BASE_URL}{settings.MEDIA_URL}{saved_path}"
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


class EditUploadedPictures(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        upload_images = request.FILES.getlist('image',)    #should be same name from frointend
        existing_images = request.data.getlist('existing_images', [])
        upload_remarks = request.data.getlist('upload_remarks', '')
        upload_text = request.data.getlist('upload_text', '')
        trip_ticket_detail_id = request.data.get('trip_ticket_detail_id')
        trip_ticket_id = request.data.get('trip_ticket_id')
        removed_ids = request.data.getlist('removed_ids', [])
        user_id = request.user.user_id
        logger.warning("removed", removed_ids)
        try: 
            if removed_ids:
                OutslipImagesModel.objects.filter(upload_id__in=removed_ids).delete()
            get_data = OutslipImagesModel.objects.filter(trip_ticket_detail_id=trip_ticket_detail_id)    
            existing_image_objects = OutslipImagesModel.objects.filter(
                trip_ticket_detail_id=trip_ticket_detail_id,
                upload_files__in=existing_images  # Filter by existing image URLs
                
            )
            for i, image in enumerate(existing_image_objects):
                if i < len(upload_remarks):
                    image.upload_remarks = upload_remarks[i]
                if i < len(upload_text):
                    image.upload_text = upload_text[i]
                    image.updated_by = user_id
                    image.updated_date = timezone.now()
                    image.save()
                    
            for i, upload_image in enumerate(upload_images):
                if i >= len(get_data):
                    
                    
                    remark = upload_remarks[i] if i < len(upload_remarks) else ''
                    upload_txt = upload_text[i] if i < len(upload_text) else ''
                    file_path = f'outslips/{upload_image.name}'
                    saved_path = default_storage.save(file_path, ContentFile(upload_image.read()))
                    file_url = f"{settings.BASE_URL}{settings.MEDIA_URL}{saved_path}"
                    new_image = OutslipImagesModel(
                        trip_ticket_detail_id=trip_ticket_detail_id,
                        trip_ticket_id = trip_ticket_id,
                        upload_files=file_url,
                        upload_remarks=remark,
                        upload_text=upload_txt,
                        created_by = user_id,
                        created_date = timezone.now(),
                        updated_by = user_id,
                        updated_date = timezone.now()
                    )
                    new_image.save()
            return Response ({'message': 'Update successful'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

class RetrieveLocationView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        user_ip = self.get_client_ip(request)
        g = GeoIP2()
        
        try:
            location_data = g.city(user_ip)  # Fetch location details
            latitude = location_data['latitude']
            longitude = location_data['longitude']
            
            locationiq_response = self.reverse_geocode(latitude, longitude)
            
        except Exception as e:
            return Response({"error": str(e)}, status=400)
        
        return Response({"ip": user_ip, "longitude": longitude, "latitude": latitude, "fulladdress": locationiq_response.get('display_name')})

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def reverse_geocode(self, lat, lon):
        url = "https://us1.locationiq.com/v1/reverse"
        params = {
            'key' : 'pk.290fe86c4236d073d5c6996361d7d23d',
            'lat': lat,
            'lon': lon,
            'format': 'json'
        }
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()
    
class ClockInAttendance(APIView):
    permission_classes = [AllowAny]
    def post (self, request):
        data = request.data
        user_id = data['created_by']
        current_date = datetime.now().date()
        try:
            has_clocked_in = TripTicketBranchLogsModel.objects.filter(
                created_by=user_id,
                created_date__date=current_date
            ).first()
            
            if has_clocked_in:
                return Response(
                    {"error": f"You have already clocked in today at {has_clocked_in.time_in}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            TripTicketBranchLogsModel.objects.create(
                server_id=1,
                trip_ticket_id=data['trip_ticket_id'],
                branch_id=data['branch_id'],
                time_in=timezone.now(),
                created_by=data['created_by'],
                created_date=timezone.now(),
                updated_date=timezone.now(),
                updated_by=data['created_by'],
                location_in=data['location_in'],
                ip_address_in=data['ip_address_in'],
                latitude_in=data['latitude_in'],
                longitude_in=data['longitude_in'],
            )
            return Response ({"message": "insucc"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class ClockOutAttendance(APIView):
    permission_classes = [IsAuthenticated]
    def post (self, request):
        data = request.data
        user_id = request.user.user_id
        current_date = datetime.now().date()
        try:
            has_clocked_in = TripTicketBranchLogsModel.objects.filter(
                created_by=user_id,
                created_date__date=current_date
            ).first()
            has_clocked_out = TripTicketBranchLogsModel.objects.filter(
                created_by=user_id,
                time_out__date=current_date
            ).first()
            if has_clocked_out:
                return Response(
                    {"error": f"You have already clocked out today at {has_clocked_out.time_out}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
                
            has_clocked_in.time_out = timezone.now()
            has_clocked_in.updated_by = user_id
            has_clocked_in.updated_date = timezone.now()
            has_clocked_in.location_out = data['location_out']
            has_clocked_in.ip_address_out = data['ip_address_out']
            has_clocked_in.latitude_out = data ['latitude_out']
            has_clocked_in.longitude_out = data['longitude_out']
            has_clocked_in.save()
            return Response ({"message": "insucc"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
        
   