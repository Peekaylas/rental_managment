"""
Property and Unit models.

Hierarchy: Property (building) → Unit (individual rentable space).
"""
import enum

from sqlalchemy import Boolean, Enum, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class PropertyType(str, enum.Enum):
    APARTMENT = "apartment"
    HOUSE = "house"
    COMMERCIAL = "commercial"
    BEDSITTER = "bedsitter"
    STUDIO = "studio"
    OTHER = "other"


class UnitStatus(str, enum.Enum):
    AVAILABLE = "available"
    OCCUPIED = "occupied"
    UNDER_MAINTENANCE = "under_maintenance"
    RESERVED = "reserved"


class Property(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A physical property/building owned by a Landlord user.

    Relationships:
        - owner:  The landlord (User) who owns this property.
        - units:  Individual rentable units within the property.
    """

    __tablename__ = "properties"

    # ── Core fields ───────────────────────────────────────────────────────
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    property_type: Mapped[PropertyType] = mapped_column(
        Enum(PropertyType, name="property_type"), nullable=False
    )
    address_line1: Mapped[str] = mapped_column(String(255), nullable=False)
    address_line2: Mapped[str | None] = mapped_column(String(255), nullable=True)
    city: Mapped[str] = mapped_column(String(100), nullable=False)
    county: Mapped[str] = mapped_column(String(100), nullable=False)
    postal_code: Mapped[str | None] = mapped_column(String(20), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Ownership ─────────────────────────────────────────────────────────
    owner_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    owner: Mapped["User"] = relationship("User", back_populates="owned_properties")

    # ── Children ──────────────────────────────────────────────────────────
    units: Mapped[list["Unit"]] = relationship(
        "Unit", back_populates="property", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Property id={self.id} name={self.name!r}>"


class Unit(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    A single rentable unit within a Property.

    Relationships:
        - property:   Parent Property.
        - leases:     All LeaseAgreements ever assigned to this unit.
        - tickets:    MaintenanceTickets raised against this unit.
    """

    __tablename__ = "units"

    # ── Core fields ───────────────────────────────────────────────────────
    unit_number: Mapped[str] = mapped_column(String(50), nullable=False)
    floor_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bedrooms: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    bathrooms: Mapped[float] = mapped_column(Float, default=1.0, nullable=False)
    size_sqm: Mapped[float | None] = mapped_column(Float, nullable=True)
    monthly_rent: Mapped[float] = mapped_column(Float, nullable=False)
    security_deposit: Mapped[float] = mapped_column(Float, nullable=False)
    status: Mapped[UnitStatus] = mapped_column(
        Enum(UnitStatus, name="unit_status"),
        nullable=False,
        default=UnitStatus.AVAILABLE,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Parent FK ─────────────────────────────────────────────────────────
    property_id: Mapped[str] = mapped_column(
        ForeignKey("properties.id", ondelete="CASCADE"), nullable=False, index=True
    )
    property: Mapped["Property"] = relationship("Property", back_populates="units")

    # ── Children ──────────────────────────────────────────────────────────
    leases: Mapped[list["LeaseAgreement"]] = relationship(
        "LeaseAgreement", back_populates="unit", cascade="all, delete-orphan"
    )
    tickets: Mapped[list["MaintenanceTicket"]] = relationship(
        "MaintenanceTicket", back_populates="unit", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Unit id={self.id} unit_number={self.unit_number!r} status={self.status}>"
