from django.urls import path
from .views import *
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
]   