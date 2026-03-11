from pydantic import BaseModel

class SyncRequest(BaseModel):
    access_token: str
    github_token: str | None = None
    workspace_id: str | None = None
