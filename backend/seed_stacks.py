import asyncio
from app.db.session import SessionLocal
from app.features.stacks.models.stack import Stack
from sqlalchemy import select, update

async def seed():
    async with SessionLocal() as db:
        compose_tpl = """services:
  app:
    image: ${IMAGE_NAME}
    container_name: ${CONTAINER_NAME}
    networks:
      - devops_proxy
    environment:
${ENV_VARS}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.${CONTAINER_NAME}.rule=${HOST_RULE}"
      - "traefik.http.services.${CONTAINER_NAME}.loadbalancer.server.port=${PORT}"
      - "traefik.http.routers.${CONTAINER_NAME}.entrypoints=web"
    restart: always

networks:
  devops_proxy:
    external: true"""

        default_stacks = [
            {
                "name": "Python 3.11",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM python:3.11-slim\nWORKDIR /app\nRUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE ${PORT}\nCMD ${START_COMMAND}",
                "docker_compose_template": compose_tpl,
                "default_port": 8000
            },
            {
                "name": "Node.js 20",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE ${PORT}\nCMD ${START_COMMAND}",
                "docker_compose_template": compose_tpl,
                "default_port": 3000
            },
            {
                "name": "Go 1.22",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM golang:1.22-alpine\nWORKDIR /app\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE ${PORT}\nCMD ${START_COMMAND}",
                "docker_compose_template": compose_tpl,
                "default_port": 8080
            },
            {
                "name": "Rust 1.76",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM rust:1.76-slim\nWORKDIR /app\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE ${PORT}\nCMD ${START_COMMAND}",
                "docker_compose_template": compose_tpl,
                "default_port": 8080
            },
            {
                "name": "React (NPM)",
                "type": "frontend",
                "icon_name": "Layout",
                "dockerfile_template": "FROM node:20-alpine\nWORKDIR /app\nCOPY . .\nRUN ${BUILD_COMMAND}\nEXPOSE ${PORT}\nCMD ${START_COMMAND}",
                "docker_compose_template": compose_tpl,
                "default_port": 5173
            }
        ]
        
        for s in default_stacks:
            q = select(Stack).where(Stack.name == s["name"])
            res = await db.execute(q)
            existing = res.scalar_one_or_none()
            if not existing:
                db.add(Stack(**s))
                print(f"Adding stack: {s['name']}")
            else:
                # Update existing one to use placeholders
                print(f"Updating stack: {s['name']}")
                for key, value in s.items():
                    setattr(existing, key, value)
                
        await db.commit()
        print("Done seeding and updating stacks")

if __name__ == "__main__":
    asyncio.run(seed())
