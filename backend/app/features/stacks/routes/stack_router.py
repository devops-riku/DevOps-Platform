import logging
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import UUID4

from app.db.session import get_db
from app.features.stacks.schemas.stack import StackBase, StackCreate
from app.features.stacks.services.stack_service import StackService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/", response_model=List[StackBase])
async def list_stacks(db: AsyncSession = Depends(get_db)):
    """List all available tech stacks."""
    return await StackService.list_all_stacks(db)

@router.get("/by-name/{name}", response_model=StackBase)
async def get_stack_by_name(name: str, db: AsyncSession = Depends(get_db)):
    return await StackService.get_stack_by_name(name, db)

@router.get("/{stack_id}", response_model=StackBase)
async def get_stack_by_id(stack_id: UUID4, db: AsyncSession = Depends(get_db)):
    return await StackService.get_stack_by_id(stack_id, db)

@router.post("/", response_model=dict)
async def create_stack(stack_in: StackCreate, db: AsyncSession = Depends(get_db)):
    stack = await StackService.create_stack(stack_in, db)
    return {"status": "success", "id": str(stack.id)}

@router.put("/{stack_id}", response_model=dict)
async def update_stack(stack_id: UUID4, stack_in: StackBase, db: AsyncSession = Depends(get_db)):
    stack = await StackService.update_stack(stack_id, stack_in, db)
    return {"status": "updated", "id": str(stack.id)}

@router.delete("/{stack_id}", response_model=dict)
async def delete_stack(stack_id: UUID4, db: AsyncSession = Depends(get_db)):
    await StackService.delete_stack(stack_id, db)
    return {"status": "deleted"}

@router.post("/seed", response_model=dict)
async def seed_stacks(db: AsyncSession = Depends(get_db)):
    """Seed initial tech stacks."""
    await StackService.seed_default_stacks(db)
    return {"status": "seeded"}
