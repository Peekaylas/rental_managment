from sqlalchemy.orm import Session, joinedload
from app.models.tenant import Tenant
from app.models.user import User
from app.schemas.tenant import TenantCreate, TenantUpdate

class TenantNotFoundError(Exception):
    pass

class UserNotFoundError(Exception):
    pass

class DuplicateTenantError(Exception):
    pass

def list_tenants(db: Session, skip: int = 0, limit: int = 50) -> list[Tenant]:
    return db.query(Tenant).options(joinedload(Tenant.user)).offset(skip).limit(limit).all()

def get_tenant(db: Session, tenant_id: str) -> Tenant:
    tenant = db.query(Tenant).options(joinedload(Tenant.user)).filter(Tenant.id == tenant_id).first()
    if not tenant:
        raise TenantNotFoundError("Tenant not found")
    return tenant

def get_tenant_by_user_id(db: Session, user_id: str) -> Tenant | None:
    return db.query(Tenant).options(joinedload(Tenant.user)).filter(Tenant.user_id == user_id).first()

def create_tenant(db: Session, payload: TenantCreate) -> Tenant:
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise UserNotFoundError("User not found")
    if hasattr(user.role, 'value') and user.role.value != "tenant":
        raise ValueError("User must have tenant role")
    elif user.role != "tenant":
        raise ValueError("User must have tenant role")
        
    existing = get_tenant_by_user_id(db, payload.user_id)
    if existing:
        raise DuplicateTenantError("Tenant profile already exists for this user")
        
    db_obj = Tenant(**payload.model_dump())
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_tenant(db: Session, tenant: Tenant, payload: TenantUpdate) -> Tenant:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(tenant, key, value)
    db.add(tenant)
    db.commit()
    db.refresh(tenant)
    return tenant
