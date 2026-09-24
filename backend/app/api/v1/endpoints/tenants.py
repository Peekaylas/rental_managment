from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantUpdate, TenantResponse
from app.services import tenant_service
from typing import List

router = APIRouter(prefix="/tenants", tags=["Tenants"])

@router.get("/", response_model=List[TenantResponse])
def list_tenants(db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    return tenant_service.list_tenants(db)

@router.post("/", response_model=TenantResponse)
def create_tenant(payload: TenantCreate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        return tenant_service.create_tenant(db, payload)
    except tenant_service.UserNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except (ValueError, tenant_service.DuplicateTenantError) as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/me", response_model=TenantResponse)
def get_my_tenant_profile(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found for current user")
    return tenant

@router.get("/{tenant_id}", response_model=TenantResponse)
def get_tenant(tenant_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    try:
        tenant = tenant_service.get_tenant(db, tenant_id)
        role = getattr(current_user.role, 'value', str(current_user.role))
        if role == "tenant" and tenant.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return tenant
    except tenant_service.TenantNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{tenant_id}", response_model=TenantResponse)
def update_tenant(tenant_id: str, payload: TenantUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        tenant = tenant_service.get_tenant(db, tenant_id)
        return tenant_service.update_tenant(db, tenant, payload)
    except tenant_service.TenantNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
