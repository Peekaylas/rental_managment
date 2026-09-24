"""
RentPayment model — tracks each payment event on a lease.
"""
import enum

from sqlalchemy import Date, Enum, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class PaymentMethod(str, enum.Enum):
    MPESA = "mpesa"
    BANK_TRANSFER = "bank_transfer"
    CASH = "cash"
    CHEQUE = "cheque"
    CARD = "card"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    FAILED = "failed"
    REFUNDED = "refunded"
    PARTIAL = "partial"


class RentPayment(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A single rent payment transaction linked to a LeaseAgreement.

    Relationships:
        - lease: The parent LeaseAgreement.
    """

    __tablename__ = "rent_payments"

    # ── Parent lease ──────────────────────────────────────────────────────
    lease_id: Mapped[str] = mapped_column(
        ForeignKey("lease_agreements.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    lease: Mapped["LeaseAgreement"] = relationship(
        "LeaseAgreement", back_populates="payments"
    )

    # ── Amount ────────────────────────────────────────────────────────────
    amount_due: Mapped[float] = mapped_column(Float, nullable=False)
    amount_paid: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    balance: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
    penalty_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)

    # ── Dates ─────────────────────────────────────────────────────────────
    due_date: Mapped[None] = mapped_column(Date, nullable=False)
    payment_date: Mapped[None] = mapped_column(Date, nullable=True)
    period_start: Mapped[None] = mapped_column(Date, nullable=False)
    period_end: Mapped[None] = mapped_column(Date, nullable=False)

    # ── Transaction meta ──────────────────────────────────────────────────
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        Enum(PaymentMethod, name="payment_method"), nullable=True
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"),
        nullable=False,
        default=PaymentStatus.PENDING,
    )
    transaction_reference: Mapped[str | None] = mapped_column(
        String(255), unique=True, nullable=True
    )
    receipt_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    def __repr__(self) -> str:
        return (
            f"<RentPayment id={self.id} lease_id={self.lease_id} "
            f"amount_due={self.amount_due} status={self.status}>"
        )
