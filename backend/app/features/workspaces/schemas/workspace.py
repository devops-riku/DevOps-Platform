from pydantic import BaseModel, ConfigDict, UUID4
from typing import List

class WorkspaceBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID4 | None = None
    name: str
    slug: str
    github_id: str | None = None
    github_access_token: str | None = None

class WorkspaceCreate(BaseModel):
    name: str
    slug: str | None = None # Can be auto-generated from name if not provided

class WorkspaceUpdate(BaseModel):
    name: str | None = None
    slug: str | None = None
