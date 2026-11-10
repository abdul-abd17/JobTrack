from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.db import connection
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)

@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint returning system status and database connectivity.
    Ideal for container readiness/liveness probes and monitoring.
    """
    db_status = "healthy"
    db_error = None

    try:
        connection.ensure_connection()
    except Exception as e:
        logger.error(f"Health check database connection failure: {e}")
        db_status = "unhealthy"
        db_error = str(e)

    status_code = 200 if db_status == "healthy" else 503
    payload = {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "JobTrack API",
        "timestamp": timezone.now().isoformat(),
        "database": {
            "status": db_status,
            "engine": connection.settings_dict.get('ENGINE', 'unknown').split('.')[-1],
        }
    }
    if db_error:
        payload["database"]["error"] = db_error

    return Response(payload, status=status_code)

