import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.core.config import settings
from app.db.session import engine
from app.core.redis import get_redis
from app.api.v1.routers import api_v1_router

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("🚀 STARTING DEVOPS PLATFORM BACKEND")
    
    # 1. Check Database
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("✅ Database Connection: SUCCESS")
    except Exception as e:
        logger.error(f"❌ Database Connection: FAILED - {str(e)}")

    # 2. Check Redis
    try:
        async for redis_client in get_redis():
            await redis_client.ping()
            break
        logger.info("✅ Redis Connection: SUCCESS")
    except Exception as e:
        logger.error(f"❌ Redis Connection: FAILED - {str(e)}")
    
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Welcome to DevOps Platform API"}

app.include_router(api_v1_router, prefix=settings.API_V1_STR)
