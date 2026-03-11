from pydantic import BaseModel
from typing import List

class Repository(BaseModel):
    id: int
    name: str
    full_name: str
    html_url: str
    description: str | None = None
    stargazers_count: int

class Organization(BaseModel):
    id: int
    login: str
    avatar_url: str | None = None
    description: str | None = None
