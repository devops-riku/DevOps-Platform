import logging
import re
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from typing import List
import uuid

from app.features.workspaces.models.workspace import Workspace
from app.features.workspaces.schemas.workspace import WorkspaceCreate, WorkspaceUpdate
from app.features.auth.models.user import User

logger = logging.getLogger(__name__)

class WorkspaceService:
    @staticmethod
    def slugify(text: str) -> str:
        text = text.lower().strip()
        text = re.sub(r'[^\w\s-]', '', text)
        text = re.sub(r'[\s_-]+', '-', text)
        text = re.sub(r'^-+|-+$', '', text)
        return text

    @staticmethod
    async def create_workspace(
        workspace_in: WorkspaceCreate,
        owner_id: uuid.UUID,
        db: AsyncSession
    ) -> Workspace:
        # Generate slug if not provided
        slug = workspace_in.slug or WorkspaceService.slugify(workspace_in.name)
        
        # Check if slug exists
        query = select(Workspace).where(Workspace.slug == slug)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            # If exists, append random chars or fail? Let's append short id
            slug = f"{slug}-{str(uuid.uuid4())[:8]}"

        db_workspace = Workspace(
            name=workspace_in.name,
            slug=slug,
            owner_id=owner_id,
            created_by=str(owner_id)
        )
        
        db.add(db_workspace)
        await db.commit()
        await db.refresh(db_workspace)
        return db_workspace

    @staticmethod
    async def get_user_workspaces(user_id: uuid.UUID, db: AsyncSession) -> List[Workspace]:
        query = select(Workspace).where(Workspace.owner_id == user_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_workspace_by_slug(slug: str, db: AsyncSession) -> Workspace:
        query = select(Workspace).where(Workspace.slug == slug)
        result = await db.execute(query)
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return workspace

    @staticmethod
    async def get_workspace_by_id(id: uuid.UUID, db: AsyncSession) -> Workspace:
        query = select(Workspace).where(Workspace.id == id)
        result = await db.execute(query)
        workspace = result.scalar_one_or_none()
        if not workspace:
            raise HTTPException(status_code=404, detail="Workspace not found")
        return workspace
