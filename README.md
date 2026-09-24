# 🏘️ Affordable Housing & Rental Management System

> A full-stack web application for managing properties, tenants, leases, rent payments, and maintenance tickets — built with **React (JavaScript)** + **FastAPI (Python)** + **PostgreSQL**.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Tech Stack](#3-tech-stack)
4. [Directory Structure](#4-directory-structure)
5. [Database Models & Relationships](#5-database-models--relationships)
6. [Local Installation — Backend](#6-local-installation--backend)
7. [Local Installation — Frontend](#7-local-installation--frontend)
8. [Running the Full Stack](#8-running-the-full-stack)
9. [API Documentation](#9-api-documentation)
10. [Environment Variables Reference](#10-environment-variables-reference)
11. [Database Migrations (Alembic)](#11-database-migrations-alembic)
12. [User Roles & Permissions](#12-user-roles--permissions)
13. [Development Conventions](#13-development-conventions)
14. [Roadmap — Step 2](#14-roadmap--step-2)

---

## 1. Project Overview

This system supports **three user roles**:

| Role | Responsibilities |
|------|-----------------|
| **Admin** | Full system access — manage users, properties, reports |
| **Landlord** | Register properties/units, approve leases, view payments |
| **Tenant** | View own lease/payments, raise maintenance tickets |

Core functional modules:
- 🏢 **Properties & Units** — building registry with unit-level detail
- 👥 **Tenants** — KYC profiles, employment, emergency contacts
- 📄 **Lease Agreements** — full lifecycle management (pending → active → expired)
- 💳 **Rent Payments** — M-Pesa / bank / cash, partial payment support
- 🔧 **Maintenance Tickets** — categorised repair requests with priority & cost tracking

---

## 2. Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      Browser                            │
│             React SPA (port 3000)                       │
│   AuthContext │ React Router │ Axios │ react-hot-toast  │
└───────────────────────┬─────────────────────────────────┘
                        │  REST / JSON  (JWT Bearer)
┌───────────────────────▼─────────────────────────────────┐
│              FastAPI Backend (port 8000)                 │
│  /api/v1/*  endpoints │ JWT auth │ Pydantic schemas      │
│  SQLAlchemy ORM │ Alembic migrations                     │
└───────────────────────┬─────────────────────────────────┘
                        │  psycopg2
┌───────────────────────▼─────────────────────────────────┐
│              PostgreSQL Database                         │
│  Tables: users │ properties │ units │ tenants           │
│          lease_agreements │ rent_payments               │
│          maintenance_tickets                            │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Tech Stack

### Backend
| Tool | Version | Purpose |
|------|---------|---------|
| Python | ≥ 3.11 | Runtime |
| FastAPI | 0.115 | Web framework & OpenAPI docs |
| SQLAlchemy | 2.0 | ORM (declarative mapping) |
| Alembic | 1.13 | Schema migrations |
| PostgreSQL | ≥ 14 | Relational database |
| psycopg2 | 2.9 | PostgreSQL driver |
| Pydantic v2 | 2.9 | Request/response validation |
| python-jose | 3.3 | JWT signing |
| passlib[bcrypt] | 1.7 | Password hashing |
| uvicorn | 0.30 | ASGI server |

### Frontend
| Tool | Version | Purpose |
|------|---------|---------|
| React | 18 | UI library |
| React Router DOM | 6 | Client-side routing |
| Axios | 1.7 | HTTP client |
| react-hot-toast | 2.4 | Toast notifications |
| date-fns | 4 | Date formatting |
| Custom CSS | — | All styling (no CSS framework) |

---

## 4. Directory Structure

```
rental_managment/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/       # Route handlers (one file per resource)
│   │   ├── core/
│   │   │   ├── config.py           # Settings from .env
│   │   │   └── security.py         # JWT & bcrypt utilities
│   │   ├── db/
│   │   │   ├── session.py          # Engine, SessionLocal, Base, get_db()
│   │   │   └── init_db.py          # Table creation & admin seed
│   │   ├── models/
│   │   │   ├── mixins.py           # UUID PK + timestamp mixin
│   │   │   ├── user.py             # User (Admin/Landlord/Tenant)
│   │   │   ├── property.py         # Property + Unit
│   │   │   ├── tenant.py           # Tenant profile
│   │   │   ├── lease.py            # LeaseAgreement
│   │   │   ├── payment.py          # RentPayment
│   │   │   └── maintenance.py      # MaintenanceTicket
│   │   ├── schemas/                # Pydantic I/O schemas (Step 2)
│   │   ├── services/               # Business-logic layer (Step 2)
│   │   └── main.py                 # FastAPI app factory
│   ├── migrations/
│   │   ├── env.py                  # Alembic env — reads .env, imports models
│   │   └── script.py.mako          # Migration file template
│   ├── tests/
│   ├── alembic.ini
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── public/
│   │   └── index.html
│   └── src/
│       ├── assets/css/global.css   # All design tokens & component styles
│       ├── components/
│       │   └── common/
│       │       └── DashboardShell.js  # Sidebar + topbar layout
│       ├── context/
│       │   └── AuthContext.js      # JWT auth state & login/logout
│       ├── pages/                  # One file per route
│       ├── services/
│       │   └── apiClient.js        # Configured axios instance
│       ├── utils/
│       │   └── storage.js          # localStorage token helpers
│       ├── App.js                  # Router with lazy-loaded pages
│       └── index.js                # ReactDOM.createRoot entry
│
├── .gitignore
└── README.md
```

---

## 5. Database Models & Relationships

### Entity-Relationship Overview

```
User (1) ──────────────────── (N) Property
  │ (role=tenant)                    │
  │ (1:1)                            │ (1:N)
  ▼                                  ▼
Tenant ─────────── (1:N) ──► LeaseAgreement ◄── (N:1) ── Unit
                                     │
                                     │ (1:N)
                                     ▼
                               RentPayment

Unit ──── (1:N) ──► MaintenanceTicket ◄── (N:1) ── User (reporter/assignee)
```

### Model Summary

| Model | Table | Key Fields |
|-------|-------|-----------|
| `User` | `users` | `email`, `role` (admin/landlord/tenant), `hashed_password` |
| `Property` | `properties` | `name`, `property_type`, `address_*`, `owner_id → users` |
| `Unit` | `units` | `unit_number`, `monthly_rent`, `status`, `property_id → properties` |
| `Tenant` | `tenants` | `national_id`, `employment_status`, `monthly_income`, `user_id → users` |
| `LeaseAgreement` | `lease_agreements` | `start_date`, `end_date`, `status`, `unit_id → units`, `tenant_id → tenants` |
| `RentPayment` | `rent_payments` | `amount_due`, `amount_paid`, `balance`, `payment_method`, `lease_id → lease_agreements` |
| `MaintenanceTicket` | `maintenance_tickets` | `title`, `category`, `priority`, `status`, `unit_id → units` |

---

## 6. Local Installation — Backend

### Prerequisites
- Python ≥ 3.11 (`python3 --version`)
- PostgreSQL ≥ 14 running locally
- `pip` or `pipx`

### Step-by-step

```bash
# 1. Navigate to the backend directory
cd rental_managment/backend

# 2. Create and activate a virtual environment
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate

# 3. Install dependencies
pip install -r requirements.txt

# 4. Create the PostgreSQL database and user
psql -U postgres -c "CREATE USER rental_user WITH PASSWORD 'rental_pass';"
psql -U postgres -c "CREATE DATABASE rental_db OWNER rental_user;"

# 5. Copy and configure environment variables
cp .env.example .env
# Open .env and set your DATABASE_URL and SECRET_KEY

# 6. (Option A) Let the app auto-create tables on first startup:
#    Tables are created automatically when uvicorn starts (init_db() call).

# 6. (Option B) Use Alembic for proper migrations (recommended):
alembic revision --autogenerate -m "initial_schema"
alembic upgrade head

# 7. Start the development server
uvicorn app.main:app --reload --port 8000
```

The backend will be available at **http://localhost:8000**

> **First admin account** is seeded automatically on first startup using  
> `FIRST_ADMIN_EMAIL` and `FIRST_ADMIN_PASSWORD` from your `.env`.

---

## 7. Local Installation — Frontend

### Prerequisites
- Node.js ≥ 18 (`node --version`)
- npm ≥ 9 (`npm --version`)

### Step-by-step

```bash
# 1. Navigate to the frontend directory
cd rental_managment/frontend

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# The default REACT_APP_API_BASE_URL=http://localhost:8000/api/v1 should work as-is

# 4. Start the development server
npm start
```

The frontend will be available at **http://localhost:3000**

---

## 8. Running the Full Stack

Open two terminal windows:

**Terminal 1 — Backend:**
```bash
cd rental_managment/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd rental_managment/frontend
npm start
```

Then visit **http://localhost:3000** and log in with your admin credentials.

---

## 9. API Documentation

FastAPI auto-generates interactive docs:

| URL | Tool |
|-----|------|
| http://localhost:8000/api/docs | Swagger UI |
| http://localhost:8000/api/redoc | ReDoc |
| http://localhost:8000/api/openapi.json | OpenAPI JSON schema |
| http://localhost:8000/health | Health check |

---

## 10. Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `APP_ENV` | `development` | Environment name |
| `DEBUG` | `true` | Enable SQL logging |
| `SECRET_KEY` | *(required)* | JWT signing key — min 32 chars |
| `ALGORITHM` | `HS256` | JWT algorithm |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Token TTL in minutes |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string |
| `ALLOWED_ORIGINS` | `http://localhost:3000,...` | CORS origins (comma-separated) |
| `FIRST_ADMIN_EMAIL` | `admin@rental.local` | Seed admin email |
| `FIRST_ADMIN_PASSWORD` | `Admin@1234` | Seed admin password |

### Frontend (`frontend/.env`)

| Variable | Default | Description |
|----------|---------|-------------|
| `REACT_APP_API_BASE_URL` | `http://localhost:8000/api/v1` | Backend base URL |
| `REACT_APP_APP_NAME` | `Rental Management System` | Display name |

---

## 11. Database Migrations (Alembic)

```bash
# Generate a new migration after changing models
alembic revision --autogenerate -m "describe_what_changed"

# Apply all pending migrations
alembic upgrade head

# Roll back one step
alembic downgrade -1

# Show migration history
alembic history --verbose

# Show current revision
alembic current
```

> Always run Alembic commands from the `backend/` directory with the venv activated.

---

## 12. User Roles & Permissions

| Action | Admin | Landlord | Tenant |
|--------|-------|----------|--------|
| Manage all users | ✅ | ❌ | ❌ |
| Create properties | ✅ | ✅ | ❌ |
| View all properties | ✅ | Own only | ❌ |
| Manage units | ✅ | Own props | ❌ |
| View all tenants | ✅ | Own tenants | Self only |
| Create leases | ✅ | ✅ | ❌ |
| View leases | ✅ | Own | Own |
| Record payments | ✅ | ✅ | ❌ |
| View payments | ✅ | Own | Own |
| Create maintenance ticket | ✅ | ✅ | ✅ |
| Assign / resolve ticket | ✅ | ✅ | ❌ |
| View all tickets | ✅ | Own units | Own |

---

## 13. Development Conventions

- **Commits:** Follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, etc.)
- **Python:** Follow PEP 8; all functions and classes have docstrings.
- **React:** Functional components only; hooks for state management.
- **CSS:** All styles via custom CSS using design tokens in `:root`; no inline styles except layout one-offs.
- **API:** All routes versioned under `/api/v1/`; return consistent JSON error shapes.
- **Secrets:** Never commit `.env` — use `.env.example` as the template.

---

## 14. Roadmap — Step 2

The next development step will implement:

- [ ] Pydantic schemas (request/response DTOs) for all models
- [ ] Full CRUD API endpoints for each resource
- [ ] JWT authentication endpoint (`POST /api/v1/auth/login`)
- [ ] Role-based dependency guards (`require_admin`, `require_landlord`)
- [ ] Properties list & detail pages (React)
- [ ] Tenants list & registration form (React)
- [ ] Lease creation wizard (React)
- [ ] Payment recording & history table (React)
- [ ] Maintenance ticket board with status updates (React)
- [ ] Dashboard statistics endpoint wired to the stat cards

---

*Built with ❤️ — CUEA Rental Management Project*