from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum

class EmploymentStatus(str, Enum):
    employed = "employed"
    self_employed = "self_employed"
    student = "student"
    unemployed = "unemployed"
    retired = "retired"

class UserRole(str, Enum):
    admin = "admin"
    landlord = "landlord"
    tenant = "tenant"

class UserBasic(BaseModel):
    full_name: str
    email: str
    phone_number: Optional[str] = None
    role: UserRole

    model_config = ConfigDict(from_attributes=True)

class TenantBase(BaseModel):
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    employer_name: Optional[str] = None
    monthly_income: Optional[float] = Field(default=None, ge=0.0)
    notes: Optional[str] = None

class TenantCreate(TenantBase):
    user_id: str

class TenantUpdate(BaseModel):
    national_id: Optional[str] = None
    date_of_birth: Optional[date] = None
    emergency_contact_name: Optional[str] = None
    emergency_contact_phone: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    employer_name: Optional[str] = None
    monthly_income: Optional[float] = Field(default=None, ge=0.0)
    notes: Optional[str] = None

class TenantResponse(TenantBase):
    id: str
    user_id: str
    user: UserBasic
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
