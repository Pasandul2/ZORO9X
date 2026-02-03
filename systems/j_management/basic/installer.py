"""
ZORO9X jmk - Installation Wizard
"""

import tkinter as tk
from tkinter import messagebox, ttk
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
        self.root.title("ZORO9X jmk - Installation")
        self.root.geometry("900x650")
        self.root.configure(bg='#ffffff')
        self.root.resizable(False, False)
        
        # Modern styling
        self.colors = {
            'primary': '#4F46E5',
            'primary_hover': '#4338CA',
            'secondary': '#10B981',
            'background': '#F9FAFB',
            'card_bg': '#FFFFFF',
            'text_primary': '#111827',
            'text_secondary': '#6B7280',
            'text_muted': '#9CA3AF',
            'border': '#E5E7EB',
            'success': '#10B981',
            'info': '#3B82F6'
        }
        
        self.current_step = 0
        self.steps = [
            self.welcome_step,
            self.license_agreement_step,
            self.configuration_step,
            self.installation_location_step,
            self.installing_step,
            self.completion_step
        ]
        
        self.install_path = str(Path.home() / 'ZORO9X' / 'jmk')
        self.create_desktop_shortcut = True
        
        # Load business config
        self.business_config = self.load_business_config()
        self.api_key = self.business_config.get('api_key', '')
        self.company_name = self.business_config.get('business_details', {}).get('name', '')
        self.database_name = self.business_config.get('database_config', {}).get('database_name', 'j_database')
        
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
        """Create main UI structure with modern design"""
        # Header with gradient effect (simulated)
        header = tk.Frame(self.root, bg=self.colors['primary'], height=120)
        header.pack(fill=tk.X)
        header.pack_propagate(False)
        
        # Logo/Icon placeholder
        icon_label = tk.Label(
            header,
            text="🚀",
            font=('Segoe UI', 36),
            bg=self.colors['primary'],
            fg='white'
        )
        icon_label.pack(pady=(15, 5))
        
        # Title
        tk.Label(
            header,
            text="jmk",
            font=('Segoe UI', 20, 'bold'),
            bg=self.colors['primary'],
            fg='white'
        ).pack()
        
        # Subtitle
        tk.Label(
            header,
            text="BASIC Edition - Installation Wizard",
            font=('Segoe UI', 10),
            bg=self.colors['primary'],
            fg='#E0E7FF'
        ).pack(pady=(0, 10))
        
        # Main container with shadow effect
        main_container = tk.Frame(self.root, bg=self.colors['background'])
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Content area with padding
        content_wrapper = tk.Frame(main_container, bg=self.colors['background'])
        content_wrapper.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Content frame (white card)
        self.content_frame = tk.Frame(
            content_wrapper,
            bg=self.colors['card_bg'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        self.content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Footer with modern button styling
        self.footer = tk.Frame(self.root, bg=self.colors['background'], height=80)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer.pack_propagate(False)
        
        # Progress indicator
        self.progress_container = tk.Frame(self.footer, bg=self.colors['background'])
        self.progress_container.pack(side=tk.TOP, fill=tk.X, padx=40, pady=(10, 5))
        
        self.progress_dots = []
        dots_frame = tk.Frame(self.progress_container, bg=self.colors['background'])
        dots_frame.pack()
        
        for i in range(6):
            dot = tk.Label(
                dots_frame,
                text="●",
                font=('Segoe UI', 8),
                bg=self.colors['background'],
                fg=self.colors['border']
            )
            dot.pack(side=tk.LEFT, padx=3)
            self.progress_dots.append(dot)
        
        # Navigation buttons
        button_frame = tk.Frame(self.footer, bg=self.colors['background'])
        button_frame.pack(pady=(0, 15))
        
        self.back_button = tk.Button(
            button_frame,
            text="← Back",
            font=('Segoe UI', 10),
            bg='#F3F4F6',
            fg=self.colors['text_primary'],
            activebackground='#E5E7EB',
            activeforeground=self.colors['text_primary'],
            width=15,
            height=2,
            relief='flat',
            cursor='hand2',
            bd=0,
            command=self.previous_step
        )
        self.back_button.pack(side=tk.LEFT, padx=8)
        
        self.next_button = tk.Button(
            button_frame,
            text="Next →",
            font=('Segoe UI', 10, 'bold'),
            bg=self.colors['primary'],
            fg='white',
            activebackground=self.colors['primary_hover'],
            activeforeground='white',
            width=15,
            height=2,
            relief='flat',
            cursor='hand2',
            bd=0,
            command=self.next_step
        )
        self.next_button.pack(side=tk.LEFT, padx=8)
    
    def update_progress(self):
        """Update progress indicator"""
        for i, dot in enumerate(self.progress_dots):
            if i < self.current_step:
                dot.config(fg=self.colors['success'])
            elif i == self.current_step:
                dot.config(fg=self.colors['primary'])
            else:
                dot.config(fg=self.colors['border'])
    
    def clear_content(self):
        """Clear content frame"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def welcome_step(self):
        """Step 1: Welcome screen with modern feature cards"""
        self.clear_content()
        self.update_progress()
        
        # Scrollable container
        canvas = tk.Canvas(
            self.content_frame,
            bg=self.colors['card_bg'],
            highlightthickness=0,
            bd=0
        )
        scrollbar = tk.Scrollbar(
            self.content_frame,
            orient="vertical",
            command=canvas.yview,
            width=12
        )
        scrollable_frame = tk.Frame(canvas, bg=self.colors['card_bg'])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=780)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Mouse wheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Welcome header
        header_frame = tk.Frame(scrollable_frame, bg=self.colors['card_bg'])
        header_frame.pack(pady=(40, 10), padx=50, fill=tk.X)
        
        tk.Label(
            header_frame,
            text="Welcome!",
            font=('Segoe UI', 24, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack(anchor='w')
        
        tk.Label(
            header_frame,
            text="Let's get your jmk system set up in just a few steps.",
            font=('Segoe UI', 11),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary'],
            wraplength=700,
            justify='left'
        ).pack(anchor='w', pady=(5, 0))
        
        # Features section
        tk.Label(
            scrollable_frame,
            text="What's Included",
            font=('Segoe UI', 14, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack(anchor='w', padx=50, pady=(30, 15))
        
        features_container = tk.Frame(scrollable_frame, bg=self.colors['card_bg'])
        features_container.pack(pady=0, padx=50, fill=tk.X)
        
        features = [
            ("✨", "Dashboard", "Feature included in basic plan")
        ]
        
        for icon, title, desc in features:
            # Feature card
            feature_card = tk.Frame(
                features_container,
                bg=self.colors['background'],
                highlightbackground=self.colors['border'],
                highlightthickness=1
            )
            feature_card.pack(fill=tk.X, pady=6)
            
            inner_frame = tk.Frame(feature_card, bg=self.colors['background'])
            inner_frame.pack(fill=tk.X, padx=20, pady=15)
            
            # Icon
            tk.Label(
                inner_frame,
                text=icon,
                font=('Segoe UI', 18),
                bg=self.colors['background'],
                width=2
            ).pack(side=tk.LEFT, padx=(0, 15))
            
            # Text content
            text_container = tk.Frame(inner_frame, bg=self.colors['background'])
            text_container.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            tk.Label(
                text_container,
                text=title,
                font=('Segoe UI', 11, 'bold'),
                bg=self.colors['background'],
                fg=self.colors['text_primary'],
                anchor='w'
            ).pack(anchor='w', fill=tk.X)
            
            tk.Label(
                text_container,
                text=desc,
                font=('Segoe UI', 9),
                bg=self.colors['background'],
                fg=self.colors['text_secondary'],
                anchor='w'
            ).pack(anchor='w', fill=tk.X, pady=(3, 0))
        
        # Bottom spacing
        tk.Frame(scrollable_frame, bg=self.colors['card_bg'], height=40).pack()
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.NORMAL, text="Next →")
    
    def license_agreement_step(self):
        """Step 2: License agreement with modern styling"""
        self.clear_content()
        self.update_progress()
        
        # Header
        header_frame = tk.Frame(self.content_frame, bg=self.colors['card_bg'])
        header_frame.pack(pady=(40, 20), padx=50, fill=tk.X)
        
        tk.Label(
            header_frame,
            text="License Agreement",
            font=('Segoe UI', 20, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack(anchor='w')
        
        tk.Label(
            header_frame,
            text="Please review the terms and conditions",
            font=('Segoe UI', 10),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary']
        ).pack(anchor='w', pady=(5, 0))
        
        # License text container
        text_container = tk.Frame(
            self.content_frame,
            bg=self.colors['card_bg'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        text_container.pack(fill=tk.BOTH, expand=True, padx=50, pady=(0, 30))
        
        scrollbar = tk.Scrollbar(text_container, width=12)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        license_text = tk.Text(
            text_container,
            wrap=tk.WORD,
            font=('Segoe UI', 9),
            bg=self.colors['background'],
            fg=self.colors['text_primary'],
            relief='flat',
            padx=25,
            pady=20,
            spacing1=2,
            spacing2=1,
            spacing3=2,
            bd=0,
            yscrollcommand=scrollbar.set
        )
        license_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=license_text.yview)
        
        license_content = """End User License Agreement (EULA)

1. Grant of License
ZORO9X grants you a non-exclusive license to use jmk.

2. Restrictions
You may not modify, reverse engineer, or distribute this software.

3. Support
Support is provided based on your subscription plan.

4. Termination
This license is valid for the duration of your subscription.

By proceeding, you agree to these terms and conditions."""
        
        license_text.insert('1.0', license_content)
        license_text.config(state=tk.DISABLED)
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="I Agree →")
    
    def configuration_step(self):
        """Step 3: Configuration with modern card design"""
        self.clear_content()
        self.update_progress()
        
        # Scrollable container
        canvas = tk.Canvas(
            self.content_frame,
            bg=self.colors['card_bg'],
            highlightthickness=0,
            bd=0
        )
        scrollbar = tk.Scrollbar(
            self.content_frame,
            orient="vertical",
            command=canvas.yview,
            width=12
        )
        scrollable_frame = tk.Frame(canvas, bg=self.colors['card_bg'])
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )
        
        canvas.create_window((0, 0), window=scrollable_frame, anchor="nw", width=780)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Mouse wheel
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        # Header
        header_frame = tk.Frame(scrollable_frame, bg=self.colors['card_bg'])
        header_frame.pack(pady=(40, 20), padx=50, fill=tk.X)
        
        tk.Label(
            header_frame,
            text="System Configuration",
            font=('Segoe UI', 20, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack(anchor='w')
        
        tk.Label(
            header_frame,
            text="Your pre-configured settings",
            font=('Segoe UI', 10),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary']
        ).pack(anchor='w', pady=(5, 0))
        
        # Configuration cards
        config_container = tk.Frame(scrollable_frame, bg=self.colors['card_bg'])
        config_container.pack(padx=50, pady=10, fill=tk.X)
        
        # Business Name Card
        self.create_config_card(
            config_container,
            "🏢",
            "Business Name",
            self.company_name or "Not configured"
        )
        
        # Database Name Card
        self.create_config_card(
            config_container,
            "🗄️",
            "Database Name",
            self.database_name
        )
        
        # API Key Card
        api_display = self.api_key[:12] + "..." + self.api_key[-12:] if len(self.api_key) > 24 else self.api_key
        self.create_config_card(
            config_container,
            "🔑",
            "API Key",
            api_display if self.api_key else "Not configured",
            is_sensitive=True
        )
        
        # Info banner
        info_banner = tk.Frame(
            scrollable_frame,
            bg='#EFF6FF',
            highlightbackground='#DBEAFE',
            highlightthickness=1
        )
        info_banner.pack(padx=50, pady=20, fill=tk.X)
        
        info_content = tk.Frame(info_banner, bg='#EFF6FF')
        info_content.pack(padx=20, pady=15, fill=tk.X)
        
        tk.Label(
            info_content,
            text="ℹ️",
            font=('Segoe UI', 16),
            bg='#EFF6FF',
            fg='#3B82F6'
        ).pack(side=tk.LEFT, padx=(0, 12))
        
        tk.Label(
            info_content,
            text="These settings are pre-configured from your ZORO9X subscription and cannot be changed during installation.",
            font=('Segoe UI', 9),
            bg='#EFF6FF',
            fg='#1E40AF',
            wraplength=600,
            justify='left'
        ).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        # Bottom spacing
        tk.Frame(scrollable_frame, bg=self.colors['card_bg'], height=40).pack()
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Next →")
    
    def create_config_card(self, parent, icon, label, value, is_sensitive=False):
        """Create a modern configuration display card"""
        card = tk.Frame(
            parent,
            bg=self.colors['background'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        card.pack(fill=tk.X, pady=8)
        
        inner = tk.Frame(card, bg=self.colors['background'])
        inner.pack(fill=tk.X, padx=20, pady=18)
        
        # Icon
        tk.Label(
            inner,
            text=icon,
            font=('Segoe UI', 20),
            bg=self.colors['background']
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        # Text content
        text_frame = tk.Frame(inner, bg=self.colors['background'])
        text_frame.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        tk.Label(
            text_frame,
            text=label,
            font=('Segoe UI', 9),
            bg=self.colors['background'],
            fg=self.colors['text_muted'],
            anchor='w'
        ).pack(anchor='w', fill=tk.X)
        
        tk.Label(
            text_frame,
            text=value,
            font=('Courier New', 10, 'bold') if is_sensitive else ('Segoe UI', 11, 'bold'),
            bg=self.colors['background'],
            fg=self.colors['text_primary'],
            anchor='w'
        ).pack(anchor='w', fill=tk.X, pady=(3, 0))
    
    def installation_location_step(self):
        """Step 4: Choose installation location with modern styling"""
        self.clear_content()
        self.update_progress()
        
        # Header
        header_frame = tk.Frame(self.content_frame, bg=self.colors['card_bg'])
        header_frame.pack(pady=(40, 30), padx=50, fill=tk.X)
        
        tk.Label(
            header_frame,
            text="Installation Location",
            font=('Segoe UI', 20, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack(anchor='w')
        
        tk.Label(
            header_frame,
            text="Choose where to install jmk",
            font=('Segoe UI', 10),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary']
        ).pack(anchor='w', pady=(5, 0))
        
        # Path selection card
        path_card = tk.Frame(
            self.content_frame,
            bg=self.colors['background'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        path_card.pack(padx=50, pady=10, fill=tk.X)
        
        path_inner = tk.Frame(path_card, bg=self.colors['background'])
        path_inner.pack(padx=25, pady=20, fill=tk.X)
        
        tk.Label(
            path_inner,
            text="📁",
            font=('Segoe UI', 20),
            bg=self.colors['background']
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        path_content = tk.Frame(path_inner, bg=self.colors['background'])
        path_content.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        tk.Label(
            path_content,
            text="Destination Folder",
            font=('Segoe UI', 9),
            bg=self.colors['background'],
            fg=self.colors['text_muted'],
            anchor='w'
        ).pack(anchor='w')
        
        self.path_entry = tk.Entry(
            path_content,
            font=('Segoe UI', 10),
            bg='white',
            fg=self.colors['text_primary'],
            relief='solid',
            bd=1,
            highlightthickness=0
        )
        self.path_entry.insert(0, self.install_path)
        self.path_entry.pack(fill=tk.X, ipady=8, pady=(8, 0))
        
        # Options card
        options_card = tk.Frame(
            self.content_frame,
            bg=self.colors['background'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        options_card.pack(padx=50, pady=20, fill=tk.X)
        
        options_inner = tk.Frame(options_card, bg=self.colors['background'])
        options_inner.pack(padx=25, pady=20, fill=tk.X)
        
        tk.Label(
            options_inner,
            text="⚙️",
            font=('Segoe UI', 20),
            bg=self.colors['background']
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        options_content = tk.Frame(options_inner, bg=self.colors['background'])
        options_content.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        tk.Label(
            options_content,
            text="Installation Options",
            font=('Segoe UI', 9),
            bg=self.colors['background'],
            fg=self.colors['text_muted'],
            anchor='w'
        ).pack(anchor='w')
        
        # Checkbox
        self.shortcut_var = tk.BooleanVar(value=self.create_desktop_shortcut)
        checkbox_frame = tk.Frame(options_content, bg=self.colors['background'])
        checkbox_frame.pack(anchor='w', pady=(8, 0))
        
        tk.Checkbutton(
            checkbox_frame,
            text="Create desktop shortcut",
            variable=self.shortcut_var,
            font=('Segoe UI', 10),
            bg=self.colors['background'],
            fg=self.colors['text_primary'],
            activebackground=self.colors['background'],
            selectcolor='white',
            cursor='hand2'
        ).pack(side=tk.LEFT)
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Install →")
    
    def installing_step(self):
        """Step 5: Installation progress with modern animation"""
        self.clear_content()
        self.update_progress()
        self.install_path = self.path_entry.get()
        
        # Center content
        center_frame = tk.Frame(self.content_frame, bg=self.colors['card_bg'])
        center_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        # Animated icon (simulated)
        self.install_icon = tk.Label(
            center_frame,
            text="⚡",
            font=('Segoe UI', 48),
            bg=self.colors['card_bg'],
            fg=self.colors['primary']
        )
        self.install_icon.pack(pady=(0, 20))
        
        tk.Label(
            center_frame,
            text="Installing...",
            font=('Segoe UI', 18, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['text_primary']
        ).pack()
        
        self.progress_label = tk.Label(
            center_frame,
            text="Preparing installation...",
            font=('Segoe UI', 10),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary']
        )
        self.progress_label.pack(pady=(10, 0))
        
        # Progress bar
        self.progress_bar_frame = tk.Frame(
            center_frame,
            bg=self.colors['border'],
            height=4,
            width=300
        )
        self.progress_bar_frame.pack(pady=20)
        
        self.progress_bar = tk.Frame(
            self.progress_bar_frame,
            bg=self.colors['primary'],
            height=4,
            width=0
        )
        self.progress_bar.place(x=0, y=0)
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.DISABLED)
        
        self.root.after(100, self.perform_installation)
    
    def perform_installation(self):
        """Actually install the system with progress updates"""
        import time
        
        steps = [
            ("Creating installation directory...", 0),
            ("Copying application files...", 20),
            ("Copying business assets...", 40),
            ("Installing dependencies...", 60),
            ("Creating database...", 75),
            ("Saving configuration...", 85),
            ("Creating desktop shortcut...", 95)
        ]
        
        try:
            for step_text, progress in steps:
                self.progress_label.config(text=step_text)
                self.progress_bar.config(width=int(300 * progress / 100))
                self.root.update()
                
                if "Creating installation" in step_text:
                    os.makedirs(self.install_path, exist_ok=True)
                
                elif "Copying application" in step_text:
                    script_dir = os.path.dirname(os.path.abspath(__file__))
                    for file in ['j_app.py', 'requirements.txt', 'README.md']:
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
                    config_path = os.path.join(self.install_path, 'j_config.json')
                    with open(config_path, 'w') as f:
                        json.dump(config, f, indent=2)
                
                elif "Creating desktop shortcut" in step_text:
                    if sys.platform == 'win32' and self.shortcut_var.get():
                        self.create_shortcut()
                
                time.sleep(0.4)
            
            # Final progress
            self.progress_bar.config(width=300)
            self.root.update()
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
            shortcut_path = desktop / f'jmk.lnk'
            
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(str(shortcut_path))
            shortcut.Targetpath = sys.executable
            shortcut.Arguments = f'"{self.install_path}/j_app.py"'
            shortcut.WorkingDirectory = self.install_path
            shortcut.IconLocation = sys.executable
            shortcut.save()
        except:
            pass  # Silently fail if shortcut creation fails
    
    def completion_step(self):
        """Step 6: Installation complete with modern success design"""
        self.clear_content()
        self.update_progress()
        
        # Center content
        center_frame = tk.Frame(self.content_frame, bg=self.colors['card_bg'])
        center_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        # Success icon
        tk.Label(
            center_frame,
            text="✅",
            font=('Segoe UI', 64),
            bg=self.colors['card_bg']
        ).pack(pady=(0, 20))
        
        # Success message
        tk.Label(
            center_frame,
            text="Installation Complete!",
            font=('Segoe UI', 22, 'bold'),
            bg=self.colors['card_bg'],
            fg=self.colors['success']
        ).pack()
        
        tk.Label(
            center_frame,
            text="jmk has been successfully installed on your system.",
            font=('Segoe UI', 10),
            bg=self.colors['card_bg'],
            fg=self.colors['text_secondary'],
            wraplength=500,
            justify='center'
        ).pack(pady=(15, 5))
        
        # Installation details card
        details_card = tk.Frame(
            center_frame,
            bg=self.colors['background'],
            highlightbackground=self.colors['border'],
            highlightthickness=1
        )
        details_card.pack(pady=25, padx=30)
        
        details_inner = tk.Frame(details_card, bg=self.colors['background'])
        details_inner.pack(padx=30, pady=20)
        
        tk.Label(
            details_inner,
            text="📍 Installed to:",
            font=('Segoe UI', 9),
            bg=self.colors['background'],
            fg=self.colors['text_muted']
        ).pack()
        
        tk.Label(
            details_inner,
            text=self.install_path,
            font=('Segoe UI', 9, 'bold'),
            bg=self.colors['background'],
            fg=self.colors['text_primary'],
            wraplength=500
        ).pack(pady=(5, 0))
        
        # Launch info
        tk.Label(
            center_frame,
            text="Click 'Launch' to start using jmk now.",
            font=('Segoe UI', 9),
            bg=self.colors['card_bg'],
            fg=self.colors['text_muted']
        ).pack(pady=(10, 0))
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(text="Launch →", state=tk.NORMAL, command=self.launch_application)
    
    def launch_application(self):
        """Launch the installed application"""
        try:
            app_path = os.path.join(self.install_path, 'j_app.py')
            subprocess.Popen([sys.executable, app_path], cwd=self.install_path)
            self.root.quit()
        except Exception as e:
            messagebox.showerror("Launch Error", f"Failed to launch application: {str(e)}")
            self.root.quit()
    
    def show_current_step(self):
        """Display current installation step"""
        if 0 <= self.current_step < len(self.steps):
            self.steps[self.current_step]()
            self.update_progress()
    
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
        # Center window on screen
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')
        
        self.root.mainloop()

if __name__ == '__main__':
    wizard = InstallationWizard()
    wizard.run()
