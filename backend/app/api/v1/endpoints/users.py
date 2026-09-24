"""
Users endpoints — profile retrieval and admin user management.

Routes:
    GET    /api/v1/users/me          → current user profile
    PATCH  /api/v1/users/me          → update own profile
    GET    /api/v1/users/            → list all users (admin only)
    GET    /api/v1/users/{user_id}   → get any user (admin only)
    PATCH  /api/v1/users/{user_id}/role    → change role (admin only)
    PATCH  /api/v1/users/{user_id}/status  → activate/deactivate (admin only)
"""
from fastapi import APIRouter
router = APIRouter()

from fastapi import Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services.user_service import (
    get_user_by_id,
    list_users,
    set_user_active,
    set_user_role,
    update_user,
)
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, AdminUser, require_any_role, get_current_user


# ── Own profile ────────────────────────────────────────────────────────────

@router.get("/me", response_model=UserResponse, summary="Get own profile")
def get_my_profile(current_user: User = Depends(get_current_user)):
    """Return the profile of the currently authenticated user."""
    return current_user


@router.patch("/me", response_model=UserResponse, summary="Update own profile")
def update_my_profile(
    payload: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Update full_name and/or phone_number for the current user."""
    return update_user(db, current_user, payload)


# ── Admin: list & inspect ──────────────────────────────────────────────────

@router.get(
    "/",
    response_model=list[UserResponse],
    summary="List all users (admin only)",
)
def list_all_users(
    _: AdminUser,
    db: Session = Depends(get_db),
    role: UserRole | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    """Paginated user list, optionally filtered by role."""
    return list_users(db, role=role, skip=skip, limit=limit)


@router.get(
    "/{user_id}",
    response_model=UserResponse,
    summary="Get a specific user (admin only)",
)
def get_user(user_id: str, _: AdminUser, db: Session = Depends(get_db)):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return user


# ── Admin: mutate ──────────────────────────────────────────────────────────

@router.patch(
    "/{user_id}/role",
    response_model=UserResponse,
    summary="Change a user's role (admin only)",
)
def change_user_role(
    user_id: str,
    role: UserRole,
    _: AdminUser,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return set_user_role(db, user, role)


@router.patch(
    "/{user_id}/status",
    response_model=UserResponse,
    summary="Activate or deactivate a user (admin only)",
)
def change_user_status(
    user_id: str,
    active: bool,
    _: AdminUser,
    db: Session = Depends(get_db),
):
    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")
    return set_user_active(db, user, active=active)
