import redis.asyncio as redis
from app.core.config import settings

async def get_redis():
    if settings.REDIS_USERNAME and settings.REDIS_PASSWORD:
        redis_url = f"redis://{settings.REDIS_USERNAME}:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    elif settings.REDIS_PASSWORD:
        redis_url = f"redis://:{settings.REDIS_PASSWORD}@{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    else:
        redis_url = f"redis://{settings.REDIS_HOST}:{settings.REDIS_PORT}"
    
    client = await redis.from_url(
        redis_url,
        encoding="utf-8",
        decode_responses=True
    )
    try:
        yield client
    finally:
        await client.close()
