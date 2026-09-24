"""
Tenant invite & claim API endpoints.

POST /tenants/invite  — Landlord/Admin creates a pre-linked tenant account and gets a claim token.
POST /tenants/claim   — Tenant uses the token to set their password and activate their account.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional

from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_any_role
from app.models.user import User
from app.services import invite_service

router = APIRouter(prefix="/invites", tags=["Invitations"])


class InviteRequest(BaseModel):
    email: EmailStr
    full_name: str
    phone_number: Optional[str] = None


class InviteResponse(BaseModel):
    message: str
    tenant_user_id: str
    invite_token: str  # In production, send this via email, not in the response
    claim_url: str


class ClaimRequest(BaseModel):
    token: str
    new_password: str


class ClaimResponse(BaseModel):
    message: str
    email: str
    full_name: str


@router.post("/", response_model=InviteResponse, status_code=status.HTTP_201_CREATED)
def invite_tenant(
    payload: InviteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    """
    Landlord/Admin creates a pending tenant account.
    Returns an invite token to share with the tenant.

    NOTE: In a production environment, the token should be emailed to the tenant
    rather than returned in the API response. This implementation returns it directly
    for development/demo convenience.
    """
    try:
        user, tenant_profile, token = invite_service.invite_tenant(
            db,
            email=payload.email,
            full_name=payload.full_name,
            phone_number=payload.phone_number,
        )
        return InviteResponse(
            message=f"Invitation created for {payload.email}. Share the claim URL with the tenant.",
            tenant_user_id=user.id,
            invite_token=token,
            claim_url=f"/api/v1/invites/claim (use token: {token[:8]}...)",
        )
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/claim", response_model=ClaimResponse)
def claim_invite(
    payload: ClaimRequest,
    db: Session = Depends(get_db),
):
    """
    Tenant uses the invite token to set their own password and activate their account.
    This endpoint is public — no auth required (the token IS the authentication).
    """
    try:
        user = invite_service.claim_invite(db, token=payload.token, new_password=payload.new_password)
        return ClaimResponse(
            message="Account activated successfully. You can now log in.",
            email=user.email,
            full_name=user.full_name,
        )
    except invite_service.InvalidInviteTokenError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except invite_service.AlreadyClaimedError as e:
        raise HTTPException(status_code=409, detail=str(e))
