"""
Tenant profile model — extends a User record with rental-specific details.
"""
import enum

from sqlalchemy import Date, Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class EmploymentStatus(str, enum.Enum):
    EMPLOYED = "employed"
    SELF_EMPLOYED = "self_employed"
    STUDENT = "student"
    UNEMPLOYED = "unemployed"
    RETIRED = "retired"


class Tenant(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Extended tenant profile linked one-to-one with a User account.

    Relationships:
        - user:    The User this profile belongs to.
        - leases:  All lease agreements this tenant is a party to.
    """

    __tablename__ = "tenants"

    # ── One-to-one link ───────────────────────────────────────────────────
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    user: Mapped["User"] = relationship("User", back_populates="tenant_profile")

    # ── Personal info ─────────────────────────────────────────────────────
    national_id: Mapped[str | None] = mapped_column(String(50), unique=True, nullable=True)
    date_of_birth: Mapped[None] = mapped_column(Date, nullable=True)
    emergency_contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    emergency_contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Employment / financial ────────────────────────────────────────────
    employment_status: Mapped[EmploymentStatus | None] = mapped_column(
        Enum(EmploymentStatus, name="employment_status"), nullable=True
    )
    employer_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    monthly_income: Mapped[float | None] = mapped_column(nullable=True)

    # ── Notes ─────────────────────────────────────────────────────────────
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    # ── Relationships ─────────────────────────────────────────────────────
    leases: Mapped[list["LeaseAgreement"]] = relationship(
        "LeaseAgreement", back_populates="tenant", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Tenant id={self.id} user_id={self.user_id}>"
