"""
Leases API endpoints — with full authorization hardening.

Security patches:
  - Landlord scoping: landlords cannot see or modify leases on units they don't own
  - ActiveLeaseExistsError surfaced as 409 Conflict (double-booking prevention)
  - PendingReviewBlockError surfaced as 409 when trying to terminate with reviews pending
  - Tenant ownership guard on /my-lease and /{lease_id}
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_any_role
from app.models.user import User
from app.schemas.lease import LeaseCreate, LeaseStatusUpdate, LeaseResponse
from app.services import lease_service, tenant_service

router = APIRouter(prefix="/leases", tags=["Leases"])


def _assert_landlord_owns_lease(db: Session, lease, current_user: User) -> None:
    """
    Raises 403 if a Landlord user does not own the property that the lease unit belongs to.
    Admins bypass this check.
    """
    role = getattr(current_user.role, "value", str(current_user.role))
    if role != "landlord":
        return

    from app.models.property import Property, Unit
    unit = db.query(Unit).filter(Unit.id == lease.unit_id).first()
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    prop = db.query(Property).filter(Property.id == unit.property_id).first()
    if not prop or prop.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have access to this lease — it belongs to another landlord's property.",
        )


@router.get("/", response_model=List[LeaseResponse])
def list_leases(
    unit_id: str = None,
    tenant_id: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    """
    Landlords only see leases on their own properties.
    Admins see all.
    """
    role = getattr(current_user.role, "value", str(current_user.role))
    leases = lease_service.list_leases(db, unit_id=unit_id, tenant_id=tenant_id, status=status)

    if role == "landlord":
        from app.models.property import Property, Unit
        owned_property_ids = {
            p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()
        }
        owned_unit_ids = {
            u.id for u in db.query(Unit).filter(Unit.property_id.in_(owned_property_ids)).all()
        }
        leases = [l for l in leases if l.unit_id in owned_unit_ids]

    return leases


@router.post("/", response_model=LeaseResponse)
def create_lease(
    payload: LeaseCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    """
    Landlords can only create leases on units they own.
    """
    role = getattr(current_user.role, "value", str(current_user.role))
    if role == "landlord":
        from app.models.property import Property, Unit
        unit = db.query(Unit).filter(Unit.id == payload.unit_id).first()
        if not unit:
            raise HTTPException(status_code=404, detail="Unit not found")
        prop = db.query(Property).filter(Property.id == unit.property_id).first()
        if not prop or prop.owner_id != current_user.id:
            raise HTTPException(
                status_code=403,
                detail="You can only create leases on your own properties.",
            )

    try:
        return lease_service.create_lease(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except lease_service.UnitNotAvailableError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my-lease", response_model=LeaseResponse)
def get_my_lease(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")

    leases = lease_service.list_leases(db, tenant_id=tenant.id, status="active")
    if not leases:
        raise HTTPException(status_code=404, detail="No active lease found")
    return leases[0]


@router.get("/{lease_id}", response_model=LeaseResponse)
def get_lease(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    try:
        lease = lease_service.get_lease(db, lease_id)
        role = getattr(current_user.role, "value", str(current_user.role))

        if role == "tenant":
            tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
            if not tenant or lease.tenant_id != tenant.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this lease")

        if role == "landlord":
            _assert_landlord_owns_lease(db, lease, current_user)

        return lease
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.patch("/{lease_id}/status", response_model=LeaseResponse)
def update_lease_status(
    lease_id: str,
    payload: LeaseStatusUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    try:
        lease = lease_service.get_lease(db, lease_id)
        _assert_landlord_owns_lease(db, lease, current_user)
        return lease_service.update_lease_status(db, lease, payload.status)
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except lease_service.PendingReviewBlockError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{lease_id}/activate", response_model=LeaseResponse)
def activate_lease(
    lease_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    try:
        lease = lease_service.get_lease(db, lease_id)
        _assert_landlord_owns_lease(db, lease, current_user)

        lease_status = lease.status.value if hasattr(lease.status, "value") else str(lease.status)
        if lease_status != "pending":
            raise HTTPException(status_code=400, detail="Only pending leases can be activated")

        return lease_service.activate_lease(db, lease)
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except lease_service.ActiveLeaseExistsError as e:
        # 409 Conflict — double booking attempt
        raise HTTPException(status_code=409, detail=str(e))
