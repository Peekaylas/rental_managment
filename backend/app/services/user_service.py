"""
User service — all database operations for User records.
Keeps business logic out of the route handlers.
"""
from typing import Optional
from sqlalchemy.orm import Session

from app.core.security import get_password_hash, verify_password
from app.models.user import User, UserRole
from app.schemas.user import UserRegisterRequest, UserUpdateRequest


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


# ── Read ───────────────────────────────────────────────────────────────────

def get_user_by_id(db: Session, user_id: str) -> Optional[User]:
    """Fetch a User by primary key."""
    return db.get(User, user_id)


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    """Fetch a User by email address (case-insensitive)."""
    return db.query(User).filter(User.email == email.lower().strip()).first()


def list_users(
    db: Session,
    *,
    role: Optional[UserRole] = None,
    skip: int = 0,
    limit: int = 50,
) -> list[User]:
    """Return a paginated list of users, optionally filtered by role."""
    q = db.query(User)
    if role:
        q = q.filter(User.role == role)
    return q.order_by(User.created_at.desc()).offset(skip).limit(limit).all()


# ── Create ─────────────────────────────────────────────────────────────────

def create_user(db: Session, payload: UserRegisterRequest) -> User:
    """
    Register a new user.

    Raises:
        UserAlreadyExistsError: if the email is already taken.
    """
    if get_user_by_email(db, payload.email):
        raise UserAlreadyExistsError(f"Email '{payload.email}' is already registered.")

    user = User(
        email=payload.email.lower().strip(),
        full_name=payload.full_name.strip(),
        phone_number=payload.phone_number,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
        # Admins are pre-verified; others must verify via email (future step)
        is_verified=(payload.role == UserRole.ADMIN),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ── Authenticate ────────────────────────────────────────────────────────────

def authenticate_user(db: Session, email: str, password: str) -> User:
    """
    Verify email/password and return the authenticated User.

    Raises:
        InvalidCredentialsError: on bad email or wrong password.
    """
    user = get_user_by_email(db, email)
    if not user or not verify_password(password, user.hashed_password):
        raise InvalidCredentialsError("Incorrect email or password.")
    if not user.is_active:
        raise InvalidCredentialsError("Account is deactivated.")
    return user


# ── Update ─────────────────────────────────────────────────────────────────

def update_user(db: Session, user: User, payload: UserUpdateRequest) -> User:
    """Apply a partial update to a User record."""
    update_data = payload.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


def change_password(
    db: Session, user: User, current_password: str, new_password: str
) -> User:
    """
    Verify the current password then set a new one.

    Raises:
        InvalidCredentialsError: if current_password is wrong.
    """
    if not verify_password(current_password, user.hashed_password):
        raise InvalidCredentialsError("Current password is incorrect.")
    user.hashed_password = get_password_hash(new_password)
    db.commit()
    db.refresh(user)
    return user


# ── Admin operations ────────────────────────────────────────────────────────

def set_user_active(db: Session, user: User, *, active: bool) -> User:
    """Activate or deactivate a user account."""
    user.is_active = active
    db.commit()
    db.refresh(user)
    return user


def set_user_role(db: Session, user: User, role: UserRole) -> User:
    """Change a user's role (admin only)."""
    user.role = role
    db.commit()
    db.refresh(user)
    return user
