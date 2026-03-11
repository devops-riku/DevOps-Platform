from fastapi import Depends, HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.db.session import get_db
from app.features.auth.models.user import User
from app.core.supabase import get_supabase
import logging

logger = logging.getLogger(__name__)
security = HTTPBearer()

async def get_current_user(
    token: HTTPAuthorizationCredentials = Security(security),
    db: AsyncSession = Depends(get_db)
) -> User:
    supabase = get_supabase()
    try:
        # Verify token with Supabase
        user_response = supabase.auth.get_user(token.credentials)
        if not user_response.user:
            raise HTTPException(status_code=401, detail="Invalid authentication token")
        
        # Find user in local DB
        email = user_response.user.email
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        db_user = result.scalar_one_or_none()
        
        if not db_user:
            logger.info(f"➕ Auto-syncing missing user: {email}")
            metadata = user_response.user.user_metadata or {}
            full_name = metadata.get("full_name") or metadata.get("name") or email.split('@')[0]
            
            # Simple sync
            db_user = User(
                email=email,
                full_name=full_name,
                is_active=True
            )
            db.add(db_user)
            await db.commit()
            await db.refresh(db_user)
            
        return db_user
    except Exception as e:
        logger.error(f"Auth error: {str(e)}")
        raise HTTPException(status_code=401, detail="Could not validate credentials")
