import logging
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count, Q
from django.db.models.functions import TruncMonth
from django.utils import timezone

from .models import JobApplication, ApplicationActivity
from .serializers import (
    JobApplicationSerializer,
    ApplicationActivitySerializer,
)

logger = logging.getLogger(__name__)


class JobApplicationViewSet(viewsets.ModelViewSet):
    """
    ModelViewSet for JobApplication CRUD.
    Enforces strict user-level multi-tenant isolation and atomic activity recording.
    """
    serializer_class = JobApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['company_name', 'job_title', 'notes', 'job_location']
    ordering_fields = ['application_date', 'company_name', 'job_title', 'status', 'created_at']
    ordering = ['-application_date', '-created_at']

    def get_queryset(self):
        """
        Guarantees that each user only ever accesses their own applications.
        Also supports ?status= filter query parameter.
        """
        user = self.request.user
        queryset = JobApplication.objects.filter(user=user).prefetch_related('activities')

        # Filter by status query param if provided
        status_param = self.request.query_params.get('status')
        if status_param and status_param in JobApplication.Status.values:
            queryset = queryset.filter(status=status_param)

        return queryset

    @transaction.atomic
    def perform_create(self, serializer):
        """
        Atomically sets user ownership on creation and logs initial status activity.
        """
        application = serializer.save(user=self.request.user)
        logger.info(
            f"User {self.request.user.username} created application #{application.id} ({application.company_name})"
        )

        # Automatically record initial status activity atomically
        ApplicationActivity.objects.create(
            application=application,
            user=self.request.user,
            previous_status=None,
            new_status=application.status,
            description=f"Application created with initial status: {application.get_status_display()}"
        )

    @transaction.atomic
    def perform_update(self, serializer):
        """
        Atomically updates the application and records an activity record if status changed.
        """
        instance = self.get_object()
        old_status = instance.status

        # Notes or optional description passed during status transition
        custom_description = self.request.data.get('activity_description', '')

        updated_instance = serializer.save()

        if old_status != updated_instance.status:
            status_map = dict(JobApplication.Status.choices)
            desc = custom_description or (
                f"Status updated from '{status_map.get(old_status, old_status)}' "
                f"to '{updated_instance.get_status_display()}'"
            )

            ApplicationActivity.objects.create(
                application=updated_instance,
                user=self.request.user,
                previous_status=old_status,
                new_status=updated_instance.status,
                description=desc
            )
            logger.info(
                f"Status transition for app #{updated_instance.id}: {old_status} -> {updated_instance.status}"
            )

    @transaction.atomic
    def perform_destroy(self, instance):
        """
        Logs deletion of an application and atomically cascades.
        """
        logger.info(f"User {self.request.user.username} deleted application #{instance.id}")
        instance.delete()

    @action(detail=True, methods=['get'])
    def activities(self, request, pk=None):
        """
        GET /api/applications/{id}/activities/
        Returns the timestamped status activity history for a specific application.
        """
        application = self.get_object()  # Scoped to request.user
        activities = application.activities.filter(user=request.user).order_by('-created_at')
        serializer = ApplicationActivitySerializer(activities, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """
        GET /api/applications/stats/
        Returns dynamically aggregated metrics, status breakdowns, and monthly trends.
        Strictly isolated to request.user.
        """
        user = request.user
        user_apps = JobApplication.objects.filter(user=user)

        total_count = user_apps.count()

        # Aggregate counts by status
        status_aggregates = user_apps.aggregate(
            applied=Count('id', filter=Q(status=JobApplication.Status.APPLIED)),
            under_review=Count('id', filter=Q(status=JobApplication.Status.UNDER_REVIEW)),
            shortlisted=Count('id', filter=Q(status=JobApplication.Status.SHORTLISTED)),
            interview=Count('id', filter=Q(status=JobApplication.Status.INTERVIEW)),
            rejected=Count('id', filter=Q(status=JobApplication.Status.REJECTED)),
            offered=Count('id', filter=Q(status=JobApplication.Status.OFFERED)),
        )

        in_progress = (
            status_aggregates['applied']
            + status_aggregates['under_review']
            + status_aggregates['shortlisted']
            + status_aggregates['interview']
        )

        # Conversion rates
        interview_count = status_aggregates['interview'] + status_aggregates['offered']
        interview_rate = round((interview_count / total_count * 100), 1) if total_count > 0 else 0.0
        offer_rate = round((status_aggregates['offered'] / total_count * 100), 1) if total_count > 0 else 0.0

        # Monthly trends for chart visualization
        monthly_query = (
            user_apps
            .annotate(month=TruncMonth('application_date'))
            .values('month')
            .annotate(count=Count('id'))
            .order_by('month')
        )
        monthly_trend = [
            {
                "month": item['month'].strftime("%b %Y") if item['month'] else "Unknown",
                "count": item['count']
            }
            for item in monthly_query if item['month']
        ]

        # Recent 5 activity logs for quick dashboard activity feed
        recent_activities = ApplicationActivity.objects.filter(user=user).select_related('application')[:5]
        recent_activities_data = [
            {
                "id": act.id,
                "application_id": act.application.id,
                "company_name": act.application.company_name,
                "job_title": act.application.job_title,
                "previous_status": act.previous_status,
                "new_status": act.new_status,
                "new_status_display": dict(JobApplication.Status.choices).get(act.new_status, act.new_status),
                "description": act.description,
                "created_at": act.created_at.isoformat(),
            }
            for act in recent_activities
        ]

        return Response({
            "total_applications": total_count,
            "in_progress": in_progress,
            "status_breakdown": {
                "applied": status_aggregates['applied'],
                "under_review": status_aggregates['under_review'],
                "shortlisted": status_aggregates['shortlisted'],
                "interview_scheduled": status_aggregates['interview'],
                "interview": status_aggregates['interview'],  # Alias to support both key naming conventions
                "rejected": status_aggregates['rejected'],
                "offered": status_aggregates['offered'],
            },
            "rates": {
                "interview_rate": interview_rate,
                "offer_rate": offer_rate,
            },
            "monthly_trend": monthly_trend,
            "recent_activities": recent_activities_data,
        })


class ApplicationActivityViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only viewset for timeline activities.
    Guarantees that users only see activity logs belonging to their own user account.
    """
    serializer_class = ApplicationActivitySerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return ApplicationActivity.objects.filter(user=self.request.user).order_by('-created_at')
