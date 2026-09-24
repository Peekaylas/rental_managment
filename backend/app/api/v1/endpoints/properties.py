from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user
from app.models.user import User
from app.schemas.property import PropertyCreate, PropertyUpdate, PropertyResponse, UnitCreate, UnitUpdate, UnitResponse, OccupancySummary, UnitStatus
from app.services import property_service
from typing import List

router = APIRouter(prefix="/properties", tags=["Properties"])

@router.get("/", response_model=List[PropertyResponse])
def list_properties(db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    properties = property_service.list_properties(db, owner_id=owner_id)
    # Compute unit counts
    for p in properties:
        p.unit_count = len(p.units) if hasattr(p, 'units') else 0
    return properties

@router.post("/", response_model=PropertyResponse)
def create_property(payload: PropertyCreate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    prop = property_service.create_property(db, payload, owner_id=current_user.id)
    prop.unit_count = 0
    return prop

@router.get("/{property_id}", response_model=dict)
def get_property(property_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        prop = property_service.get_property(db, property_id, owner_id=owner_id)
        prop.unit_count = len(prop.units) if hasattr(prop, 'units') else 0
        summary = property_service.get_occupancy_summary(db, property_id)
        response_data = PropertyResponse.model_validate(prop).model_dump()
        response_data["occupancy_summary"] = summary
        return response_data
    except property_service.PropertyNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{property_id}", response_model=PropertyResponse)
def update_property(property_id: str, payload: PropertyUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        prop = property_service.get_property(db, property_id, owner_id=owner_id)
        updated = property_service.update_property(db, prop, payload)
        updated.unit_count = len(updated.units) if hasattr(updated, 'units') else 0
        return updated
    except property_service.PropertyNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.delete("/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_property(property_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        prop = property_service.get_property(db, property_id, owner_id=owner_id)
        property_service.delete_property(db, prop)
    except property_service.PropertyNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/{property_id}/units", response_model=List[UnitResponse])
def list_units(property_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        property_service.get_property(db, property_id, owner_id=owner_id)
        return property_service.list_units(db, property_id)
    except property_service.PropertyNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{property_id}/units", response_model=UnitResponse)
def create_unit(property_id: str, payload: UnitCreate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        property_service.get_property(db, property_id, owner_id=owner_id)
        return property_service.create_unit(db, property_id, payload)
    except property_service.PropertyNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.put("/{property_id}/units/{unit_id}", response_model=UnitResponse)
def update_unit(property_id: str, unit_id: str, payload: UnitUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        property_service.get_property(db, property_id, owner_id=owner_id)
        unit = property_service.get_unit(db, unit_id)
        if unit.property_id != property_id:
            raise HTTPException(status_code=400, detail="Unit does not belong to property")
        return property_service.update_unit(db, unit, payload)
    except (property_service.PropertyNotFoundError, property_service.UnitNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{property_id}/units/{unit_id}/status", response_model=UnitResponse)
def update_unit_status(property_id: str, unit_id: str, status_payload: dict, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    try:
        property_service.get_property(db, property_id, owner_id=owner_id)
        unit = property_service.get_unit(db, unit_id)
        if unit.property_id != property_id:
            raise HTTPException(status_code=400, detail="Unit does not belong to property")
        status_val = status_payload.get("status")
        if not status_val:
            raise HTTPException(status_code=400, detail="Status is required")
        payload = UnitUpdate(status=UnitStatus(status_val))
        return property_service.update_unit(db, unit, payload)
    except (property_service.PropertyNotFoundError, property_service.UnitNotFoundError) as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.get("/units/available", response_model=List[UnitResponse])
def list_available_units(db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    owner_id = current_user.id if getattr(current_user.role, 'value', str(current_user.role)) == "landlord" else None
    properties = property_service.list_properties(db, owner_id=owner_id)
    available_units = []
    for prop in properties:
        units = property_service.list_units(db, prop.id)
        for unit in units:
            unit_status = unit.status.value if hasattr(unit.status, 'value') else str(unit.status)
            if unit_status == "available":
                available_units.append(unit)
    return available_units
