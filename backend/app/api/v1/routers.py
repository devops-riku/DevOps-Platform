from fastapi import APIRouter
from app.features.github.routes.github_router import router as github_router
from app.features.auth.routes.auth_router import router as auth_router
from app.features.projects.routes.project_router import router as project_router
from app.features.stacks.routes.stack_router import router as stack_router
from app.features.workspaces.routes.workspace_router import router as workspace_router

from app.features.metrics.routes.metrics_router import router as metrics_router
from app.features.billing.routes.billing_router import router as billing_router

api_v1_router = APIRouter()

api_v1_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_v1_router.include_router(github_router, prefix="/github", tags=["github"])
api_v1_router.include_router(project_router, prefix="/projects", tags=["projects"])
api_v1_router.include_router(stack_router, prefix="/stacks", tags=["stacks"])
api_v1_router.include_router(workspace_router, prefix="/workspaces", tags=["workspaces"])
api_v1_router.include_router(metrics_router, prefix="/metrics", tags=["metrics"])
api_v1_router.include_router(billing_router, prefix="/billing", tags=["billing"])
