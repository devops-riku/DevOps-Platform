import uuid
from sqlalchemy import String, ForeignKey, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base
from typing import List, TYPE_CHECKING

if TYPE_CHECKING:
    from app.features.auth.models.user import User
    from app.features.projects.models.project import Project

class Workspace(Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, index=True)
    slug: Mapped[str] = mapped_column(String, unique=True, index=True)
    owner_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=False)
    
    # GitHub Integration
    github_id: Mapped[str | None] = mapped_column(String, nullable=True)
    github_access_token: Mapped[str | None] = mapped_column(String, nullable=True)
    
    # Relationships
    owner: Mapped["User"] = relationship("User", back_populates="owned_workspaces")
    projects: Mapped[List["Project"]] = relationship("Project", back_populates="workspace")
