from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum

class PaymentMethod(str, Enum):
    mpesa = "mpesa"
    bank_transfer = "bank_transfer"
    cash = "cash"
    cheque = "cheque"
    card = "card"

class PaymentStatus(str, Enum):
    pending = "pending"
    completed = "completed"
    failed = "failed"
    refunded = "refunded"
    partial = "partial"

class PaymentBase(BaseModel):
    amount_due: float = Field(..., gt=0.0)
    amount_paid: float = Field(default=0.0, ge=0.0)
    due_date: date
    period_start: date
    period_end: date
    payment_method: Optional[PaymentMethod] = None
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    lease_id: str

class PaymentRecord(BaseModel):
    amount_paid: float = Field(..., gt=0.0)
    payment_date: date
    payment_method: PaymentMethod
    transaction_reference: Optional[str] = None
    notes: Optional[str] = None

class LeaseBasic(BaseModel):
    tenant: 'TenantBasic'
    unit: 'UnitBasic'
    model_config = ConfigDict(from_attributes=True)

class TenantBasic(BaseModel):
    user: 'UserBasic'
    model_config = ConfigDict(from_attributes=True)

class UserBasic(BaseModel):
    full_name: str
    model_config = ConfigDict(from_attributes=True)

class UnitBasic(BaseModel):
    unit_number: str
    model_config = ConfigDict(from_attributes=True)

class PaymentResponse(PaymentBase):
    id: str
    lease_id: str
    balance: float
    penalty_amount: float
    payment_date: Optional[date] = None
    status: PaymentStatus
    receipt_url: Optional[str] = None
    lease: Optional[LeaseBasic] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

LeaseBasic.model_rebuild()
TenantBasic.model_rebuild()

class LedgerSummary(BaseModel):
    total_billed: float
    total_paid: float
    total_outstanding: float
    total_overdue_count: int
    paid_count: int
    pending_count: int
    partial_count: int
