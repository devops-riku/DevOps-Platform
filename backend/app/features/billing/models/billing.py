import uuid
from sqlalchemy import String, ForeignKey, UUID, Float, Boolean, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base
from typing import TYPE_CHECKING, Dict, List

if TYPE_CHECKING:
    from app.features.auth.models.user import User

class Plan(Base):
    __tablename__ = "plan"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True)
    price: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String, default="USD")
    interval: Mapped[str] = mapped_column(String, default="month") # month, year
    features: Mapped[Dict | None] = mapped_column(JSON) # e.g., {"ram": "2GB", "cpu": "1 vCPU"}
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Relationships
    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="plan")

class Subscription(Base):
    __tablename__ = "subscription"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), unique=True)
    plan_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("plan.id"))
    status: Mapped[str] = mapped_column(String, default="active") # active, cancelled, expired
    
    # Relationships
    user: Mapped["User"] = relationship("User", backref="subscription_record")
    plan: Mapped["Plan"] = relationship("Plan", back_populates="subscriptions")
