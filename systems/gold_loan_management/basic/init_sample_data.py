"""Initialize database with comprehensive demo data for testing.
Creates 50 loans of various types with different customers, durations, and amounts.
"""
import sqlite3
import hashlib
from datetime import datetime, timedelta
import random

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

db_path = 'gold_loan_basic_database.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    # Insert sample admin & cashier users
    admin_pwd = hash_password('admin123')
    cashier_pwd = hash_password('cashier123')
    c.execute('''INSERT OR IGNORE INTO users (username, password_hash, full_name, role, is_active)
                 VALUES (?, ?, ?, ?, ?)''',
              ('admin', admin_pwd, 'Admin User', 'admin', 1))
    c.execute('''INSERT OR IGNORE INTO users (username, password_hash, full_name, role, is_active)
                 VALUES (?, ?, ?, ?, ?)''',
              ('cashier', cashier_pwd, 'Cashier User', 'cashier', 1))
    
    # Insert diverse sample customers (30 customers for 50 loans)
    customers_data = [
        ('123456789', 'John Doe', '0712345678', '123 Main St, Colombo', '1990-01-15', 'Engineer', 'Married', 'Sinhala'),
        ('987654321', 'Jane Smith', '0723456789', '456 Oak Ave, Colombo', '1988-05-20', 'Teacher', 'Single', 'Sinhala'),
        ('555666777', 'Ram Patel', '0734567890', '789 Elm St, Colombo', '1992-08-10', 'Builder', 'Married', 'Tamil'),
        ('444555666', 'Priya Kumar', '0745678901', '321 Maple Dr, Kandy', '1995-03-25', 'Doctor', 'Single', 'Tamil'),
        ('333444555', 'Nimal Silva', '0756789012', '654 Pine Rd, Galle', '1985-07-30', 'Businessman', 'Married', 'Sinhala'),
        ('222333444', 'Malini Fernando', '0767890123', '987 Birch Ln, Jaffna', '1993-11-12', 'Nurse', 'Widowed', 'Sinhala'),
        ('111222333', 'Rajesh Menon', '0778901234', '258 Cedar St, Matara', '1987-09-08', 'Mechanic', 'Married', 'Tamil'),
        ('999888777', 'Anita Sharma', '0789012345', '147 Oak St, Negombo', '1991-02-14', 'Shop Owner', 'Divorced', 'Tamil'),
        ('888999111', 'Suresh De Silva', '0790123456', '369 Elm Ave, Kandy', '1989-06-22', 'Accountant', 'Married', 'Sinhala'),
        ('777888999', 'Deepa Gupta', '0701234567', '741 Maple St, Colombo', '1994-04-18', 'Clerk', 'Single', 'Tamil'),
        ('666777888', 'Vikram Singh', '0712234567', '852 Pine Ave, Ratnapura', '1986-12-05', 'Farmer', 'Married', 'Tamil'),
        ('555666111', 'Chaminda Perera', '0723334567', '963 Birch Dr, Matara', '1988-03-27', 'Tailor', 'Married', 'Sinhala'),
        ('444555222', 'Indira Banerjee', '0734434567', '159 Cedar Ln, Jaffna', '1992-08-19', 'Teacher', 'Single', 'Tamil'),
        ('333444222', 'Arjun Menon', '0745534567', '357 Oak Rd, Kalutara', '1983-10-11', 'Civil Engineer', 'Married', 'Tamil'),
        ('222333111', 'Lakshmi Sharma', '0756634567', '456 Elm St, Ampara', '1990-05-30', 'Housewife', 'Married', 'Tamil'),
        ('111222444', 'Dinesh Patel', '0767734567', '789 Maple Ave, Battaramulla', '1987-01-14', 'Manager', 'Married', 'Tamil'),
        ('999777888', 'Harini Krishnan', '0778834567', '321 Pine St, Colombo', '1995-09-03', 'Consultant', 'Single', 'Tamil'),
        ('888666777', 'Sanjay Reddy', '0789934567', '654 Birch Ave, Galle', '1989-07-22', 'Seller', 'Married', 'Tamil'),
        ('777666555', 'Meera Iyer', '0790034567', '987 Cedar St, Kandy', '1991-02-08', 'Jeweler', 'Married', 'Tamil'),
        ('666555444', 'Arun Kumar', '0701134567', '147 Oak Lane, Colombo', '1984-11-16', 'Contractor', 'Married', 'Tamil'),
        ('555444333', 'Nina Ghosh', '0712334567', '258 Elm Lane, Matara', '1993-06-12', 'Photographer', 'Single', 'Bengali'),
        ('444333222', 'Ravi Mohan', '0723434567', '369 Maple Lane, Jaffna', '1986-04-25', 'Electrician', 'Married', 'Tamil'),
        ('333222111', 'Swati Das', '0734534567', '741 Pine Lane, Kandy', '1992-10-19', 'Stylist', 'Single', 'Bengali'),
        ('222111000', 'Karan Singh', '0745634567', '852 Oak Lane, Galle', '1988-12-02', 'Plumber', 'Married', 'Tamil'),
        ('111000999', 'Kavya Nair', '0756734567', '963 Birch Lane, Colombo', '1994-01-28', 'Receptionist', 'Single', 'Tamil'),
        ('999111222', 'Ashok Kumar', '0767834567', '147 Cedar Lane, Ratnapura', '1985-05-10', 'Welder', 'Married', 'Tamil'),
        ('888111222', 'Pooja Sharma', '0778934567', '258 Oak Lane, Negombo', '1990-08-07', 'Chef', 'Married', 'Tamil'),
        ('777111222', 'Vikram Das', '0789034567', '369 Elm Lane, Matara', '1987-03-22', 'Carpenter', 'Divorced', 'Tamil'),
        ('666111222', 'Asha Roy', '0790134567', '741 Maple Lane, Ampara', '1993-09-14', 'Dancer', 'Single', 'Bengali'),
        ('555111222', 'Anand Verma', '0701234567', '852 Pine Lane, Kalutara', '1989-02-03', 'Driver', 'Married', 'Tamil'),
    ]
    
    customer_ids = []
    for nic, name, phone, addr, birthday, job, marital, lang in customers_data:
        c.execute('''INSERT OR IGNORE INTO customers (nic, name, phone, address, birthday, job, marital_status, language)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (nic, name, phone, addr, birthday, job, marital, lang))
        c.execute('SELECT id FROM customers WHERE nic = ?', (nic,))
        customer_ids.append(c.fetchone()[0])
    
    # Define loan purposes
    purposes = [
        'Home Purchase', 'Business Expansion', 'Wedding Expenses', 'Education Fees',
        'Medical Emergency', 'Vehicle Purchase', 'Home Renovation', 'Debt Consolidation',
        'Business Inventory', 'Travel Expenses', 'Household Expenses', 'Investment',
        'Emergency Fund', 'Festival Expenses', 'Agricultural Input'
    ]
    
    # Define gold item types with details
    item_types = [
        ('Ring', [('Gold Band Ring', 2, 3.5, 22), ('Diamond Ring', 1, 5.2, 18), ('Chain Ring', 1, 4.8, 20)]),
        ('Necklace', [('Gold Chain', 1, 12.5, 22), ('Long Chain', 1, 15.0, 20), ('Pendant Necklace', 1, 8.5, 22)]),
        ('Bracelet', [('Gold Bangle', 1, 8.0, 22), ('Link Bracelet', 1, 6.5, 18), ('Tennis Bracelet', 1, 7.2, 24)]),
        ('Earrings', [('Gold Studs', 2, 2.5, 22), ('Long Earrings', 2, 3.8, 20), ('Stone Earrings', 2, 4.5, 18)]),
        ('Pendant', [('Gold Pendant', 1, 6.0, 22), ('Stone Pendant', 1, 5.5, 20)] ),
        ('Coin', [('Gold Coin', 3, 10.0, 24)] ),
        ('Bangle', [('Bridal Bangle Set', 4, 25.0, 22)] ),
    ]
    
    # Loan status distribution
    statuses = ['active', 'active', 'active', 'active', 'active', 'renewed', 'renewed', 'redeemed', 'redeemed', 'forfeited']
    
    # Create 50 loans with varied parameters
    today = datetime.now()
    created_loans_count = 0
    
    for i in range(1, 51):
        try:
            customer_id = customer_ids[i % len(customer_ids)]
            purpose = purposes[i % len(purposes)]
            
            # Vary loan amounts: 30,000 to 500,000
            loan_amount = 30000 + (i * 9500) % 470000
            
            # Vary interest rates: 2.5% to 5%
            interest_rate = 2.5 + ((i * 0.3) % 2.5)
            overdue_interest_rate = interest_rate + (0.5 + ((i * 0.2) % 1.5))
            
            # Vary duration: 3, 6, 12, 24, 36 months
            durations = [3, 6, 12, 24, 36]
            duration_months = durations[i % len(durations)]
            
            # Issue date: randomly within last 6 months
            days_ago = random.randint(0, 180)
            issue_date = (today - timedelta(days=days_ago)).strftime('%Y-%m-%d')
            
            # Expire date based on duration
            expire_date_obj = datetime.strptime(issue_date, '%Y-%m-%d') + timedelta(days=duration_months*30)
            expire_date = expire_date_obj.strftime('%Y-%m-%d')
            
            # Assessed and market values (80-90% of assessed is loan amount)
            assessed_value = loan_amount * (1 + random.uniform(0.15, 0.35))
            market_value = assessed_value * random.uniform(1.0, 1.3)
            
            ticket_no = f'TKT{today.year}{i:05d}'
            status = statuses[i % len(statuses)]
            remarks = f'Demo loan {i} - {purpose}'
            
            c.execute('''INSERT INTO loans 
                         (ticket_no, customer_id, purpose, loan_amount, interest_rate, overdue_interest_rate,
                          assessed_value, market_value, duration_months, issue_date, expire_date, status, remarks)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (ticket_no, customer_id, purpose, loan_amount, interest_rate, overdue_interest_rate,
                       assessed_value, market_value, duration_months, issue_date, expire_date, status, remarks))
            
            # Get the loan ID
            c.execute('SELECT id FROM loans WHERE ticket_no = ?', (ticket_no,))
            loan_id = c.fetchone()[0]
            
            # Add 1-3 loan items per loan
            num_items = (i % 3) + 1
            selected_types = random.sample(item_types, min(num_items, len(item_types)))
            
            for article_type, items in selected_types:
                item_info = random.choice(items)
                description, quantity, gold_weight, carat = item_info
                
                # Calculated weights
                total_weight = gold_weight * quantity * (1 + random.uniform(0.05, 0.15))
                estimated_value = gold_weight * quantity * (18 + carat) * (100 + i % 50)
                
                c.execute('''INSERT INTO loan_items 
                             (loan_id, article_type, description, quantity, total_weight, gold_weight, carat, estimated_value)
                             VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                          (loan_id, article_type, description, quantity, total_weight, gold_weight, carat, estimated_value))
            
            created_loans_count += 1
            
        except Exception as e:
            print(f"⚠ Error creating loan {i}: {e}")
            continue
    
    conn.commit()
    print(f"✓ Demo data initialized successfully!")
    print(f"  • Created {len(customer_ids)} customers")
    print(f"  • Created {created_loans_count} loans with varying types, amounts, and durations")
    print(f"  • Loans range from 30,000 to 500,000 with different gold items")
    print(f"  • Interest rates: 2.5% - 5%, Durations: 3-36 months")
    print(f"  • Status mix: active, renewed, redeemed, forfeited")
    
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()
