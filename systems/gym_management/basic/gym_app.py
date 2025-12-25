"""
ZORO9X Gym Management System - Basic Edition
A comprehensive gym management application with member management,
attendance tracking, payments, and more.
"""

import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import sqlite3
import json
import requests
import hashlib
import os
from datetime import datetime, timedelta
from pathlib import Path
import threading
import time
from PIL import Image, ImageTk

# Configuration
CONFIG_FILE = 'gym_config.json'
BUSINESS_CONFIG_FILE = 'business_config.json'
API_BASE_URL = 'http://localhost:5001/api/saas'

# Load business configuration
def load_business_config():
    """Load business-specific configuration"""
    if os.path.exists(BUSINESS_CONFIG_FILE):
        with open(BUSINESS_CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {}

BUSINESS_CONFIG = load_business_config()


class GymManagementApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ZORO9X Gym Management - Basic Edition")
        self.root.geometry("1400x800")
        self.root.configure(bg='#1a1a2e')
        
        # Load configuration
        self.config = self.load_config()
        self.api_key = self.config.get('api_key', '')
        
        # Database configuration
        db_name = self.config.get('database_name', 'gym_database')
        self.db_file = self.config.get('database_path', f'{db_name}.db')
        
        # Load business configuration
        self.business_config = BUSINESS_CONFIG
        business_details = self.business_config.get('business_details', {})
        self.company_name = business_details.get('name', self.config.get('company_name', 'My Gym'))
        self.business_phone = business_details.get('phone', '')
        self.business_email = business_details.get('email', '')
        self.business_address = business_details.get('address', '')
        self.has_logo = business_details.get('has_logo', False)
        
        # Load logo if available
        self.logo_image = None
        if self.has_logo:
            self.load_logo()
        
        # License validation state
        self.license_valid = False
        self.last_validation = None
        
        # Initialize database
        self.init_database()
        
        # Start license validation thread
        threading.Thread(target=self.background_license_check, daemon=True).start()
        
        # Show setup or main UI
        if not self.api_key:
            self.show_setup_wizard()
        else:
            # Try to validate, but allow offline usage
            validation_result = self.validate_license()
            if validation_result or self.business_config:  # Allow if validation succeeds OR business_config exists
                self.create_main_ui()
            else:
                messagebox.showerror("License Error", "Failed to validate license. Please check your internet connection or contact support.")
                self.root.quit()
    
    def load_config(self):
        """Load configuration from file"""
        if os.path.exists(CONFIG_FILE):
            with open(CONFIG_FILE, 'r') as f:
                return json.load(f)
        return {}
    
    def save_config(self):
        """Save configuration to file"""
        with open(CONFIG_FILE, 'w') as f:
            json.dump(self.config, f, indent=2)
    
    def load_logo(self):
        """Load business logo image"""
        logo_files = ['logo.png', 'logo.jpg', 'logo.jpeg', 'logo.gif']
        for logo_file in logo_files:
            if os.path.exists(logo_file):
                try:
                    img = Image.open(logo_file)
                    # Resize logo to fit header
                    img.thumbnail((60, 60), Image.Resampling.LANCZOS)
                    self.logo_image = ImageTk.PhotoImage(img)
                    return
                except Exception as e:
                    print(f"Error loading logo: {e}")
                    return
    
    def validate_license(self):
        """Validate API key with server"""
        try:
            # If business_config exists, allow offline mode
            if self.business_config:
                # Check if subscription is still valid based on end_date
                end_date_str = self.business_config.get('end_date')
                if end_date_str:
                    try:
                        end_date = datetime.strptime(end_date_str, '%Y-%m-%d')
                        if datetime.now() < end_date:
                            self.license_valid = True
                            self.last_validation = datetime.now()
                            return True
                    except:
                        pass
            
            # Try online validation
            response = requests.post(
                f'{API_BASE_URL}/validate-key',
                json={'api_key': self.api_key},
                timeout=5
            )
            
            if response.status_code == 200:
                data = response.json()
                self.license_valid = data.get('valid', False)
                self.last_validation = datetime.now()
                
                # Log usage
                if self.license_valid:
                    requests.post(
                        f'{API_BASE_URL}/log-usage',
                        json={
                            'api_key': self.api_key,
                            'action': 'app_start',
                            'details': 'Gym Management System started'
                        },
                        timeout=5
                    )
                
                return self.license_valid
            return False
        except Exception as e:
            print(f"License validation error: {e}")
            
            # If business_config exists, allow offline mode
            if self.business_config:
                print("Using offline mode with business_config")
                return True
            
            # Allow offline grace period of 3 days if previously validated
            if self.last_validation:
                grace_period = datetime.now() - self.last_validation
                return grace_period.days < 3
            
            return False
    
    def background_license_check(self):
        """Background thread to periodically check license"""
        while True:
            time.sleep(86400)  # Check every 24 hours
            if not self.validate_license():
                self.root.after(0, self.show_license_error)
    
    def show_license_error(self):
        """Show license error and close app"""
        messagebox.showerror(
            "License Expired",
            "Your subscription has expired or license is invalid. Please renew your subscription."
        )
        self.root.quit()
    
    def show_setup_wizard(self):
        """Show initial setup wizard"""
        setup_window = tk.Toplevel(self.root)
        setup_window.title("Setup Wizard")
        setup_window.geometry("600x400")
        setup_window.configure(bg='#1a1a2e')
        setup_window.transient(self.root)
        setup_window.grab_set()
        
        # Title
        title = tk.Label(
            setup_window,
            text="Welcome to ZORO9X Gym Management",
            font=('Arial', 20, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=30)
        
        # API Key Label
        api_label = tk.Label(
            setup_window,
            text="Enter your API Key:",
            font=('Arial', 12),
            bg='#1a1a2e',
            fg='white'
        )
        api_label.pack(pady=10)
        
        # API Key Entry
        api_entry = tk.Entry(setup_window, font=('Arial', 12), width=40, show='*')
        api_entry.pack(pady=10)
        
        # Company Name Label
        company_label = tk.Label(
            setup_window,
            text="Enter your Company Name:",
            font=('Arial', 12),
            bg='#1a1a2e',
            fg='white'
        )
        company_label.pack(pady=10)
        
        # Company Name Entry
        company_entry = tk.Entry(setup_window, font=('Arial', 12), width=40)
        company_entry.pack(pady=10)
        
        def validate_and_save():
            api_key = api_entry.get().strip()
            company_name = company_entry.get().strip()
            
            if not api_key or not company_name:
                messagebox.showerror("Error", "Please fill in all fields")
                return
            
            # Validate API key
            self.api_key = api_key
            if self.validate_license():
                self.config['api_key'] = api_key
                self.config['company_name'] = company_name
                self.company_name = company_name
                self.save_config()
                setup_window.destroy()
                self.create_main_ui()
            else:
                messagebox.showerror("Error", "Invalid API key. Please check and try again.")
        
        # Validate Button
        validate_btn = tk.Button(
            setup_window,
            text="Validate & Continue",
            font=('Arial', 12),
            bg='#6c5ce7',
            fg='white',
            command=validate_and_save,
            cursor='hand2',
            padx=20,
            pady=10
        )
        validate_btn.pack(pady=30)
    
    def init_database(self):
        """Initialize SQLite database"""
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Members table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS members (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                first_name TEXT NOT NULL,
                last_name TEXT NOT NULL,
                email TEXT UNIQUE,
                phone TEXT,
                date_of_birth DATE,
                gender TEXT,
                address TEXT,
                emergency_contact TEXT,
                emergency_phone TEXT,
                join_date DATE DEFAULT CURRENT_DATE,
                membership_status TEXT DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Memberships table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                plan_name TEXT,
                start_date DATE,
                end_date DATE,
                price REAL,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (member_id) REFERENCES members(id)
            )
        ''')
        
        # Attendance table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                check_in_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                check_out_time TIMESTAMP,
                FOREIGN KEY (member_id) REFERENCES members(id)
            )
        ''')
        
        # Payments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                amount REAL,
                payment_date DATE DEFAULT CURRENT_DATE,
                payment_method TEXT,
                description TEXT,
                FOREIGN KEY (member_id) REFERENCES members(id)
            )
        ''')
        
        # Classes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_name TEXT,
                instructor TEXT,
                schedule TEXT,
                max_capacity INTEGER,
                current_enrollment INTEGER DEFAULT 0,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_main_ui(self):
        """Create the main application UI with modern design"""
        # Create main container
        main_frame = tk.Frame(self.root, bg='#f5f7fa')
        main_frame.pack(fill=tk.BOTH, expand=True)
        
        # Sidebar
        sidebar = tk.Frame(main_frame, bg='#2563eb', width=250)
        sidebar.pack(side=tk.LEFT, fill=tk.Y)
        sidebar.pack_propagate(False)
        
        # Logo and company name in sidebar
        logo_frame = tk.Frame(sidebar, bg='#1d4ed8', height=100)
        logo_frame.pack(fill=tk.X)
        logo_frame.pack_propagate(False)
        
        if self.logo_image:
            logo_label = tk.Label(
                logo_frame,
                image=self.logo_image,
                bg='#1d4ed8'
            )
            logo_label.pack(pady=10)
        
        company_label = tk.Label(
            logo_frame,
            text=self.company_name,
            font=('Segoe UI', 14, 'bold'),
            bg='#1d4ed8',
            fg='white'
        )
        company_label.pack(pady=(0 if self.logo_image else 20, 10))
        
        # Navigation menu
        nav_frame = tk.Frame(sidebar, bg='#2563eb')
        nav_frame.pack(fill=tk.BOTH, expand=True, pady=20)
        
        nav_items = [
            ("Dashboard", "📊", self.show_dashboard),
            ("Members", "👥", self.show_members),
            ("Attendance", "📝", self.show_attendance),
            ("Payments", "💰", self.show_payments),
            ("Classes", "🏋️", self.show_classes),
        ]
        
        for text, icon, command in nav_items:
            btn = tk.Button(
                nav_frame,
                text=f"  {icon}  {text}",
                font=('Segoe UI', 11),
                bg='#2563eb',
                fg='white',
                activebackground='#1d4ed8',
                activeforeground='white',
                bd=0,
                padx=20,
                pady=15,
                cursor='hand2',
                anchor='w',
                command=command
            )
            btn.pack(fill=tk.X, padx=10, pady=2)
            btn.bind('<Enter>', lambda e, b=btn: b.config(bg='#1d4ed8'))
            btn.bind('<Leave>', lambda e, b=btn: b.config(bg='#2563eb'))
        
        # Logout button at bottom
        logout_btn = tk.Button(
            sidebar,
            text="  🚪  Logout",
            font=('Segoe UI', 11, 'bold'),
            bg='#dc2626',
            fg='white',
            activebackground='#b91c1c',
            activeforeground='white',
            bd=0,
            padx=20,
            pady=15,
            cursor='hand2',
            command=self.root.quit
        )
        logout_btn.pack(side=tk.BOTTOM, fill=tk.X, padx=10, pady=10)
        
        # Main content area
        content_container = tk.Frame(main_frame, bg='#f5f7fa')
        content_container.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Top header bar
        top_header = tk.Frame(content_container, bg='white', height=70)
        top_header.pack(fill=tk.X)
        top_header.pack_propagate(False)
        
        # Page title
        self.page_title = tk.Label(
            top_header,
            text="Dashboard",
            font=('Segoe UI', 20, 'bold'),
            bg='white',
            fg='#1e293b'
        )
        self.page_title.pack(side=tk.LEFT, padx=30, pady=20)
        
        # Current time and date
        time_frame = tk.Frame(top_header, bg='white')
        time_frame.pack(side=tk.RIGHT, padx=30)
        
        time_label = tk.Label(
            time_frame,
            text=datetime.now().strftime('%I:%M:%S %p'),
            font=('Segoe UI', 12, 'bold'),
            bg='white',
            fg='#2563eb'
        )
        time_label.pack()
        
        date_label = tk.Label(
            time_frame,
            text=datetime.now().strftime('%A, %B %d, %Y'),
            font=('Segoe UI', 9),
            bg='white',
            fg='#64748b'
        )
        date_label.pack()
        
        # Content frame
        self.content_frame = tk.Frame(content_container, bg='#f5f7fa')
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        
        # Show dashboard by default
        self.show_dashboard()
    
    def clear_content(self):
        """Clear the content frame"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def show_dashboard(self):
        """Show dashboard with modern card statistics"""
        self.clear_content()
        self.page_title.config(text="Dashboard")
        
        # Statistics cards container
        cards_container = tk.Frame(self.content_frame, bg='#f5f7fa')
        cards_container.pack(fill=tk.X, pady=(0, 20))
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        # Get statistics
        cursor.execute("SELECT COUNT(*) FROM members WHERE membership_status='active'")
        active_members = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM attendance WHERE DATE(check_in_time) = DATE('now')")
        today_attendance = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(amount) FROM payments WHERE DATE(payment_date) = DATE('now')")
        today_revenue = cursor.fetchone()[0] or 0
        
        cursor.execute("SELECT COUNT(*) FROM memberships WHERE status='active' AND DATE(end_date) <= DATE('now', '+7 days')")
        expiring_soon = cursor.fetchone()[0]
        
        cursor.execute("SELECT SUM(amount) FROM payments WHERE DATE(payment_date, 'start of month') = DATE('now', 'start of month')")
        month_revenue = cursor.fetchone()[0] or 0
        
        conn.close()
        
        # Create modern stat cards
        stats = [
            ("👥", "Active Members", str(active_members), "#3b82f6", "Members"),
            ("📝", "Today's Check-ins", str(today_attendance), "#10b981", "Check-ins"),
            ("💰", "Today's Revenue", f"${today_revenue:.2f}", "#f59e0b", "Revenue"),
            ("⏰", "Expiring Soon", str(expiring_soon), "#ef4444", "Memberships"),
            ("📊", "Monthly Revenue", f"${month_revenue:.2f}", "#8b5cf6", "This Month"),
        ]
        
        for i, (icon, label, value, color, subtitle) in enumerate(stats):
            card = tk.Frame(cards_container, bg='white', relief=tk.SOLID, bd=1, highlightthickness=0)
            card.grid(row=i//3, column=i%3, padx=10, pady=10, sticky='ew')
            card.config(highlightbackground='#e2e8f0', highlightcolor='#e2e8f0')
            
            # Configure grid to make cards responsive
            cards_container.grid_columnconfigure(i%3, weight=1)
            
            # Icon background (rounded square look)
            icon_frame = tk.Frame(card, bg=color, width=60, height=60)
            icon_frame.pack(side=tk.LEFT, padx=20, pady=20)
            icon_frame.pack_propagate(False)
            
            icon_label = tk.Label(
                icon_frame,
                text=icon,
                font=('Segoe UI', 24),
                bg=color,
                fg='white'
            )
            icon_label.place(relx=0.5, rely=0.5, anchor='center')
            
            # Stats text
            stats_frame = tk.Frame(card, bg='white')
            stats_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 20), pady=20)
            
            label_text = tk.Label(
                stats_frame,
                text=label,
                font=('Segoe UI', 10),
                bg='white',
                fg='#64748b',
                anchor='w'
            )
            label_text.pack(anchor='w')
            
            value_text = tk.Label(
                stats_frame,
                text=value,
                font=('Segoe UI', 22, 'bold'),
                bg='white',
                fg='#1e293b',
                anchor='w'
            )
            value_text.pack(anchor='w')
        
        # Quick Actions section
        actions_label = tk.Label(
            self.content_frame,
            text="Quick Actions",
            font=('Segoe UI', 16, 'bold'),
            bg='#f5f7fa',
            fg='#1e293b'
        )
        actions_label.pack(anchor='w', pady=(20, 10))
        
        actions_frame = tk.Frame(self.content_frame, bg='#f5f7fa')
        actions_frame.pack(fill=tk.X)
        
        actions = [
            ("➕ Add Member", "#10b981", self.show_members),
            ("📝 Mark Attendance", "#f59e0b", self.show_attendance),
            ("💰 Record Payment", "#8b5cf6", self.show_payments),
        ]
        
        for text, color, command in actions:
            btn = tk.Button(
                actions_frame,
                text=text,
                font=('Segoe UI', 11, 'bold'),
                bg=color,
                fg='white',
                activebackground=color,
                activeforeground='white',
                bd=0,
                padx=30,
                pady=15,
                cursor='hand2',
                command=command
            )
            btn.pack(side=tk.LEFT, padx=5)
    
    def show_members(self):
        """Show members management"""
        self.clear_content()
        self.page_title.config(text="Members")
        
        # Title and Add Button
        top_frame = tk.Frame(self.content_frame, bg='#f5f7fa')
        top_frame.pack(fill=tk.X, pady=(0, 20))
        
        add_btn = tk.Button(
            top_frame,
            text="+ Add Member",
            font=('Segoe UI', 11, 'bold'),
            bg='#10b981',
            fg='white'
        )
        title.pack(side=tk.LEFT)
        
        add_btn = tk.Button(
            top_frame,
            text="+ Add Member",
            font=('Arial', 12),
            bg='#6c5ce7',
            fg='white',
            padx=20,
            pady=10,
            cursor='hand2',
            command=self.add_member
        )
        add_btn.pack(side=tk.RIGHT)
        
        # Search frame
        search_frame = tk.Frame(self.content_frame, bg='#1a1a2e')
        search_frame.pack(fill=tk.X, padx=20, pady=10)
        
        search_label = tk.Label(
            search_frame,
            text="Search:",
            font=('Arial', 12),
            bg='#1a1a2e',
            fg='white'
        )
        search_label.pack(side=tk.LEFT, padx=10)
        
        search_entry = tk.Entry(search_frame, font=('Arial', 12), width=40)
        search_entry.pack(side=tk.LEFT)
        
        search_btn = tk.Button(
            search_frame,
            text="Search",
            font=('Arial', 12),
            bg='#0f3460',
            fg='white',
            padx=15,
            pady=5,
            cursor='hand2',
            command=lambda: self.search_members(search_entry.get())
        )
        search_btn.pack(side=tk.LEFT, padx=10)
        
        # Members table
        table_frame = tk.Frame(self.content_frame, bg='#1a1a2e')
        table_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        # Scrollbars
        y_scroll = ttk.Scrollbar(table_frame)
        y_scroll.pack(side=tk.RIGHT, fill=tk.Y)
        
        x_scroll = ttk.Scrollbar(table_frame, orient=tk.HORIZONTAL)
        x_scroll.pack(side=tk.BOTTOM, fill=tk.X)
        
        # Treeview
        columns = ('ID', 'Name', 'Email', 'Phone', 'Join Date', 'Status')
        self.members_tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show='headings',
            yscrollcommand=y_scroll.set,
            xscrollcommand=x_scroll.set
        )
        
        for col in columns:
            self.members_tree.heading(col, text=col)
            self.members_tree.column(col, width=150)
        
        y_scroll.config(command=self.members_tree.yview)
        x_scroll.config(command=self.members_tree.xview)
        
        self.members_tree.pack(fill=tk.BOTH, expand=True)
        
        # Load members
        self.load_members()
        
        # Context menu
        self.members_tree.bind('<Double-Button-1>', self.edit_member)
        self.members_tree.bind('<Button-3>', self.show_member_context_menu)
    
    def load_members(self, search_term=''):
        """Load members into the tree view"""
        # Clear existing items
        for item in self.members_tree.get_children():
            self.members_tree.delete(item)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        if search_term:
            cursor.execute('''
                SELECT id, first_name || ' ' || last_name, email, phone, join_date, membership_status
                FROM members
                WHERE first_name LIKE ? OR last_name LIKE ? OR email LIKE ? OR phone LIKE ?
                ORDER BY id DESC
            ''', (f'%{search_term}%', f'%{search_term}%', f'%{search_term}%', f'%{search_term}%'))
        else:
            cursor.execute('''
                SELECT id, first_name || ' ' || last_name, email, phone, join_date, membership_status
                FROM members
                ORDER BY id DESC
            ''')
        
        members = cursor.fetchall()
        conn.close()
        
        for member in members:
            self.members_tree.insert('', tk.END, values=member)
    
    def search_members(self, term):
        """Search members"""
        self.load_members(term)
    
    def add_member(self):
        """Add new member"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Add New Member")
        dialog.geometry("600x700")
        dialog.configure(bg='#1a1a2e')
        dialog.transient(self.root)
        dialog.grab_set()
        
        # Create form
        form_frame = tk.Frame(dialog, bg='#1a1a2e')
        form_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)
        
        fields = [
            ("First Name*", "first_name"),
            ("Last Name*", "last_name"),
            ("Email", "email"),
            ("Phone*", "phone"),
            ("Date of Birth (YYYY-MM-DD)", "dob"),
            ("Gender", "gender"),
            ("Address", "address"),
            ("Emergency Contact", "emergency_contact"),
            ("Emergency Phone", "emergency_phone"),
        ]
        
        entries = {}
        
        for i, (label, field) in enumerate(fields):
            lbl = tk.Label(
                form_frame,
                text=label,
                font=('Arial', 11),
                bg='#1a1a2e',
                fg='white',
                anchor='w'
            )
            lbl.grid(row=i, column=0, sticky='w', pady=8)
            
            entry = tk.Entry(form_frame, font=('Arial', 11), width=30)
            entry.grid(row=i, column=1, pady=8, padx=10)
            entries[field] = entry
        
        # Gender dropdown
        entries['gender'].destroy()
        gender_var = tk.StringVar()
        gender_combo = ttk.Combobox(
            form_frame,
            textvariable=gender_var,
            values=['Male', 'Female', 'Other'],
            state='readonly',
            width=28
        )
        gender_combo.grid(row=5, column=1, pady=8, padx=10)
        entries['gender'] = gender_var
        
        def save_member():
            # Validate required fields
            if not entries['first_name'].get() or not entries['last_name'].get() or not entries['phone'].get():
                messagebox.showerror("Error", "Please fill in all required fields marked with *")
                return
            
            try:
                conn = sqlite3.connect(self.db_file)
                cursor = conn.cursor()
                
                cursor.execute('''
                    INSERT INTO members (
                        first_name, last_name, email, phone, date_of_birth, gender,
                        address, emergency_contact, emergency_phone
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    entries['first_name'].get(),
                    entries['last_name'].get(),
                    entries['email'].get() or None,
                    entries['phone'].get(),
                    entries['dob'].get() or None,
                    entries['gender'].get() or None,
                    entries['address'].get() or None,
                    entries['emergency_contact'].get() or None,
                    entries['emergency_phone'].get() or None,
                ))
                
                conn.commit()
                conn.close()
                
                messagebox.showinfo("Success", "Member added successfully!")
                dialog.destroy()
                self.load_members()
                
                # Log usage
                try:
                    requests.post(
                        f'{API_BASE_URL}/log-usage',
                        json={
                            'api_key': self.api_key,
                            'action': 'add_member',
                            'details': f"Added member: {entries['first_name'].get()} {entries['last_name'].get()}"
                        },
                        timeout=5
                    )
                except:
                    pass
                
            except sqlite3.IntegrityError:
                messagebox.showerror("Error", "A member with this email already exists")
            except Exception as e:
                messagebox.showerror("Error", f"Failed to add member: {str(e)}")
        
        # Buttons
        btn_frame = tk.Frame(form_frame, bg='#1a1a2e')
        btn_frame.grid(row=len(fields), column=0, columnspan=2, pady=20)
        
        save_btn = tk.Button(
            btn_frame,
            text="Save Member",
            font=('Arial', 12),
            bg='#6c5ce7',
            fg='white',
            padx=20,
            pady=10,
            cursor='hand2',
            command=save_member
        )
        save_btn.pack(side=tk.LEFT, padx=10)
        
        cancel_btn = tk.Button(
            btn_frame,
            text="Cancel",
            font=('Arial', 12),
            bg='#e74c3c',
            fg='white',
            padx=20,
            pady=10,
            cursor='hand2',
            command=dialog.destroy
        )
        cancel_btn.pack(side=tk.LEFT)
    
    def edit_member(self, event):
        """Edit selected member"""
        selection = self.members_tree.selection()
        if not selection:
            return
        
        member_id = self.members_tree.item(selection[0])['values'][0]
        
        # Get member data
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        cursor.execute('SELECT * FROM members WHERE id = ?', (member_id,))
        member = cursor.fetchone()
        conn.close()
        
        if not member:
            return
        
        # Create edit dialog (similar to add_member but with pre-filled values)
        messagebox.showinfo("Edit Member", f"Editing member ID: {member_id}\n(Full edit dialog implementation)")
    
    def show_member_context_menu(self, event):
        """Show context menu for member"""
        selection = self.members_tree.selection()
        if not selection:
            return
        
        menu = tk.Menu(self.root, tearoff=0)
        menu.add_command(label="Edit", command=lambda: self.edit_member(event))
        menu.add_command(label="View Details", command=lambda: self.view_member_details())
        menu.add_command(label="Delete", command=lambda: self.delete_member())
        menu.tk_popup(event.x_root, event.y_root)
    
    def view_member_details(self):
        """View detailed member information"""
        selection = self.members_tree.selection()
        if not selection:
            return
        
        member_id = self.members_tree.item(selection[0])['values'][0]
        messagebox.showinfo("Member Details", f"Viewing details for member ID: {member_id}")
    
    def delete_member(self):
        """Delete selected member"""
        selection = self.members_tree.selection()
        if not selection:
            return
        
        member_id = self.members_tree.item(selection[0])['values'][0]
        
        if messagebox.askyesno("Confirm Delete", "Are you sure you want to delete this member?"):
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            cursor.execute('DELETE FROM members WHERE id = ?', (member_id,))
            conn.commit()
            conn.close()
            
            self.load_members()
            messagebox.showinfo("Success", "Member deleted successfully")
    
    def show_attendance(self):
        """Show attendance tracking"""
        self.clear_content()
        
        title = tk.Label(
            self.content_frame,
            text="Attendance Tracking",
            font=('Arial', 24, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=20)
        
        # Check-in frame
        checkin_frame = tk.Frame(self.content_frame, bg='#16213e', padx=30, pady=30)
        checkin_frame.pack(pady=20, fill=tk.X, padx=50)
        
        member_label = tk.Label(
            checkin_frame,
            text="Member ID or Phone:",
            font=('Arial', 14),
            bg='#16213e',
            fg='white'
        )
        member_label.pack(pady=10)
        
        member_entry = tk.Entry(checkin_frame, font=('Arial', 14), width=30)
        member_entry.pack(pady=10)
        
        def check_in():
            identifier = member_entry.get().strip()
            if not identifier:
                messagebox.showerror("Error", "Please enter Member ID or Phone")
                return
            
            conn = sqlite3.connect(self.db_file)
            cursor = conn.cursor()
            
            # Find member
            cursor.execute('''
                SELECT id, first_name, last_name FROM members
                WHERE id = ? OR phone = ?
            ''', (identifier, identifier))
            
            member = cursor.fetchone()
            
            if not member:
                messagebox.showerror("Error", "Member not found")
                conn.close()
                return
            
            member_id = member[0]
            member_name = f"{member[1]} {member[2]}"
            
            # Check if already checked in today
            cursor.execute('''
                SELECT id FROM attendance
                WHERE member_id = ? AND DATE(check_in_time) = DATE('now')
                AND check_out_time IS NULL
            ''', (member_id,))
            
            existing = cursor.fetchone()
            
            if existing:
                messagebox.showinfo("Already Checked In", f"{member_name} is already checked in today")
            else:
                cursor.execute('''
                    INSERT INTO attendance (member_id) VALUES (?)
                ''', (member_id,))
                conn.commit()
                messagebox.showinfo("Success", f"✅ {member_name} checked in successfully!")
                member_entry.delete(0, tk.END)
                self.load_today_attendance()
            
            conn.close()
        
        checkin_btn = tk.Button(
            checkin_frame,
            text="✅ Check In",
            font=('Arial', 14, 'bold'),
            bg='#00b894',
            fg='white',
            padx=30,
            pady=15,
            cursor='hand2',
            command=check_in
        )
        checkin_btn.pack(pady=10)
        
        # Today's attendance
        attendance_label = tk.Label(
            self.content_frame,
            text="Today's Attendance",
            font=('Arial', 18, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        attendance_label.pack(pady=20)
        
        # Attendance table
        table_frame = tk.Frame(self.content_frame, bg='#1a1a2e')
        table_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        columns = ('Member ID', 'Name', 'Check-in Time', 'Status')
        self.attendance_tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show='headings',
            height=10
        )
        
        for col in columns:
            self.attendance_tree.heading(col, text=col)
            self.attendance_tree.column(col, width=200)
        
        self.attendance_tree.pack(fill=tk.BOTH, expand=True)
        
        self.load_today_attendance()
    
    def load_today_attendance(self):
        """Load today's attendance records"""
        for item in self.attendance_tree.get_children():
            self.attendance_tree.delete(item)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT m.id, m.first_name || ' ' || m.last_name, a.check_in_time,
                   CASE WHEN a.check_out_time IS NULL THEN 'In' ELSE 'Out' END
            FROM attendance a
            JOIN members m ON a.member_id = m.id
            WHERE DATE(a.check_in_time) = DATE('now')
            ORDER BY a.check_in_time DESC
        ''')
        
        records = cursor.fetchall()
        conn.close()
        
        for record in records:
            self.attendance_tree.insert('', tk.END, values=record)
    
    def show_payments(self):
        """Show payments management"""
        self.clear_content()
        
        title = tk.Label(
            self.content_frame,
            text="Payments Management",
            font=('Arial', 24, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=20)
        
        add_btn = tk.Button(
            self.content_frame,
            text="+ Record Payment",
            font=('Arial', 12),
            bg='#6c5ce7',
            fg='white',
            padx=20,
            pady=10,
            cursor='hand2',
            command=self.record_payment
        )
        add_btn.pack(pady=10)
        
        # Payments table
        table_frame = tk.Frame(self.content_frame, bg='#1a1a2e')
        table_frame.pack(fill=tk.BOTH, expand=True, padx=20, pady=10)
        
        columns = ('ID', 'Member', 'Amount', 'Date', 'Method', 'Description')
        self.payments_tree = ttk.Treeview(
            table_frame,
            columns=columns,
            show='headings'
        )
        
        for col in columns:
            self.payments_tree.heading(col, text=col)
            self.payments_tree.column(col, width=150)
        
        self.payments_tree.pack(fill=tk.BOTH, expand=True)
        
        self.load_payments()
    
    def load_payments(self):
        """Load payment records"""
        for item in self.payments_tree.get_children():
            self.payments_tree.delete(item)
        
        conn = sqlite3.connect(self.db_file)
        cursor = conn.cursor()
        
        cursor.execute('''
            SELECT p.id, m.first_name || ' ' || m.last_name, p.amount, 
                   p.payment_date, p.payment_method, p.description
            FROM payments p
            JOIN members m ON p.member_id = m.id
            ORDER BY p.payment_date DESC
            LIMIT 100
        ''')
        
        payments = cursor.fetchall()
        conn.close()
        
        for payment in payments:
            self.payments_tree.insert('', tk.END, values=payment)
    
    def record_payment(self):
        """Record a new payment"""
        messagebox.showinfo("Record Payment", "Payment recording dialog (implementation)")
    
    def show_classes(self):
        """Show classes management"""
        self.clear_content()
        
        title = tk.Label(
            self.content_frame,
            text="Classes Management",
            font=('Arial', 24, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=20)
        
        info = tk.Label(
            self.content_frame,
            text="Manage gym classes, schedules, and enrollments",
            font=('Arial', 12),
            bg='#1a1a2e',
            fg='#a8dadc'
        )
        info.pack(pady=10)
    
    def show_reports(self):
        """Show reports and analytics"""
        self.clear_content()
        
        title = tk.Label(
            self.content_frame,
            text="Reports & Analytics",
            font=('Arial', 24, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=20)
        
        info = tk.Label(
            self.content_frame,
            text="View attendance trends, revenue reports, and member statistics",
            font=('Arial', 12),
            bg='#1a1a2e',
            fg='#a8dadc'
        )
        info.pack(pady=10)
    
    def run(self):
        """Start the application"""
        self.root.mainloop()


if __name__ == '__main__':
    app = GymManagementApp()
    app.run()
