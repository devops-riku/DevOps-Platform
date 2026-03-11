from pydantic import BaseModel

class ProjectCreate(BaseModel):
    name: str
    github_repo_id: str
    github_repo_name: str
    github_repo_full_name: str | None = None
    backend_framework: str | None = None
    frontend_framework: str | None = None
    database_type: str | None = None
    language: str | None = None
    branch: str | None = None
    root_dir: str | None = None
    build_command: str | None = None
    start_command: str | None = None
    workspace_id: str | None = None
    deploy_type: str = "pipeline"
    docker_config: dict | None = None
    env_vars: dict | None = {}
