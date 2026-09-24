"""
Lease service — with unit double-booking prevention and lease-termination guard.

Security patches:
  - Unit double-booking: activation checks for existing active leases on the unit
    using a DB-level query, preventing race conditions from concurrent requests.
  - Lease termination guard: blocked when UNDER_REVIEW payments exist on the lease.
"""

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select

from app.models.lease import LeaseAgreement, LeaseStatus
from app.models.payment import RentPayment, PaymentStatus
from app.models.property import Unit
from app.schemas.lease import LeaseCreate
from app.schemas.property import UnitStatus


# ── Custom exceptions ─────────────────────────────────────────────────────


class LeaseNotFoundError(Exception):
    pass


class UnitNotAvailableError(Exception):
    pass


class ActiveLeaseExistsError(Exception):
    """Raised when activating a lease on a unit that already has an active lease."""
    pass


class PendingReviewBlockError(Exception):
    """Raised when a termination is blocked by an outstanding payment review."""
    pass


# ── Queries ───────────────────────────────────────────────────────────────


def _get_active_lease_on_unit(db: Session, unit_id: str, exclude_lease_id: str = None) -> LeaseAgreement | None:
    """
    Returns any currently ACTIVE lease for the given unit.
    Used as a double-booking guard.
    """
    query = (
        db.query(LeaseAgreement)
        .filter(
            LeaseAgreement.unit_id == unit_id,
            LeaseAgreement.status == LeaseStatus.ACTIVE,
        )
    )
    if exclude_lease_id:
        query = query.filter(LeaseAgreement.id != exclude_lease_id)
    return query.first()


def _has_pending_reviews(db: Session, lease_id: str) -> bool:
    """True if this lease has at least one payment awaiting review."""
    return (
        db.query(RentPayment)
        .filter(
            RentPayment.lease_id == lease_id,
            RentPayment.status == PaymentStatus.UNDER_REVIEW,
        )
        .first()
        is not None
    )


# ── Service functions ─────────────────────────────────────────────────────


def list_leases(
    db: Session,
    unit_id: str = None,
    tenant_id: str = None,
    status: str = None,
    skip: int = 0,
    limit: int = 50,
) -> list[LeaseAgreement]:
    query = db.query(LeaseAgreement).options(
        joinedload(LeaseAgreement.unit),
        joinedload(LeaseAgreement.tenant),
    )
    if unit_id:
        query = query.filter(LeaseAgreement.unit_id == unit_id)
    if tenant_id:
        query = query.filter(LeaseAgreement.tenant_id == tenant_id)
    if status:
        query = query.filter(LeaseAgreement.status == status)
    return query.offset(skip).limit(limit).all()


def get_lease(db: Session, lease_id: str) -> LeaseAgreement:
    lease = (
        db.query(LeaseAgreement)
        .options(joinedload(LeaseAgreement.unit), joinedload(LeaseAgreement.tenant))
        .filter(LeaseAgreement.id == lease_id)
        .first()
    )
    if not lease:
        raise LeaseNotFoundError("Lease not found")
    return lease


def create_lease(db: Session, payload: LeaseCreate) -> LeaseAgreement:
    unit = db.query(Unit).filter(Unit.id == payload.unit_id).first()
    if not unit:
        raise ValueError("Unit not found")

    unit_status_val = unit.status.value if hasattr(unit.status, "value") else str(unit.status)
    if unit_status_val != "available":
        raise UnitNotAvailableError("Unit is not available for leasing")

    db_obj = LeaseAgreement(**payload.model_dump(), status=LeaseStatus.PENDING)
    unit.status = UnitStatus.reserved
    db.add(db_obj)
    db.add(unit)
    db.commit()
    db.refresh(db_obj)
    return db_obj


def activate_lease(db: Session, lease: LeaseAgreement) -> LeaseAgreement:
    """
    Activates a pending lease.

    Double-booking guard: checks that no other ACTIVE lease exists for this unit
    at the point of activation, preventing race conditions.
    """
    existing = _get_active_lease_on_unit(db, lease.unit_id, exclude_lease_id=lease.id)
    if existing:
        raise ActiveLeaseExistsError(
            f"Unit already has an active lease (ID: {existing.id}). "
            "Cannot activate a second lease on the same unit."
        )

    lease.status = LeaseStatus.ACTIVE
    if lease.unit:
        lease.unit.status = UnitStatus.occupied
        db.add(lease.unit)
    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease


def update_lease_status(db: Session, lease: LeaseAgreement, status: LeaseStatus) -> LeaseAgreement:
    """
    Updates the lease status.

    Termination guard: blocks termination/expiry if any payment on this lease
    is currently UNDER_REVIEW to prevent financial data loss mid-review.
    """
    status_val = status.value if hasattr(status, "value") else str(status)
    if status_val in ("terminated", "expired"):
        if _has_pending_reviews(db, lease.id):
            raise PendingReviewBlockError(
                "Cannot terminate this lease — there are payment submissions pending review. "
                "Please approve or reject all outstanding payments first."
            )

    lease.status = status
    if status_val in ("terminated", "expired"):
        if lease.unit:
            lease.unit.status = UnitStatus.available
            db.add(lease.unit)

    db.add(lease)
    db.commit()
    db.refresh(lease)
    return lease


def get_active_lease_for_unit(db: Session, unit_id: str) -> LeaseAgreement | None:
    return (
        db.query(LeaseAgreement)
        .filter(LeaseAgreement.unit_id == unit_id, LeaseAgreement.status == "active")
        .first()
    )
