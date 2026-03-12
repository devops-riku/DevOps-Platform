import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def migrate():
    async with SessionLocal() as db:
        try:
            await db.execute(text("ALTER TABLE stack ADD COLUMN docker_compose_template TEXT"))
            await db.commit()
            print("Successfully added docker_compose_template column.")
        except Exception as e:
            print(f"Error (maybe column exists): {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
