"""
LeaseAgreement model.

A lease ties a Tenant to a specific Unit for a defined period.
"""
import enum

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class LeaseStatus(str, enum.Enum):
    PENDING = "pending"         # awaiting landlord approval
    ACTIVE = "active"           # currently running
    EXPIRED = "expired"         # past end date, not renewed
    TERMINATED = "terminated"   # ended early
    RENEWED = "renewed"         # superseded by a new lease


class LeaseAgreement(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Formal agreement between a Tenant and the owner of a Unit.

    Relationships:
        - unit:     The rented Unit.
        - tenant:   The signing Tenant profile.
        - payments: All RentPayments made under this lease.
    """

    __tablename__ = "lease_agreements"

    # ── Parties ───────────────────────────────────────────────────────────
    unit_id: Mapped[str] = mapped_column(
        ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit: Mapped["Unit"] = relationship("Unit", back_populates="leases")

    tenant_id: Mapped[str] = mapped_column(
        ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tenant: Mapped["Tenant"] = relationship("Tenant", back_populates="leases")

    # ── Terms ─────────────────────────────────────────────────────────────
    start_date: Mapped[None] = mapped_column(Date, nullable=False)
    end_date: Mapped[None] = mapped_column(Date, nullable=False)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Float, nullable=False)
    rent_due_day: Mapped[int] = mapped_column(default=1, nullable=False)   # day-of-month

    # ── Status ────────────────────────────────────────────────────────────
    status: Mapped[LeaseStatus] = mapped_column(
        Enum(LeaseStatus, name="lease_status"),
        nullable=False,
        default=LeaseStatus.PENDING,
    )

    # ── Additional clauses ────────────────────────────────────────────────
    special_conditions: Mapped[str | None] = mapped_column(Text, nullable=True)
    document_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    # ── Children ──────────────────────────────────────────────────────────
    payments: Mapped[list["RentPayment"]] = relationship(
        "RentPayment", back_populates="lease", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<LeaseAgreement id={self.id} "
            f"unit_id={self.unit_id} tenant_id={self.tenant_id} "
            f"status={self.status}>"
        )
