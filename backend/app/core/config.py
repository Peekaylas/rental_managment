"""
Application configuration — reads from environment / .env file.
"""
from pydantic_settings import BaseSettings
from pydantic import AnyHttpUrl, EmailStr
from typing import List


class Settings(BaseSettings):
    # ── App ──────────────────────────────────────────────────────────────────
    APP_NAME: str = "Affordable Housing & Rental Management System"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Security ─────────────────────────────────────────────────────────────
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # ── Database ─────────────────────────────────────────────────────────────
    DATABASE_URL: str

    # ── CORS ─────────────────────────────────────────────────────────────────
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:5173"]

    # ── Seed admin ───────────────────────────────────────────────────────────
    FIRST_ADMIN_EMAIL: EmailStr = "admin@rental.local"
    FIRST_ADMIN_PASSWORD: str = "Admin@1234"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


settings = Settings()
