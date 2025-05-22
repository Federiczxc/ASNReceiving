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
from PIL import Image, ImageDraw, ImageFont
from io import BytesIO
from django.conf import settings
from django.utils import timezone
#from django.contrib.gis.geoip2 import GeoIP2
import logging
#import pytesseract
from django.http import JsonResponse
import requests
from datetime import date,datetime
from django.forms.models import model_to_dict
from collections import defaultdict
import json
import time
#pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
logger = logging.getLogger(__name__)

class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if not serializer.is_valid():
            print(serializer.errors)  
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
        user = request.user
        trips = TripTicketModel.objects.using('default').all().order_by('-trip_ticket_id').values().filter(is_final_trip=1)
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

        branch_data = TripBranchModel.objects.using('default').order_by('branch_name').filter(branch_id__in=branch_ids) # match
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

        if not trip_ticket_id:
            return Response({"error": "trip_ticket_id is required."}, status=400)
#, cast(null as nvarchar(30)) as remarks
        try:
            with connection.cursor() as cursor:
                cursor.execute("""
                      SELECT 
                        td.*,
                        cast(null as bigint) as item_id,   cast(null as nvarchar(30)) as item_description,   cast(null as nvarchar(30)) as barcode,   cast(null as int) as uom_id,
                        cast(null as nvarchar(30)) as uom_code,  cast(null as int) as item_qty
                    FROM scm_tr_trip_ticket_detail td
                    WHERE td.trip_ticket_id = %s AND td.branch_id = %s order by td.ref_trans_no asc
                """, [trip_ticket_id, branch_id])
                
                columns = [col[0] for col in cursor.description]
                raw_data = [dict(zip(columns, row)) for row in cursor.fetchall()]

            if not raw_data:
                return Response({"error": "Trip ticket not found."}, status=404)

            trips_map = {}
            branches = set()
            
            for row in raw_data:
                trip_id = row['trip_ticket_detail_id']
                
                if trip_id not in trips_map:
                    trips_map[trip_id] = {
                        'trip_ticket_detail_id': trip_id,
                        'trip_ticket_id': row['trip_ticket_id'],
                        'branch_id': row['branch_id'],
                        'ref_trans_id': row['ref_trans_id'],
                        'ref_trans_no': row['ref_trans_no'],
                        'ref_trans_date': row['ref_trans_date'],
                        'trans_name': row['trans_name'],
                        'detail_volume': row['detail_volume'],
                        'remarks': row['remarks'],
                        'items': [],
                        'branch_name': row.get('branch_name'),
                        'is_posted': row['is_posted'],
                    }
                    branches.add(row['branch_id'])
                
                # Only add unique items per trip
                existing_items = {i['item_id'] for i in trips_map[trip_id]['items']}
                if row['item_id'] not in existing_items:
                    trips_map[trip_id]['items'].append({
                        'item_id': row['item_id'],
                        'item_qty': str(row['item_qty']),
                        'remarks': row['remarks'],
                        'item_description': row['item_description'],
                        'barcode': row['barcode'],
                        'uom_id': row['uom_id'],
                        'uom_code': row['uom_code'],
                       
                    })
            #logger.warning("tete", list(trips_map.values()))
            # Get branch details
            branch_data = TripBranchModel.objects.using('default').filter(
                branch_id__in=branches
            )
            branch_serializer = TripBranchSerializer(branch_data, many=True)
            return Response({
                'tripdetails': list(trips_map.values()),
                'branches': branch_serializer.data
            })

        except ValueError:
            return Response({"error": "Invalid ID format."}, status=400)
class ManageAttendanceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        
        user_logs = TripTicketBranchLogsModel.objects.using('default').order_by('-log_id').filter(created_by=user.user_id)
      
        trip_ticket_ids = user_logs.values_list('trip_ticket_id', flat=True).distinct()

        # Get trip ticket numbers from TripTicketModel
        trip_tickets = TripTicketModel.objects.using('default').filter(
            trip_ticket_id__in=trip_ticket_ids
        )
        ticket_number_map = {
            ticket.trip_ticket_id: ticket.trip_ticket_no
            for ticket in trip_tickets
        }

        userlogs_serializer = BranchLogsSerializer(user_logs, many=True)

        response_data = []
        for log_data in userlogs_serializer.data:
            log_data['trip_ticket_no'] = ticket_number_map.get(log_data['trip_ticket_id'], '')
            response_data.append(log_data)

        return Response({'userlogs': response_data})
    
class ManageTripDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.auth['user_id']

        user_trips_qs = OutslipImagesModel.objects.using('default').filter(created_by=user_id).values('trip_ticket_id', 'trip_ticket_detail_id', 'created_date')

        if not user_trips_qs.exists():
            return Response({"tripdetails": []}, status=status.HTTP_200_OK)
        image_dates = {
            (trip['trip_ticket_id'], trip['trip_ticket_detail_id']): trip['created_date']
            for trip in user_trips_qs
        }
        trip_ids = {trip['trip_ticket_id'] for trip in user_trips_qs}
        trip_detail_ids = {trip['trip_ticket_detail_id'] for trip in user_trips_qs}
        #trip_ids = user_trips_qs.values_list('trip_ticket_id', flat=True).distinct()
        #trip_detail_ids = user_trips_qs.values_list('trip_ticket_detail_id', flat=True).distinct()
        logger.warning(f"tite {trip_ids}")
        trip_details_qs = TripDetailsModel.objects.using('default').order_by('branch_name', 'ref_trans_no').filter(
            trip_ticket_id__in=trip_ids,
            trip_ticket_detail_id__in=trip_detail_ids
        )

        trip_tickets_map = {
            t.trip_ticket_id: {
                "trip_ticket_no": t.trip_ticket_no,
                "trip_ticket_date": t.trip_ticket_date
            }
            for t in TripTicketModel.objects.using('default')
                .filter(trip_ticket_id__in=trip_ids)
                .only("trip_ticket_id", "trip_ticket_no", "trip_ticket_date")
        }

        grouped_trips = {}
        for trip in trip_details_qs:
            tid = trip.trip_ticket_id
            detail_id = trip.trip_ticket_detail_id
            if tid not in grouped_trips:
                grouped_trips[tid] = {
                    "trip_ticket_id": tid,
                    "trip_ticket_no": trip_tickets_map.get(tid, {}).get("trip_ticket_no", ""),
                    "trip_ticket_date": trip_tickets_map.get(tid, {}).get("trip_ticket_date", ""),
                    "trip_ticket_detail_id": []
                }
            created_date = image_dates.get((tid, detail_id))
            grouped_trips[tid]["trip_ticket_detail_id"].append({
                "trip_ticket_detail_id": trip.trip_ticket_detail_id,
                "trip_ticket_id": tid,
                "trans_name": trip.trans_name,
                "branch_name": trip.branch_name,
                "ref_trans_date": trip.ref_trans_date,
                "ref_trans_id": trip.ref_trans_id,
                "ref_trans_no": trip.ref_trans_no,
                "created_date": created_date,
            })

        return Response({"tripdetails": list(grouped_trips.values())})
    
class EditUploadedPictures(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        upload_images = request.FILES.getlist('image', [])
        upload_remarks = request.data.getlist('upload_remarks', [])
        trip_ticket_detail_id = request.data.get('trip_ticket_detail_id')
        trip_ticket_id = request.data.get('trip_ticket_id')
        branch_id = request.data.get('branch_id')
        branch_name = request.data.get('branch_name')
        trans_name = request.data.get('trans_name')
        username = request.data.get('username')
        ref_trans_no = request.data.get('ref_trans_no')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        user_id = request.user.user_id

        #logger.warning(f"upload_images: {upload_images}")
        #logger.warning(f"upload_remarks: {upload_remarks}")

        try:
            # Get clock-in data once
            has_clock_in = TripTicketBranchLogsModel.objects.filter(
                created_by=user_id,
                trip_ticket_id=trip_ticket_id,
                branch_id=branch_id,
                time_in__isnull=False,
            ).first()

            trip_ticket_no = TripTicketModel.objects.filter(
                trip_ticket_id=trip_ticket_id
            ).values_list('trip_ticket_no', flat=True).first() if has_clock_in else None

            uploaded_files = []
            errors = []

            for i, upload_image in enumerate(upload_images):
                try:
                    remark = upload_remarks[i] if i < len(upload_remarks) else ''
                    
                    # Process image
                    with Image.open(upload_image) as img:
                        img_format = img.format or 'JPEG'
                        
                        # Apply watermark if clocked in
                        if has_clock_in:
                            location_data = reverse_geocode(latitude, longitude)
                            location_in = location_data.get('display_name', 'Unknown location')
                            
                            watermark_text = (
                                f"Trip Ticket No: {trip_ticket_no}\n"
                                f"Branch Name: {branch_name}\n"
                                f"Transaction Name: {trans_name}\n"
                                f"Trans No: {ref_trans_no}\n"
                                f"Taken by: {username}\n"
                                f"Date Taken: {timezone.now()}\n"
                                f"Edited Address: {location_in}\n"
                            )
                            
                            draw = ImageDraw.Draw(img)
                            font = ImageFont.load_default(size=64)
                            draw.multiline_text((20, 20), watermark_text, fill="white", font=font)
                        
                        # Prepare image for saving
                        img_io = BytesIO()
                        img.save(img_io, format=img_format, quality=95)
                        img_io.seek(0)
                        
                        # Save to storage
                        file_name = f'outslips/{upload_image.name}'
                        saved_path = default_storage.save(file_name, ContentFile(img_io.read()))
                        file_url = f"{settings.BASE_URL}{settings.MEDIA_URL}{saved_path}"
                        
                        # Create database record
                        OutslipImagesModel.objects.create(
                            trip_ticket_detail_id=trip_ticket_detail_id,
                            trip_ticket_id=trip_ticket_id,
                            branch_id=branch_id,
                            upload_files=file_url,
                            upload_remarks=remark,
                            upload_text='Not original picture',
                            created_by=user_id,
                            updated_by=user_id,
                            created_date=timezone.now(),
                            updated_date=timezone.now()
                        )
                        
                        uploaded_files.append(file_url)
                
                except Exception as e:
                    #logger.error(f"Error processing image {upload_image.name}: {str(e)}")
                    errors.append({
                        'image': upload_image.name,
                        'error': str(e)
                    })

            if errors:
                return Response({
                    'message': 'Some images failed to upload',
                    'successful_uploads': uploaded_files,
                    'errors': errors
                }, status=status.HTTP_207_MULTI_STATUS)
                
            return Response({
                'message': 'All images uploaded successfully',
                'uploaded_files': uploaded_files
            }, status=status.HTTP_201_CREATED)

        except Exception as e:
            #logger.error(f"Unexpected error in image upload: {str(e)}")
            return Response({
                'error': 'Failed to process upload',
                'details': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
class ManageUploadedPictures(APIView):
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        user = request.user
        trip_ticket_detail_id = request.query_params.get('id')
        user_id = request.user.user_id
        if trip_ticket_detail_id:
            try:
                upload_data = OutslipImagesModel.objects.using('default').filter(trip_ticket_detail_id=trip_ticket_detail_id, created_by = user.user_id)
                if not upload_data.exists():
                    return Response({"error": "Trip ticket Detail not found."}, status=404)

                receiving_data = TripTicketDetailReceivingModel.objects.filter(
                    trip_ticket_detail_id=trip_ticket_detail_id,
                    created_by=user_id
                ).values(
                    'item_id',
                    'item_qty',
                    'serbat_id',
                    'ser_bat_no',
                    'ref_trans_detail_id'
                )

                receiving_qty_map = {
                    f"{item['item_id']}:{item['serbat_id']}:{item['ref_trans_detail_id']}": {
                    'received_qty': item['item_qty'],
                    'ser_bat_no': item.get('ser_bat_no')
                    }

                    for item in receiving_data

                }
                #logger.warning(f"f(zqw) {receiving_qty_map}")
                #logger.warning(f"f(zq2) {receiving_data}")
            except ValueError:
                return Response ({"error": "Invalid Format"}, status=404)
        try:
            with connection.cursor() as cursor:
                cursor.execute("EXEC sp_mb_get_trip_item_details @trip_detail_id=%s", [trip_ticket_detail_id])   
    
                columns = [col[0] for col in cursor.description]
                raw_data = [dict(zip(columns, row)) for row in cursor.fetchall()]
            if not raw_data:
                return Response({"error": "Trip ticket not found."}, status=404)
            
            trips_map = {}
            branches = set()


            for row in raw_data:
                trip_id = row['trip_ticket_detail_id']
                
                if trip_id not in trips_map:
                    trips_map[trip_id] = {
                        'trip_ticket_detail_id': trip_id,
                        'trip_ticket_id': row['trip_ticket_id'],
                        'branch_id': row['branch_id'],
                        'ref_trans_id': row['ref_trans_id'],
                        'ref_trans_no': row['ref_trans_no'],
                        'ref_trans_code_id': row['ref_trans_code_id'],
                        'ref_trans_date': row['ref_trans_date'],
                        'trans_name': row['trans_name'],
                        'remarks': row['remarks'],
                        'items': [],
                        'branch_name': row.get('branch_name'),
                }
                branches.add(row['branch_id'])
                
                #existing_items = {i['item_id'] for i in trips_map[trip_id]['items']}
                #if row['item_id'] not in existing_items:
                serial_details = []
                #logger.warning(f"f(zc) {row.get('ref_trans_detail_id')} {row.get('ref_trans_detail_pkg_id')}")
                with connection.cursor() as serial_cursor:
                    serial_cursor.execute(
                        "EXEC sp_mb_get_trip_item_serial_details @trip_detail_id=%s, @ref_detail_id=%s, @ref_detail_pkg_id=%s", [trip_ticket_detail_id, row['ref_trans_detail_id'], row['ref_trans_detail_pkg_id']]
                    )
                    serial_columns = [col[0] for col in serial_cursor.description]
                    serial_data = [dict(zip(serial_columns, s_row)) for s_row in serial_cursor.fetchall()]
                    
                    for serial in serial_data:
                        key = f"{row['item_id']}:{serial.get('serbat_id', 'None')}:{row['ref_trans_detail_id']}"
                        if key in receiving_qty_map:
                            serial['received_qty'] = receiving_qty_map[key]['received_qty']
                    serial_details = serial_data
                    item_data = {
                        'item_id': row['item_id'],
                        'item_qty': str(row['item_qty']),
                        'received_qty': str(sum(
                            float(s['received_qty']) for s in serial_details
                            if 'received_qty' in s
                        )),
                        'remarks': row['remarks'],
                        'item_description': row['item_description'],
                        'barcode': row['barcode'],
                        'uom_id': row['uom_id'],
                        'uom_code': row['uom_code'],
                        'ref_trans_detail_id': row.get('ref_trans_detail_id'),
                        'ref_trans_detail_pkg_id': row.get('ref_trans_detail_pkg_id'),
                        'i_trans_no': row['i_trans_no'],
                        'main_item': row.get('main_item'),
                        'component_item': row.get('component_item'),
                        'serial_details': serial_details
                    }
                    trips_map[trip_id]['items'].append(item_data)
            branch_data = TripBranchModel.objects.using('default').filter(branch_id__in=branches) # match
            branch_serializer = TripBranchSerializer(branch_data, many=True)
            upload_data_serializer = OutslipImagesSerializer(upload_data, many=True)
            uploadDetails = upload_data_serializer.data
            return Response({
                'upload_data':uploadDetails,
                'trip_details': list(trips_map.values()),
                'branches': branch_serializer.data,
                'receiving_quantities': receiving_qty_map
            })
        except ValueError:
            return Response({"error": "Invalid ID format."}, status=400)

class OutslipDetailView(APIView):
    permission_classes = [IsAuthenticated]

    
    def get(self, request):
        
        trip_ticket_detail_id = request.query_params.get('trip_ticket_detail_id')  
        if not trip_ticket_detail_id:
            return Response({'error': 'Trip Ticket Detail ID is required. '}, status=400)
        
        try:
            with connection.cursor() as cursor:
                cursor.execute("EXEC sp_mb_get_trip_item_details @trip_detail_id=%s", [trip_ticket_detail_id])  
    
                columns = [col[0] for col in cursor.description]
                raw_data = [dict(zip(columns, row)) for row in cursor.fetchall()]
            if not raw_data:
                return Response({"error": "Trip ticket not found."}, status=404)
            
            trips_map = {}
            branches = set()

            for row in raw_data:
                trip_id = row['trip_ticket_detail_id']

                if trip_id not in trips_map:
                    trips_map[trip_id] = {
                        'trip_ticket_detail_id': trip_id,
                        'trip_ticket_id': row['trip_ticket_id'],
                        'branch_id': row['branch_id'],
                        'ref_trans_id': row['ref_trans_id'],
                        'ref_trans_no': row['ref_trans_no'],
                        'ref_trans_code_id': row['ref_trans_code_id'],
                        'ref_trans_date': row['ref_trans_date'],
                        'trans_name': row['trans_name'],
                        'remarks': row['remarks'],
                        'items': [],
                        'branch_name': row.get('branch_name'),
                }
                branches.add(row['branch_id'])
                
               # existing_items = {i['item_id'] for i in trips_map[trip_id]['items']}
               # if row['item_id'] not in existing_items:
                serial_details = []
                #logger.warning(f"f(zc) {row.get('ref_trans_detail_id')} {row.get('ref_trans_detail_pkg_id')}")
                with connection.cursor() as serial_cursor:
                    serial_cursor.execute(
                        "EXEC sp_mb_get_trip_item_serial_details @trip_detail_id=%s, @ref_detail_id=%s, @ref_detail_pkg_id=%s", [trip_ticket_detail_id, row['ref_trans_detail_id'], row['ref_trans_detail_pkg_id']]
                    )
                    serial_columns = [col[0] for col in serial_cursor.description]
                    serial_data = [dict(zip(serial_columns, s_row)) for s_row in serial_cursor.fetchall()]
                    serial_details = serial_data
                trips_map[trip_id]['items'].append({
                    'item_id': row['item_id'],
                    'item_qty': str(row['item_qty']),
                    'remarks': row['remarks'],
                    'item_description': row['item_description'],
                    'barcode': row ['barcode'],
                    'uom_id': row['uom_id'],
                    'uom_code': row['uom_code'],
                    'ref_trans_detail_id': row.get('ref_trans_detail_id'),
                    'ref_trans_detail_pkg_id': row.get('ref_trans_detail_pkg_id'),
                    'i_trans_no': row['i_trans_no'],
                    'main_item': row.get('main_item'),
                    'component_item': row.get('component_item'),
                    'serial_details': serial_details
                })
                #logger.warning("tete", list(trips_map.values()))
            branch_data = TripBranchModel.objects.using('default').filter(branch_id__in=branches) # match
            branch_serializer = TripBranchSerializer(branch_data, many=True)
            return Response({
                'tripdetails': list(trips_map.values()),
                'branches': branch_serializer.data
            })

        except ValueError:
            return Response({"error": "Invalid ID format."}, status=400)



#class OCRView(APIView):
 #   permission_classes = [AllowAny]
    
  #  def post(self, request):
   #     file = request.FILES.get('image')
    #    if not file:
     #       return Response ({'error': 'No image uploaded'}, status=status.HTTP_400_BAD_REQUEST)
      #  try:
       #     image = Image.open(file)
        #    text = pytesseract.image_to_string(image)
         #   return Response({'text':text})
        #except Exception as e:

         #   return Response({'error':str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        

class UploadOutslipView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        request.user
        upload_images = request.FILES.getlist('image',)    #should be same name from frointend
        upload_remarks = request.data.getlist('upload_remarks', '')
        upload_text = request.data.getlist('upload_text', '')
        trip_ticket_id = request.data.get('trip_ticket_id')
        trip_ticket_detail_id = request.data.get('trip_ticket_detail_id')
        user_id = request.data.get('created_by')
        branch_id = request.data.get('branch_id')
        branch_name = request.data.get('branch_name')
        ref_trans_no = request.data.get('ref_trans_no')
        trans_name = request.data.get('trans_name')
        username = request.data.get('username')
        no_clock_in = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            time_in__isnull=False,
            branch_id=branch_id,
            trip_ticket_id=trip_ticket_id,
        ).first()
        
        has_clock_out = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            trip_ticket_id=trip_ticket_id,
            branch_id=branch_id,
            time_in__isnull=False,
            time_out__isnull=False,
        ).first()
        has_clock_in = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            trip_ticket_id=trip_ticket_id,
            branch_id=branch_id,
            time_in__isnull=False,
        ).first()
       # has_upload = OutslipImagesModel.objects.filter(
        #    trip_ticket_detail_id = trip_ticket_detail_id,
         #   branch_id = branch_id,
          #  created_by=user_id,
        #).first()
        trip_ticket_no = TripTicketModel.objects.filter(
            trip_ticket_id=has_clock_in.trip_ticket_id).values_list('trip_ticket_no', flat=True).first()
        
        trip_details = TripDetailsModel.objects.filter(
            trip_ticket_detail_id = trip_ticket_detail_id,
        ).first()
       # if has_upload:
        #    return Response(
         #       {f"You have already uploaded an outslip, you can't upload anymore. Please check your profile to view your uploaded outslips."},
          #      status=status.HTTP_400_BAD_REQUEST
          #  )
        
        

        if has_clock_out:
            return Response(
                {"Error": f"You have already clocked out, you can't upload or edit anymore"},
                status=status.HTTP_400_BAD_REQUEST
                )
        if not no_clock_in:
            return Response(
                {"error": f"You haven't clocked in for this branch"},
                status=status.HTTP_400_BAD_REQUEST
            )
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
                    with Image.open(upload_image) as img:

                        if has_clock_in:
                            location_data = {
                            'latitude_in': has_clock_in.latitude_in,
                            'longitude_in': has_clock_in.longitude_in,
                            'location_in': has_clock_in.location_in,
                            'created_by': has_clock_in.created_by,
                            'created_date': has_clock_in.created_date,
                            }
                            #logger.warning(f"Raw location data: {location_data}")
                            coords = f"{has_clock_in.latitude_in},{has_clock_in.longitude_in}"
                            address = has_clock_in.location_in
                            watermarkedtext = f"Trip Ticket No:{trip_ticket_no}\nBranch Name: {branch_name}\nTransacstion Name: {trans_name}\nTrans No: {ref_trans_no}\nLatitude: {has_clock_in.latitude_in}\nLongitude: {has_clock_in.longitude_in}\nTaken by: {username}\nDate Taken: {timezone.now()}\nAddress: {has_clock_in.location_in}\n"
                            #logger.warning(f"Raw location data:{has_clock_in.created_by} {coords} {address}")
                            draw = ImageDraw.Draw(img)
                            font = ImageFont.load_default(size=64)
                            text_position = (20, 20)
                            draw.multiline_text(text_position, watermarkedtext, fill="white", font=font)
                            img_io = BytesIO()
                            img.save(img_io, format='JPEG', quality=95)
                            img_io.seek(0)
                        file_path = f'outslips/{upload_image.name}'
                        saved_path = default_storage.save(file_path, ContentFile(img_io.read()))
                        base_url = settings.BASE_URL
                        file_url = f"{settings.BASE_URL}{settings.MEDIA_URL}{saved_path}" #local
                        #file_url = f"http:{settings.MEDIA_ROOT}/{saved_path}" #1.200
                    
                    outslip_image = serializer.save(
                        upload_files=file_url,
                        trip_ticket_id = trip_ticket_id,
                        trip_ticket_detail_id = trip_ticket_detail_id,
                        upload_remarks = remark,
                        upload_text = upload_txt,  
                        created_by=user_id,
                        created_date=timezone.now(),
                        updated_by=user_id,
                        updated_date=timezone.now(),
                        branch_id=branch_id
                    )
                    uploaded_files.append(OutslipImagesSerializer(outslip_image).data)
                    
                    trip_details.is_posted = True
                    trip_details.save(update_fields=['is_posted']) 
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

def reverse_geocode(lat, lon):
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
class CheckClockInView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user_id = request.user.user_id
        trip_ticket_id = request.query_params.get('trip_ticket_id')
        branch_id = request.query_params.get('branch_id')
        print(f"Checking clock-in for: user={user_id}, trip={trip_ticket_id}, branch={branch_id}")
        exists = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            trip_ticket_id=trip_ticket_id,
            branch_id=branch_id,
        ).exists()

        clockout_exists = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            trip_ticket_id=trip_ticket_id,
            branch_id=branch_id,
            time_out__isnull=False
        ).exists()

        return Response({'has_clocked_in': exists,
        'has_clocked_out':clockout_exists})

class TripTicketReceiveView(APIView):
    permission_classes = [IsAuthenticated]
    def post (self, request):
        try:
            receivingData = json.loads(request.data.get('receiving_data', '[]'))
            user_id = request.user.user_id
            trip_ticket_detail_id = receivingData[0]['trip_ticket_detail_id']
            #logger.warning("pjuke", trip_ticket_detail_id)
            has_upload = OutslipImagesModel.objects.filter(
            trip_ticket_detail_id = trip_ticket_detail_id,
            created_by=user_id,
            ).first()
            
            created_ids = []
            
        
            if has_upload:
                return Response(
                    {f"You have already submitted, you can't submit anymore."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            for item in receivingData:
                new_record = TripTicketDetailReceivingModel.objects.create(
                    server_id = 1,
                    trip_ticket_id=item['trip_ticket_id'],
                    trip_ticket_detail_id=item['trip_ticket_detail_id'],
                    ref_trans_id=item['ref_trans_id'],
                    ref_trans_no=item['ref_trans_no'],
                    trans_code_id=item['trans_code_id'],
                    item_id=item['item_id'],
                    item_qty=item['item_qty'],
                    doc_qty=item.get('doc_qty', item['item_qty']),
                    ref_trans_detail_id=item['ref_trans_detail_id'],
                    ref_trans_detail_pkg_id=item['ref_trans_detail_pkg_id'],
                    i_trans_no=item['i_trans_no'],
                    p_trans_no=item['p_trans_no'],
                    main_item=item['main_item'],
                    component_item=item['component_item'],
                    ser_bat_no=item['ser_bat_no'],
                    batch_no=item['batch_no'],
                    serbat_id=item['serbat_id'],
                    created_by = user_id,
                    created_date=timezone.now(),
                    updated_by = user_id,
                    updated_date=timezone.now(),
                )
                created_ids.append(new_record.receiving_id)
            return Response ({"message": "insucc"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
class ClockInAttendance(APIView):
    permission_classes = [IsAuthenticated]
    def post (self, request):
        start_time = time.perf_counter()
        data = request.data
        user_id = data['created_by']
        trip_ticket_id=data.get('trip_ticket_id')
        latitude = data.get('latitude_in')
        longitude = data.get('longitude_in')
        branch_id=data.get('branch_id')
        #current_date = datetime.now().date()
        if not latitude or not longitude:
            return Response({"error": "Latitude and longitude are required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            now = timezone.now()
            has_posted = TripDetailsModel.objects.filter(
                trip_ticket_id = trip_ticket_id,
                branch_id = branch_id,
                is_posted = True
            ).exists()
            
            
            no_clock_out = TripTicketBranchLogsModel.objects.filter(
            created_by=user_id,
            time_out__isnull=True
            ).exclude(branch_id=branch_id).first()

            if no_clock_out:
                trip_ticket_no = TripTicketModel.objects.filter(trip_ticket_id=no_clock_out.trip_ticket_id).values_list('trip_ticket_no', flat=True).first()
                return Response(
                    {"error": f"You haven't clocked out at Trip Ticket No:{trip_ticket_no} Branch ID:{no_clock_out.branch_id}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                has_clocked_in = TripTicketBranchLogsModel.objects.filter(
                        created_by=user_id,
                       # created_date__date=current_date,
                        trip_ticket_id=trip_ticket_id,
                        branch_id= branch_id
                    ).exists()
                if has_clocked_in:
                    return Response(
                        {"error": f"You have already clocked in at {has_clocked_in.time_in}."},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            if has_posted:
                return Response (
                    {"error": f"Someone is already delivering in this branch "},
                    status=status.HTTP_400_BAD_REQUEST
                )
            geo_start = time.perf_counter()
            location_data = reverse_geocode(data['latitude_in'], data['longitude_in'])
            location_in = location_data.get('display_name')
            #logger.warning(f"🌍 Reverse geocode time: {(time.perf_counter() - geo_start) * 1000:.2f} ms")
            TripTicketBranchLogsModel.objects.create(
                server_id=1,
                trip_ticket_id=data['trip_ticket_id'],
                branch_id=data['branch_id'],
                time_in=timezone.now(),
                created_by=data['created_by'],
                created_date=timezone.now(),
                updated_date=timezone.now(),
                updated_by=data['created_by'],
                location_in=location_in,
                ip_address_in='',
                latitude_in=data['latitude_in'],
                longitude_in=data['longitude_in'],
            )
            #logger.warning(f"✅ Total request time: {(time.perf_counter() - start_time) * 1000:.2f} ms")
            return Response ({"message": "insucc"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        
    
class ClockOutAttendance(APIView):
    permission_classes = [IsAuthenticated]
    def post (self, request):
        start_time = time.perf_counter()
        data = request.data
        user_id = request.user.user_id
        trip_ticket_id=data.get('trip_ticket_id')
        branch_id=data.get('branch_id')
        
        #current_date = datetime.now().date()
        
        try:
            has_clocked_in = TripTicketBranchLogsModel.objects.filter(
                created_by=user_id,
                #created_date__date=current_date,
                trip_ticket_id=trip_ticket_id,
                branch_id=branch_id
            ).first()
            
            if not has_clocked_in:
                return Response (
                    {"error": "You must clock in before clocking out."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if has_clocked_in.time_out:
                return Response(
                    {"error": f"You have already clocked out at {has_clocked_in.time_out}."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            trip_details = TripDetailsModel.objects.filter(trip_ticket_id=trip_ticket_id, branch_id=branch_id)
            for detail in trip_details:
                if not OutslipImagesModel.objects.filter(
                    trip_ticket_id= trip_ticket_id,
                    trip_ticket_detail_id=detail.trip_ticket_detail_id,
                    branch_id=detail.branch_id,
                ).first():
                    return Response(
                       {"error": f"Upload missing for outslip #{detail.ref_trans_no}"},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            latitude = data.get('latitude_out')
            longitude = data.get('longitude_out')
            geo_start = time.perf_counter()
            location_data = reverse_geocode(data['latitude_out'], data['longitude_out'])
            location_out = location_data.get('display_name')
            #logger.warning(f"🌍 Reverse geocode time: {(time.perf_counter() - geo_start) * 1000:.2f} ms")
            has_clocked_in.time_out = timezone.now()
            has_clocked_in.updated_by = user_id
            has_clocked_in.updated_date = timezone.now()
            has_clocked_in.location_out = location_out
            has_clocked_in.ip_address_out = ''
            has_clocked_in.latitude_out = latitude
            has_clocked_in.longitude_out = longitude
            has_clocked_in.save()
            #logger.warning(f"✅ Total request time: {(time.perf_counter() - start_time) * 1000:.2f} ms")
            return Response ({"message": "insucc"}, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
    
   
        
   