import asyncio
from sqlalchemy import text
from app.db.session import SessionLocal

async def check():
    async with SessionLocal() as db:
        result = await db.execute(text("SELECT name, dockerfile_template FROM stack"))
        rows = result.fetchall()
        for row in rows:
            print(f"Name: {row[0]}")
            print(f"Template:\n{row[1]}")
            print("-" * 20)

if __name__ == "__main__":
    asyncio.run(check())
