from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import JobApplicationViewSet, ApplicationActivityViewSet

router = DefaultRouter()
router.register(r'', JobApplicationViewSet, basename='job-application')
router.register(r'activities', ApplicationActivityViewSet, basename='application-activity')

urlpatterns = [
    path('', include(router.urls)),
]
