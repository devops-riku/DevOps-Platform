from pydantic import BaseModel, ConfigDict, UUID4

class StackBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID4 | None = None
    name: str
    type: str # backend, frontend, database
    dockerfile_template: str
    default_port: int = 8000
    description: str | None = None
    icon_name: str | None = None

class StackCreate(StackBase):
    pass
