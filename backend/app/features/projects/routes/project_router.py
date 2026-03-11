import logging
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import redis.asyncio as redis

from app.db.session import get_db
from app.core.redis import get_redis
from app.features.projects.schemas.project import ProjectCreate
from app.features.projects.services.project_service import ProjectService
from app.api.deps import get_current_user
from app.features.auth.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=dict)
async def create_project(
    project_in: ProjectCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    project = await ProjectService.create_project(project_in, current_user.email, db, redis_client)
    return {"status": "success", "id": str(project.id)}

@router.get("/", response_model=List[dict])
async def list_projects(
    workspace_id: str | None = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    projects = await ProjectService.get_workspace_projects(current_user.email, workspace_id, db)
    
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "repo": p.github_repo_name,
            "repo_full_name": p.github_repo_full_name,
            "status": p.status,
            "deploy_type": p.deploy_type,
            "branch": p.branch,
            "build_command": p.build_command,
            "start_command": p.start_command,
            "root_dir": p.root_dir,
            "container_id": p.container_id,
            "url": f"http://{p.github_repo_name}.localhost" if p.status == 'active' else None
        }
        for p in projects
    ]

@router.post("/{project_id}/redeploy")
async def redeploy_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    await ProjectService.redeploy_project(project_id, current_user.email, db, redis_client)
    return {"status": "success"}

@router.post("/{project_id}/cancel")
async def cancel_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await ProjectService.cancel_project(project_id, db)
    return {"status": "success"}

@router.get("/{project_id}/logs")
async def get_project_logs(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    redis_client: redis.Redis = Depends(get_redis)
):
    logs = await ProjectService.get_project_logs(project_id, db, redis_client)
    return {"logs": logs}

@router.patch("/internal/{project_id}/status")
async def update_status_internal(
    project_id: str,
    data: dict,
    db: AsyncSession = Depends(get_db)
):
    await ProjectService.update_project(project_id, data, db)
    return {"status": "updated"}

@router.delete("/{project_id}")
async def delete_project(
    project_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await ProjectService.delete_project(project_id, db)
    return {"status": "deleted"}

@router.get("/admin/all", response_model=List[dict])
async def list_all_projects_admin(
    db: AsyncSession = Depends(get_db),
    # In a real app we'd check if current_user.is_admin
):
    projects = await ProjectService.get_all_projects(db)
    return [
        {
            "id": str(p.id),
            "name": p.name,
            "user_email": p.user.email,
            "status": p.status,
            "runtime": p.language,
            "repo": p.github_repo_name,
            "container_id": p.container_id,
        }
        for p in projects
    ]
