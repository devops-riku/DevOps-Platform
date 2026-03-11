import logging
import httpx
from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.supabase import get_supabase
from app.core.config import settings
from app.features.auth.models.user import User
from app.features.auth.schemas.auth import SyncRequest
from app.features.workspaces.models.workspace import Workspace

logger = logging.getLogger(__name__)

class AuthService:
    @staticmethod
    async def sync_supabase_user(request: SyncRequest, db: AsyncSession) -> User:
        """
        Sync user from Supabase to local DB.
        """
        logger.info(f"🚀 Starting sync for user token")
        supabase = get_supabase()
        
        try:
            # 1. Verify token
            user_res = supabase.auth.get_user(request.access_token)
            user_data = user_res.user
            if not user_data:
                logger.error("❌ Sync failed - Invalid token or no user data")
                raise HTTPException(status_code=401, detail="Invalid token")
            
            logger.info(f"✅ Token verified for {user_data.email}")

            # 2. Extract Data Safely
            email = user_data.email
            github_id = None
            
            # Check identities list
            identities = getattr(user_data, 'identities', []) or []
            for identity in identities:
                provider = getattr(identity, 'provider', None) or (identity.get('provider') if isinstance(identity, dict) else None)
                if provider == "github":
                    github_id = str(getattr(identity, 'id', None) or (identity.get('id') if isinstance(identity, dict) else ""))
                    break
            
            if not github_id:
                github_id = str(user_data.id)
                logger.info(f"ℹ️ No GitHub identity found, using Supabase ID: {github_id}")
            else:
                logger.info(f"ℹ️ Found GitHub ID: {github_id}")

            metadata = user_data.user_metadata or {}
            full_name = metadata.get("full_name") or metadata.get("name") or email.split('@')[0]

            # 3. DB Sync
            query = select(User).where(User.email == email)
            result = await db.execute(query)
            db_user = result.scalar_one_or_none()

            if db_user:
                logger.info(f"♻️ Updating existing user: {email}")
                db_user.full_name = full_name
            else:
                logger.info(f"➕ Creating new user: {email}")
                db_user = User(
                    email=email,
                    full_name=full_name,
                    is_active=True
                )
                db.add(db_user)
            
            await db.commit()
            await db.refresh(db_user)

            # 4. If workspace_id is provided, bind token to workspace
            if request.workspace_id and request.github_token:
                logger.info(f"🔗 Binding GitHub token to workspace: {request.workspace_id}")
                ws_query = select(Workspace).where(Workspace.id == request.workspace_id)
                ws_result = await db.execute(ws_query)
                workspace = ws_result.scalar_one_or_none()
                if workspace:
                    workspace.github_access_token = request.github_token
                    workspace.github_id = github_id
                    await db.commit()
                    logger.info("✅ Workspace GitHub link established")

            logger.info(f"✨ Sync successful for {email}")
            return db_user
            
        except Exception as e:
            logger.exception(f"⛔ SYNC ERROR: {str(e)}")
            raise HTTPException(status_code=400, detail=f"Sync failed: {str(e)}")

    @staticmethod
    async def exchange_code_for_session(code: str, db: AsyncSession, workspace_id: str | None = None):
        """
        Step 2 of GitHub OAuth: Exchange code for session.
        """
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.post(
                    f"{settings.SUPABASE_URL}/auth/v1/token?grant_type=authorization_code",
                    json={"code": code},
                    headers={
                        "apikey": settings.SUPABASE_ANON_KEY,
                        "Content-Type": "application/json"
                    }
                )
                
                if resp.status_code != 200:
                    raise Exception(f"Failed to exchange code: {resp.text}")
                    
                data = resp.json()
                access_token = data.get("access_token")
                refresh_token = data.get("refresh_token")
                
                if not access_token:
                    raise Exception("No access token returned from Supabase")
                
                provider_token = data.get("provider_token")
                user_data = data.get("user", {})
                
                email = user_data.get("email")
                github_id = str(user_data.get("identities", [{}])[0].get("id") or user_data.get("id", ""))
                full_name = user_data.get("user_metadata", {}).get("full_name")

                if email:
                    query = select(User).where(User.email == email)
                    result = await db.execute(query)
                    db_user = result.scalar_one_or_none()

                    if db_user:
                        db_user.full_name = full_name
                    else:
                        db_user = User(
                            email=email,
                            full_name=full_name,
                            is_active=True
                        )
                        db.add(db_user)
                    
                    await db.commit()
                    await db.refresh(db_user)

                    # Bind to workspace if requested
                    if workspace_id and provider_token:
                        ws_query = select(Workspace).where(Workspace.id == workspace_id)
                        ws_result = await db.execute(ws_query)
                        workspace = ws_result.scalar_one_or_none()
                        if workspace:
                            workspace.github_access_token = provider_token
                            workspace.github_id = github_id
                            await db.commit()
                            logger.info(f"✅ Bound token to workspace {workspace_id} during exchange")
                
                return {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "provider_token": provider_token,
                    "db_user": db_user
                }
        except Exception as e:
            logger.error(f"⚠️ Auth exchange error: {str(e)}")
            raise HTTPException(
                status_code=400, 
                detail=f"Failed to exchange code for session: {str(e)}"
            )
