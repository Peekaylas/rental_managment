"""
Models package — import all models here so Alembic can auto-detect them.
"""
from app.models.user import User, UserRole
from app.models.property import Property, Unit, PropertyType, UnitStatus
from app.models.tenant import Tenant, EmploymentStatus
from app.models.lease import LeaseAgreement, LeaseStatus
from app.models.payment import RentPayment, PaymentStatus, PaymentMethod
from app.models.maintenance import MaintenanceTicket, TicketCategory, TicketPriority, TicketStatus

__all__ = [
    "User", "UserRole",
    "Property", "Unit", "PropertyType", "UnitStatus",
    "Tenant", "EmploymentStatus",
    "LeaseAgreement", "LeaseStatus",
    "RentPayment", "PaymentStatus", "PaymentMethod",
    "MaintenanceTicket", "TicketCategory", "TicketPriority", "TicketStatus",
]
