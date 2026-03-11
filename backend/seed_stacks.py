import asyncio
from app.db.session import SessionLocal
from app.features.stacks.models import Stack
from sqlalchemy import select

async def seed():
    async with SessionLocal() as db:
        default_stacks = [
            {
                "name": "FastAPI",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM python:3.11-slim\nWORKDIR /app\nCOPY requirements.txt .\nRUN pip install -r requirements.txt\nCOPY . .\nCMD [\"uvicorn\", \"main:app\", \"--host\", \"0.0.0.0\", \"--port\", \"8000\"]",
                "default_port": 8000
            },
            {
                "name": "Go",
                "type": "backend",
                "icon_name": "Cpu",
                "dockerfile_template": "FROM golang:1.21-alpine\nWORKDIR /app\nCOPY go.mod go.sum ./\nRUN go mod download\nCOPY . .\nRUN go build -o main .\nCMD [\"./main\"]",
                "default_port": 8080
            },
            {
                "name": "Svelte",
                "type": "frontend",
                "icon_name": "Layout",
                "dockerfile_template": "FROM node:20-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nRUN npm run build\nCMD [\"npm\", \"run\", \"preview\"]",
                "default_port": 4173
            }
        ]
        
        for s in default_stacks:
            q = select(Stack).where(Stack.name == s["name"])
            res = await db.execute(q)
            if not res.scalar_one_or_none():
                db.add(Stack(**s))
                print(f"Adding stack: {s['name']}")
            else:
                print(f"Stack {s['name']} already exists")
                
        await db.commit()
        print("Done seeding")

if __name__ == "__main__":
    asyncio.run(seed())
