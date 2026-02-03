"""
ZORO9X Restaurant Management System - Installation Wizard
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
        self.root.title("ZORO9X Restaurant Management System - Installation Wizard")
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
        
        self.install_path = str(Path.home() / 'ZORO9X' / 'RestaurantManagementSystem')
        self.create_desktop_shortcut = True
        
        # Load business config
        self.business_config = self.load_business_config()
        self.api_key = self.business_config.get('api_key', '')
        self.company_name = self.business_config.get('business_details', {}).get('name', '')
        self.database_name = self.business_config.get('database_config', {}).get('database_name', 'restaurant_management_database')
        
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
        """Create main UI structure"""
        # Header
        header = tk.Frame(self.root, bg='#2563eb', height=70)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        
        tk.Label(
            header,
            text="🚀 Restaurant Management System",
            font=('Segoe UI', 18, 'bold'),
            bg='#2563eb',
            fg='white'
        ).pack(pady=20)
        
        # Content frame
        self.content_frame = tk.Frame(self.root, bg='white')
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=0, pady=0)
        
        # Footer
        self.footer = tk.Frame(self.root, bg='#f5f7fa', height=60)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer.pack_propagate(False)
        
        # Navigation buttons
        button_frame = tk.Frame(self.footer, bg='#f5f7fa')
        button_frame.pack(expand=True)
        
        self.back_button = tk.Button(
            button_frame,
            text="← Back",
            font=('Segoe UI', 10),
            bg='#e5e7eb',
            fg='#374151',
            width=12,
            height=1,
            relief='flat',
            cursor='hand2',
            command=self.previous_step
        )
        self.back_button.pack(side=tk.LEFT, padx=5)
        
        self.next_button = tk.Button(
            button_frame,
            text="Next →",
            font=('Segoe UI', 10, 'bold'),
            bg='#2563eb',
            fg='white',
            activebackground='#1d4ed8',
            width=12,
            height=1,
            relief='flat',
            cursor='hand2',
            command=self.next_step
        )
        self.next_button.pack(side=tk.LEFT, padx=5)
    
    def clear_content(self):
        """Clear content frame"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def welcome_step(self):
        """Step 1: Welcome screen with features"""
        self.clear_content()
        
        # Create scrollable frame
        canvas = tk.Canvas(self.content_frame, bg='white', highlightthickness=0)
        scrollbar = tk.Scrollbar(self.content_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='white')
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Bind mouse wheel
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Welcome content
        tk.Label(
            scrollable_frame,
            text="Welcome to Restaurant Management System!",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(pady=(20, 5))
        
        tk.Label(
            scrollable_frame,
            text="PREMIUM Edition",
            font=('Segoe UI', 11),
            bg='white',
            fg='#64748b'
        ).pack(pady=(0, 15))
        
        # Features list
        features_frame = tk.Frame(scrollable_frame, bg='white')
        features_frame.pack(pady=10, padx=30, fill=tk.X)
        
        tk.Label(
            features_frame,
            text="Features Included:",
            font=('Segoe UI', 11, 'bold'),
            bg='white',
            fg='#1e293b',
            anchor='w'
        ).pack(anchor='w', pady=(0, 10))
        
        features = [
            ("✨", "Dashboard", "Feature included in premium plan"),
            ("✨", "Advanced Analytics", "Feature included in premium plan"),
            ("✨", "Custom Reports", "Feature included in premium plan"),
            ("✨", "f3", "Feature included in premium plan")
        ]
        
        for icon, title, desc in features:
            feature_row = tk.Frame(features_frame, bg='white')
            feature_row.pack(fill=tk.X, pady=4)
            
            tk.Label(
                feature_row,
                text=icon,
                font=('Segoe UI', 12),
                bg='white',
                width=2
            ).pack(side=tk.LEFT, padx=(0, 10))
            
            text_frame = tk.Frame(feature_row, bg='white')
            text_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            tk.Label(
                text_frame,
                text=title,
                font=('Segoe UI', 9, 'bold'),
                bg='white',
                fg='#1e293b',
                anchor='w'
            ).pack(anchor='w')
            
            tk.Label(
                text_frame,
                text=desc,
                font=('Segoe UI', 8),
                bg='white',
                fg='#64748b',
                anchor='w'
            ).pack(anchor='w')
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.NORMAL, text="Next →")
    
    def license_agreement_step(self):
        """Step 2: License agreement"""
        self.clear_content()
        
        tk.Label(
            self.content_frame,
            text="License Agreement",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(pady=(20, 10))
        
        text_frame = tk.Frame(self.content_frame, bg='white')
        text_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=10)
        
        scrollbar = tk.Scrollbar(text_frame)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        license_text = tk.Text(
            text_frame,
            wrap=tk.WORD,
            font=('Segoe UI', 9),
            bg='#f8fafc',
            fg='#334155',
            relief='flat',
            padx=15,
            pady=15,
            yscrollcommand=scrollbar.set
        )
        license_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=license_text.yview)
        
        license_content = """End User License Agreement (EULA)

1. Grant of License
ZORO9X grants you a non-exclusive license to use Restaurant Management System.

2. Restrictions
You may not modify, reverse engineer, or distribute this software.

3. Support
Support is provided based on your subscription plan.

4. Termination
This license is valid for the duration of your subscription.

By proceeding, you agree to these terms."""
        
        license_text.insert('1.0', license_content)
        license_text.config(state=tk.DISABLED)
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="I Agree →")
    
    def configuration_step(self):
        """Step 3: Configuration - show business details (non-editable)"""
        self.clear_content()
        
        # Create scrollable frame
        canvas = tk.Canvas(self.content_frame, bg='white', highlightthickness=0)
        scrollbar = tk.Scrollbar(self.content_frame, orient="vertical", command=canvas.yview)
        scrollable_frame = tk.Frame(canvas, bg='white')
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw")
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Bind mouse wheel for scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        tk.Label(
            scrollable_frame,
            text="System Configuration",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(pady=(20, 15))
        
        config_frame = tk.Frame(scrollable_frame, bg='white')
        config_frame.pack(padx=40, pady=10, fill=tk.BOTH, expand=True)
        
        # Business Name (Display only)
        tk.Label(
            config_frame,
            text="Business Name:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#475569',
            anchor='w'
        ).pack(anchor='w', pady=(5, 2))
        
        tk.Label(
            config_frame,
            text=self.company_name or "Not configured",
            font=('Segoe UI', 11),
            bg='#f1f5f9',
            fg='#1e293b',
            anchor='w',
            padx=12,
            pady=8,
            relief='flat'
        ).pack(fill=tk.X, pady=(0, 10))
        
        # Database Name (Display only)
        tk.Label(
            config_frame,
            text="Database Name:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#475569',
            anchor='w'
        ).pack(anchor='w', pady=(5, 2))
        
        tk.Label(
            config_frame,
            text=self.database_name,
            font=('Segoe UI', 11),
            bg='#f1f5f9',
            fg='#1e293b',
            anchor='w',
            padx=12,
            pady=8,
            relief='flat'
        ).pack(fill=tk.X, pady=(0, 10))
        
        # API Key (Display only, masked)
        tk.Label(
            config_frame,
            text="API Key:",
            font=('Segoe UI', 10, 'bold'),
            bg='white',
            fg='#475569',
            anchor='w'
        ).pack(anchor='w', pady=(5, 2))
        
        api_display = self.api_key[:8] + "..." + self.api_key[-8:] if len(self.api_key) > 16 else self.api_key
        tk.Label(
            config_frame,
            text=api_display if self.api_key else "Not configured",
            font=('Segoe UI', 10, 'italic'),
            bg='#f1f5f9',
            fg='#64748b',
            anchor='w',
            padx=12,
            pady=8,
            relief='flat'
        ).pack(fill=tk.X, pady=(0, 15))
        
        # Info message
        tk.Label(
            config_frame,
            text="ℹ️ These settings are pre-configured from your subscription.",
            font=('Segoe UI', 9),
            bg='#dbeafe',
            fg='#1e40af',
            anchor='w',
            padx=12,
            pady=8,
            wraplength=500,
            justify='left'
        ).pack(fill=tk.X, pady=(10, 0))
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Next →")
    
    def installation_location_step(self):
        """Step 4: Choose installation location"""
        self.clear_content()
        
        tk.Label(
            self.content_frame,
            text="Installation Location",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(pady=(30, 20))
        
        path_frame = tk.Frame(self.content_frame, bg='white')
        path_frame.pack(padx=40, fill=tk.X)
        
        tk.Label(
            path_frame,
            text="Install to:",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        ).pack(anchor='w', pady=(0, 5))
        
        self.path_entry = tk.Entry(
            path_frame,
            font=('Segoe UI', 10),
            bg='#f1f5f9',
            fg='#1e293b',
            relief='flat'
        )
        self.path_entry.insert(0, self.install_path)
        self.path_entry.pack(fill=tk.X, ipady=8, pady=5)
        
        # Shortcut checkbox
        self.shortcut_var = tk.BooleanVar(value=self.create_desktop_shortcut)
        tk.Checkbutton(
            self.content_frame,
            text="Create desktop shortcut",
            variable=self.shortcut_var,
            font=('Segoe UI', 10),
            bg='white',
            fg='#475569',
            activebackground='white',
            selectcolor='white'
        ).pack(pady=20)
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Install →")
    
    def installing_step(self):
        """Step 5: Installation progress"""
        # Save values before clearing content (widgets will be destroyed)
        self.install_path = self.path_entry.get()
        self.create_desktop_shortcut = self.shortcut_var.get()
        self.clear_content()
        
        tk.Label(
            self.content_frame,
            text="Installing...",
            font=('Segoe UI', 14, 'bold'),
            bg='white',
            fg='#1e293b'
        ).pack(pady=(40, 20))
        
        self.progress_label = tk.Label(
            self.content_frame,
            text="Preparing installation...",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        )
        self.progress_label.pack(pady=10)
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.DISABLED)
        
        self.root.after(100, self.perform_installation)
    
    def perform_installation(self):
        """Actually install the system"""
        import time
        
        steps = [
            "Creating installation directory...",
            "Copying application files...",
            "Copying business assets...",
            "Installing dependencies...",
            "Creating database...",
            "Saving configuration...",
            "Creating desktop shortcut..."
        ]
        
        try:
            for step_text in steps:
                self.progress_label.config(text=step_text)
                self.root.update()
                
                if "Creating installation" in step_text:
                    os.makedirs(self.install_path, exist_ok=True)
                
                elif "Copying application" in step_text:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    for file in ['restaurant_management_app.py', 'requirements.txt', 'README.md']:
                        src = os.path.join(script_dir, file)
                        if os.path.exists(src):
                            shutil.copy(src, self.install_path)
                
                elif "Copying business assets" in step_text:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    for ext in ['png', 'jpg', 'jpeg', 'gif']:
                        logo_file = os.path.join(script_dir, f'logo.{ext}')
                        if os.path.exists(logo_file):
                            shutil.copy(logo_file, self.install_path)
                            break
                    business_config = os.path.join(script_dir, 'business_config.json')
                    if os.path.exists(business_config):
                        shutil.copy(business_config, self.install_path)
                
                elif "Installing dependencies" in step_text:
                    requirements_file = os.path.join(self.install_path, 'requirements.txt')
                    if os.path.exists(requirements_file):
                        subprocess.run(
                            [sys.executable, '-m', 'pip', 'install', '-r', requirements_file, '--quiet'],
                            check=True
                        )
                
                elif "Creating database" in step_text:
                    pass  # Database created on first app run
                
                elif "Saving configuration" in step_text:
                    config = {
                        'api_key': self.api_key,
                        'company_name': self.company_name,
                        'database_name': self.database_name,
                        'database_path': f'{self.database_name}.db'
                    }
                    config_path = os.path.join(self.install_path, 'restaurant_management_config.json')
                    with open(config_path, 'w') as f:
                        json.dump(config, f, indent=2)
                
                elif "Creating desktop shortcut" in step_text:
                    if sys.platform == 'win32' and self.shortcut_var.get():
                        self.create_shortcut()
                
                time.sleep(0.3)
            
            self.current_step += 1
            self.show_current_step()
            
        except Exception as e:
            messagebox.showerror("Installation Error", f"Failed to install: {str(e)}")
            self.root.quit()
    
    def create_shortcut(self):
        """Create desktop shortcut (Windows only)"""
        try:
            from win32com.client import Dispatch
            desktop = Path.home() / 'Desktop'
            shortcut_path = desktop / f'Restaurant Management System.lnk'
            
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(str(shortcut_path))
            shortcut.Targetpath = sys.executable
            shortcut.Arguments = f'"{self.install_path}/restaurant_management_app.py"'
            shortcut.WorkingDirectory = self.install_path
            shortcut.IconLocation = sys.executable
            shortcut.save()
        except:
            pass  # Silently fail if shortcut creation fails
    
    def completion_step(self):
        """Step 6: Installation complete"""
        self.clear_content()
        
        tk.Label(
            self.content_frame,
            text="✅",
            font=('Segoe UI', 48),
            bg='white'
        ).pack(pady=(30, 10))
        
        tk.Label(
            self.content_frame,
            text="Installation Complete!",
            font=('Segoe UI', 16, 'bold'),
            bg='white',
            fg='#059669'
        ).pack(pady=(0, 10))
        
        tk.Label(
            self.content_frame,
            text="Restaurant Management System has been successfully installed.",
            font=('Segoe UI', 10),
            bg='white',
            fg='#64748b'
        ).pack(pady=5)
        
        tk.Label(
            self.content_frame,
            text=f"Location: {self.install_path}",
            font=('Segoe UI', 9),
            bg='white',
            fg='#94a3b8'
        ).pack(pady=5)
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(text="Launch →", state=tk.NORMAL, command=self.launch_application)
    
    def launch_application(self):
        """Launch the installed application"""
        try:
            app_path = os.path.join(self.install_path, 'restaurant_management_app.py')
            subprocess.Popen([sys.executable, app_path], cwd=self.install_path)
            self.root.quit()
        except Exception as e:
            messagebox.showerror("Launch Error", f"Failed to launch application: {str(e)}")
            self.root.quit()
    
    def show_current_step(self):
        """Display current installation step"""
        if 0 <= self.current_step < len(self.steps):
            self.steps[self.current_step]()
    
    def next_step(self):
        """Go to next step"""
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.show_current_step()
    
    def previous_step(self):
        """Go to previous step"""
        if self.current_step > 0:
            self.current_step -= 1
            self.show_current_step()
    
    def run(self):
        """Start the installation wizard"""
        self.root.mainloop()

if __name__ == '__main__':
    wizard = InstallationWizard()
    wizard.run()
