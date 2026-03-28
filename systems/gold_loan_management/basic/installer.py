"""
ZORO9X Gold Loan System - Installation Wizard
"""

import tkinter as tk
from tkinter import messagebox, filedialog
import os
import sys
import subprocess
import json
import shutil
import urllib.request
import urllib.error
from pathlib import Path
import hashlib
import base64
import platform
import uuid
import hmac
from theme import GOLD_THEME

APP_EXE_NAME = 'gold_loan_app.exe'
APP_SCRIPT_NAME = 'gold_loan_app.py'
CONFIG_FILE_NAME = 'gold_loan_config.json'
API_URL = 'http://localhost:5001'
VALIDATE_ENDPOINT = '/api/saas/validate-key'
CONFIG_SIGNING_SECRET = 'your_jwt_secret_key_change_this_in_production_12345678'


def is_remote_api_url(url):
    normalized = (url or '').strip().lower()
    return bool(normalized and (normalized.startswith('http://') or normalized.startswith('https://')))


def build_api_base_urls():
    ordered = []
    normalized = API_URL.rstrip('/')
    if normalized and is_remote_api_url(normalized):
        ordered.append(normalized)
    return ordered


def get_device_fingerprint():
    raw = '|'.join([platform.node(), platform.machine(), str(uuid.getnode())])
    return hashlib.sha256(raw.encode()).hexdigest()[:32]


def xor_bytes(data, key_material):
    key = hashlib.sha256(key_material.encode()).digest()
    return bytes(byte ^ key[index % len(key)] for index, byte in enumerate(data))


def encrypt_config_value(value, device_fp):
    if not value:
        return ''
    encrypted = xor_bytes(value.encode('utf-8'), f'config:{device_fp}')
    return base64.b64encode(encrypted).decode('utf-8')


def sign_config(config_data, device_fp):
    signable = {
        'api_key_encrypted': config_data.get('api_key_encrypted', ''),
        'company_name_encrypted': config_data.get('company_name_encrypted', ''),
        'contact_email_encrypted': config_data.get('contact_email_encrypted', ''),
        'contact_phone_encrypted': config_data.get('contact_phone_encrypted', ''),
        'business_address_encrypted': config_data.get('business_address_encrypted', ''),
        'logo_url_encrypted': config_data.get('logo_url_encrypted', ''),
        'database_name': config_data.get('database_name', ''),
        'database_path': config_data.get('database_path', ''),
    }
    material = json.dumps(signable, sort_keys=True, separators=(',', ':'))
    return hmac.new(
        CONFIG_SIGNING_SECRET.encode('utf-8'),
        f'config:{device_fp}:{material}'.encode('utf-8'),
        hashlib.sha256,
    ).hexdigest()


class InstallationWizard:
    def __init__(self):
        self.root = tk.Tk()
        self.theme = GOLD_THEME
        self.theme.apply_window(
            self.root,
            min_size=(900, 640),
            size=(1080, 760),
            title='ZORO9X Gold Loan System - Installation Wizard',
        )

        self.accent = self.theme.palette.accent
        self.accent_dark = self.theme.palette.accent_hover
        self.surface = self.theme.palette.bg_surface
        self.surface_soft = self.theme.palette.bg_surface_alt
        self.text_primary = self.theme.palette.text_primary
        self.text_muted = self.theme.palette.text_muted

        self.current_step = 0
        self.steps = [
            self.welcome_step,
            self.license_agreement_step,
            self.configuration_step,
            self.installation_location_step,
            self.installing_step,
            self.completion_step,
        ]

        self.bundle_dir = self.get_bundle_dir()
        self.install_path = str(Path.home() / 'ZORO9X' / 'GoldLoanSystem')
        self.create_desktop_shortcut = True

        self.api_key = ''
        self.company_name = ''
        self.contact_email = ''
        self.contact_phone = ''
        self.business_address = ''
        self.logo_url = ''
        self.database_name = 'gold_loan_database'
        self.validation_payload = {}
        self.business_details_loaded = False
        self.loaded_api_key = ''
        self.logo_preview_image = None
        self.api_base_urls = build_api_base_urls()
        self.active_api_url = self.api_base_urls[0] if self.api_base_urls else API_URL

        self.api_key_var = tk.StringVar(value=self.api_key)
        self.company_name_var = tk.StringVar(value=self.company_name)
        self.contact_email_var = tk.StringVar(value=self.contact_email)
        self.contact_phone_var = tk.StringVar(value=self.contact_phone)
        self.business_address_var = tk.StringVar(value=self.business_address)
        self.database_name_var = tk.StringVar(value=self.database_name)

        self.create_ui()
        self.set_window_icon()
        self.center_window()
        self.show_current_step()

    def get_bundle_dir(self):
        """Return runtime directory for script mode and PyInstaller bundle mode."""
        if getattr(sys, 'frozen', False) and hasattr(sys, '_MEIPASS'):
            return sys._MEIPASS
        return os.path.dirname(os.path.abspath(__file__))

    def set_window_icon(self):
        """Set installer icon if one is bundled."""
        for icon_name in ('logo.ico', 'app.ico'):
            icon_path = os.path.join(self.bundle_dir, icon_name)
            if os.path.exists(icon_path):
                try:
                    self.root.iconbitmap(icon_path)
                except Exception:
                    pass
                break

    def center_window(self):
        """Center the installer on screen."""
        self.root.update_idletasks()
        width = self.root.winfo_width()
        height = self.root.winfo_height()
        x = (self.root.winfo_screenwidth() // 2) - (width // 2)
        y = (self.root.winfo_screenheight() // 2) - (height // 2)
        self.root.geometry(f'{width}x{height}+{x}+{y}')

    def create_ui(self):
        header = tk.Frame(self.root, bg=self.accent, height=92)
        header.pack(fill=tk.X)
        header.pack_propagate(False)

        tk.Label(
            header,
            text='Gold Loan System',
            font=('Segoe UI', 19, 'bold'),
            bg=self.accent,
            fg='white',
        ).pack(pady=(18, 0))

        self.step_label = tk.Label(
            header,
            text='Step 1 of 6',
            font=('Segoe UI', 10),
            bg=self.accent,
            fg='#dbe7ff',
        )
        self.step_label.pack(pady=(4, 0))

        self.content_frame = tk.Frame(self.root, bg=self.theme.palette.bg_app)
        self.content_frame.pack(fill=tk.BOTH, expand=True, padx=22, pady=18)

        self.card_frame = tk.Frame(
            self.content_frame,
            bg=self.surface,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
        )
        self.card_frame.pack(fill=tk.BOTH, expand=True)

        self.footer = tk.Frame(self.root, bg=self.theme.palette.bg_app, height=72)
        self.footer.pack(fill=tk.X, side=tk.BOTTOM)
        self.footer.pack_propagate(False)

        button_frame = tk.Frame(self.footer, bg=self.theme.palette.bg_app)
        button_frame.pack(expand=True, pady=10)

        self.back_button = self.theme.make_button(
            button_frame,
            text='Back',
            command=self.previous_step,
            kind='ghost',
            width=14,
        )
        self.back_button.pack(side=tk.LEFT, padx=8)

        self.next_button = self.theme.make_button(
            button_frame,
            text='Next',
            command=self.next_step,
            kind='primary',
            width=14,
        )
        self.next_button.pack(side=tk.LEFT, padx=8)

    def clear_content(self):
        for widget in self.card_frame.winfo_children():
            widget.destroy()

    def create_scrollable_step_container(self, padx=24, pady=20):
        self.clear_content()

        canvas = tk.Canvas(
            self.card_frame,
            bg=self.surface,
            highlightthickness=0,
            bd=0,
        )
        scrollbar = self.theme.make_scrollbar(self.card_frame, canvas.yview)
        content = tk.Frame(canvas, bg=self.surface)

        content.bind(
            '<Configure>',
            lambda event: canvas.configure(scrollregion=canvas.bbox('all')),
        )

        canvas.create_window((0, 0), window=content, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=padx, pady=pady)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y, pady=pady)

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

        canvas.bind('<Enter>', lambda _event: self.root.bind_all('<MouseWheel>', _on_mousewheel))
        canvas.bind('<Leave>', lambda _event: self.root.unbind_all('<MouseWheel>'))

        return content

    def update_step_label(self):
        self.step_label.config(text=f'Step {self.current_step + 1} of {len(self.steps)}')

    def validate_api_key_with_server(self, api_key):
        """Validate API key with backend and return subscription metadata."""
        if not self.api_base_urls:
            return False, 'Remote API URL is not configured. Set ZORO9X_PUBLIC_API_URL (HTTPS).', {}

        payload = json.dumps({'api_key': api_key}).encode('utf-8')
        last_message = 'Cannot connect to license server. Check internet/server and try again.'

        for base_url in self.api_base_urls:
            request = urllib.request.Request(
                f'{base_url}{VALIDATE_ENDPOINT}',
                data=payload,
                headers={'Content-Type': 'application/json'},
                method='POST',
            )

            try:
                with urllib.request.urlopen(request, timeout=10) as response:
                    body = response.read().decode('utf-8')
                    data = json.loads(body) if body else {}
                    self.active_api_url = base_url
                    return bool(data.get('valid')), data.get('message', ''), data
            except urllib.error.HTTPError as http_error:
                try:
                    body = http_error.read().decode('utf-8')
                    data = json.loads(body) if body else {}
                    self.active_api_url = base_url
                    return False, data.get('message', 'API key validation failed'), data
                except Exception:
                    self.active_api_url = base_url
                    return False, 'API key validation failed', {}
            except Exception as error:
                last_message = f'Unable to reach {base_url}: {error}'

        return False, last_message, {}

    def validate_configuration_step(self):
        self.api_key = self.api_key_var.get().strip()

        if not self.api_key:
            messagebox.showerror('Validation Error', 'API key is required.')
            return False

        if not self.business_details_loaded or self.loaded_api_key != self.api_key:
            messagebox.showerror('Load Required', 'Please click "Load Details" after entering your API key.')
            return False

        if not self.company_name_var.get().strip():
            messagebox.showerror('Validation Error', 'Company details are not loaded. Click "Load Details".')
            return False

        self.config_status_label.config(text='Company details loaded successfully.', fg='#047857')
        return True

    def load_company_details(self):
        self.api_key = self.api_key_var.get().strip()
        if not self.api_key:
            messagebox.showerror('Validation Error', 'API key is required.')
            return

        self.config_status_label.config(text='Validating API key and loading company details...', fg='#0369a1')
        self.root.update_idletasks()

        valid, message, payload = self.validate_api_key_with_server(self.api_key)
        if not valid:
            self.business_details_loaded = False
            self.loaded_api_key = ''
            self.clear_company_details()
            self.config_status_label.config(text='API key validation failed', fg='#b91c1c')
            messagebox.showerror('Invalid API Key', message or 'Please enter a valid API key.')
            return

        subscription = payload.get('subscription') or {}
        company_name = (subscription.get('company_name') or '').strip()
        if not company_name:
            self.business_details_loaded = False
            self.loaded_api_key = ''
            self.clear_company_details()
            self.config_status_label.config(text='Company profile not found for this API key.', fg='#b91c1c')
            messagebox.showerror('Profile Missing', 'Company profile could not be loaded from server.')
            return

        self.validation_payload = payload
        self.company_name_var.set(company_name)
        self.contact_email_var.set(subscription.get('contact_email', '') or '')
        self.contact_phone_var.set(subscription.get('contact_phone', '') or '')
        self.business_address_var.set(subscription.get('business_address', '') or '')
        self.database_name_var.set(subscription.get('database_name', self.database_name_var.get().strip() or 'gold_loan_database'))
        self.logo_url = (subscription.get('logo_url', '') or '').strip()
        self.load_logo_preview(self.logo_url)

        self.business_details_loaded = True
        self.loaded_api_key = self.api_key
        self.config_status_label.config(text='Company details loaded. You can continue to the next step.', fg='#047857')

    def clear_company_details(self):
        self.company_name_var.set('')
        self.contact_email_var.set('')
        self.contact_phone_var.set('')
        self.business_address_var.set('')
        self.logo_url = ''
        if hasattr(self, 'logo_preview_label'):
            self.logo_preview_label.config(image='', text='No logo loaded')
        self.logo_preview_image = None

    def load_logo_preview(self, logo_url):
        if not hasattr(self, 'logo_preview_label'):
            return

        if not logo_url:
            self.logo_preview_label.config(image='', text='No logo loaded')
            self.logo_preview_image = None
            return

        try:
            full_logo_url = logo_url if logo_url.startswith('http://') or logo_url.startswith('https://') else f'{self.active_api_url}{logo_url}'
            with urllib.request.urlopen(full_logo_url, timeout=8) as response:
                image_bytes = response.read()

            # Tk PhotoImage supports PNG/GIF image data directly.
            encoded_image = base64.b64encode(image_bytes).decode('ascii')
            self.logo_preview_image = tk.PhotoImage(data=encoded_image)
            self.logo_preview_label.config(image=self.logo_preview_image, text='')
        except Exception:
            self.logo_preview_label.config(image='', text='Logo available (preview not supported)')
            self.logo_preview_image = None

    def welcome_step(self):
        content = self.create_scrollable_step_container()

        tk.Label(
            content,
            text='Welcome to Gold Loan System',
            font=('Segoe UI', 20, 'bold'),
            bg=self.surface,
            fg=self.text_primary,
        ).pack(pady=(35, 10))

        tk.Label(
            content,
            text='BASIC Edition',
            font=('Segoe UI', 11),
            bg=self.surface,
            fg=self.text_muted,
        ).pack(pady=(0, 10))

        tk.Label(
            content,
            text='This installer will set up the application on your computer.',
            font=('Segoe UI', 11),
            bg=self.surface,
            fg=self.text_muted,
        ).pack(pady=(0, 20))

        feature_box = tk.Frame(content, bg=self.surface_soft)
        feature_box.pack(fill=tk.X, padx=40, pady=10)

        for line in """- Dashboard""".splitlines():
            tk.Label(
                feature_box,
                text=line,
                font=('Segoe UI', 11),
                bg=self.surface_soft,
                fg=self.text_primary,
                anchor='w',
            ).pack(fill=tk.X, padx=20, pady=6)

        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.NORMAL, text='Next')

    def license_agreement_step(self):
        self.clear_content()

        tk.Label(
            self.card_frame,
            text='License Agreement',
            font=('Segoe UI', 14, 'bold'),
            bg=self.surface,
            fg=self.text_primary,
        ).pack(pady=(20, 10))

        text_frame = tk.Frame(self.card_frame, bg=self.surface)
        text_frame.pack(fill=tk.BOTH, expand=True, padx=30, pady=10)

        scrollbar = self.theme.make_scrollbar(text_frame, None)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        license_text = tk.Text(
            text_frame,
            wrap=tk.WORD,
            font=('Segoe UI', 10),
            bg=self.surface_soft,
            fg=self.theme.palette.text_primary,
            relief='flat',
            padx=15,
            pady=15,
            yscrollcommand=scrollbar.set,
        )
        license_text.pack(fill=tk.BOTH, expand=True)
        scrollbar.config(command=license_text.yview)

        license_content = """End User License Agreement (EULA)

1. Grant of License
ZORO9X grants you a non-exclusive license to use Gold Loan System.

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
        self.next_button.config(state=tk.NORMAL, text='I Agree')

    def configuration_step(self):
        """Collect API key and load business profile from server."""
        content = self.create_scrollable_step_container()

        tk.Label(
            content,
            text='Configuration',
            font=('Segoe UI', 16, 'bold'),
            bg=self.surface,
            fg=self.text_primary,
        ).pack(pady=(20, 10))

        tk.Label(
            content,
            text='Enter your API key to securely fetch company information from the server.',
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
        ).pack(pady=(0, 12))

        form = tk.Frame(content, bg=self.surface)
        form.pack(fill=tk.X, padx=40)

        self.render_labeled_entry(form, 'API Key:', self.api_key_var, masked=True)
        self.theme.make_button(
            form,
            text='Load Company Details',
            command=self.load_company_details,
            kind='primary',
            width=20,
            pady=6,
        ).pack(anchor='w', pady=(10, 12))

        self.render_labeled_readonly_entry(form, 'Company Name:', self.company_name_var)
        self.render_labeled_readonly_entry(form, 'Contact Email:', self.contact_email_var)
        self.render_labeled_readonly_entry(form, 'Mobile Number:', self.contact_phone_var)
        self.render_labeled_readonly_entry(form, 'Address:', self.business_address_var)
        self.render_labeled_readonly_entry(form, 'Database Name:', self.database_name_var)

        tk.Label(
            form,
            text='Company Logo:',
            font=('Segoe UI', 10, 'bold'),
            bg=self.surface,
            fg=self.text_muted,
            anchor='w',
        ).pack(fill=tk.X, pady=(10, 4))

        self.logo_preview_label = tk.Label(
            form,
            text='No logo loaded',
            font=('Segoe UI', 9),
            bg=self.surface_soft,
            fg=self.text_muted,
            width=42,
            height=7,
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
        )
        self.logo_preview_label.pack(anchor='w', pady=(0, 4))

        self.config_status_label = tk.Label(
            content,
            text='Enter API key and click "Load Company Details".',
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
        )
        self.config_status_label.pack(pady=(14, 0))

        if self.loaded_api_key and self.loaded_api_key != self.api_key_var.get().strip():
            self.business_details_loaded = False

        self.back_button.config(state=tk.NORMAL, command=self.previous_step)
        self.next_button.config(state=tk.NORMAL, text='Next', command=self.next_step)

    def render_labeled_entry(self, parent, label, variable, masked=False):
        tk.Label(
            parent,
            text=label,
            font=('Segoe UI', 10, 'bold'),
            bg=self.surface,
            fg=self.text_muted,
            anchor='w',
        ).pack(fill=tk.X, pady=(8, 3))

        entry = self.theme.make_entry(parent, variable=variable, masked=masked)
        entry.pack(fill=tk.X, ipady=6)

    def render_labeled_readonly_entry(self, parent, label, variable):
        tk.Label(
            parent,
            text=label,
            font=('Segoe UI', 10, 'bold'),
            bg=self.surface,
            fg=self.text_muted,
            anchor='w',
        ).pack(fill=tk.X, pady=(8, 3))

        readonly_entry = self.theme.make_entry(parent, variable=variable, readonly=True)
        readonly_entry.pack(fill=tk.X, ipady=6)

    def browse_installation_path(self):
        selected_dir = filedialog.askdirectory(initialdir=self.path_entry.get().strip() or str(Path.home()))
        if selected_dir:
            self.path_entry.delete(0, tk.END)
            self.path_entry.insert(0, selected_dir)

    def installation_location_step(self):
        content = self.create_scrollable_step_container()

        tk.Label(
            content,
            text='Installation Location',
            font=('Segoe UI', 16, 'bold'),
            bg=self.surface,
            fg=self.text_primary,
        ).pack(pady=(30, 20))

        path_frame = tk.Frame(content, bg=self.surface)
        path_frame.pack(padx=40, fill=tk.X)

        tk.Label(
            path_frame,
            text='Install to:',
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
        ).pack(anchor='w', pady=(0, 5))

        path_input_frame = tk.Frame(path_frame, bg=self.surface)
        path_input_frame.pack(fill=tk.X)

        self.path_entry = self.theme.make_entry(path_input_frame)
        self.path_entry.insert(0, self.install_path)
        self.path_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, ipady=6, pady=5)

        self.theme.make_button(
            path_input_frame,
            text='Browse',
            command=self.browse_installation_path,
            kind='secondary',
            width=10,
            pady=6,
        ).pack(side=tk.LEFT, padx=(8, 0))

        self.shortcut_var = tk.BooleanVar(value=self.create_desktop_shortcut)
        tk.Checkbutton(
            content,
            text='Create desktop shortcut',
            variable=self.shortcut_var,
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
            activebackground=self.surface,
            selectcolor=self.surface,
            relief='flat',
            bd=0,
        ).pack(pady=20)

        self.back_button.config(state=tk.NORMAL)
        self.next_button.config(state=tk.NORMAL, text='Install')

    def installing_step(self):
        self.install_path = self.path_entry.get().strip()
        self.create_desktop_shortcut = self.shortcut_var.get()

        self.company_name = self.company_name_var.get().strip()
        self.api_key = self.api_key_var.get().strip()

        if not self.install_path:
            messagebox.showerror('Validation Error', 'Installation path is required.')
            self.current_step = 3
            self.show_current_step()
            return

        # Installation requires active network + valid subscription state.
        online_valid, online_message, payload = self.validate_api_key_with_server(self.api_key)
        if not online_valid:
            messagebox.showerror(
                'Internet Required',
                online_message or 'Installation requires a live connection and valid API key.'
            )
            self.current_step = 2
            self.show_current_step()
            return

        subscription = payload.get('subscription') or {}
        self.company_name = (subscription.get('company_name') or self.company_name).strip()
        self.contact_email = (subscription.get('contact_email') or self.contact_email_var.get().strip()).strip()
        self.contact_phone = (subscription.get('contact_phone') or self.contact_phone_var.get().strip()).strip()
        self.business_address = (subscription.get('business_address') or self.business_address_var.get().strip()).strip()
        self.database_name = (subscription.get('database_name') or self.database_name_var.get().strip() or 'gold_loan_database').strip()
        self.database_name_var.set(self.database_name)

        self.clear_content()

        tk.Label(
            self.card_frame,
            text='Installing...',
            font=('Segoe UI', 14, 'bold'),
            bg=self.surface,
            fg=self.text_primary,
        ).pack(pady=(40, 20))

        self.progress_label = tk.Label(
            self.card_frame,
            text='Preparing installation...',
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
        )
        self.progress_label.pack(pady=10)

        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(state=tk.DISABLED)

        self.root.after(100, self.perform_installation)

    def perform_installation(self):
        import time

        steps = [
            'Creating installation directory...',
            'Copying application files...',
            'Copying branding assets...',
            'Saving configuration...',
            'Creating desktop shortcut...',
        ]

        try:
            os.makedirs(self.install_path, exist_ok=True)

            for step_text in steps:
                self.progress_label.config(text=step_text)
                self.root.update_idletasks()

                if step_text == 'Copying application files...':
                    self.copy_application_files()

                elif step_text == 'Copying branding assets...':
                    self.copy_branding_assets()

                elif step_text == 'Saving configuration...':
                    self.write_app_config()

                elif step_text == 'Creating desktop shortcut...':
                    if sys.platform == 'win32' and self.create_desktop_shortcut:
                        self.create_shortcut()

                time.sleep(0.2)

            self.current_step += 1
            self.show_current_step()

        except Exception as exc:
            messagebox.showerror('Installation Error', f'Failed to install: {exc}')
            self.root.quit()

    def copy_application_files(self):
        app_exe_src = os.path.join(self.bundle_dir, APP_EXE_NAME)
        app_script_src = os.path.join(self.bundle_dir, APP_SCRIPT_NAME)
        readme_src = os.path.join(self.bundle_dir, 'README.md')

        if os.path.exists(app_exe_src):
            shutil.copy2(app_exe_src, os.path.join(self.install_path, APP_EXE_NAME))
        elif os.path.exists(app_script_src):
            shutil.copy2(app_script_src, os.path.join(self.install_path, APP_SCRIPT_NAME))
        else:
            raise FileNotFoundError('Application binary not found in installer package.')

        if os.path.exists(readme_src):
            shutil.copy2(readme_src, os.path.join(self.install_path, 'README.md'))

    def copy_branding_assets(self):
        for ext in ['png', 'jpg', 'jpeg', 'gif', 'ico']:
            logo_file = os.path.join(self.bundle_dir, f'logo.{ext}')
            if os.path.exists(logo_file):
                shutil.copy2(logo_file, os.path.join(self.install_path, f'logo.{ext}'))
                break

    def write_app_config(self):
        device_fp = get_device_fingerprint()
        config = {
            'api_key_encrypted': encrypt_config_value(self.api_key, device_fp),
            'company_name_encrypted': encrypt_config_value(self.company_name, device_fp),
            'contact_email_encrypted': encrypt_config_value(self.contact_email, device_fp),
            'contact_phone_encrypted': encrypt_config_value(self.contact_phone, device_fp),
            'business_address_encrypted': encrypt_config_value(self.business_address, device_fp),
            'logo_url_encrypted': encrypt_config_value(self.logo_url, device_fp),
            'database_name': self.database_name,
            'database_path': f'{self.database_name}.db',
        }
        config['config_signature'] = sign_config(config, device_fp)
        config_path = os.path.join(self.install_path, CONFIG_FILE_NAME)
        with open(config_path, 'w', encoding='utf-8') as file_handle:
            json.dump(config, file_handle, indent=2)

    def create_shortcut(self):
        try:
            import importlib
            Dispatch = importlib.import_module('win32com.client').Dispatch

            desktop = Path.home() / 'Desktop'
            shortcut_path = desktop / 'Gold Loan System.lnk'

            app_exe = os.path.join(self.install_path, APP_EXE_NAME)
            app_script = os.path.join(self.install_path, APP_SCRIPT_NAME)

            shell = Dispatch('WScript.Shell')
            shortcut = shell.CreateShortCut(str(shortcut_path))

            if os.path.exists(app_exe):
                shortcut.Targetpath = app_exe
                shortcut.WorkingDirectory = self.install_path
                shortcut.IconLocation = app_exe
            else:
                shortcut.Targetpath = sys.executable
                shortcut.Arguments = f'"{app_script}"'
                shortcut.WorkingDirectory = self.install_path
                shortcut.IconLocation = sys.executable

            shortcut.save()
        except Exception:
            pass

    def completion_step(self):
        content = self.create_scrollable_step_container()

        tk.Label(
            content,
            text='Installation Complete',
            font=('Segoe UI', 16, 'bold'),
            bg=self.surface,
            fg=self.theme.palette.success,
        ).pack(pady=(30, 10))

        tk.Label(
            content,
            text='Gold Loan System has been installed successfully.',
            font=('Segoe UI', 10),
            bg=self.surface,
            fg=self.text_muted,
        ).pack(pady=5)

        tk.Label(
            content,
            text=f'Location: {self.install_path}',
            font=('Segoe UI', 9),
            bg=self.surface,
            fg=self.theme.palette.text_muted,
            wraplength=800,
            justify='center',
        ).pack(pady=5)

        self.back_button.config(state=tk.DISABLED)
        self.next_button.config(text='Launch', state=tk.NORMAL, command=self.launch_application)

    def launch_application(self):
        try:
            app_exe = os.path.join(self.install_path, APP_EXE_NAME)
            app_script = os.path.join(self.install_path, APP_SCRIPT_NAME)

            if os.path.exists(app_exe):
                subprocess.Popen([app_exe], cwd=self.install_path)
            elif os.path.exists(app_script):
                subprocess.Popen([sys.executable, app_script], cwd=self.install_path)
            else:
                raise FileNotFoundError('Installed application not found.')

            self.root.quit()
        except Exception as exc:
            messagebox.showerror('Launch Error', f'Failed to launch application: {exc}')
            self.root.quit()

    def show_current_step(self):
        if 0 <= self.current_step < len(self.steps):
            self.update_step_label()
            self.steps[self.current_step]()

    def next_step(self):
        if self.current_step == 2 and not self.validate_configuration_step():
            return
        if self.current_step < len(self.steps) - 1:
            self.current_step += 1
            self.show_current_step()

    def previous_step(self):
        if self.current_step > 0:
            self.current_step -= 1
            self.show_current_step()

    def run(self):
        self.root.mainloop()


if __name__ == '__main__':
    wizard = InstallationWizard()
    wizard.run()
