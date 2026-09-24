from sqlalchemy.orm import Session
from app.models.property import Property, Unit
from app.schemas.property import PropertyCreate, PropertyUpdate, UnitCreate, UnitUpdate
from app.schemas.property import UnitStatus

class PropertyNotFoundError(Exception):
    pass

class UnitNotFoundError(Exception):
    pass

def list_properties(db: Session, owner_id: str = None, skip: int = 0, limit: int = 50) -> list[Property]:
    query = db.query(Property)
    if owner_id:
        query = query.filter(Property.owner_id == owner_id)
    return query.offset(skip).limit(limit).all()

def get_property(db: Session, property_id: str, owner_id: str = None) -> Property:
    query = db.query(Property).filter(Property.id == property_id)
    if owner_id:
        query = query.filter(Property.owner_id == owner_id)
    prop = query.first()
    if not prop:
        raise PropertyNotFoundError("Property not found or access denied")
    return prop

def create_property(db: Session, payload: PropertyCreate, owner_id: str) -> Property:
    db_obj = Property(**payload.model_dump(), owner_id=owner_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_property(db: Session, prop: Property, payload: PropertyUpdate) -> Property:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(prop, key, value)
    db.add(prop)
    db.commit()
    db.refresh(prop)
    return prop

def delete_property(db: Session, prop: Property) -> None:
    prop.is_active = False
    db.add(prop)
    db.commit()

def list_units(db: Session, property_id: str, skip: int = 0, limit: int = 100) -> list[Unit]:
    return db.query(Unit).filter(Unit.property_id == property_id).offset(skip).limit(limit).all()

def get_unit(db: Session, unit_id: str) -> Unit:
    unit = db.query(Unit).filter(Unit.id == unit_id).first()
    if not unit:
        raise UnitNotFoundError("Unit not found")
    return unit

def create_unit(db: Session, property_id: str, payload: UnitCreate) -> Unit:
    db_obj = Unit(**payload.model_dump(), property_id=property_id)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_unit(db: Session, unit: Unit, payload: UnitUpdate) -> Unit:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(unit, key, value)
    db.add(unit)
    db.commit()
    db.refresh(unit)
    return unit

def get_occupancy_summary(db: Session, property_id: str) -> dict:
    units = db.query(Unit.status).filter(Unit.property_id == property_id).all()
    total = len(units)
    counts = {
        "occupied": 0,
        "available": 0,
        "under_maintenance": 0,
        "reserved": 0
    }
    for (status,) in units:
        if isinstance(status, UnitStatus):
            val = status.value
        elif hasattr(status, "name"):
            val = status.name
        else:
            val = str(status)
        if val in counts:
            counts[val] += 1
            
    occupancy_rate = (counts["occupied"] / total * 100) if total > 0 else 0.0
    
    return {
        "total_units": total,
        "occupied": counts["occupied"],
        "available": counts["available"],
        "under_maintenance": counts["under_maintenance"],
        "reserved": counts["reserved"],
        "occupancy_rate": occupancy_rate
    }
