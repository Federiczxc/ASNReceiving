from django.urls import path
from .views import *
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from django.conf.urls.static import static

urlpatterns = [
    path('ocr/', OCRView.as_view(), name='ocr'),
    path('login/', LoginView.as_view(), name='login'),
    path('register/', RegisterView.as_view(), name='register'),
    path('profile/', ProfileView.as_view(), name='profile'),
    path('triplist/', TripListView.as_view(), name='triplist'),
    path('tripdetails/', TripDetailView.as_view(), name='tripdetails'),
    path('tripbranch/', TripBranchView.as_view(), name='tripbranch'),
    path('outslipview/', OutslipDetailView.as_view(), name='outslipview'),
    path('outslipupload/', UploadOutslipView.as_view(), name='outslipupload'),
    path('manage_upload/', ManageTripDetailView.as_view(), name='manageupload'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token-verify/', TokenVerifyView.as_view(), name='token_verify'),
    path('manage-upload-pics/', ManageUploadedPictures.as_view(), name='managepics'),
]   
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)