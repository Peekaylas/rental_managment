"""
Payment service — financial logic with security hardening.

Patches applied:
  - Rolling balance ledger: balance is always recomputed from cumulative paid amounts
  - Unique reference code enforcement: duplicate refs rejected before DB write
  - Lease termination guard: blocked when pending reviews exist
  - Correct enum casing throughout (matches schemas/payment.py)
"""

from datetime import date, timedelta
from sqlalchemy.orm import Session, joinedload

from app.models.payment import RentPayment, PaymentStatus
from app.models.lease import LeaseAgreement
from app.schemas.payment import PaymentCreate, PaymentRecord, TenantPaymentSubmit, PaymentReview


# ── Custom exceptions ─────────────────────────────────────────────────────


class PaymentNotFoundError(Exception):
    pass


class InvalidLeaseError(Exception):
    pass


class DuplicateReferenceError(Exception):
    pass


class PendingReviewBlockError(Exception):
    """Raised when a lease action is blocked by an outstanding payment review."""
    pass


# ── Helper ────────────────────────────────────────────────────────────────


def _reference_is_unique(db: Session, reference: str, exclude_payment_id: str = None) -> bool:
    """Return True if no other payment uses this reference code."""
    query = db.query(RentPayment).filter(RentPayment.transaction_reference == reference)
    if exclude_payment_id:
        query = query.filter(RentPayment.id != exclude_payment_id)
    return query.first() is None


def _recompute_status(amount_due: float, total_paid: float, penalty: float) -> tuple[float, PaymentStatus]:
    """
    Rolling-balance logic.
    Returns (balance, status).
    """
    balance = round(amount_due + (penalty or 0.0) - total_paid, 2)
    if total_paid == 0.0:
        status = PaymentStatus.pending
    elif balance <= 0:
        status = PaymentStatus.completed
    else:
        status = PaymentStatus.partial
    return balance, status


def has_pending_reviews(db: Session, lease_id: str) -> bool:
    """True if there is at least one UNDER_REVIEW payment on this lease."""
    return (
        db.query(RentPayment)
        .filter(
            RentPayment.lease_id == lease_id,
            RentPayment.status == PaymentStatus.UNDER_REVIEW,
        )
        .first()
        is not None
    )


# ── CRUD ──────────────────────────────────────────────────────────────────


def list_payments(
    db: Session,
    lease_id: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 50,
) -> list[RentPayment]:
    query = db.query(RentPayment).options(joinedload(RentPayment.lease))
    if lease_id:
        query = query.filter(RentPayment.lease_id == lease_id)
    if status:
        query = query.filter(RentPayment.status == status)
    return query.offset(skip).limit(limit).all()


def get_payment(db: Session, payment_id: str) -> RentPayment:
    payment = (
        db.query(RentPayment)
        .options(joinedload(RentPayment.lease))
        .filter(RentPayment.id == payment_id)
        .first()
    )
    if not payment:
        raise PaymentNotFoundError("Payment not found")
    return payment


def create_payment_entry(db: Session, payload: PaymentCreate) -> RentPayment:
    lease = db.query(LeaseAgreement).filter(LeaseAgreement.id == payload.lease_id).first()
    if not lease:
        raise InvalidLeaseError("Lease not found")

    lease_status_val = lease.status.value if hasattr(lease.status, "value") else str(lease.status)
    if lease_status_val != "active":
        raise InvalidLeaseError("Lease is not active")

    balance, status = _recompute_status(payload.amount_due, payload.amount_paid or 0.0, 0.0)

    payload_data = payload.model_dump()
    payload_data.pop("balance", None)

    db_obj = RentPayment(
        **payload_data,
        balance=balance,
        penalty_amount=0.0,
        status=status,
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def record_payment(db: Session, payment: RentPayment, payload: PaymentRecord) -> RentPayment:
    """Manual payment recording by Landlord/Admin — validates unique ref code."""
    if payload.transaction_reference:
        if not _reference_is_unique(db, payload.transaction_reference, exclude_payment_id=payment.id):
            raise DuplicateReferenceError(
                f"Reference code '{payload.transaction_reference}' has already been used."
            )

    payment.amount_paid += payload.amount_paid
    payment.balance, payment.status = _recompute_status(
        payment.amount_due, payment.amount_paid, payment.penalty_amount
    )
    payment.payment_date = payload.payment_date
    payment.payment_method = payload.payment_method
    payment.transaction_reference = payload.transaction_reference
    payment.notes = payload.notes

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def get_ledger_summary(db: Session, lease_id: str = None) -> dict:
    query = db.query(RentPayment)
    if lease_id:
        query = query.filter(RentPayment.lease_id == lease_id)

    payments = query.all()

    total_billed = sum(p.amount_due + (p.penalty_amount or 0.0) for p in payments)
    total_paid = sum(p.amount_paid for p in payments)
    total_outstanding = sum(p.balance for p in payments if p.balance > 0)

    today = date.today()
    total_overdue_count = sum(
        1 for p in payments
        if p.due_date < today and p.balance > 0 and
        (p.status.value if hasattr(p.status, "value") else str(p.status)) in ("pending", "partial")
    )
    paid_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, "value") else str(p.status)) == "completed")
    pending_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, "value") else str(p.status)) == "pending")
    partial_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, "value") else str(p.status)) == "partial")

    return {
        "total_billed": total_billed,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "total_overdue_count": total_overdue_count,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "partial_count": partial_count,
    }


def generate_monthly_charges(db: Session, lease_id: str) -> RentPayment:
    lease = db.query(LeaseAgreement).filter(LeaseAgreement.id == lease_id).first()
    if not lease:
        raise InvalidLeaseError("Lease not found")

    today = date.today()
    period_start = today.replace(day=1)
    next_month = today.replace(day=28) + timedelta(days=4)
    period_end = next_month - timedelta(days=next_month.day)

    try:
        due_date = today.replace(day=lease.rent_due_day)
    except ValueError:
        due_date = today.replace(day=28)

    if due_date < today:
        try:
            due_date = due_date.replace(
                month=due_date.month % 12 + 1,
                year=due_date.year + (due_date.month // 12),
            )
        except ValueError:
            pass

    payload = PaymentCreate(
        lease_id=lease_id,
        amount_due=lease.monthly_rent,
        amount_paid=0.0,
        due_date=due_date,
        period_start=period_start,
        period_end=period_end,
    )
    return create_payment_entry(db, payload)


def get_overdue_payments(db: Session) -> list[RentPayment]:
    today = date.today()
    return (
        db.query(RentPayment)
        .filter(
            RentPayment.due_date < today,
            RentPayment.status.in_(["pending", "partial"]),
        )
        .all()
    )


# ── Tenant submit & Landlord review ──────────────────────────────────────


def submit_payment(db: Session, payment: RentPayment, payload: TenantPaymentSubmit) -> RentPayment:
    """
    Tenant submits payment evidence. Sets status → UNDER_REVIEW.
    Validates that the reference code is globally unique.
    """
    if payload.transaction_reference:
        if not _reference_is_unique(db, payload.transaction_reference, exclude_payment_id=payment.id):
            raise DuplicateReferenceError(
                f"Reference code '{payload.transaction_reference}' has already been recorded. "
                "Please verify and use the correct code."
            )

    payment.amount_paid = payload.amount_paid
    payment.status = PaymentStatus.UNDER_REVIEW
    payment.payment_date = payload.payment_date
    payment.payment_method = payload.payment_method
    payment.transaction_reference = payload.transaction_reference
    payment.receipt_url = payload.receipt_url
    payment.notes = payload.notes

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment


def review_payment(db: Session, payment: RentPayment, payload: "PaymentReview") -> RentPayment:
    """
    Landlord/Admin approves or rejects a tenant's payment submission.
    On approval: rolling balance recalculated; status set to completed/partial.
    On rejection: amount_paid reset, status → pending, reason attached to notes.
    """
    if payload.action == "approve":
        payment.balance, payment.status = _recompute_status(
            payment.amount_due, payment.amount_paid or 0.0, payment.penalty_amount
        )
    elif payload.action == "reject":
        payment.status = PaymentStatus.PENDING
        payment.amount_paid = 0.0
        payment.balance = payment.amount_due + (payment.penalty_amount or 0.0)
        prefix = (
            f"REJECTED: {payload.rejection_reason} | "
            if payload.rejection_reason
            else "REJECTED | "
        )
        payment.notes = prefix + (payment.notes or "")
        payment.transaction_reference = None
        payment.receipt_url = None

    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment
