import requests
import random
import time
from faker import Faker

fake = Faker('en_US')
BASE_URL = "http://localhost:8000/api/v1"
s = requests.Session()

def seed_data():
    print("Authenticating as Admin...")
    r = s.post(f"{BASE_URL}/auth/login/json", json={"email": "admin@rental.com", "password": "Admin@1234"})
    if r.status_code != 200:
        print("Login failed:", r.text)
        return
    s.headers.update({"Authorization": f"Bearer {r.json()['access_token']}"})

    print("Generating 8 Properties with multiple units each...")
    prop_types = ['apartment', 'house', 'commercial']
    properties = []
    all_units = []
    
    for _ in range(8):
        p_res = s.post(f"{BASE_URL}/properties/", json={
            "name": fake.company() + " Residences",
            "description": fake.catch_phrase(),
            "property_type": random.choice(prop_types),
            "address_line1": fake.street_address(),
            "city": fake.city(),
            "county": fake.state()
        })
        if p_res.status_code != 200: continue
        p = p_res.json()
        properties.append(p)
        
        # Generate 4-12 units per property
        for i in range(random.randint(4, 12)):
            rent = random.randint(15, 60) * 1000
            u_res = s.post(f"{BASE_URL}/properties/{p['id']}/units", json={
                "unit_number": f"{fake.building_number()}-{chr(65 + i)}",
                "bedrooms": random.randint(1, 4),
                "bathrooms": random.randint(1, 3),
                "monthly_rent": rent,
                "security_deposit": rent
            })
            if u_res.status_code == 200:
                all_units.append(u_res.json())

    print(f"Generated {len(all_units)} total units.")

    print("Generating 25 Tenants...")
    tenants = []
    for _ in range(25):
        email = fake.email()
        s.post(f"{BASE_URL}/auth/register", json={
            "email": email, "password": "Password@123", "full_name": fake.name(), "role": "tenant"
        })
        
    users = s.get(f"{BASE_URL}/users/").json()
    tenant_users = [u for u in users if u["role"].lower() == "tenant" and u["email"] != "johndoe@example.com"]
    
    for u in tenant_users[-25:]: # Take the newly created ones
        t_res = s.post(f"{BASE_URL}/tenants/", json={
            "user_id": u["id"],
            "national_id": fake.ssn(),
            "monthly_income": random.randint(80, 300) * 1000,
            "employment_status": random.choice(["employed", "self_employed", "business_owner"])
        })
        if t_res.status_code == 200:
            tenants.append(t_res.json())

    print("Creating Leases, Rent Payments, and Maintenance Tickets...")
    random.shuffle(all_units)
    
    for t in tenants:
        if not all_units: break
        unit = all_units.pop(0)
        
        # Create Lease
        l_res = s.post(f"{BASE_URL}/leases/", json={
            "unit_id": unit["id"],
            "tenant_id": t["id"],
            "start_date": "2023-05-01",
            "end_date": "2024-05-01",
            "monthly_rent": unit["monthly_rent"],
            "security_deposit": unit["security_deposit"],
            "rent_due_day": random.randint(1, 5)
        })
        
        if l_res.status_code != 200: continue
        lease = l_res.json()
        
        # Activate Lease
        s.post(f"{BASE_URL}/leases/{lease['id']}/activate")
        
        # Generate some payments for the last 3 months
        for month in range(1, 4):
            due_date = f"2024-{month:02d}-05"
            p_res = s.post(f"{BASE_URL}/payments/", json={
                "lease_id": lease["id"],
                "amount_due": unit["monthly_rent"],
                "due_date": due_date,
                "period_start": f"2024-{month:02d}-01",
                "period_end": f"2024-{month:02d}-28"
            })
            
            if p_res.status_code == 200:
                payment = p_res.json()
                # 80% chance they paid
                if random.random() > 0.2:
                    s.post(f"{BASE_URL}/payments/{payment['id']}/record", json={
                        "amount_paid": unit["monthly_rent"],
                        "payment_date": due_date,
                        "payment_method": random.choice(["mpesa", "bank_transfer", "card"]),
                        "transaction_reference": fake.bban()
                    })
                    
        # Generate random maintenance ticket
        if random.random() > 0.4:
            s.post(f"{BASE_URL}/maintenance/", json={
                "unit_id": unit["id"],
                "title": fake.sentence(nb_words=4),
                "description": fake.paragraph(),
                "category": random.choice(["plumbing", "electrical", "hvac", "structural", "appliance"]),
                "priority": random.choice(["low", "medium", "high", "urgent"])
            })

    print("Database seeding completed successfully!")

if __name__ == "__main__":
    seed_data()
