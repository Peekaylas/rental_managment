"""
Database initialisation helper.
  - Creates all tables (used in dev; production uses Alembic migrations).
  - Seeds the first admin user if none exists.
"""
from sqlalchemy.orm import Session

from app.db.session import engine, SessionLocal, Base
from app.core.config import settings
from app.core.security import get_password_hash

# Import all models so Base.metadata is populated
import app.models  # noqa: F401


def init_db() -> None:
    """Create tables and seed initial data."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        _seed_admin(db)
    finally:
        db.close()


def _seed_admin(db: Session) -> None:
    """Create the first admin account if it doesn't already exist."""
    from app.models.user import User, UserRole

    existing = db.query(User).filter_by(email=settings.FIRST_ADMIN_EMAIL).first()
    if existing:
        return

    admin = User(
        email=settings.FIRST_ADMIN_EMAIL,
        full_name="System Administrator",
        hashed_password=get_password_hash(settings.FIRST_ADMIN_PASSWORD),
        role=UserRole.ADMIN,
        is_active=True,
        is_verified=True,
    )
    db.add(admin)
    db.commit()
    print(f"[DB SEED] Admin account created: {settings.FIRST_ADMIN_EMAIL}")
