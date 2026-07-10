"""Modern SMS Center for Text.lk messaging — premium UI/UX with glassmorphism & rich features."""

import tkinter as tk
from tkinter import messagebox, ttk, filedialog
from datetime import datetime, timedelta
import csv
import io
import os
import json
import math
import re

from database import (
    delete_sms_template,
    get_customer,
    get_setting,
    get_loan,
    get_sms_analytics,
    get_upcoming_birthdays,
    list_sms_messages,
    list_sms_messages_filtered,
    list_sms_templates,
    save_sms_template,
    search_customers,
    search_customers_with_loan,
    search_loans,
    set_setting,
    add_scheduled_sms,
    delete_scheduled_sms,
    list_scheduled_sms,
    update_customer_birthday,
    get_wished_customer_ids_this_year,
    get_connection,
)
from sms_service import build_sms_context, render_template, send_sms
from sms_service import normalize_phone_number


# ── Modern Color Palette ──────────────────────────────────────────────────────

class ModernColors:
    primary = '#6366f1'       # Indigo
    primary_dark = '#4f46e5'
    primary_light = '#a5b4fc'
    secondary = '#0ea5e9'     # Sky
    success = '#10b981'       # Emerald
    warning = '#f59e0b'       # Amber
    danger = '#ef4444'        # Red
    info = '#8b5cf6'          # Violet
    surface = '#ffffff'
    surface_alt = '#f8fafc'
    surface_dim = '#f1f5f9'
    bg = '#f0f2f5'
    text = '#0f172a'
    text_muted = '#64748b'
    text_dim = '#94a3b8'
    border = '#e2e8f0'
    border_focus = '#6366f1'
    gradient_start = '#6366f1'
    gradient_end = '#8b5cf6'
    card_shadow = '#d4dce9'
    glass_bg = 'rgba(255,255,255,0.85)'


# ── Placeholders ──────────────────────────────────────────────────────────────

SMS_PLACEHOLDERS = [
    ('👤 Customer Name', '{{customer_name}}'),
    ('🆔 Customer NIC', '{{customer_nic}}'),
    ('📞 Customer Phone', '{{customer_phone}}'),
    ('🎫 Ticket No', '{{ticket_no}}'),
    ('💰 Loan Amount', '{{loan_amount}}'),
    ('📊 Market Value', '{{market_value}}'),
    ('📋 Assessed Value', '{{assessed_value}}'),
    ('📈 Interest Rate', '{{interest_rate}}'),
    ('⏱ Duration', '{{duration}}'),
    ('📅 Issue Date', '{{issue_date}}'),
    ('🔄 Renew Date', '{{renew_date}}'),
    ('⏳ Expire Date', '{{expire_date}}'),
    ('📌 Loan Status', '{{loan_status}}'),
    ('💵 Total Payable', '{{total_payable}}'),
    ('📊 Total Interest', '{{total_interest}}'),
    ('🎂 Birthday Date', '{{birthday_date}}'),
    ('🏢 Company Name', '{{company_name}}'),
    ('📞 Company Phone', '{{company_phone}}'),
    ('📍 Company Address', '{{company_address}}'),
    ('📆 Current Date', '{{date}}'),
    ('🕐 Current Time', '{{time}}'),
    ('💬 Message', '{{message}}'),
    # ── Payment & Renewal Fields ──
    ('💰 Payment Amount', '{{payment_amount}}'),
    ('🆕 New Loan Amount', '{{new_loan_amount}}'),
    ('📉 Normal Interest Due', '{{normal_interest_due}}'),
    ('⚠️ Overdue Interest Due', '{{overdue_interest_due}}'),
    ('🔽 Principal Reduction', '{{principal_reduction}}'),
    ('🆕 New Interest Rate', '{{new_interest_rate}}'),
    ('🆕 New Assessed Value', '{{new_assessed_value}}'),
    # ── All Interest Fields ──
    ('💹 Interest Principal Amt', '{{interest_principal_amount}}'),
    ('📊 Overdue Interest Rate', '{{overdue_interest_rate}}'),
    ('💸 OD Interest Amount', '{{od_interest}}'),
    ('🔧 Service Charge Rate', '{{service_charge_rate}}'),
    ('🔧 Service Charge Amount', '{{service_charge_amount}}'),
    # ── Additional Loan Fields ──
    ('💵 Advance Amount', '{{advance_amount}}'),
    ('⚖️ Customer Balance', '{{customer_balance_amount}}'),
    ('🏅 Total Gold Weight', '{{total_gold_weight}}'),
    ('📦 Total Item Weight', '{{total_item_weight}}'),
]

AUTO_EVENTS = [
    ('sms_auto_new_loan', '🆕 New Loan SMS', 'auto_new_loan',
     'Send SMS automatically when a new loan is created.'),
    ('sms_auto_renewal', '🔄 Renewal SMS', 'auto_renewal',
     'Send SMS when a loan is renewed.'),
    ('sms_auto_redemption', '✅ Redemption SMS', 'auto_redemption',
     'Send SMS when a loan is redeemed.'),
    ('sms_auto_reminder', '⏰ Reminder SMS', 'auto_reminder',
     'Send SMS reminder for upcoming loan expiry.'),
]

CATEGORY_LABELS = {
    'custom': 'Custom', 'auto': 'Auto',
    'auto_new_loan': 'New Loan', 'auto_renewal': 'Renewal',
    'auto_redemption': 'Redemption', 'auto_reminder': 'Reminder',
    'promotion': 'Promotion', 'birthday': 'Birthday',
    'order_status': 'Loan Status', 'other': 'Other',
}

STATUS_COLORS = {
    'sent': '#10b981', 'failed': '#ef4444',
    'pending': '#f59e0b', 'scheduled': '#6366f1',
}

# ── SVG-style icon set using Unicode & styled labels ─────────────────────────

ICONS = {
    'send': '➤', 'template': '📄', 'settings': '⚙️', 'history': '📊',
    'analytics': '📈', 'birthday': '🎂', 'promotion': '📢', 'auto': '⚡',
    'custom': '✉️', 'failed': '❌', 'scheduled': '📅', 'queue': '📋',
    'search': '🔍', 'add': '➕', 'remove': '✕', 'edit': '✏️',
    'save': '💾', 'delete': '🗑️', 'refresh': '🔄', 'export': '📤',
    'import': '📥', 'preview': '👁️', 'credit': '💳', 'check': '✓',
    'close': '✕', 'back': '◀', 'forward': '▶', 'download': '⬇',
    'upload': '⬆', 'filter': '🔽', 'sort': '↕', 'more': '⋯',
    'customer': '👤', 'phone': '📞', 'message': '💬', 'warning': '⚠️',
    'info': 'ℹ️', 'success': '✅', 'error': '❌', 'time': '🕐',
    'date': '📅', 'star': '⭐', 'heart': '❤️', 'gift': '🎁',
    'celebration': '🎉', 'rocket': '🚀', 'zap': '⚡', 'globe': '🌐',
}


class SmsCenterPage:
    """Premium SMS Center with glassmorphism design, 9 tabs, and rich features."""

    def __init__(self, container, theme, user, navigate_fn, db_path=None):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.db_path = db_path
        self.templates = {}
        self.customers = []
        self.selected_customer = None
        self.selected_loan = None
        self.MC = ModernColors

    # ── Modern UI Helpers ──────────────────────────────────────────────────

    def _check_internet(self):
        import socket
        try:
            socket.setdefaulttimeout(2.0)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("8.8.8.8", 53))
            s.close()
            return True
        except OSError:
            self._toast('No Internet Connection', 'Please check your connection and try again.', 'error')
            return False

    def _clear(self, parent):
        for w in parent.winfo_children():
            w.destroy()

    def _get_text(self, widget):
        return widget.get('1.0', 'end').strip()

    def _set_text(self, widget, value):
        widget.delete('1.0', tk.END)
        widget.insert('1.0', value or '')

    def _toast(self, title, message, kind='info'):
        """Modern toast notification."""
        colors = {'info': self.MC.info, 'success': self.MC.success,
                  'warning': self.MC.warning, 'error': self.MC.danger}
        icons = {'info': 'ℹ️', 'success': '✅', 'warning': '⚠️', 'error': '❌'}
        c = colors.get(kind, self.MC.info)
        msg = f"{icons.get(kind, '')}  {title}\n{message}" if message else f"{icons.get(kind, '')}  {title}"
        if kind == 'error':
            messagebox.showerror(title, message)
        elif kind == 'warning':
            messagebox.showwarning(title, message)
        else:
            messagebox.showinfo(title, message)

    def _modern_button(self, parent, text, command, kind='primary', width=None, pady=8, icon=None):
        """Create a modern styled button using theme's make_button with icon prefix."""
        display = f"{icon}  {text}" if icon else text
        kind_map = {'primary': 'primary', 'secondary': 'secondary', 'danger': 'danger',
                    'ghost': 'ghost', 'success': 'primary'}
        return self.theme.make_button(
            parent, text=display, command=command,
            kind=kind_map.get(kind, 'primary'),
            width=width or 14, pady=pady
        )

    def _message_box(self, parent, height=8):
        """Modern styled text editor."""
        text = tk.Text(
            parent, height=height, wrap='word',
            bg=self.MC.surface_alt, fg=self.MC.text,
            insertbackground=self.MC.text,
            relief='flat', bd=0, padx=12, pady=10,
            font=('Segoe UI', 10),
            highlightthickness=1,
            highlightbackground=self.MC.border,
            highlightcolor=self.MC.border_focus,
        )
        return text

    def _section_label(self, parent, text, icon=''):
        lbl = tk.Label(
            parent, text=f'{icon}  {text}' if icon else text,
            font=('Segoe UI', 15, 'bold'),
            bg=parent['bg'], fg=self.MC.text,
        )
        return lbl

    def _desc_label(self, parent, text):
        return tk.Label(
            parent, text=text, font=('Segoe UI', 9),
            bg=parent['bg'], fg=self.MC.text_muted,
            wraplength=650, justify='left',
        )

    def _badge(self, parent, text, color, text_color='#ffffff'):
        lbl = tk.Label(
            parent, text=f'  {text}  ', font=('Segoe UI', 8, 'bold'),
            bg=color, fg=text_color, padx=4, pady=2,
        )
        return lbl

    def _stat_card(self, parent, title, value, color=None, icon=''):
        """Modern stat card with icon."""
        bg = self.MC.surface
        card = tk.Frame(parent, bg=bg, highlightthickness=1,
                        highlightbackground=self.MC.border, padx=16, pady=14)
        top = tk.Frame(card, bg=bg)
        top.pack(fill=tk.X)
        tk.Label(top, text=icon, font=('Segoe UI', 14), bg=bg).pack(side=tk.LEFT, padx=(0, 6))
        tk.Label(top, text=title, font=('Segoe UI', 9), bg=bg,
                 fg=self.MC.text_muted).pack(side=tk.LEFT)
        tk.Label(card, text=str(value), font=('Segoe UI', 24, 'bold'),
                 bg=bg, fg=color or self.MC.text, anchor='w').pack(anchor='w', pady=(4, 0))
        return card

    def _glass_card(self, parent):
        """Create a glassmorphism card frame."""
        card = tk.Frame(parent, bg=self.MC.surface,
                        highlightthickness=1, highlightbackground=self.MC.border)
        return card

    def _placeholder_panel(self, parent, text_widget):
        """Placeholder insertion sidebar showing all placeholders (no search)."""
        frame = tk.Frame(parent, bg=self.MC.surface_alt,
                         highlightthickness=1, highlightbackground=self.MC.border)

        header = tk.Frame(frame, bg=self.MC.surface_alt)
        header.pack(fill=tk.X, padx=10, pady=(8, 4))
        tk.Label(header, text='📋 Placeholders', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface_alt, fg=self.MC.text).pack(anchor='w')
        tk.Label(header, text='Click to insert', font=('Segoe UI', 8),
                 bg=self.MC.surface_alt, fg=self.MC.text_muted).pack(anchor='w')

        list_frame = tk.Frame(frame, bg=self.MC.surface_alt)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=4, pady=(0, 4))

        canvas = tk.Canvas(list_frame, bg=self.MC.surface_alt, highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        inner = tk.Frame(canvas, bg=self.MC.surface_alt)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        win = canvas.create_window((0, 0), window=inner, anchor='nw')
        inner.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        for label, placeholder in SMS_PLACEHOLDERS:
            btn = tk.Label(
                inner, text=f'  {label}', font=('Segoe UI', 9),
                bg=self.MC.surface_alt, fg=self.MC.primary,
                anchor='w', cursor='hand2', pady=3,
            )
            btn.pack(fill=tk.X, padx=6)
            btn.bind('<Enter>', lambda e, b=btn: b.configure(bg=self.MC.border))
            btn.bind('<Leave>', lambda e, b=btn: b.configure(bg=self.MC.surface_alt))
            btn.bind('<Button-1>', lambda e, p=placeholder: self._insert_placeholder(text_widget, p))

        return frame

    def _insert_placeholder(self, text_widget, placeholder):
        if text_widget:
            text_widget.insert(tk.INSERT, placeholder)
            text_widget.focus_set()

    def _char_counter(self, parent, text_widget):
        """Live character counter with SMS part estimation."""
        var = tk.StringVar(value='0 chars')
        lbl = tk.Label(parent, textvariable=var, font=('Segoe UI', 8),
                       bg=parent['bg'], fg=self.MC.text_muted, anchor='e')

        def _update(*_):
            content = text_widget.get('1.0', 'end-1c')
            length = len(content)
            sms_parts = max(1, (length + 159) // 160)
            color = self.MC.warning if length > 150 else self.MC.text_muted
            lbl.configure(fg=color if length > 150 else self.MC.text_muted)
            var.set(f'{length} chars  •  ~{sms_parts} SMS part{"s" if sms_parts > 1 else ""}')

        text_widget.bind('<KeyRelease>', _update, add='+')
        text_widget.bind('<KeyPress>', _update, add='+')
        _update()
        return lbl

    def _template_body(self, category, fallback=''):
        tpl = self.templates.get(category)
        if tpl and tpl.get('body'):
            return tpl['body']
        return fallback

    def _create_gradient_header(self, parent, title, subtitle='', icon=''):
        """Create a gradient-style header bar."""
        hdr = tk.Frame(parent, bg=self.MC.primary)
        hdr.pack(fill=tk.X)
        tk.Label(hdr, text=f'{icon}  {title}', font=('Segoe UI', 18, 'bold'),
                 bg=self.MC.primary, fg='#ffffff').pack(anchor='w')
        if subtitle:
            tk.Label(hdr, text=subtitle, font=('Segoe UI', 9),
                     bg=self.MC.primary, fg='#c7d2fe').pack(anchor='w', pady=(2, 0))
        return hdr

    # ── Main Render ────────────────────────────────────────────────────────

    def render(self):
        self._clear(self.container)

        if self.user['role'] != 'admin':
            tk.Label(self.container, text='⛔ Access Denied - Admin Only',
                     font=('Segoe UI', 20, 'bold'), bg=self.MC.bg,
                     fg=self.MC.danger).pack(pady=40)
            return

        self.templates = {tpl['category']: tpl for tpl in list_sms_templates()}

        # Main container with subtle gradient feel
        view = tk.Frame(self.container, bg=self.MC.bg)
        view.pack(fill=tk.BOTH, expand=True)

        # ── Premium Header with status bar ──
        hdr = tk.Frame(view, bg=self.MC.surface, highlightthickness=0,
                       highlightbackground=self.MC.border)
        hdr.pack(fill=tk.X, padx=0, pady=(0, 1))

        # Top bar with gradient accent line
        accent_line = tk.Frame(hdr, bg=self.MC.primary, height=3)
        accent_line.pack(fill=tk.X)

        hdr_inner = tk.Frame(hdr, bg=self.MC.surface)
        hdr_inner.pack(fill=tk.X)

        # Left: Title + subtitle
        title_frame = tk.Frame(hdr_inner, bg=self.MC.surface)
        title_frame.pack(side=tk.LEFT)
        tk.Label(title_frame, text='📨  SMS Command Center', font=('Segoe UI', 22, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w')

        # Right: Gateway status + quick actions
        status_frame = tk.Frame(hdr_inner, bg=self.MC.surface)
        status_frame.pack(side=tk.RIGHT)

        sms_enabled = get_setting('sms_enabled', '0') == '1'
        token_ok = bool(get_setting('sms_gateway_token', '').strip())

        # Status indicator
        status_bg = self.MC.surface_alt
        status_card = tk.Frame(status_frame, bg=status_bg,
                               highlightthickness=1, highlightbackground=self.MC.border,
                               padx=14, pady=8)
        status_card.pack(side=tk.RIGHT, padx=(8, 0))

        dot_color = self.MC.success if (sms_enabled and token_ok) else (self.MC.warning if sms_enabled else self.MC.text_muted)
        status_text = '●  Connected' if (sms_enabled and token_ok) else ('●  Enabled (no token)' if sms_enabled else '○  Disabled')

        tk.Label(status_card, text=status_text, font=('Segoe UI', 10, 'bold'),
                 bg=status_bg, fg=dot_color).pack(anchor='w')
        tk.Label(status_card, text='Text.lk Gateway', font=('Segoe UI', 8),
                 bg=status_bg, fg=self.MC.text_muted).pack(anchor='w')

        # Reminders & Birthdays button — to the right of the status card
        def _open_reminders():
            from pages.morning_sms_popup import show_sms_reminders_popup
            show_sms_reminders_popup(self.container.winfo_toplevel(), self.theme, self.user, db_path=self.db_path)

        self._modern_button(
            status_frame, '📨  Reminders & Birthdays', _open_reminders,
            kind='primary', width=22, pady=6,
        ).pack(side=tk.RIGHT, padx=(0, 10), pady=8)

        # ── Notebook with modern styling ──
        style = ttk.Style()
        style.theme_use('default')
        style.configure('TNotebook', background=self.MC.bg, borderwidth=0)
        style.configure('TNotebook.Tab', background=self.MC.surface_dim,
                        foreground=self.MC.text_muted, padding=(16, 8),
                        font=('Segoe UI', 9, 'bold'), borderwidth=0)
        style.map('TNotebook.Tab', background=[('selected', self.MC.surface)],
                  foreground=[('selected', self.MC.primary)],
                  borderwidth=[('selected', 0)])

        notebook = ttk.Notebook(view)
        notebook.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 12))

        tabs = {
            '✉️  Custom SMS': tk.Frame(notebook, bg=self.MC.bg),
            '⚡  Auto SMS': tk.Frame(notebook, bg=self.MC.bg),
            '📢  Promotions': tk.Frame(notebook, bg=self.MC.bg),
            '🎂  Birthday': tk.Frame(notebook, bg=self.MC.bg),
            '❌  Failed': tk.Frame(notebook, bg=self.MC.bg),
            '📋  Templates': tk.Frame(notebook, bg=self.MC.bg),
            '📊  History': tk.Frame(notebook, bg=self.MC.bg),
            '📈  Analytics': tk.Frame(notebook, bg=self.MC.bg),
        }
        for name, frame in tabs.items():
            notebook.add(frame, text=name)

        self.custom_tab = tabs['✉️  Custom SMS']
        self.auto_tab = tabs['⚡  Auto SMS']
        self.promo_tab = tabs['📢  Promotions']
        self.birthday_tab = tabs['🎂  Birthday']
        self.failed_tab = tabs['❌  Failed']
        self.templates_tab = tabs['📋  Templates']
        self.history_tab = tabs['📊  History']
        self.analytics_tab = tabs['📈  Analytics']

        self._build_custom_tab()
        self._build_auto_tab()
        self._build_promotion_tab()
        self._build_birthday_tab()
        self._build_failed_tab()
        self._build_templates_tab()
        self._build_history_tab()
        self._build_analytics_tab()

    # ══════════════════════════════════════════════════════════════════════
    # TAB 1 — Custom SMS (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_custom_tab(self):
        self._clear(self.custom_tab)
        card = self._glass_card(self.custom_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        # ── Header ──
        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'Send Custom SMS', '✉️').pack(side=tk.LEFT)
        self._desc_label(hdr, 'Select recipients, compose with placeholders, preview & send.').pack(anchor='w', padx=16, pady=(0, 8))

        # ── Main body: 2-column layout ──
        body = tk.Frame(card, bg=self.MC.surface)
        body.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))
        body.grid_columnconfigure(0, weight=3)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        # ═══ LEFT COLUMN: Recipients ═══
        left = tk.Frame(body, bg=self.MC.surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 10))

        # Search bar with icon
        search_row = tk.Frame(left, bg=self.MC.surface)
        search_row.pack(fill=tk.X, pady=(0, 6))
        self.custom_search_var = tk.StringVar()
        search_entry = self.theme.make_entry(search_row, variable=self.custom_search_var)
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        search_entry.entry.bind('<KeyRelease>', lambda _: self._refresh_custom_customers())
        self._modern_button(search_row, 'Search', self._refresh_custom_customers,
                            kind='ghost', width=8, pady=6, icon='🔍').pack(side=tk.LEFT)

        # Controls row
        ctrl_row = tk.Frame(left, bg=self.MC.surface)
        ctrl_row.pack(fill=tk.X, pady=(0, 4))
        self.custom_select_all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            ctrl_row, text='Select All', variable=self.custom_select_all_var,
            command=self._toggle_custom_select_all,
            bg=self.MC.surface, fg=self.MC.text,
            selectcolor=self.MC.surface, font=('Segoe UI', 9, 'bold'),
            activebackground=self.MC.surface,
        ).pack(side=tk.LEFT)
        self.custom_count_var = tk.StringVar(value='0 selected')
        tk.Label(ctrl_row, textvariable=self.custom_count_var, font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.RIGHT)

        # Customer list
        self.custom_selected_ids = set()
        self.custom_row_vars = {}
        list_frame = tk.Frame(left, bg=self.MC.surface)
        list_frame.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_frame, bg=self.MC.surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.custom_rows_frame = tk.Frame(canvas, bg=self.MC.surface)
        win_id = canvas.create_window((0, 0), window=self.custom_rows_frame, anchor='nw')
        self.custom_rows_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win_id, width=e.width))

        # Manual number + CSV import row
        manual_frame = tk.Frame(left, bg=self.MC.surface)
        manual_frame.pack(fill=tk.X, pady=(6, 0))
        tk.Label(manual_frame, text='📞 Add number:', font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.LEFT)
        self.custom_manual_var = tk.StringVar()
        manual_entry = self.theme.make_entry(manual_frame, variable=self.custom_manual_var)
        manual_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 6))
        manual_entry.entry.bind('<Return>', lambda _: self._add_manual_number())
        self._modern_button(manual_frame, 'Add', self._add_manual_number,
                            kind='ghost', width=5, pady=6, icon='➕').pack(side=tk.LEFT, padx=(0, 4))
        self._modern_button(manual_frame, 'CSV', self._import_csv_numbers,
                            kind='ghost', width=5, pady=6, icon='📥').pack(side=tk.LEFT)

        # ═══ RIGHT COLUMN: Selected recipients ═══
        right_top = tk.Frame(body, bg=self.MC.surface)
        right_top.grid(row=0, column=1, sticky='nsew')

        tk.Label(right_top, text='📋  Selected Recipients', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 6))

        self.custom_manual_numbers = []
        recipients_frame = tk.Frame(right_top, bg=self.MC.surface_alt,
                                    highlightthickness=1, highlightbackground=self.MC.border)
        recipients_frame.pack(fill=tk.BOTH, expand=True)

        recip_canvas = tk.Canvas(recipients_frame, bg=self.MC.surface_alt, highlightthickness=0, bd=0)
        recip_vbar = ttk.Scrollbar(recipients_frame, orient=tk.VERTICAL, command=recip_canvas.yview)
        recip_canvas.configure(yscrollcommand=recip_vbar.set)
        recip_vbar.pack(side=tk.RIGHT, fill=tk.Y)
        recip_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.custom_tokens_frame = tk.Frame(recip_canvas, bg=self.MC.surface_alt)
        token_win = recip_canvas.create_window((0, 0), window=self.custom_tokens_frame, anchor='nw')
        self.custom_tokens_frame.bind('<Configure>', lambda _: recip_canvas.configure(scrollregion=recip_canvas.bbox('all')))
        recip_canvas.bind('<Configure>', lambda e: recip_canvas.itemconfigure(token_win, width=e.width))

        self.custom_recip_summary_var = tk.StringVar(value='No recipients selected')
        tk.Label(right_top, textvariable=self.custom_recip_summary_var, font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))

        # ═══ BOTTOM: Message composer ═══
        bottom_frame = tk.Frame(card, bg=self.MC.surface)
        bottom_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))
        bottom_frame.grid_columnconfigure(0, weight=4)
        bottom_frame.grid_columnconfigure(1, weight=1)
        bottom_frame.grid_rowconfigure(1, weight=1)

        # Template selector
        tpl_row = tk.Frame(bottom_frame, bg=self.MC.surface)
        tpl_row.grid(row=0, column=0, columnspan=2, sticky='ew', pady=(0, 8))
        tk.Label(tpl_row, text='📄  Template:', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(side=tk.LEFT)
        self.custom_tpl_var = tk.StringVar(value='custom')
        tpl_values = [f"{CATEGORY_LABELS.get(cat, cat)} — {tpl.get('title', '')}" for cat, tpl in sorted(self.templates.items())]
        self._custom_tpl_keys = [cat for cat, _ in sorted(self.templates.items())]
        tpl_combo = self.theme.make_combobox(tpl_row, variable=self.custom_tpl_var,
                                             values=tpl_values, width=30,
                                             command=lambda _: self._apply_custom_template())
        tpl_combo.pack(side=tk.LEFT, padx=(8, 0), fill=tk.X, expand=True)

        # Message editor
        msg_frame = tk.Frame(bottom_frame, bg=self.MC.surface)
        msg_frame.grid(row=1, column=0, sticky='nsew', padx=(0, 8))

        tk.Label(msg_frame, text='✉️  Message', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 4))

        self.custom_message_text = self._message_box(msg_frame, height=8)
        self.custom_message_text.pack(fill=tk.BOTH, expand=True)
        self._set_text(self.custom_message_text,
                       self._template_body('custom', 'Dear {{customer_name}},\n\nThank you for choosing our service.\n\n{{company_name}}'))

        counter_lbl = self._char_counter(msg_frame, self.custom_message_text)
        counter_lbl.pack(anchor='e', pady=(2, 0))

        # Action buttons
        btn_row = tk.Frame(msg_frame, bg=self.MC.surface)
        btn_row.pack(fill=tk.X, pady=(8, 0))
        self._modern_button(btn_row, 'Preview', self._preview_custom_sms,
                            kind='ghost', width=12, pady=8, icon='👁️').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Save Template', self._save_custom_template,
                            kind='ghost', width=12, pady=8, icon='💾').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Send SMS', self._send_custom_sms,
                            kind='primary', width=14, pady=8, icon='📤').pack(side=tk.LEFT)

        # Placeholders panel
        ph_frame = tk.Frame(bottom_frame, bg=self.MC.surface)
        ph_frame.grid(row=1, column=1, sticky='nsew')
        placeholder_panel = self._placeholder_panel(ph_frame, self.custom_message_text)
        placeholder_panel.pack(fill=tk.BOTH, expand=True)

        self._refresh_custom_customers()

    # ── Custom Tab: New Features ───────────────────────────────────────────

    def _import_csv_numbers(self):
        """Import phone numbers from a CSV file."""
        path = filedialog.askopenfilename(
            title='Import Phone Numbers from CSV',
            filetypes=[('CSV Files', '*.csv'), ('Text Files', '*.txt'), ('All Files', '*.*')]
        )
        if not path:
            return
        try:
            count = 0
            with open(path, 'r', encoding='utf-8-sig') as f:
                content = f.read()
            # Try CSV parsing first
            try:
                reader = csv.reader(io.StringIO(content))
                for row in reader:
                    for cell in row:
                        cell = cell.strip()
                        # Extract phone numbers (digits only, min 7 chars)
                        nums = re.findall(r'\d{7,}', cell)
                        for n in nums:
                            if n not in self.custom_manual_numbers:
                                self.custom_manual_numbers.append(n)
                                count += 1
            except Exception:
                # Fallback: extract all numbers from text
                nums = re.findall(r'\d{7,}', content)
                for n in nums:
                    if n not in self.custom_manual_numbers:
                        self.custom_manual_numbers.append(n)
                        count += 1
            self._refresh_recipient_tokens()
            self._toast('CSV Import', f'Imported {count} phone numbers from CSV.', 'success')
        except Exception as e:
            self._toast('Import Error', f'Failed to import: {str(e)}', 'error')

    def _preview_custom_sms(self):
        """Show a preview dialog of the rendered message."""
        raw_message = self._get_text(self.custom_message_text)
        if not raw_message:
            self._toast('Preview', 'Message is empty.', 'warning')
            return

        # Get first selected customer for preview context
        sample_customer = None
        all_customers = search_customers('')
        for cid in list(self.custom_selected_ids)[:1]:
            for c in all_customers:
                if c['id'] == cid:
                    sample_customer = c
                    break
        if not sample_customer and all_customers:
            sample_customer = all_customers[0]

        context = build_sms_context(customer=sample_customer, message=raw_message)
        rendered = render_template(raw_message, context)

        dialog = tk.Toplevel(self.container)
        dialog.title('📨 Message Preview')
        dialog.geometry('520x400')
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()

        main = tk.Frame(dialog, bg=self.MC.surface)
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(main, text='📨  Message Preview', font=('Segoe UI', 14, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w')

        # Original
        tk.Label(main, text='Original Template:', font=('Segoe UI', 9, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(10, 2))
        orig_box = tk.Text(main, height=4, wrap='word',
                           bg=self.MC.surface_alt, fg=self.MC.text_muted,
                           font=('Segoe UI', 9), relief='flat', padx=8, pady=6)
        orig_box.insert('1.0', raw_message)
        orig_box.configure(state='disabled')
        orig_box.pack(fill=tk.X)

        # Rendered
        tk.Label(main, text='Rendered Output:', font=('Segoe UI', 9, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(10, 2))
        rend_box = tk.Text(main, height=6, wrap='word',
                           bg=self.MC.surface_alt, fg=self.MC.text,
                           font=('Segoe UI', 10), relief='flat', padx=8, pady=6)
        rend_box.insert('1.0', rendered)
        rend_box.configure(state='disabled')
        rend_box.pack(fill=tk.BOTH, expand=True)

        if sample_customer:
            tk.Label(main, text=f'Preview context: {sample_customer.get("name", "N/A")}',
                     font=('Segoe UI', 8), bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))

        self._modern_button(main, 'Close', dialog.destroy, kind='ghost', width=10, pady=6).pack(pady=(10, 0))

    def _apply_custom_template(self):
        selected = self.custom_tpl_var.get()
        for i, cat in enumerate(self._custom_tpl_keys):
            label = f"{CATEGORY_LABELS.get(cat, cat)} — {self.templates.get(cat, {}).get('title', '')}"
            if label == selected:
                tpl = self.templates.get(cat, {})
                self._set_text(self.custom_message_text, tpl.get('body', ''))
                return

    def _add_manual_number(self):
        val = self.custom_manual_var.get().strip()
        if not val:
            return
        parts = [p.strip() for p in val.replace(';', ',').split(',') if p.strip()]
        for p in parts:
            if p not in self.custom_manual_numbers:
                self.custom_manual_numbers.append(p)
        self.custom_manual_var.set('')
        self._refresh_recipient_tokens()

    def _remove_manual_number(self, number):
        if number in self.custom_manual_numbers:
            self.custom_manual_numbers.remove(number)
        self._refresh_recipient_tokens()

    def _remove_selected_customer(self, row_key):
        self.custom_selected_ids.discard(row_key)
        if row_key in self.custom_row_vars:
            self.custom_row_vars[row_key].set(False)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _refresh_recipient_tokens(self):
        for w in self.custom_tokens_frame.winfo_children():
            w.destroy()

        total = 0
        loan_map = getattr(self, '_custom_loan_map', {})

        for row_key in list(self.custom_selected_ids):
            loan = loan_map.get(row_key)
            if not loan:
                continue
            total += 1
            token = tk.Frame(self.custom_tokens_frame, bg=self.MC.surface,
                             highlightthickness=1, highlightbackground=self.MC.border,
                             padx=8, pady=4)
            token.pack(fill=tk.X, padx=6, pady=2)
            tk.Label(token, text=f"🎫 {loan.get('display_ticket', '')}  👤 {loan['name']}",
                     font=('Segoe UI', 9), bg=self.MC.surface, fg=self.MC.text, anchor='w').pack(side=tk.LEFT)
            tk.Label(token, text=loan.get('phone', ''), font=('Segoe UI', 8),
                     bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.LEFT, padx=(8, 0))
            rm_btn = tk.Label(token, text='  ✕  ', font=('Segoe UI', 10, 'bold'),
                              bg=self.MC.surface, fg=self.MC.danger, cursor='hand2')
            rm_btn.pack(side=tk.RIGHT)
            rm_btn.bind('<Button-1>', lambda _, k=row_key: self._remove_selected_customer(k))

        for num in list(self.custom_manual_numbers):
            total += 1
            token = tk.Frame(self.custom_tokens_frame, bg=self.MC.surface,
                             highlightthickness=1, highlightbackground=self.MC.border,
                             padx=8, pady=4)
            token.pack(fill=tk.X, padx=6, pady=2)
            tk.Label(token, text=f"📱 {num}", font=('Segoe UI', 9),
                     bg=self.MC.surface, fg=self.MC.text, anchor='w').pack(side=tk.LEFT)
            tk.Label(token, text='(manual)', font=('Segoe UI', 8),
                     bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.LEFT, padx=(8, 0))
            rm_btn = tk.Label(token, text='  ✕  ', font=('Segoe UI', 10, 'bold'),
                              bg=self.MC.surface, fg=self.MC.danger, cursor='hand2')
            rm_btn.pack(side=tk.RIGHT)
            rm_btn.bind('<Button-1>', lambda _, n=num: self._remove_manual_number(n))

        if total == 0:
            tk.Label(self.custom_tokens_frame, text='No recipients selected yet.\nSelect loans or add numbers.',
                     font=('Segoe UI', 9), bg=self.MC.surface_alt,
                     fg=self.MC.text_muted, justify='center').pack(pady=20)

        self.custom_recip_summary_var.set(f'{total} recipient{"s" if total != 1 else ""} ready to send')

    def _refresh_custom_customers(self):
        query = self.custom_search_var.get().strip()
        results = search_customers_with_loan(query)
        self.custom_results = results

        for w in self.custom_rows_frame.winfo_children():
            w.destroy()
        self.custom_row_vars.clear()

        if not results:
            tk.Label(self.custom_rows_frame, text='No loans found.',
                     font=('Segoe UI', 9), bg=self.MC.surface,
                     fg=self.MC.text_muted).pack(anchor='w', padx=6, pady=8)
            return

        STATUS_COLORS = {'active': self.MC.success, 'redeemed': self.MC.text_muted,
                         'forfeited': self.MC.danger, 'renewed': self.MC.warning}

        for loan in results:
            # unique key per row = loan_id
            row_key = f"loan_{loan['loan_id']}"
            var = tk.BooleanVar(value=row_key in self.custom_selected_ids)
            self.custom_row_vars[row_key] = var
            # store full loan dict so send can use phone + loan context
            if not hasattr(self, '_custom_loan_map'):
                self._custom_loan_map = {}
            self._custom_loan_map[row_key] = loan

            row = tk.Frame(self.custom_rows_frame, bg=self.MC.surface)
            row.pack(fill=tk.X, pady=1)

            tk.Checkbutton(
                row, variable=var,
                command=lambda k=row_key: self._toggle_custom_customer(k),
                bg=self.MC.surface, selectcolor=self.MC.surface,
                activebackground=self.MC.surface,
            ).pack(side=tk.LEFT)

            # Ticket no
            ticket = loan.get('display_ticket', '')
            status = (loan.get('loan_status') or 'active').lower()
            tk.Label(row, text=ticket, font=('Segoe UI', 9, 'bold'),
                     bg=self.MC.surface, fg=STATUS_COLORS.get(status, self.MC.primary),
                     anchor='w', width=10).pack(side=tk.LEFT, padx=(0, 4))

            # Customer name
            tk.Label(row, text=loan['name'], font=('Segoe UI', 9),
                     bg=self.MC.surface, fg=self.MC.text, anchor='w', width=28).pack(side=tk.LEFT, padx=(0, 4))

            # Status badge
            tk.Label(row, text=status.upper(), font=('Segoe UI', 7, 'bold'),
                     bg=self.MC.surface, fg=STATUS_COLORS.get(status, self.MC.text_muted),
                     anchor='w', width=12).pack(side=tk.LEFT, padx=(0, 4))

            # Phone
            tk.Label(row, text=loan.get('phone', ''), font=('Segoe UI', 8),
                     bg=self.MC.surface, fg=self.MC.text_muted, anchor='w').pack(side=tk.LEFT)

        self._update_custom_count()

    def _toggle_custom_customer(self, row_key):
        var = self.custom_row_vars.get(row_key)
        if var and var.get():
            self.custom_selected_ids.add(row_key)
        else:
            self.custom_selected_ids.discard(row_key)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _toggle_custom_select_all(self):
        select_all = self.custom_select_all_var.get()
        for key, var in self.custom_row_vars.items():
            var.set(select_all)
            if select_all:
                self.custom_selected_ids.add(key)
            else:
                self.custom_selected_ids.discard(key)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _update_custom_count(self):
        n = len(self.custom_selected_ids) + len(getattr(self, 'custom_manual_numbers', []))
        self.custom_count_var.set(f'{n} selected')

    def _save_custom_template(self):
        body = self._get_text(self.custom_message_text)
        save_sms_template('custom', 'Custom SMS', body, True, self.user['id'])
        self.templates['custom'] = {'title': 'Custom SMS', 'body': body, 'is_active': 1}
        self._toast('Success', 'Custom SMS template saved.', 'success')

    def _send_custom_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.custom_message_text)
        if not raw_message:
            self._toast('SMS', 'Message cannot be empty.', 'warning')
            return

        loan_map = getattr(self, '_custom_loan_map', {})
        recipients = []
        for row_key in self.custom_selected_ids:
            loan = loan_map.get(row_key)
            if loan:
                recipients.append(loan)

        for num in getattr(self, 'custom_manual_numbers', []):
            recipients.append({'phone': num, 'name': num, 'id': None})

        if not recipients:
            self._toast('SMS', 'Select loans or add recipient numbers.', 'warning')
            return

        if len(recipients) > 1:
            if not messagebox.askyesno('Confirm', f'Send SMS to {len(recipients)} recipients?'):
                return

        sent = failed = 0
        for r in recipients:
            phone = r.get('phone', '')
            customer = {'id': r.get('id') or r.get('customer_id'), 'name': r.get('name', ''),
                        'nic': r.get('nic', ''), 'phone': phone}
            context = build_sms_context(customer=customer, loan=r, message=raw_message)
            final_message = render_template(raw_message, context)
            ok, _, _ = send_sms(phone, final_message, customer=customer, loan=r,
                                category='custom', sent_by=self.user['id'])
            if ok:
                sent += 1
            else:
                failed += 1

        self._toast('SMS Result', f'✅ Sent: {sent}\n❌ Failed: {failed}',
                    'success' if failed == 0 else 'warning')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 2 — Auto SMS (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_auto_tab(self):
        self._clear(self.auto_tab)
        card = self._glass_card(self.auto_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'Automatic SMS Settings', '⚡').pack(side=tk.LEFT)
        self._desc_label(card, 'Enable automatic SMS for loan events. Each event has its own customizable template.').pack(anchor='w', padx=16, pady=(0, 10))

        # Master switch — modern toggle card
        master_frame = tk.Frame(card, bg=self.MC.surface_alt,
                                highlightthickness=1, highlightbackground=self.MC.border)
        master_frame.pack(fill=tk.X, padx=16, pady=(0, 12))

        self.auto_master_var = tk.BooleanVar(value=get_setting('sms_enabled', '0') == '1')
        master_inner = tk.Frame(master_frame, bg=self.MC.surface_alt)
        master_inner.pack(fill=tk.X, padx=16, pady=12)

        # Toggle with visual indicator
        toggle_frame = tk.Frame(master_inner, bg=self.MC.surface_alt)
        toggle_frame.pack(side=tk.LEFT)
        tk.Checkbutton(
            toggle_frame, text='  ⚡  Enable SMS Gateway', variable=self.auto_master_var,
            font=('Segoe UI', 13, 'bold'), bg=self.MC.surface_alt,
            fg=self.MC.text, selectcolor=self.MC.surface_alt,
            activebackground=self.MC.surface_alt,
        ).pack(side=tk.LEFT)

        # Status badge
        status_badge = tk.Frame(master_inner, bg=self.MC.surface_alt)
        status_badge.pack(side=tk.RIGHT)
        enabled = self.auto_master_var.get()
        badge_color = self.MC.success if enabled else self.MC.text_muted
        badge_text = '●  ACTIVE' if enabled else '○  DISABLED'
        tk.Label(status_badge, text=badge_text, font=('Segoe UI', 8, 'bold'),
                 bg=badge_color, fg='#ffffff', padx=10, pady=3).pack()

        tk.Label(master_inner, text='Master switch for all automatic SMS', font=('Segoe UI', 9),
                 bg=self.MC.surface_alt, fg=self.MC.text_muted).pack(anchor='w', padx=(30, 0), pady=(4, 0))

        # Scrollable events
        scroll_frame = tk.Frame(card, bg=self.MC.surface)
        scroll_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 10))

        canvas = tk.Canvas(scroll_frame, bg=self.MC.surface, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(scroll_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        events_frame = tk.Frame(canvas, bg=self.MC.surface)
        win = canvas.create_window((0, 0), window=events_frame, anchor='nw')
        events_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        self.auto_event_vars = {}
        self.auto_event_texts = {}

        for setting_key, label, template_cat, description in AUTO_EVENTS:
            event_card = tk.Frame(events_frame, bg=self.MC.surface_alt,
                                  highlightthickness=1, highlightbackground=self.MC.border)
            event_card.pack(fill=tk.X, pady=(0, 10))

            header = tk.Frame(event_card, bg=self.MC.surface_alt)
            header.pack(fill=tk.X, padx=16, pady=(10, 4))

            var = tk.BooleanVar(value=get_setting(setting_key, '0') == '1')
            self.auto_event_vars[setting_key] = var

            tk.Checkbutton(
                header, text=f'  {label}', variable=var,
                font=('Segoe UI', 10, 'bold'), bg=self.MC.surface_alt,
                fg=self.MC.text, selectcolor=self.MC.surface_alt,
                activebackground=self.MC.surface_alt,
            ).pack(side=tk.LEFT)

            status_text = '● Active' if var.get() else '○ Inactive'
            status_color = self.MC.success if var.get() else self.MC.text_muted
            tk.Label(header, text=status_text, font=('Segoe UI', 8),
                     bg=self.MC.surface_alt, fg=status_color).pack(side=tk.RIGHT)

            tk.Label(event_card, text=description, font=('Segoe UI', 9),
                     bg=self.MC.surface_alt, fg=self.MC.text_muted).pack(anchor='w', padx=16, pady=(0, 6))

            tpl_label = tk.Label(event_card, text='Template:', font=('Segoe UI', 9, 'bold'),
                     bg=self.MC.surface_alt, fg=self.MC.text)
            tpl_label.pack(anchor='w', padx=16)

            # Template editor row: text widget + placeholder panel side-by-side
            tpl_row = tk.Frame(event_card, bg=self.MC.surface_alt)
            tpl_row.pack(fill=tk.X, padx=16, pady=(4, 14))
            tpl_row.grid_columnconfigure(0, weight=3)
            tpl_row.grid_columnconfigure(1, weight=1)

            text_widget = self._message_box(tpl_row, height=10)
            text_widget.grid(row=0, column=0, sticky='nsew', padx=(0, 8))
            self._set_text(text_widget, self._template_body(template_cat, f'Dear {{{{customer_name}}}},\n\n{{{{message}}}}\n\nTicket: {{{{ticket_no}}}}\n{{{{company_name}}}}'))
            self.auto_event_texts[template_cat] = text_widget

            # Placeholder panel for this event
            ph_frame = tk.Frame(tpl_row, bg=self.MC.surface_alt)
            ph_frame.grid(row=0, column=1, sticky='nsew')
            event_placeholder = self._placeholder_panel(ph_frame, text_widget)
            event_placeholder.pack(fill=tk.BOTH, expand=True)

        btn_row = tk.Frame(card, bg=self.MC.surface)
        btn_row.pack(fill=tk.X, padx=16, pady=(0, 14))
        self._modern_button(btn_row, 'Save All Auto SMS Settings', self._save_auto_settings,
                            kind='primary', width=28, pady=8, icon='💾').pack(side=tk.LEFT)

    def _save_auto_settings(self):
        # Save master switch
        set_setting('sms_enabled', '1' if self.auto_master_var.get() else '0', user_id=self.user['id'])

        # Save each event toggle + template
        for setting_key, label, template_cat, _ in AUTO_EVENTS:
            var = self.auto_event_vars.get(setting_key)
            if var:
                set_setting(setting_key, '1' if var.get() else '0', user_id=self.user['id'])
            text_widget = self.auto_event_texts.get(template_cat)
            if text_widget:
                body = self._get_text(text_widget)
                save_sms_template(template_cat, label, body, True, self.user['id'])
                self.templates[template_cat] = {'title': label, 'body': body, 'is_active': 1}

        messagebox.showinfo('Success', 'All auto SMS settings and templates saved.')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 3 — Promotions (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_promotion_tab(self):
        self._clear(self.promo_tab)
        card = self._glass_card(self.promo_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'Promotion SMS', '📢').pack(side=tk.LEFT)
        self._desc_label(card, 'Send promotional messages to selected customers or your entire customer list.').pack(anchor='w', padx=16, pady=(0, 10))

        body = tk.Frame(card, bg=self.MC.surface)
        body.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        # Left — Customer selection
        left = tk.Frame(body, bg=self.MC.surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 10))

        tk.Label(left, text='👥  Recipients', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 6))

        filter_row = tk.Frame(left, bg=self.MC.surface)
        filter_row.pack(fill=tk.X, pady=(0, 6))
        self.promo_search_var = tk.StringVar()
        search_e = self.theme.make_entry(filter_row, variable=self.promo_search_var)
        search_e.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        search_e.entry.bind('<KeyRelease>', lambda _: self._refresh_promo_customers())

        self.promo_select_all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(left, text='Select All Customers', variable=self.promo_select_all_var,
                       command=self._toggle_promo_select_all,
                       bg=self.MC.surface, fg=self.MC.text,
                       selectcolor=self.MC.surface, font=('Segoe UI', 9, 'bold'),
                       activebackground=self.MC.surface).pack(anchor='w', pady=(0, 4))

        self.promo_selected_ids = set()
        self.promo_row_vars = {}

        list_frame = tk.Frame(left, bg=self.MC.surface)
        list_frame.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_frame, bg=self.MC.surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.promo_rows_frame = tk.Frame(canvas, bg=self.MC.surface)
        canvas.create_window((0, 0), window=self.promo_rows_frame, anchor='nw')
        self.promo_rows_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))

        self.promo_count_var = tk.StringVar(value='0 recipients')
        tk.Label(left, textvariable=self.promo_count_var, font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))

        # Right — Message composer with placeholder panel
        right = tk.Frame(body, bg=self.MC.surface)
        right.grid(row=0, column=1, sticky='nsew')
        right.grid_columnconfigure(0, weight=3)
        right.grid_columnconfigure(1, weight=1)
        right.grid_rowconfigure(1, weight=1)

        # Composer area (left)
        composer_area = tk.Frame(right, bg=self.MC.surface)
        composer_area.grid(row=0, column=0, rowspan=3, sticky='nsew', padx=(0, 8))

        tk.Label(composer_area, text='✉️  Promotion Message', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 6))

        self.promo_message_text = self._message_box(composer_area, height=10)
        self.promo_message_text.pack(fill=tk.BOTH, expand=True)
        self._set_text(self.promo_message_text,
                       self._template_body('promotion', '{{company_name}} has a special offer for you!\n\nContact us today for exclusive gold loan rates.\n\n📞 {{company_phone}}'))

        counter_lbl = self._char_counter(composer_area, self.promo_message_text)
        counter_lbl.pack(anchor='e', pady=(4, 0))

        btn_row = tk.Frame(composer_area, bg=self.MC.surface)
        btn_row.pack(fill=tk.X, pady=(10, 0))
        self._modern_button(btn_row, 'Preview', self._preview_promo_sms,
                            kind='ghost', width=10, pady=8, icon='👁️').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Save Template', self._save_promo_template,
                            kind='ghost', width=12, pady=8, icon='💾').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Send Promotion', self._send_promotion_sms,
                            kind='primary', width=16, pady=8, icon='📤').pack(side=tk.LEFT)

        # Placeholder panel (right column)
        ph_frame = tk.Frame(right, bg=self.MC.surface)
        ph_frame.grid(row=0, column=1, rowspan=3, sticky='nsew')
        promo_placeholder_panel = self._placeholder_panel(ph_frame, self.promo_message_text)
        promo_placeholder_panel.pack(fill=tk.BOTH, expand=True)

        self._refresh_promo_customers()

    def _preview_promo_sms(self):
        """Preview the promotion message."""
        raw_message = self._get_text(self.promo_message_text)
        if not raw_message:
            self._toast('Preview', 'Message is empty.', 'warning')
            return
        sample = None
        all_customers = search_customers('')
        for cid in list(self.promo_selected_ids)[:1]:
            for c in all_customers:
                if c['id'] == cid:
                    sample = c
                    break
        if not sample and all_customers:
            sample = all_customers[0]
        context = build_sms_context(customer=sample, message=raw_message)
        rendered = render_template(raw_message, context)
        dialog = tk.Toplevel(self.container)
        dialog.title('📢 Promotion Preview')
        dialog.geometry('480x320')
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()
        main = tk.Frame(dialog, bg=self.MC.surface)
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        tk.Label(main, text='📢  Promotion Preview', font=('Segoe UI', 14, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w')
        box = tk.Text(main, height=8, wrap='word',
                       bg=self.MC.surface_alt, fg=self.MC.text,
                       font=('Segoe UI', 10), relief='flat', padx=8, pady=6)
        box.insert('1.0', rendered)
        box.configure(state='disabled')
        box.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        if sample:
            tk.Label(main, text=f'Preview context: {sample.get("name", "N/A")}',
                     font=('Segoe UI', 8), bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))
        self._modern_button(main, 'Close', dialog.destroy, kind='ghost', width=10, pady=6).pack(pady=(10, 0))

    def _refresh_promo_customers(self):
        query = self.promo_search_var.get().strip()
        results = search_customers(query)
        self.promo_results = results

        for w in self.promo_rows_frame.winfo_children():
            w.destroy()
        self.promo_row_vars.clear()

        for customer in results:
            cid = customer['id']
            var = tk.BooleanVar(value=cid in self.promo_selected_ids)
            self.promo_row_vars[cid] = var
            row = tk.Frame(self.promo_rows_frame, bg=self.MC.surface)
            row.pack(fill=tk.X, pady=1)
            tk.Checkbutton(
                row, text=f"{customer['name']}  •  {customer['phone']}",
                variable=var, command=lambda c=cid: self._toggle_promo_customer(c),
                bg=self.MC.surface, fg=self.MC.text,
                selectcolor=self.MC.surface, font=('Segoe UI', 9),
                anchor='w', activebackground=self.MC.surface,
            ).pack(side=tk.LEFT, anchor='w')

        self._update_promo_count()

    def _toggle_promo_customer(self, cid):
        var = self.promo_row_vars.get(cid)
        if var and var.get():
            self.promo_selected_ids.add(cid)
        else:
            self.promo_selected_ids.discard(cid)
        self._update_promo_count()

    def _toggle_promo_select_all(self):
        select_all = self.promo_select_all_var.get()
        for cid, var in self.promo_row_vars.items():
            var.set(select_all)
            if select_all:
                self.promo_selected_ids.add(cid)
            else:
                self.promo_selected_ids.discard(cid)
        self._update_promo_count()

    def _update_promo_count(self):
        n = len(self.promo_selected_ids)
        self.promo_count_var.set(f'{n} recipient{"s" if n != 1 else ""}')

    def _save_promo_template(self):
        body = self._get_text(self.promo_message_text)
        save_sms_template('promotion', 'Promotion SMS', body, True, self.user['id'])
        self.templates['promotion'] = {'title': 'Promotion SMS', 'body': body, 'is_active': 1}
        self._toast('Success', 'Promotion template saved.', 'success')

    def _send_promotion_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.promo_message_text)
        if not raw_message:
            self._toast('SMS', 'Promotion message cannot be empty.', 'warning')
            return

        customers = []
        if self.promo_selected_ids:
            all_customers = search_customers('')
            customers = [c for c in all_customers if c['id'] in self.promo_selected_ids]
        else:
            self._toast('SMS', 'Select at least one customer.', 'warning')
            return

        if not messagebox.askyesno('Confirm', f'Send promotion SMS to {len(customers)} customer{"s" if len(customers) > 1 else ""}?'):
            return

        sent = failed = 0
        for customer in customers:
            context = build_sms_context(customer=customer, message=raw_message)
            message = render_template(raw_message, context)
            ok, _, _ = send_sms(customer.get('phone', ''), message, customer=customer,
                                category='promotion', sent_by=self.user['id'])
            if ok:
                sent += 1
            else:
                failed += 1

        self._toast('Promotion SMS', f'✅ Sent: {sent}\n❌ Failed: {failed}',
                    'success' if failed == 0 else 'warning')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 4 — Birthday Wishes
    # ══════════════════════════════════════════════════════════════════════

    # ══════════════════════════════════════════════════════════════════════
    # TAB 4 — Birthday Wishes (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_birthday_tab(self):
        self._clear(self.birthday_tab)
        card = self._glass_card(self.birthday_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'Birthday Wishes & Automation', '🎂').pack(side=tk.LEFT)
        self._desc_label(card, 'Manage automated birthday greetings and send custom wishes immediately or scheduled.').pack(anchor='w', padx=16, pady=(0, 10))

        body = tk.Frame(card, bg=self.MC.surface)
        body.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1, minsize=480)
        body.grid_columnconfigure(1, weight=1, minsize=480)
        body.grid_rowconfigure(0, weight=1)

        # Left — Customers & Filtering
        left = tk.Frame(body, bg=self.MC.surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 15))

        filter_frame = tk.Frame(left, bg=self.MC.surface)
        filter_frame.pack(fill=tk.X, pady=(0, 10))

        search_row = tk.Frame(filter_frame, bg=self.MC.surface)
        search_row.pack(fill=tk.X, pady=2)
        
        tk.Label(search_row, text='🔍 Search:', font=('Segoe UI', 9),
                 bg=self.MC.surface, fg=self.MC.text_muted, width=8, anchor='w').pack(side=tk.LEFT)
        self.bday_search_var = tk.StringVar()
        search_entry = tk.Entry(
            search_row, textvariable=self.bday_search_var, font=('Segoe UI', 9),
            bg=self.MC.surface_alt, fg=self.MC.text,
            relief='flat', highlightthickness=1, highlightbackground=self.MC.border,
            highlightcolor=self.MC.primary
        )
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))
        self.bday_search_var.trace_add('write', lambda *_: self._refresh_birthdays())

        filter_row = tk.Frame(filter_frame, bg=self.MC.surface)
        filter_row.pack(fill=tk.X, pady=4)

        tk.Label(filter_row, text='Birthday:', font=('Segoe UI', 9),
                 bg=self.MC.surface, fg=self.MC.text_muted, width=8, anchor='w').pack(side=tk.LEFT)
        
        self.bday_added_filter_var = tk.StringVar(value='All Customers')
        added_combo = self.theme.make_combobox(
            filter_row, variable=self.bday_added_filter_var,
            values=['All Customers', 'Birthday Added', 'Birthday Missing'], width=16
        )
        added_combo.pack(side=tk.LEFT, padx=(4, 10))
        added_combo.bind('<<ComboboxSelected>>', lambda _: self._refresh_birthdays())

        tk.Label(filter_row, text='Upcoming:', font=('Segoe UI', 9),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.LEFT)
        
        self.bday_range_var = tk.StringVar(value='30 days')
        range_combo = self.theme.make_combobox(
            filter_row, variable=self.bday_range_var,
            values=['Today', '7 days', '14 days', '30 days', '60 days', '90 days', 'All'], width=10
        )
        range_combo.pack(side=tk.LEFT, padx=(4, 0))
        range_combo.bind('<<ComboboxSelected>>', lambda _: self._refresh_birthdays())

        self.bday_select_all_var = tk.BooleanVar(value=False)
        self.bday_select_all_chk = tk.Checkbutton(
            left, text='Select All', variable=self.bday_select_all_var,
            command=self._toggle_bday_select_all,
            bg=self.MC.surface, fg=self.MC.text,
            selectcolor=self.MC.surface, font=('Segoe UI', 9, 'bold'),
            activebackground=self.MC.surface
        )
        self.bday_select_all_chk.pack(anchor='w', pady=(0, 6))

        self.bday_selected_ids = set()
        self.bday_row_vars = {}

        list_container = tk.Frame(left, bg=self.MC.surface, highlightthickness=1, highlightbackground=self.MC.border)
        list_container.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_container, bg=self.MC.surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_container, orient=tk.VERTICAL, command=canvas.yview)
        hbar = ttk.Scrollbar(list_container, orient=tk.HORIZONTAL, command=canvas.xview)
        canvas.configure(yscrollcommand=vbar.set, xscrollcommand=hbar.set)
        
        canvas.grid(row=0, column=0, sticky='nsew')
        vbar.grid(row=0, column=1, sticky='ns')
        hbar.grid(row=1, column=0, sticky='ew')
        list_container.grid_rowconfigure(0, weight=1)
        list_container.grid_columnconfigure(0, weight=1)

        self.bday_rows_frame = tk.Frame(canvas, bg=self.MC.surface)
        win = canvas.create_window((0, 0), window=self.bday_rows_frame, anchor='nw')
        
        def update_frame_width(*_):
            canvas.configure(scrollregion=canvas.bbox('all'))
            req_width = self.bday_rows_frame.winfo_reqwidth()
            canvas_width = max(1, canvas.winfo_width())
            width = max(req_width, canvas_width)
            canvas.itemconfigure(win, width=width)

        self.bday_rows_frame.bind('<Configure>', update_frame_width)
        canvas.bind('<Configure>', update_frame_width)

        self.bday_count_var = tk.StringVar(value='')
        tk.Label(left, textvariable=self.bday_count_var, font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))

        # Right — Automation Settings & Composer
        right = tk.Frame(body, bg=self.MC.surface)
        right.grid(row=0, column=1, sticky='nsew')

        # Automation settings card
        auto_card = tk.Frame(right, bg=self.MC.surface_alt, highlightthickness=1, highlightbackground=self.MC.border)
        auto_card.pack(fill=tk.X, pady=(0, 12), padx=16, ipadx=16, ipady=12)
        
        tk.Label(auto_card, text='⚙️  Automated Birthday Wishes Settings', font=('Segoe UI', 10, 'bold'),
                 bg=auto_card['bg'], fg=self.MC.text).pack(anchor='w', pady=(0, 6))

        self.bday_auto_enabled_var = tk.BooleanVar(value=get_setting('sms_birthday_auto_enabled', '0') == '1')
        chk_auto = tk.Checkbutton(
            auto_card, text='Enable Birthday SMS Automation', variable=self.bday_auto_enabled_var,
            bg=auto_card['bg'], fg=self.MC.text, selectcolor=self.MC.surface_alt,
            font=('Segoe UI', 9), activebackground=auto_card['bg']
        )
        chk_auto.pack(anchor='w', pady=4)

        time_row = tk.Frame(auto_card, bg=auto_card['bg'])
        time_row.pack(fill=tk.X, pady=4)
        
        tk.Label(time_row, text='Send Time:', font=('Segoe UI', 9),
                 bg=auto_card['bg'], fg=self.MC.text).pack(side=tk.LEFT)

        stored_time = get_setting('sms_birthday_time', '09:00')
        try:
            sh, sm = stored_time.split(':')
        except ValueError:
            sh, sm = '09', '00'

        self.bday_hour_var = tk.StringVar(value=sh)
        self.bday_min_var = tk.StringVar(value=sm)

        hour_combo = self.theme.make_combobox(time_row, variable=self.bday_hour_var,
                                              values=[f"{h:02d}" for h in range(24)], width=4)
        hour_combo.pack(side=tk.LEFT, padx=(8, 2))
        tk.Label(time_row, text=':', bg=auto_card['bg'], fg=self.MC.text).pack(side=tk.LEFT)
        min_combo = self.theme.make_combobox(time_row, variable=self.bday_min_var,
                                             values=[f"{m:02d}" for m in [0, 15, 30, 45]], width=4)
        min_combo.pack(side=tk.LEFT, padx=(2, 8))

        self._modern_button(time_row, 'Save Settings', self._save_birthday_settings,
                            kind='ghost', width=12, pady=4, icon='💾').pack(side=tk.LEFT)

        last_run = get_setting('sms_birthday_last_run_date', 'Never')
        self.bday_last_run_lbl = tk.Label(
            auto_card, text=f"Last run date: {last_run}", font=('Segoe UI', 8),
            bg=auto_card['bg'], fg=self.MC.text_muted
        )
        self.bday_last_run_lbl.pack(anchor='w', pady=(4, 0))

        # Compose message
        compose_lbl_row = tk.Frame(right, bg=self.MC.surface)
        compose_lbl_row.pack(fill=tk.X, pady=(0, 6))
        
        tk.Label(compose_lbl_row, text='🎉  Birthday Message Template', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(side=tk.LEFT)

        bday_templates = [t for t in list_sms_templates() if t['category'] == 'birthday']
        self.bday_template_var = tk.StringVar()
        
        def on_template_select(*_):
            title = self.bday_template_var.get()
            for t in list_sms_templates():
                if t['title'] == title and t['category'] == 'birthday':
                    self._set_text(self.bday_message_text, t['body'])
                    break

        bday_template_titles = [t['title'] for t in bday_templates]
        if not bday_template_titles:
            default_body = 'Dear {{customer_name}},\n\nWishing you a very Happy Birthday! 🎂🎉\n\nMay this year bring you happiness and prosperity.\n\nWarm wishes,\n{{company_name}}'
            save_sms_template('birthday', 'Default Birthday Wishes', default_body, True, self.user['id'])
            bday_template_titles = ['Default Birthday Wishes']
            self.templates['birthday'] = {'title': 'Default Birthday Wishes', 'body': default_body}

        self.bday_template_var.set(bday_template_titles[0])
        template_combo = self.theme.make_combobox(compose_lbl_row, variable=self.bday_template_var,
                                                  values=bday_template_titles, width=22)
        template_combo.pack(side=tk.RIGHT)
        self.bday_template_var.trace_add('write', on_template_select)

        editor_frame = tk.Frame(right, bg=self.MC.surface)
        editor_frame.pack(fill=tk.BOTH, expand=True)

        composer_part = tk.Frame(editor_frame, bg=self.MC.surface)
        composer_part.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

        self.bday_message_text = self._message_box(composer_part, height=8)
        self.bday_message_text.pack(fill=tk.BOTH, expand=True)
        
        initial_body = ''
        for t in list_sms_templates():
            if t['title'] == self.bday_template_var.get() and t['category'] == 'birthday':
                initial_body = t['body']
                break
        if not initial_body:
            initial_body = self._template_body('birthday', 'Dear {{customer_name}},\n\nWishing you a very Happy Birthday! 🎂🎉\n\nMay this year bring you happiness and prosperity.\n\nWarm wishes,\n{{company_name}}')
        self._set_text(self.bday_message_text, initial_body)

        counter_lbl = self._char_counter(composer_part, self.bday_message_text)
        counter_lbl.pack(anchor='e', pady=(4, 0))

        placeholder_pane = self._placeholder_panel(editor_frame, self.bday_message_text)
        placeholder_pane.pack(side=tk.RIGHT, fill=tk.Y)

        btn_row = tk.Frame(right, bg=self.MC.surface)
        btn_row.pack(fill=tk.X, pady=(10, 0))
        
        self._modern_button(btn_row, 'Preview', self._preview_birthday_sms,
                            kind='ghost', width=10, pady=8, icon='👁️').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Save Template', self._save_birthday_template,
                            kind='ghost', width=12, pady=8, icon='💾').pack(side=tk.LEFT, padx=(0, 6))
        self._modern_button(btn_row, 'Schedule', self._schedule_birthday_sms,
                            kind='secondary', width=12, pady=8, icon='📅').pack(side=tk.RIGHT)
        self._modern_button(btn_row, 'Send Wishes', self._send_birthday_sms,
                            kind='primary', width=14, pady=8, icon='🎂').pack(side=tk.RIGHT, padx=(0, 8))

        self._refresh_birthdays()

    def _refresh_birthdays(self):
        query = self.bday_search_var.get().strip()
        
        added_filter_map = {
            'All Customers': 'all',
            'Birthday Added': 'added',
            'Birthday Missing': 'missing'
        }
        range_filter_map = {
            'Today': 'today',
            '7 days': '7',
            '14 days': '14',
            '30 days': '30',
            '60 days': '60',
            '90 days': '90',
            'All': 'all'
        }
        
        added_filter = added_filter_map.get(self.bday_added_filter_var.get(), 'all')
        range_filter = range_filter_map.get(self.bday_range_var.get(), '30')

        # Fetch matching customers from DB
        customers = search_customers(query)
        wished_ids = get_wished_customer_ids_this_year()
        
        processed_customers = []
        today = datetime.now().date()

        for c in customers:
            bday_str = c.get('birthday', '')
            days_until = None
            next_bday_str = ''
            
            if bday_str and len(bday_str) == 10:
                try:
                    bday = datetime.strptime(bday_str, '%Y-%m-%d').date()
                    next_bday = bday.replace(year=today.year)
                    if next_bday < today:
                        next_bday = next_bday.replace(year=today.year + 1)
                    days_until = (next_bday - today).days
                    next_bday_str = next_bday.strftime('%Y-%m-%d')
                except Exception:
                    bday_str = ''
            
            c['days_until'] = days_until
            c['next_birthday'] = next_bday_str
            
            if added_filter == 'added' and not bday_str:
                continue
            if added_filter == 'missing' and bday_str:
                continue
                
            if bday_str:
                if range_filter == 'today' and days_until != 0:
                    continue
                elif range_filter in ['7', '14', '30', '60', '90']:
                    limit_days = int(range_filter)
                    if days_until is None or days_until > limit_days:
                        continue
            else:
                if range_filter != 'all':
                    continue
                    
            processed_customers.append(c)

        # Sort: birthdays first by countdown, missing last
        def sort_key(cust):
            du = cust.get('days_until')
            if du is not None:
                return (0, du, cust.get('name', ''))
            else:
                return (1, 0, cust.get('name', ''))

        processed_customers.sort(key=sort_key)
        self.bday_customers = processed_customers

        for w in self.bday_rows_frame.winfo_children():
            w.destroy()
        self.bday_row_vars.clear()

        if not processed_customers:
            tk.Label(self.bday_rows_frame, text='No customers match filters.',
                     font=('Segoe UI', 9), bg=self.MC.surface,
                     fg=self.MC.text_muted).pack(anchor='w', padx=14, pady=12)
            self.bday_count_var.set('0 customers listed')
            return

        for c in processed_customers:
            cid = c['id']
            has_bday = bool(c.get('birthday'))
            var = tk.BooleanVar(value=cid in self.bday_selected_ids if has_bday else False)
            self.bday_row_vars[cid] = var

            row = tk.Frame(self.bday_rows_frame, bg=self.MC.surface)
            row.pack(fill=tk.X, pady=4, padx=6)
            
            left_flow = tk.Frame(row, bg=row['bg'])
            left_flow.pack(side=tk.LEFT, fill=tk.Y)
            
            if has_bday:
                chk = tk.Checkbutton(
                    left_flow, variable=var, command=lambda cid=cid: self._toggle_bday_customer(cid),
                    bg=row['bg'], selectcolor=self.MC.surface,
                    activebackground=row['bg']
                )
                chk.pack(side=tk.LEFT, padx=(4, 8))
            else:
                lbl_spacer = tk.Label(left_flow, text='     ', bg=row['bg'])
                lbl_spacer.pack(side=tk.LEFT, padx=(4, 8))

            name_lbl = tk.Label(
                left_flow, text=f"{c['name']} • {c['phone']}",
                font=('Segoe UI', 9, 'bold') if has_bday else ('Segoe UI', 9),
                bg=row['bg'], fg=self.MC.text if has_bday else self.MC.text_muted
            )
            name_lbl.pack(side=tk.LEFT, anchor='w')

            right_flow = tk.Frame(row, bg=row['bg'])
            right_flow.pack(side=tk.RIGHT, fill=tk.Y)

            days_until = c.get('days_until')
            if not has_bday:
                badge_text = '⚠️ Missing Birthday'
                badge_color = self.MC.text_muted
                badge_bg = '#f3f4f6'
            elif days_until == 0:
                badge_text = '🎉 TODAY!'
                badge_color = '#ffffff'
                badge_bg = self.MC.danger
            elif days_until == 1:
                badge_text = '🎂 Tomorrow!'
                badge_color = '#ffffff'
                badge_bg = self.MC.warning
            else:
                badge_text = f'In {days_until} days'
                badge_color = self.MC.text
                badge_bg = '#e2e8f0'

            if cid in wished_ids:
                wished_lbl = tk.Label(
                    right_flow, text=f"✓ Sent '{datetime.now().strftime('%y')}", font=('Segoe UI', 8),
                    fg='#ffffff', bg='#0f766e', padx=6, pady=2
                )
                wished_lbl.pack(side=tk.LEFT, padx=(0, 6))

            badge_lbl = tk.Label(
                right_flow, text=badge_text, font=('Segoe UI', 8),
                fg=badge_color, bg=badge_bg, padx=6, pady=2
            )
            badge_lbl.pack(side=tk.LEFT, padx=(0, 10))

            btn_edit = self._modern_button(
                right_flow, 'Edit', lambda cust=c: self._open_edit_birthday_dialog(cust),
                kind='ghost', width=4, pady=2, icon='✏️'
            )
            btn_edit.pack(side=tk.LEFT, padx=(0, 4))

        self.bday_count_var.set(f"{len(processed_customers)} customer{'s' if len(processed_customers) != 1 else ''} listed")

    def _preview_birthday_sms(self):
        """Preview the birthday message."""
        raw_message = self._get_text(self.bday_message_text)
        if not raw_message:
            self._toast('Preview', 'Message is empty.', 'warning')
            return
        sample = None
        for c in self.bday_customers[:1]:
            sample = c
        context = build_sms_context(customer=sample, message=raw_message)
        rendered = render_template(raw_message, context)
        dialog = tk.Toplevel(self.container)
        dialog.title('🎂 Birthday Preview')
        dialog.geometry('480x320')
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()
        main = tk.Frame(dialog, bg=self.MC.surface)
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)
        tk.Label(main, text='🎂  Birthday Preview', font=('Segoe UI', 14, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w')
        box = tk.Text(main, height=8, wrap='word',
                       bg=self.MC.surface_alt, fg=self.MC.text,
                       font=('Segoe UI', 10), relief='flat', padx=8, pady=6)
        box.insert('1.0', rendered)
        box.configure(state='disabled')
        box.pack(fill=tk.BOTH, expand=True, pady=(10, 0))
        if sample:
            tk.Label(main, text=f'Preview context: {sample.get("name", "N/A")}',
                     font=('Segoe UI', 8), bg=self.MC.surface, fg=self.MC.text_muted).pack(anchor='w', pady=(4, 0))
        self._modern_button(main, 'Close', dialog.destroy, kind='ghost', width=10, pady=6).pack(pady=(10, 0))

    def _toggle_bday_customer(self, cid):
        var = self.bday_row_vars.get(cid)
        if var and var.get():
            self.bday_selected_ids.add(cid)
        else:
            self.bday_selected_ids.discard(cid)

    def _toggle_bday_select_all(self):
        select_all = self.bday_select_all_var.get()
        for cid, var in self.bday_row_vars.items():
            has_bday = any(c['id'] == cid and c.get('birthday') for c in self.bday_customers)
            if has_bday:
                var.set(select_all)
                if select_all:
                    self.bday_selected_ids.add(cid)
                else:
                    self.bday_selected_ids.discard(cid)
            else:
                var.set(False)

    def _open_edit_birthday_dialog(self, customer):
        dialog = tk.Toplevel(self.container)
        dialog.title(f"Edit Birthday - {customer['name']}")
        dialog.geometry("380x200")
        dialog.resizable(False, False)
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()

        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.MC.surface)
        main_frm.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(
            main_frm, text=f"Set Birthday for {customer['name']}",
            font=('Segoe UI', 10, 'bold'), bg=dialog['bg'], fg=self.MC.text
        ).pack(anchor='w', pady=(0, 10))

        tk.Label(
            main_frm, text="Format: YYYY-MM-DD (e.g. 1990-05-15)",
            font=('Segoe UI', 8), bg=dialog['bg'], fg=self.MC.text_muted
        ).pack(anchor='w', pady=(0, 4))

        bday_var = tk.StringVar(value=customer.get('birthday', '') or '')
        entry = tk.Entry(
            main_frm, textvariable=bday_var, font=('Segoe UI', 9),
            bg=self.MC.surface_alt, fg=self.MC.text,
            relief='flat', highlightthickness=1, highlightcolor=self.MC.primary,
            highlightbackground=self.MC.border
        )
        entry.pack(fill=tk.X, pady=(0, 20), ipady=4)
        entry.focus_set()

        btn_row = tk.Frame(main_frm, bg=dialog['bg'])
        btn_row.pack(fill=tk.X)

        def save():
            val = bday_var.get().strip()
            if val:
                try:
                    datetime.strptime(val, "%Y-%m-%d")
                except ValueError:
                    messagebox.showerror("Error", "Invalid birthday format. Please use YYYY-MM-DD.", parent=dialog)
                    return
            
            update_customer_birthday(customer['id'], val)
            dialog.destroy()
            self._refresh_birthdays()
            self._toast('Success', f"Birthday updated for {customer['name']}.", 'success')

        self._modern_button(btn_row, 'Save', save, kind='primary', width=10).pack(side=tk.RIGHT)
        self._modern_button(btn_row, 'Cancel', dialog.destroy, kind='ghost', width=10).pack(side=tk.RIGHT, padx=(0, 8))

    def _save_birthday_settings(self):
        auto_enabled = '1' if self.bday_auto_enabled_var.get() else '0'
        send_time = f"{self.bday_hour_var.get()}:{self.bday_min_var.get()}"
        
        set_setting('sms_birthday_auto_enabled', auto_enabled, 'Whether automated birthday SMS is enabled', self.user['id'])
        set_setting('sms_birthday_time', send_time, 'Daily time to send automated birthday SMS', self.user['id'])
        
        self._toast('Success', 'Birthday automation settings saved.', 'success')

    def _save_birthday_template(self):
        body = self._get_text(self.bday_message_text)
        title = self.bday_template_var.get()
        save_sms_template('birthday', title, body, True, self.user['id'])
        self.templates['birthday'] = {'title': title, 'body': body, 'is_active': 1}
        self._toast('Success', f'Birthday wishes template "{title}" saved.', 'success')

    def _send_birthday_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.bday_message_text)
        if not raw_message:
            self._toast('SMS', 'Birthday message cannot be empty.', 'warning')
            return

        customers = [c for c in self.bday_customers if c['id'] in self.bday_selected_ids]
        if not customers:
            self._toast('SMS', 'Select at least one customer with a birthday.', 'warning')
            return

        if not messagebox.askyesno('Confirm', f'Send birthday wishes to {len(customers)} customer{"s" if len(customers) > 1 else ""}?'):
            return

        self._open_sequential_sender_dialog(customers, raw_message)

    def _open_sequential_sender_dialog(self, customers, message_template):
        dialog = tk.Toplevel(self.container)
        dialog.title("Campaign Sequencer")
        dialog.geometry("550x450")
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()

        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.MC.surface)
        main_frm.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(
            main_frm, text="SMS Campaign Progress",
            font=('Segoe UI', 14, 'bold'), bg=dialog['bg'], fg=self.MC.text
        ).pack(anchor='w', pady=(0, 6))

        progress_var = tk.DoubleVar()
        progress_bar = ttk.Progressbar(main_frm, variable=progress_var, maximum=len(customers))
        progress_bar.pack(fill=tk.X, pady=(0, 10))

        status_lbl = tk.Label(
            main_frm, text=f"Preparing campaign for {len(customers)} recipients...",
            font=('Segoe UI', 9), bg=dialog['bg'], fg=self.MC.text
        )
        status_lbl.pack(anchor='w', pady=(0, 4))
        
        countdown_lbl = tk.Label(
            main_frm, text="",
            font=('Segoe UI', 10, 'bold'), bg=dialog['bg'], fg=self.MC.primary
        )
        countdown_lbl.pack(anchor='w', pady=(0, 10))

        log_box = tk.Text(
            main_frm, height=12, wrap='word',
            bg=self.MC.surface_alt, fg=self.MC.text,
            font=('Segoe UI', 8), relief='flat', bd=0, padx=8, pady=8
        )
        log_box.pack(fill=tk.BOTH, expand=True, pady=(0, 15))

        btn_row = tk.Frame(main_frm, bg=dialog['bg'])
        btn_row.pack(fill=tk.X)

        campaign_state = {
            'index': 0,
            'countdown': 0,
            'cancelled': False,
            'sent': 0,
            'failed': 0
        }

        def append_log(txt):
            log_box.insert(tk.END, f"[{datetime.now().strftime('%H:%M:%S')}] {txt}\n")
            log_box.see(tk.END)

        def stop_campaign():
            campaign_state['cancelled'] = True
            append_log("Campaign cancelled by user.")
            btn_stop.configure(text="Close", command=dialog.destroy)

        btn_stop = self._modern_button(btn_row, 'Stop Campaign', stop_campaign, kind='primary')
        btn_stop.pack(side=tk.RIGHT)

        def tick():
            if campaign_state['cancelled']:
                return

            idx = campaign_state['index']
            if idx >= len(customers):
                append_log(f"Campaign complete. Success: {campaign_state['sent']}, Failed: {campaign_state['failed']}")
                btn_stop.configure(text="Close", command=dialog.destroy)
                countdown_lbl.configure(text="Campaign Finished! 🎉", fg=self.MC.success)
                return

            if campaign_state['countdown'] > 0:
                countdown_lbl.configure(text=f"Next message in {campaign_state['countdown']} seconds...", fg=self.MC.primary)
                campaign_state['countdown'] -= 1
                dialog.after(1000, tick)
                return

            customer = customers[idx]
            recipient = customer.get('phone', '')
            context = build_sms_context(customer=customer, message=message_template)
            message = render_template(message_template, context)

            append_log(f"Sending to {customer['name']} ({recipient})...")
            
            ok, msg_text, _ = send_sms(
                recipient, message, customer=customer,
                category='birthday', sent_by=self.user['id']
            )

            if ok:
                campaign_state['sent'] += 1
                append_log(f"✅ Sent successfully to {customer['name']}.")
            else:
                campaign_state['failed'] += 1
                append_log(f"❌ Failed: {msg_text}")

            campaign_state['index'] += 1
            progress_var.set(campaign_state['index'])
            
            if campaign_state['index'] < len(customers):
                campaign_state['countdown'] = 3
                countdown_lbl.configure(text="Next message in 3 seconds...", fg=self.MC.primary)
                dialog.after(1000, tick)
            else:
                dialog.after(100, tick)

        tick()

    def _schedule_birthday_sms(self):
        raw_message = self._get_text(self.bday_message_text)
        if not raw_message:
            self._toast('SMS', 'Birthday message cannot be empty.', 'warning')
            return

        customers = [c for c in self.bday_customers if c['id'] in self.bday_selected_ids]
        if not customers:
            self._toast('SMS', 'Select at least one customer with a birthday.', 'warning')
            return

        dialog = tk.Toplevel(self.container)
        dialog.title("Schedule SMS Campaign")
        dialog.geometry("380x280")
        dialog.resizable(False, False)
        dialog.configure(bg=self.MC.surface)
        dialog.transient(self.container)
        dialog.grab_set()

        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.MC.surface)
        main_frm.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(
            main_frm, text=f"Schedule Wishes for {len(customers)} Customers",
            font=('Segoe UI', 10, 'bold'), bg=dialog['bg'], fg=self.MC.text
        ).pack(anchor='w', pady=(0, 10))

        tk.Label(main_frm, text="Scheduled Date (YYYY-MM-DD):", font=('Segoe UI', 8), bg=dialog['bg'], fg=self.MC.text_muted).pack(anchor='w', pady=(0, 4))
        date_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        date_entry = tk.Entry(
            main_frm, textvariable=date_var, font=('Segoe UI', 9),
            bg=self.MC.surface_alt, fg=self.MC.text,
            relief='flat', highlightthickness=1, highlightbackground=self.MC.border,
            highlightcolor=self.MC.primary
        )
        date_entry.pack(fill=tk.X, pady=(0, 10), ipady=4)

        tk.Label(main_frm, text="Scheduled Time (HH:MM):", font=('Segoe UI', 8), bg=dialog['bg'], fg=self.MC.text_muted).pack(anchor='w', pady=(0, 4))
        time_row = tk.Frame(main_frm, bg=dialog['bg'])
        time_row.pack(fill=tk.X, pady=(0, 20))

        h_var = tk.StringVar(value=datetime.now().strftime("%H"))
        m_var = tk.StringVar(value="00")

        hour_combo = self.theme.make_combobox(time_row, variable=h_var, values=[f"{h:02d}" for h in range(24)], width=5)
        hour_combo.pack(side=tk.LEFT)
        tk.Label(time_row, text=':', bg=dialog['bg'], fg=self.MC.text).pack(side=tk.LEFT, padx=4)
        min_combo = self.theme.make_combobox(time_row, variable=m_var, values=[f"{m:02d}" for m in range(0, 60, 5)], width=5)
        min_combo.pack(side=tk.LEFT)

        btn_row = tk.Frame(main_frm, bg=dialog['bg'])
        btn_row.pack(fill=tk.X)

        def save_schedule():
            d_val = date_var.get().strip()
            h_val = h_var.get()
            m_val = m_var.get()

            try:
                datetime.strptime(d_val, "%Y-%m-%d")
            except ValueError:
                messagebox.showerror("Error", "Invalid Date format. Use YYYY-MM-DD.", parent=dialog)
                return

            sched_datetime_str = f"{d_val} {h_val}:{m_val}:00"
            try:
                sched_dt = datetime.strptime(sched_datetime_str, "%Y-%m-%d %H:%M:%S")
                if sched_dt <= datetime.now():
                    messagebox.showerror("Error", "Scheduled time must be in the future.", parent=dialog)
                    return
            except ValueError:
                messagebox.showerror("Error", "Invalid date/time conversion.", parent=dialog)
                return

            for customer in customers:
                recipient = customer.get('phone', '')
                context = build_sms_context(customer=customer, message=raw_message)
                message = render_template(raw_message, context)

                add_scheduled_sms(
                    recipient=recipient,
                    message=message,
                    scheduled_time=sched_datetime_str,
                    category='birthday',
                    customer_id=customer['id']
                )

            dialog.destroy()
            self._toast('Scheduled', f"Successfully scheduled {len(customers)} messages for {sched_datetime_str}.", 'success')
            
            if hasattr(self, '_refresh_scheduled_queue'):
                self._refresh_scheduled_queue()

        self._modern_button(btn_row, 'Schedule', save_schedule, kind='primary', width=12).pack(side=tk.RIGHT)
        self._modern_button(btn_row, 'Cancel', dialog.destroy, kind='ghost', width=12).pack(side=tk.RIGHT, padx=(0, 8))

    # ══════════════════════════════════════════════════════════════════════
    # TAB 5 — Failed SMS Manager (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_failed_tab(self):
        self._clear(self.failed_tab)
        card = self._glass_card(self.failed_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'Failed SMS Manager', '❌').pack(side=tk.LEFT)
        self._desc_label(card, 'View all messages that failed to send. Select a row and click "Resend" to retry sending.').pack(anchor='w', padx=16, pady=(0, 10))

        header = tk.Frame(card, bg=self.MC.surface)
        header.pack(fill=tk.X, padx=16, pady=(0, 8))
        
        self._modern_button(header, 'Refresh List', self._refresh_failed_list,
                            kind='ghost', width=14, icon='🔄').pack(side=tk.RIGHT)
        self._modern_button(header, 'Resend Selected', self._resend_failed_sms,
                            kind='primary', width=18, icon='🔄').pack(side=tk.RIGHT, padx=(0, 8))

        list_frame = tk.Frame(card, bg=self.MC.surface)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))

        style = ttk.Style()
        style.configure("Failed.Treeview", font=('Segoe UI', 9), rowheight=30)
        style.configure("Failed.Treeview.Heading", font=('Segoe UI', 9, 'bold'))

        self.failed_tree = ttk.Treeview(
            list_frame, columns=('id', 'recipient', 'customer', 'category', 'message', 'failed_at'),
            show='headings', style="Failed.Treeview"
        )
        self.failed_tree.heading('id', text='ID')
        self.failed_tree.heading('recipient', text='Recipient')
        self.failed_tree.heading('customer', text='Customer')
        self.failed_tree.heading('category', text='Category')
        self.failed_tree.heading('message', text='Message Preview')
        self.failed_tree.heading('failed_at', text='Failed At')

        self.failed_tree.column('id', width=60, anchor='center')
        self.failed_tree.column('recipient', width=120, anchor='w')
        self.failed_tree.column('customer', width=150, anchor='w')
        self.failed_tree.column('category', width=100, anchor='center')
        self.failed_tree.column('message', width=350, anchor='w')
        self.failed_tree.column('failed_at', width=150, anchor='center')

        self.failed_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.failed_tree.yview)
        self.failed_tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self._refresh_failed_list()

    def _refresh_failed_list(self):
        for item in self.failed_tree.get_children():
            self.failed_tree.delete(item)

        failed_msgs = list_sms_messages_filtered(status='failed', limit=100)
        for msg in failed_msgs:
            customer_display = f"{msg['customer_name']} ({msg['customer_nic']})" if msg['customer_name'] else 'Manual Number'
            category_label = CATEGORY_LABELS.get(msg['category'], msg['category'].capitalize())
            self.failed_tree.insert(
                '', tk.END, iid=str(msg['id']),
                values=(
                    msg['id'],
                    msg['recipient'],
                    customer_display,
                    category_label,
                    msg['message'],
                    msg['updated_at']
                )
            )

    def _resend_failed_sms(self):
        if not self._check_internet():
            return
        selected_item = self.failed_tree.focus()
        if not selected_item:
            self._toast('Warning', 'Please select a failed SMS message from the list.', 'warning')
            return

        values = self.failed_tree.item(selected_item, 'values')
        msg_id = int(values[0])
        recipient = values[1]
        
        conn = get_connection()
        row = conn.execute("SELECT message, category, customer_id, loan_id FROM sms_messages WHERE id = ?", (msg_id,)).fetchone()
        conn.close()
        
        if not row:
            self._toast('Error', 'Failed to retrieve the message content from the database.', 'error')
            return
            
        message = row['message']
        category = row['category']
        customer_id = row['customer_id']
        loan_id = row['loan_id']
        
        customer = None
        if customer_id:
            customer = get_customer(customer_id)

        ok, res_text, _ = send_sms(
            recipient=recipient,
            message=message,
            customer=customer,
            category=category,
            sent_by=self.user['id']
        )
        
        if ok:
            conn = get_connection()
            conn.execute("DELETE FROM sms_messages WHERE id = ?", (msg_id,))
            conn.commit()
            conn.close()
            
            self._toast('Success', f'SMS resent successfully to {recipient}!', 'success')
            self._refresh_failed_list()
            if hasattr(self, '_refresh_history_table'):
                self._refresh_history_table()
        else:
            self._toast('Failed', f'Resending failed: {res_text}', 'error')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 7 — Templates Manager (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_templates_tab(self):
        self._clear(self.templates_tab)
        card = self._glass_card(self.templates_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'SMS Template Manager', '📋').pack(side=tk.LEFT)
        self._desc_label(card, 'Manage all SMS templates. Create new templates, edit existing ones, or delete custom templates.').pack(anchor='w', padx=16, pady=(0, 10))

        body = tk.Frame(card, bg=self.MC.surface)
        body.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1, minsize=220)
        body.grid_columnconfigure(1, weight=3)
        body.grid_rowconfigure(0, weight=1)

        left = tk.Frame(body, bg=self.MC.surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 12))

        tk.Label(left, text='📄  Templates', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 6))

        list_outer = tk.Frame(left, bg=self.MC.surface)
        list_outer.pack(fill=tk.BOTH, expand=True)

        self.tpl_listbox = tk.Listbox(
            list_outer, height=14,
            bg=self.MC.surface_alt,
            fg=self.MC.text,
            selectbackground=self.MC.primary,
            selectforeground='white',
            activestyle='none',
            font=('Segoe UI', 9),
            highlightthickness=1,
            highlightbackground=self.MC.border,
            bd=0,
        )
        tpl_vbar = ttk.Scrollbar(list_outer, orient=tk.VERTICAL, command=self.tpl_listbox.yview)
        self.tpl_listbox.configure(yscrollcommand=tpl_vbar.set)
        tpl_vbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tpl_listbox.pack(fill=tk.BOTH, expand=True)
        self.tpl_listbox.bind('<<ListboxSelect>>', self._on_template_select)

        btn_bar = tk.Frame(left, bg=self.MC.surface)
        btn_bar.pack(fill=tk.X, pady=(8, 0))
        btn_bar.grid_columnconfigure(0, weight=1)
        btn_bar.grid_columnconfigure(1, weight=1)
        btn_bar.grid_columnconfigure(2, weight=1)

        new_btn = self._modern_button(btn_bar, 'New', self._new_template,
                                      kind='ghost', width=7, pady=6, icon='➕')
        new_btn.grid(row=0, column=0, sticky='ew', padx=(0, 4))
        del_btn = self._modern_button(btn_bar, 'Delete', self._delete_template,
                                      kind='danger', width=7, pady=6, icon='🗑️')
        del_btn.grid(row=0, column=1, sticky='ew', padx=(0, 4))
        save_btn = self._modern_button(btn_bar, 'Save', self._save_edited_template,
                                       kind='primary', width=7, pady=6, icon='💾')
        save_btn.grid(row=0, column=2, sticky='ew')

        right = tk.Frame(body, bg=self.MC.surface)
        right.grid(row=0, column=1, sticky='nsew')

        form = tk.Frame(right, bg=self.MC.surface)
        form.pack(fill=tk.X, pady=(0, 8))

        tk.Label(form, text='Category:', font=('Segoe UI', 9, 'bold'), width=10, anchor='w',
                 bg=self.MC.surface, fg=self.MC.text).grid(row=0, column=0, sticky='w', pady=4)
        self.tpl_category_var = tk.StringVar()
        cat_entry = self.theme.make_entry(form, variable=self.tpl_category_var)
        cat_entry.grid(row=0, column=1, sticky='ew', padx=(8, 0), pady=4)

        tk.Label(form, text='Title:', font=('Segoe UI', 9, 'bold'), width=10, anchor='w',
                 bg=self.MC.surface, fg=self.MC.text).grid(row=1, column=0, sticky='w', pady=4)
        self.tpl_title_var = tk.StringVar()
        title_entry = self.theme.make_entry(form, variable=self.tpl_title_var)
        title_entry.grid(row=1, column=1, sticky='ew', padx=(8, 0), pady=4)

        form.grid_columnconfigure(1, weight=1)

        tk.Label(right, text='Template Body:', font=('Segoe UI', 9, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(anchor='w', pady=(0, 4))

        editor_frame = tk.Frame(right, bg=self.MC.surface)
        editor_frame.pack(fill=tk.BOTH, expand=True)
        editor_frame.grid_columnconfigure(0, weight=3)
        editor_frame.grid_columnconfigure(1, weight=1)
        editor_frame.grid_rowconfigure(0, weight=1)

        self.tpl_body_text = self._message_box(editor_frame, height=10)
        self.tpl_body_text.grid(row=0, column=0, sticky='nsew', padx=(0, 8))

        placeholder_panel = self._placeholder_panel(editor_frame, self.tpl_body_text)
        placeholder_panel.grid(row=0, column=1, sticky='nsew')

        counter = self._char_counter(right, self.tpl_body_text)
        counter.pack(anchor='e', pady=(4, 0))

        self._refresh_template_list()

    def _refresh_template_list(self):
        self.tpl_listbox.delete(0, tk.END)
        self.templates = {tpl['category']: tpl for tpl in list_sms_templates()}
        self.tpl_categories = []
        for cat, tpl in sorted(self.templates.items()):
            label = CATEGORY_LABELS.get(cat, cat.replace('_', ' ').title())
            self.tpl_listbox.insert(tk.END, f'  {label}  —  {tpl.get("title", "")}')
            self.tpl_categories.append(cat)

    def _on_template_select(self, _event=None):
        selection = self.tpl_listbox.curselection()
        if not selection:
            return
        idx = selection[0]
        if idx >= len(self.tpl_categories):
            return

        cat = self.tpl_categories[idx]
        tpl = self.templates.get(cat, {})
        self.tpl_category_var.set(cat)
        self.tpl_title_var.set(tpl.get('title', ''))
        self._set_text(self.tpl_body_text, tpl.get('body', ''))

    def _new_template(self):
        self.tpl_category_var.set('')
        self.tpl_title_var.set('')
        self._set_text(self.tpl_body_text, '')
        self.tpl_listbox.selection_clear(0, tk.END)

    def _save_edited_template(self):
        category = self.tpl_category_var.get().strip()
        title = self.tpl_title_var.get().strip()
        body = self._get_text(self.tpl_body_text)

        if not category:
            self._toast('Template', 'Category is required.', 'warning')
            return
        if not title:
            self._toast('Template', 'Title is required.', 'warning')
            return
        if not body:
            self._toast('Template', 'Template body is required.', 'warning')
            return

        category = category.lower().strip().replace(' ', '_')

        save_sms_template(category, title, body, True, self.user['id'])
        self.templates[category] = {'title': title, 'body': body, 'is_active': 1}
        self._toast('Success', f'Template "{title}" saved.', 'success')
        self._refresh_template_list()

    def _delete_template(self):
        selection = self.tpl_listbox.curselection()
        if not selection:
            self._toast('Template', 'Select a template to delete.', 'warning')
            return

        idx = selection[0]
        if idx >= len(self.tpl_categories):
            return

        cat = self.tpl_categories[idx]
        protected = {'custom', 'auto', 'auto_new_loan', 'auto_renewal', 'auto_redemption', 'auto_reminder', 'promotion', 'birthday'}
        if cat in protected:
            self._toast('Template', f'Cannot delete system template "{cat}". You can edit it instead.', 'warning')
            return

        if not messagebox.askyesno('Confirm', f'Delete template "{cat}"?'):
            return

        delete_sms_template(cat)
        self.templates.pop(cat, None)
        self._refresh_template_list()
        self.tpl_category_var.set('')
        self.tpl_title_var.set('')
        self._set_text(self.tpl_body_text, '')
        self._toast('Success', 'Template deleted.', 'success')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 8 — History (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_history_tab(self):
        self._clear(self.history_tab)
        card = self._glass_card(self.history_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'SMS History', '📊').pack(side=tk.LEFT)
        self._desc_label(card, 'View all sent SMS messages with filtering options.').pack(anchor='w', padx=16, pady=(0, 10))

        # Gateway summary
        summary = tk.Frame(card, bg=self.MC.surface_alt,
                           highlightthickness=1, highlightbackground=self.MC.border)
        summary.pack(fill=tk.X, padx=16, pady=(0, 10))

        summary_inner = tk.Frame(summary, bg=self.MC.surface_alt)
        summary_inner.pack(fill=tk.X, padx=16, pady=8)

        gateway_info = [
            ('Gateway', get_setting('sms_gateway_base_url', 'https://app.text.lk/api/v3/sms/send')),
            ('Sender ID', get_setting('sms_sender_id', 'Not configured')),
            ('Status', 'Enabled' if get_setting('sms_enabled', '0') == '1' else 'Disabled'),
            ('API Token', 'Configured ✅' if get_setting('sms_gateway_token', '') else 'Missing ⚠️'),
        ]
        for i, (label, value) in enumerate(gateway_info):
            tk.Label(summary_inner, text=f'{label}: ', font=('Segoe UI', 9, 'bold'),
                     bg=self.MC.surface_alt, fg=self.MC.text).grid(row=0, column=i*2, sticky='w', padx=(0, 2))
            tk.Label(summary_inner, text=value, font=('Segoe UI', 9),
                     bg=self.MC.surface_alt, fg=self.MC.text_muted).grid(row=0, column=i*2+1, sticky='w', padx=(0, 16))

        filter_row = tk.Frame(card, bg=self.MC.surface)
        filter_row.pack(fill=tk.X, padx=16, pady=(0, 8))

        tk.Label(filter_row, text='Filter:', font=('Segoe UI', 9, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text).pack(side=tk.LEFT)

        self.hist_cat_var = tk.StringVar(value='All')
        cat_values = ['All', 'Custom', 'Auto', 'New Loan', 'Renewal', 'Redemption', 'Reminder', 'Promotion', 'Birthday', 'Loan Status']
        self.theme.make_combobox(filter_row, variable=self.hist_cat_var, values=cat_values, width=12,
                                 command=lambda _: self._refresh_history()).pack(side=tk.LEFT, padx=(8, 8))

        self.hist_status_var = tk.StringVar(value='All')
        self.theme.make_combobox(filter_row, variable=self.hist_status_var, values=['All', 'Sent', 'Failed', 'Pending'], width=10,
                                 command=lambda _: self._refresh_history()).pack(side=tk.LEFT, padx=(0, 8))

        self._modern_button(filter_row, 'Refresh', self._refresh_history,
                            kind='ghost', width=10, pady=6, icon='🔄').pack(side=tk.LEFT)

        self.hist_total_var = tk.StringVar(value='')
        tk.Label(filter_row, textvariable=self.hist_total_var, font=('Segoe UI', 8),
                 bg=self.MC.surface, fg=self.MC.text_muted).pack(side=tk.RIGHT)

        tree_frame = tk.Frame(card, bg=self.MC.surface)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))

        columns = ('date', 'recipient', 'category', 'status', 'message')
        self.hist_tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=14)
        self.hist_tree.heading('date', text='Date & Time')
        self.hist_tree.heading('recipient', text='Recipient')
        self.hist_tree.heading('category', text='Category')
        self.hist_tree.heading('status', text='Status')
        self.hist_tree.heading('message', text='Message Preview')

        self.hist_tree.column('date', width=150, minwidth=120)
        self.hist_tree.column('recipient', width=130, minwidth=100)
        self.hist_tree.column('category', width=100, minwidth=80)
        self.hist_tree.column('status', width=80, minwidth=60)
        self.hist_tree.column('message', width=300, minwidth=200)

        vbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.hist_tree.yview)
        self.hist_tree.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.hist_tree.pack(fill=tk.BOTH, expand=True)

        # Tag colors for status
        self.hist_tree.tag_configure('sent', foreground='#16a34a')
        self.hist_tree.tag_configure('failed', foreground='#dc2626')
        self.hist_tree.tag_configure('pending', foreground='#d97706')

        # Bind click to show detail popup
        self.hist_tree.bind('<ButtonRelease-1>', self._on_history_click)
        self.hist_tree.bind('<Return>', self._on_history_click)

        tk.Label(card, text='Click any row to view full message details',
                 font=('Segoe UI', 8), bg=self.MC.surface,
                 fg=self.MC.text_muted).pack(anchor='w', padx=16, pady=(0, 8))

        self._history_data = {}  # iid -> full msg dict
        self._refresh_history()

    def _on_history_click(self, _event=None):
        sel = self.hist_tree.selection()
        if not sel:
            return
        iid = sel[0]
        msg = self._history_data.get(iid)
        if msg:
            self._show_sms_detail(msg)

    def _show_sms_detail(self, msg):
        """Show a popup with full SMS message details."""
        popup = tk.Toplevel(self.container)
        popup.title('SMS Details')
        popup.geometry('520x500')
        popup.resizable(True, True)
        popup.configure(bg=self.MC.surface)
        popup.transient(self.container)
        popup.grab_set()

        # Center popup
        popup.update_idletasks()
        try:
            x = self.container.winfo_rootx() + (self.container.winfo_width() - 520) // 2
            y = self.container.winfo_rooty() + (self.container.winfo_height() - 500) // 2
            popup.geometry(f'520x500+{max(0,x)}+{max(0,y)}')
        except Exception:
            pass

        # Header color based on status
        status_val = (msg.get('status', '') or '').lower()
        status_colors = {'sent': '#10b981', 'failed': '#ef4444', 'pending': '#f59e0b'}
        status_color = status_colors.get(status_val, self.MC.primary)

        hdr = tk.Frame(popup, bg=status_color, height=52)
        hdr.pack(fill=tk.X)
        hdr.pack_propagate(False)
        tk.Label(hdr, text=f'📱  SMS Detail  —  {status_val.upper()}',
                 font=('Segoe UI', 12, 'bold'), bg=status_color, fg='#ffffff').pack(
            side=tk.LEFT, padx=16)

        # Scrollable body
        canvas = tk.Canvas(popup, bg=self.MC.surface, highlightthickness=0)
        scrollbar = ttk.Scrollbar(popup, orient='vertical', command=canvas.yview)
        body_frame = tk.Frame(canvas, bg=self.MC.surface)

        body_frame.bind('<Configure>', lambda e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.create_window((0, 0), window=body_frame, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=16, pady=10)

        def _row(label, value):
            row = tk.Frame(body_frame, bg=self.MC.surface)
            row.pack(fill=tk.X, pady=4)
            tk.Label(row, text=label, font=('Segoe UI', 9, 'bold'),
                     bg=self.MC.surface, fg=self.MC.text_muted,
                     width=14, anchor='w').pack(side=tk.LEFT, padx=(0, 8))
            tk.Label(row, text=str(value or '—'), font=('Segoe UI', 10),
                     bg=self.MC.surface, fg=self.MC.text,
                     anchor='w', wraplength=340, justify='left').pack(side=tk.LEFT, fill=tk.X, expand=True)

        cat_label = CATEGORY_LABELS.get(msg.get('category', ''), msg.get('category', ''))
        recipient_display = msg.get('customer_name') or msg.get('recipient', '')

        _row('Date & Time:', msg.get('created_at', ''))
        _row('Recipient:', recipient_display)
        _row('Phone:', msg.get('recipient', ''))
        if msg.get('customer_nic'):
            _row('NIC:', msg.get('customer_nic', ''))
        if msg.get('ticket_no'):
            _row('Ticket No:', msg.get('ticket_no', ''))
        _row('Category:', cat_label)
        _row('Status:', status_val.upper())
        if msg.get('error_message'):
            _row('Error:', msg.get('error_message', ''))

        # Message label
        tk.Label(body_frame, text='Message:', font=('Segoe UI', 9, 'bold'),
                 bg=self.MC.surface, fg=self.MC.text_muted, anchor='w').pack(
            fill=tk.X, padx=(0, 0), pady=(8, 2))

        # Message text box
        txt_frame = tk.Frame(body_frame, bg=self.MC.border, padx=1, pady=1)
        txt_frame.pack(fill=tk.BOTH, expand=True, pady=(0, 10))

        txt = tk.Text(txt_frame, font=('Segoe UI', 10), wrap=tk.WORD,
                      bg=self.MC.surface_alt, fg=self.MC.text,
                      relief='flat', bd=0, padx=10, pady=8,
                      height=7)
        txt_sb = ttk.Scrollbar(txt_frame, orient=tk.VERTICAL, command=txt.yview)
        txt.configure(yscrollcommand=txt_sb.set)
        txt_sb.pack(side=tk.RIGHT, fill=tk.Y)
        txt.pack(fill=tk.BOTH, expand=True)
        txt.insert('1.0', msg.get('message', '') or '')
        txt.configure(state=tk.DISABLED)

        # Close button (and optional Resend for failed)
        btn_frame = tk.Frame(popup, bg=self.MC.surface)
        btn_frame.pack(fill=tk.X, padx=16, pady=(0, 12))

        if status_val == 'failed':
            def _resend():
                if not self._check_internet():
                    self._toast('No Internet', 'Internet connection required to resend.', 'warning')
                    return

                msg_id = msg.get('id')
                recipient = msg.get('recipient', '')
                message = msg.get('message', '')
                category = msg.get('category', '')
                customer_id = msg.get('customer_id')
                loan_id = msg.get('loan_id')

                customer = None
                if customer_id:
                    customer = get_customer(customer_id)

                ok, res_text, _ = send_sms(
                    recipient=recipient,
                    message=message,
                    customer=customer,
                    category=category,
                    sent_by=self.user['id']
                )

                if ok:
                    conn = get_connection()
                    conn.execute("DELETE FROM sms_messages WHERE id = ?", (msg_id,))
                    conn.commit()
                    conn.close()
                    self._toast('Success', f'SMS resent successfully to {recipient}!', 'success')
                    popup.destroy()
                    self._refresh_history()
                else:
                    self._toast('Failed', f'Resend failed: {res_text}', 'error')

            self._modern_button(btn_frame, '🔄  Resend SMS', _resend,
                                kind='primary', width=14, pady=7).pack(side=tk.LEFT)

        self._modern_button(btn_frame, 'Close', popup.destroy,
                            kind='ghost', width=12, pady=7).pack(side=tk.RIGHT)

    def _refresh_history(self):
        cat_map = {
            'All': '', 'Custom': 'custom', 'Auto': 'auto', 'New Loan': 'auto_new_loan',
            'Renewal': 'auto_renewal', 'Redemption': 'auto_redemption', 'Reminder': 'auto_reminder',
            'Promotion': 'promotion', 'Birthday': 'birthday', 'Loan Status': 'order_status',
        }
        status_map = {'All': '', 'Sent': 'sent', 'Failed': 'failed', 'Pending': 'pending'}

        cat = cat_map.get(self.hist_cat_var.get(), '')
        status = status_map.get(self.hist_status_var.get(), '')

        messages = list_sms_messages_filtered(category=cat, status=status, limit=200)

        for item in self.hist_tree.get_children():
            self.hist_tree.delete(item)

        self._history_data.clear()

        for msg in messages:
            cat_label = CATEGORY_LABELS.get(msg.get('category', ''), msg.get('category', ''))
            status_val = (msg.get('status', '') or '').lower()
            recipient_name = msg.get('customer_name') or msg.get('recipient', '')
            msg_preview = (msg.get('message', '') or '')[:80]
            if len(msg.get('message', '') or '') > 80:
                msg_preview += '…'
            date_val = msg.get('created_at', '')

            iid = self.hist_tree.insert('', tk.END, values=(
                date_val, recipient_name, cat_label, status_val.upper(), msg_preview
            ), tags=(status_val,))
            self._history_data[iid] = msg

        self.hist_total_var.set(f'{len(messages)} messages')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 9 — Analytics (Modern)
    # ══════════════════════════════════════════════════════════════════════

    def _build_analytics_tab(self):
        self._clear(self.analytics_tab)
        card = self._glass_card(self.analytics_tab)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        hdr = tk.Frame(card, bg=self.MC.surface)
        hdr.pack(fill=tk.X, padx=16, pady=(14, 4))
        self._section_label(hdr, 'SMS Analytics', '📈').pack(side=tk.LEFT)
        self._desc_label(card, 'Overview of your SMS messaging performance and usage statistics.').pack(anchor='w', padx=16, pady=(0, 10))

        ref_row = tk.Frame(card, bg=self.MC.surface)
        ref_row.pack(fill=tk.X, padx=16, pady=(0, 10))
        self._modern_button(ref_row, 'Refresh Analytics', self._refresh_analytics,
                            kind='ghost', width=16, pady=6, icon='🔄').pack(side=tk.LEFT)

        scroll_outer = tk.Frame(card, bg=self.MC.surface)
        scroll_outer.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))

        canvas = tk.Canvas(scroll_outer, bg=self.MC.surface, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(scroll_outer, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.analytics_content = tk.Frame(canvas, bg=self.MC.surface)
        win = canvas.create_window((0, 0), window=self.analytics_content, anchor='nw')
        self.analytics_content.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        self._refresh_analytics()

    def _refresh_analytics(self):
        self._clear(self.analytics_content)
        parent = self.analytics_content

        try:
            data = get_sms_analytics()
        except Exception:
            tk.Label(parent, text='No SMS data available yet.',
                     font=('Segoe UI', 9), bg=self.MC.surface,
                     fg=self.MC.text_muted).pack(pady=20)
            return

        # ── Stat Cards Row ──
        stats_row = tk.Frame(parent, bg=self.MC.surface)
        stats_row.pack(fill=tk.X, pady=(0, 16))
        for i in range(5):
            stats_row.grid_columnconfigure(i, weight=1)

        cards_data = [
            ('Total SMS', data['total'], self.MC.primary),
            ('Sent ✅', data['sent'], self.MC.success),
            ('Failed ❌', data['failed'], self.MC.danger),
            ('Pending ⏳', data['pending'], self.MC.warning),
            ('Success Rate', f"{data['success_rate']}%", self.MC.success),
        ]
        for i, (title, value, color) in enumerate(cards_data):
            c = self._stat_card(stats_row, title, value, color)
            c.grid(row=0, column=i, sticky='nsew', padx=4)

        # ── Two column layout ──
        two_col = tk.Frame(parent, bg=self.MC.surface)
        two_col.pack(fill=tk.BOTH, expand=True)
        two_col.grid_columnconfigure(0, weight=1)
        two_col.grid_columnconfigure(1, weight=1)

        # ── By Category ──
        cat_frame = tk.Frame(two_col, bg=self.MC.surface_alt,
                             highlightthickness=1, highlightbackground=self.MC.border)
        cat_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 6), pady=(0, 12))

        tk.Label(cat_frame, text='📊 SMS by Category', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface_alt, fg=self.MC.text).pack(anchor='w', padx=14, pady=(10, 8))

        if data['by_category']:
            max_cnt = max(r['cnt'] for r in data['by_category']) if data['by_category'] else 1
            for row_data in data['by_category']:
                row = tk.Frame(cat_frame, bg=self.MC.surface_alt)
                row.pack(fill=tk.X, padx=14, pady=3)
                label = CATEGORY_LABELS.get(row_data['category'], row_data['category'])
                tk.Label(row, text=label, font=('Segoe UI', 9), width=12, anchor='w',
                         bg=self.MC.surface_alt, fg=self.MC.text).pack(side=tk.LEFT)

                bar_frame = tk.Frame(row, bg=self.MC.surface_alt)
                bar_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 8))
                bar_pct = (row_data['cnt'] / max_cnt) if max_cnt > 0 else 0
                bar_canvas = tk.Canvas(bar_frame, height=18, bg=self.MC.surface_alt,
                                       highlightthickness=0, bd=0)
                bar_canvas.pack(fill=tk.X)
                bar_canvas.update_idletasks()
                bar_canvas.bind('<Configure>', lambda e, bc=bar_canvas, pct=bar_pct: self._draw_bar(bc, pct))

                tk.Label(row, text=str(row_data['cnt']), font=('Segoe UI', 9, 'bold'),
                         bg=self.MC.surface_alt, fg=self.MC.primary).pack(side=tk.RIGHT)

            tk.Frame(cat_frame, bg=self.MC.surface_alt, height=10).pack()
        else:
            tk.Label(cat_frame, text='No data', font=('Segoe UI', 9),
                     bg=self.MC.surface_alt, fg=self.MC.text_muted).pack(pady=10)

        # ── Top Recipients ──
        recip_frame = tk.Frame(two_col, bg=self.MC.surface_alt,
                               highlightthickness=1, highlightbackground=self.MC.border)
        recip_frame.grid(row=0, column=1, sticky='nsew', padx=(6, 0), pady=(0, 12))

        tk.Label(recip_frame, text='👤 Top Recipients', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface_alt, fg=self.MC.text).pack(anchor='w', padx=14, pady=(10, 8))

        if data['top_recipients']:
            for i, r in enumerate(data['top_recipients']):
                row = tk.Frame(recip_frame, bg=self.MC.surface_alt)
                row.pack(fill=tk.X, padx=14, pady=2)
                rank_color = self.MC.primary if i < 3 else self.MC.text_muted
                tk.Label(row, text=f'#{i+1}', font=('Segoe UI', 9, 'bold'), width=3,
                         bg=self.MC.surface_alt, fg=rank_color).pack(side=tk.LEFT)
                tk.Label(row, text=r['recipient'], font=('Segoe UI', 9),
                         bg=self.MC.surface_alt, fg=self.MC.text).pack(side=tk.LEFT, padx=(4, 0))
                tk.Label(row, text=f"{r['cnt']} SMS", font=('Segoe UI', 9, 'bold'),
                         bg=self.MC.surface_alt, fg=self.MC.primary).pack(side=tk.RIGHT)

            tk.Frame(recip_frame, bg=self.MC.surface_alt, height=10).pack()
        else:
            tk.Label(recip_frame, text='No data', font=('Segoe UI', 9),
                     bg=self.MC.surface_alt, fg=self.MC.text_muted).pack(pady=10)

        # ── Daily Activity (last 30 days) ──
        daily_frame = tk.Frame(parent, bg=self.MC.surface_alt,
                               highlightthickness=1, highlightbackground=self.MC.border)
        daily_frame.pack(fill=tk.X, pady=(0, 12))

        tk.Label(daily_frame, text='📅 Daily SMS Activity (Last 30 Days)', font=('Segoe UI', 10, 'bold'),
                 bg=self.MC.surface_alt, fg=self.MC.text).pack(anchor='w', padx=14, pady=(10, 8))

        if data['daily']:
            chart_canvas = tk.Canvas(daily_frame, height=120, bg=self.MC.surface_alt,
                                     highlightthickness=0, bd=0)
            chart_canvas.pack(fill=tk.X, padx=14, pady=(0, 10))
            chart_canvas.update_idletasks()
            chart_canvas.bind('<Configure>', lambda e: self._draw_daily_chart(chart_canvas, data['daily']))

            legend = tk.Frame(daily_frame, bg=self.MC.surface_alt)
            legend.pack(padx=14, pady=(0, 10), anchor='w')
            tk.Label(legend, text='■', fg=self.MC.success, bg=self.MC.surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT)
            tk.Label(legend, text='Sent', fg=self.MC.text_muted, bg=self.MC.surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT, padx=(2, 10))
            tk.Label(legend, text='■', fg=self.MC.danger, bg=self.MC.surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT)
            tk.Label(legend, text='Failed', fg=self.MC.text_muted, bg=self.MC.surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT, padx=(2, 0))
        else:
            tk.Label(daily_frame, text='No activity in the last 30 days.',
                     font=('Segoe UI', 9), bg=self.MC.surface_alt,
                     fg=self.MC.text_muted).pack(pady=10)

    def _draw_bar(self, canvas, pct):
        canvas.delete('all')
        w = canvas.winfo_width()
        h = canvas.winfo_height()
        if w <= 1:
            return
        bar_w = max(2, int(w * pct))
        canvas.create_rectangle(0, 2, bar_w, h - 2, fill=self.MC.primary, outline='')
        canvas.create_rectangle(bar_w, 2, w, h - 2, fill=self.MC.border, outline='')

    def _draw_daily_chart(self, canvas, daily_data):
        canvas.delete('all')
        w = canvas.winfo_width()
        h = canvas.winfo_height()
        if w <= 1 or not daily_data:
            return

        days = daily_data[:30]
        days.reverse()
        n = len(days)
        if n == 0:
            return

        max_cnt = max(d['cnt'] for d in days) if days else 1
        if max_cnt == 0:
            max_cnt = 1

        padding = 30
        chart_w = w - padding * 2
        chart_h = h - 30
        bar_gap = 2
        bar_w = max(2, (chart_w - bar_gap * n) // n)

        for i, d in enumerate(days):
            x = padding + i * (bar_w + bar_gap)
            sent_h = int((d.get('sent_cnt', 0) / max_cnt) * chart_h)
            failed_h = int((d.get('failed_cnt', 0) / max_cnt) * chart_h)

            if sent_h > 0:
                canvas.create_rectangle(x, h - 20 - sent_h - failed_h, x + bar_w, h - 20 - failed_h,
                                        fill=self.MC.success, outline='')
            if failed_h > 0:
                canvas.create_rectangle(x, h - 20 - failed_h, x + bar_w, h - 20,
                                        fill=self.MC.danger, outline='')

            if n <= 15 or i % max(1, n // 8) == 0:
                day_label = d.get('day', '')[-5:]
                canvas.create_text(x + bar_w // 2, h - 8, text=day_label,
                                   font=('Segoe UI', 7), fill=self.MC.text_muted)
