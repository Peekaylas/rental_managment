from datetime import datetime
from typing import Optional, Dict
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum

class TicketCategory(str, Enum):
    plumbing = "plumbing"
    electrical = "electrical"
    hvac = "hvac"
    structural = "structural"
    pest_control = "pest_control"
    appliance = "appliance"
    security = "security"
    cleaning = "cleaning"
    other = "other"

class TicketPriority(str, Enum):
    low = "low"
    medium = "medium"
    high = "high"
    urgent = "urgent"

class TicketStatus(str, Enum):
    open = "open"
    in_progress = "in_progress"
    on_hold = "on_hold"
    resolved = "resolved"
    closed = "closed"
    rejected = "rejected"

class TicketBase(BaseModel):
    title: str = Field(..., min_length=5)
    description: str = Field(..., min_length=10)
    category: TicketCategory
    priority: TicketPriority = TicketPriority.medium
    image_url: Optional[str] = None

class TicketCreate(TicketBase):
    unit_id: str

class TicketUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=5)
    description: Optional[str] = Field(None, min_length=10)
    category: Optional[TicketCategory] = None
    priority: Optional[TicketPriority] = None
    status: Optional[TicketStatus] = None
    assigned_to_id: Optional[str] = None
    resolution_notes: Optional[str] = None
    estimated_cost: Optional[float] = None
    actual_cost: Optional[float] = None
    # Cost accountability: landlord toggles whether tenant is at fault
    is_tenant_fault: Optional[bool] = None

class TicketStatusUpdate(BaseModel):
    status: TicketStatus
    resolution_notes: Optional[str] = None
    actual_cost: Optional[float] = None
    is_tenant_fault: Optional[bool] = None

class UnitBasic(BaseModel):
    unit_number: str
    property: 'PropertyBasic'
    model_config = ConfigDict(from_attributes=True)

class PropertyBasic(BaseModel):
    name: str
    model_config = ConfigDict(from_attributes=True)

class UserBasic(BaseModel):
    full_name: str
    model_config = ConfigDict(from_attributes=True)

class TicketResponse(TicketBase):
    id: str
    unit_id: str
    reported_by_id: Optional[str]
    assigned_to_id: Optional[str]
    status: TicketStatus
    resolution_notes: Optional[str]
    estimated_cost: Optional[float]
    actual_cost: Optional[float]
    is_tenant_fault: bool = False
    is_billed_to_tenant: bool = False
    unit: UnitBasic
    reported_by: Optional[UserBasic] = None
    assigned_to: Optional[UserBasic] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

UnitBasic.model_rebuild()

class TicketStats(BaseModel):
    open_count: int
    in_progress_count: int
    resolved_count: int
    urgent_count: int
    by_category: Dict[str, int]
