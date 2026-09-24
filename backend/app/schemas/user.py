"""
Pydantic schemas for User — request bodies, responses, and token payloads.
All schemas use strict field validation via Pydantic v2.
"""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
import re

from app.models.user import UserRole


# ── Shared validators ──────────────────────────────────────────────────────

def _validate_password_strength(v: str) -> str:
    """
    Enforce password rules:
      - At least 8 characters
      - At least one uppercase letter
      - At least one lowercase letter
      - At least one digit
      - At least one special character
    """
    if len(v) < 8:
        raise ValueError("Password must be at least 8 characters long.")
    if not re.search(r"[A-Z]", v):
        raise ValueError("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", v):
        raise ValueError("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", v):
        raise ValueError("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", v):
        raise ValueError("Password must contain at least one special character.")
    return v


# ── Registration ───────────────────────────────────────────────────────────

class UserRegisterRequest(BaseModel):
    """Payload for POST /auth/register."""

    full_name: str = Field(..., min_length=2, max_length=255, examples=["Jane Doe"])
    email: EmailStr
    phone_number: Optional[str] = Field(
        default=None, pattern=r"^\+?[\d\s\-]{7,20}$", examples=["+254712345678"]
    )
    password: str = Field(..., min_length=8, max_length=128)
    role: UserRole = Field(default=UserRole.TENANT)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)


# ── Login ─────────────────────────────────────────────────────────────────

class UserLoginRequest(BaseModel):
    """Payload for POST /auth/login (JSON body variant)."""

    email: EmailStr
    password: str


# ── Token responses ────────────────────────────────────────────────────────

class TokenResponse(BaseModel):
    """Returned after a successful login."""

    access_token: str
    token_type: str = "bearer"
    expires_in: int               # seconds until expiry


class TokenData(BaseModel):
    """Internal model for the decoded JWT payload."""

    user_id: Optional[str] = None


# ── User responses ─────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    """Safe public representation of a User — never includes password."""

    id: str
    email: str
    full_name: str
    phone_number: Optional[str]
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UserUpdateRequest(BaseModel):
    """Payload for PATCH /users/me — all fields optional."""

    full_name: Optional[str] = Field(default=None, min_length=2, max_length=255)
    phone_number: Optional[str] = Field(
        default=None, pattern=r"^\+?[\d\s\-]{7,20}$"
    )


class ChangePasswordRequest(BaseModel):
    """Payload for POST /auth/change-password."""

    current_password: str
    new_password: str = Field(..., min_length=8, max_length=128)

    @field_validator("new_password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        return _validate_password_strength(v)
