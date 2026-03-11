import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from fastapi import HTTPException
from typing import List
from pydantic import UUID4

from app.features.stacks.models.stack import Stack, StackType
from app.features.stacks.schemas.stack import StackCreate, StackBase

logger = logging.getLogger(__name__)

class StackService:
    @staticmethod
    async def list_all_stacks(db: AsyncSession) -> List[Stack]:
        result = await db.execute(select(Stack))
        return list(result.scalars().all())

    @staticmethod
    async def get_stack_by_name(name: str, db: AsyncSession) -> Stack:
        result = await db.execute(select(Stack).where(Stack.name.ilike(name)))
        stack = result.scalar_one_or_none()
        if not stack:
            raise HTTPException(status_code=404, detail="Stack not found")
        return stack

    @staticmethod
    async def get_stack_by_id(stack_id: UUID4, db: AsyncSession) -> Stack:
        result = await db.execute(select(Stack).where(Stack.id == stack_id))
        stack = result.scalar_one_or_none()
        if not stack:
            raise HTTPException(status_code=404, detail="Stack not found")
        return stack

    @staticmethod
    async def create_stack(stack_in: StackCreate, db: AsyncSession) -> Stack:
        db_stack = Stack(**stack_in.model_dump(exclude={"id"}))
        db.add(db_stack)
        await db.commit()
        await db.refresh(db_stack)
        return db_stack

    @staticmethod
    async def update_stack(stack_id: UUID4, stack_in: StackBase, db: AsyncSession) -> Stack:
        db_stack = await StackService.get_stack_by_id(stack_id, db)
        update_data = stack_in.model_dump(exclude_unset=True, exclude={"id"})
        for key, value in update_data.items():
            setattr(db_stack, key, value)
        await db.commit()
        await db.refresh(db_stack)
        return db_stack

    @staticmethod
    async def delete_stack(stack_id: UUID4, db: AsyncSession):
        db_stack = await StackService.get_stack_by_id(stack_id, db)
        await db.delete(db_stack)
        await db.commit()

    @staticmethod
    async def seed_default_stacks(db: AsyncSession):
        default_stacks = [
            {
                "name": "Python 3 Engine",
                "type": "backend",
                "icon_name": "Cpu",
                "description": "Standard Python 3.11 environment with git support for dynamic provisioning.",
                "dockerfile_template": "FROM python:3.11-slim\nWORKDIR /app\nRUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE 8000\nCMD ${START_COMMAND}",
                "default_port": 8000
            },
            {
                "name": "Node.js 20 Runtime",
                "type": "backend",
                "icon_name": "Box",
                "description": "Enterprise Node.js 20 execution environment for backend services.",
                "dockerfile_template": "FROM node:20-alpine\nWORKDIR /app\nRUN apk add --no-cache git\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE 3000\nCMD ${START_COMMAND}",
                "default_port": 3000
            },
            {
                "name": "Go Distributed Engine",
                "type": "backend",
                "icon_name": "Zap",
                "description": "High-concurrency Go 1.22 environment for microservices.",
                "dockerfile_template": "FROM golang:1.22-alpine\nWORKDIR /app\nRUN apk add --no-cache git\nCOPY go.mod go.sum* ./\nRUN go mod download\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE 8080\nCMD ${START_COMMAND}",
                "default_port": 8080
            },
            {
                "name": "React Frontend Edge",
                "type": "frontend",
                "icon_name": "Layout",
                "description": "Production-grade React environment using Nginx for static orchestration.",
                "dockerfile_template": "FROM node:20-alpine as build\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN ${BUILD_COMMAND}\n\nFROM nginx:stable-alpine\nCOPY --from=build /app/dist /usr/share/nginx/html\nEXPOSE 80\nCMD [\"nginx\", \"-g\", \"daemon off;\"]",
                "default_port": 80
            }
        ]
        
        for s in default_stacks:
            q = select(Stack).where(Stack.name == s["name"])
            res = await db.execute(q)
            if not res.scalar_one_or_none():
                db.add(Stack(**s))
        await db.commit()
