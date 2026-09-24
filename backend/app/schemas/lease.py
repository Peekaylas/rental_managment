from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field, model_validator
from enum import Enum

class LeaseStatus(str, Enum):
    pending = "pending"
    active = "active"
    expired = "expired"
    terminated = "terminated"
    renewed = "renewed"

class LeaseBase(BaseModel):
    start_date: date
    end_date: date
    monthly_rent: float = Field(..., gt=0.0)
    security_deposit: float = Field(default=0.0, ge=0.0)
    rent_due_day: int = Field(default=1, ge=1, le=28)
    special_conditions: Optional[str] = None
    document_url: Optional[str] = None

class LeaseCreate(LeaseBase):
    unit_id: str
    tenant_id: str

    @model_validator(mode='after')
    def check_dates(self) -> 'LeaseCreate':
        if self.end_date <= self.start_date:
            raise ValueError('end_date must be after start_date')
        return self

class LeaseUpdate(BaseModel):
    status: Optional[LeaseStatus] = None
    special_conditions: Optional[str] = None
    document_url: Optional[str] = None

class LeaseStatusUpdate(BaseModel):
    status: LeaseStatus

class UnitBasic(BaseModel):
    unit_number: str
    property: Optional['PropertyBasic'] = None
    model_config = ConfigDict(from_attributes=True)

class PropertyBasic(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True)

class TenantBasic(BaseModel):
    user: 'UserBasic'
    model_config = ConfigDict(from_attributes=True)

class UserBasic(BaseModel):
    full_name: str
    email: str
    model_config = ConfigDict(from_attributes=True)

class LeaseResponse(LeaseBase):
    id: str
    unit_id: str
    tenant_id: str
    status: LeaseStatus
    unit: UnitBasic
    tenant: TenantBasic
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

UnitBasic.model_rebuild()
TenantBasic.model_rebuild()
