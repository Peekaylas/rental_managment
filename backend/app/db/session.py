"""
SQLAlchemy engine, session factory, and declarative base.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase, Session
from typing import Generator

from app.core.config import settings

# ── Engine ─────────────────────────────────────────────────────────────────
engine = create_engine(
    settings.DATABASE_URL,
    # pool settings tuned for a mid-sized web application
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,      # detect stale connections automatically
    echo=settings.DEBUG,     # log SQL only in debug mode
)

# ── Session factory ────────────────────────────────────────────────────────
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Declarative base ───────────────────────────────────────────────────────
class Base(DeclarativeBase):
    """Shared base class for all ORM models."""
    pass


# ── FastAPI dependency ─────────────────────────────────────────────────────
def get_db() -> Generator[Session, None, None]:
    """
    Yield a database session and ensure it is closed after the request.

    Usage (FastAPI):
        def my_endpoint(db: Session = Depends(get_db)):
            ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
