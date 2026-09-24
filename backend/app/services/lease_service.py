from sqlalchemy.orm import Session, joinedload
from app.models.lease import LeaseAgreement
from app.models.property import Unit
from app.schemas.lease import LeaseCreate, LeaseStatus
from app.schemas.property import UnitStatus

class LeaseNotFoundError(Exception):
    pass

class UnitNotAvailableError(Exception):
    pass

def list_leases(db: Session, unit_id: str = None, tenant_id: str = None, status: str = None, skip: int = 0, limit: int = 50) -> list[LeaseAgreement]:
    query = db.query(LeaseAgreement).options(joinedload(LeaseAgreement.unit), joinedload(LeaseAgreement.tenant))
    if unit_id:
        query = query.filter(LeaseAgreement.unit_id == unit_id)
    if tenant_id:
        query = query.filter(LeaseAgreement.tenant_id == tenant_id)
    if status:
        query = query.filter(LeaseAgreement.status == status)
    return query.offset(skip).limit(limit).all()

def get_lease(db: Session, lease_id: str) -> LeaseAgreement:
    lease = db.query(LeaseAgreement).options(joinedload(LeaseAgreement.unit), joinedload(LeaseAgreement.tenant)).filter(LeaseAgreement.id == lease_id).first()
    if not lease:
        raise LeaseNotFoundError("Lease not found")
    return lease

def create_lease(db: Session, payload: LeaseCreate) -> LeaseAgreement:
    unit = db.query(Unit).filter(Unit.id == payload.unit_id).first()
    if not unit:
        raise ValueError("Unit not found")
    unit_status_val = unit.status.value if hasattr(unit.status, 'value') else str(unit.status)
    if unit_status_val != "available":
        raise UnitNotAvailableError("Unit is not available")
        
    db_obj = LeaseAgreement(**payload.model_dump(), status=LeaseStatus.pending)
    unit.status = UnitStatus.reserved
    db.add(db_obj)
    db.add(unit)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def activate_lease(db: Session, lease: LeaseAgreement) -> LeaseAgreement:
    lease.status = LeaseStatus.active
    if lease.unit:
        lease.unit.status = UnitStatus.occupied
        db.add(lease.unit)
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease

def update_lease_status(db: Session, lease: LeaseAgreement, status: LeaseStatus) -> LeaseAgreement:
    lease.status = status
    if status in [LeaseStatus.terminated, LeaseStatus.expired]:
        if lease.unit:
            lease.unit.status = UnitStatus.available
            db.add(lease.unit)
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease

def get_active_lease_for_unit(db: Session, unit_id: str) -> LeaseAgreement | None:
    return db.query(LeaseAgreement).filter(LeaseAgreement.unit_id == unit_id, LeaseAgreement.status == "active").first()
