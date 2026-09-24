from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from datetime import date, timedelta
from app.models.payment import RentPayment
from app.models.lease import LeaseAgreement
from app.schemas.payment import PaymentCreate, PaymentRecord, PaymentStatus

class PaymentNotFoundError(Exception):
    pass

class InvalidLeaseError(Exception):
    pass

def list_payments(db: Session, lease_id: str = None, status: str = None, skip: int = 0, limit: int = 50) -> list[RentPayment]:
    query = db.query(RentPayment).options(joinedload(RentPayment.lease))
    if lease_id:
        query = query.filter(RentPayment.lease_id == lease_id)
    if status:
        query = query.filter(RentPayment.status == status)
    return query.offset(skip).limit(limit).all()

def get_payment(db: Session, payment_id: str) -> RentPayment:
    payment = db.query(RentPayment).options(joinedload(RentPayment.lease)).filter(RentPayment.id == payment_id).first()
    if not payment:
        raise PaymentNotFoundError("Payment not found")
    return payment

def create_payment_entry(db: Session, payload: PaymentCreate) -> RentPayment:
    lease = db.query(LeaseAgreement).filter(LeaseAgreement.id == payload.lease_id).first()
    if not lease:
        raise InvalidLeaseError("Lease not found")
    
    lease_status_val = lease.status.value if hasattr(lease.status, 'value') else str(lease.status)
    if lease_status_val != "active":
        raise InvalidLeaseError("Lease is not active")
        
    balance = payload.amount_due - payload.amount_paid
    if balance <= 0:
        status = PaymentStatus.completed
    elif payload.amount_paid > 0:
        status = PaymentStatus.partial
    else:
        status = PaymentStatus.pending
        
    payload_data = payload.model_dump()
    # Remove fields we'll set explicitly after computing
    payload_data.pop("balance", None)

    db_obj = RentPayment(
        **payload_data,
        balance=balance,
        penalty_amount=0.0,
        status=status
    )
    db.add(db_obj)
    db.commit()
    db.refresh(db_obj)
    return db_obj

def record_payment(db: Session, payment: RentPayment, payload: PaymentRecord) -> RentPayment:
    payment.amount_paid += payload.amount_paid
    payment.balance = payment.amount_due + (payment.penalty_amount or 0.0) - payment.amount_paid
    
    if payment.balance <= 0:
        payment.status = PaymentStatus.completed
    else:
        payment.status = PaymentStatus.partial
        
    payment.payment_date = payload.payment_date
    payment.payment_method = payload.payment_method
    payment.transaction_reference = payload.transaction_reference
    payment.notes = payload.notes
    
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

def get_ledger_summary(db: Session, lease_id: str = None) -> dict:
    query = db.query(RentPayment)
    if lease_id:
        query = query.filter(RentPayment.lease_id == lease_id)
        
    payments = query.all()
    
    total_billed = sum(p.amount_due + (p.penalty_amount or 0.0) for p in payments)
    total_paid = sum(p.amount_paid for p in payments)
    total_outstanding = sum(p.balance for p in payments)
    
    today = date.today()
    total_overdue_count = sum(1 for p in payments if p.due_date < today and p.balance > 0)
    paid_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, 'value') else str(p.status)) == "completed")
    pending_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, 'value') else str(p.status)) == "pending")
    partial_count = sum(1 for p in payments if (p.status.value if hasattr(p.status, 'value') else str(p.status)) == "partial")
    
    return {
        "total_billed": total_billed,
        "total_paid": total_paid,
        "total_outstanding": total_outstanding,
        "total_overdue_count": total_overdue_count,
        "paid_count": paid_count,
        "pending_count": pending_count,
        "partial_count": partial_count
    }

def generate_monthly_charges(db: Session, lease_id: str) -> RentPayment:
    # Basic skeleton for monthly charge generation
    lease = db.query(LeaseAgreement).filter(LeaseAgreement.id == lease_id).first()
    if not lease:
        raise InvalidLeaseError("Lease not found")
        
    today = date.today()
    period_start = today.replace(day=1)
    # Simple logic for end date
    next_month = today.replace(day=28) + timedelta(days=4)
    period_end = next_month - timedelta(days=next_month.day)
    
    try:
        due_date = today.replace(day=lease.rent_due_day)
    except ValueError:
        due_date = today.replace(day=28)
        
    if due_date < today:
        try:
            due_date = due_date.replace(month=due_date.month % 12 + 1, year=due_date.year + (due_date.month // 12))
        except ValueError:
            pass
            
    payload = PaymentCreate(
        lease_id=lease_id,
        amount_due=lease.monthly_rent,
        amount_paid=0.0,
        due_date=due_date,
        period_start=period_start,
        period_end=period_end
    )
    return create_payment_entry(db, payload)

def get_overdue_payments(db: Session) -> list[RentPayment]:
    today = date.today()
    return db.query(RentPayment).filter(RentPayment.due_date < today, RentPayment.status.in_(["pending", "partial"])).all()
