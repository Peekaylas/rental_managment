"""
FastAPI dependencies for authentication and role-based access control.

Usage in endpoint:
    @router.get("/admin-only")
    def admin_endpoint(current_user: User = Depends(require_admin)):
        ...
"""
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import get_db
from app.models.user import User, UserRole

# Token URL used by Swagger UI "Authorize" button
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ── Core dependency: extract & validate current user from JWT ──────────────

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT and return the corresponding User.
    Raises 401 if the token is missing, expired, or invalid.
    Raises 403 if the user account is deactivated.
    """
    credentials_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    user_id = decode_access_token(token)
    if user_id is None:
        raise credentials_exc

    user = db.get(User, user_id)
    if user is None:
        raise credentials_exc

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Contact support.",
        )

    return user


# ── Convenience type alias ─────────────────────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_user)]


# ── Role guards ────────────────────────────────────────────────────────────

def _require_role(*roles: UserRole):
    """Factory that returns a FastAPI dependency enforcing one of the given roles."""
    def _check(current_user: CurrentUser) -> User:
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role(s): "
                    f"{', '.join(r.value for r in roles)}."
                ),
            )
        return current_user
    return _check


def require_admin(current_user: CurrentUser) -> User:
    """Allow only Admin users."""
    return _require_role(UserRole.ADMIN)(current_user)


def require_landlord_or_admin(current_user: CurrentUser) -> User:
    """Allow Landlord or Admin users."""
    return _require_role(UserRole.LANDLORD, UserRole.ADMIN)(current_user)


def require_any_role(current_user: CurrentUser) -> User:
    """Allow any authenticated user (all roles)."""
    return current_user


# ── Typed dependency aliases (for cleaner endpoint signatures) ─────────────
AdminUser          = Annotated[User, Depends(require_admin)]
LandlordOrAdmin    = Annotated[User, Depends(require_landlord_or_admin)]
AnyAuthenticatedUser = Annotated[User, Depends(require_any_role)]
