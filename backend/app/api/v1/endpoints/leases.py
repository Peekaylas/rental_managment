from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user
from app.models.user import User
from app.schemas.lease import LeaseCreate, LeaseUpdate, LeaseStatusUpdate, LeaseResponse
from app.services import lease_service, tenant_service
from typing import List

router = APIRouter(prefix="/leases", tags=["Leases"])

@router.get("/", response_model=List[LeaseResponse])
def list_leases(unit_id: str = None, tenant_id: str = None, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    return lease_service.list_leases(db, unit_id=unit_id, tenant_id=tenant_id, status=status)

@router.post("/", response_model=LeaseResponse)
def create_lease(payload: LeaseCreate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        return lease_service.create_lease(db, payload)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except lease_service.UnitNotAvailableError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/my-lease", response_model=LeaseResponse)
def get_my_lease(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    leases = lease_service.list_leases(db, tenant_id=tenant.id, status="active")
    if not leases:
        raise HTTPException(status_code=404, detail="No active lease found")
    return leases[0]

@router.get("/{lease_id}", response_model=LeaseResponse)
def get_lease(lease_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    try:
        lease = lease_service.get_lease(db, lease_id)
        role = getattr(current_user.role, 'value', str(current_user.role))
        if role == "tenant":
            tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
            if not tenant or lease.tenant_id != tenant.id:
                raise HTTPException(status_code=403, detail="Not authorized")
        return lease
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{lease_id}/status", response_model=LeaseResponse)
def update_lease_status(lease_id: str, payload: LeaseStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        lease = lease_service.get_lease(db, lease_id)
        return lease_service.update_lease_status(db, lease, payload.status)
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{lease_id}/activate", response_model=LeaseResponse)
def activate_lease(lease_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        lease = lease_service.get_lease(db, lease_id)
        lease_status = lease.status.value if hasattr(lease.status, 'value') else str(lease.status)
        if lease_status != "pending":
            raise HTTPException(status_code=400, detail="Only pending leases can be activated")
        return lease_service.activate_lease(db, lease)
    except lease_service.LeaseNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
