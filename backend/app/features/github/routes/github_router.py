import logging
from typing import List
from fastapi import APIRouter, HTTPException

from app.features.github.schemas.github import Organization, Repository
from app.features.github.services.github_service import GitHubService

logger = logging.getLogger(__name__)
router = APIRouter()

@router.get("/orgs", response_model=List[Organization])
async def list_organizations(github_token: str):
    """
    List organizations the authenticated user belongs to.
    """
    return await GitHubService.list_user_organizations(github_token)

@router.get("/repos", response_model=List[Repository])
async def list_repositories(github_token: str, org: str | None = None):
    """
    List repositories for the authenticated user or a specific organization.
    """
    return await GitHubService.list_repositories(github_token, org)

@router.get("/repos/{owner}/{repo}/branches")
async def list_branches(github_token: str, owner: str, repo: str):
    """
    List branches for a specific repository.
    """
    return await GitHubService.list_branches(github_token, owner, repo)
