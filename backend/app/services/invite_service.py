"""
Tenant invitation & onboarding service.

Flow:
  1. Landlord calls POST /tenants/invite with tenant email + name.
  2. System creates a User (role=tenant, is_claimed=False) and a pre-linked
     Tenant profile, then generates a signed invite_token.
  3. Token is returned to the landlord to share (email delivery can be wired
     to an SMTP provider later; for now, the token is returned in the response).
  4. Tenant calls POST /tenants/claim with the token + their chosen password.
  5. System sets is_claimed=True, clears invite_token, marks is_verified=True.
"""

import secrets
import string
from datetime import datetime

from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.tenant import Tenant
from app.core.security import get_password_hash


# ── Exceptions ────────────────────────────────────────────────────────────


class InvalidInviteTokenError(Exception):
    pass


class AlreadyClaimedError(Exception):
    pass


# ── Helpers ───────────────────────────────────────────────────────────────


def _generate_invite_token() -> str:
    """Generates a cryptographically secure 64-character URL-safe token."""
    alphabet = string.ascii_letters + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(64))


# ── Service functions ─────────────────────────────────────────────────────


def invite_tenant(
    db: Session,
    email: str,
    full_name: str,
    phone_number: str = None,
) -> tuple[User, Tenant, str]:
    """
    Creates a placeholder User + Tenant profile for a new tenant and returns
    an invite token the landlord can share with them.

    The user account is locked (is_claimed=False) until the tenant claims it.
    """
    # Reject if email already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise ValueError(f"A user with email '{email}' already exists.")

    token = _generate_invite_token()

    # Create the user with a random unusable password — they'll set their own
    # on claim. Using a hashed random string ensures the account cannot be
    # brute-forced before it is claimed.
    placeholder_password = secrets.token_hex(32)

    user = User(
        email=email,
        full_name=full_name,
        phone_number=phone_number,
        hashed_password=get_password_hash(placeholder_password),
        role=UserRole.TENANT,
        is_active=False,       # Cannot log in until claimed
        is_verified=False,
        is_claimed=False,
        invite_token=token,
    )
    db.add(user)
    db.flush()  # Get user.id without committing

    tenant_profile = Tenant(user_id=user.id)
    db.add(tenant_profile)
    db.commit()
    db.refresh(user)
    db.refresh(tenant_profile)

    return user, tenant_profile, token


def claim_invite(db: Session, token: str, new_password: str) -> User:
    """
    Tenant uses the invite token to set their password and activate their account.
    Clears the token and marks the account as claimed and verified.
    """
    user = db.query(User).filter(User.invite_token == token).first()
    if not user:
        raise InvalidInviteTokenError("Invalid or expired invite token.")

    if user.is_claimed:
        raise AlreadyClaimedError("This invite has already been used.")

    user.hashed_password = get_password_hash(new_password)
    user.invite_token = None
    user.is_claimed = True
    user.is_active = True
    user.is_verified = True

    db.add(user)
    db.commit()
    db.refresh(user)
    return user
