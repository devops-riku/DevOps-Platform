import logging
import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.api.deps import get_current_user
from app.features.workspaces.schemas.workspace import WorkspaceBase, WorkspaceCreate
from app.features.workspaces.services.workspace_service import WorkspaceService
from app.features.auth.models.user import User

logger = logging.getLogger(__name__)
router = APIRouter()

@router.post("/", response_model=WorkspaceBase)
async def create_workspace(
    workspace_in: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new workspace for the current user."""
    return await WorkspaceService.create_workspace(workspace_in, current_user.id, db)

@router.get("/", response_model=List[WorkspaceBase])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List all workspaces the user owns."""
    return await WorkspaceService.get_user_workspaces(current_user.id, db)

@router.get("/by-id/{workspace_id}", response_model=WorkspaceBase)
async def get_workspace_by_id(
    workspace_id: uuid.UUID,
    db: AsyncSession = Depends(get_db)
):
    """Get workspace details by ID."""
    return await WorkspaceService.get_workspace_by_id(workspace_id, db)

@router.get("/{slug}", response_model=WorkspaceBase)
async def get_workspace(
    slug: str,
    db: AsyncSession = Depends(get_db)
):
    """Get workspace details by slug."""
    return await WorkspaceService.get_workspace_by_slug(slug, db)
