import sqlite3
import os

db_path = 'gold_loan_basic_database.db'
print(f"Connecting to {db_path}...")
conn = sqlite3.connect(db_path)
c = conn.cursor()

try:
    columns = [row[1] for row in c.execute('PRAGMA table_info(duration_rates)').fetchall()]
    if 'carat' not in columns:
        print('Migrating duration_rates to include carat...')
        c.execute('''CREATE TABLE duration_rates_v2 (
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
        
        c.execute('''INSERT INTO duration_rates_v2 
            (carat, duration_months, assessed_percentage, interest_rate, overdue_interest_rate, is_active, updated_at)
            SELECT 0, duration_months, assessed_percentage, interest_rate, overdue_interest_rate, is_active, updated_at
            FROM duration_rates''')
        
        # Duplicate for all standard carats
        carats = [16, 17, 18, 19, 20, 21, 22, 23, 24]
        for ct in carats:
            c.execute('''INSERT INTO duration_rates_v2
                (carat, duration_months, assessed_percentage, interest_rate, overdue_interest_rate, is_active, updated_at)
                SELECT ?, duration_months, assessed_percentage, interest_rate, overdue_interest_rate, is_active, updated_at
                FROM duration_rates''', (ct,))
                
        c.execute('DROP TABLE duration_rates')
        c.execute('ALTER TABLE duration_rates_v2 RENAME TO duration_rates')
        conn.commit()
        print('Migration success.')
    else:
        print('Already migrated.')
except Exception as e:
    print('Failed:', e)
finally:
    conn.close()
