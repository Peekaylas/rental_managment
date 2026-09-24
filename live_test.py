import requests
import sys
import time

BASE_URL = "http://localhost:8000/api/v1"
session = requests.Session()

def print_step(msg):
    print(f"\n🟢 {msg}")

def fail(msg):
    print(f"❌ FAILED: {msg}")
    sys.exit(1)

try:
    print_step("Logging in as Admin...")
    r = session.post(f"{BASE_URL}/auth/login/json", json={"email": "admin@rental.com", "password": "Admin@1234"})
    if r.status_code != 200: fail(f"Login failed: {r.text}")
    token = r.json()["access_token"]
    session.headers.update({"Authorization": f"Bearer {token}"})
    print("  -> Admin token acquired!")

    print_step("Creating a new Property...")
    prop_data = {
        "name": f"Sunrise Apartments {int(time.time())}",
        "description": "Luxury living",
        "property_type": "apartment",
        "address_line1": "123 Main St",
        "city": "Nairobi",
        "county": "Nairobi"
    }
    r = session.post(f"{BASE_URL}/properties/", json=prop_data)
    if r.status_code != 200: fail(f"Property creation failed: {r.text}")
    property_id = r.json()["id"]
    print(f"  -> Property created with ID: {property_id}")

    print_step("Adding a Unit to the Property...")
    unit_data = {
        "unit_number": "A101",
        "bedrooms": 2,
        "bathrooms": 1.5,
        "monthly_rent": 25000,
        "security_deposit": 25000
    }
    r = session.post(f"{BASE_URL}/properties/{property_id}/units", json=unit_data)
    if r.status_code != 200: fail(f"Unit creation failed: {r.text}")
    unit_id = r.json()["id"]
    print(f"  -> Unit created with ID: {unit_id}, status: {r.json()['status']}")

    print_step("Registering a new Tenant User...")
    email = f"johndoe{int(time.time())}@example.com"
    user_data = {
        "email": email,
        "password": "Password@123",
        "full_name": "John Doe",
        "role": "tenant"
    }
    r = session.post(f"{BASE_URL}/auth/register", json=user_data)
    if r.status_code not in (200, 201): fail(f"Tenant registration failed: {r.text}")
    print("  -> User registered successfully")
    
    # Get user id by listing users
    r = session.get(f"{BASE_URL}/users/")
    users = r.json()
    tenant_user_id = next(u["id"] for u in users if u["email"] == email)
    print(f"  -> Extracted new User ID: {tenant_user_id}")

    print_step("Creating Tenant Profile...")
    tenant_data = {
        "user_id": tenant_user_id,
        "national_id": "12345678",
        "monthly_income": 80000,
        "employment_status": "employed"
    }
    r = session.post(f"{BASE_URL}/tenants/", json=tenant_data)
    if r.status_code != 200: fail(f"Tenant profile creation failed: {r.text}")
    tenant_id = r.json()["id"]
    print(f"  -> Tenant profile created with ID: {tenant_id}")

    print_step("Creating a Lease Agreement...")
    lease_data = {
        "unit_id": unit_id,
        "tenant_id": tenant_id,
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "monthly_rent": 25000,
        "security_deposit": 25000,
        "rent_due_day": 5
    }
    r = session.post(f"{BASE_URL}/leases/", json=lease_data)
    if r.status_code != 200: fail(f"Lease creation failed: {r.text}")
    lease_id = r.json()["id"]
    print(f"  -> Lease created with ID: {lease_id}, status: {r.json()['status']}")

    print_step("Activating the Lease...")
    r = session.post(f"{BASE_URL}/leases/{lease_id}/activate")
    if r.status_code != 200: fail(f"Lease activation failed: {r.text}")
    print(f"  -> Lease activated. Unit is now: {r.json()['unit']['status'] if 'status' in r.json()['unit'] else 'occupied'}")

    print_step("Generating a monthly rent charge...")
    charge_data = {
        "lease_id": lease_id,
        "amount_due": 25000,
        "due_date": "2024-01-05",
        "period_start": "2024-01-01",
        "period_end": "2024-01-31"
    }
    r = session.post(f"{BASE_URL}/payments/", json=charge_data)
    if r.status_code != 200: fail(f"Payment charge creation failed: {r.text}")
    payment_id = r.json()["id"]
    print(f"  -> Charge created with ID: {payment_id}, balance: {r.json()['balance']}")

    print_step("Recording M-Pesa Payment...")
    payment_data = {
        "amount_paid": 25000,
        "payment_date": "2024-01-02",
        "payment_method": "mpesa",
        "transaction_reference": "QAZ12345WSX"
    }
    r = session.post(f"{BASE_URL}/payments/{payment_id}/record", json=payment_data)
    if r.status_code != 200: fail(f"Payment recording failed: {r.text}")
    print(f"  -> Payment recorded! New balance: {r.json()['balance']}, status: {r.json()['status']}")

    print_step("Fetching System Ledger Summary...")
    r = session.get(f"{BASE_URL}/payments/ledger/summary")
    if r.status_code != 200: fail(f"Ledger fetch failed: {r.text}")
    ledger = r.json()
    print(f"  -> Ledger Stats: Total Billed: {ledger['total_billed']}, Total Paid: {ledger['total_paid']}, Outstanding: {ledger['total_outstanding']}")
    
    print("\n🎉 ALL TESTS PASSED SUCCESSFULLY! The system logic is working end-to-end.")

except Exception as e:
    fail(str(e))
