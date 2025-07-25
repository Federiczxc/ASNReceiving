from django.urls import path, include, re_path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from django.conf import settings

from django.views.static import serve
from django.conf.urls.static import static
from django.contrib.staticfiles.urls import staticfiles_urlpatterns # new
urlpatterns = [
    ################DMS########################
    path('login/', LoginView.as_view(), name='login'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('triplist/', TripListView.as_view(), name='triplist'),
    path('tripdetails/', TripDetailView.as_view(), name='tripdetails'),
    path('tripbranch/', TripBranchView.as_view(), name='tripbranch'),
    path('outslipview/', OutslipDetailView.as_view(), name='outslipview'),
    path('outslipupload/', UploadOutslipView.as_view(), name='outslipupload'),
    path('receiverlist/', ReceiverMFView.as_view(), name='receiverlist'),
    path('manage_upload/', ManageTripDetailView.as_view(), name='manageupload'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token-verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('manage-upload-pics/', ManageUploadedPictures.as_view(), name='managepics'),
    path('manage-upload-cancel/', ManageUploadedCancel.as_view(), name='managecancel'),
    path('edit-upload-pics/', EditUploadedPictures.as_view(), name='editpics'),
    path('clock-in/', ClockInAttendance.as_view(), name='clockinattendance'),
    path('reclock-in/', ReclockInAttendance.as_view(), name='reclockinattendance'),
    path('undo-clock-in/', UndoClockInAttendance.as_view(), name='undoclockin'),
    path('check-clock-in/', CheckClockInView.as_view(), name='checkclockin'),
    path('clock-out/', ClockOutAttendance.as_view(), name='clockoutattendance'),
    path('reclock-out/', ReclockOutAttendance.as_view(), name='clockoutattendance'),
    path('manage-attendance/', ManageAttendanceView.as_view(), name='attendanceview'),
    path('trip-ticket-receive/', TripTicketReceiveView.as_view(), name='receiveView'),
    path('cancel-outslip/', CancelOutslipView.as_view(), name='cancelOutslip'),
    path('tripcustomer/', TripCustomerView.as_view(), name='tripcustomer'), #tsl
    path('customerdetails/', CustomerDetailView.as_view(), name='customerdetail'), #tsl
    path('manage-attendance-tsl/', ManageAttendanceTSL.as_view(), name='manageattendancetsl'), #tsl\





    ################DMS-REPORTS########################
    path('triplistreport/', TripListReport.as_view(), name='triplist'),
    path('trip_ticket_reports/', TripTicketReports.as_view(), name='tripticketreports'),
    path('attendancelistreport/', AttendanceListReport.as_view(), name='attendancelistreport'),
    path('trip_ticket_detail_reports/', TripTicketDetailReports.as_view(), name='tripticketbranchreports'),
    path('branch_reports/', BranchReportsView.as_view(), name='branchreports'),
    path('attendance_reports/', AttendanceReports.as_view(), name='attendancereports'),
    path('initial_reports/', InitialReports.as_view(), name='initialreports'),
    path('view_outslip_report/', ViewOutslipReport.as_view(), name='viewoutslkipreport'),
    path('delivery_sequence/', DeliverySequenceView.as_view(), name='deliverysqeuqnce'),

    
    ################IRIS########################
    path('layerview/', LayerMFView.as_view(), name='layerview'), #iris
    path('inventorycount_row/', InventoryCountListView.as_view(), name='inventoryrow'),
    path('save_barcode/', SaveBarcode.as_view(), name='savebarcode'),
    path('save_serbat/', SaveSerbat.as_view(), name='savebarcode'),
    path('delete_barcode/', DeleteBarcode.as_view(), name='deletebarcode'),
    path('delete_serbat/', DeleteSerbat.as_view(), name='deleteserbat'),
    path('edit_barcode_qty/', EditBarcodeQty.as_view(), name='editqty'),
    path('barcode_list/', FullCountBarcodeView.as_view(), name='barcodelist'),
    path('serbat_list/', FullCountSerialView.as_view(), name='serbatlist'),
    path('selected_itemcode/', SelectedItemCodeView.as_view(), name='selecteditemcode'),
    re_path(r'^media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
    re_path(r'^static/(?P<path>.*)$', serve, {'document_root': settings.STATIC_ROOT}),
]   
