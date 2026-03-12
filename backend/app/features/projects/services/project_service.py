import logging
import json
import uuid
import redis.asyncio as redis
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from fastapi import HTTPException
from typing import List

from app.features.projects.models.project import Project
from app.features.projects.schemas.project import ProjectCreate
from app.features.auth.models.user import User
from app.features.workspaces.models.workspace import Workspace
from app.features.stacks.models.stack import Stack

logger = logging.getLogger(__name__)

class ProjectService:
    @staticmethod
    async def create_project(
        project_in: ProjectCreate,
        user_email: str,
        db: AsyncSession,
        redis_client: redis.Redis
    ) -> Project:
        # Get user
        query = select(User).where(User.email == user_email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        db_project = Project(
            user_id=user.id,
            workspace_id=project_in.workspace_id,
            created_by=str(user.id),
            name=project_in.name,
            github_repo_id=project_in.github_repo_id,
            github_repo_name=project_in.github_repo_name,
            github_repo_full_name=project_in.github_repo_full_name,
            backend_framework=project_in.backend_framework,
            frontend_framework=project_in.frontend_framework,
            database_type=project_in.database_type,
            language=project_in.language,
            branch=project_in.branch,
            root_dir=project_in.root_dir,
            build_command=project_in.build_command,
            start_command=project_in.start_command,
            deploy_type=project_in.deploy_type,
            docker_config=project_in.docker_config,
            env_vars=project_in.env_vars,
            status="deploying" 
        )
        
        db.add(db_project)
        await db.commit()
        await db.refresh(db_project)
        
        # Get Workspace for GitHub Token
        workspace = None
        if db_project.workspace_id:
            ws_query = select(Workspace).where(Workspace.id == db_project.workspace_id)
            ws_result = await db.execute(ws_query)
            workspace = ws_result.scalar_one_or_none()

        # Get Stack Template if applicable
        stack_template = None
        if db_project.language:
            stack_query = select(Stack).where(Stack.name == db_project.language)
            stack_result = await db.execute(stack_query)
            stack = stack_result.scalar_one_or_none()
            if stack:
                stack_template = stack.dockerfile_template

        # Push to Redis for the Go worker
        try:
            task = {
                "id": str(db_project.id),
                "repo_id": db_project.github_repo_id,
                "repo_name": db_project.github_repo_name,
                "repo_full_name": db_project.github_repo_full_name,
                "github_token": workspace.github_access_token if workspace else None,
                "backend": db_project.backend_framework,
                "frontend": db_project.frontend_framework,
                "database": db_project.database_type,
                "language": db_project.language,
                "dockerfile_template": stack_template,
                "branch": db_project.branch,
                "root_dir": db_project.root_dir,
                "build_command": db_project.build_command,
                "start_command": db_project.start_command,
                "deploy_type": db_project.deploy_type,
                "docker_config": db_project.docker_config,
                "env_vars": db_project.env_vars
            }
            await redis_client.rpush("deployments", json.dumps(task))
        except Exception as e:
            logger.error(f"Failed to push to redis: {str(e)}")

        return db_project

    @staticmethod
    async def get_workspace_projects(user_email: str, workspace_id: str, db: AsyncSession) -> List[Project]:
        query = select(Project).join(User).where(User.email == user_email)
        if workspace_id:
            query = query.where(Project.workspace_id == workspace_id)
        result = await db.execute(query)
        return list(result.scalars().all())

    @staticmethod
    async def update_project(project_id: str, data: dict, db: AsyncSession) -> Project:
        query = select(Project).where(Project.id == uuid.UUID(project_id))
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        for key, value in data.items():
            if key == "container_port":
                logger.info(f"UPDATING PORT for project {project_id}: {value}")
                current_config = project.docker_config or {}
                if not isinstance(current_config, dict):
                    current_config = {}
                new_config = dict(current_config)
                new_config["container_port"] = str(value)
                project.docker_config = new_config
                from sqlalchemy.orm.attributes import flag_modified
                flag_modified(project, "docker_config")
            elif hasattr(project, key):
                setattr(project, key, value)
                
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def update_project_status(project_id: str, status: str, db: AsyncSession) -> Project:
        return await ProjectService.update_project(project_id, {"status": status}, db)

    @staticmethod
    async def redeploy_project(project_id: str, user_email: str, db: AsyncSession, redis_client: redis.Redis):
        query = select(Project).where(Project.id == uuid.UUID(project_id))
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")
            
        # Update status to deploying
        project.status = "deploying"
        await db.commit()
        
        # Get Workspace for GitHub Token
        workspace = None
        if project.workspace_id:
            ws_query = select(Workspace).where(Workspace.id == project.workspace_id)
            ws_result = await db.execute(ws_query)
            workspace = ws_result.scalar_one_or_none()

        # Get Stack Template
        stack_template = None
        if project.language:
            stack_query = select(Stack).where(Stack.name == project.language)
            stack_result = await db.execute(stack_query)
            stack = stack_result.scalar_one_or_none()
            if stack:
                stack_template = stack.dockerfile_template

        # Push to Redis
        task = {
            "id": str(project.id),
            "repo_id": project.github_repo_id,
            "repo_name": project.github_repo_name,
            "repo_full_name": project.github_repo_full_name,
            "github_token": workspace.github_access_token if workspace else None,
            "backend": project.backend_framework,
            "frontend": project.frontend_framework,
            "database": project.database_type,
            "language": project.language,
            "dockerfile_template": stack_template,
            "branch": project.branch,
            "root_dir": project.root_dir,
            "build_command": project.build_command,
            "start_command": project.start_command,
            "deploy_type": project.deploy_type,
            "docker_config": project.docker_config,
            "env_vars": project.env_vars
        }
        await redis_client.rpush("deployments", json.dumps(task))

    @staticmethod
    async def get_project_logs(project_id: str, db: AsyncSession, redis_client: redis.Redis) -> List[dict]:
        import subprocess
        import datetime
        import json
        
        now = datetime.datetime.now().strftime("%H:%M:%S")
        
        # 1. Try to get logs from Redis (Build logs / Deploy logs)
        log_key = f"logs:{project_id}"
        redis_logs = await redis_client.lrange(log_key, 0, -1)
        
        if redis_logs:
            parsed_logs = []
            for raw_log in redis_logs:
                parsed_logs.append(json.loads(raw_log))
            return parsed_logs

        # 2. Fallback to Docker logs (App logs)
        try:
            query = select(Project).where(Project.id == uuid.UUID(project_id))
            result = await db.execute(query)
            project = result.scalar_one_or_none()
            
            if not project:
                return [{"time": "ERROR", "text": "Project not found", "type": "warn"}]

            container_name = f"devops-svc-{project.github_repo_name.lower()}"
            
            cmd = ["docker", "logs", "--tail", "50", container_name]
            process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
            stdout, stderr = process.communicate()
            
            logs = []
            if stdout:
                for line in stdout.splitlines():
                    logs.append({"time": now, "text": line, "type": "info"})
            if stderr:
                for line in stderr.splitlines():
                    logs.append({"time": now, "text": line, "type": "warn"})
                
            if not logs:
                return [{"time": now, "text": "Service is initializing... Check back in a moment.", "type": "info"}]
            return logs
        except Exception as e:
            return [{"time": now, "text": f"Waiting for service connection... ({str(e)})", "type": "warn"}]

    @staticmethod
    async def cancel_project(project_id: str, db: AsyncSession) -> Project:
        import subprocess
        query = select(Project).where(Project.id == uuid.UUID(project_id))
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if not project:
            raise HTTPException(status_code=404, detail="Project not found")

        container_name = f"devops-svc-{project.github_repo_name.lower()}"
        
        # Stop and remove container if exists
        subprocess.run(["docker", "stop", container_name], capture_output=True)
        subprocess.run(["docker", "rm", container_name], capture_output=True)
        
        project.status = "idle"
        await db.commit()
        await db.refresh(project)
        return project

    @staticmethod
    async def delete_project(project_id: str, db: AsyncSession):
        import subprocess
        query = select(Project).where(Project.id == uuid.UUID(project_id))
        result = await db.execute(query)
        project = result.scalar_one_or_none()
        
        if not project:
            return

        container_name = f"devops-svc-{project.github_repo_name.lower()}"
        
        # Stop and remove container if exists
        subprocess.run(["docker", "stop", container_name], capture_output=True)
        subprocess.run(["docker", "rm", container_name], capture_output=True)

        await db.delete(project)
        await db.commit()

    @staticmethod
    async def get_all_projects(db: AsyncSession) -> List[Project]:
        """Admin: List all projects across the platform with user info."""
        query = select(Project).options(selectinload(Project.user))
        result = await db.execute(query)
        return list(result.scalars().all())
