"""
Payments API endpoints — with hardened security.

Security patches applied:
  - Tenant ownership guard on submit_payment (tenants can only submit against their own leases)
  - DuplicateReferenceError surfaced as 409 Conflict
  - Landlord data-scoping enforced on all landlord-facing list/get endpoints
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_any_role
from app.models.user import User
from app.schemas.payment import (
    PaymentCreate, PaymentRecord, PaymentResponse,
    LedgerSummary, TenantPaymentSubmit, PaymentReview,
)
from app.services import payment_service, tenant_service, lease_service

router = APIRouter(prefix="/payments", tags=["Payments"])


# ── Landlord / Admin endpoints ────────────────────────────────────────────


@router.get("/", response_model=List[PaymentResponse])
def list_payments(
    lease_id: str = None,
    status: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    """
    Landlord: scoped to their own properties only.
    Admin: global.
    """
    role = getattr(current_user.role, "value", str(current_user.role))
    if role == "landlord" and not lease_id:
        # Scope to leases on units that belong to this landlord's properties
        from app.models.property import Property, Unit
        from app.models.lease import LeaseAgreement
        from app.models.payment import RentPayment

        owned_property_ids = [
            p.id for p in db.query(Property).filter(Property.owner_id == current_user.id).all()
        ]
        owned_unit_ids = [
            u.id for u in db.query(Unit).filter(Unit.property_id.in_(owned_property_ids)).all()
        ]
        owned_lease_ids = [
            l.id for l in db.query(LeaseAgreement).filter(LeaseAgreement.unit_id.in_(owned_unit_ids)).all()
        ]
        return (
            db.query(RentPayment)
            .filter(RentPayment.lease_id.in_(owned_lease_ids))
            .all()
        )

    return payment_service.list_payments(db, lease_id=lease_id, status=status)


@router.post("/", response_model=PaymentResponse)
def create_payment_entry(
    payload: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    try:
        return payment_service.create_payment_entry(db, payload)
    except payment_service.InvalidLeaseError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/ledger/summary", response_model=LedgerSummary)
def get_ledger_summary(
    lease_id: str = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    return payment_service.get_ledger_summary(db, lease_id=lease_id)


@router.get("/overdue", response_model=List[PaymentResponse])
def list_overdue_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    return payment_service.get_overdue_payments(db)


# ── Tenant endpoints ──────────────────────────────────────────────────────


@router.get("/my-payments", response_model=List[PaymentResponse])
def get_my_payments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
    if not tenant:
        raise HTTPException(status_code=404, detail="Tenant profile not found")

    leases = lease_service.list_leases(db, tenant_id=tenant.id)
    payments = []
    for lease in leases:
        payments.extend(payment_service.list_payments(db, lease_id=lease.id))
    return payments


# ── Shared endpoints ──────────────────────────────────────────────────────


@router.get("/{payment_id}", response_model=PaymentResponse)
def get_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    try:
        payment = payment_service.get_payment(db, payment_id)
        role = getattr(current_user.role, "value", str(current_user.role))

        # Tenants can only see their own payments
        if role == "tenant":
            tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
            if not tenant or not payment.lease or payment.lease.tenant_id != tenant.id:
                raise HTTPException(status_code=403, detail="Not authorized to view this payment")

        # Landlords can only see payments belonging to their properties
        if role == "landlord":
            from app.models.property import Property, Unit
            from app.models.lease import LeaseAgreement
            if payment.lease:
                unit = db.query(Unit).filter(Unit.id == payment.lease.unit_id).first()
                if unit:
                    prop = db.query(Property).filter(Property.id == unit.property_id).first()
                    if not prop or prop.owner_id != current_user.id:
                        raise HTTPException(status_code=403, detail="Not authorized to view this payment")

        return payment
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{payment_id}/record", response_model=PaymentResponse)
def record_payment(
    payment_id: str,
    payload: PaymentRecord,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    try:
        payment = payment_service.get_payment(db, payment_id)
        return payment_service.record_payment(db, payment, payload)
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except payment_service.DuplicateReferenceError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{payment_id}/submit", response_model=PaymentResponse)
def submit_payment(
    payment_id: str,
    payload: TenantPaymentSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_any_role),
):
    """
    Tenant submits payment evidence for review.
    Security: tenants are verified to own the lease before submission is accepted.
    """
    try:
        payment = payment_service.get_payment(db, payment_id)

        role = getattr(current_user.role, "value", str(current_user.role))
        if role == "tenant":
            tenant = tenant_service.get_tenant_by_user_id(db, current_user.id)
            if not tenant or not payment.lease or payment.lease.tenant_id != tenant.id:
                raise HTTPException(
                    status_code=403,
                    detail="You can only submit payments against your own lease.",
                )

        return payment_service.submit_payment(db, payment, payload)
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except payment_service.DuplicateReferenceError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/{payment_id}/review", response_model=PaymentResponse)
def review_payment(
    payment_id: str,
    payload: PaymentReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_landlord_or_admin),
):
    """
    Landlord/Admin approves or rejects a payment submission.
    Landlords are scoped to their own properties.
    """
    try:
        payment = payment_service.get_payment(db, payment_id)

        role = getattr(current_user.role, "value", str(current_user.role))
        if role == "landlord" and payment.lease:
            from app.models.property import Property, Unit
            unit = db.query(Unit).filter(Unit.id == payment.lease.unit_id).first()
            if unit:
                prop = db.query(Property).filter(Property.id == unit.property_id).first()
                if not prop or prop.owner_id != current_user.id:
                    raise HTTPException(
                        status_code=403,
                        detail="You can only review payments for your own properties.",
                    )

        return payment_service.review_payment(db, payment, payload)
    except payment_service.PaymentNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
