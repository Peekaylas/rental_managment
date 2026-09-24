from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field
from enum import Enum

class PropertyType(str, Enum):
    apartment = "apartment"
    house = "house"
    commercial = "commercial"
    bedsitter = "bedsitter"
    studio = "studio"
    other = "other"

class UnitStatus(str, Enum):
    available = "available"
    occupied = "occupied"
    under_maintenance = "under_maintenance"
    reserved = "reserved"

class PropertyBase(BaseModel):
    name: str = Field(..., description="Name of the property")
    description: Optional[str] = None
    property_type: PropertyType
    address_line1: str
    address_line2: Optional[str] = None
    city: str
    county: str
    postal_code: Optional[str] = None
    is_active: bool = True

class PropertyCreate(PropertyBase):
    pass

class PropertyUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    property_type: Optional[PropertyType] = None
    address_line1: Optional[str] = None
    address_line2: Optional[str] = None
    city: Optional[str] = None
    county: Optional[str] = None
    postal_code: Optional[str] = None
    is_active: Optional[bool] = None

class PropertyResponse(PropertyBase):
    id: str
    owner_id: str
    unit_count: int = 0         # virtual, populated in endpoints from len(prop.units)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class UnitBase(BaseModel):
    unit_number: str
    floor_number: Optional[str] = None
    bedrooms: int = Field(default=1, ge=0)
    bathrooms: float = Field(default=1.0, ge=0.0)
    size_sqm: Optional[float] = Field(default=None, ge=0.0)
    monthly_rent: float = Field(..., gt=0.0)
    security_deposit: float = Field(default=0.0, ge=0.0)
    status: UnitStatus = UnitStatus.available
    description: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    unit_number: Optional[str] = None
    floor_number: Optional[str] = None
    bedrooms: Optional[int] = Field(default=None, ge=0)
    bathrooms: Optional[float] = Field(default=None, ge=0.0)
    size_sqm: Optional[float] = Field(default=None, ge=0.0)
    monthly_rent: Optional[float] = Field(default=None, gt=0.0)
    security_deposit: Optional[float] = Field(default=None, ge=0.0)
    status: Optional[UnitStatus] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class UnitResponse(UnitBase):
    id: str
    property_id: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class OccupancySummary(BaseModel):
    total_units: int
    occupied: int
    available: int
    under_maintenance: int
    reserved: int
    occupancy_rate: float
