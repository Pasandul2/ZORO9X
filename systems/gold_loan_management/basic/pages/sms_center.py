"""Admin SMS center for Text.lk messaging — rebuilt with improved UI/UX."""

import tkinter as tk
from tkinter import messagebox, ttk
from datetime import datetime

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


# ── Placeholders ──────────────────────────────────────────────────────────────

SMS_PLACEHOLDERS = [
    ('Customer Name', '{{customer_name}}'),
    ('Customer NIC', '{{customer_nic}}'),
    ('Customer Phone', '{{customer_phone}}'),
    ('Ticket No', '{{ticket_no}}'),
    ('Loan Amount', '{{loan_amount}}'),
    ('Market Value', '{{market_value}}'),
    ('Assessed Value', '{{assessed_value}}'),
    ('Interest Rate', '{{interest_rate}}'),
    ('Duration', '{{duration}}'),
    ('Issue Date', '{{issue_date}}'),
    ('Renew Date', '{{renew_date}}'),
    ('Expire Date', '{{expire_date}}'),
    ('Loan Status', '{{loan_status}}'),
    ('Total Payable', '{{total_payable}}'),
    ('Birthday Date', '{{birthday_date}}'),
    ('Company Name', '{{company_name}}'),
    ('Company Phone', '{{company_phone}}'),
    ('Company Address', '{{company_address}}'),
    ('Current Date', '{{date}}'),
    ('Current Time', '{{time}}'),
    ('Message', '{{message}}'),
]

AUTO_EVENTS = [
    ('sms_auto_new_loan', 'New Loan SMS', 'auto_new_loan',
     'Send SMS automatically when a new loan is created.'),
    ('sms_auto_renewal', 'Renewal SMS', 'auto_renewal',
     'Send SMS when a loan is renewed.'),
    ('sms_auto_redemption', 'Redemption SMS', 'auto_redemption',
     'Send SMS when a loan is redeemed.'),
    ('sms_auto_reminder', 'Reminder SMS', 'auto_reminder',
     'Send SMS reminder for upcoming loan expiry.'),
]

# Category labels for display
CATEGORY_LABELS = {
    'custom': 'Custom',
    'auto': 'Auto',
    'auto_new_loan': 'New Loan',
    'auto_renewal': 'Renewal',
    'auto_redemption': 'Redemption',
    'auto_reminder': 'Reminder',
    'promotion': 'Promotion',
    'birthday': 'Birthday',
    'order_status': 'Loan Status',
    'other': 'Other',
}

STATUS_COLORS = {
    'sent': '#14b8a6',
    'failed': '#ef4444',
    'pending': '#f97316',
}


class SmsCenterPage:
    """Rebuilt SMS Center with 7 tabs and improved UI/UX."""

    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.templates = {}
        self.customers = []
        self.selected_customer = None
        self.selected_loan = None

    # ── Helpers ────────────────────────────────────────────────────────────

    def _check_internet(self):
        """Check if internet is connected. Show error dialog if not connected."""
        import socket
        try:
            socket.setdefaulttimeout(2.0)
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.connect(("8.8.8.8", 53))
            s.close()
            return True
        except OSError:
            messagebox.showerror('No Internet Connection', 'Please check your internet connection and try again.')
            return False

    def _clear(self, parent):
        for w in parent.winfo_children():
            w.destroy()

    def _get_text(self, widget):
        return widget.get('1.0', 'end').strip()

    def _set_text(self, widget, value):
        widget.delete('1.0', tk.END)
        widget.insert('1.0', value or '')

    def _message_box(self, parent, height=8):
        text = tk.Text(
            parent, height=height, wrap='word',
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            insertbackground=self.theme.palette.text_primary,
            relief='flat', bd=0, padx=10, pady=8,
            font=self.theme.fonts.body,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            highlightcolor=self.theme.palette.accent,
        )
        return text

    def _section_label(self, parent, text, icon=''):
        lbl = tk.Label(
            parent, text=f'{icon}  {text}' if icon else text,
            font=self.theme.fonts.h3,
            bg=parent['bg'], fg=self.theme.palette.text_primary,
        )
        return lbl

    def _desc_label(self, parent, text):
        return tk.Label(
            parent, text=text, font=self.theme.fonts.small,
            bg=parent['bg'], fg=self.theme.palette.text_muted,
            wraplength=600, justify='left',
        )

    def _badge(self, parent, text, color):
        """Create a small colored badge label."""
        lbl = tk.Label(
            parent, text=f'  {text}  ', font=self.theme.fonts.small,
            bg=color, fg='#ffffff',
        )
        return lbl

    def _stat_card(self, parent, title, value, color=None):
        """Create a compact stat card with title and big number."""
        bg = self.theme.palette.bg_surface_alt
        card = tk.Frame(parent, bg=bg, highlightthickness=1,
                        highlightbackground=self.theme.palette.border, padx=16, pady=12)
        tk.Label(card, text=title, font=self.theme.fonts.small,
                 bg=bg, fg=self.theme.palette.text_muted).pack(anchor='w')
        tk.Label(card, text=str(value), font=('Segoe UI', 22, 'bold'),
                 bg=bg, fg=color or self.theme.palette.text_primary).pack(anchor='w', pady=(2, 0))
        return card

    def _placeholder_panel(self, parent, text_widget):
        """Build the placeholder insertion sidebar."""
        frame = tk.Frame(parent, bg=self.theme.palette.bg_surface_alt,
                         highlightthickness=1, highlightbackground=self.theme.palette.border)

        header = tk.Frame(frame, bg=self.theme.palette.bg_surface_alt)
        header.pack(fill=tk.X, padx=10, pady=(8, 4))
        tk.Label(header, text='📋 Placeholders', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(anchor='w')
        tk.Label(header, text='Click to insert', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(anchor='w')

        list_frame = tk.Frame(frame, bg=self.theme.palette.bg_surface_alt)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=4, pady=(0, 4))

        canvas = tk.Canvas(list_frame, bg=self.theme.palette.bg_surface_alt,
                           highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        inner = tk.Frame(canvas, bg=self.theme.palette.bg_surface_alt)

        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        win = canvas.create_window((0, 0), window=inner, anchor='nw')
        inner.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        for label, placeholder in SMS_PLACEHOLDERS:
            btn = tk.Label(
                inner, text=f'  {label}', font=self.theme.fonts.body,
                bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.accent,
                anchor='w', cursor='hand2', pady=3,
            )
            btn.pack(fill=tk.X, padx=6)
            btn.bind('<Enter>', lambda e, b=btn: b.configure(bg=self.theme.palette.border))
            btn.bind('<Leave>', lambda e, b=btn: b.configure(bg=self.theme.palette.bg_surface_alt))
            btn.bind('<Button-1>', lambda e, p=placeholder: self._insert_placeholder(text_widget, p))

        return frame

    def _insert_placeholder(self, text_widget, placeholder):
        if text_widget:
            text_widget.insert(tk.INSERT, placeholder)
            text_widget.focus_set()

    def _char_counter(self, parent, text_widget):
        """Attach a live character counter below a text widget."""
        var = tk.StringVar(value='0 chars')
        lbl = tk.Label(parent, textvariable=var, font=self.theme.fonts.small,
                       bg=parent['bg'], fg=self.theme.palette.text_muted, anchor='e')

        def _update(*_):
            content = text_widget.get('1.0', 'end-1c')
            length = len(content)
            sms_parts = max(1, (length + 159) // 160)
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

    # ── Main Render ────────────────────────────────────────────────────────

    def render(self):
        self._clear(self.container)

        if self.user['role'] != 'admin':
            tk.Label(self.container, text='⛔ Access Denied - Admin Only',
                     font=self.theme.fonts.h1, bg=self.theme.palette.bg_app,
                     fg=self.theme.palette.danger).pack(pady=40)
            return

        self.templates = {tpl['category']: tpl for tpl in list_sms_templates()}

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=10, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 10))
        tk.Label(hdr, text='📨 SMS Center', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Gateway status indicator
        sms_enabled = get_setting('sms_enabled', '0') == '1'
        status_text = '● Connected' if sms_enabled else '○ Disabled'
        status_color = self.theme.palette.success if sms_enabled else self.theme.palette.text_muted
        tk.Label(hdr, text=status_text, font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_app, fg=status_color).pack(side=tk.RIGHT, padx=(0, 8))
        tk.Label(hdr, text='Text.lk Gateway', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_muted).pack(side=tk.RIGHT)

        # Notebook
        notebook = ttk.Notebook(view)
        notebook.pack(fill=tk.BOTH, expand=True)

        tabs = {
            '📝 Custom SMS': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '⚡ Auto SMS': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '📢 Promotions': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '🎂 Birthday': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '❌ Failed': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '📋 Templates': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '📊 History': tk.Frame(notebook, bg=self.theme.palette.bg_app),
            '📈 Analytics': tk.Frame(notebook, bg=self.theme.palette.bg_app),
        }
        for name, frame in tabs.items():
            notebook.add(frame, text=name)

        self.custom_tab = tabs['📝 Custom SMS']
        self.auto_tab = tabs['⚡ Auto SMS']
        self.promo_tab = tabs['📢 Promotions']
        self.birthday_tab = tabs['🎂 Birthday']
        self.scheduled_tab = tk.Frame(notebook, bg=self.theme.palette.bg_app)
        self.failed_tab = tabs['❌ Failed']
        self.templates_tab = tabs['📋 Templates']
        self.history_tab = tabs['📊 History']
        self.analytics_tab = tabs['📈 Analytics']

        self._build_custom_tab()
        self._build_auto_tab()
        self._build_promotion_tab()
        self._build_birthday_tab()
        self._build_scheduled_tab()
        self._build_failed_tab()
        self._build_templates_tab()
        self._build_history_tab()
        self._build_analytics_tab()

    # ══════════════════════════════════════════════════════════════════════
    # TAB 1 — Custom SMS
    # ══════════════════════════════════════════════════════════════════════

    def _build_custom_tab(self):
        self._clear(self.custom_tab)
        card = self.theme.make_card(self.custom_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        # Header
        self._section_label(card.inner, 'Send Custom SMS', '📝').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Search and select customers, compose your message with placeholders, and send.').pack(anchor='w', padx=14, pady=(0, 8))

        # ── TOP ROW: Recipients (left) + Selected Recipients display (right) ──
        top_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        top_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 6))
        top_frame.grid_columnconfigure(0, weight=3)
        top_frame.grid_columnconfigure(1, weight=2)
        top_frame.grid_rowconfigure(0, weight=1)

        # ── Left: Customer search + list ──
        left = tk.Frame(top_frame, bg=self.theme.palette.bg_surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 8))

        tk.Label(left, text='👤 Select Recipients', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))

        # Search bar
        search_row = tk.Frame(left, bg=self.theme.palette.bg_surface)
        search_row.pack(fill=tk.X, pady=(0, 4))
        self.custom_search_var = tk.StringVar()
        search_entry = self.theme.make_entry(search_row, variable=self.custom_search_var)
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        search_entry.entry.bind('<KeyRelease>', lambda _: self._refresh_custom_customers())
        self.theme.make_button(search_row, text='Search', command=self._refresh_custom_customers,
                               kind='ghost', width=8, pady=6).pack(side=tk.LEFT)

        # Select All + count
        ctrl_row = tk.Frame(left, bg=self.theme.palette.bg_surface)
        ctrl_row.pack(fill=tk.X, pady=(0, 4))
        self.custom_select_all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(
            ctrl_row, text='Select All', variable=self.custom_select_all_var,
            command=self._toggle_custom_select_all,
            bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
            selectcolor=self.theme.palette.bg_surface, font=self.theme.fonts.body,
            activebackground=self.theme.palette.bg_surface,
        ).pack(side=tk.LEFT)
        self.custom_count_var = tk.StringVar(value='0 selected')
        tk.Label(ctrl_row, textvariable=self.custom_count_var, font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.RIGHT)

        # Customer list with checkboxes
        self.custom_selected_ids = set()
        self.custom_row_vars = {}
        list_frame = tk.Frame(left, bg=self.theme.palette.bg_surface)
        list_frame.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_frame, bg=self.theme.palette.bg_surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.custom_rows_frame = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
        win_id = canvas.create_window((0, 0), window=self.custom_rows_frame, anchor='nw')
        self.custom_rows_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win_id, width=e.width))

        # Manual number entry + Add button
        manual_frame = tk.Frame(left, bg=self.theme.palette.bg_surface)
        manual_frame.pack(fill=tk.X, pady=(6, 0))
        tk.Label(manual_frame, text='Add number:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
        self.custom_manual_var = tk.StringVar()
        manual_entry = self.theme.make_entry(manual_frame, variable=self.custom_manual_var)
        manual_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(6, 6))
        manual_entry.entry.bind('<Return>', lambda _: self._add_manual_number())
        self.theme.make_button(manual_frame, text='+ Add', command=self._add_manual_number,
                               kind='ghost', width=6, pady=6).pack(side=tk.LEFT)

        # ── Right: Selected recipients display (tokens) ──
        right_top = tk.Frame(top_frame, bg=self.theme.palette.bg_surface)
        right_top.grid(row=0, column=1, sticky='nsew')

        tk.Label(right_top, text='📋 Selected Recipients', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))

        self.custom_manual_numbers = []  # list of manually added numbers
        recipients_frame = tk.Frame(right_top, bg=self.theme.palette.bg_surface_alt,
                                    highlightthickness=1, highlightbackground=self.theme.palette.border)
        recipients_frame.pack(fill=tk.BOTH, expand=True)

        recip_canvas = tk.Canvas(recipients_frame, bg=self.theme.palette.bg_surface_alt, highlightthickness=0, bd=0)
        recip_vbar = ttk.Scrollbar(recipients_frame, orient=tk.VERTICAL, command=recip_canvas.yview)
        recip_canvas.configure(yscrollcommand=recip_vbar.set)
        recip_vbar.pack(side=tk.RIGHT, fill=tk.Y)
        recip_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.custom_tokens_frame = tk.Frame(recip_canvas, bg=self.theme.palette.bg_surface_alt)
        token_win = recip_canvas.create_window((0, 0), window=self.custom_tokens_frame, anchor='nw')
        self.custom_tokens_frame.bind('<Configure>', lambda _: recip_canvas.configure(scrollregion=recip_canvas.bbox('all')))
        recip_canvas.bind('<Configure>', lambda e: recip_canvas.itemconfigure(token_win, width=e.width))

        self.custom_recip_summary_var = tk.StringVar(value='No recipients selected')
        tk.Label(right_top, textvariable=self.custom_recip_summary_var, font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', pady=(4, 0))

        # ── BOTTOM ROW: Template selector + Message + Placeholders ──
        bottom_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        bottom_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))
        bottom_frame.grid_columnconfigure(0, weight=4)
        bottom_frame.grid_columnconfigure(1, weight=1)
        bottom_frame.grid_rowconfigure(1, weight=1)

        # Template selector
        tpl_row = tk.Frame(bottom_frame, bg=self.theme.palette.bg_surface)
        tpl_row.grid(row=0, column=0, columnspan=2, sticky='ew', pady=(0, 6))
        tk.Label(tpl_row, text='📄 Template:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.custom_tpl_var = tk.StringVar(value='custom')
        tpl_values = [f"{CATEGORY_LABELS.get(cat, cat)} — {tpl.get('title', '')}" for cat, tpl in sorted(self.templates.items())]
        self._custom_tpl_keys = [cat for cat, _ in sorted(self.templates.items())]
        tpl_combo = self.theme.make_combobox(tpl_row, variable=self.custom_tpl_var,
                                             values=tpl_values, width=30,
                                             command=lambda _: self._apply_custom_template())
        tpl_combo.pack(side=tk.LEFT, padx=(8, 0), fill=tk.X, expand=True)

        # Message box
        msg_frame = tk.Frame(bottom_frame, bg=self.theme.palette.bg_surface)
        msg_frame.grid(row=1, column=0, sticky='nsew', padx=(0, 8))

        tk.Label(msg_frame, text='✉️ Message', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))

        self.custom_message_text = self._message_box(msg_frame, height=8)
        self.custom_message_text.pack(fill=tk.BOTH, expand=True)
        self._set_text(self.custom_message_text,
                       self._template_body('custom', 'Dear {{customer_name}},\n\nThank you for choosing our service.\n\n{{company_name}}'))

        counter_lbl = self._char_counter(msg_frame, self.custom_message_text)
        counter_lbl.pack(anchor='e', pady=(2, 0))

        # Buttons
        btn_row = tk.Frame(msg_frame, bg=self.theme.palette.bg_surface)
        btn_row.pack(fill=tk.X, pady=(6, 0))
        self.theme.make_button(btn_row, text='💾 Save Template', command=self._save_custom_template,
                               kind='ghost', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(btn_row, text='📤 Send SMS', command=self._send_custom_sms,
                               kind='primary', width=14, pady=8).pack(side=tk.LEFT)

        # Placeholders panel
        ph_frame = tk.Frame(bottom_frame, bg=self.theme.palette.bg_surface)
        ph_frame.grid(row=1, column=1, sticky='nsew')
        placeholder_panel = self._placeholder_panel(ph_frame, self.custom_message_text)
        placeholder_panel.pack(fill=tk.BOTH, expand=True)

        self._refresh_custom_customers()

    def _apply_custom_template(self):
        """Load selected template body into the message box."""
        selected = self.custom_tpl_var.get()
        # Find matching category from the display value
        for i, display in enumerate(self.custom_tpl_var.get() for _ in range(1)):
            pass
        # match by iterating template keys
        for i, cat in enumerate(self._custom_tpl_keys):
            label = f"{CATEGORY_LABELS.get(cat, cat)} — {self.templates.get(cat, {}).get('title', '')}"
            if label == selected:
                tpl = self.templates.get(cat, {})
                self._set_text(self.custom_message_text, tpl.get('body', ''))
                return

    def _add_manual_number(self):
        """Add manually typed phone numbers as tokens."""
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
        """Remove a manually added number."""
        if number in self.custom_manual_numbers:
            self.custom_manual_numbers.remove(number)
        self._refresh_recipient_tokens()

    def _remove_selected_customer(self, cid):
        """Remove a selected customer from the tokens."""
        self.custom_selected_ids.discard(cid)
        if cid in self.custom_row_vars:
            self.custom_row_vars[cid].set(False)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _refresh_recipient_tokens(self):
        """Rebuild the selected recipients token display."""
        for w in self.custom_tokens_frame.winfo_children():
            w.destroy()

        all_customers = search_customers('')
        total = 0

        # Show selected customers
        for cid in list(self.custom_selected_ids):
            customer = None
            for c in all_customers:
                if c['id'] == cid:
                    customer = c
                    break
            if not customer:
                continue
            total += 1
            token = tk.Frame(self.custom_tokens_frame, bg=self.theme.palette.bg_surface,
                             highlightthickness=1, highlightbackground=self.theme.palette.border,
                             padx=8, pady=4)
            token.pack(fill=tk.X, padx=6, pady=2)
            tk.Label(token, text=f"👤 {customer['name']}", font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                     anchor='w').pack(side=tk.LEFT)
            tk.Label(token, text=customer.get('phone', ''), font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(8, 0))
            rm_btn = tk.Label(token, text='  ✕  ', font=self.theme.fonts.body_bold,
                              bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger,
                              cursor='hand2')
            rm_btn.pack(side=tk.RIGHT)
            rm_btn.bind('<Button-1>', lambda _, c=cid: self._remove_selected_customer(c))

        # Show manual numbers
        for num in list(self.custom_manual_numbers):
            total += 1
            token = tk.Frame(self.custom_tokens_frame, bg=self.theme.palette.bg_surface,
                             highlightthickness=1, highlightbackground=self.theme.palette.border,
                             padx=8, pady=4)
            token.pack(fill=tk.X, padx=6, pady=2)
            tk.Label(token, text=f"📱 {num}", font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                     anchor='w').pack(side=tk.LEFT)
            tk.Label(token, text='(manual)', font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(8, 0))
            rm_btn = tk.Label(token, text='  ✕  ', font=self.theme.fonts.body_bold,
                              bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger,
                              cursor='hand2')
            rm_btn.pack(side=tk.RIGHT)
            rm_btn.bind('<Button-1>', lambda _, n=num: self._remove_manual_number(n))

        if total == 0:
            tk.Label(self.custom_tokens_frame, text='No recipients selected yet.\nSelect customers or add numbers.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_muted, justify='center').pack(pady=20)

        self.custom_recip_summary_var.set(f'{total} recipient{"s" if total != 1 else ""} ready to send')

    def _refresh_custom_customers(self):
        query = self.custom_search_var.get().strip()
        results = search_customers(query)
        self.custom_results = results

        for w in self.custom_rows_frame.winfo_children():
            w.destroy()
        self.custom_row_vars.clear()

        if not results:
            tk.Label(self.custom_rows_frame, text='No customers found.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(anchor='w', padx=6, pady=8)
            return

        for customer in results:
            cid = customer['id']
            var = tk.BooleanVar(value=cid in self.custom_selected_ids)
            self.custom_row_vars[cid] = var
            row = tk.Frame(self.custom_rows_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, pady=1)

            tk.Checkbutton(
                row, variable=var,
                command=lambda c=cid: self._toggle_custom_customer(c),
                bg=self.theme.palette.bg_surface, selectcolor=self.theme.palette.bg_surface,
                activebackground=self.theme.palette.bg_surface,
            ).pack(side=tk.LEFT)
            tk.Label(row, text=customer['name'], font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                     anchor='w').pack(side=tk.LEFT, padx=(0, 6))
            tk.Label(row, text=customer.get('phone', ''), font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted,
                     anchor='w').pack(side=tk.LEFT)

        self._update_custom_count()

    def _toggle_custom_customer(self, cid):
        var = self.custom_row_vars.get(cid)
        if var and var.get():
            self.custom_selected_ids.add(cid)
        else:
            self.custom_selected_ids.discard(cid)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _toggle_custom_select_all(self):
        select_all = self.custom_select_all_var.get()
        for cid, var in self.custom_row_vars.items():
            var.set(select_all)
            if select_all:
                self.custom_selected_ids.add(cid)
            else:
                self.custom_selected_ids.discard(cid)
        self._update_custom_count()
        self._refresh_recipient_tokens()

    def _update_custom_count(self):
        n = len(self.custom_selected_ids) + len(getattr(self, 'custom_manual_numbers', []))
        self.custom_count_var.set(f'{n} selected')

    def _save_custom_template(self):
        body = self._get_text(self.custom_message_text)
        save_sms_template('custom', 'Custom SMS', body, True, self.user['id'])
        self.templates['custom'] = {'title': 'Custom SMS', 'body': body, 'is_active': 1}
        messagebox.showinfo('Success', 'Custom SMS template saved.')

    def _send_custom_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.custom_message_text)
        if not raw_message:
            messagebox.showwarning('SMS', 'Message cannot be empty.')
            return

        recipients = []
        # From selected customers
        all_customers = search_customers('')
        for cid in self.custom_selected_ids:
            for c in all_customers:
                if c['id'] == cid:
                    recipients.append(c)
                    break

        # Manual numbers
        for num in getattr(self, 'custom_manual_numbers', []):
            recipients.append({'phone': num, 'name': num})

        if not recipients:
            messagebox.showwarning('SMS', 'Select customers or add recipient numbers.')
            return

        if len(recipients) > 1:
            if not messagebox.askyesno('Confirm', f'Send SMS to {len(recipients)} recipients?'):
                return

        sent = failed = 0
        for r in recipients:
            phone = r.get('phone', '')
            context = build_sms_context(customer=r, message=raw_message)
            final_message = render_template(raw_message, context)
            ok, _, _ = send_sms(phone, final_message, customer=r, category='custom', sent_by=self.user['id'])
            if ok:
                sent += 1
            else:
                failed += 1

        messagebox.showinfo('SMS Result', f'✅ Sent: {sent}\n❌ Failed: {failed}')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 2 — Auto SMS
    # ══════════════════════════════════════════════════════════════════════

    def _build_auto_tab(self):
        self._clear(self.auto_tab)
        card = self.theme.make_card(self.auto_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'Automatic SMS Settings', '⚡').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Enable automatic SMS for loan events. Each event has its own template that you can customize.').pack(anchor='w', padx=14, pady=(0, 10))

        # Master switch
        master_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface_alt,
                                highlightthickness=1, highlightbackground=self.theme.palette.border)
        master_frame.pack(fill=tk.X, padx=14, pady=(0, 12))

        self.auto_master_var = tk.BooleanVar(value=get_setting('sms_enabled', '0') == '1')
        master_inner = tk.Frame(master_frame, bg=self.theme.palette.bg_surface_alt)
        master_inner.pack(fill=tk.X, padx=14, pady=10)
        tk.Checkbutton(
            master_inner, text='  Enable SMS Gateway', variable=self.auto_master_var,
            font=self.theme.fonts.h3, bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary, selectcolor=self.theme.palette.bg_surface_alt,
            activebackground=self.theme.palette.bg_surface_alt,
        ).pack(side=tk.LEFT)
        tk.Label(master_inner, text='Master switch for all automatic SMS', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(12, 0))

        # Scrollable events area
        scroll_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        scroll_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 10))

        canvas = tk.Canvas(scroll_frame, bg=self.theme.palette.bg_surface, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(scroll_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        events_frame = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
        win = canvas.create_window((0, 0), window=events_frame, anchor='nw')
        events_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        self.auto_event_vars = {}
        self.auto_event_texts = {}

        for setting_key, label, template_cat, description in AUTO_EVENTS:
            event_card = tk.Frame(events_frame, bg=self.theme.palette.bg_surface_alt,
                                  highlightthickness=1, highlightbackground=self.theme.palette.border)
            event_card.pack(fill=tk.X, pady=(0, 10))

            # Event header with toggle
            header = tk.Frame(event_card, bg=self.theme.palette.bg_surface_alt)
            header.pack(fill=tk.X, padx=14, pady=(10, 4))

            var = tk.BooleanVar(value=get_setting(setting_key, '0') == '1')
            self.auto_event_vars[setting_key] = var

            tk.Checkbutton(
                header, text=f'  {label}', variable=var,
                font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_primary, selectcolor=self.theme.palette.bg_surface_alt,
                activebackground=self.theme.palette.bg_surface_alt,
            ).pack(side=tk.LEFT)

            status_text = '● Active' if var.get() else '○ Inactive'
            status_color = self.theme.palette.success if var.get() else self.theme.palette.text_muted
            tk.Label(header, text=status_text, font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface_alt, fg=status_color).pack(side=tk.RIGHT)

            tk.Label(event_card, text=description, font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 6))

            # Template editor
            tk.Label(event_card, text='Template:', font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14)
            text_widget = self._message_box(event_card, height=12)
            text_widget.pack(fill=tk.X, padx=14, pady=(4, 14))
            self._set_text(text_widget, self._template_body(template_cat, f'Dear {{{{customer_name}}}},\n\n{{{{message}}}}\n\nTicket: {{{{ticket_no}}}}\n{{{{company_name}}}}'))
            self.auto_event_texts[template_cat] = text_widget

        # Save button
        btn_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_row.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_row, text='💾 Save All Auto SMS Settings',
                               command=self._save_auto_settings,
                               kind='primary', width=24, pady=8).pack(side=tk.LEFT)

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
    # TAB 3 — Promotions
    # ══════════════════════════════════════════════════════════════════════

    def _build_promotion_tab(self):
        self._clear(self.promo_tab)
        card = self.theme.make_card(self.promo_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'Promotion SMS', '📢').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Send promotional messages to selected customers or your entire customer list.').pack(anchor='w', padx=14, pady=(0, 10))

        body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        body.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1)
        body.grid_columnconfigure(1, weight=2)
        body.grid_rowconfigure(0, weight=1)

        # Left — Customer selection
        left = tk.Frame(body, bg=self.theme.palette.bg_surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 10))

        tk.Label(left, text='👥 Recipients', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))

        # Quick filter
        filter_row = tk.Frame(left, bg=self.theme.palette.bg_surface)
        filter_row.pack(fill=tk.X, pady=(0, 6))
        self.promo_search_var = tk.StringVar()
        search_e = self.theme.make_entry(filter_row, variable=self.promo_search_var)
        search_e.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        search_e.entry.bind('<KeyRelease>', lambda _: self._refresh_promo_customers())

        # Select All
        self.promo_select_all_var = tk.BooleanVar(value=False)
        tk.Checkbutton(left, text='Select All Customers', variable=self.promo_select_all_var,
                       command=self._toggle_promo_select_all,
                       bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                       selectcolor=self.theme.palette.bg_surface, font=self.theme.fonts.body,
                       activebackground=self.theme.palette.bg_surface).pack(anchor='w', pady=(0, 4))

        self.promo_selected_ids = set()
        self.promo_row_vars = {}

        list_frame = tk.Frame(left, bg=self.theme.palette.bg_surface)
        list_frame.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_frame, bg=self.theme.palette.bg_surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.promo_rows_frame = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
        canvas.create_window((0, 0), window=self.promo_rows_frame, anchor='nw')
        self.promo_rows_frame.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))

        self.promo_count_var = tk.StringVar(value='0 recipients')
        tk.Label(left, textvariable=self.promo_count_var, font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', pady=(4, 0))

        # Right — Message composer
        right = tk.Frame(body, bg=self.theme.palette.bg_surface)
        right.grid(row=0, column=1, sticky='nsew')

        tk.Label(right, text='✉️ Promotion Message', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))

        self.promo_message_text = self._message_box(right, height=10)
        self.promo_message_text.pack(fill=tk.BOTH, expand=True)
        self._set_text(self.promo_message_text,
                       self._template_body('promotion', '{{company_name}} has a special offer for you!\n\nContact us today for exclusive gold loan rates.\n\n📞 {{company_phone}}'))

        counter_lbl = self._char_counter(right, self.promo_message_text)
        counter_lbl.pack(anchor='e', pady=(4, 0))

        tk.Label(right, text='Placeholders: {{customer_name}}, {{company_name}}, {{company_phone}}, {{date}}',
                 font=self.theme.fonts.small, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted, wraplength=500).pack(anchor='w', pady=(4, 0))

        btn_row = tk.Frame(right, bg=self.theme.palette.bg_surface)
        btn_row.pack(fill=tk.X, pady=(10, 0))
        self.theme.make_button(btn_row, text='💾 Save Template', command=self._save_promo_template,
                               kind='ghost', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(btn_row, text='📤 Send Promotion', command=self._send_promotion_sms,
                               kind='primary', width=16, pady=8).pack(side=tk.LEFT)

        self._refresh_promo_customers()

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
            row = tk.Frame(self.promo_rows_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, pady=1)
            tk.Checkbutton(
                row, text=f"{customer['name']}  •  {customer['phone']}",
                variable=var, command=lambda c=cid: self._toggle_promo_customer(c),
                bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                selectcolor=self.theme.palette.bg_surface, font=self.theme.fonts.body,
                anchor='w', activebackground=self.theme.palette.bg_surface,
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
        messagebox.showinfo('Success', 'Promotion template saved.')

    def _send_promotion_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.promo_message_text)
        if not raw_message:
            messagebox.showwarning('SMS', 'Promotion message cannot be empty.')
            return

        customers = []
        if self.promo_selected_ids:
            all_customers = search_customers('')
            customers = [c for c in all_customers if c['id'] in self.promo_selected_ids]
        else:
            messagebox.showwarning('SMS', 'Select at least one customer.')
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

        messagebox.showinfo('Promotion SMS', f'✅ Sent: {sent}\n❌ Failed: {failed}')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 4 — Birthday Wishes
    # ══════════════════════════════════════════════════════════════════════

    def _build_birthday_tab(self):
        self._clear(self.birthday_tab)
        card = self.theme.make_card(self.birthday_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'Birthday Wishes & Automation', '🎂').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Manage automated birthday greetings and send custom wishes immediately or scheduled.').pack(anchor='w', padx=14, pady=(0, 10))

        body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        body.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1, minsize=480)
        body.grid_columnconfigure(1, weight=1, minsize=480)
        body.grid_rowconfigure(0, weight=1)

        # Left — Customers & Filtering
        left = tk.Frame(body, bg=self.theme.palette.bg_surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 15))

        # Filtering frame
        filter_frame = tk.Frame(left, bg=self.theme.palette.bg_surface)
        filter_frame.pack(fill=tk.X, pady=(0, 10))

        # Row 1 of filters: Search
        search_row = tk.Frame(filter_frame, bg=self.theme.palette.bg_surface)
        search_row.pack(fill=tk.X, pady=2)
        
        tk.Label(search_row, text='🔍 Search:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted, width=8, anchor='w').pack(side=tk.LEFT)
        self.bday_search_var = tk.StringVar()
        search_entry = tk.Entry(
            search_row, textvariable=self.bday_search_var, font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary,
            relief='flat', highlightthickness=1, highlightbackground=self.theme.palette.border,
            highlightcolor=self.theme.palette.accent
        )
        search_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(4, 0))
        self.bday_search_var.trace_add('write', lambda *_: self._refresh_birthdays())

        # Row 2 of filters: Status Filter and Range
        filter_row = tk.Frame(filter_frame, bg=self.theme.palette.bg_surface)
        filter_row.pack(fill=tk.X, pady=4)

        tk.Label(filter_row, text='Birthday:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted, width=8, anchor='w').pack(side=tk.LEFT)
        
        self.bday_added_filter_var = tk.StringVar(value='All Customers')
        added_combo = self.theme.make_combobox(
            filter_row, variable=self.bday_added_filter_var,
            values=['All Customers', 'Birthday Added', 'Birthday Missing'], width=16
        )
        added_combo.pack(side=tk.LEFT, padx=(4, 10))
        added_combo.bind('<<ComboboxSelected>>', lambda _: self._refresh_birthdays())

        tk.Label(filter_row, text='Upcoming:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
        
        self.bday_range_var = tk.StringVar(value='30 days')
        range_combo = self.theme.make_combobox(
            filter_row, variable=self.bday_range_var,
            values=['Today', '7 days', '14 days', '30 days', '60 days', '90 days', 'All'], width=10
        )
        range_combo.pack(side=tk.LEFT, padx=(4, 0))
        range_combo.bind('<<ComboboxSelected>>', lambda _: self._refresh_birthdays())

        # Select All checkbox
        self.bday_select_all_var = tk.BooleanVar(value=False)
        self.bday_select_all_chk = tk.Checkbutton(
            left, text='Select All', variable=self.bday_select_all_var,
            command=self._toggle_bday_select_all,
            bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
            selectcolor=self.theme.palette.bg_surface, font=self.theme.fonts.body_bold,
            activebackground=self.theme.palette.bg_surface
        )
        self.bday_select_all_chk.pack(anchor='w', pady=(0, 6))

        self.bday_selected_ids = set()
        self.bday_row_vars = {}

        # Scrollable list area
        list_container = tk.Frame(left, bg=self.theme.palette.bg_surface, highlightthickness=1, highlightbackground=self.theme.palette.border)
        list_container.pack(fill=tk.BOTH, expand=True)

        canvas = tk.Canvas(list_container, bg=self.theme.palette.bg_surface, highlightthickness=0)
        vbar = ttk.Scrollbar(list_container, orient=tk.VERTICAL, command=canvas.yview)
        hbar = ttk.Scrollbar(list_container, orient=tk.HORIZONTAL, command=canvas.xview)
        canvas.configure(yscrollcommand=vbar.set, xscrollcommand=hbar.set)
        
        canvas.grid(row=0, column=0, sticky='nsew')
        vbar.grid(row=0, column=1, sticky='ns')
        hbar.grid(row=1, column=0, sticky='ew')
        list_container.grid_rowconfigure(0, weight=1)
        list_container.grid_columnconfigure(0, weight=1)

        self.bday_rows_frame = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
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
        tk.Label(left, textvariable=self.bday_count_var, font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', pady=(4, 0))

        # Right — Automation Settings & Composer
        right = tk.Frame(body, bg=self.theme.palette.bg_surface)
        right.grid(row=0, column=1, sticky='nsew')

        # Automation settings card
        auto_card = tk.Frame(right, bg=self.theme.palette.bg_surface_alt, highlightthickness=1, highlightbackground=self.theme.palette.border, padx=14, pady=10)
        auto_card.pack(fill=tk.X, pady=(0, 12))
        
        tk.Label(auto_card, text='⚙️ Automated Birthday Wishes Settings', font=self.theme.fonts.body_bold,
                 bg=auto_card['bg'], fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))

        self.bday_auto_enabled_var = tk.BooleanVar(value=get_setting('sms_birthday_auto_enabled', '0') == '1')
        chk_auto = tk.Checkbutton(
            auto_card, text='Enable Birthday SMS Automation', variable=self.bday_auto_enabled_var,
            bg=auto_card['bg'], fg=self.theme.palette.text_primary, selectcolor=self.theme.palette.bg_surface_alt,
            font=self.theme.fonts.body, activebackground=auto_card['bg']
        )
        chk_auto.pack(anchor='w', pady=4)

        time_row = tk.Frame(auto_card, bg=auto_card['bg'])
        time_row.pack(fill=tk.X, pady=4)
        
        tk.Label(time_row, text='Send Time:', font=self.theme.fonts.body,
                 bg=auto_card['bg'], fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

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
        tk.Label(time_row, text=':', bg=auto_card['bg'], fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        min_combo = self.theme.make_combobox(time_row, variable=self.bday_min_var,
                                             values=[f"{m:02d}" for m in [0, 15, 30, 45]], width=4)
        min_combo.pack(side=tk.LEFT, padx=(2, 8))

        self.theme.make_button(time_row, text='💾 Save Settings', command=self._save_birthday_settings,
                               kind='ghost', width=14, pady=4).pack(side=tk.LEFT)

        last_run = get_setting('sms_birthday_last_run_date', 'Never')
        self.bday_last_run_lbl = tk.Label(
            auto_card, text=f"Last run date: {last_run}", font=self.theme.fonts.small,
            bg=auto_card['bg'], fg=self.theme.palette.text_muted
        )
        self.bday_last_run_lbl.pack(anchor='w', pady=(4, 0))

        # Compose message
        compose_lbl_row = tk.Frame(right, bg=self.theme.palette.bg_surface)
        compose_lbl_row.pack(fill=tk.X, pady=(0, 6))
        
        tk.Label(compose_lbl_row, text='🎉 Birthday Message Template', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Template selector
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
            # Create a default birthday template
            default_body = 'Dear {{customer_name}},\n\nWishing you a very Happy Birthday! 🎂🎉\n\nMay this year bring you happiness and prosperity.\n\nWarm wishes,\n{{company_name}}'
            save_sms_template('birthday', 'Default Birthday Wishes', default_body, True, self.user['id'])
            bday_template_titles = ['Default Birthday Wishes']
            self.templates['birthday'] = {'title': 'Default Birthday Wishes', 'body': default_body}

        self.bday_template_var.set(bday_template_titles[0])
        template_combo = self.theme.make_combobox(compose_lbl_row, variable=self.bday_template_var,
                                                  values=bday_template_titles, width=22)
        template_combo.pack(side=tk.RIGHT)
        self.bday_template_var.trace_add('write', on_template_select)

        # Main editor frame with placeholders
        editor_frame = tk.Frame(right, bg=self.theme.palette.bg_surface)
        editor_frame.pack(fill=tk.BOTH, expand=True)

        composer_part = tk.Frame(editor_frame, bg=self.theme.palette.bg_surface)
        composer_part.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 8))

        self.bday_message_text = self._message_box(composer_part, height=8)
        self.bday_message_text.pack(fill=tk.BOTH, expand=True)
        
        # Load initial template body
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

        # Buttons
        btn_row = tk.Frame(right, bg=self.theme.palette.bg_surface)
        btn_row.pack(fill=tk.X, pady=(10, 0))
        
        self.theme.make_button(btn_row, text='💾 Save Template', command=self._save_birthday_template,
                               kind='ghost', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(btn_row, text='📅 Schedule wishes', command=self._schedule_birthday_sms,
                               kind='secondary', width=16, pady=8).pack(side=tk.RIGHT)
        self.theme.make_button(btn_row, text='🎂 Send wishes', command=self._send_birthday_sms,
                               kind='primary', width=16, pady=8).pack(side=tk.RIGHT, padx=(0, 8))

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

        # Clear rows
        for w in self.bday_rows_frame.winfo_children():
            w.destroy()
        self.bday_row_vars.clear()

        if not processed_customers:
            tk.Label(self.bday_rows_frame, text='No customers match filters.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=12)
            self.bday_count_var.set('0 customers listed')
            return

        for c in processed_customers:
            cid = c['id']
            has_bday = bool(c.get('birthday'))
            var = tk.BooleanVar(value=cid in self.bday_selected_ids if has_bday else False)
            self.bday_row_vars[cid] = var

            row = tk.Frame(self.bday_rows_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, pady=4, padx=6)
            
            # Left flow
            left_flow = tk.Frame(row, bg=row['bg'])
            left_flow.pack(side=tk.LEFT, fill=tk.Y)
            
            if has_bday:
                chk = tk.Checkbutton(
                    left_flow, variable=var, command=lambda cid=cid: self._toggle_bday_customer(cid),
                    bg=row['bg'], selectcolor=self.theme.palette.bg_surface,
                    activebackground=row['bg']
                )
                chk.pack(side=tk.LEFT, padx=(4, 8))
            else:
                lbl_spacer = tk.Label(left_flow, text='     ', bg=row['bg'])
                lbl_spacer.pack(side=tk.LEFT, padx=(4, 8))

            name_lbl = tk.Label(
                left_flow, text=f"{c['name']} • {c['phone']}",
                font=self.theme.fonts.body_bold if has_bday else self.theme.fonts.body,
                bg=row['bg'], fg=self.theme.palette.text_primary if has_bday else self.theme.palette.text_muted
            )
            name_lbl.pack(side=tk.LEFT, anchor='w')

            # Right flow
            right_flow = tk.Frame(row, bg=row['bg'])
            right_flow.pack(side=tk.RIGHT, fill=tk.Y)

            days_until = c.get('days_until')
            if not has_bday:
                badge_text = '⚠️ Missing Birthday'
                badge_color = self.theme.palette.text_muted
                badge_bg = '#f3f4f6'
            elif days_until == 0:
                badge_text = '🎉 TODAY!'
                badge_color = '#ffffff'
                badge_bg = self.theme.palette.danger
            elif days_until == 1:
                badge_text = '🎂 Tomorrow!'
                badge_color = '#ffffff'
                badge_bg = self.theme.palette.warning
            else:
                badge_text = f'In {days_until} days'
                badge_color = self.theme.palette.text_primary
                badge_bg = '#e2e8f0'

            if cid in wished_ids:
                wished_lbl = tk.Label(
                    right_flow, text=f"✓ Sent '{datetime.now().strftime('%y')}", font=self.theme.fonts.small,
                    fg='#ffffff', bg='#0f766e', padx=6, pady=2
                )
                wished_lbl.pack(side=tk.LEFT, padx=(0, 6))

            badge_lbl = tk.Label(
                right_flow, text=badge_text, font=self.theme.fonts.small,
                fg=badge_color, bg=badge_bg, padx=6, pady=2
            )
            badge_lbl.pack(side=tk.LEFT, padx=(0, 10))

            btn_edit = self.theme.make_button(
                right_flow, text='✏️ Edit', command=lambda cust=c: self._open_edit_birthday_dialog(cust),
                kind='ghost', width=6, pady=2
            )
            btn_edit.pack(side=tk.LEFT, padx=(0, 4))

        self.bday_count_var.set(f"{len(processed_customers)} customer{'s' if len(processed_customers) != 1 else ''} listed")

    def _toggle_bday_customer(self, cid):
        var = self.bday_row_vars.get(cid)
        if var and var.get():
            self.bday_selected_ids.add(cid)
        else:
            self.bday_selected_ids.discard(cid)

    def _toggle_bday_select_all(self):
        select_all = self.bday_select_all_var.get()
        for cid, var in self.bday_row_vars.items():
            # Check if customer has birthday before checking/selecting
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
        dialog.configure(bg=self.theme.palette.bg_surface)
        dialog.transient(self.container)
        dialog.grab_set()

        # Center dialog
        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.theme.palette.bg_surface, padx=20, pady=20)
        main_frm.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            main_frm, text=f"Set Birthday for {customer['name']}",
            font=self.theme.fonts.body_bold, bg=dialog['bg'], fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))

        tk.Label(
            main_frm, text="Format: YYYY-MM-DD (e.g. 1990-05-15)",
            font=self.theme.fonts.small, bg=dialog['bg'], fg=self.theme.palette.text_muted
        ).pack(anchor='w', pady=(0, 4))

        bday_var = tk.StringVar(value=customer.get('birthday', '') or '')
        entry = tk.Entry(
            main_frm, textvariable=bday_var, font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary,
            relief='flat', highlightthickness=1, highlightcolor=self.theme.palette.accent,
            highlightbackground=self.theme.palette.border
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
            messagebox.showinfo("Success", f"Birthday updated for {customer['name']}.", parent=self.container)

        self.theme.make_button(btn_row, text='Save', command=save, kind='primary', width=10).pack(side=tk.RIGHT)
        self.theme.make_button(btn_row, text='Cancel', command=dialog.destroy, kind='ghost', width=10).pack(side=tk.RIGHT, padx=(0, 8))

    def _save_birthday_settings(self):
        auto_enabled = '1' if self.bday_auto_enabled_var.get() else '0'
        send_time = f"{self.bday_hour_var.get()}:{self.bday_min_var.get()}"
        
        set_setting('sms_birthday_auto_enabled', auto_enabled, 'Whether automated birthday SMS is enabled', self.user['id'])
        set_setting('sms_birthday_time', send_time, 'Daily time to send automated birthday SMS', self.user['id'])
        
        messagebox.showinfo('Success', 'Birthday automation settings saved.')

    def _save_birthday_template(self):
        body = self._get_text(self.bday_message_text)
        title = self.bday_template_var.get()
        save_sms_template('birthday', title, body, True, self.user['id'])
        self.templates['birthday'] = {'title': title, 'body': body, 'is_active': 1}
        messagebox.showinfo('Success', f'Birthday wishes template "{title}" saved.')

    def _send_birthday_sms(self):
        if not self._check_internet():
            return
        raw_message = self._get_text(self.bday_message_text)
        if not raw_message:
            messagebox.showwarning('SMS', 'Birthday message cannot be empty.')
            return

        customers = [c for c in self.bday_customers if c['id'] in self.bday_selected_ids]
        if not customers:
            messagebox.showwarning('SMS', 'Select at least one customer with a birthday.')
            return

        if not messagebox.askyesno('Confirm', f'Send birthday wishes to {len(customers)} customer{"s" if len(customers) > 1 else ""}?'):
            return

        self._open_sequential_sender_dialog(customers, raw_message)

    def _open_sequential_sender_dialog(self, customers, message_template):
        dialog = tk.Toplevel(self.container)
        dialog.title("Campaign Sequencer")
        dialog.geometry("550x450")
        dialog.configure(bg=self.theme.palette.bg_surface)
        dialog.transient(self.container)
        dialog.grab_set()

        # Center dialog
        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.theme.palette.bg_surface, padx=20, pady=20)
        main_frm.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            main_frm, text="SMS Campaign Progress",
            font=self.theme.fonts.h3, bg=dialog['bg'], fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 6))

        progress_var = tk.DoubleVar()
        progress_bar = ttk.Progressbar(main_frm, variable=progress_var, maximum=len(customers))
        progress_bar.pack(fill=tk.X, pady=(0, 10))

        status_lbl = tk.Label(
            main_frm, text=f"Preparing campaign for {len(customers)} recipients...",
            font=self.theme.fonts.body, bg=dialog['bg'], fg=self.theme.palette.text_primary
        )
        status_lbl.pack(anchor='w', pady=(0, 4))
        
        countdown_lbl = tk.Label(
            main_frm, text="",
            font=self.theme.fonts.body_bold, bg=dialog['bg'], fg=self.theme.palette.accent
        )
        countdown_lbl.pack(anchor='w', pady=(0, 10))

        # Log box
        log_box = tk.Text(
            main_frm, height=12, wrap='word',
            bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary,
            font=self.theme.fonts.small, relief='flat', bd=0, padx=8, pady=8
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

        btn_stop = self.theme.make_button(btn_row, text='Stop Campaign', command=stop_campaign, kind='primary')
        btn_stop.pack(side=tk.RIGHT)

        def tick():
            if campaign_state['cancelled']:
                return

            idx = campaign_state['index']
            if idx >= len(customers):
                append_log(f"Campaign complete. Success: {campaign_state['sent']}, Failed: {campaign_state['failed']}")
                btn_stop.configure(text="Close", command=dialog.destroy)
                countdown_lbl.configure(text="Campaign Finished! 🎉", fg=self.theme.palette.success)
                return

            if campaign_state['countdown'] > 0:
                countdown_lbl.configure(text=f"Next message in {campaign_state['countdown']} seconds...", fg=self.theme.palette.accent)
                campaign_state['countdown'] -= 1
                dialog.after(1000, tick)
                return

            # Send message
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
                countdown_lbl.configure(text="Next message in 3 seconds...", fg=self.theme.palette.accent)
                dialog.after(1000, tick)
            else:
                dialog.after(100, tick)

        tick()

    def _schedule_birthday_sms(self):
        raw_message = self._get_text(self.bday_message_text)
        if not raw_message:
            messagebox.showwarning('SMS', 'Birthday message cannot be empty.')
            return

        customers = [c for c in self.bday_customers if c['id'] in self.bday_selected_ids]
        if not customers:
            messagebox.showwarning('SMS', 'Select at least one customer with a birthday.')
            return

        dialog = tk.Toplevel(self.container)
        dialog.title("Schedule SMS Campaign")
        dialog.geometry("380x280")
        dialog.resizable(False, False)
        dialog.configure(bg=self.theme.palette.bg_surface)
        dialog.transient(self.container)
        dialog.grab_set()

        # Center dialog
        dialog.update_idletasks()
        x = self.container.winfo_rootx() + (self.container.winfo_width() - dialog.winfo_width()) // 2
        y = self.container.winfo_rooty() + (self.container.winfo_height() - dialog.winfo_height()) // 2
        dialog.geometry(f"+{x}+{y}")

        main_frm = tk.Frame(dialog, bg=self.theme.palette.bg_surface, padx=20, pady=20)
        main_frm.pack(fill=tk.BOTH, expand=True)

        tk.Label(
            main_frm, text=f"Schedule Wishes for {len(customers)} Customers",
            font=self.theme.fonts.body_bold, bg=dialog['bg'], fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))

        tk.Label(main_frm, text="Scheduled Date (YYYY-MM-DD):", font=self.theme.fonts.small, bg=dialog['bg'], fg=self.theme.palette.text_muted).pack(anchor='w', pady=(0, 4))
        date_var = tk.StringVar(value=datetime.now().strftime("%Y-%m-%d"))
        date_entry = tk.Entry(
            main_frm, textvariable=date_var, font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary,
            relief='flat', highlightthickness=1, highlightbackground=self.theme.palette.border,
            highlightcolor=self.theme.palette.accent
        )
        date_entry.pack(fill=tk.X, pady=(0, 10), ipady=4)

        tk.Label(main_frm, text="Scheduled Time (HH:MM):", font=self.theme.fonts.small, bg=dialog['bg'], fg=self.theme.palette.text_muted).pack(anchor='w', pady=(0, 4))
        time_row = tk.Frame(main_frm, bg=dialog['bg'])
        time_row.pack(fill=tk.X, pady=(0, 20))

        h_var = tk.StringVar(value=datetime.now().strftime("%H"))
        m_var = tk.StringVar(value="00")

        hour_combo = self.theme.make_combobox(time_row, variable=h_var, values=[f"{h:02d}" for h in range(24)], width=5)
        hour_combo.pack(side=tk.LEFT)
        tk.Label(time_row, text=':', bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=4)
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
            messagebox.showinfo("Scheduled", f"Successfully scheduled {len(customers)} messages for {sched_datetime_str}.", parent=self.container)
            
            if hasattr(self, '_refresh_scheduled_queue'):
                self._refresh_scheduled_queue()

        self.theme.make_button(btn_row, text='Schedule', command=save_schedule, kind='primary', width=12).pack(side=tk.RIGHT)
        self.theme.make_button(btn_row, text='Cancel', command=dialog.destroy, kind='ghost', width=12).pack(side=tk.RIGHT, padx=(0, 8))

    def _build_scheduled_tab(self):
        self._clear(self.scheduled_tab)
        card = self.theme.make_card(self.scheduled_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'Scheduled SMS Queue', '📅').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'View all messages scheduled to be sent. Pending messages will be dispatched automatically at their scheduled time.').pack(anchor='w', padx=14, pady=(0, 10))

        # Refresh button
        header = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        header.pack(fill=tk.X, padx=14, pady=(0, 8))
        self.theme.make_button(header, text='🔄 Refresh Queue', command=self._refresh_scheduled_queue,
                               kind='ghost', width=16).pack(side=tk.RIGHT)

        # Table/List of scheduled SMS
        list_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        style = ttk.Style()
        style.configure("Scheduled.Treeview", font=self.theme.fonts.body, rowheight=30)
        style.configure("Scheduled.Treeview.Heading", font=self.theme.fonts.body_bold)

        self.sched_tree = ttk.Treeview(
            list_frame, columns=('recipient', 'customer', 'message', 'scheduled_time', 'status', 'actions'),
            show='headings', style="Scheduled.Treeview"
        )
        self.sched_tree.heading('recipient', text='Recipient')
        self.sched_tree.heading('customer', text='Customer')
        self.sched_tree.heading('message', text='Message')
        self.sched_tree.heading('scheduled_time', text='Scheduled Time')
        self.sched_tree.heading('status', text='Status')
        self.sched_tree.heading('actions', text='Actions')

        self.sched_tree.column('recipient', width=120, anchor='w')
        self.sched_tree.column('customer', width=150, anchor='w')
        self.sched_tree.column('message', width=300, anchor='w')
        self.sched_tree.column('scheduled_time', width=150, anchor='center')
        self.sched_tree.column('status', width=90, anchor='center')
        self.sched_tree.column('actions', width=80, anchor='center')

        self.sched_tree.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        scrollbar = ttk.Scrollbar(list_frame, orient=tk.VERTICAL, command=self.sched_tree.yview)
        self.sched_tree.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        self.sched_tree.bind('<Double-1>', self._on_scheduled_row_double_click)
        
        self._refresh_scheduled_queue()

    def _refresh_scheduled_queue(self):
        if not hasattr(self, 'sched_tree'):
            return
        for item in self.sched_tree.get_children():
            self.sched_tree.delete(item)

        queue = list_scheduled_sms(100)
        for item in queue:
            customer_display = f"{item['customer_name']} ({item['customer_nic']})" if item['customer_name'] else 'Manual Number'
            status_display = item['status'].upper()
            self.sched_tree.insert(
                '', tk.END, iid=str(item['id']),
                values=(
                    item['recipient'],
                    customer_display,
                    item['message'][:60] + ('...' if len(item['message']) > 60 else ''),
                    item['scheduled_time'],
                    status_display,
                    '❌ Cancel' if item['status'] == 'pending' else 'N/A'
                )
            )

    def _on_scheduled_row_double_click(self, event):
        item_id = self.sched_tree.focus()
        if not item_id:
            return
        
        values = self.sched_tree.item(item_id, 'values')
        status = values[4]
        if status != 'PENDING':
            messagebox.showinfo('Info', f"This message is already {status.lower()} and cannot be cancelled.")
            return

        if messagebox.askyesno('Cancel Scheduled SMS', 'Are you sure you want to cancel and delete this scheduled message?'):
            delete_scheduled_sms(int(item_id))
            self._refresh_scheduled_queue()

    def _build_failed_tab(self):
        self._clear(self.failed_tab)
        card = self.theme.make_card(self.failed_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'Failed SMS Manager', '❌').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'View all messages that failed to send. Select a row and click "Resend" to retry sending.').pack(anchor='w', padx=14, pady=(0, 10))

        # Control Row
        header = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        header.pack(fill=tk.X, padx=14, pady=(0, 8))
        
        self.theme.make_button(header, text='🔄 Refresh List', command=self._refresh_failed_list,
                               kind='ghost', width=16).pack(side=tk.RIGHT)
        
        self.theme.make_button(header, text='🔄 Resend Selected', command=self._resend_failed_sms,
                               kind='primary', width=20).pack(side=tk.RIGHT, padx=(0, 8))

        # Table/List of Failed SMS
        list_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        style = ttk.Style()
        style.configure("Failed.Treeview", font=self.theme.fonts.body, rowheight=30)
        style.configure("Failed.Treeview.Heading", font=self.theme.fonts.body_bold)

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
            messagebox.showwarning('Warning', 'Please select a failed SMS message from the list.')
            return

        values = self.failed_tree.item(selected_item, 'values')
        msg_id = int(values[0])
        recipient = values[1]
        
        conn = get_connection()
        row = conn.execute("SELECT message, category, customer_id, loan_id FROM sms_messages WHERE id = ?", (msg_id,)).fetchone()
        conn.close()
        
        if not row:
            messagebox.showerror('Error', 'Failed to retrieve the message content from the database.')
            return
            
        message = row['message']
        category = row['category']
        customer_id = row['customer_id']
        loan_id = row['loan_id']
        
        customer = None
        if customer_id:
            customer = get_customer(customer_id)

        # Attempt resending
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
            
            messagebox.showinfo('Success', f'SMS resent successfully to {recipient}!')
            self._refresh_failed_list()
            if hasattr(self, '_refresh_history_table'):
                self._refresh_history_table()
        else:
            messagebox.showerror('Failed', f'Resending failed: {res_text}')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 5 — Templates Manager
    # ══════════════════════════════════════════════════════════════════════

    def _build_templates_tab(self):
        self._clear(self.templates_tab)
        card = self.theme.make_card(self.templates_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'SMS Template Manager', '📋').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Manage all SMS templates. Create new templates, edit existing ones, or delete custom templates.').pack(anchor='w', padx=14, pady=(0, 10))

        body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        body.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))
        body.grid_columnconfigure(0, weight=1, minsize=220)
        body.grid_columnconfigure(1, weight=3)
        body.grid_rowconfigure(0, weight=1)

        # Left — Template list
        left = tk.Frame(body, bg=self.theme.palette.bg_surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 12))

        tk.Label(left, text='📄 Templates', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))

        # Listbox with horizontal scroll
        list_outer = tk.Frame(left, bg=self.theme.palette.bg_surface)
        list_outer.pack(fill=tk.BOTH, expand=True)

        self.tpl_listbox = tk.Listbox(
            list_outer, height=14,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground='white',
            activestyle='none',
            font=self.theme.fonts.body,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bd=0,
        )
        tpl_vbar = ttk.Scrollbar(list_outer, orient=tk.VERTICAL, command=self.tpl_listbox.yview)
        self.tpl_listbox.configure(yscrollcommand=tpl_vbar.set)
        tpl_vbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.tpl_listbox.pack(fill=tk.BOTH, expand=True)
        self.tpl_listbox.bind('<<ListboxSelect>>', self._on_template_select)

        # Buttons — stacked vertically for visibility
        btn_bar = tk.Frame(left, bg=self.theme.palette.bg_surface)
        btn_bar.pack(fill=tk.X, pady=(8, 0))
        btn_bar.grid_columnconfigure(0, weight=1)
        btn_bar.grid_columnconfigure(1, weight=1)
        btn_bar.grid_columnconfigure(2, weight=1)

        new_btn = self.theme.make_button(btn_bar, text='➕ New', command=self._new_template,
                               kind='ghost', width=7, pady=6)
        new_btn.grid(row=0, column=0, sticky='ew', padx=(0, 4))
        del_btn = self.theme.make_button(btn_bar, text='🗑️ Delete', command=self._delete_template,
                               kind='danger', width=7, pady=6)
        del_btn.grid(row=0, column=1, sticky='ew', padx=(0, 4))
        save_btn = self.theme.make_button(btn_bar, text='💾 Save', command=self._save_edited_template,
                               kind='primary', width=7, pady=6)
        save_btn.grid(row=0, column=2, sticky='ew')

        # Right — Template editor
        right = tk.Frame(body, bg=self.theme.palette.bg_surface)
        right.grid(row=0, column=1, sticky='nsew')

        # Category & Title
        form = tk.Frame(right, bg=self.theme.palette.bg_surface)
        form.pack(fill=tk.X, pady=(0, 8))

        tk.Label(form, text='Category:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=0, sticky='w', pady=4)
        self.tpl_category_var = tk.StringVar()
        cat_entry = self.theme.make_entry(form, variable=self.tpl_category_var)
        cat_entry.grid(row=0, column=1, sticky='ew', padx=(8, 0), pady=4)

        tk.Label(form, text='Title:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=1, column=0, sticky='w', pady=4)
        self.tpl_title_var = tk.StringVar()
        title_entry = self.theme.make_entry(form, variable=self.tpl_title_var)
        title_entry.grid(row=1, column=1, sticky='ew', padx=(8, 0), pady=4)

        form.grid_columnconfigure(1, weight=1)

        tk.Label(right, text='Template Body:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))

        editor_frame = tk.Frame(right, bg=self.theme.palette.bg_surface)
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
            messagebox.showwarning('Template', 'Category is required.')
            return
        if not title:
            messagebox.showwarning('Template', 'Title is required.')
            return
        if not body:
            messagebox.showwarning('Template', 'Template body is required.')
            return

        # Sanitize category (lowercase, underscores)
        category = category.lower().strip().replace(' ', '_')

        save_sms_template(category, title, body, True, self.user['id'])
        self.templates[category] = {'title': title, 'body': body, 'is_active': 1}
        messagebox.showinfo('Success', f'Template "{title}" saved.')
        self._refresh_template_list()

    def _delete_template(self):
        selection = self.tpl_listbox.curselection()
        if not selection:
            messagebox.showwarning('Template', 'Select a template to delete.')
            return

        idx = selection[0]
        if idx >= len(self.tpl_categories):
            return

        cat = self.tpl_categories[idx]
        # Prevent deletion of core system templates
        protected = {'custom', 'auto', 'auto_new_loan', 'auto_renewal', 'auto_redemption', 'auto_reminder', 'promotion', 'birthday'}
        if cat in protected:
            messagebox.showwarning('Template', f'Cannot delete system template "{cat}". You can edit it instead.')
            return

        if not messagebox.askyesno('Confirm', f'Delete template "{cat}"?'):
            return

        delete_sms_template(cat)
        self.templates.pop(cat, None)
        self._refresh_template_list()
        self.tpl_category_var.set('')
        self.tpl_title_var.set('')
        self._set_text(self.tpl_body_text, '')
        messagebox.showinfo('Success', 'Template deleted.')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 6 — History
    # ══════════════════════════════════════════════════════════════════════

    def _build_history_tab(self):
        self._clear(self.history_tab)
        card = self.theme.make_card(self.history_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'SMS History', '📊').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'View all sent SMS messages with filtering options.').pack(anchor='w', padx=14, pady=(0, 10))

        # Gateway summary
        summary = tk.Frame(card.inner, bg=self.theme.palette.bg_surface_alt,
                           highlightthickness=1, highlightbackground=self.theme.palette.border)
        summary.pack(fill=tk.X, padx=14, pady=(0, 10))

        summary_inner = tk.Frame(summary, bg=self.theme.palette.bg_surface_alt)
        summary_inner.pack(fill=tk.X, padx=14, pady=8)

        gateway_info = [
            ('Gateway', get_setting('sms_gateway_base_url', 'https://app.text.lk/api/v3/sms/send')),
            ('Sender ID', get_setting('sms_sender_id', 'Not configured')),
            ('Status', 'Enabled' if get_setting('sms_enabled', '0') == '1' else 'Disabled'),
            ('API Token', 'Configured ✅' if get_setting('sms_gateway_token', '') else 'Missing ⚠️'),
        ]
        for i, (label, value) in enumerate(gateway_info):
            tk.Label(summary_inner, text=f'{label}: ', font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).grid(row=0, column=i*2, sticky='w', padx=(0, 2))
            tk.Label(summary_inner, text=value, font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).grid(row=0, column=i*2+1, sticky='w', padx=(0, 16))

        # Filters
        filter_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        filter_row.pack(fill=tk.X, padx=14, pady=(0, 8))

        tk.Label(filter_row, text='Filter:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        self.hist_cat_var = tk.StringVar(value='All')
        cat_values = ['All', 'Custom', 'Auto', 'New Loan', 'Renewal', 'Redemption', 'Reminder', 'Promotion', 'Birthday', 'Loan Status']
        self.theme.make_combobox(filter_row, variable=self.hist_cat_var, values=cat_values, width=12,
                                 command=lambda _: self._refresh_history()).pack(side=tk.LEFT, padx=(8, 8))

        self.hist_status_var = tk.StringVar(value='All')
        self.theme.make_combobox(filter_row, variable=self.hist_status_var, values=['All', 'Sent', 'Failed', 'Pending'], width=10,
                                 command=lambda _: self._refresh_history()).pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(filter_row, text='🔄 Refresh', command=self._refresh_history,
                               kind='ghost', width=10, pady=6).pack(side=tk.LEFT)

        self.hist_total_var = tk.StringVar(value='')
        tk.Label(filter_row, textvariable=self.hist_total_var, font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.RIGHT)

        # History table (using Treeview for table-style display)
        tree_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

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

        self._refresh_history()

    def _refresh_history(self):
        # Map filter values to db categories
        cat_map = {
            'All': '', 'Custom': 'custom', 'Auto': 'auto', 'New Loan': 'auto_new_loan',
            'Renewal': 'auto_renewal', 'Redemption': 'auto_redemption', 'Reminder': 'auto_reminder',
            'Promotion': 'promotion', 'Birthday': 'birthday', 'Loan Status': 'order_status',
        }
        status_map = {'All': '', 'Sent': 'sent', 'Failed': 'failed', 'Pending': 'pending'}

        cat = cat_map.get(self.hist_cat_var.get(), '')
        status = status_map.get(self.hist_status_var.get(), '')

        messages = list_sms_messages_filtered(category=cat, status=status, limit=200)

        # Clear tree
        for item in self.hist_tree.get_children():
            self.hist_tree.delete(item)

        for msg in messages:
            cat_label = CATEGORY_LABELS.get(msg.get('category', ''), msg.get('category', ''))
            status_val = msg.get('status', '')
            recipient_name = msg.get('customer_name') or msg.get('recipient', '')
            msg_preview = (msg.get('message', '') or '')[:80]
            date_val = msg.get('created_at', '')

            self.hist_tree.insert('', tk.END, values=(
                date_val, recipient_name, cat_label, status_val.upper(), msg_preview
            ))

        self.hist_total_var.set(f'{len(messages)} messages')

    # ══════════════════════════════════════════════════════════════════════
    # TAB 7 — Analytics
    # ══════════════════════════════════════════════════════════════════════

    def _build_analytics_tab(self):
        self._clear(self.analytics_tab)
        card = self.theme.make_card(self.analytics_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=4, pady=4)

        self._section_label(card.inner, 'SMS Analytics', '📈').pack(anchor='w', padx=14, pady=(10, 2))
        self._desc_label(card.inner, 'Overview of your SMS messaging performance and usage statistics.').pack(anchor='w', padx=14, pady=(0, 10))

        # Refresh button
        ref_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        ref_row.pack(fill=tk.X, padx=14, pady=(0, 10))
        self.theme.make_button(ref_row, text='🔄 Refresh Analytics',
                               command=self._refresh_analytics,
                               kind='ghost', width=16, pady=6).pack(side=tk.LEFT)

        # Scrollable content area
        scroll_outer = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        scroll_outer.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        canvas = tk.Canvas(scroll_outer, bg=self.theme.palette.bg_surface, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(scroll_outer, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.analytics_content = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
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
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(pady=20)
            return

        # ── Stat Cards Row ──
        stats_row = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        stats_row.pack(fill=tk.X, pady=(0, 16))
        stats_row.grid_columnconfigure(0, weight=1)
        stats_row.grid_columnconfigure(1, weight=1)
        stats_row.grid_columnconfigure(2, weight=1)
        stats_row.grid_columnconfigure(3, weight=1)
        stats_row.grid_columnconfigure(4, weight=1)

        cards_data = [
            ('Total SMS', data['total'], self.theme.palette.accent),
            ('Sent ✅', data['sent'], self.theme.palette.success),
            ('Failed ❌', data['failed'], self.theme.palette.danger),
            ('Pending ⏳', data['pending'], self.theme.palette.warning),
            ('Success Rate', f"{data['success_rate']}%", self.theme.palette.success),
        ]
        for i, (title, value, color) in enumerate(cards_data):
            c = self._stat_card(stats_row, title, value, color)
            c.grid(row=0, column=i, sticky='nsew', padx=4)

        # ── Two column layout ──
        two_col = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        two_col.pack(fill=tk.BOTH, expand=True)
        two_col.grid_columnconfigure(0, weight=1)
        two_col.grid_columnconfigure(1, weight=1)

        # ── By Category ──
        cat_frame = tk.Frame(two_col, bg=self.theme.palette.bg_surface_alt,
                             highlightthickness=1, highlightbackground=self.theme.palette.border)
        cat_frame.grid(row=0, column=0, sticky='nsew', padx=(0, 6), pady=(0, 12))

        tk.Label(cat_frame, text='📊 SMS by Category', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        if data['by_category']:
            max_cnt = max(r['cnt'] for r in data['by_category']) if data['by_category'] else 1
            for row_data in data['by_category']:
                row = tk.Frame(cat_frame, bg=self.theme.palette.bg_surface_alt)
                row.pack(fill=tk.X, padx=14, pady=3)
                label = CATEGORY_LABELS.get(row_data['category'], row_data['category'])
                tk.Label(row, text=label, font=self.theme.fonts.body, width=12, anchor='w',
                         bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

                bar_frame = tk.Frame(row, bg=self.theme.palette.bg_surface_alt)
                bar_frame.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 8))
                bar_pct = (row_data['cnt'] / max_cnt) if max_cnt > 0 else 0
                bar_canvas = tk.Canvas(bar_frame, height=18, bg=self.theme.palette.bg_surface_alt,
                                       highlightthickness=0, bd=0)
                bar_canvas.pack(fill=tk.X)
                bar_canvas.update_idletasks()
                bar_canvas.bind('<Configure>', lambda e, bc=bar_canvas, pct=bar_pct: self._draw_bar(bc, pct))

                tk.Label(row, text=str(row_data['cnt']), font=self.theme.fonts.body_bold,
                         bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.accent).pack(side=tk.RIGHT)

            # Spacer at bottom
            tk.Frame(cat_frame, bg=self.theme.palette.bg_surface_alt, height=10).pack()
        else:
            tk.Label(cat_frame, text='No data', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(pady=10)

        # ── Top Recipients ──
        recip_frame = tk.Frame(two_col, bg=self.theme.palette.bg_surface_alt,
                               highlightthickness=1, highlightbackground=self.theme.palette.border)
        recip_frame.grid(row=0, column=1, sticky='nsew', padx=(6, 0), pady=(0, 12))

        tk.Label(recip_frame, text='👤 Top Recipients', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        if data['top_recipients']:
            for i, r in enumerate(data['top_recipients']):
                row = tk.Frame(recip_frame, bg=self.theme.palette.bg_surface_alt)
                row.pack(fill=tk.X, padx=14, pady=2)
                rank_color = self.theme.palette.accent if i < 3 else self.theme.palette.text_muted
                tk.Label(row, text=f'#{i+1}', font=self.theme.fonts.body_bold, width=3,
                         bg=self.theme.palette.bg_surface_alt, fg=rank_color).pack(side=tk.LEFT)
                tk.Label(row, text=r['recipient'], font=self.theme.fonts.body,
                         bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=(4, 0))
                tk.Label(row, text=f"{r['cnt']} SMS", font=self.theme.fonts.body_bold,
                         bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.accent).pack(side=tk.RIGHT)

            tk.Frame(recip_frame, bg=self.theme.palette.bg_surface_alt, height=10).pack()
        else:
            tk.Label(recip_frame, text='No data', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(pady=10)

        # ── Daily Activity (last 30 days) ──
        daily_frame = tk.Frame(parent, bg=self.theme.palette.bg_surface_alt,
                               highlightthickness=1, highlightbackground=self.theme.palette.border)
        daily_frame.pack(fill=tk.X, pady=(0, 12))

        tk.Label(daily_frame, text='📅 Daily SMS Activity (Last 30 Days)', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        if data['daily']:
            # Create visual bar chart using Canvas
            chart_canvas = tk.Canvas(daily_frame, height=120, bg=self.theme.palette.bg_surface_alt,
                                     highlightthickness=0, bd=0)
            chart_canvas.pack(fill=tk.X, padx=14, pady=(0, 10))
            chart_canvas.update_idletasks()
            chart_canvas.bind('<Configure>', lambda e: self._draw_daily_chart(chart_canvas, data['daily']))

            # Legend
            legend = tk.Frame(daily_frame, bg=self.theme.palette.bg_surface_alt)
            legend.pack(padx=14, pady=(0, 10), anchor='w')
            tk.Label(legend, text='■', fg=self.theme.palette.success, bg=self.theme.palette.bg_surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT)
            tk.Label(legend, text='Sent', fg=self.theme.palette.text_muted, bg=self.theme.palette.bg_surface_alt,
                     font=self.theme.fonts.small).pack(side=tk.LEFT, padx=(2, 10))
            tk.Label(legend, text='■', fg=self.theme.palette.danger, bg=self.theme.palette.bg_surface_alt,
                     font=('Segoe UI', 8)).pack(side=tk.LEFT)
            tk.Label(legend, text='Failed', fg=self.theme.palette.text_muted, bg=self.theme.palette.bg_surface_alt,
                     font=self.theme.fonts.small).pack(side=tk.LEFT, padx=(2, 0))
        else:
            tk.Label(daily_frame, text='No activity in the last 30 days.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_muted).pack(pady=10)

    def _draw_bar(self, canvas, pct):
        """Draw a horizontal progress bar on a canvas."""
        canvas.delete('all')
        w = canvas.winfo_width()
        h = canvas.winfo_height()
        if w <= 1:
            return
        bar_w = max(2, int(w * pct))
        canvas.create_rectangle(0, 2, bar_w, h - 2, fill=self.theme.palette.accent, outline='')
        canvas.create_rectangle(bar_w, 2, w, h - 2, fill=self.theme.palette.border, outline='')

    def _draw_daily_chart(self, canvas, daily_data):
        """Draw a simple bar chart for daily SMS counts."""
        canvas.delete('all')
        w = canvas.winfo_width()
        h = canvas.winfo_height()
        if w <= 1 or not daily_data:
            return

        # Show last 30 days max
        days = daily_data[:30]
        days.reverse()  # oldest first
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

            # Failed bar (stacked on top of sent)
            total_h = sent_h + failed_h
            if sent_h > 0:
                canvas.create_rectangle(x, h - 20 - total_h, x + bar_w, h - 20 - failed_h,
                                        fill=self.theme.palette.success, outline='')
            if failed_h > 0:
                canvas.create_rectangle(x, h - 20 - failed_h, x + bar_w, h - 20,
                                        fill=self.theme.palette.danger, outline='')

            # Date label (show every few bars)
            if n <= 15 or i % max(1, n // 8) == 0:
                day_label = d.get('day', '')[-5:]  # MM-DD
                canvas.create_text(x + bar_w // 2, h - 8, text=day_label,
                                   font=('Segoe UI', 7), fill=self.theme.palette.text_muted)
