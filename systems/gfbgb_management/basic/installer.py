"""
ZORO9X mfkvfvfg System - Installation Wizard
"""

import tkinter as tk
from tkinter import messagebox
import os
import sys
import subprocess
import json
import requests
import shutil
from pathlib import Path

API_BASE_URL = 'http://localhost:5001/api/saas'

class InstallationWizard:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("ZORO9X mfkvfvfg - Installation Wizard")
        self.root.geometry("750x550")
        self.root.configure(bg='#f5f7fa')
        self.root.resizable(False, False)
        
        self.current_step = 0
        self.steps = [
            self.welcome_step,
            self.license_agreement_step,
            self.configuration_step,
            self.installation_location_step,
            self.installing_step,
            self.completion_step
        ]
        
        self.install_path = str(Path.home() / 'ZORO9X' / 'GymManagement')
        self.create_desktop_shortcut = True  # Default to creating desktop shortcut
        
        # Load business config if available
        self.business_config = self.load_business_config()
        self.api_key = self.business_config.get('api_key', '')
        self.company_name = self.business_config.get('business_details', {}).get('name', '')
        self.database_name = self.business_config.get('database_config', {}).get('database_name', '')
        
        self.create_ui()
        self.show_current_step()
    
    def load_business_config(self):
        """Load pre-configured business settings"""
        config_file = 'business_config.json'
        if os.path.exists(config_file):
            try:
                with open(config_file, 'r') as f:
                    return json.load(f)
            except:
                pass
        return {}
    
    def create_ui(self):
        """Create the main UI structure with modern design"""
        # Modern header
        header = tk.Frame(self.root, bg='#2563eb', height=70)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        
        title = tk.Label(
            header,
            text="🏋️ ZORO9X mfkvfvfg System",
            font=('Segoe UI', 16, 'bold'),
            bg='#2563eb',
            fg='white'
        )
        title.pack(pady=10)
        
        subtitle = tk.Label(
            header,
            text="Installation Wizard",
            font=('Segoe UI', 9),
            bg='#2563eb',
            fg='#dbeafe'
        )
        subtitle.pack()
        
        # Content frame with card-like appearance
        content_container = tk.Frame(self.root, bg='#f5f7fa')
        content_container.pack(fill=tk.BOTH, expand=True, padx=25, pady=10)
        
        self.content_frame = tk.Frame(content_container, bg='white', relief=tk.SOLID, bd=1)
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.content_frame.config(highlightbackground='#e2e8f0', highlightcolor='#e2e8f0')
        
        # Footer with modern buttons
        footer = tk.Frame(self.root, bg='white', height=60)
        footer.pack(fill=tk.X, side=tk.BOTTOM)
        footer.pack_propagate(False)
        
        # Add separator line
        separator = tk.Frame(footer, bg='#e2e8f0', height=1)
        separator.pack(fill=tk.X)
        
        button_frame = tk.Frame(footer, bg='white')
        button_frame.pack(fill=tk.BOTH, expand=True)
        
        self.back_btn = tk.Button(
            button_frame,
            text="←  Back",
            font=('Segoe UI', 9),
            bg='#f1f5f9',
            fg='#64748b',
            activebackground='#e2e8f0',
            activeforeground='#475569',
            bd=0,
            padx=18,
            pady=7,
            cursor='hand2',
            command=self.previous_step,
            state=tk.DISABLED
        )
        self.back_btn.pack(side=tk.LEFT, padx=20, pady=10)
        
        self.cancel_btn = tk.Button(
            button_frame,
            text="Cancel",
            font=('Segoe UI', 9),
            bg='#f1f5f9',
            fg='#64748b',
            activebackground='#fee2e2',
            activeforeground='#dc2626',
            bd=0,
            padx=18,
            pady=7,
            cursor='hand2',
            command=self.cancel_installation
        )
        self.cancel_btn.pack(side=tk.LEFT, padx=5, pady=10)
        
        self.next_btn = tk.Button(
            button_frame,
            text="Next  →",
            font=('Segoe UI', 9, 'bold'),
            bg='#2563eb',
            fg='white',
            activebackground='#1d4ed8',
            activeforeground='white',
            bd=0,
            padx=22,
            pady=7,
            cursor='hand2',
            command=self.next_step
        )
        self.next_btn.pack(side=tk.RIGHT, padx=20, pady=10)
    
    def clear_content(self):
        """Clear the content frame"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def show_current_step(self):
        """Show the current installation step"""
        self.clear_content()
        self.steps[self.current_step]()
        
        # Update button states
        self.back_btn.config(state=tk.NORMAL if self.current_step > 0 else tk.DISABLED)
        
        if self.current_step == len(self.steps) - 1:
            self.next_btn.pack_forget()
            self.cancel_btn.pack_forget()
        elif self.current_step == len(self.steps) - 2:
            self.next_btn.config(text="Install", bg='#10b981')
        else:
            self.next_btn.config(text="Next  →", bg='#2563eb')
    
    def next_step(self):
        """Go to next step"""
        # Validate current step
        if self.current_step == 2:  # Configuration step
            if not self.validate_api_key():
                return
        
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.show_current_step()
    
    def previous_step(self):
        """Go to previous step"""
        if self.current_step > 0:
            self.current_step -= 1
            self.show_current_step()
    
    def cancel_installation(self):
        """Cancel the installation"""
        if messagebox.askyesno("Cancel Installation", "Are you sure you want to cancel the installation?"):
            self.root.quit()
    
    def welcome_step(self):
        """Welcome screen with modern design"""
        # Welcome icon and title
        title_frame = tk.Frame(self.content_frame, bg='white')
        title_frame.pack(pady=6)
        
        icon_label = tk.Label(
            title_frame,
            text="🏋️",
            font=('Segoe UI', 26),
            bg='white'
        )
        icon_label.pack()
        
        title = tk.Label(
            title_frame,
            text="Welcome to ZORO9X mfkvfvfg",
            font=('Segoe UI', 13, 'bold'),
            bg='white',
            fg='#1e293b'
        )
        title.pack(pady=(4, 2))
        
        subtitle = tk.Label(
            title_frame,
            text="Professional gym management made simple",
            font=('Segoe UI', 9),
            bg='white',
            fg='#64748b'
        )
        subtitle.pack()
        
        # Features list with icons
        features_frame = tk.Frame(self.content_frame, bg='white')
        features_frame.pack(pady=5, padx=30, fill=tk.X)
        
        features_title = tk.Label(
            features_frame,
            text="Features Included:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#1e293b',
            anchor='w'
        )
        features_title.pack(anchor='w', pady=(0, 5))
        
        features = [
            ("👥", "Member Management", "Track and manage gym members"),
            ("📝", "Attendance Tracking", "Monitor check-ins and visits"),
            ("💰", "Payment Management", "Handle memberships and billing"),
            ("🏋️", "Classes Management", "Schedule and organize classes"),
            ("📊", "Dashboard & Reports", "Visualize your gym's performance"),
        ]
        
        for icon, title, desc in features:
            feature_row = tk.Frame(features_frame, bg='white')
            feature_row.pack(fill=tk.X, pady=3)
            
            icon_label = tk.Label(
                feature_row,
                text=icon,
                font=('Segoe UI', 14),
                bg='white',
                width=2
            )
            icon_label.pack(side=tk.LEFT, padx=(0, 8))
            
            text_frame = tk.Frame(feature_row, bg='white')
            text_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            title_label = tk.Label(
                text_frame,
                text=title,
                font=('Segoe UI', 9, 'bold'),
                bg='white',
                fg='#1e293b',
                anchor='w'
            )
            title_label.pack(anchor='w')
            
            desc_label = tk.Label(
                text_frame,
                text=desc,
                font=('Segoe UI', 8),
                bg='white',
                fg='#64748b',
                anchor='w'
            )
            desc_label.pack(anchor='w')
    
    def license_agreement_step(self):
        """License agreement screen"""
        title = tk.Label(
            self.content_frame,
            text="License Agreement",
            font=('Arial', 16, 'bold'),
            bg='#1a1a2e',
            fg='white'
        )
        title.pack(pady=20)
        
        license_text = tk.Text(
            self.content_frame,
            font=('Arial', 10),
            bg='#16213e',
            fg='white',
            wrap=tk.WORD,
            height=15
        )
        license_text.pack(fill=tk.BOTH, expand=True, padx=10)
        
        agreement = """
END-USER LICENSE AGREEMENT (EULA)

This software is licensed, not sold. By installing this software, you agree to the following terms:

1. LICENSE GRANT
   ZORO9X grants you a non-exclusive, non-transferable license to use this software on devices owned or controlled by you.

2. RESTRICTIONS
   You may NOT:
   - Copy or distribute this software
   - Reverse engineer or decompile the software
   - Share your API key with others
   - Use the software beyond your subscription period

3. SUBSCRIPTION
   This software requires an active subscription. The software will verify your license periodically.

4. TERMINATION
   This license terminates if you breach any terms. Upon termination, you must uninstall the software.

5. WARRANTY DISCLAIMER
   This software is provided "AS IS" without warranty of any kind.

6. LIMITATION OF LIABILITY
   ZORO9X shall not be liable for any damages arising from use of this software.

By clicking 'Next', you accept the terms of this agreement.
        """
        
        license_text.insert('1.0', agreement)
        license_text.config(state=tk.DISABLED)
    
    def configuration_step(self):
        """Combined configuration step - API key and database settings"""
        title = tk.Label(
            self.content_frame,
            text="System Configuration",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#1e293b'
        )
        title.pack(pady=(20, 10))
        
        subtitle = tk.Label(
            self.content_frame,
            text="Configure your system credentials and database",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        )
        subtitle.pack(pady=(0, 20))
        
        # Scrollable frame for configuration
        canvas = tk.Canvas(self.content_frame, bg='white', highlightthickness=0)
        scrollbar = tk.Scrollbar(self.content_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='white')
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        canvas.pack(side="left", fill="both", expand=True, padx=10)
        scrollbar.pack(side="right", fill="y")
        
        # API Key Section
        api_frame = tk.LabelFrame(
            scrollable_frame,
            text=" \ud83d\udd11  API Key Configuration",
            font=('Segoe UI', 11, 'bold'),
            bg='white',
            fg='#1e293b',
            padx=20,
            pady=15,
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#e2e8f0',
            highlightthickness=1
        )
        api_frame.pack(fill='x', pady=(0, 15), padx=10)
        
        # Check if API key is pre-configured
        if self.api_key:
            tk.Label(
                api_frame,
                text="\u2713 API Key: Pre-configured from your purchase",
                font=('Segoe UI', 10),
                bg='white',
                fg='#10b981'
            ).pack(anchor='w', pady=5)
            
            tk.Label(
                api_frame,
                text=f"Key: {self.api_key[:8]}{'*' * 24}",
                font=('Segoe UI', 9),
                bg='white',
                fg='#64748b'
            ).pack(anchor='w', pady=5)
        else:
            info_label = tk.Label(
                api_frame,
                text="Enter your API key from your ZORO9X account:",
                font=('Segoe UI', 10),
                bg='white',
                fg='#64748b',
                justify=tk.LEFT
            )
            info_label.pack(anchor='w', pady=(0, 10))
            
            tk.Label(
                api_frame,
                text="API Key:",
                font=('Segoe UI', 10, 'bold'),
                bg='white',
                fg='#1e293b'
            ).pack(anchor='w', pady=(0, 5))
            
            self.api_key_entry = tk.Entry(
                api_frame,
                font=('Segoe UI', 10),
                width=45,
                show='*',
                relief=tk.SOLID,
                bd=1,
                highlightbackground='#cbd5e1',
                highlightthickness=1
            )
            self.api_key_entry.pack(fill='x', pady=(0, 10))
            
            self.validate_btn = tk.Button(
                api_frame,
                text="Validate API Key",
                font=('Segoe UI', 9, 'bold'),
                bg='#2563eb',
                fg='white',
                relief='flat',
                cursor='hand2',
                padx=15,
                pady=5,
                command=self.validate_api_key_only
            )
            self.validate_btn.pack(anchor='w')
            
            self.validation_label = tk.Label(
                api_frame,
                text="",
                font=('Segoe UI', 9),
                bg='white'
            )
            self.validation_label.pack(anchor='w', pady=(5, 0))
        
        # Company Name Section
        company_frame = tk.LabelFrame(
            scrollable_frame,
            text=" \ud83c\udfdb\ufe0f  Business Information",
            font=('Segoe UI', 11, 'bold'),
            bg='white',
            fg='#1e293b',
            padx=20,
            pady=15,
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#e2e8f0',
            highlightthickness=1
        )
        company_frame.pack(fill='x', pady=(0, 15), padx=10)
        
        tk.Label(
            company_frame,
            text="Company/Gym Name:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(anchor='w', pady=(0, 5))
        
        self.company_entry = tk.Entry(
            company_frame,
            font=('Segoe UI', 10),
            width=45,
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#cbd5e1',
            highlightthickness=1
        )
        self.company_entry.pack(fill='x')
        
        # Pre-fill if available
        if self.company_name:
            self.company_entry.insert(0, self.company_name)
        
        # Database Configuration Section
        db_frame = tk.LabelFrame(
            scrollable_frame,
            text=" \ud83d\udce6  Database Configuration",
            font=('Segoe UI', 11, 'bold'),
            bg='white',
            fg='#1e293b',
            padx=20,
            pady=15,
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#e2e8f0',
            highlightthickness=1
        )
        db_frame.pack(fill='x', padx=10)
        
        tk.Label(
            db_frame,
            text="Database Name:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(anchor='w', pady=(0, 5))
        
        self.db_name_entry = tk.Entry(
            db_frame,
            font=('Segoe UI', 10),
            width=45,
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#cbd5e1',
            highlightthickness=1
        )
        self.db_name_entry.pack(fill='x', pady=(0, 10))
        
        # Pre-fill database name
        if self.database_name:
            self.db_name_entry.insert(0, self.database_name)
        elif self.company_name:
            # Suggest database name from company name
            suggested_db = self.company_name.lower().replace(' ', '_').replace('-', '_')
            suggested_db = ''.join(c for c in suggested_db if c.isalnum() or c == '_')
            self.db_name_entry.insert(0, f"{suggested_db}_gym")
        else:
            self.db_name_entry.insert(0, "gym_management_db")
        
        tk.Label(
            db_frame,
            text="\u2139 The database will be created automatically during installation.\nUse lowercase letters, numbers, and underscores only.",
            font=('Segoe UI', 9),
            bg='white',
            fg='#64748b',
            justify=tk.LEFT
        ).pack(anchor='w', pady=(5, 0))
        
        self.validation_label = tk.Label(
            self.content_frame,
            text="",
            font=('Segoe UI', 10),
            bg='white',
            fg='#ef4444'
        )
        self.validation_label.pack(pady=10)
    
    def validate_api_key_only(self):
        """Validate the API key with server (for manual entry)"""
        api_key = self.api_key_entry.get().strip()
        
        if not api_key:
            self.validation_label.config(text="Please enter an API key", fg='#e74c3c')
            return False
        
        try:
            self.validation_label.config(text="Validating...", fg='#fdcb6e')
            self.root.update()
            
            response = requests.post(
                f'{API_BASE_URL}/validate-key',
                json={'api_key': api_key},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    self.api_key = api_key
                    self.validation_label.config(text="✓ Valid subscription", fg='#00b894')
                    return True
                else:
                    self.validation_label.config(text="✗ Invalid or expired subscription", fg='#e74c3c')
                    return False
            else:
                self.validation_label.config(text="✗ Validation failed", fg='#e74c3c')
                return False
        except Exception as e:
            self.validation_label.config(text=f"✗ Error: {str(e)}", fg='#e74c3c')
            return False
    
    def validate_api_key(self):
        """Validate configuration before proceeding"""
        # If API key is pre-configured, skip validation
        if self.api_key and not hasattr(self, 'api_key_entry'):
            # Get other details
            self.company_name = self.company_entry.get().strip() or self.company_name
            self.database_name = self.db_name_entry.get().strip()
            
            if not self.database_name:
                messagebox.showerror("Error", "Please enter a database name")
                return False
            
            # Validate database name format
            if not self.database_name.replace('_', '').isalnum():
                messagebox.showerror("Error", "Database name can only contain letters, numbers, and underscores")
                return False
            
            return True
        
        # Manual API key entry
        api_key = self.api_key_entry.get().strip()
        company_name = self.company_entry.get().strip()
        database_name = self.db_name_entry.get().strip()
        
        if not api_key:
            messagebox.showerror("Error", "Please enter your API key and validate it")
            return False
        
        if not company_name:
            messagebox.showerror("Error", "Please enter your company/gym name")
            return False
        
        if not database_name:
            messagebox.showerror("Error", "Please enter a database name")
            return False
        
        # Validate database name format
        if not database_name.replace('_', '').isalnum():
            messagebox.showerror("Error", "Database name can only contain letters, numbers, and underscores")
            return False
        
        # Check if API key was validated
        if not self.api_key:
            messagebox.showerror("Error", "Please validate your API key first")
            return False
        
        self.company_name = company_name
        self.database_name = database_name
        return True
    
    def installation_location_step(self):
        """Installation location screen"""
        title = tk.Label(
            self.content_frame,
            text="Installation Location",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#1e293b'
        )
        title.pack(pady=(20, 10))
        
        subtitle = tk.Label(
            self.content_frame,
            text="Choose where to install the application",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        )
        subtitle.pack(pady=(0, 20))
        
        info = tk.Label(
            self.content_frame,
            text="Choose where to install the application:",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        )
        info.pack(pady=10)
        
        # Path frame with modern styling
        path_container = tk.Frame(
            self.content_frame,
            bg='white',
            relief=tk.SOLID,
            bd=1,
            highlightbackground='#e2e8f0',
            highlightthickness=1
        )
        path_container.pack(pady=20, padx=40, fill=tk.X)
        
        path_frame = tk.Frame(path_container, bg='white')
        path_frame.pack(pady=10, padx=10, fill=tk.X)
        
        self.path_entry = tk.Entry(
            path_frame,
            font=('Segoe UI', 10),
            width=45,
            relief=tk.FLAT,
            bd=0,
            bg='white'
        )
        self.path_entry.insert(0, self.install_path)
        self.path_entry.pack(side=tk.LEFT, padx=5, fill=tk.X, expand=True)
        
        browse_btn = tk.Button(
            path_frame,
            text="\ud83d\udcc2 Browse...",
            font=('Segoe UI', 9),
            bg='#f1f5f9',
            fg='#475569',
            relief='flat',
            padx=12,
            pady=5,
            cursor='hand2',
            command=self.browse_location
        )
        browse_btn.pack(side=tk.LEFT)
        
        space_label = tk.Label(
            self.content_frame,
            text="\ud83d\udcbe Required space: ~500 MB",
            font=('Segoe UI', 9),
            bg='white',
            fg='#64748b'
        )
        space_label.pack(pady=10)
        
        # Desktop shortcut checkbox
        shortcut_frame = tk.Frame(self.content_frame, bg='white')
        shortcut_frame.pack(pady=20)
        
        self.shortcut_var = tk.BooleanVar(value=True)
        shortcut_check = tk.Checkbutton(
            shortcut_frame,
            text="\u2713 Create desktop shortcut",
            font=('Segoe UI', 10),
            bg='white',
            fg='#1e293b',
            selectcolor='white',
            activebackground='white',
            activeforeground='#2563eb',
            variable=self.shortcut_var,
            cursor='hand2'
        )
        shortcut_check.pack()
    
    def browse_location(self):
        """Browse for installation location"""
        from tkinter import filedialog
        directory = filedialog.askdirectory(initialdir=self.install_path)
        if directory:
            self.install_path = directory
            self.path_entry.delete(0, tk.END)
            self.path_entry.insert(0, self.install_path)
    
    def installing_step(self):
        """Installation progress screen"""
        self.back_btn.config(state=tk.DISABLED)
        self.next_btn.config(state=tk.DISABLED)
        self.cancel_btn.config(state=tk.DISABLED)
        
        title = tk.Label(
            self.content_frame,
            text="Installing",
            font=('Segoe UI', 18, 'bold'),
            bg='white',
            fg='#1e293b'
        )
        title.pack(pady=(40, 10))
        
        subtitle = tk.Label(
            self.content_frame,
            text="Please wait while we install your gym management system...",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        )
        subtitle.pack(pady=(0, 30))
        
        self.progress_label = tk.Label(
            self.content_frame,
            text="Preparing installation...",
            font=('Segoe UI', 10),
            bg='white',
            fg='#475569'
        )
        self.progress_label.pack(pady=10)
        
        # Progress bar container with modern styling
        progress_container = tk.Frame(
            self.content_frame,
            bg='#e2e8f0',
            width=420,
            height=10,
            relief=tk.FLAT
        )
        progress_container.pack(pady=20, padx=40)
        progress_container.pack_propagate(False)
        
        progress_bar = tk.Canvas(
            progress_container,
            width=420,
            height=10,
            bg='#e2e8f0',
            highlightthickness=0,
            bd=0
        )
        progress_bar.pack()
        
        # Start installation in background
        self.root.after(500, lambda: self.perform_installation(progress_bar))
    
    def perform_installation(self, progress_bar):
        """Perform the actual installation"""
        steps = [
            ("Creating installation directory...", 15),
            ("Copying application files...", 30),
            ("Copying business assets...", 45),
            ("Installing dependencies...", 60),
            ("Creating database...", 75),
            ("Saving configuration...", 85),
            ("Creating desktop shortcut...", 95),
            ("Finalizing installation...", 100)
        ]
        
        try:
            for step_text, progress in steps:
                self.progress_label.config(text=step_text)
                progress_bar.create_rectangle(
                    0, 0,
                    (progress / 100) * 420, 10,
                    fill='#2563eb',
                    outline=''
                )
                self.root.update()
                
                if "Creating installation" in step_text:
                    # Create installation directory
                    os.makedirs(self.install_path, exist_ok=True)
                
                elif "Copying application" in step_text:
                    # Copy current script and files
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    for file in ['gfbgb_app.py', 'requirements.txt', 'README.md']:
                        src = os.path.join(script_dir, file)
                        if os.path.exists(src):
                            shutil.copy(src, self.install_path)
                
                elif "Copying business assets" in step_text:
                    # Copy logo and business config if they exist
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    
                    # Copy logo files
                    for ext in ['png', 'jpg', 'jpeg', 'gif']:
                        logo_file = os.path.join(script_dir, f'logo.{ext}')
                        if os.path.exists(logo_file):
                            shutil.copy(logo_file, self.install_path)
                            break
                    
                    # Copy business config if it exists
                    business_config = os.path.join(script_dir, 'business_config.json')
                    if os.path.exists(business_config):
                        shutil.copy(business_config, self.install_path)
                
                elif "Installing dependencies" in step_text:
                    # Install Python packages
                    requirements_file = os.path.join(self.install_path, 'requirements.txt')
                    if os.path.exists(requirements_file):
                        subprocess.run(
                            [sys.executable, '-m', 'pip', 'install', '-r', requirements_file, '--quiet'],
                            check=True
                        )
                
                elif "Creating database" in step_text:
                    # Create SQLite database
                    db_path = os.path.join(self.install_path, f'{self.database_name}.db')
                    self.create_database(db_path)
                
                elif "Saving configuration" in step_text:
                    # Save config file
                    config = {
                        'api_key': self.api_key,
                        'company_name': self.company_name,
                        'database_name': self.database_name,
                        'database_path': f'{self.database_name}.db'
                    }
                    config_path = os.path.join(self.install_path, 'gym_config.json')
                    with open(config_path, 'w') as f:
                        json.dump(config, f, indent=2)
                
                elif "Creating desktop shortcut" in step_text:
                    # Create desktop shortcut (Windows)
                    if sys.platform == 'win32' and self.shortcut_var.get():
                        self.create_shortcut()
                
                time.sleep(0.5)
            
            # Move to completion step
            self.current_step += 1
            self.show_current_step()
            
        except Exception as e:
            messagebox.showerror("Installation Error", f"Failed to install: {str(e)}")
            self.root.quit()
    
    def create_database(self, db_path):
        """Create and initialize the database"""
        import sqlite3
        
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Create members table (matching gfbgb_app.py schema)
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
        
        # Create memberships table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS memberships (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                plan_name TEXT NOT NULL,
                start_date DATE NOT NULL,
                end_date DATE NOT NULL,
                amount REAL NOT NULL,
                status TEXT DEFAULT 'active',
                FOREIGN KEY (member_id) REFERENCES members (id)
            )
        ''')
        
        # Create attendance table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS attendance (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                check_in_time TIMESTAMP NOT NULL,
                check_out_time TIMESTAMP,
                date DATE NOT NULL,
                notes TEXT,
                FOREIGN KEY (member_id) REFERENCES members (id)
            )
        ''')
        
        # Create payments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                member_id INTEGER,
                amount REAL NOT NULL,
                payment_date DATE NOT NULL,
                payment_method TEXT,
                description TEXT,
                receipt_number TEXT,
                FOREIGN KEY (member_id) REFERENCES members (id)
            )
        ''')
        
        # Create classes table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                instructor TEXT,
                schedule TEXT,
                duration INTEGER,
                max_capacity INTEGER,
                current_enrollment INTEGER DEFAULT 0,
                description TEXT,
                status TEXT DEFAULT 'active'
            )
        ''')
        
        # Create class enrollments table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS class_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER,
                member_id INTEGER,
                enrollment_date DATE,
                FOREIGN KEY (class_id) REFERENCES classes (id),
                FOREIGN KEY (member_id) REFERENCES members (id)
            )
        ''')
        
        conn.commit()
        conn.close()
    
    def create_shortcut(self):
        """Create desktop shortcut (Windows only)"""
        try:
            desktop = Path.home() / 'Desktop'
            shortcut_path = str(desktop / 'ZORO9X mfkvfvfg.lnk')
            
            # Create a simple batch file launcher
            install_path = Path(self.install_path)
            batch_file = str(install_path / 'launch.bat')
            app_file = str(install_path / 'gfbgb_app.py')
            
            with open(batch_file, 'w') as f:
                f.write(f'@echo off\n')
                f.write(f'cd /d "{self.install_path}"\n')
                f.write(f'"{sys.executable}" "{app_file}"\n')
                f.write(f'pause\n')
            
            # Create shortcut using PowerShell
            ps_command = f'''
                $WshShell = New-Object -comObject WScript.Shell
                $Shortcut = $WshShell.CreateShortcut("{shortcut_path}")
                $Shortcut.TargetPath = "{batch_file}"
                $Shortcut.WorkingDirectory = "{self.install_path}"
                $Shortcut.Save()
            '''
            subprocess.run(['powershell', '-Command', ps_command], check=False)
        except Exception as e:
            print(f"Failed to create shortcut: {e}")
    
    def completion_step(self):
        """Installation completion screen"""
        # Success icon
        icon_label = tk.Label(
            self.content_frame,
            text="\u2705",
            font=('Segoe UI', 38),
            bg='white'
        )
        icon_label.pack(pady=(12, 5))
        
        title = tk.Label(
            self.content_frame,
            text="Installation Complete!",
            font=('Segoe UI', 15, 'bold'),
            bg='white',
            fg='#10b981'
        )
        title.pack(pady=(0, 5))
        
        subtitle = tk.Label(
            self.content_frame,
            text="Your gym management system is ready to use",
            font=('Segoe UI', 9),
            bg='white',
            fg='#64748b'
        )
        subtitle.pack(pady=(0, 10))
        
        shortcut_text = "• Desktop shortcut created\n" if self.shortcut_var.get() else ""
        info = tk.Label(
            self.content_frame,
            text=f"""
\ud83d\udcc1 Installation Location:
{self.install_path}

\u2713 What's installed:
• mfkvfvfg Application
• Database Configuration
• {shortcut_text if shortcut_text else ''}Business Branding

\ud83d\ude80 Next Steps:
1. Click 'Launch' to start the application
2. Login with your credentials
3. Start managing your gym!
            """,
            font=('Segoe UI', 8),
            bg='white',
            fg='#475569',
            justify=tk.LEFT
        )
        info.pack(pady=6)
        
        finish_btn = tk.Button(
            self.content_frame,
            text="\ud83d\ude80  Launch Application",
            font=('Segoe UI', 9, 'bold'),
            bg='#2563eb',
            fg='white',
            relief='flat',
            padx=22,
            pady=7,
            cursor='hand2',
            command=self.launch_and_exit
        )
        finish_btn.pack(pady=8)
        
        close_btn = tk.Button(
            self.content_frame,
            text="Close Installer",
            font=('Segoe UI', 8),
            bg='#f1f5f9',
            fg='#64748b',
            relief='flat',
            padx=18,
            pady=6,
            cursor='hand2',
            command=self.root.quit
        )
        close_btn.pack(pady=4)
    
    def launch_and_exit(self):
        """Launch the application and exit installer"""
        try:
            app_file = os.path.join(self.install_path, 'gfbgb_app.py')
            
            if not os.path.exists(app_file):
                messagebox.showerror("Launch Error", f"Application file not found: {app_file}")
                return
            
            # Launch the application
            if sys.platform == 'win32':
                # Windows: Use pythonw.exe to launch without console
                python_exe = sys.executable
                pythonw_exe = python_exe.replace('python.exe', 'pythonw.exe')
                if os.path.exists(pythonw_exe):
                    python_exe = pythonw_exe
                
                subprocess.Popen(
                    [python_exe, app_file],
                    cwd=self.install_path,
                    shell=False
                )
            else:
                # Unix-like systems
                subprocess.Popen(
                    [sys.executable, app_file],
                    cwd=self.install_path
                )
            
            # Give the app a moment to start
            self.root.after(500, self.root.quit)
            
        except Exception as e:
            messagebox.showerror("Launch Error", f"Failed to launch application:\n{str(e)}")
    
    def run(self):
        """Start the installer"""
        self.root.mainloop()


if __name__ == '__main__':
    import time  # Import at top level for installer
    installer = InstallationWizard()
    installer.run()
