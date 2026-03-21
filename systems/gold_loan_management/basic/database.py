"""
Gold Loan System - Database Layer
Handles all SQLite operations for the gold loan management system.
"""

import sqlite3
import os
import hashlib
import sys
import time
from datetime import datetime, timedelta

APP_DIR = os.path.dirname(sys.executable) if getattr(sys, 'frozen', False) else os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(APP_DIR, 'gold_loan_basic_database.db')


def get_connection(db_path=None):
    conn = sqlite3.connect(db_path or DB_FILE)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def hash_password(password):
    return hashlib.sha256(password.encode()).hexdigest()


def init_database(db_path=None):
    conn = get_connection(db_path)
    c = conn.cursor()

    c.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL CHECK(role IN ('admin','cashier')),
        is_active INTEGER DEFAULT 1,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nic TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        phone TEXT NOT NULL,
        address TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS loans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_no TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        purpose TEXT,
        loan_amount REAL NOT NULL,
        assessed_value REAL NOT NULL,
        market_value REAL NOT NULL,
        interest_rate REAL NOT NULL,
        overdue_interest_rate REAL NOT NULL,
        duration_months INTEGER NOT NULL,
        issue_date TEXT NOT NULL,
        renew_date TEXT,
        expire_date TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','renewed','redeemed','forfeited')),
        total_gold_weight REAL NOT NULL DEFAULT 0,
        total_item_weight REAL NOT NULL DEFAULT 0,
        remarks TEXT,
        created_by INTEGER,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        FOREIGN KEY (customer_id) REFERENCES customers(id),
        FOREIGN KEY (created_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS loan_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        article_type TEXT NOT NULL,
        description TEXT,
        quantity INTEGER DEFAULT 1,
        total_weight REAL NOT NULL,
        gold_weight REAL NOT NULL,
        carat INTEGER NOT NULL,
        estimated_value REAL NOT NULL DEFAULT 0,
        FOREIGN KEY (loan_id) REFERENCES loans(id) ON DELETE CASCADE
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS loan_renewals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        old_expire_date TEXT NOT NULL,
        new_expire_date TEXT NOT NULL,
        new_duration_months INTEGER NOT NULL,
        interest_paid REAL NOT NULL DEFAULT 0,
        payment_amount REAL NOT NULL DEFAULT 0,
        normal_interest_due REAL NOT NULL DEFAULT 0,
        overdue_interest_due REAL NOT NULL DEFAULT 0,
        principal_reduction REAL NOT NULL DEFAULT 0,
        new_loan_amount REAL,
        new_interest_rate REAL NOT NULL,
        new_assessed_value REAL,
        renewed_by INTEGER,
        renewed_at TEXT DEFAULT (datetime('now','localtime')),
        remarks TEXT,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (renewed_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS loan_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        payment_type TEXT NOT NULL CHECK(payment_type IN ('interest','redemption','partial','penalty')),
        amount REAL NOT NULL,
        paid_by_customer TEXT,
        received_by INTEGER,
        payment_date TEXT DEFAULT (datetime('now','localtime')),
        remarks TEXT,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (received_by) REFERENCES users(id)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        updated_by INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS market_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carat INTEGER UNIQUE NOT NULL,
        rate_per_gram REAL NOT NULL,
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        updated_by INTEGER
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS duration_rates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        carat INTEGER NOT NULL DEFAULT 0,
        duration_months INTEGER NOT NULL,
        assessed_percentage REAL NOT NULL,
        interest_rate REAL NOT NULL,
        overdue_interest_rate REAL NOT NULL,
        is_active INTEGER DEFAULT 1,
        updated_at TEXT DEFAULT (datetime('now','localtime')),
        UNIQUE(carat, duration_months)
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id INTEGER,
        details TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime'))
    )''')

    c.execute('''CREATE TABLE IF NOT EXISTS loan_approval_requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        loan_id INTEGER NOT NULL,
        ticket_no TEXT NOT NULL,
        default_assessed_pct REAL NOT NULL,
        requested_assessed_pct REAL NOT NULL,
        requested_by INTEGER,
        requested_by_name TEXT,
        request_type TEXT NOT NULL DEFAULT 'assessed_pct',
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','declined')),
        reviewed_by INTEGER,
        reviewed_by_name TEXT,
        review_note TEXT,
        created_at TEXT DEFAULT (datetime('now','localtime')),
        reviewed_at TEXT,
        FOREIGN KEY (loan_id) REFERENCES loans(id),
        FOREIGN KEY (requested_by) REFERENCES users(id),
        FOREIGN KEY (reviewed_by) REFERENCES users(id)
    )''')

    # Backward-compatible schema updates for existing databases.
    loan_cols = {row['name'] for row in c.execute("PRAGMA table_info(loans)").fetchall()}
    if 'renew_date' not in loan_cols:
        c.execute("ALTER TABLE loans ADD COLUMN renew_date TEXT")

    renewal_cols = {row['name'] for row in c.execute("PRAGMA table_info(loan_renewals)").fetchall()}
    if 'payment_amount' not in renewal_cols:
        c.execute("ALTER TABLE loan_renewals ADD COLUMN payment_amount REAL NOT NULL DEFAULT 0")
    if 'normal_interest_due' not in renewal_cols:
        c.execute("ALTER TABLE loan_renewals ADD COLUMN normal_interest_due REAL NOT NULL DEFAULT 0")
    if 'overdue_interest_due' not in renewal_cols:
        c.execute("ALTER TABLE loan_renewals ADD COLUMN overdue_interest_due REAL NOT NULL DEFAULT 0")
    if 'principal_reduction' not in renewal_cols:
        c.execute("ALTER TABLE loan_renewals ADD COLUMN principal_reduction REAL NOT NULL DEFAULT 0")
    if 'new_loan_amount' not in renewal_cols:
        c.execute("ALTER TABLE loan_renewals ADD COLUMN new_loan_amount REAL")

    # Add max_interest_months column to duration_rates for capping interest rate growth
    duration_cols = {row['name'] for row in c.execute("PRAGMA table_info(duration_rates)").fetchall()}
    if 'max_interest_months' not in duration_cols:
        c.execute("ALTER TABLE duration_rates ADD COLUMN max_interest_months INTEGER DEFAULT 3")

    # Seed default admin user
    admin_exists = c.execute("SELECT COUNT(*) FROM users WHERE role='admin'").fetchone()[0]
    if not admin_exists:
        c.execute("INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)",
                  ('admin', hash_password('admin123'), 'System Administrator', 'admin'))

    # Seed default market rates (Rs. per 8 grams / 1 poun).
    # NOTE: Column name is kept as `rate_per_gram` for backward compatibility.
    rates_exist = c.execute("SELECT COUNT(*) FROM market_rates").fetchone()[0]
    if not rates_exist:
        default_rates = [
            (16, 44000), (17, 46800), (18, 49600), (19, 52400),
            (20, 55200), (21, 58000), (22, 60800), (23, 63600), (24, 66400)
        ]
        c.executemany("INSERT INTO market_rates (carat, rate_per_gram) VALUES (?,?)", default_rates)

    # One-time migration: old builds stored rates per gram.
    # If unit marker is missing and values look like per-gram rates, convert to per-8g.
    unit_row = c.execute("SELECT value FROM settings WHERE key='market_rate_unit'").fetchone()
    if not unit_row:
        max_rate_row = c.execute("SELECT MAX(rate_per_gram) AS max_rate FROM market_rates").fetchone()
        max_rate = max_rate_row['max_rate'] if max_rate_row and max_rate_row['max_rate'] is not None else 0
        if max_rate and float(max_rate) < 15000:
            c.execute("UPDATE market_rates SET rate_per_gram = rate_per_gram * 8")
        c.execute(
            "INSERT INTO settings (key, value, description) VALUES (?,?,?)",
            ('market_rate_unit', 'per_8g', 'Market rate values are stored as Rs. per 8 grams (1 poun).')
        )

    # Seed default duration rates
    dur_exist = c.execute("SELECT COUNT(*) FROM duration_rates").fetchone()[0]
    if not dur_exist:
        default_durations = [
            (1, 90.0, 2.5, 5.0),
            (2, 87.0, 2.5, 5.0),
            (3, 85.0, 2.5, 5.0),
            (6, 80.0, 3.0, 6.0),
            (12, 75.0, 3.5, 7.0),
        ]
        carats = [0, 16, 17, 18, 19, 20, 21, 22, 23, 24]
        for ct in carats:
            for dm, pct, ir, od in default_durations:
                c.execute(
                    "INSERT INTO duration_rates (carat, duration_months, assessed_percentage, interest_rate, overdue_interest_rate) VALUES (?,?,?,?,?)",
                    (ct, dm, pct, ir, od))

    # Seed default settings
    defaults = {
        'company_name': 'Gold Loan Center',
        'company_phone': '',
        'company_address': '',
        'ticket_prefix': 'GL',
        'print_format': 'a4',
    }
    for key, val in defaults.items():
        existing = c.execute("SELECT key FROM settings WHERE key=?", (key,)).fetchone()
        if not existing:
            c.execute("INSERT INTO settings (key, value) VALUES (?,?)", (key, val))

    conn.commit()
    conn.close()


# ── User operations ──

def authenticate_user(username, password, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute(
        "SELECT * FROM users WHERE username=? AND password_hash=? AND is_active=1",
        (username, hash_password(password))
    ).fetchone()
    conn.close()
    return dict(row) if row else None


def get_all_users(db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute("SELECT id, username, full_name, role, is_active, created_at FROM users ORDER BY id").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def create_user(username, password, full_name, role, db_path=None):
    conn = get_connection(db_path)
    try:
        conn.execute("INSERT INTO users (username, password_hash, full_name, role) VALUES (?,?,?,?)",
                     (username, hash_password(password), full_name, role))
        conn.commit()
        return True, "User created successfully"
    except sqlite3.IntegrityError:
        return False, "Username already exists"
    finally:
        conn.close()


def update_user(user_id, full_name, role, is_active, password=None, db_path=None):
    conn = get_connection(db_path)
    if password:
        conn.execute("UPDATE users SET full_name=?, role=?, is_active=?, password_hash=?, updated_at=datetime('now','localtime') WHERE id=?",
                     (full_name, role, is_active, hash_password(password), user_id))
    else:
        conn.execute("UPDATE users SET full_name=?, role=?, is_active=? WHERE id=?",
                     (full_name, role, is_active, user_id))
    conn.commit()
    conn.close()


# ── Customer operations ──

def search_customers(query='', db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute(
        "SELECT * FROM customers WHERE name LIKE ? OR nic LIKE ? OR phone LIKE ? ORDER BY name",
        (f'%{query}%', f'%{query}%', f'%{query}%')
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_customer(customer_id, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute("SELECT * FROM customers WHERE id=?", (customer_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_customer_by_nic(nic, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute("SELECT * FROM customers WHERE nic=?", (nic,)).fetchone()
    conn.close()
    return dict(row) if row else None


def create_customer(nic, name, phone, address='', db_path=None):
    conn = get_connection(db_path)
    try:
        c = conn.execute("INSERT INTO customers (nic, name, phone, address) VALUES (?,?,?,?)",
                         (nic, name, phone, address))
        conn.commit()
        cid = c.lastrowid
        conn.close()
        return cid, "Customer created"
    except sqlite3.IntegrityError:
        conn.close()
        return None, "NIC already exists"


def update_customer(customer_id, name, phone, address, db_path=None):
    conn = get_connection(db_path)
    conn.execute("UPDATE customers SET name=?, phone=?, address=?, updated_at=datetime('now','localtime') WHERE id=?",
                 (name, phone, address, customer_id))
    conn.commit()
    conn.close()


# ── Loan operations ──

def generate_ticket_no(db_path=None):
    conn = get_connection(db_path)
    try:
        prefix_row = conn.execute("SELECT value FROM settings WHERE key='ticket_prefix'").fetchone()
        prefix = str(prefix_row['value']).strip() if prefix_row and prefix_row['value'] else 'GL'

        rows = conn.execute(
            "SELECT ticket_no FROM loans WHERE ticket_no LIKE ?",
            (f"{prefix}%",)
        ).fetchall()

        max_num = 0
        for r in rows:
            ticket = str(r['ticket_no'])
            if not ticket.startswith(prefix):
                continue
            suffix = ticket[len(prefix):]
            if suffix.isdigit():
                max_num = max(max_num, int(suffix))

        next_num = max_num + 1
        for _ in range(1000):
            candidate = f"{prefix}{next_num:06d}"
            exists = conn.execute("SELECT 1 FROM loans WHERE ticket_no=?", (candidate,)).fetchone()
            if not exists:
                return candidate
            next_num += 1

        # Extremely unlikely fallback; keeps function total.
        return f"{prefix}{int(time.time())}"
    finally:
        conn.close()


def create_loan(data, items, db_path=None):
    conn = get_connection(db_path)
    max_attempts = 6
    last_error = None
    try:
        for _ in range(max_attempts):
            try:
                c = conn.cursor()
                c.execute('''INSERT INTO loans 
                    (ticket_no, customer_id, purpose, loan_amount, assessed_value, market_value,
                     interest_rate, overdue_interest_rate, duration_months, issue_date, expire_date,
                     total_gold_weight, total_item_weight, remarks, created_by, status)
                    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                          (data['ticket_no'], data['customer_id'], data.get('purpose', ''),
                           data['loan_amount'], data['assessed_value'], data['market_value'],
                           data['interest_rate'], data['overdue_interest_rate'],
                           data['duration_months'], data['issue_date'], data['expire_date'],
                           data['total_gold_weight'], data['total_item_weight'],
                           data.get('remarks', ''), data.get('created_by'), 'active'))
                loan_id = c.lastrowid

                for item in items:
                    c.execute('''INSERT INTO loan_items 
                        (loan_id, article_type, description, quantity, total_weight, gold_weight, carat, estimated_value)
                        VALUES (?,?,?,?,?,?,?,?)''',
                              (loan_id, item['article_type'], item.get('description', ''),
                               item.get('quantity', 1), item['total_weight'], item['gold_weight'],
                               item['carat'], item.get('estimated_value', 0)))

                conn.commit()
                return loan_id

            except sqlite3.IntegrityError as e:
                conn.rollback()
                last_error = e
                if 'loans.ticket_no' in str(e):
                    data['ticket_no'] = generate_ticket_no(db_path)
                    continue
                raise

            except sqlite3.OperationalError as e:
                conn.rollback()
                last_error = e
                if 'database is locked' in str(e).lower():
                    time.sleep(0.2)
                    continue
                raise

        if last_error:
            raise last_error
        raise sqlite3.OperationalError('Unable to create loan due to repeated database errors.')

    finally:
        conn.close()


def get_loan(loan_id, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute('''SELECT l.*, c.name as customer_name, c.nic as customer_nic,
        c.phone as customer_phone, c.address as customer_address
        FROM loans l JOIN customers c ON l.customer_id = c.id WHERE l.id=?''', (loan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_loan_by_ticket(ticket_no, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute('''SELECT l.*, c.name as customer_name, c.nic as customer_nic,
        c.phone as customer_phone, c.address as customer_address
        FROM loans l JOIN customers c ON l.customer_id = c.id WHERE l.ticket_no=?''', (ticket_no,)).fetchone()
    conn.close()
    return dict(row) if row else None


def get_loan_items(loan_id, db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute("SELECT * FROM loan_items WHERE loan_id=?", (loan_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def search_loans(query='', status='all', db_path=None):
    conn = get_connection(db_path)
    sql = '''SELECT l.*, c.name as customer_name, c.nic as customer_nic
             FROM loans l JOIN customers c ON l.customer_id = c.id WHERE 1=1'''
    params = []
    if query:
        sql += " AND (l.ticket_no LIKE ? OR c.name LIKE ? OR c.nic LIKE ?)"
        params.extend([f'%{query}%'] * 3)
    if status != 'all':
        sql += " AND l.status=?"
        params.append(status)
    sql += " ORDER BY l.id DESC"
    rows = conn.execute(sql, params).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_loan_status(loan_id, status, db_path=None):
    conn = get_connection(db_path)
    conn.execute("UPDATE loans SET status=?, updated_at=datetime('now','localtime') WHERE id=?", (status, loan_id))
    conn.commit()
    conn.close()


def renew_loan(loan_id, new_duration, interest_paid, new_interest_rate,
               new_assessed_value, user_id, remarks='', payment_amount=0,
               normal_interest_due=0, overdue_interest_due=0,
               principal_reduction=0, new_loan_amount=None, db_path=None):
    conn = get_connection(db_path)
    loan = conn.execute("SELECT * FROM loans WHERE id=?", (loan_id,)).fetchone()
    if not loan:
        conn.close()
        return False, "Loan not found"
    old_expire = loan['expire_date']
    new_issue = datetime.now().strftime('%Y-%m-%d')
    new_expire = (datetime.strptime(new_issue, '%Y-%m-%d') + timedelta(days=new_duration * 30)).strftime('%Y-%m-%d')
    if new_loan_amount is None:
        new_loan_amount = float(loan['loan_amount'])

    conn.execute('''INSERT INTO loan_renewals 
        (loan_id, old_expire_date, new_expire_date, new_duration_months, interest_paid,
         payment_amount, normal_interest_due, overdue_interest_due, principal_reduction,
         new_loan_amount, new_interest_rate, new_assessed_value, renewed_by, remarks)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)''',
                 (loan_id, old_expire, new_expire, new_duration, interest_paid,
                  payment_amount, normal_interest_due, overdue_interest_due, principal_reduction,
                  new_loan_amount, new_interest_rate, new_assessed_value, user_id, remarks))

    conn.execute('''UPDATE loans SET loan_amount=?, renew_date=?, expire_date=?, duration_months=?, interest_rate=?,
        status='active', updated_at=datetime('now','localtime') WHERE id=?''',
                 (new_loan_amount, new_issue, new_expire, new_duration, new_interest_rate, loan_id))

    if interest_paid > 0:
        conn.execute('''INSERT INTO loan_payments (loan_id, payment_type, amount, received_by, remarks)
            VALUES (?,?,?,?,?)''', (loan_id, 'interest', interest_paid, user_id, f'Renewal interest payment'))

    if principal_reduction > 0:
        conn.execute('''INSERT INTO loan_payments (loan_id, payment_type, amount, received_by, remarks)
            VALUES (?,?,?,?,?)''', (loan_id, 'partial', principal_reduction, user_id, f'Principal reduction during renewal'))

    conn.commit()
    conn.close()
    return True, "Loan renewed successfully"


def redeem_loan(loan_id, total_paid, user_id, remarks='', db_path=None):
    conn = get_connection(db_path)
    conn.execute('''INSERT INTO loan_payments (loan_id, payment_type, amount, received_by, remarks)
        VALUES (?,?,?,?,?)''', (loan_id, 'redemption', total_paid, user_id, remarks))
    conn.execute("UPDATE loans SET status='redeemed', updated_at=datetime('now','localtime') WHERE id=?", (loan_id,))
    conn.commit()
    conn.close()
    return True, "Loan redeemed successfully"


def get_loan_renewals(loan_id, db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute('''SELECT lr.*, u.full_name as renewed_by_name 
        FROM loan_renewals lr LEFT JOIN users u ON lr.renewed_by = u.id
        WHERE lr.loan_id=? ORDER BY lr.renewed_at DESC''', (loan_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_loan_payments(loan_id, db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute('''SELECT lp.*, u.full_name as received_by_name
        FROM loan_payments lp LEFT JOIN users u ON lp.received_by = u.id
        WHERE lp.loan_id=? ORDER BY lp.payment_date DESC''', (loan_id,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ── Settings operations ──

def get_setting(key, default='', db_path=None):
    conn = get_connection(db_path)
    row = conn.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
    conn.close()
    return row['value'] if row else default


def set_setting(key, value, description='', user_id=None, db_path=None):
    conn = get_connection(db_path)
    conn.execute('''INSERT INTO settings (key, value, description, updated_by, updated_at) 
        VALUES (?,?,?,?,datetime('now','localtime'))
        ON CONFLICT(key) DO UPDATE SET value=?, description=?, updated_by=?, updated_at=datetime('now','localtime')''',
                 (key, value, description, user_id, value, description, user_id))
    conn.commit()
    conn.close()


def get_article_types(db_path=None):
    default_types = [
        'Chain', 'Ring', 'Bracelet', 'Necklace', 'Earrings', 'Pendant',
        'Bangle', 'Anklet', 'Brooch', 'Coin', 'Bar', 'Other'
    ]
    raw = get_setting('article_types', '', db_path)
    if not raw:
        return default_types

    parsed = [p.strip() for p in str(raw).split('|') if p.strip()]
    if not parsed:
        return default_types
    return parsed


def set_article_types(article_types, user_id=None, db_path=None):
    clean = []
    seen = set()
    for item in article_types:
        val = str(item).strip()
        if not val:
            continue
        key = val.lower()
        if key in seen:
            continue
        seen.add(key)
        clean.append(val)

    if not clean:
        return False, 'At least one article type is required.'

    value = '|'.join(clean)
    set_setting('article_types', value, 'Manage gold article types used in new loan tickets.', user_id, db_path)
    return True, 'Article types saved.'


def get_all_market_rates(db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute("SELECT * FROM market_rates ORDER BY carat").fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_market_rate(carat, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute("SELECT rate_per_gram FROM market_rates WHERE carat=?", (carat,)).fetchone()
    conn.close()
    return row['rate_per_gram'] if row else 0


def set_market_rate(carat, rate, user_id=None, db_path=None):
    conn = get_connection(db_path)
    conn.execute('''INSERT INTO market_rates (carat, rate_per_gram, updated_by, updated_at) 
        VALUES (?,?,?,datetime('now','localtime'))
        ON CONFLICT(carat) DO UPDATE SET rate_per_gram=?, updated_by=?, updated_at=datetime('now','localtime')''',
                 (carat, rate, user_id, rate, user_id))
    conn.commit()
    conn.close()


def get_all_duration_rates(carat=22, db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute("SELECT * FROM duration_rates WHERE carat=? AND is_active=1 ORDER BY duration_months", (carat,)).fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_duration_rate(months, carat=22, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute("SELECT * FROM duration_rates WHERE duration_months=? AND carat=? AND is_active=1",
                       (months, carat)).fetchone()
    # Fallback to 0 (all) if specific carat rate is not found
    if not row:
        row = conn.execute("SELECT * FROM duration_rates WHERE duration_months=? AND carat=0 AND is_active=1",
                           (months,)).fetchone()
    conn.close()
    return dict(row) if row else None


def set_duration_rate(months, carat, assessed_pct, interest_rate, overdue_rate, max_interest_months=3, db_path=None):
    conn = get_connection(db_path)
    conn.execute('''INSERT INTO duration_rates (carat, duration_months, assessed_percentage, interest_rate, overdue_interest_rate, max_interest_months)
        VALUES (?,?,?,?,?,?)
        ON CONFLICT(carat, duration_months) DO UPDATE SET assessed_percentage=?, interest_rate=?, overdue_interest_rate=?, max_interest_months=?,
        is_active=1, updated_at=datetime('now','localtime')''',
                 (carat, months, assessed_pct, interest_rate, overdue_rate, max_interest_months, assessed_pct, interest_rate, overdue_rate, max_interest_months))
    conn.commit()
    conn.close()


def delete_duration_rate(months, carat, db_path=None):
    conn = get_connection(db_path)
    conn.execute("UPDATE duration_rates SET is_active=0 WHERE duration_months=? AND carat=?", (months, carat))
    conn.commit()
    conn.close()


# ── Dashboard stats ──

def get_dashboard_stats(db_path=None):
    conn = get_connection(db_path)
    today = datetime.now().strftime('%Y-%m-%d')
    stats = {}
    stats['total_active'] = conn.execute("SELECT COUNT(*) FROM loans WHERE status='active'").fetchone()[0]
    stats['total_redeemed'] = conn.execute("SELECT COUNT(*) FROM loans WHERE status='redeemed'").fetchone()[0]
    stats['total_renewed'] = conn.execute("SELECT COUNT(*) FROM loans WHERE status='renewed'").fetchone()[0]
    stats['total_loans'] = conn.execute("SELECT COUNT(*) FROM loans").fetchone()[0]
    stats['total_customers'] = conn.execute("SELECT COUNT(*) FROM customers").fetchone()[0]
    r = conn.execute("SELECT COALESCE(SUM(loan_amount),0) FROM loans WHERE status='active'").fetchone()
    stats['active_loan_amount'] = r[0]
    r = conn.execute("SELECT COUNT(*) FROM loans WHERE status='active' AND expire_date < ?", (today,)).fetchone()
    stats['overdue_count'] = r[0]
    r = conn.execute("SELECT COUNT(*) FROM loans WHERE date(created_at)=?", (today,)).fetchone()
    stats['today_loans'] = r[0]
    r = conn.execute("SELECT COALESCE(SUM(amount),0) FROM loan_payments WHERE date(payment_date)=?", (today,)).fetchone()
    stats['today_revenue'] = r[0]
    conn.close()
    return stats


def add_audit_log(user_id, action, entity_type='', entity_id=None, details='', db_path=None):
    conn = get_connection(db_path)
    conn.execute("INSERT INTO audit_log (user_id, action, entity_type, entity_id, details) VALUES (?,?,?,?,?)",
                 (user_id, action, entity_type, entity_id, details))
    conn.commit()
    conn.close()


def search_recent_purposes(prefix):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT DISTINCT purpose FROM loans 
        WHERE purpose LIKE ? AND purpose != '' 
        LIMIT 8
    ''', (f"{prefix}%",))
    res = [row[0] for row in c.fetchall() if row[0]]
    conn.close()
    return res

def search_recent_descriptions(prefix):
    conn = get_connection()
    c = conn.cursor()
    c.execute('''
        SELECT DISTINCT description FROM loan_items 
        WHERE description LIKE ? AND description != '' 
        LIMIT 8
    ''', (f"{prefix}%",))
    res = [row[0] for row in c.fetchall() if row[0]]
    conn.close()
    return res


# ── Loan Approval Request operations ──

def create_approval_request(loan_id, ticket_no, default_val, requested_val, requested_by, requested_by_name, request_type='assessed_pct', db_path=None):
    conn = get_connection(db_path)
    c = conn.cursor()
    c.execute('''INSERT INTO loan_approval_requests
        (loan_id, ticket_no, default_assessed_pct, requested_assessed_pct, requested_by, requested_by_name, request_type, status)
        VALUES (?,?,?,?,?,?,?,'pending')''',
        (loan_id, ticket_no, default_val, requested_val, requested_by, requested_by_name, request_type))
    conn.commit()
    req_id = c.lastrowid
    conn.close()
    return req_id


def get_pending_approval_requests(db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute('''
        SELECT r.*, l.loan_amount, l.assessed_value, l.market_value, l.duration_months,
               c.name as customer_name, c.nic as customer_nic
        FROM loan_approval_requests r
        JOIN loans l ON r.loan_id = l.id
        JOIN customers c ON l.customer_id = c.id
        WHERE r.status = 'pending'
        ORDER BY r.created_at DESC
    ''').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_all_approval_requests(db_path=None):
    conn = get_connection(db_path)
    rows = conn.execute('''
        SELECT r.*, l.loan_amount, l.assessed_value, l.market_value, l.duration_months,
               c.name as customer_name, c.nic as customer_nic
        FROM loan_approval_requests r
        JOIN loans l ON r.loan_id = l.id
        JOIN customers c ON l.customer_id = c.id
        ORDER BY r.created_at DESC
    ''').fetchall()
    conn.close()
    return [dict(r) for r in rows]


def get_approval_request_by_loan(loan_id, db_path=None):
    conn = get_connection(db_path)
    row = conn.execute('SELECT * FROM loan_approval_requests WHERE loan_id = ?', (loan_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


def review_approval_request(req_id, status, reviewed_by, reviewed_by_name, review_note='', db_path=None):
    conn = get_connection(db_path)
    conn.execute('''UPDATE loan_approval_requests
        SET status=?, reviewed_by=?, reviewed_by_name=?, review_note=?,
            reviewed_at=datetime('now','localtime')
        WHERE id=?''',
        (status, reviewed_by, reviewed_by_name, review_note, req_id))
    conn.commit()
    conn.close()
