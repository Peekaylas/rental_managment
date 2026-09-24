"""
Basic smoke tests for auth endpoints.
Run with: pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.main import app
from app.db.session import Base, get_db

# ── In-memory SQLite for tests ─────────────────────────────────────────────
TEST_DATABASE_URL = "sqlite:///./test_rental.db"

engine = create_engine(
    TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


# Override the DB dependency before the client is created
app.dependency_overrides[get_db] = override_get_db

import app.models  # noqa: ensure tables are registered


@pytest.fixture(autouse=True, scope="module")
def setup_db():
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="module")
def client():
    return TestClient(app)


# ── Fixtures ───────────────────────────────────────────────────────────────

LANDLORD_PAYLOAD = {
    "full_name": "Test Landlord",
    "email": "landlord@test.local",
    "password": "Landlord@1234",
    "role": "landlord",
}

TENANT_PAYLOAD = {
    "full_name": "Test Tenant",
    "email": "tenant@test.local",
    "password": "Tenant@1234",
    "role": "tenant",
}


# ── Registration ───────────────────────────────────────────────────────────

def test_register_landlord(client):
    r = client.post("/api/v1/auth/register", json=LANDLORD_PAYLOAD)
    assert r.status_code == 201, r.text
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"


def test_register_tenant(client):
    r = client.post("/api/v1/auth/register", json=TENANT_PAYLOAD)
    assert r.status_code == 201, r.text


def test_register_duplicate_email(client):
    r = client.post("/api/v1/auth/register", json=LANDLORD_PAYLOAD)
    assert r.status_code == 409


def test_register_admin_blocked(client):
    payload = {**LANDLORD_PAYLOAD, "email": "admin2@test.local", "role": "admin"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 403


def test_register_weak_password(client):
    payload = {**LANDLORD_PAYLOAD, "email": "weak@test.local", "password": "password"}
    r = client.post("/api/v1/auth/register", json=payload)
    assert r.status_code == 422  # Pydantic validation error


# ── Login ──────────────────────────────────────────────────────────────────

def test_login_json_success(client):
    r = client.post("/api/v1/auth/login/json", json={
        "email": LANDLORD_PAYLOAD["email"],
        "password": LANDLORD_PAYLOAD["password"],
    })
    assert r.status_code == 200, r.text
    assert "access_token" in r.json()


def test_login_wrong_password(client):
    r = client.post("/api/v1/auth/login/json", json={
        "email": LANDLORD_PAYLOAD["email"],
        "password": "WrongPass!99",
    })
    assert r.status_code == 401


def test_login_unknown_email(client):
    r = client.post("/api/v1/auth/login/json", json={
        "email": "nobody@test.local",
        "password": "Whatever@1",
    })
    assert r.status_code == 401


# ── /users/me ──────────────────────────────────────────────────────────────

def test_get_me(client):
    # Login first
    login_r = client.post("/api/v1/auth/login/json", json={
        "email": LANDLORD_PAYLOAD["email"],
        "password": LANDLORD_PAYLOAD["password"],
    })
    token = login_r.json()["access_token"]
    r = client.get("/api/v1/users/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    me = r.json()
    assert me["email"] == LANDLORD_PAYLOAD["email"]
    assert me["role"] == "landlord"
    assert "hashed_password" not in me   # must never be exposed


def test_get_me_unauthenticated(client):
    r = client.get("/api/v1/users/me")
    assert r.status_code == 401


# ── RBAC: admin-only routes ────────────────────────────────────────────────

def test_list_users_as_landlord_forbidden(client):
    login_r = client.post("/api/v1/auth/login/json", json={
        "email": LANDLORD_PAYLOAD["email"],
        "password": LANDLORD_PAYLOAD["password"],
    })
    token = login_r.json()["access_token"]
    r = client.get("/api/v1/users/", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 403
