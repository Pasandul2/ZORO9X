"""
ZORO9X etsgvga - Installation Wizard
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
        self.root.title("ZORO9X etsgvga - Installation Wizard")
        self.root.geometry("900x650")
        self.root.configure(bg='#0f172a')
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
        
        self.install_path = str(Path.home() / 'ZORO9X' / 'etsgvga')
        self.create_desktop_shortcut = True
        
        # Load business config
        self.business_config = self.load_business_config()
        self.api_key = self.business_config.get('api_key', '')
        self.company_name = self.business_config.get('business_details', {}).get('name', '')
        self.database_name = self.business_config.get('database_config', {}).get('database_name', 'csdcs_database')
        
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
        """Create main UI structure with modern gradient design"""
        # Main container with gradient effect
        main_container = tk.Frame(self.root, bg='#0f172a')
        main_container.pack(fill=tk.BOTH, expand=True)
        
        # Header with gradient effect (using multiple frames)
        header_container = tk.Frame(main_container, bg='#0f172a', height=120)
        header_container.pack(fill=tk.X)
        header_container.pack_propagate(False)
        
        # Gradient simulation with multiple frames
        gradient_frame1 = tk.Frame(header_container, bg='#6366f1', height=40)
        gradient_frame1.pack(fill=tk.X)
        
        gradient_frame2 = tk.Frame(header_container, bg='#8b5cf6', height=40)
        gradient_frame2.pack(fill=tk.X)
        
        gradient_frame3 = tk.Frame(header_container, bg='#a855f7', height=40)
        gradient_frame3.pack(fill=tk.X)
        
        # Logo and title overlay
        title_frame = tk.Frame(header_container, bg='#8b5cf6')
        title_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        # Icon
        tk.Label(
            title_frame,
            text="⚡",
            font=('Segoe UI', 32),
            bg='#8b5cf6',
            fg='white'
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        # Title text
        title_text_frame = tk.Frame(title_frame, bg='#8b5cf6')
        title_text_frame.pack(side=tk.LEFT)
        
        tk.Label(
            title_text_frame,
            text="etsgvga",
            font=('Segoe UI', 24, 'bold'),
            bg='#8b5cf6',
            fg='white'
        ).pack(anchor='w')
        
        tk.Label(
            title_text_frame,
            text="Installation Wizard",
            font=('Segoe UI', 11),
            bg='#8b5cf6',
            fg='#e0e7ff'
        ).pack(anchor='w')
        
        # Content frame with modern card design
        content_container = tk.Frame(main_container, bg='#0f172a')
        content_container.pack(fill=tk.BOTH, expand=True, padx=30, pady=20)
        
        # Card effect
        self.content_frame = tk.Frame(content_container, bg='#1e293b', relief='flat', bd=0)
        self.content_frame.pack(fill=tk.BOTH, expand=True)
        
        # Add rounded corner effect with border
        border_frame = tk.Frame(content_container, bg='#334155', relief='flat')
        border_frame.place(relx=0, rely=0, relwidth=1, relheight=1)
        
        self.content_frame.lift()
        
        # Footer with modern button design
        self.footer = tk.Frame(main_container, bg='#0f172a', height=80)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM, pady=(0, 20))
        self.footer.pack_propagate(False)
        
        # Navigation buttons with modern style
        button_frame = tk.Frame(self.footer, bg='#0f172a')
        button_frame.pack(expand=True)
        
        self.back_button = tk.Button(
            button_frame,
            text="← Back",
            font=('Segoe UI', 11, 'bold'),
            bg='#334155',
            fg='#e2e8f0',
            activebackground='#475569',
            activeforeground='white',
            width=14,
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
            font=('Segoe UI', 11, 'bold'),
            bg='#8b5cf6',
            fg='white',
            activebackground='#7c3aed',
            activeforeground='white',
            width=14,
            height=2,
            relief='flat',
            cursor='hand2',
            bd=0,
            command=self.next_step
        )
        self.next_button.pack(side=tk.LEFT, padx=8)
    
    def clear_content(self):
        """Clear content frame"""
        for widget in self.content_frame.winfo_children():
            widget.destroy()
    
    def welcome_step(self):
        """Step 1: Welcome screen with modern card design"""
        self.clear_content()
        
        # Create scrollable frame
        canvas = tk.Canvas(self.content_frame, bg='#1e293b', highlightthickness=0)
        scrollbar = tk.Scrollbar(self.content_frame, orient="vertical", command=canvas.yview, bg='#334155', troughcolor='#1e293b')
        scrollable_frame = tk.Frame(canvas, bg='#1e293b')
        
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
        welcome_container = tk.Frame(scrollable_frame, bg='#1e293b')
        welcome_container.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Emoji icon
        tk.Label(
            welcome_container,
            text="👋",
            font=('Segoe UI', 48),
            bg='#1e293b'
        ).pack(pady=(0, 15))
        
        tk.Label(
            welcome_container,
            text="Welcome to etsgvga!",
            font=('Segoe UI', 22, 'bold'),
            bg='#1e293b',
            fg='#f1f5f9'
        ).pack(pady=(0, 5))
        
        # Edition badge with gradient effect
        badge_frame = tk.Frame(welcome_container, bg='#8b5cf6', relief='flat')
        badge_frame.pack(pady=10)
        
        tk.Label(
            badge_frame,
            text=" BASIC EDITION ",
            font=('Segoe UI', 10, 'bold'),
            bg='#8b5cf6',
            fg='white',
            padx=20,
            pady=5
        ).pack()
        
        tk.Label(
            welcome_container,
            text="Let's build something amazing today.",
            font=('Segoe UI', 12),
            bg='#1e293b',
            fg='#94a3b8'
        ).pack(pady=(10, 25))
        
        # Features card
        features_card = tk.Frame(welcome_container, bg='#0f172a', relief='flat')
        features_card.pack(fill=tk.X, pady=10)
        
        features_header = tk.Frame(features_card, bg='#0f172a')
        features_header.pack(fill=tk.X, padx=25, pady=(20, 15))
        
        tk.Label(
            features_header,
            text="✨",
            font=('Segoe UI', 16),
            bg='#0f172a'
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        tk.Label(
            features_header,
            text="Features Included",
            font=('Segoe UI', 14, 'bold'),
            bg='#0f172a',
            fg='#f1f5f9',
            anchor='w'
        ).pack(side=tk.LEFT)
        
        features = [
            ("✨", "Dashboard", "Feature included in basic plan")
        ]
        
        for icon, title, desc in features:
            feature_item = tk.Frame(features_card, bg='#0f172a')
            feature_item.pack(fill=tk.X, padx=25, pady=8)
            
            # Icon circle
            icon_frame = tk.Frame(feature_item, bg='#6366f1', width=40, height=40)
            icon_frame.pack(side=tk.LEFT, padx=(0, 15))
            icon_frame.pack_propagate(False)
            
            tk.Label(
                icon_frame,
                text=icon,
                font=('Segoe UI', 14),
                bg='#6366f1'
            ).place(relx=0.5, rely=0.5, anchor='center')
            
            text_container = tk.Frame(feature_item, bg='#0f172a')
            text_container.pack(side=tk.LEFT, fill=tk.X, expand=True)
            
            tk.Label(
                text_container,
                text=title,
                font=('Segoe UI', 11, 'bold'),
                bg='#0f172a',
                fg='#e2e8f0',
                anchor='w'
            ).pack(anchor='w')
            
            tk.Label(
                text_container,
                text=desc,
                font=('Segoe UI', 9),
                bg='#0f172a',
                fg='#94a3b8',
                anchor='w'
            ).pack(anchor='w', pady=(2, 0))
        
        # Bottom padding
        tk.Frame(features_card, bg='#0f172a', height=20).pack()
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.NORMAL, text="Get Started →")
    
    def license_agreement_step(self):
        """Step 2: License agreement with modern design"""
        self.clear_content()
        
        content_container = tk.Frame(self.content_frame, bg='#1e293b')
        content_container.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Header
        header_frame = tk.Frame(content_container, bg='#1e293b')
        header_frame.pack(fill=tk.X, pady=(0, 20))
        
        tk.Label(
            header_frame,
            text="📄",
            font=('Segoe UI', 32),
            bg='#1e293b'
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        title_container = tk.Frame(header_frame, bg='#1e293b')
        title_container.pack(side=tk.LEFT)
        
        tk.Label(
            title_container,
            text="License Agreement",
            font=('Segoe UI', 18, 'bold'),
            bg='#1e293b',
            fg='#f1f5f9'
        ).pack(anchor='w')
        
        tk.Label(
            title_container,
            text="Please review the terms and conditions",
            font=('Segoe UI', 10),
            bg='#1e293b',
            fg='#94a3b8'
        ).pack(anchor='w')
        
        # License text card
        text_card = tk.Frame(content_container, bg='#0f172a', relief='flat')
        text_card.pack(fill=tk.BOTH, expand=True)
        
        scrollbar = tk.Scrollbar(text_card, bg='#334155', troughcolor='#0f172a')
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, padx=5, pady=5)
        
        license_text = tk.Text(
            text_card,
            wrap=tk.WORD,
            font=('Segoe UI', 10),
            bg='#0f172a',
            fg='#cbd5e1',
            relief='flat',
            padx=25,
            pady=20,
            yscrollcommand=scrollbar.set,
            bd=0,
            highlightthickness=0
        )
        license_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=license_text.yview)
        
        license_content = """End User License Agreement (EULA)

1. Grant of License
ZORO9X grants you a non-exclusive license to use etsgvga.

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
        """Step 3: Configuration - show business details with modern cards"""
        self.clear_content()
        
        # Create scrollable frame
        canvas = tk.Canvas(self.content_frame, bg='#1e293b', highlightthickness=0)
        scrollbar = tk.Scrollbar(self.content_frame, orient="vertical", command=canvas.yview, bg='#334155', troughcolor='#1e293b')
        scrollable_frame = tk.Frame(canvas, bg='#1e293b')
        
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
        
        content_container = tk.Frame(scrollable_frame, bg='#1e293b')
        content_container.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Header
        header_frame = tk.Frame(content_container, bg='#1e293b')
        header_frame.pack(fill=tk.X, pady=(0, 25))
        
        tk.Label(
            header_frame,
            text="⚙️",
            font=('Segoe UI', 32),
            bg='#1e293b'
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        title_container = tk.Frame(header_frame, bg='#1e293b')
        title_container.pack(side=tk.LEFT)
        
        tk.Label(
            title_container,
            text="System Configuration",
            font=('Segoe UI', 18, 'bold'),
            bg='#1e293b',
            fg='#f1f5f9'
        ).pack(anchor='w')
        
        tk.Label(
            title_container,
            text="Your pre-configured settings (read-only)",
            font=('Segoe UI', 10),
            bg='#1e293b',
            fg='#94a3b8'
        ).pack(anchor='w')
        
        # Configuration cards
        config_cards = tk.Frame(content_container, bg='#1e293b')
        config_cards.pack(fill=tk.X)
        
        # Business Name Card
        card1 = tk.Frame(config_cards, bg='#0f172a', relief='flat')
        card1.pack(fill=tk.X, pady=(0, 15))
        
        card1_content = tk.Frame(card1, bg='#0f172a')
        card1_content.pack(fill=tk.X, padx=25, pady=20)
        
        label_frame1 = tk.Frame(card1_content, bg='#0f172a')
        label_frame1.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(
            label_frame1,
            text="🏢",
            font=('Segoe UI', 16),
            bg='#0f172a'
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        tk.Label(
            label_frame1,
            text="Business Name",
            font=('Segoe UI', 11, 'bold'),
            bg='#0f172a',
            fg='#94a3b8',
            anchor='w'
        ).pack(side=tk.LEFT)
        
        value_frame1 = tk.Frame(card1_content, bg='#1e293b', relief='flat')
        value_frame1.pack(fill=tk.X)
        
        tk.Label(
            value_frame1,
            text=self.company_name or "Not configured",
            font=('Segoe UI', 13),
            bg='#1e293b',
            fg='#f1f5f9',
            anchor='w',
            padx=15,
            pady=12
        ).pack(fill=tk.X)
        
        # Database Name Card
        card2 = tk.Frame(config_cards, bg='#0f172a', relief='flat')
        card2.pack(fill=tk.X, pady=(0, 15))
        
        card2_content = tk.Frame(card2, bg='#0f172a')
        card2_content.pack(fill=tk.X, padx=25, pady=20)
        
        label_frame2 = tk.Frame(card2_content, bg='#0f172a')
        label_frame2.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(
            label_frame2,
            text="💾",
            font=('Segoe UI', 16),
            bg='#0f172a'
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        tk.Label(
            label_frame2,
            text="Database Name",
            font=('Segoe UI', 11, 'bold'),
            bg='#0f172a',
            fg='#94a3b8',
            anchor='w'
        ).pack(side=tk.LEFT)
        
        value_frame2 = tk.Frame(card2_content, bg='#1e293b', relief='flat')
        value_frame2.pack(fill=tk.X)
        
        tk.Label(
            value_frame2,
            text=self.database_name,
            font=('Segoe UI', 13),
            bg='#1e293b',
            fg='#f1f5f9',
            anchor='w',
            padx=15,
            pady=12
        ).pack(fill=tk.X)
        
        # API Key Card
        card3 = tk.Frame(config_cards, bg='#0f172a', relief='flat')
        card3.pack(fill=tk.X, pady=(0, 15))
        
        card3_content = tk.Frame(card3, bg='#0f172a')
        card3_content.pack(fill=tk.X, padx=25, pady=20)
        
        label_frame3 = tk.Frame(card3_content, bg='#0f172a')
        label_frame3.pack(fill=tk.X, pady=(0, 10))
        
        tk.Label(
            label_frame3,
            text="🔑",
            font=('Segoe UI', 16),
            bg='#0f172a'
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        tk.Label(
            label_frame3,
            text="API Key",
            font=('Segoe UI', 11, 'bold'),
            bg='#0f172a',
            fg='#94a3b8',
            anchor='w'
        ).pack(side=tk.LEFT)
        
        value_frame3 = tk.Frame(card3_content, bg='#1e293b', relief='flat')
        value_frame3.pack(fill=tk.X)
        
        api_display = self.api_key[:8] + "..." + self.api_key[-8:] if len(self.api_key) > 16 else self.api_key
        tk.Label(
            value_frame3,
            text=api_display if self.api_key else "Not configured",
            font=('Courier New', 11),
            bg='#1e293b',
            fg='#8b5cf6',
            anchor='w',
            padx=15,
            pady=12
        ).pack(fill=tk.X)
        
        # Info message card
        info_card = tk.Frame(content_container, bg='#1e40af', relief='flat')
        info_card.pack(fill=tk.X, pady=(15, 0))
        
        info_content = tk.Frame(info_card, bg='#1e40af')
        info_content.pack(fill=tk.X, padx=20, pady=15)
        
        tk.Label(
            info_content,
            text="ℹ️",
            font=('Segoe UI', 16),
            bg='#1e40af'
        ).pack(side=tk.LEFT, padx=(0, 12))
        
        tk.Label(
            info_content,
            text="These settings are pre-configured from your subscription and cannot be modified.",
            font=('Segoe UI', 10),
            bg='#1e40af',
            fg='#dbeafe',
            anchor='w',
            wraplength=650,
            justify='left'
        ).pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Continue →")
    
    def installation_location_step(self):
        """Step 4: Choose installation location with modern design"""
        self.clear_content()
        
        content_container = tk.Frame(self.content_frame, bg='#1e293b')
        content_container.pack(fill=tk.BOTH, expand=True, padx=40, pady=30)
        
        # Header
        header_frame = tk.Frame(content_container, bg='#1e293b')
        header_frame.pack(fill=tk.X, pady=(0, 30))
        
        tk.Label(
            header_frame,
            text="📂",
            font=('Segoe UI', 32),
            bg='#1e293b'
        ).pack(side=tk.LEFT, padx=(0, 15))
        
        title_container = tk.Frame(header_frame, bg='#1e293b')
        title_container.pack(side=tk.LEFT)
        
        tk.Label(
            title_container,
            text="Installation Location",
            font=('Segoe UI', 18, 'bold'),
            bg='#1e293b',
            fg='#f1f5f9'
        ).pack(anchor='w')
        
        tk.Label(
            title_container,
            text="Choose where to install the application",
            font=('Segoe UI', 10),
            bg='#1e293b',
            fg='#94a3b8'
        ).pack(anchor='w')
        
        # Path card
        path_card = tk.Frame(content_container, bg='#0f172a', relief='flat')
        path_card.pack(fill=tk.X, pady=(0, 20))
        
        path_content = tk.Frame(path_card, bg='#0f172a')
        path_content.pack(fill=tk.X, padx=25, pady=25)
        
        tk.Label(
            path_content,
            text="Installation Path",
            font=('Segoe UI', 11, 'bold'),
            bg='#0f172a',
            fg='#94a3b8'
        ).pack(anchor='w', pady=(0, 10))
        
        self.path_entry = tk.Entry(
            path_content,
            font=('Segoe UI', 12),
            bg='#1e293b',
            fg='#f1f5f9',
            relief='flat',
            insertbackground='#8b5cf6',
            bd=0
        )
        self.path_entry.insert(0, self.install_path)
        self.path_entry.pack(fill=tk.X, ipady=12, padx=2)
        
        # Options card
        options_card = tk.Frame(content_container, bg='#0f172a', relief='flat')
        options_card.pack(fill=tk.X)
        
        options_content = tk.Frame(options_card, bg='#0f172a')
        options_content.pack(fill=tk.X, padx=25, pady=25)
        
        tk.Label(
            options_content,
            text="Additional Options",
            font=('Segoe UI', 11, 'bold'),
            bg='#0f172a',
            fg='#94a3b8'
        ).pack(anchor='w', pady=(0, 15))
        
        # Shortcut checkbox with modern styling
        shortcut_frame = tk.Frame(options_content, bg='#0f172a')
        shortcut_frame.pack(fill=tk.X)
        
        self.shortcut_var = tk.BooleanVar(value=self.create_desktop_shortcut)
        checkbox = tk.Checkbutton(
            shortcut_frame,
            text="  Create desktop shortcut",
            variable=self.shortcut_var,
            font=('Segoe UI', 11),
            bg='#0f172a',
            fg='#e2e8f0',
            activebackground='#0f172a',
            activeforeground='#f1f5f9',
            selectcolor='#1e293b',
            bd=0,
            highlightthickness=0
        )
        checkbox.pack(anchor='w')
        
        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text="Install →")
    
    def installing_step(self):
        """Step 5: Installation progress with modern animation"""
        self.clear_content()
        self.install_path = self.path_entry.get()
        
        content_container = tk.Frame(self.content_frame, bg='#1e293b')
        content_container.pack(fill=tk.BOTH, expand=True)
        
        # Center content
        center_frame = tk.Frame(content_container, bg='#1e293b')
        center_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        # Animated icon
        tk.Label(
            center_frame,
            text="⚡",
            font=('Segoe UI', 64),
            bg='#1e293b'
        ).pack(pady=(0, 20))
        
        tk.Label(
            center_frame,
            text="Installing etsgvga",
            font=('Segoe UI', 20, 'bold'),
            bg='#1e293b',
            fg='#f1f5f9'
        ).pack(pady=(0, 10))
        
        self.progress_label = tk.Label(
            center_frame,
            text="Preparing installation...",
            font=('Segoe UI', 11),
            bg='#1e293b',
            fg='#94a3b8'
        )
        self.progress_label.pack(pady=15)
        
        # Progress indicator
        progress_container = tk.Frame(center_frame, bg='#1e293b')
        progress_container.pack(pady=20)
        
        # Create animated dots
        self.progress_dots = []
        for i in range(3):
            dot = tk.Label(
                progress_container,
                text="●",
                font=('Segoe UI', 16),
                bg='#1e293b',
                fg='#334155'
            )
            dot.pack(side=tk.LEFT, padx=5)
            self.progress_dots.append(dot)
        
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
                    for file in ['csdcs_app.py', 'requirements.txt', 'README.md']:
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
                    config_path = os.path.join(self.install_path, 'csdcs_config.json')
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
            shortcut_path = desktop / f'etsgvga.lnk'
            
            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(str(shortcut_path))
            shortcut.Targetpath = sys.executable
            shortcut.Arguments = f'"{self.install_path}/csdcs_app.py"'
            shortcut.WorkingDirectory = self.install_path
            shortcut.IconLocation = sys.executable
            shortcut.save()
        except:
            pass  # Silently fail if shortcut creation fails
    
    def completion_step(self):
        """Step 6: Installation complete with celebration design"""
        self.clear_content()
        
        content_container = tk.Frame(self.content_frame, bg='#1e293b')
        content_container.pack(fill=tk.BOTH, expand=True)
        
        # Center content
        center_frame = tk.Frame(content_container, bg='#1e293b')
        center_frame.place(relx=0.5, rely=0.5, anchor='center')
        
        # Success icon
        tk.Label(
            center_frame,
            text="🎉",
            font=('Segoe UI', 64),
            bg='#1e293b'
        ).pack(pady=(0, 20))
        
        tk.Label(
            center_frame,
            text="Installation Complete!",
            font=('Segoe UI', 22, 'bold'),
            bg='#1e293b',
            fg='#10b981'
        ).pack(pady=(0, 10))
        
        tk.Label(
            center_frame,
            text="etsgvga has been successfully installed.",
            font=('Segoe UI', 12),
            bg='#1e293b',
            fg='#94a3b8'
        ).pack(pady=5)
        
        # Info card
        info_card = tk.Frame(center_frame, bg='#0f172a', relief='flat')
        info_card.pack(pady=25)
        
        info_content = tk.Frame(info_card, bg='#0f172a')
        info_content.pack(padx=30, pady=20)
        
        tk.Label(
            info_content,
            text="📍",
            font=('Segoe UI', 16),
            bg='#0f172a'
        ).pack(side=tk.LEFT, padx=(0, 12))
        
        tk.Label(
            info_content,
            text=f"Installed to: {self.install_path}",
            font=('Segoe UI', 10),
            bg='#0f172a',
            fg='#cbd5e1'
        ).pack(side=tk.LEFT)
        
        # Launch button
        launch_button = tk.Button(
            center_frame,
            text="🚀 Launch Application",
            font=('Segoe UI', 13, 'bold'),
            bg='#10b981',
            fg='white',
            activebackground='#059669',
            activeforeground='white',
            relief='flat',
            cursor='hand2',
            bd=0,
            padx=30,
            pady=15,
            command=self.launch_application
        )
        launch_button.pack(pady=20)
        
        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(text="Finish", state=tk.NORMAL, command=self.root.quit)
    
    def launch_application(self):
        """Launch the installed application"""
        try:
            app_path = os.path.join(self.install_path, 'csdcs_app.py')
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
