import uuid
from sqlalchemy import String, ForeignKey, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base_class import Base
from typing import TYPE_CHECKING, Dict

if TYPE_CHECKING:
    from app.features.auth.models.user import User
    from app.features.workspaces.models.workspace import Workspace

class Project(Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("user.id"), nullable=False)
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("workspace.id"), nullable=True)
    name: Mapped[str] = mapped_column(String, index=True)
    github_repo_id: Mapped[str] = mapped_column(String)
    github_repo_name: Mapped[str] = mapped_column(String)
    github_repo_full_name: Mapped[str | None] = mapped_column(String)
    
    # Tech Stack
    backend_framework: Mapped[str | None] = mapped_column(String)
    frontend_framework: Mapped[str | None] = mapped_column(String)
    database_type: Mapped[str | None] = mapped_column(String)
    language: Mapped[str | None] = mapped_column(String)
    
    # Configuration
    branch: Mapped[str | None] = mapped_column(String)
    root_dir: Mapped[str | None] = mapped_column(String)
    build_command: Mapped[str | None] = mapped_column(String)
    start_command: Mapped[str | None] = mapped_column(String)
    deploy_type: Mapped[str] = mapped_column(String, default="pipeline")
    docker_config: Mapped[Dict | None] = mapped_column(JSON)
    
    env_vars: Mapped[Dict | None] = mapped_column(JSON)
    status: Mapped[str] = mapped_column(String, default="draft") # draft, deploying, active, failed
    
    # Deployment Info
    container_id: Mapped[str | None] = mapped_column(String)
    
    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="projects")
    workspace: Mapped["Workspace | None"] = relationship("Workspace", back_populates="projects")
