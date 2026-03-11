import logging
from fastapi import APIRouter, Depends, HTTPException, Response, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.supabase import get_supabase
from app.core.config import settings
from app.db.session import get_db
from app.features.auth.models.user import User
from app.features.auth.schemas.auth import SyncRequest
from app.features.auth.services.auth_service import AuthService

logger = logging.getLogger(__name__)

router = APIRouter()

@router.post("/sync")
async def sync_user(
    request: SyncRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Sync user from Supabase to local DB after frontend auth
    """
    db_user = await AuthService.sync_supabase_user(request, db)
    return {"status": "success", "user_id": db_user.id}

@router.get("/login/github")
async def login_github(workspace_id: str | None = None):
    """
    Step 1: Redirect user to Supabase/GitHub OAuth login
    """
    frontend_callback = f"{settings.FRONTEND_URL}/auth/callback"
    if workspace_id:
        frontend_callback += f"?workspace_id={workspace_id}"
    
    auth_url = f"{settings.SUPABASE_URL}/auth/v1/authorize?provider=github&redirect_to={frontend_callback}&scopes=user:email,read:org,repo"
    return RedirectResponse(url=auth_url)

@router.get("/callback")
async def auth_callback(
    request: Request,
    code: str = None, 
    error: str = None, 
    error_description: str = None,
    workspace_id: str | None = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Step 2: Handle callback from Supabase/GitHub, exchange code for session
    """
    if error:
        raise HTTPException(status_code=400, detail=f"Auth error: {error_description or error}")
    
    if not code:
        raise HTTPException(status_code=400, detail="No code provided")

    # 1. Exchange code for session (this gets us the GitHub token)
    result = await AuthService.exchange_code_for_session(code, db, workspace_id)
    
    # 2. Check if the user was already logged in via a cookie
    current_session_token = request.cookies.get("sb-access-token")
    is_already_logged_in = False
    
    if current_session_token:
        try:
            supabase = get_supabase()
            user_check = supabase.auth.get_user(current_session_token)
            if user_check.user:
                is_already_logged_in = True
        except:
            is_already_logged_in = False

    frontend_url = f"{settings.FRONTEND_URL}/dashboard"
    redirect_res = RedirectResponse(url=frontend_url)
    
    # 3. SMART SESSION HANDLING
    # If we are linking a workspace AND already have a valid session, 
    # keep the CURRENT user's session instead of switching to the GitHub user's session.
    
    if workspace_id and is_already_logged_in:
        logger.info(f"Preserving existing user session while linking workspace {workspace_id}")
        # We don't overwrite sb-access-token, so the original user stays logged in.
        # But we still updated the workspace in the DB during exchange_code_for_session.
    else:
        # Standard login/switch: Set cookies for the newly exchanged session
        redirect_res.set_cookie(
            key="sb-access-token", 
            value=result["access_token"],
            httponly=False,
            max_age=3600,
            path="/"
        )
        if result.get("refresh_token"):
            redirect_res.set_cookie(
                key="sb-refresh-token", 
                value=result["refresh_token"],
                httponly=False,
                max_age=3600 * 24 * 7,
                path="/"
            )
    
    # Always update the gh-token cookie for the current tab's convenience
    if result.get("provider_token"):
        redirect_res.set_cookie(
            key="gh-token", 
            value=result["provider_token"],
            httponly=False,
            max_age=3600,
            path="/"
        )
    
    return redirect_res

@router.get("/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    """
    DEBUG: List all users in the local database
    """
    query = select(User)
    result = await db.execute(query)
    users = result.scalars().all()
    return users

@router.get("/me")
async def get_me(token: str, db: AsyncSession = Depends(get_db)):
    """
    Validate token and return user info from Supabase and local DB
    """
    supabase = get_supabase()
    auth_res = supabase.auth.get_user(token)
    if not auth_res.user:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    # Fetch from local DB
    query = select(User).where(User.email == auth_res.user.email)
    result = await db.execute(query)
    db_user = result.scalar_one_or_none()
    
    return {
        "id": db_user.id if db_user else auth_res.user.id,
        "email": auth_res.user.email,
        "full_name": db_user.full_name if db_user else auth_res.user.user_metadata.get("full_name"),
        "is_subscribed": db_user.is_subscribed if db_user else False,
        "metadata": auth_res.user.user_metadata
    }
