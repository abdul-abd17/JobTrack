from django.db import models
from django.contrib.auth.models import User
from django.utils import timezone


class JobApplication(models.Model):
    """
    Core Job Application record owned by a specific user.
    """
    class Status(models.TextChoices):
        APPLIED = 'APPLIED', 'Applied'
        UNDER_REVIEW = 'UNDER_REVIEW', 'Under Review'
        SHORTLISTED = 'SHORTLISTED', 'Shortlisted'
        INTERVIEW = 'INTERVIEW', 'Interview Scheduled'
        REJECTED = 'REJECTED', 'Rejected'
        OFFERED = 'OFFERED', 'Offered'

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='job_applications',
        help_text="User who owns this job application"
    )
    company_name = models.CharField(max_length=150, db_index=True)
    job_title = models.CharField(max_length=150, db_index=True)
    job_location = models.CharField(max_length=150, blank=True, default='')
    salary = models.CharField(
        max_length=100,
        blank=True,
        default='',
        help_text="e.g., $95,000, $45/hr, or Competitive"
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.APPLIED,
        db_index=True
    )
    application_date = models.DateField(default=timezone.localdate)
    job_url = models.URLField(max_length=500, blank=True, default='')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-application_date', '-created_at']
        indexes = [
            models.Index(fields=['user', '-application_date']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['user', 'company_name']),
        ]

    def __str__(self):
        return f"{self.job_title} at {self.company_name} ({self.get_status_display()})"


class ApplicationActivity(models.Model):
    """
    Activity timeline entry tracking status changes and notes for a JobApplication.
    Explicitly tied to both the parent application and the owning user.
    """
    application = models.ForeignKey(
        JobApplication,
        on_delete=models.CASCADE,
        related_name='activities',
        help_text="Parent application for this activity record"
    )
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='application_activities',
        help_text="User who performed or owns this activity"
    )
    previous_status = models.CharField(max_length=30, blank=True, null=True)
    new_status = models.CharField(max_length=30)
    description = models.TextField(blank=True, default='', help_text="Optional description of status update")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['application', '-created_at']),
        ]

    def __str__(self):
        return f"{self.application.company_name} ({self.user.username}): {self.previous_status} -> {self.new_status}"
