from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APIClient
from datetime import timedelta

from .models import JobApplication, ApplicationActivity


class JobApplicationTests(TestCase):
    def setUp(self):
        self.client = APIClient()

        # Create two distinct users for isolation tests
        self.user_a = User.objects.create_user(
            username='usera',
            email='usera@example.com',
            password='Password123!'
        )
        self.user_b = User.objects.create_user(
            username='userb',
            email='userb@example.com',
            password='Password123!'
        )

        self.list_url = '/api/applications/'
        self.stats_url = '/api/applications/stats/'

        # Seed an application for user_a
        self.app_a = JobApplication.objects.create(
            user=self.user_a,
            company_name='Stripe',
            job_title='Software Engineer Intern',
            job_location='Remote',
            salary='$50/hr',
            status=JobApplication.Status.APPLIED,
            application_date=timezone.localdate(),
            job_url='https://stripe.com/jobs/123',
            notes='Initial application via referral'
        )
        ApplicationActivity.objects.create(
            application=self.app_a,
            user=self.user_a,
            previous_status=None,
            new_status=JobApplication.Status.APPLIED,
            description='Initial application created'
        )

    # -------------------------------------------------------------
    # 1. CRUD Operations & Status Activity Timeline
    # -------------------------------------------------------------
    def test_create_application_success(self):
        """Test creating an application sets owner and automatically creates activity record."""
        self.client.force_authenticate(user=self.user_a)
        payload = {
            'company_name': 'Google',
            'job_title': 'Frontend Engineer',
            'job_location': 'Mountain View, CA',
            'salary': '$120,000',
            'status': 'APPLIED',
            'application_date': str(timezone.localdate()),
            'job_url': 'https://google.com/careers/456',
            'notes': 'Excited about the design system team',
        }
        response = self.client.post(self.list_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['company_name'], 'Google')

        created_app = JobApplication.objects.get(id=response.data['id'])
        self.assertEqual(created_app.user, self.user_a)

        # Verify automated initial activity record creation
        activities = ApplicationActivity.objects.filter(application=created_app)
        self.assertEqual(activities.count(), 1)
        self.assertIsNone(activities.first().previous_status)
        self.assertEqual(activities.first().new_status, 'APPLIED')
        self.assertEqual(activities.first().user, self.user_a)

    def test_status_change_creates_timeline_activity(self):
        """Test updating application status automatically creates an activity entry."""
        self.client.force_authenticate(user=self.user_a)
        update_url = f"{self.list_url}{self.app_a.id}/"
        payload = {
            'company_name': 'Stripe',
            'job_title': 'Software Engineer Intern',
            'status': 'INTERVIEW',
            'activity_description': 'Technical screen scheduled for Thursday',
        }
        response = self.client.patch(update_url, payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], 'INTERVIEW')

        # Check activities
        activities = ApplicationActivity.objects.filter(application=self.app_a).order_by('-created_at')
        self.assertEqual(activities.count(), 2)
        latest_activity = activities.first()
        self.assertEqual(latest_activity.previous_status, 'APPLIED')
        self.assertEqual(latest_activity.new_status, 'INTERVIEW')
        self.assertIn('Technical screen scheduled', latest_activity.description)

    def test_delete_application(self):
        """Test deleting an application cascade-removes activities."""
        self.client.force_authenticate(user=self.user_a)
        delete_url = f"{self.list_url}{self.app_a.id}/"
        response = self.client.delete(delete_url)
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(JobApplication.objects.filter(id=self.app_a.id).exists())
        self.assertFalse(ApplicationActivity.objects.filter(application_id=self.app_a.id).exists())

    # -------------------------------------------------------------
    # 2. Strict Multi-User Data Isolation Tests
    # -------------------------------------------------------------
    def test_user_cannot_view_other_users_applications_list(self):
        """Test user B cannot see user A's application in the listing."""
        self.client.force_authenticate(user=self.user_b)
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 0)

    def test_user_cannot_retrieve_other_users_application_by_id(self):
        """Test user B querying user A's application ID gets 404 Not Found."""
        self.client.force_authenticate(user=self.user_b)
        url = f"{self.list_url}{self.app_a.id}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_user_cannot_update_other_users_application(self):
        """Test user B cannot edit user A's application."""
        self.client.force_authenticate(user=self.user_b)
        url = f"{self.list_url}{self.app_a.id}/"
        response = self.client.patch(url, {'status': 'OFFERED'}, format='json')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.app_a.refresh_from_db()
        self.assertEqual(self.app_a.status, 'APPLIED')

    def test_user_cannot_delete_other_users_application(self):
        """Test user B cannot delete user A's application."""
        self.client.force_authenticate(user=self.user_b)
        url = f"{self.list_url}{self.app_a.id}/"
        response = self.client.delete(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(JobApplication.objects.filter(id=self.app_a.id).exists())

    def test_user_cannot_access_other_users_application_activities(self):
        """Test user B cannot retrieve user A's application activity timeline."""
        self.client.force_authenticate(user=self.user_b)
        url = f"{self.list_url}{self.app_a.id}/activities/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_stats_are_isolated_per_user(self):
        """Test dashboard statistics strictly reflect the requesting user's data."""
        self.client.force_authenticate(user=self.user_a)
        resp_a = self.client.get(self.stats_url)
        self.assertEqual(resp_a.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_a.data['total_applications'], 1)
        self.assertEqual(resp_a.data['status_breakdown']['applied'], 1)

        self.client.force_authenticate(user=self.user_b)
        resp_b = self.client.get(self.stats_url)
        self.assertEqual(resp_b.status_code, status.HTTP_200_OK)
        self.assertEqual(resp_b.data['total_applications'], 0)
        self.assertEqual(resp_b.data['status_breakdown']['applied'], 0)

    # -------------------------------------------------------------
    # 3. Validation Tests (including enhanced salary tests)
    # -------------------------------------------------------------
    def test_validation_blank_company_name(self):
        """Test blank company name raises field validation error."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.list_url, {
            'company_name': '   ',
            'job_title': 'Backend Developer',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('company_name', response.data)

    def test_validation_blank_job_title(self):
        """Test blank job title raises field validation error."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.list_url, {
            'company_name': 'Microsoft',
            'job_title': '   ',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job_title', response.data)

    def test_validation_invalid_salary_values(self):
        """Test invalid salary formats (negative numbers, symbols only)."""
        self.client.force_authenticate(user=self.user_a)
        
        # Test negative salary
        neg_resp = self.client.post(self.list_url, {
            'company_name': 'Company X',
            'job_title': 'Dev',
            'salary': '-$50000',
        }, format='json')
        self.assertEqual(neg_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('salary', neg_resp.data)

        # Test pure symbols
        sym_resp = self.client.post(self.list_url, {
            'company_name': 'Company Y',
            'job_title': 'Dev',
            'salary': '$$$###@@@',
        }, format='json')
        self.assertEqual(sym_resp.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('salary', sym_resp.data)

    def test_validation_valid_salary_formats(self):
        """Test various valid salary formats are accepted."""
        self.client.force_authenticate(user=self.user_a)
        valid_salaries = ['$95,000', '$45 - $55/hr', 'Competitive', '120k', '€70,000']
        for sal in valid_salaries:
            resp = self.client.post(self.list_url, {
                'company_name': f'Company for {sal}',
                'job_title': 'Software Engineer',
                'salary': sal,
            }, format='json')
            self.assertEqual(resp.status_code, status.HTTP_201_CREATED)

    def test_validation_invalid_status_choice(self):
        """Test status outside predefined enum raises validation error."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.list_url, {
            'company_name': 'Microsoft',
            'job_title': 'Software Engineer',
            'status': 'HIRED_IMMEDIATELY',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('status', response.data)

    def test_validation_future_date(self):
        """Test application date far in the future raises validation error."""
        self.client.force_authenticate(user=self.user_a)
        future_date = timezone.localdate() + timedelta(days=30)
        response = self.client.post(self.list_url, {
            'company_name': 'Amazon',
            'job_title': 'SDE I',
            'application_date': str(future_date),
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('application_date', response.data)

    def test_validation_malformed_url(self):
        """Test invalid job URL format is rejected."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.post(self.list_url, {
            'company_name': 'Apple',
            'job_title': 'iOS Engineer',
            'job_url': 'not-a-valid-url-without-scheme',
        }, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('job_url', response.data)

    # -------------------------------------------------------------
    # 4. Pagination and Sorting Tests
    # -------------------------------------------------------------
    def test_pagination(self):
        """Test pagination limits to 20 per page with next link."""
        self.client.force_authenticate(user=self.user_a)
        # We already have 1 app (self.app_a). Let's create 24 more for a total of 25.
        apps_to_create = [
            JobApplication(
                user=self.user_a,
                company_name=f'Company #{i:02d}',
                job_title='Engineer',
                application_date=timezone.localdate() - timedelta(days=i)
            )
            for i in range(1, 25)
        ]
        JobApplication.objects.bulk_create(apps_to_create)

        # Page 1
        page1_resp = self.client.get(self.list_url)
        self.assertEqual(page1_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(page1_resp.data['count'], 25)
        self.assertEqual(len(page1_resp.data['results']), 20)
        self.assertIsNotNone(page1_resp.data['next'])
        self.assertIsNone(page1_resp.data['previous'])

        # Page 2
        page2_resp = self.client.get(f"{self.list_url}?page=2")
        self.assertEqual(page2_resp.status_code, status.HTTP_200_OK)
        self.assertEqual(len(page2_resp.data['results']), 5)
        self.assertIsNone(page2_resp.data['next'])
        self.assertIsNotNone(page2_resp.data['previous'])

    def test_sorting_by_company_name(self):
        """Test sorting query parameter ?ordering=company_name and -company_name."""
        self.client.force_authenticate(user=self.user_a)
        JobApplication.objects.create(
            user=self.user_a,
            company_name='Alpha Corp',
            job_title='Dev',
            application_date=timezone.localdate()
        )
        JobApplication.objects.create(
            user=self.user_a,
            company_name='Zeta Corp',
            job_title='Dev',
            application_date=timezone.localdate()
        )

        # Ascending
        asc_resp = self.client.get(f"{self.list_url}?ordering=company_name")
        self.assertEqual(asc_resp.status_code, status.HTTP_200_OK)
        first_asc = asc_resp.data['results'][0]['company_name']
        self.assertEqual(first_asc, 'Alpha Corp')

        # Descending
        desc_resp = self.client.get(f"{self.list_url}?ordering=-company_name")
        self.assertEqual(desc_resp.status_code, status.HTTP_200_OK)
        first_desc = desc_resp.data['results'][0]['company_name']
        self.assertEqual(first_desc, 'Zeta Corp')

    # -------------------------------------------------------------
    # 5. Search and Filter Tests
    # -------------------------------------------------------------
    def test_filter_by_status(self):
        """Test filtering by status query parameter."""
        JobApplication.objects.create(
            user=self.user_a,
            company_name='Meta',
            job_title='Production Engineer',
            status=JobApplication.Status.OFFERED,
            application_date=timezone.localdate()
        )
        self.client.force_authenticate(user=self.user_a)

        response = self.client.get(f"{self.list_url}?status=OFFERED")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['company_name'], 'Meta')

    def test_search_by_company_and_title(self):
        """Test full-text search by company name."""
        self.client.force_authenticate(user=self.user_a)
        response = self.client.get(f"{self.list_url}?search=Stripe")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['company_name'], 'Stripe')

    # -------------------------------------------------------------
    # 6. Unauthorized Requests
    # -------------------------------------------------------------
    def test_unauthorized_access_denied(self):
        """Test unauthenticated requests receive 401 Unauthorized."""
        response = self.client.get(self.list_url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

        stats_resp = self.client.get(self.stats_url)
        self.assertEqual(stats_resp.status_code, status.HTTP_401_UNAUTHORIZED)
