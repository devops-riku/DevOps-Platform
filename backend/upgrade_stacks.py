import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def upgrade_stacks():
    async with SessionLocal() as db:
        # Update Python template
        python_tpl = """FROM python:3.11-slim
WORKDIR /app
RUN apt-get update && apt-get install -y git && rm -rf /var/lib/apt/lists/*
COPY . .
RUN ${BUILD_COMMAND}
EXPOSE ${PORT}
CMD ${START_COMMAND}"""
        
        # Update Node template
        node_tpl = """FROM node:20-alpine
WORKDIR /app
COPY . .
RUN ${BUILD_COMMAND}
EXPOSE ${PORT}
CMD ${START_COMMAND}"""

        # Update Go template
        go_tpl = """FROM golang:1.22-alpine
WORKDIR /app
COPY . .
RUN ${BUILD_COMMAND}
EXPOSE ${PORT}
CMD ${START_COMMAND}"""

        # Update Rust template
        rust_tpl = """FROM rust:1.76-slim
WORKDIR /app
COPY . .
RUN ${BUILD_COMMAND}
EXPOSE ${PORT}
CMD ${START_COMMAND}"""

        updates = [
            ("Python 3.11", python_tpl),
            ("Node.js 20", node_tpl),
            ("Go 1.22", go_tpl),
            ("Rust 1.76", rust_tpl)
        ]

        for name, tpl in updates:
            await db.execute(
                text("UPDATE stack SET dockerfile_template = :tpl WHERE name = :name"),
                {"tpl": tpl, "name": name}
            )
        
        await db.commit()
        print("Successfully updated stack templates with ${PORT} placeholder.")

if __name__ == "__main__":
    asyncio.run(upgrade_stacks())
