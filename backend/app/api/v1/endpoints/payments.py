from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user
from app.models.user import User
from app.schemas.payment import PaymentCreate, PaymentRecord, PaymentResponse, LedgerSummary
from app.services import payment_service, tenant_service, lease_service
from typing import List

router = APIRouter(prefix="/payments", tags=["Payments"])

@router.get("/", response_model=List[PaymentResponse])
def list_payments(lease_id: str = None, status: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    return payment_service.list_payments(db, lease_id=lease_id, status=status)

@router.post("/", response_model=PaymentResponse)
def create_payment_entry(payload: PaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        return payment_service.create_payment_entry(db, payload)
    except payment_service.InvalidLeaseError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/ledger/summary", response_model=LedgerSummary)
def get_ledger_summary(lease_id: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    return payment_service.get_ledger_summary(db, lease_id=lease_id)

@router.get("/overdue", response_model=List[PaymentResponse])
def list_overdue_payments(db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    return payment_service.get_overdue_payments(db)

@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")
        
    leases = lease_service.list_leases(db, tenant_id=tenant.id)
    payments = []
    for lease in leases:
        payments.extend(payment_service.list_payments(db, lease_id=lease.id))
    return payments

@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(payment_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    try:
        payment = payment_service.get_payment(db, payment_id)
        role = getattr(current_user.role, 'value', str(current_user.role))
        if role == "tenant":
            tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
            if not tenant or not payment.lease or payment.lease.tenant_id != tenant.id:
                raise HTTPException(status_code=403, detail="Not authorized")
        return payment
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{payment_id}/record", response_model=PaymentResponse)
def record_payment(payment_id: str, payload: PaymentRecord, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        payment = payment_service.get_payment(db, payment_id)
        return payment_service.record_payment(db, payment, payload)
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
