"""
User model — supports three roles: Admin, Landlord, Tenant.
"""
import enum

from sqlalchemy import Boolean, Enum, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.mixins import UUIDPrimaryKeyMixin, TimestampMixin


class UserRole(str, enum.Enum):
    ADMIN = "admin"
    LANDLORD = "landlord"
    TENANT = "tenant"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Central authentication and identity model.

    Relationships:
        - owned_properties: Properties registered by this landlord.
        - tenant_profile:   Detailed Tenant record (one-to-one, optional).
    """

    __tablename__ = "users"

    # ── Identity ─────────────────────────────────────────────────────────
    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone_number: Mapped[str | None] = mapped_column(String(20), nullable=True)

    # ── Auth ─────────────────────────────────────────────────────────────
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role"), nullable=False, default=UserRole.TENANT
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    owned_properties: Mapped[list["Property"]] = relationship(
        "Property", back_populates="owner", cascade="all, delete-orphan"
    )
    tenant_profile: Mapped["Tenant | None"] = relationship(
        "Tenant", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
