
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def test_db():
    try:
        print("Testing DB connection...")
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        print("DB connection successful!")
    except Exception as e:
        print(f"DB connection failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_db())
