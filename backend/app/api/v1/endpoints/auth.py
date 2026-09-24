from app.models.user import User
"""
Auth endpoints — register, login (JSON + OAuth2 form), refresh-check, change-password.

Routes:
    POST /api/v1/auth/register        → create account, returns token
    POST /api/v1/auth/login           → OAuth2 form-data login (Swagger compatible)
    POST /api/v1/auth/login/json      → JSON body login (used by the React app)
    POST /api/v1/auth/change-password → authenticated password change
"""
from datetime import timedelta

from fastapi import APIRouter
router = APIRouter()

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token
from app.db.session import get_db
from app.schemas.user import (
    ChangePasswordRequest,
    TokenResponse,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.services.user_service import (
    InvalidCredentialsError,
    UserAlreadyExistsError,
    authenticate_user,
    change_password,
    create_user,
)
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user

_TOKEN_EXPIRES = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)


def _make_token(user_id: str) -> TokenResponse:
    return TokenResponse(
        access_token=create_access_token(user_id, _TOKEN_EXPIRES),
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


# ── Register ───────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
def register(payload: UserRegisterRequest, db: Session = Depends(get_db)):
    """
    Create a new user account and return a signed JWT immediately.

    - **full_name**: required, min 2 chars.
    - **email**: must be unique.
    - **password**: min 8 chars, must include uppercase, lowercase, digit, special char.
    - **role**: defaults to `tenant`; frontends may request `landlord`.
      Admin accounts can only be created via the seed script or by an existing admin.
    """
    # Prevent self-registration as admin
    if payload.role.value == "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin accounts cannot be self-registered.",
        )
    try:
        user = create_user(db, payload)
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc

    return _make_token(user.id)


# ── Login — OAuth2 form-data (Swagger UI / curl compatible) ───────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email + password (OAuth2 form-data)",
)
def login_form(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    """
    Standard OAuth2 password flow.  
    `username` field accepts the user's **email address**.
    """
    try:
        user = authenticate_user(db, form_data.username, form_data.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return _make_token(user.id)


# ── Login — JSON body (primary endpoint for the React app) ─────────────────

@router.post(
    "/login/json",
    response_model=TokenResponse,
    summary="Login with email + password (JSON body)",
)
def login_json(payload: UserLoginRequest, db: Session = Depends(get_db)):
    """
    JSON-body login endpoint consumed by the React frontend.
    Returns the same `TokenResponse` as the form-data variant.
    """
    try:
        user = authenticate_user(db, payload.email, payload.password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    return _make_token(user.id)


# ── Change password ────────────────────────────────────────────────────────

@router.post(
    "/change-password",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Change the current user's password",
)
def change_password_endpoint(
    payload: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Requires a valid JWT. Verifies the old password before setting the new one."""
    try:
        change_password(db, current_user, payload.current_password, payload.new_password)
    except InvalidCredentialsError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
