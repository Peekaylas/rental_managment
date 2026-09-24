"""
MaintenanceTicket model — tenant-raised repair/service requests.
"""
import enum

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class TicketCategory(str, enum.Enum):
    PLUMBING = "plumbing"
    ELECTRICAL = "electrical"
    HVAC = "hvac"
    STRUCTURAL = "structural"
    PEST_CONTROL = "pest_control"
    APPLIANCE = "appliance"
    SECURITY = "security"
    CLEANING = "cleaning"
    OTHER = "other"


class TicketPriority(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TicketStatus(str, enum.Enum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    ON_HOLD = "on_hold"
    RESOLVED = "resolved"
    CLOSED = "closed"
    REJECTED = "rejected"


class MaintenanceTicket(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A service/repair request raised by a Tenant for a specific Unit.

    Relationships:
        - unit:         The Unit that needs maintenance.
        - reported_by:  The User (tenant) who filed the ticket.
        - assigned_to:  The User (staff/admin) handling the ticket.
    """

    __tablename__ = "maintenance_tickets"

    # ── Location ──────────────────────────────────────────────────────────
    unit_id: Mapped[str] = mapped_column(
        ForeignKey("units.id", ondelete="CASCADE"), nullable=False, index=True
    )
    unit: Mapped["Unit"] = relationship("Unit", back_populates="tickets")

    # ── Reporter ──────────────────────────────────────────────────────────
    reported_by_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    reported_by: Mapped["User"] = relationship(
        "User", foreign_keys=[reported_by_id]
    )

    # ── Assignee (optional) ───────────────────────────────────────────────
    assigned_to_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    assigned_to: Mapped["User | None"] = relationship(
        "User", foreign_keys=[assigned_to_id]
    )

    # ── Details ───────────────────────────────────────────────────────────
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[TicketCategory] = mapped_column(
        Enum(TicketCategory, name="ticket_category"),
        nullable=False,
        default=TicketCategory.OTHER,
    )
    priority: Mapped[TicketPriority] = mapped_column(
        Enum(TicketPriority, name="ticket_priority"),
        nullable=False,
        default=TicketPriority.MEDIUM,
    )
    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"),
        nullable=False,
        default=TicketStatus.OPEN,
    )

    # ── Resolution ────────────────────────────────────────────────────────
    resolution_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    estimated_cost: Mapped[float | None] = mapped_column(nullable=True)
    actual_cost: Mapped[float | None] = mapped_column(nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    def __repr__(self) -> str:
        return (
            f"<MaintenanceTicket id={self.id} title={self.title!r} "
            f"status={self.status} priority={self.priority}>"
        )
