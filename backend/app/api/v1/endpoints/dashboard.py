from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from datetime import date, timedelta

from app.db.session import get_db
from app.api.v1.dependencies import require_landlord_or_admin
from app.api.v1.dependencies import require_any_role, get_current_user
from app.models.user import User
from app.models.property import Property, Unit
from app.models.lease import LeaseAgreement
from app.models.payment import RentPayment
from app.models.maintenance import MaintenanceTicket

router = APIRouter()

@router.get("/landlord", summary="Get Landlord Dashboard Data")
def get_landlord_dashboard(
    current_user: User = Depends(require_landlord_or_admin),
    db: Session = Depends(get_db)
):
    owner_id = current_user.id
    
    # 1. Properties & Units Stats
    properties = db.query(Property).filter(Property.owner_id == owner_id).all()
    prop_ids = [p.id for p in properties]
    
    total_properties = len(properties)
    units = db.query(Unit).filter(Unit.property_id.in_(prop_ids)).all() if prop_ids else []
    total_units = len(units)
    occupied_units = len([u for u in units if u.status.value == 'occupied'])
    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # 2. Financial Metrics (Current Month)
    today = date.today()
    start_of_month = today.replace(day=1)
    
    # We need leases for this landlord's units
    unit_ids = [u.id for u in units]
    leases = db.query(LeaseAgreement).filter(LeaseAgreement.unit_id.in_(unit_ids)).all() if unit_ids else []
    lease_ids = [l.id for l in leases]
    
    payments = db.query(RentPayment).filter(RentPayment.lease_id.in_(lease_ids)).all() if lease_ids else []
    
    monthly_revenue = sum(p.amount_paid for p in payments if p.payment_date and p.payment_date.month == today.month and p.payment_date.year == today.year)
    pending_payments = sum(p.balance for p in payments if p.status.value in ['pending', 'partial'] and p.due_date >= today)
    overdue_amount = sum(p.balance for p in payments if p.status.value in ['pending', 'partial'] and p.due_date < today)
    
    # 3. Tickets
    tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.unit_id.in_(unit_ids)).all() if unit_ids else []
    open_tickets_count = len([t for t in tickets if t.status.value in ['open', 'in_progress']])
    
    # Financial Ledger (Recent 5)
    recent_payments_query = db.query(RentPayment).filter(RentPayment.lease_id.in_(lease_ids)).order_by(RentPayment.due_date.desc()).limit(5).all() if lease_ids else []
    recent_payments = []
    for p in recent_payments_query:
        lease = db.query(LeaseAgreement).get(p.lease_id)
        unit = db.query(Unit).get(lease.unit_id)
        prop = db.query(Property).get(unit.property_id)
        tenant = db.query(User).get(lease.tenant.user_id) if lease.tenant else None
        
        recent_payments.append({
            "id": p.id,
            "tenant_name": tenant.full_name if tenant else "Unknown",
            "unit": f"{prop.name} - {unit.unit_number}",
            "amount_due": p.amount_due,
            "amount_paid": p.amount_paid,
            "balance": p.balance,
            "due_date": p.due_date,
            "status": p.status.value
        })

    # Maintenance Feed (Recent 5 Open/In Progress)
    recent_tickets_query = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.unit_id.in_(unit_ids),
        MaintenanceTicket.status.in_(['open', 'in_progress'])
    ).order_by(MaintenanceTicket.created_at.desc()).limit(5).all() if unit_ids else []
    
    recent_tickets = []
    for t in recent_tickets_query:
        unit = db.query(Unit).get(t.unit_id)
        prop = db.query(Property).get(unit.property_id)
        recent_tickets.append({
            "id": t.id,
            "title": t.title, "category": t.category.value, "description": t.description,
            "priority": t.priority.value,
            "status": t.status.value,
            "unit": f"{prop.name} - {unit.unit_number}",
            "created_at": t.created_at
        })
        
    # Lease Alerts (Expiring in 60 days)
    sixty_days_from_now = today + timedelta(days=60)
    expiring_leases_query = db.query(LeaseAgreement).filter(
        LeaseAgreement.unit_id.in_(unit_ids),
        LeaseAgreement.status == 'active',
        LeaseAgreement.end_date <= sixty_days_from_now,
        LeaseAgreement.end_date >= today
    ).order_by(LeaseAgreement.end_date.asc()).all() if unit_ids else []
    
    expiring_leases = []
    for l in expiring_leases_query:
        unit = db.query(Unit).get(l.unit_id)
        tenant = db.query(User).get(l.tenant.user_id) if l.tenant else None
        expiring_leases.append({
            "id": l.id,
            "tenant_name": tenant.full_name if tenant else "Unknown",
            "unit": unit.unit_number,
            "end_date": l.end_date,
            "days_left": (l.end_date - today).days
        })


    # Pending Payment Reviews
    pending_reviews_query = db.query(RentPayment).filter(RentPayment.lease_id.in_(lease_ids), RentPayment.status == 'UNDER_REVIEW').order_by(RentPayment.updated_at.desc()).all() if lease_ids else []
    pending_reviews = []
    for p in pending_reviews_query:
        lease = db.query(LeaseAgreement).get(p.lease_id)
        unit = db.query(Unit).get(lease.unit_id)
        prop = db.query(Property).get(unit.property_id)
        tenant = db.query(User).get(lease.tenant.user_id) if lease.tenant else None
        pending_reviews.append({
            "id": p.id,
            "tenant_name": tenant.full_name if tenant else "Unknown",
            "unit": f"{prop.name} - {unit.unit_number}",
            "amount_paid": p.amount_paid,
            "payment_date": p.payment_date,
            "method": p.payment_method.value if p.payment_method else "N/A",
            "reference": p.transaction_reference,
            "receipt_url": p.receipt_url
        })
        
    return {
        "pending_reviews": pending_reviews,
        "metrics": {
            "total_properties": total_properties,
            "total_units": total_units,
            "occupancy_rate": occupancy_rate,
            "monthly_revenue": monthly_revenue,
            "pending_payments": pending_payments,
            "overdue_amount": overdue_amount,
            "open_tickets": open_tickets_count
        },
        "recent_payments": recent_payments,
        "recent_tickets": recent_tickets,
        "expiring_leases": expiring_leases
    }

@router.get("/admin", summary="Get Admin System-Wide Dashboard Data")
def get_admin_dashboard(
    current_user: User = Depends(require_landlord_or_admin),
    db: Session = Depends(get_db)
):
    # Ensure strict admin only for this route
    if current_user.role.value != 'admin':
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Admin access required")

    # 1. User Metrics
    users = db.query(User).all()
    admins_count = sum(1 for u in users if u.role.value == 'admin')
    landlords_count = sum(1 for u in users if u.role.value == 'landlord')
    tenants_count = sum(1 for u in users if u.role.value == 'tenant')
    
    # 2. Portfolio Metrics
    total_properties = db.query(Property).count()
    units = db.query(Unit).all()
    total_units = len(units)
    occupied_units = sum(1 for u in units if u.status.value == 'occupied')
    occupancy_rate = round((occupied_units / total_units * 100), 1) if total_units > 0 else 0.0

    # 3. Financial Metrics (Current Month Volume)
    today = date.today()
    payments = db.query(RentPayment).filter(
        extract('month', RentPayment.payment_date) == today.month,
        extract('year', RentPayment.payment_date) == today.year
    ).all()
    total_volume = sum(p.amount_paid for p in payments if p.amount_paid)

    # 4. Maintenance Metrics
    open_tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.status.in_(['open', 'in_progress'])).count()

    # Recent Registrations
    recent_users_query = db.query(User).order_by(User.created_at.desc()).limit(5).all()
    recent_users = [{"id": u.id, "name": u.full_name, "email": u.email, "role": u.role.value, "status": "Active" if u.is_active else "Suspended", "joined": u.created_at} for u in recent_users_query]

    # Global Recent Transactions
    recent_payments_query = db.query(RentPayment).order_by(RentPayment.payment_date.desc().nulls_last(), RentPayment.created_at.desc()).limit(5).all()
    recent_transactions = []
    for p in recent_payments_query:
        lease = db.query(LeaseAgreement).get(p.lease_id)
        tenant = db.query(User).get(lease.tenant.user_id) if lease and lease.tenant else None
        recent_transactions.append({
            "id": p.id,
            "tenant": tenant.full_name if tenant else "Unknown",
            "amount": p.amount_paid or p.amount_due,
            "date": p.payment_date or p.due_date,
            "status": p.status.value,
            "method": p.payment_method.value if p.payment_method else "N/A"
        })

    # Escalated / Urgent Tickets
    urgent_tickets_query = db.query(MaintenanceTicket).filter(
        MaintenanceTicket.priority == 'urgent',
        MaintenanceTicket.status.in_(['open', 'in_progress'])
    ).order_by(MaintenanceTicket.created_at.desc()).limit(5).all()
    
    urgent_tickets = []
    for t in urgent_tickets_query:
        unit = db.query(Unit).get(t.unit_id)
        prop = db.query(Property).get(unit.property_id) if unit else None
        urgent_tickets.append({
            "id": t.id,
            "title": t.title, "category": t.category.value, "description": t.description,
            "property": prop.name if prop else "Unknown",
            "status": t.status.value,
            "created_at": t.created_at
        })


    # Global Pending Payment Reviews
    pending_reviews_query = db.query(RentPayment).filter(RentPayment.status == 'under_review').order_by(RentPayment.updated_at.desc()).all()
    pending_reviews = []
    for p in pending_reviews_query:
        lease = db.query(LeaseAgreement).get(p.lease_id)
        tenant = db.query(User).get(lease.tenant.user_id) if lease and lease.tenant else None
        pending_reviews.append({
            "id": p.id,
            "tenant": tenant.full_name if tenant else "Unknown",
            "amount_paid": p.amount_paid,
            "payment_date": p.payment_date,
            "method": p.payment_method.value if p.payment_method else "N/A",
            "reference": p.transaction_reference,
            "receipt_url": p.receipt_url
        })
        
    return {
        "pending_reviews": pending_reviews,
        "metrics": {
            "total_users": len(users),
            "admins": admins_count,
            "landlords": landlords_count,
            "tenants": tenants_count,
            "total_properties": total_properties,
            "total_units": total_units,
            "occupancy_rate": occupancy_rate,
            "total_volume": total_volume,
            "open_tickets": open_tickets
        },
        "recent_users": recent_users,
        "recent_transactions": recent_transactions,
        "urgent_tickets": urgent_tickets
    }


@router.get("/tenant")
def get_tenant_dashboard(db: Session = Depends(get_db), current_user: User = Depends(require_any_role)):
    if getattr(current_user.role, 'value', str(current_user.role)) != 'tenant':
        raise HTTPException(status_code=403, detail="Not a tenant")
        
    from app.models.tenant import Tenant
    from app.models.lease import LeaseAgreement
    from app.models.payment import RentPayment, PaymentStatus
    from datetime import date
    
    tenant_profile = db.query(Tenant).filter(Tenant.user_id == current_user.id).first()
    if not tenant_profile:
        return {"error": "Tenant profile not found"}
        
    # Active Lease
    lease = db.query(LeaseAgreement).filter(LeaseAgreement.tenant_id == tenant_profile.id, LeaseAgreement.status == 'ACTIVE').first()
    
    monthly_rent = lease.monthly_rent if lease else 0
    lease_expires = lease.end_date.isoformat() if lease else None
    unit_name = "No Active Unit"
    if lease:
        unit = db.query(Unit).get(lease.unit_id)
        prop = db.query(Property).get(unit.property_id)
        unit_name = f"{prop.name} - {unit.unit_number}"

    # Payments Balance
    balance_due = 0
    recent_payments_data = []
    if lease:
        payments = db.query(RentPayment).filter(RentPayment.lease_id == lease.id).order_by(RentPayment.due_date.desc()).all()
        balance_due = sum(p.balance for p in payments if p.status.value in ['pending', 'partial', 'failed', 'overdue'])
        
        for p in payments[:5]:
            recent_payments_data.append({
                "id": p.id,
                "amount_due": p.amount_due,
                "amount_paid": p.amount_paid,
                "balance": p.balance,
                "status": p.status.value,
                "due_date": p.due_date.isoformat(),
                "payment_date": p.payment_date.isoformat() if p.payment_date else None
            })
            
    # Maintenance Tickets
    tickets = db.query(MaintenanceTicket).filter(MaintenanceTicket.reported_by_id == current_user.id).order_by(MaintenanceTicket.created_at.desc()).all()
    open_tickets_count = sum(1 for t in tickets if t.status.value in ['open', 'in_progress'])
    
    recent_tickets_data = []
    for t in tickets[:5]:
        recent_tickets_data.append({
            "id": t.id,
            "title": t.title,
            "status": t.status.value,
            "priority": t.priority.value,
            "category": t.category.value,
            "created_at": t.created_at.isoformat()
        })

    return {
        "metrics": {
            "monthly_rent": monthly_rent,
            "balance_due": balance_due,
            "lease_expires": lease_expires,
            "open_tickets": open_tickets_count,
            "unit_name": unit_name
        },
        "recent_payments": recent_payments_data,
        "recent_tickets": recent_tickets_data
    }
