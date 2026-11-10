import re
from rest_framework import serializers
from django.utils import timezone
from urllib.parse import urlparse
from .models import JobApplication, ApplicationActivity


class ApplicationActivitySerializer(serializers.ModelSerializer):
    previous_status_display = serializers.SerializerMethodField()
    new_status_display = serializers.SerializerMethodField()

    class Meta:
        model = ApplicationActivity
        fields = (
            'id',
            'application',
            'user',
            'previous_status',
            'previous_status_display',
            'new_status',
            'new_status_display',
            'description',
            'created_at',
        )
        read_only_fields = ('id', 'user', 'created_at')

    def get_previous_status_display(self, obj):
        if not obj.previous_status:
            return None
        return dict(JobApplication.Status.choices).get(obj.previous_status, obj.previous_status)

    def get_new_status_display(self, obj):
        return dict(JobApplication.Status.choices).get(obj.new_status, obj.new_status)


class JobApplicationSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    activities = ApplicationActivitySerializer(many=True, read_only=True)

    class Meta:
        model = JobApplication
        fields = (
            'id',
            'company_name',
            'job_title',
            'job_location',
            'salary',
            'status',
            'status_display',
            'application_date',
            'job_url',
            'notes',
            'created_at',
            'updated_at',
            'activities',
        )
        read_only_fields = ('id', 'created_at', 'updated_at', 'activities')

    def validate_company_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Company name is required.")
        if len(val) > 150:
            raise serializers.ValidationError("Company name must not exceed 150 characters.")
        return val

    def validate_job_title(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Job title is required.")
        if len(val) > 150:
            raise serializers.ValidationError("Job title must not exceed 150 characters.")
        return val

    def validate_job_location(self, value):
        if value and len(value.strip()) > 150:
            raise serializers.ValidationError("Location must not exceed 150 characters.")
        return value.strip() if value else ''

    def validate_salary(self, value):
        if not value:
            return ''
        val = value.strip()
        if len(val) > 100:
            raise serializers.ValidationError("Salary must not exceed 100 characters.")
        
        # Check for negative numbers or invalid negative signs
        if re.search(r'-\s*\$?\d+', val) and not re.search(r'\d+\s*-\s*\$?\d+', val):
            raise serializers.ValidationError("Salary cannot be a negative amount.")

        # Require at least one alphanumeric character (prevent pure punctuation/scripts)
        if not re.search(r'[a-zA-Z0-9]', val):
            raise serializers.ValidationError("Salary must contain valid compensation text or numbers.")

        return val

    def validate_status(self, value):
        if value not in JobApplication.Status.values:
            valid_statuses = ", ".join(JobApplication.Status.values)
            raise serializers.ValidationError(
                f"Invalid status '{value}'. Allowed choices: {valid_statuses}."
            )
        return value

    def validate_application_date(self, value):
        # Allow today + 1 day to tolerate time zone differences
        tomorrow = timezone.localdate() + timezone.timedelta(days=1)
        if value > tomorrow:
            raise serializers.ValidationError("Application date cannot be in the future.")
        return value

    def validate_job_url(self, value):
        if not value:
            return ''
        url = value.strip()
        parsed = urlparse(url)
        if not parsed.scheme or not parsed.netloc:
            raise serializers.ValidationError(
                "Please enter a valid URL including http:// or https://"
            )
        if parsed.scheme not in ('http', 'https'):
            raise serializers.ValidationError("URL scheme must be either http:// or https://")
        return url
