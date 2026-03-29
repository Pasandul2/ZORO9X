"""Initialize database with sample data for testing."""
import sqlite3
import hashlib
from datetime import datetime, timedelta

def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()

db_path = 'gold_loan_basic_database.db'
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    # Insert sample admin user
    admin_pwd = hash_password('admin123')
    c.execute('''INSERT OR IGNORE INTO users (username, password_hash, full_name, role, is_active)
                 VALUES (?, ?, ?, ?, ?)''',
              ('admin', admin_pwd, 'Admin User', 'admin', 1))
    
    # Insert sample customers
    customers = [
        ('123456789', 'John Doe', '0712345678', '123 Main St', '1990-01-15', 'Engineer', 'Married', 'Sinhala'),
        ('987654321', 'Jane Smith', '0723456789', '456 Oak Ave', '1988-05-20', 'Teacher', 'Single', 'Sinhala'),
        ('555666777', 'Ram Patel', '0734567890', '789 Elm St', '1992-08-10', 'Builder', 'Married', 'Tamil'),
    ]
    for nic, name, phone, addr, birthday, job, marital, lang in customers:
        c.execute('''INSERT OR IGNORE INTO customers (nic, name, phone, address, birthday, job, marital_status, language)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                  (nic, name, phone, addr, birthday, job, marital, lang))
    
    # Get customer IDs
    c.execute('SELECT id FROM customers LIMIT 1')
    row = c.fetchone()
    customer_id = row[0] if row else None
    
    if customer_id:
        # Insert sample loans
        today = datetime.now().strftime('%Y-%m-%d')
        expire_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        loans = [
            ('LOAN001', customer_id, 'Purchase', 50000, 3, 18, 95000, 96000, 12, 'active', 'Test loan 1'),
            ('LOAN002', customer_id, 'Business', 75000, 4.5, 20, 150000, 152000, 24, 'active', 'Test loan 2'),
        ]
        
        for ticket_no, cust_id, purpose, loan_amt, ir, oir, assessed, market, duration, status, remarks in loans:
            c.execute('''INSERT OR IGNORE INTO loans 
                         (ticket_no, customer_id, purpose, loan_amount, interest_rate, overdue_interest_rate,
                          assessed_value, market_value, duration_months, issue_date, expire_date, status, remarks)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
                      (ticket_no, cust_id, purpose, loan_amt, ir, oir, assessed, market, duration, today, expire_date, status, remarks))
            
            # Get the loan ID to add items
            c.execute('SELECT id FROM loans WHERE ticket_no = ?', (ticket_no,))
            loan_id_row = c.fetchone()
            if loan_id_row:
                loan_id = loan_id_row[0]
                # Add sample loan items (jewelry)
                items = [
                    ('Ring', 'Gold Ring', 5, 8.5, 22, 25000),
                    ('Necklace', 'Gold Chain', 4, 12.0, 24, 35000),
                ]
                for atype, desc, qty, gold_wt, carat, estval in items:
                    c.execute('''INSERT INTO loan_items 
                                 (loan_id, article_type, description, quantity, total_weight, gold_weight, carat, estimated_value)
                                 VALUES (?, ?, ?, ?, ?, ?, ?, ?)''',
                              (loan_id, atype, desc, qty, gold_wt + qty * 0.5, gold_wt, carat, estval))
    
    conn.commit()
    print("✓ Sample data initialized successfully")
    
except Exception as e:
    print(f"✗ Error: {e}")
    conn.rollback()
finally:
    conn.close()
