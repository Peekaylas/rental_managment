from sqlalchemy.orm import Session, joinedload
from app.models.maintenance import MaintenanceTicket
from app.models.property import Unit
from app.schemas.maintenance import TicketCreate, TicketUpdate, TicketStatusUpdate, TicketStatus
from app.schemas.property import UnitStatus

class TicketNotFoundError(Exception):
    pass

def list_tickets(db: Session, unit_id: str = None, status: str = None, priority: str = None, reported_by_id: str = None, skip: int = 0, limit: int = 50) -> list[MaintenanceTicket]:
    query = db.query(MaintenanceTicket).options(joinedload(MaintenanceTicket.unit), joinedload(MaintenanceTicket.reported_by), joinedload(MaintenanceTicket.assigned_to))
    if unit_id:
        query = query.filter(MaintenanceTicket.unit_id == unit_id)
    if status:
        query = query.filter(MaintenanceTicket.status == status)
    if priority:
        query = query.filter(MaintenanceTicket.priority == priority)
    if reported_by_id:
        query = query.filter(MaintenanceTicket.reported_by_id == reported_by_id)
    return query.offset(skip).limit(limit).all()

def get_ticket(db: Session, ticket_id: str) -> MaintenanceTicket:
    ticket = db.query(MaintenanceTicket).options(joinedload(MaintenanceTicket.unit), joinedload(MaintenanceTicket.reported_by), joinedload(MaintenanceTicket.assigned_to)).filter(MaintenanceTicket.id == ticket_id).first()
    if not ticket:
        raise TicketNotFoundError("Ticket not found")
    return ticket

def create_ticket(db: Session, payload: TicketCreate, reported_by_id: str) -> MaintenanceTicket:
    db_obj = MaintenanceTicket(**payload.model_dump(), reported_by_id=reported_by_id, status=TicketStatus.open)
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def update_ticket(db: Session, ticket: MaintenanceTicket, payload: TicketUpdate) -> MaintenanceTicket:
    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(ticket, key, value)
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

def update_ticket_status(db: Session, ticket: MaintenanceTicket, payload: TicketStatusUpdate) -> MaintenanceTicket:
    ticket.status = payload.status
    if payload.resolution_notes is not None:
        ticket.resolution_notes = payload.resolution_notes
    if payload.actual_cost is not None:
        ticket.actual_cost = payload.actual_cost
        
    status_val = payload.status.value if hasattr(payload.status, 'value') else str(payload.status)
    if status_val in ["resolved", "closed"]:
        if ticket.unit:
            unit_status_val = ticket.unit.status.value if hasattr(ticket.unit.status, 'value') else str(ticket.unit.status)
            if unit_status_val == "under_maintenance":
                ticket.unit.status = UnitStatus.available
                db.add(ticket.unit)
                
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket

def get_ticket_stats(db: Session) -> dict:
    tickets = db.query(MaintenanceTicket.status, MaintenanceTicket.priority, MaintenanceTicket.category).all()
    stats = {
        "open_count": 0,
        "in_progress_count": 0,
        "resolved_count": 0,
        "urgent_count": 0,
        "by_category": {}
    }
    
    for t in tickets:
        status = t[0].value if hasattr(t[0], 'value') else str(t[0])
        priority = t[1].value if hasattr(t[1], 'value') else str(t[1])
        category = t[2].value if hasattr(t[2], 'value') else str(t[2])
        
        if status == "open":
            stats["open_count"] += 1
        elif status == "in_progress":
            stats["in_progress_count"] += 1
        elif status in ["resolved", "closed"]:
            stats["resolved_count"] += 1
            
        if priority == "urgent":
            stats["urgent_count"] += 1
            
        stats["by_category"][category] = stats["by_category"].get(category, 0) + 1
        
    return stats

def assign_ticket(db: Session, ticket: MaintenanceTicket, assignee_id: str) -> MaintenanceTicket:
    ticket.assigned_to_id = assignee_id
    ticket.status = TicketStatus.in_progress
    db.add(ticket)
    db.commit()
    db.refresh(ticket)
    return ticket
