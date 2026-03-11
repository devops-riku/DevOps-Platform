import uuid
import enum
from sqlalchemy import String, Text, Integer, UUID
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base_class import Base

class StackType(str, enum.Enum):
    BACKEND = "backend"
    FRONTEND = "frontend"
    DATABASE = "database"

class Stack(Base):
    id: Mapped[uuid.UUID] = mapped_column(UUID, primary_key=True, index=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, unique=True, index=True) # e.g. "FastAPI"
    type: Mapped[StackType] = mapped_column(String) # backend, frontend, database
    
    # Template Configuration
    dockerfile_template: Mapped[str] = mapped_column(Text)
    default_port: Mapped[int] = mapped_column(Integer, default=8000)
    
    # Metadata for the UI
    description: Mapped[str | None] = mapped_column(String)
    icon_name: Mapped[str | None] = mapped_column(String) # For Lucide icon mapping
