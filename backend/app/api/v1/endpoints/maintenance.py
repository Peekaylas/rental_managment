from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin, require_admin, require_any_role, get_current_user
from app.models.user import User
from app.schemas.maintenance import TicketCreate, TicketUpdate, TicketStatusUpdate, TicketResponse, TicketStats
from app.services import maintenance_service, tenant_service, lease_service
from typing import List

router = APIRouter(prefix="/maintenance", tags=["Maintenance"])

@router.get("/", response_model=List[TicketResponse])
def list_tickets(unit_id: str = None, status: str = None, priority: str = None, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    role = getattr(current_user.role, 'value', str(current_user.role))
    if role == "admin":
        return maintenance_service.list_tickets(db, unit_id=unit_id, status=status, priority=priority)
    elif role == "landlord":
        return maintenance_service.list_tickets(db, owner_id=current_user.id, unit_id=unit_id, status=status, priority=priority)
    else:
        return maintenance_service.list_tickets(db, reported_by_id=current_user.id, status=status, priority=priority)

@router.post("/", response_model=TicketResponse)
def create_ticket(payload: TicketCreate, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    return maintenance_service.create_ticket(db, payload, reported_by_id=current_user.id)

@router.get("/stats", response_model=TicketStats)
def get_ticket_stats(db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    role = getattr(current_user.role, 'value', str(current_user.role))
    owner_id = current_user.id if role == "landlord" else None
    return maintenance_service.get_ticket_stats(db, owner_id=owner_id)

@router.get("/my-tickets", response_model=List[TicketResponse])
def get_my_tickets(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    return maintenance_service.list_tickets(db, reported_by_id=current_user.id)

@router.get("/{ticket_id}", response_model=TicketResponse)
def get_ticket(ticket_id: str, db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    try:
        ticket = maintenance_service.get_ticket(db, ticket_id)
        role = getattr(current_user.role, 'value', str(current_user.role))
        if role == "tenant" and ticket.reported_by_id != current_user.id:
            raise HTTPException(status_code=403, detail="Not authorized")
        return ticket
    except maintenance_service.TicketNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{ticket_id}", response_model=TicketResponse)
def update_ticket(ticket_id: str, payload: TicketUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        ticket = maintenance_service.get_ticket(db, ticket_id)
        return maintenance_service.update_ticket(db, ticket, payload)
    except maintenance_service.TicketNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.patch("/{ticket_id}/status", response_model=TicketResponse)
def update_ticket_status(ticket_id: str, payload: TicketStatusUpdate, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    try:
        ticket = maintenance_service.get_ticket(db, ticket_id)
        return maintenance_service.update_ticket_status(db, ticket, payload)
    except maintenance_service.TicketNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))

@router.post("/{ticket_id}/assign", response_model=TicketResponse)
def assign_ticket(ticket_id: str, payload: dict, db: Session = Depends(get_db), current_user: User = Depends(require_landlord_or_admin)):
    assignee_id = payload.get("assignee_id")
    if not assignee_id:
        raise HTTPException(status_code=400, detail="assignee_id is required")
    try:
        ticket = maintenance_service.get_ticket(db, ticket_id)
        return maintenance_service.assign_ticket(db, ticket, assignee_id)
    except maintenance_service.TicketNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
