import httpx
import logging
from fastapi import HTTPException
from typing import List

from app.features.github.schemas.github import Organization, Repository

logger = logging.getLogger(__name__)

class GitHubService:
    @staticmethod
    async def list_user_organizations(github_token: str) -> List[dict]:
        """
        List organizations the authenticated user belongs to.
        """
        async with httpx.AsyncClient() as client:
            response = await client.get(
                "https://api.github.com/user/orgs",
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "DevOps-Platform"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to fetch organizations: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Failed to fetch organizations: {response.text}"
                )
            
            orgs = response.json()
            logger.info(f"✅ Fetched {len(orgs)} organizations")
            return orgs

    @staticmethod
    async def list_repositories(github_token: str, org: str | None = None) -> List[dict]:
        """
        List repositories for the authenticated user or a specific organization.
        """
        url = "https://api.github.com/user/repos"
        if org:
            url = f"https://api.github.com/orgs/{org}/repos"

        async with httpx.AsyncClient() as client:
            # For /user/repos, we want to see everything by default
            params = {"sort": "updated", "per_page": 100, "visibility": "all"}
            if not org:
                params["affiliation"] = "owner,collaborator,organization_member"

            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "DevOps-Platform"
                },
                params=params
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to fetch repositories: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Failed to fetch repositories from GitHub: {response.text}"
                )
                
            repos = response.json()
            logger.info(f"✅ Fetched {len(repos)} repositories (context: {org or 'personal'})")
            return repos

    @staticmethod
    async def list_branches(github_token: str, owner: str, repo: str) -> List[dict]:
        """
        List branches for a specific repository.
        """
        url = f"https://api.github.com/repos/{owner}/{repo}/branches"
        
        async with httpx.AsyncClient() as client:
            response = await client.get(
                url,
                headers={
                    "Authorization": f"Bearer {github_token}",
                    "Accept": "application/vnd.github.v3+json",
                    "User-Agent": "DevOps-Platform"
                }
            )
            
            if response.status_code != 200:
                logger.error(f"❌ Failed to fetch branches: {response.status_code} - {response.text}")
                raise HTTPException(
                    status_code=response.status_code, 
                    detail=f"Failed to fetch branches from GitHub: {response.text}"
                )
                
            branches = response.json()
            logger.info(f"✅ Fetched {len(branches)} branches for {owner}/{repo}")
            return branches
