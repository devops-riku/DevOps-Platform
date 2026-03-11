import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
from fastapi import HTTPException

from app.features.billing.models.billing import Plan, Subscription
from app.features.auth.models.user import User

class BillingService:
    @staticmethod
    async def get_plans(db: AsyncSession) -> List[Plan]:
        query = select(Plan).where(Plan.is_active == True)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def get_plan_by_id(plan_id: str, db: AsyncSession) -> Optional[Plan]:
        query = select(Plan).where(Plan.id == uuid.UUID(plan_id))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    @staticmethod
    async def create_plan(plan_data: dict, db: AsyncSession) -> Plan:
        new_plan = Plan(**plan_data)
        db.add(new_plan)
        await db.commit()
        await db.refresh(new_plan)
        return new_plan

    @staticmethod
    async def create_subscription(user_id: uuid.UUID, plan_id: uuid.UUID, db: AsyncSession) -> Subscription:
        # Check if user already has a subscription
        query = select(Subscription).where(Subscription.user_id == user_id)
        result = await db.execute(query)
        existing_sub = result.scalar_one_or_none()
        
        if existing_sub:
            existing_sub.plan_id = plan_id
            existing_sub.status = "active"
            sub = existing_sub
        else:
            sub = Subscription(user_id=user_id, plan_id=plan_id, status="active")
            db.add(sub)
            
        # Update user's is_subscribed flag
        query_user = select(User).where(User.id == user_id)
        res_user = await db.execute(query_user)
        user = res_user.scalar_one_or_none()
        if user:
            user.is_subscribed = True
            
        await db.commit()
        await db.refresh(sub)
        return sub

    @staticmethod
    async def seed_default_plans(db: AsyncSession):
        # Check if plans exist
        plans = await BillingService.get_plans(db)
        if len(plans) > 0:
            return

        default_plans = [
            {
                "name": "Starter",
                "price": 7.0,
                "features": {"ram": "512MB", "cpu": "0.5 vCPU", "bandwidth": "100GB"},
                "is_active": True
            },
            {
                "name": "Standard",
                "price": 25.0,
                "features": {"ram": "2GB", "cpu": "1 vCPU", "bandwidth": "500GB"},
                "is_active": True
            },
            {
                "name": "Pro",
                "price": 85.0,
                "features": {"ram": "4GB", "cpu": "2 vCPU", "bandwidth": "2TB"},
                "is_active": True
            }
        ]
        
        for plan_info in default_plans:
            db.add(Plan(**plan_info))
        
        await db.commit()
