import uuid
from sqlalchemy import String, Boolean, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.features.projects.models.project import Project
    from app.features.workspaces.models.workspace import Workspace

class User(Base):
    __tablename__ = "user"
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    full_name: Mapped[str | None] = mapped_column(String, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_subscribed: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Relationships
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="user")
    owned_workspaces: Mapped[List["Workspace"]] = relationship("Workspace", back_populates="owner")
