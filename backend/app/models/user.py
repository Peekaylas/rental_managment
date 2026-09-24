"""
User model — supports three roles: Admin, Landlord, Tenant.
Includes invite_token for secure tenant onboarding.
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

    # ── Invite / Onboarding ──────────────────────────────────────────────
    # A signed token sent to the tenant's email so they can claim their account
    # and set their own password. Cleared after first use.
    invite_token: Mapped[str | None] = mapped_column(
        String(512), nullable=True, unique=True, index=True
    )
    # Marks whether this account was auto-created via the landlord invitation
    # flow and still needs the tenant to claim it.
    is_claimed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # ── Relationships ─────────────────────────────────────────────────────
    owned_properties: Mapped[list["Property"]] = relationship(
        "Property", back_populates="owner", cascade="all, delete-orphan"
    )
    tenant_profile: Mapped["Tenant | None"] = relationship(
        "Tenant", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email} role={self.role}>"
