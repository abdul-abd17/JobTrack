import os
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta
from applications.models import JobApplication, ApplicationActivity


class Command(BaseCommand):
    help = "Seeds realistic demo job applications and status activity timelines for demonstration"

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default='demo_candidate',
            help='Username for demo account (default: demo_candidate)'
        )
        parser.add_argument(
            '--password',
            type=str,
            default=None,
            help='Password for demo account (required if running with DEBUG=False)'
        )
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Clear existing applications for this user before seeding'
        )

    def handle(self, *args, **options):
        username = options['username']
        password = options['password']
        should_clear = options['clear']

        # Production Guard: prevent default predictable passwords in production environments
        if not settings.DEBUG and not password:
            raise CommandError(
                "Security violation: When DEBUG=False, you must explicitly supply a secure password via --password <your_password>."
            )

        if not password:
            password = 'DemoPassword123!'
            self.stdout.write(self.style.WARNING(
                "Development Notice: Using default demo password 'DemoPassword123!'. Do NOT use in production."
            ))

        self.stdout.write(self.style.NOTICE(f"Setting up demo account '{username}'..."))

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': f'{username}@jobtrack.dev',
                'first_name': 'Alex',
                'last_name': 'Rivera',
            }
        )
        user.set_password(password)
        user.save()

        if created:
            self.stdout.write(self.style.SUCCESS(f"Created demo user: {username}"))
        else:
            self.stdout.write(self.style.SUCCESS(f"Updated credentials for demo user: {username}"))

        if should_clear:
            deleted_count, _ = JobApplication.objects.filter(user=user).delete()
            self.stdout.write(self.style.WARNING(f"Cleared {deleted_count} existing applications for {username}"))

        # Check if already seeded and clear wasn't specified
        if JobApplication.objects.filter(user=user).exists() and not should_clear:
            self.stdout.write(self.style.WARNING(
                f"User {username} already has applications. Pass --clear to replace them."
            ))
            return

        today = timezone.localdate()

        demo_dataset = [
            {
                'company_name': 'Figma',
                'job_title': 'Frontend Systems Engineer',
                'job_location': 'San Francisco, CA (Hybrid)',
                'salary': '$155,000',
                'status': JobApplication.Status.OFFERED,
                'days_ago': 28,
                'job_url': 'https://www.figma.com/careers/',
                'notes': 'Referred by university mentor. Completed 4 technical rounds and system design.',
                'timeline': [
                    (None, 'APPLIED', 28, 'Applied via employee referral link'),
                    ('APPLIED', 'UNDER_REVIEW', 22, 'Recruiter screening call with Talent team'),
                    ('UNDER_REVIEW', 'INTERVIEW', 14, 'Passed technical screen; scheduled onsite rounds'),
                    ('INTERVIEW', 'OFFERED', 3, 'Received formal offer letter with signing bonus!'),
                ]
            },
            {
                'company_name': 'Stripe',
                'job_title': 'Software Engineer Intern - Core Payments',
                'job_location': 'Seattle, WA',
                'salary': '$62/hr + housing',
                'status': JobApplication.Status.INTERVIEW,
                'days_ago': 21,
                'job_url': 'https://stripe.com/jobs/',
                'notes': 'Focus on distributed systems and transaction processing reliability.',
                'timeline': [
                    (None, 'APPLIED', 21, 'Submitted resume and portfolio on university portal'),
                    ('APPLIED', 'SHORTLISTED', 16, 'Passed automated coding challenge (100% test cases)'),
                    ('SHORTLISTED', 'INTERVIEW', 5, 'Technical interview with Senior Staff Engineer scheduled for Thursday'),
                ]
            },
            {
                'company_name': 'Netflix',
                'job_title': 'Backend Platform Engineer',
                'job_location': 'Los Gatos, CA',
                'salary': '$180,000',
                'status': JobApplication.Status.UNDER_REVIEW,
                'days_ago': 14,
                'job_url': 'https://jobs.netflix.com/',
                'notes': 'Cloud infrastructure and microservices team.',
                'timeline': [
                    (None, 'APPLIED', 14, 'Applied via job board posting'),
                    ('APPLIED', 'UNDER_REVIEW', 7, 'Application in review with Engineering Director'),
                ]
            },
            {
                'company_name': 'Datadog',
                'job_title': 'Full Stack Developer',
                'job_location': 'New York, NY',
                'salary': '$145,000',
                'status': JobApplication.Status.SHORTLISTED,
                'days_ago': 18,
                'job_url': 'https://www.datadoghq.com/careers/',
                'notes': 'Telemetry visualizations and dashboarding infrastructure.',
                'timeline': [
                    (None, 'APPLIED', 18, 'Applied with tailored cover letter and project links'),
                    ('APPLIED', 'SHORTLISTED', 9, 'Shortlisted for behavioral and team-fit chat'),
                ]
            },
            {
                'company_name': 'Spotify',
                'job_title': 'Web Infrastructure Engineer',
                'job_location': 'Remote (US)',
                'salary': '$150,000',
                'status': JobApplication.Status.APPLIED,
                'days_ago': 4,
                'job_url': 'https://www.lifeatspotify.com/jobs',
                'notes': 'Web playback performance and client architecture.',
                'timeline': [
                    (None, 'APPLIED', 4, 'Direct application on company website'),
                ]
            },
            {
                'company_name': 'Airbnb',
                'job_title': 'Software Engineer - Guest Experience',
                'job_location': 'Remote',
                'salary': '$165,000',
                'status': JobApplication.Status.REJECTED,
                'days_ago': 35,
                'job_url': 'https://careers.airbnb.com/',
                'notes': 'Position closed due to high applicant volume. Invited to reapply next quarter.',
                'timeline': [
                    (None, 'APPLIED', 35, 'Initial application submitted'),
                    ('APPLIED', 'UNDER_REVIEW', 25, 'Profile under review'),
                    ('UNDER_REVIEW', 'REJECTED', 10, 'Received automated update that the position has been filled'),
                ]
            },
            {
                'company_name': 'Google',
                'job_title': 'Software Engineer - Google Cloud',
                'job_location': 'Sunnyvale, CA',
                'salary': '$160,000',
                'status': JobApplication.Status.INTERVIEW,
                'days_ago': 40,
                'job_url': 'https://www.google.com/about/careers/applications/jobs/results/',
                'notes': 'Cloud run and container orchestration team.',
                'timeline': [
                    (None, 'APPLIED', 40, 'Application submitted with university transcript'),
                    ('APPLIED', 'SHORTLISTED', 28, 'Recruiter reached out for phone screen'),
                    ('SHORTLISTED', 'INTERVIEW', 12, 'Virtual onsite interviews completed; waiting for committee review'),
                ]
            },
            {
                'company_name': 'Apple',
                'job_title': 'Software Engineer - Tools & Frameworks',
                'job_location': 'Cupertino, CA',
                'salary': '$170,000',
                'status': JobApplication.Status.APPLIED,
                'days_ago': 6,
                'job_url': 'https://www.apple.com/careers/us/',
                'notes': 'Developer tools and build system optimization.',
                'timeline': [
                    (None, 'APPLIED', 6, 'Applied directly via Apple Jobs portal'),
                ]
            },
        ]

        self.stdout.write(f"Seeding {len(demo_dataset)} applications with activity histories...")

        for data in demo_dataset:
            app_date = today - timedelta(days=data['days_ago'])
            app = JobApplication.objects.create(
                user=user,
                company_name=data['company_name'],
                job_title=data['job_title'],
                job_location=data['job_location'],
                salary=data['salary'],
                status=data['status'],
                application_date=app_date,
                job_url=data['job_url'],
                notes=data['notes']
            )

            for prev_st, new_st, days_prior, desc in data['timeline']:
                act_time = timezone.now() - timedelta(days=days_prior)
                act = ApplicationActivity.objects.create(
                    application=app,
                    user=user,
                    previous_status=prev_st,
                    new_status=new_st,
                    description=desc
                )
                ApplicationActivity.objects.filter(pk=act.pk).update(created_at=act_time)

        self.stdout.write(self.style.SUCCESS(
            f"\nSuccess! Demo dataset populated for '{username}'.\n"
            f"Credentials:\n"
            f"  Username: {username}\n"
            f"  Password: {password}\n"
            f"Total Applications: {len(demo_dataset)}\n"
        ))
