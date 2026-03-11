from fastapi import APIRouter
from app.features.metrics.services.metrics_service import MetricsService

router = APIRouter()

@router.get("/")
async def get_metrics():
    """Get system-wide performance metrics."""
    return MetricsService.get_system_metrics()
