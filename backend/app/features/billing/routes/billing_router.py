import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict
from pydantic import BaseModel

from app.db.session import get_db
from app.features.billing.services.billing_service import BillingService

router = APIRouter()

class PlanSchema(BaseModel):
    id: uuid.UUID
    name: str
    price: float
    features: Dict | None
    currency: str
    interval: str

class SubscriptionRequest(BaseModel):
    plan_id: uuid.UUID
    user_id: uuid.UUID

@router.get("/plans", response_model=List[PlanSchema])
async def get_plans(db: AsyncSession = Depends(get_db)):
    return await BillingService.get_plans(db)

@router.post("/subscribe")
async def subscribe(request: SubscriptionRequest, db: AsyncSession = Depends(get_db)):
    # In a real app, this would integrate with Stripe but for now we just 
    # mock it and proceed when clicked "Subscribe"
    try:
        sub = await BillingService.create_subscription(
            user_id=request.user_id,
            plan_id=request.plan_id,
            db=db
        )
        return {"status": "success", "subscription_id": str(sub.id)}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/seed-plans")
async def seed_plans(db: AsyncSession = Depends(get_db)):
    await BillingService.seed_default_plans(db)
    return {"status": "success", "message": "Default plans seeded."}
