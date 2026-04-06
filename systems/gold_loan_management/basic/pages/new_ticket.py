"""New Loan Ticket Page for Gold Loan System."""

import re
import sqlite3
import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
from database import (get_customer_by_nic, create_customer, create_loan,
                      generate_ticket_no, get_market_rate, get_duration_rate,
                      get_all_duration_rates, add_audit_log, search_recent_purposes,
                 search_recent_descriptions, create_approval_request,
              get_article_types, get_setting, search_recent_customer_jobs)
from utils import (format_currency, calculate_market_value, calculate_assessed_value,
                         calculate_interest, get_expire_date, ARTICLE_TYPES, CARAT_OPTIONS)


# Persist new-ticket draft across page instances (tab/panel navigation).
NEW_TICKET_DRAFT = {}


class NewTicketPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.items = []
        self.duration_rates = get_all_duration_rates()
        self.article_types = get_article_types() or ARTICLE_TYPES
        self._gold_wt_manual_override = False
        self.is_other_bank_var = tk.BooleanVar(value=False)
        self.service_charge_payment_mode_var = tk.StringVar(value='balance')
        self.service_charge_amount_var = tk.StringVar(value='')
        self._service_charge_user_edited = False
        self._form_state = dict(NEW_TICKET_DRAFT)
        self._birthday_syncing = False

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        # We will pack view at the absolute end to prevent visual stuttering during load.
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        tk.Label(hdr, text='📝 Create New Loan Ticket', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        clear_btn = self.theme.make_button(hdr, text='Clear', command=self._clear_form, kind='danger', width=8, pady=4)
        clear_btn.pack(side=tk.RIGHT)

        # Main layout: left = form, right = summary
        main = tk.Frame(view, bg=self.theme.palette.bg_app)
        main.pack(fill=tk.BOTH, expand=True)
        main.grid_columnconfigure(0, weight=3)
        main.grid_columnconfigure(1, weight=2)

        # ═══ LEFT: Customer & Items ═══
        left = tk.Frame(main, bg=self.theme.palette.bg_app)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 8))

        # Customer Section
        cust_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        cust_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(cust_card.inner, text='👤 Customer Details', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        cust_form = tk.Frame(cust_card.inner, bg=self.theme.palette.bg_surface)
        cust_form.pack(fill=tk.X, padx=14, pady=(0, 14))

        # NIC + Search
        row1 = tk.Frame(cust_form, bg=self.theme.palette.bg_surface)
        row1.pack(fill=tk.X, pady=(0, 6))
        row1.grid_columnconfigure(1, weight=1)
        tk.Label(row1, text='NIC / ID:', font=self.theme.fonts.body_bold, width=10, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=0, sticky='w')
        self.nic_var = tk.StringVar()
        nic_entry = self.theme.make_entry(row1, variable=self.nic_var)
        nic_entry.grid(row=0, column=1, sticky='ew', padx=(0, 8))
        nic_entry.entry.bind('<Return>', lambda e: self._on_nic_enter())

        search_btn = self.theme.make_button(row1, text='Search', command=self._search_customer,
                            kind='ghost', width=10, pady=6)
        search_btn.grid(row=0, column=2, sticky='e')

        fields = [('Name:', 'name'), ('Phone:', 'phone'), ('Address:', 'address')]
        self.cust_vars = {}
        self.cust_entries = {}
        for label, key in fields:
            row = tk.Frame(cust_form, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, pady=(0, 6))
            tk.Label(row, text=label, font=self.theme.fonts.body_bold, width=10, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            var = tk.StringVar()
            self.cust_vars[key] = var
            entry = self.theme.make_entry(row, variable=var)
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
            entry.entry.bind('<Return>', lambda e: e.widget.tk_focusNext().focus_set() or 'break')
            self.cust_entries[key] = entry

        self.cust_vars['birthday'] = tk.StringVar()
        self._render_birthday_row(cust_form)
        self.cust_vars['birthday'].trace_add('write', self._on_birthday_var_changed)

        self.cust_vars['job'] = tk.StringVar()
        self._render_job_row(cust_form)

        self.cust_vars['marital_status'] = tk.StringVar(value='Unmarried')
        self._render_marital_status_row(cust_form)

        self.cust_vars['language'] = tk.StringVar(value='Sinhala')
        self._render_language_row(cust_form)

        self.customer_id = None
        self.cust_status = tk.Label(cust_form, text='', font=self.theme.fonts.small,
                                    bg=self.theme.palette.bg_surface, fg=self.theme.palette.success)
        self.cust_status.pack(anchor='w', pady=(4, 0))

        # Article Items Section
        items_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        items_card.pack(fill=tk.BOTH, expand=True, pady=(0, 10))
        tk.Label(items_card.inner, text='💍 Gold Articles', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        item_form = tk.Frame(items_card.inner, bg=self.theme.palette.bg_surface)
        item_form.pack(fill=tk.X, padx=14)

        # Article type
        r1 = tk.Frame(item_form, bg=self.theme.palette.bg_surface)
        r1.pack(fill=tk.X, pady=(0, 6))
        r1.grid_columnconfigure(1, minsize=180)
        tk.Label(r1, text='Type:', font=self.theme.fonts.body_bold, width=8, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=0, sticky='w')
        self.article_type_var = tk.StringVar(value=self.article_types[0])
        self.article_type_combo = self.theme.make_combobox(r1, variable=self.article_type_var, values=self.article_types, width=18)
        self.article_type_combo.grid(row=0, column=1, sticky='w', padx=(0, 10))

        tk.Label(r1, text='Qty:', font=self.theme.fonts.body_bold, width=5, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=2, sticky='w')
        self.qty_var = tk.StringVar(value='1')
        qty_entry = self.theme.make_entry(r1, variable=self.qty_var, width=6)
        qty_entry.grid(row=0, column=3, sticky='w')

        # Weights
        r2 = tk.Frame(item_form, bg=self.theme.palette.bg_surface)
        r2.pack(fill=tk.X, pady=(0, 6))
        r2.grid_columnconfigure(1, weight=1)
        r2.grid_columnconfigure(3, weight=1)
        tk.Label(r2, text='Total Wt (g):', font=self.theme.fonts.body_bold, width=10, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=0, sticky='w')
        self.total_wt_var = tk.StringVar()
        self.total_wt_entry = self.theme.make_entry(r2, variable=self.total_wt_var, width=10)
        self.total_wt_entry.grid(row=0, column=1, sticky='ew', padx=(0, 10))
        tk.Label(r2, text='Deduction Wt (g):', font=self.theme.fonts.body_bold, width=15, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=2, sticky='w')
        self.deduction_wt_var = tk.StringVar(value='0')
        self.deduction_wt_entry = self.theme.make_entry(r2, variable=self.deduction_wt_var, width=10)
        self.deduction_wt_entry.grid(row=0, column=3, sticky='ew')
        self.total_wt_entry.entry.bind('<Return>', lambda e: self.deduction_wt_entry.entry.focus_set() or 'break')
        self.deduction_wt_entry.entry.bind('<Return>', lambda e: carat_combo.focus_set() or 'break')

        # Carat + Description
        r3 = tk.Frame(item_form, bg=self.theme.palette.bg_surface)
        r3.pack(fill=tk.X, pady=(0, 6))
        r3.grid_columnconfigure(3, weight=1)
        tk.Label(r3, text='Carat:', font=self.theme.fonts.body_bold, width=8, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=0, sticky='w')
        self.carat_var = tk.StringVar(value='22')
        carat_combo = self.theme.make_combobox(r3, variable=self.carat_var, values=[str(c) for c in CARAT_OPTIONS], width=6)
        carat_combo.grid(row=0, column=1, sticky='w', padx=(0, 10))

        tk.Label(r3, text='Description:', font=self.theme.fonts.body_bold, width=10, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).grid(row=0, column=2, sticky='w')
        self.desc_var = tk.StringVar()
        self.desc_entry = self.theme.make_entry(r3, variable=self.desc_var, width=20)
        self.desc_entry.grid(row=0, column=3, sticky='ew')
        self.desc_entry.entry.bind('<KeyRelease>', self._on_desc_key)
        self.desc_entry.entry.bind('<Down>', lambda e: self._on_suggestion_nav('_desc_listbox', 1) and 'break')
        self.desc_entry.entry.bind('<Up>', lambda e: self._on_suggestion_nav('_desc_listbox', -1) and 'break')
        self.desc_entry.entry.bind(
            '<Return>',
            lambda e: (self._on_suggestion_pick('_desc_listbox', self._select_desc) or (self._add_item() or True)) and 'break'
        )
        carat_combo.bind('<Return>', lambda e: self.desc_entry.entry.focus_set() or 'break')

        # Add Item button
        add_btn_frame = tk.Frame(item_form, bg=self.theme.palette.bg_surface)
        add_btn_frame.pack(fill=tk.X, pady=(4, 8))
        add_btn = self.theme.make_button(add_btn_frame, text='Add Article', command=self._add_item,
                                         kind='primary', width=14, pady=6)
        add_btn.pack(side=tk.LEFT)

        # Items list
        self.items_list_frame = tk.Frame(items_card.inner, bg=self.theme.palette.bg_surface)
        self.items_list_frame.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))
        self._render_items()

        # ═══ RIGHT: Loan Details & Summary ═══
        right = tk.Frame(main, bg=self.theme.palette.bg_app)
        right.grid(row=0, column=1, sticky='nsew')

        # Loan Details
        loan_card = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        loan_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(loan_card.inner, text='📋 Loan Details', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        loan_form = tk.Frame(loan_card.inner, bg=self.theme.palette.bg_surface)
        loan_form.pack(fill=tk.X, padx=14, pady=(0, 14))

        # Purpose
        purpose_entry = self._make_form_row(loan_form, 'Purpose:', 'purpose')
        self._purpose_entry = purpose_entry.entry
        purpose_entry.entry.bind('<KeyRelease>', self._on_purpose_key)
        purpose_entry.entry.bind('<Down>', lambda e: self._on_suggestion_nav('_purpose_listbox', 1) and 'break')
        purpose_entry.entry.bind('<Up>', lambda e: self._on_suggestion_nav('_purpose_listbox', -1) and 'break')
        purpose_entry.entry.bind(
            '<Return>',
            lambda e: self._on_suggestion_pick('_purpose_listbox', self._select_purpose) or (e.widget.tk_focusNext().focus_set() or 'break')
        )

        # Duration
        dur_row = tk.Frame(loan_form, bg=self.theme.palette.bg_surface)
        dur_row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(dur_row, text='Duration:', font=self.theme.fonts.body_bold, width=12, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        dur_options = [f"{d['duration_months']} month(s)" for d in self.duration_rates]
        self.duration_var = tk.StringVar(value='')
        dur_combo = self.theme.make_combobox(dur_row, variable=self.duration_var, values=dur_options, width=14)
        dur_combo.pack(side=tk.LEFT)
        
        # We manually bind it manually over the entry or listbox generated by make_combobox if necessary.
        dur_combo.bind('<Return>', lambda e: self._recalculate())
        dur_combo.bind('<<ComboboxSelected>>', lambda e: self._recalculate())
        self.duration_var.trace_add('write', lambda *_args: self._recalculate())

        ob_row = tk.Frame(loan_form, bg=self.theme.palette.bg_surface)
        ob_row.pack(fill=tk.X, pady=(0, 6))
        self.other_bank_check = self._make_styled_checkbutton(
            ob_row,
            text='Another Bank Ticket',
            variable=self.is_other_bank_var,
            command=self._on_other_bank_toggle,
            bg=self.theme.palette.bg_surface,
            font=self.theme.fonts.body_bold,
        )
        self.other_bank_check.pack(side=tk.LEFT)

        self.other_bank_frame = tk.Frame(loan_form, bg=self.theme.palette.bg_surface_alt)
        self.other_bank_paid_var = tk.StringVar(value='0')

        mode_row = tk.Frame(self.other_bank_frame, bg=self.theme.palette.bg_surface_alt)
        mode_row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(mode_row, text='Service Charge Payment:', font=self.theme.fonts.body_bold, width=20, anchor='w',
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self._make_styled_radiobutton(
            mode_row,
            text='Add To Loan',
            value='financed',
            variable=self.service_charge_payment_mode_var,
            command=self._recalculate,
            bg=self.theme.palette.bg_surface_alt,
        ).pack(side=tk.LEFT, padx=(0, 8))
        self._make_styled_radiobutton(
            mode_row,
            text='From Balance',
            value='balance',
            variable=self.service_charge_payment_mode_var,
            command=self._recalculate,
            bg=self.theme.palette.bg_surface_alt,
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.other_bank_note = tk.Label(self.other_bank_frame, text='', font=self.theme.fonts.small,
                                        bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted,
                                        anchor='w', justify='left')
        self.other_bank_note.pack(fill=tk.X, pady=(0, 6))

        # Summary Card
        self.summary_card = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        self.summary_card.pack(fill=tk.X, pady=(0, 10))
        self.summary_frame = self.summary_card.inner
        self.advance_amount_var = tk.StringVar()
        self._advance_user_edited = False
        self.custom_assessed_pct_var = tk.StringVar()
        self._assessed_pct_user_edited = False
        self._render_summary()
        self._on_other_bank_toggle()

        # Action buttons
        action_card = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        action_card.pack(fill=tk.X)
        btn_frame = tk.Frame(action_card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=14)

        save_btn = self.theme.make_button(btn_frame, text='✅ Create Loan Ticket',
                                          command=self._create_ticket, kind='primary', width=20, pady=10)
        save_btn.pack(fill=tk.X, pady=(0, 8))

        cancel_btn = self.theme.make_button(btn_frame, text='Cancel',
                                            command=lambda: self.navigate('dashboard'), kind='ghost', width=20, pady=8)
        cancel_btn.pack(fill=tk.X)

        # Finished rendering, pack the view to show it instantly
        self._restore_form_state()
        self._setup_draft_autosave()
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

    def _make_form_row(self, parent, label, key, variable=None):
        row_bg = parent.cget('bg')
        row = tk.Frame(parent, bg=row_bg)
        row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(row, text=label, font=self.theme.fonts.body_bold, width=12, anchor='w',
                 bg=row_bg, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        var = variable or tk.StringVar()
        if not hasattr(self, 'loan_vars'):
            self.loan_vars = {}
        self.loan_vars[key] = var
        entry = self.theme.make_entry(row, variable=var)
        entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        entry.entry.bind('<Return>', lambda e: e.widget.tk_focusNext().focus_set() or 'break')
        return entry

    def _on_purpose_key(self, event):
        val = self.loan_vars['purpose'].get().strip()
        if event.keysym in ('Escape', 'Tab', 'Return', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R', 'Alt_L', 'Alt_R'):
            self._hide_purpose_suggestions()
            return

        if not val or len(val) < 1:
            self._hide_purpose_suggestions()
            return

        purposes = search_recent_purposes(val)
        if not purposes:
            self._hide_purpose_suggestions()
            return

        self._show_purpose_suggestions(event.widget, purposes)

    def _select_purpose(self, val):
        self.loan_vars['purpose'].set(val)
        self._hide_purpose_suggestions()
        if hasattr(self, '_purpose_entry'):
            self._purpose_entry.focus_set()

    def _hide_purpose_suggestions(self):
        popup = getattr(self, '_purpose_popup', None)
        if popup is not None:
            try:
                popup.destroy()
            except Exception:
                pass
            self._purpose_popup = None
        self._purpose_listbox = None

    def _show_purpose_suggestions(self, entry_widget, purposes):
        self._hide_purpose_suggestions()

        popup = tk.Toplevel(self.container)
        popup.overrideredirect(True)
        popup.configure(bg=self.theme.palette.border)

        listbox = tk.Listbox(
            popup,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            activestyle='none',
            selectbackground=self.theme.palette.accent,
            selectforeground='#ffffff',
            height=min(6, len(purposes)),
            relief='flat',
            bd=0,
            exportselection=False,
        )
        listbox.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        for item in purposes:
            listbox.insert(tk.END, item)
        if listbox.size() > 0:
            listbox.selection_set(0)
            listbox.activate(0)

        def _pick(_event=None):
            sel = listbox.curselection()
            if sel:
                self._select_purpose(listbox.get(sel[0]))
                return 'break'

        listbox.bind('<ButtonRelease-1>', _pick)
        listbox.bind('<Return>', lambda e: _pick(e) or 'break')
        listbox.bind('<Escape>', lambda _e: self._hide_purpose_suggestions() or 'break')
        listbox.bind('<Down>', lambda _e: self._on_suggestion_nav('_purpose_listbox', 1) or 'break')
        listbox.bind('<Up>', lambda _e: self._on_suggestion_nav('_purpose_listbox', -1) or 'break')

        x = entry_widget.winfo_rootx()
        y = entry_widget.winfo_rooty() + entry_widget.winfo_height()
        popup.geometry(f'+{x}+{y}')
        self._purpose_popup = popup
        self._purpose_listbox = listbox

    def _on_nic_enter(self):
        self._search_customer()
        if hasattr(self, 'cust_entries') and 'name' in self.cust_entries:
            self.cust_entries['name'].entry.focus_set()

    def _search_customer(self):
        nic = self.nic_var.get().strip()
        if not nic:
            messagebox.showwarning('Search', 'Enter NIC / ID to search.')
            return
        customer = get_customer_by_nic(nic)
        if customer:
            self.customer_id = customer['id']
            self.cust_vars['name'].set(customer['name'])
            self.cust_vars['phone'].set(customer['phone'])
            self.cust_vars['birthday'].set(customer.get('birthday', '') or '')
            self.cust_vars['job'].set(customer.get('job', '') or '')
            self.cust_vars['marital_status'].set(customer.get('marital_status', '') or 'Unmarried')
            self.cust_vars['language'].set(customer.get('language', '') or 'Sinhala')
            self.cust_vars['address'].set(customer.get('address', ''))
            self.cust_status.config(text=f'✅ Customer found: {customer["name"]}', fg=self.theme.palette.success)
        else:
            self.customer_id = None
            self.cust_status.config(text='ℹ️ Customer not found. Will be created on save.', fg=self.theme.palette.info)

    def _render_birthday_row(self, parent):
        row = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(row, text='Birthday:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        now = datetime.now()
        self.bday_day_var = tk.StringVar(value='')
        self.bday_month_var = tk.StringVar(value='')
        self.bday_year_var = tk.StringVar(value='')

        years = [str(y) for y in range(now.year, now.year - 101, -1)]

        day_spin = tk.Spinbox(
            row,
            from_=1,
            to=31,
            textvariable=self.bday_day_var,
            width=4,
            justify='center',
            font=self.theme.fonts.body,
        )
        day_spin.pack(side=tk.LEFT, padx=(0, 4))

        month_spin = tk.Spinbox(
            row,
            from_=1,
            to=12,
            textvariable=self.bday_month_var,
            width=4,
            justify='center',
            font=self.theme.fonts.body,
        )
        month_spin.pack(side=tk.LEFT, padx=(0, 4))

        year_combo = ttk.Combobox(
            row,
            textvariable=self.bday_year_var,
            values=years,
            state='normal',
            width=7,
            font=self.theme.fonts.body[0:2],
        )
        year_combo.pack(side=tk.LEFT)

        day_spin.bind('<Return>', lambda _e: month_spin.focus_set() or 'break')
        month_spin.bind('<Return>', lambda _e: year_combo.focus_set() or 'break')
        year_combo.bind('<Return>', lambda _e: self._focus_job_entry() or 'break')

        hint = tk.Label(
            row,
            text='DD / MM / YYYY',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
        )
        hint.pack(side=tk.LEFT, padx=(8, 0))

        self.bday_day_var.trace_add('write', self._on_birthday_parts_changed)
        self.bday_month_var.trace_add('write', self._on_birthday_parts_changed)
        self.bday_year_var.trace_add('write', self._on_birthday_parts_changed)

    def _focus_job_entry(self):
        if hasattr(self, 'cust_entries') and 'job' in self.cust_entries:
            self.cust_entries['job'].entry.focus_set()

    def _render_job_row(self, parent):
        row = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(row, text='Job:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        job_entry = self.theme.make_entry(row, variable=self.cust_vars['job'])
        job_entry.pack(side=tk.LEFT, fill=tk.X, expand=True)
        self._job_entry = job_entry.entry
        job_entry.entry.bind('<KeyRelease>', self._on_job_key)
        job_entry.entry.bind('<Down>', lambda e: self._on_suggestion_nav('_job_listbox', 1) and 'break')
        job_entry.entry.bind('<Up>', lambda e: self._on_suggestion_nav('_job_listbox', -1) and 'break')
        job_entry.entry.bind(
            '<Return>',
            lambda e: self._on_suggestion_pick('_job_listbox', self._select_job) or (e.widget.tk_focusNext().focus_set() or 'break')
        )
        self.cust_entries['job'] = job_entry

    def _render_marital_status_row(self, parent):
        row = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(row, text='Married:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self._make_styled_radiobutton(
            row,
            text='Unmarried',
            value='Unmarried',
            variable=self.cust_vars['marital_status'],
            bg=self.theme.palette.bg_surface,
        ).pack(side=tk.LEFT, padx=(0, 10))
        self._make_styled_radiobutton(
            row,
            text='Married',
            value='Married',
            variable=self.cust_vars['marital_status'],
            bg=self.theme.palette.bg_surface,
        ).pack(side=tk.LEFT)

    def _render_language_row(self, parent):
        row = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 6))
        tk.Label(row, text='Language:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        for text, value in [('Sinhala', 'Sinhala'), ('Tamil', 'Tamil'), ('English', 'English')]:
            self._make_styled_radiobutton(
                row,
                text=text,
                value=value,
                variable=self.cust_vars['language'],
                bg=self.theme.palette.bg_surface,
            ).pack(side=tk.LEFT, padx=(0, 10))

    def _make_styled_checkbutton(self, parent, text, variable, command=None, bg=None, font=None):
        base_bg = bg or self.theme.palette.bg_surface
        return tk.Checkbutton(
            parent,
            text=text,
            variable=variable,
            command=command,
            bg=base_bg,
            fg=self.theme.palette.text_primary,
            selectcolor=base_bg,
            activebackground=base_bg,
            activeforeground=self.theme.palette.text_primary,
            font=font or self.theme.fonts.body,
            cursor='hand2',
            highlightthickness=0,
            bd=0,
            padx=2,
            pady=2,
            anchor='w',
        )

    def _make_styled_radiobutton(self, parent, text, value, variable, command=None, bg=None):
        base_bg = bg or self.theme.palette.bg_surface
        return tk.Radiobutton(
            parent,
            text=text,
            value=value,
            variable=variable,
            command=command,
            bg=base_bg,
            fg=self.theme.palette.text_primary,
            selectcolor=base_bg,
            activebackground=base_bg,
            activeforeground=self.theme.palette.text_primary,
            font=self.theme.fonts.body,
            cursor='hand2',
            highlightthickness=0,
            bd=0,
            padx=2,
            pady=2,
        )

    def _on_job_key(self, event):
        val = self.cust_vars['job'].get().strip()
        if event.keysym in ('Escape', 'Tab', 'Return', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R', 'Alt_L', 'Alt_R'):
            self._hide_job_suggestions()
            return

        if not val or len(val) < 1:
            self._hide_job_suggestions()
            return

        jobs = search_recent_customer_jobs(val)
        if not jobs:
            self._hide_job_suggestions()
            return

        self._show_job_suggestions(event.widget, jobs)

    def _select_job(self, value):
        self.cust_vars['job'].set(value)
        self._hide_job_suggestions()
        if hasattr(self, '_job_entry'):
            self._job_entry.focus_set()

    def _hide_job_suggestions(self):
        popup = getattr(self, '_job_popup', None)
        if popup is not None:
            try:
                popup.destroy()
            except Exception:
                pass
            self._job_popup = None
        self._job_listbox = None

    def _show_job_suggestions(self, entry_widget, jobs):
        self._hide_job_suggestions()

        popup = tk.Toplevel(self.container)
        popup.overrideredirect(True)
        popup.configure(bg=self.theme.palette.border)

        listbox = tk.Listbox(
            popup,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            activestyle='none',
            selectbackground=self.theme.palette.accent,
            selectforeground='#ffffff',
            height=min(6, len(jobs)),
            relief='flat',
            bd=0,
            exportselection=False,
        )
        listbox.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        for item in jobs:
            listbox.insert(tk.END, item)
        if listbox.size() > 0:
            listbox.selection_set(0)
            listbox.activate(0)

        def _pick(_event=None):
            sel = listbox.curselection()
            if sel:
                self._select_job(listbox.get(sel[0]))
                return 'break'

        listbox.bind('<ButtonRelease-1>', _pick)
        listbox.bind('<Return>', lambda e: _pick(e) or 'break')
        listbox.bind('<Escape>', lambda _e: self._hide_job_suggestions() or 'break')
        listbox.bind('<Down>', lambda _e: self._on_suggestion_nav('_job_listbox', 1) or 'break')
        listbox.bind('<Up>', lambda _e: self._on_suggestion_nav('_job_listbox', -1) or 'break')

        x = entry_widget.winfo_rootx()
        y = entry_widget.winfo_rooty() + entry_widget.winfo_height()
        popup.geometry(f'+{x}+{y}')
        self._job_popup = popup
        self._job_listbox = listbox

    def _on_birthday_parts_changed(self, *_args):
        if self._birthday_syncing:
            return

        day_raw = self.bday_day_var.get().strip()
        month_raw = self.bday_month_var.get().strip()
        year_raw = self.bday_year_var.get().strip()

        if not day_raw and not month_raw and not year_raw:
            self._birthday_syncing = True
            self.cust_vars['birthday'].set('')
            self._birthday_syncing = False
            return

        if not day_raw or not month_raw or not year_raw:
            self._birthday_syncing = True
            self.cust_vars['birthday'].set('')
            self._birthday_syncing = False
            return

        try:
            day = int(day_raw)
            month = int(month_raw)
            year = int(year_raw)
            date_val = datetime(year, month, day)
            date_str = date_val.strftime('%Y-%m-%d')
        except (TypeError, ValueError):
            self._birthday_syncing = True
            self.cust_vars['birthday'].set('')
            self._birthday_syncing = False
            return

        self._birthday_syncing = True
        self.cust_vars['birthday'].set(date_str)
        self._birthday_syncing = False

    def _on_birthday_var_changed(self, *_args):
        if self._birthday_syncing:
            return

        raw = (self.cust_vars.get('birthday', tk.StringVar()).get() or '').strip()
        self._birthday_syncing = True
        if not raw:
            self.bday_day_var.set('')
            self.bday_month_var.set('')
            self.bday_year_var.set('')
        else:
            try:
                parsed = datetime.strptime(raw, '%Y-%m-%d')
                self.bday_day_var.set(f'{parsed.day:02d}')
                self.bday_month_var.set(f'{parsed.month:02d}')
                self.bday_year_var.set(str(parsed.year))
            except ValueError:
                self.bday_day_var.set('')
                self.bday_month_var.set('')
                self.bday_year_var.set('')
        self._birthday_syncing = False

    @staticmethod
    def _parse_weight(value):
        """Accept flexible user input like '15', '15g', or '15.5 g'."""
        cleaned = (value or '').strip().lower().replace(',', '')
        if not cleaned:
            return None
        match = re.match(r'^([0-9]+(?:\.[0-9]+)?)\s*g?$', cleaned)
        if not match:
            raise ValueError('invalid-weight')
        return float(match.group(1))

    def _on_desc_key(self, event):
        val = self.desc_var.get().strip()
        if event.keysym in ('Escape', 'Tab', 'Return', 'Shift_L', 'Shift_R', 'Control_L', 'Control_R', 'Alt_L', 'Alt_R'):
            self._hide_desc_suggestions()
            return

        if not val or len(val) < 1:
            self._hide_desc_suggestions()
            return

        descriptions = search_recent_descriptions(val)
        if not descriptions:
            self._hide_desc_suggestions()
            return

        self._show_desc_suggestions(event.widget, descriptions)

    def _hide_desc_suggestions(self):
        popup = getattr(self, '_desc_popup', None)
        if popup is not None:
            try:
                popup.destroy()
            except Exception:
                pass
            self._desc_popup = None
        self._desc_listbox = None

    def _show_desc_suggestions(self, entry_widget, descriptions):
        self._hide_desc_suggestions()

        popup = tk.Toplevel(self.container)
        popup.overrideredirect(True)
        popup.configure(bg=self.theme.palette.border)

        listbox = tk.Listbox(
            popup,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            activestyle='none',
            selectbackground=self.theme.palette.accent,
            selectforeground='#ffffff',
            height=min(6, len(descriptions)),
            relief='flat',
            bd=0,
            exportselection=False,
        )
        listbox.pack(fill=tk.BOTH, expand=True, padx=1, pady=1)

        for item in descriptions:
            listbox.insert(tk.END, item)
        if listbox.size() > 0:
            listbox.selection_set(0)
            listbox.activate(0)

        def _pick(_event=None):
            sel = listbox.curselection()
            if sel:
                self._select_desc(listbox.get(sel[0]))
                return 'break'

        listbox.bind('<ButtonRelease-1>', _pick)
        listbox.bind('<Return>', lambda e: _pick(e) or 'break')
        listbox.bind('<Escape>', lambda _e: self._hide_desc_suggestions() or 'break')
        listbox.bind('<Down>', lambda _e: self._on_suggestion_nav('_desc_listbox', 1) or 'break')
        listbox.bind('<Up>', lambda _e: self._on_suggestion_nav('_desc_listbox', -1) or 'break')

        x = entry_widget.winfo_rootx()
        y = entry_widget.winfo_rooty() + entry_widget.winfo_height()
        popup.geometry(f'+{x}+{y}')
        self._desc_popup = popup
        self._desc_listbox = listbox

    def _select_desc(self, value):
        self.desc_var.set(value)
        self._hide_desc_suggestions()
        self.desc_entry.entry.icursor(tk.END)
        self.desc_entry.entry.focus_set()

    def _on_suggestion_nav(self, listbox_attr, delta):
        listbox = getattr(self, listbox_attr, None)
        if not listbox or not listbox.winfo_exists():
            return False
        if listbox.size() == 0:
            return True
        sel = listbox.curselection()
        if not sel:
            idx = 0
        else:
            idx = max(0, min(listbox.size() - 1, sel[0] + delta))
        listbox.selection_clear(0, tk.END)
        listbox.selection_set(idx)
        listbox.activate(idx)
        listbox.see(idx)
        listbox.focus_set()
        return True

    def _on_suggestion_pick(self, listbox_attr, select_fn):
        listbox = getattr(self, listbox_attr, None)
        if not listbox or not listbox.winfo_exists():
            return False
        sel = listbox.curselection()
        if not sel and listbox.size() > 0:
            sel = (0,)
        if sel:
            select_fn(listbox.get(sel[0]))
            return True
        return False

    def _add_item(self):
        self._hide_desc_suggestions()
        try:
            total_wt = self._parse_weight(self.total_wt_var.get())
            if total_wt is None:
                raise ValueError('missing-total-weight')

            deduction_wt_val = self._parse_weight(self.deduction_wt_var.get())
            deduction_wt = deduction_wt_val if deduction_wt_val is not None else 0.0

            gold_wt = total_wt - deduction_wt
            if gold_wt < 0:
                raise ValueError('negative-gold-weight')

            carat = int(self.carat_var.get())
            qty = int(self.qty_var.get() or '1')
        except ValueError:
            messagebox.showwarning('Item', 'Please enter valid weights and carat.')
            return

        if qty <= 0 or total_wt <= 0 or gold_wt <= 0:
            messagebox.showwarning('Item', 'Quantity and Gold weights must be greater than zero.')
            return

        rate = get_market_rate(carat)
        est_value = calculate_market_value(gold_wt, rate)

        item = {
            'article_type': self.article_type_var.get(),
            'description': self.desc_var.get().strip(),
            'quantity': qty,
            'total_weight': total_wt,
            'gold_weight': gold_wt,
            'carat': carat,
            'estimated_value': est_value,
            'rate_per_8g': rate,
        }
        self.items.append(item)
        self._render_items()
        self._recalculate()

        self.total_wt_var.set('')
        self.deduction_wt_var.set('0')
        self.desc_var.set('')
        self.qty_var.set('1')

    def _remove_item(self, index):
        if 0 <= index < len(self.items):
            self.items.pop(index)
            self._render_items()
            self._recalculate()

    def _render_items(self):
        for w in self.items_list_frame.winfo_children():
            w.destroy()

        if not self.items:
            tk.Label(self.items_list_frame, text='No articles added yet.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(pady=10)
            return

        # Header
        hdr = tk.Frame(self.items_list_frame, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        headers = ['#', 'Type', 'Carat', 'Gold Wt', 'Value', '']
        widths_h = [3, 10, 6, 8, 12, 4]
        for h, w in zip(headers, widths_h):
            tk.Label(hdr, text=h, font=self.theme.fonts.body_bold, width=w, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=2, pady=4)

        for i, item in enumerate(self.items):
            row = tk.Frame(self.items_list_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X)
            
            vals = [str(i + 1), item['article_type'], str(item['carat']) + 'K',
                    f"{item['gold_weight']}g", format_currency(item['estimated_value'])]
            for v, w in zip(vals, widths_h[:-1]):
                tk.Label(row, text=v, font=self.theme.fonts.body, width=w, anchor='w',
                         bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=2, pady=3)
            del_btn = tk.Label(row, text='❌', font=self.theme.fonts.body, cursor='hand2',
                               bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger)
            del_btn.pack(side=tk.LEFT, padx=2)
            del_btn.bind('<Button-1>', lambda e, idx=i: self._remove_item(idx))

    def _get_selected_duration(self):
        try:
            return int(self.duration_var.get().split()[0])
        except (ValueError, IndexError):
            return 1

    def _on_other_bank_toggle(self):
        if self.is_other_bank_var.get():
            self.other_bank_frame.pack(fill=tk.X, pady=(0, 8))
            if not self.other_bank_paid_var.get().strip():
                self.other_bank_paid_var.set('0')
        else:
            self.other_bank_frame.pack_forget()
            self.other_bank_paid_var.set('0')
            self.service_charge_payment_mode_var.set('balance')
            if hasattr(self, 'service_charge_amount_var'):
                self.service_charge_amount_var.set('')
        self._recalculate()

    def _recalculate(self):
        self._save_form_state()
        self._render_summary()

    def _update_service_charge_on_advance_change(self):
        """Update service charge amount when advance amount changes (AJAX-like behavior)."""
        # Only auto-update if user hasn't manually edited the service charge amount
        if getattr(self, '_service_charge_user_edited', False):
            return
        
        # Don't update if not an other bank ticket
        if not self.is_other_bank_var.get():
            return
        
        try:
            calc = self._get_calculations()
            # Update service charge amount display with calculated value
            if hasattr(self, 'service_charge_amount_var'):
                self.service_charge_amount_var.set(f"{calc['service_charge_amount']:.2f}".rstrip('0').rstrip('.'))
        except Exception:
            # Silently ignore errors during auto-update
            pass

    def _setup_draft_autosave(self):
        """Auto-save draft on edits so tab switches keep recent input."""
        vars_to_track = []
        vars_to_track.append(self.nic_var)
        vars_to_track.extend(self.cust_vars.values())
        vars_to_track.append(self.loan_vars.get('purpose'))
        vars_to_track.append(self.duration_var)
        vars_to_track.append(self.advance_amount_var)
        vars_to_track.append(self.is_other_bank_var)
        vars_to_track.append(self.other_bank_paid_var)
        vars_to_track.append(self.service_charge_payment_mode_var)
        vars_to_track.append(self.service_charge_amount_var)

        for var in vars_to_track:
            if var is not None:
                var.trace_add('write', lambda *_args: self._save_form_state())

    def _save_form_state(self):
        """Save current form state for persistence across tab changes."""
        self._form_state = {
            'nic': self.nic_var.get() if hasattr(self, 'nic_var') else '',
            'name': self.cust_vars.get('name', tk.StringVar()).get() if hasattr(self, 'cust_vars') else '',
            'phone': self.cust_vars.get('phone', tk.StringVar()).get() if hasattr(self, 'cust_vars') else '',
            'birthday': self.cust_vars.get('birthday', tk.StringVar()).get() if hasattr(self, 'cust_vars') else '',
            'job': self.cust_vars.get('job', tk.StringVar()).get() if hasattr(self, 'cust_vars') else '',
            'marital_status': self.cust_vars.get('marital_status', tk.StringVar()).get() if hasattr(self, 'cust_vars') else 'Unmarried',
            'language': self.cust_vars.get('language', tk.StringVar()).get() if hasattr(self, 'cust_vars') else 'Sinhala',
            'address': self.cust_vars.get('address', tk.StringVar()).get() if hasattr(self, 'cust_vars') else '',
            'purpose': self.loan_vars.get('purpose', tk.StringVar()).get() if hasattr(self, 'loan_vars') else '',
            'duration': self.duration_var.get() if hasattr(self, 'duration_var') else '',
            'advance_amount': self.advance_amount_var.get() if hasattr(self, 'advance_amount_var') else '',
            'is_other_bank': self.is_other_bank_var.get() if hasattr(self, 'is_other_bank_var') else False,
            'other_bank_paid': self.other_bank_paid_var.get() if hasattr(self, 'other_bank_paid_var') else '0',
            'service_charge_mode': self.service_charge_payment_mode_var.get() if hasattr(self, 'service_charge_payment_mode_var') else 'balance',
            'service_charge_amount': self.service_charge_amount_var.get() if hasattr(self, 'service_charge_amount_var') else '',
            'items': self.items.copy() if hasattr(self, 'items') else [],
        }
        global NEW_TICKET_DRAFT
        NEW_TICKET_DRAFT = dict(self._form_state)

    def _restore_form_state(self):
        """Restore previously saved form state when returning to this page."""
        if not self._form_state:
            return
        
        if hasattr(self, 'nic_var'):
            self.nic_var.set(self._form_state.get('nic', ''))
        if hasattr(self, 'cust_vars'):
            self.cust_vars.get('name', tk.StringVar()).set(self._form_state.get('name', ''))
            self.cust_vars.get('phone', tk.StringVar()).set(self._form_state.get('phone', ''))
            self.cust_vars.get('birthday', tk.StringVar()).set(self._form_state.get('birthday', ''))
            self.cust_vars.get('job', tk.StringVar()).set(self._form_state.get('job', ''))
            self.cust_vars.get('marital_status', tk.StringVar()).set(self._form_state.get('marital_status', 'Unmarried'))
            self.cust_vars.get('language', tk.StringVar()).set(self._form_state.get('language', 'Sinhala'))
            self.cust_vars.get('address', tk.StringVar()).set(self._form_state.get('address', ''))
        if hasattr(self, 'loan_vars'):
            self.loan_vars.get('purpose', tk.StringVar()).set(self._form_state.get('purpose', ''))
        if hasattr(self, 'duration_var'):
            self.duration_var.set(self._form_state.get('duration', ''))
        if hasattr(self, 'advance_amount_var'):
            self.advance_amount_var.set(self._form_state.get('advance_amount', ''))
        if hasattr(self, 'is_other_bank_var'):
            self.is_other_bank_var.set(self._form_state.get('is_other_bank', False))
        if hasattr(self, 'other_bank_paid_var'):
            self.other_bank_paid_var.set(self._form_state.get('other_bank_paid', '0'))
        if hasattr(self, 'service_charge_payment_mode_var'):
            self.service_charge_payment_mode_var.set(self._form_state.get('service_charge_mode', 'balance'))
        if hasattr(self, 'service_charge_amount_var'):
            self.service_charge_amount_var.set(self._form_state.get('service_charge_amount', ''))
        # Keep service charge in auto mode by default; user edits in the field toggle manual mode.
        self._service_charge_user_edited = False
        
        if hasattr(self, 'items'):
            self.items = self._form_state.get('items', [])

    def _clear_form(self):
        """Clear all form fields and state."""
        # Reset customer fields
        if hasattr(self, 'nic_var'):
            self.nic_var.set('')
        if hasattr(self, 'cust_vars'):
            for key in self.cust_vars:
                self.cust_vars[key].set('')
            self.cust_vars.get('marital_status', tk.StringVar()).set('Unmarried')
            self.cust_vars.get('language', tk.StringVar()).set('Sinhala')
        
        # Reset form fields
        if hasattr(self, 'loan_vars'):
            for key in self.loan_vars:
                self.loan_vars[key].set('')
        
        if hasattr(self, 'duration_var'):
            self.duration_var.set('')
        if hasattr(self, 'advance_amount_var'):
            self.advance_amount_var.set('')
        if hasattr(self, 'custom_assessed_pct_var'):
            self.custom_assessed_pct_var.set('')
        
        # Reset other bank fields
        if hasattr(self, 'is_other_bank_var'):
            self.is_other_bank_var.set(False)
        if hasattr(self, 'other_bank_paid_var'):
            self.other_bank_paid_var.set('0')
        if hasattr(self, 'service_charge_payment_mode_var'):
            self.service_charge_payment_mode_var.set('balance')
        if hasattr(self, 'service_charge_amount_var'):
            self.service_charge_amount_var.set('')
        self._service_charge_user_edited = False
        
        # Clear items
        self.items = []
        self._form_state = {}
        global NEW_TICKET_DRAFT
        NEW_TICKET_DRAFT = {}
        
        # Refresh the page
        self._recalculate()

    def _autofill_max_advance(self, max_amount):
        """Auto-fill advance amount with max allowed when clicked."""
        self.advance_amount_var.set(f"{max_amount:,.2f}")
        setattr(self, '_advance_user_edited', True)
        self._validate_advance_amount(max_amount)
        self._recalculate()

    def _validate_advance_amount(self, max_allowed):
        """Validate advance amount and change border color if exceeds max."""
        if not hasattr(self, 'advance_entry_widget'):
            return
        
        raw_advance = self.advance_amount_var.get().strip().replace(',', '')
        try:
            advance = float(raw_advance) if raw_advance else 0
            if advance > max_allowed:
                self.advance_entry_widget.config(borderwidth=2, foreground='#e54245')  # Red border for invalid
            else:
                self.advance_entry_widget.config(borderwidth=1, foreground='#000000')   # Normal border
        except ValueError:
            self.advance_entry_widget.config(borderwidth=1, foreground='#000000')

    def _get_calculations(self):
        total_gold_wt = sum(it['gold_weight'] for it in self.items)
        total_item_wt = sum(it['total_weight'] for it in self.items)
        total_market_value = sum(it['estimated_value'] for it in self.items)

        carat_values = sorted({int(it['carat']) for it in self.items if 'carat' in it})
        if not carat_values:
            base_carat = 22
            gold_content = '-'
        elif len(carat_values) == 1:
            base_carat = carat_values[0]
            gold_content = f"{base_carat}K"
        else:
            base_carat = carat_values[0]  # Default to lowest carat rate if mixed
            gold_content = 'Mixed (' + ', '.join(f"{c}K" for c in carat_values) + ')'

        months = self._get_selected_duration()
        dur_rate = get_duration_rate(months, base_carat)
        if dur_rate:
            default_assessed_pct = dur_rate['assessed_percentage']
            interest_rate = dur_rate['interest_rate']
            overdue_rate = dur_rate['overdue_interest_rate']
        else:
            default_assessed_pct = 85.0
            interest_rate = 2.5
            overdue_rate = 5.0

        if getattr(self, '_assessed_pct_user_edited', False) and hasattr(self, 'custom_assessed_pct_var'):
            try:
                assessed_pct = float(self.custom_assessed_pct_var.get().strip().replace(',', ''))
            except ValueError:
                assessed_pct = default_assessed_pct
        else:
            assessed_pct = default_assessed_pct

        assessed_value = calculate_assessed_value(total_market_value, assessed_pct)
        advance_amount = 0
        if hasattr(self, 'advance_amount_var'):
            raw_advance = self.advance_amount_var.get().strip().replace(',', '')
            if raw_advance:
                try:
                    requested_advance = float(raw_advance)
                    if requested_advance < 0:
                        requested_advance = 0
                    advance_amount = min(requested_advance, assessed_value)
                except ValueError:
                    pass

        is_other_bank = bool(self.is_other_bank_var.get())
        try:
            service_charge_rate = float(get_setting('other_bank_service_charge_pct', '2.0') or 2.0)
        except ValueError:
            service_charge_rate = 2.0
        if service_charge_rate < 0:
            service_charge_rate = 0

        mode = self.service_charge_payment_mode_var.get() or 'balance'
        if mode not in ('financed', 'balance'):
            mode = 'balance'

        try:
            other_bank_paid_amount = float((self.other_bank_paid_var.get() or '0').strip().replace(',', ''))
        except ValueError:
            other_bank_paid_amount = 0.0
        other_bank_paid_amount = max(0.0, other_bank_paid_amount)

        service_charge_amount = 0.0
        if is_other_bank:
            if getattr(self, '_service_charge_user_edited', False):
                raw_service_charge = ''
                if hasattr(self, 'service_charge_amount_var'):
                    raw_service_charge = self.service_charge_amount_var.get().strip().replace(',', '')
                if raw_service_charge:
                    try:
                        service_charge_amount = max(0.0, float(raw_service_charge))
                    except ValueError:
                        service_charge_amount = 0.0
                else:
                    service_charge_amount = round(advance_amount * (service_charge_rate / 100.0), 2)
            else:
                service_charge_amount = round(advance_amount * (service_charge_rate / 100.0), 2)
        financed_service_charge = service_charge_amount if is_other_bank and mode == 'financed' else 0.0
        loan_amount = round(advance_amount + financed_service_charge, 2)

        balance_deduction = service_charge_amount if is_other_bank and mode == 'balance' else 0.0
        customer_balance = round(advance_amount - other_bank_paid_amount - balance_deduction, 2) if is_other_bank else round(advance_amount, 2)

        interest = calculate_interest(loan_amount, interest_rate, months)
        expire_date = get_expire_date(datetime.now().strftime('%Y-%m-%d'), months)

        # Evaluated gold_content above

        return {
            'total_gold_weight': total_gold_wt,
            'total_item_weight': total_item_wt,
            'gold_content': gold_content,
            'market_value': total_market_value,
            'assessed_percentage': assessed_pct,
            'default_assessed_pct': default_assessed_pct,
            'assessed_value': assessed_value,
            'advance_amount': round(advance_amount, 2),
            'loan_amount': loan_amount,
            'interest_principal_amount': loan_amount,
            'interest_rate': interest_rate,
            'overdue_rate': overdue_rate,
            'interest': interest,
            'duration_months': months,
            'expire_date': expire_date,
            'is_other_bank_ticket': is_other_bank,
            'other_bank_paid_amount': round(other_bank_paid_amount, 2),
            'service_charge_rate': round(service_charge_rate, 2),
            'service_charge_amount': round(service_charge_amount, 2),
            'service_charge_payment_mode': mode,
            'customer_balance_amount': customer_balance,
        }

    def _render_summary(self):
        for w in self.summary_frame.winfo_children():
            w.destroy()

        tk.Label(self.summary_frame, text='💰 Loan Summary', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        calc = self._get_calculations()
        assessed_value = calc['assessed_value']
        label_width = 24

        # Default advance amount to empty string unless populated by user
        raw_advance = self.advance_amount_var.get().strip().replace(',', '')
        if not self.items:
            self._advance_user_edited = False
            self.advance_amount_var.set('')
        elif raw_advance:
            try:
                parsed_advance = float(raw_advance)
                if parsed_advance < 0:
                    parsed_advance = 0
                if parsed_advance > assessed_value:
                    parsed_advance = assessed_value
                self.advance_amount_var.set(f"{parsed_advance:.2f}".rstrip('0').rstrip('.'))
            except ValueError:
                self.advance_amount_var.set('')

        has_duration = bool(self.duration_var.get().strip())

        if not getattr(self, '_assessed_pct_user_edited', False):
            if has_duration:
                self.custom_assessed_pct_var.set(f"{calc['assessed_percentage']:g}")
            else:
                self.custom_assessed_pct_var.set('')

        part1 = [
            ('Total Weight of Articles', f"{calc['total_item_weight']:.2f} g" if has_duration else "-"),
            ('Total Weight of Gold', f"{calc['total_gold_weight']:.2f} g" if has_duration else "-"),
            ('Gold Content (Carat)', calc['gold_content'] if has_duration else "-"),
            ('Market Value', format_currency(calc['market_value']) if has_duration else "-"),
        ]
        
        part2 = [
            ('Assessed Value', format_currency(calc['assessed_value']) if has_duration else "-"),
            ('Rate of Interest Monthly', f"{calc['interest_rate']}%" if has_duration else "-"),
            ('Duration', f"{calc['duration_months']} month(s)" if has_duration else "-"),
            ('Interest Principal', format_currency(calc['interest_principal_amount']) if has_duration else "-"),
            ('Interest Amount', format_currency(calc['interest']) if has_duration else "-"),
            ('Redeem Balance', format_currency(calc['interest_principal_amount'] + calc['interest']) if has_duration else "-"),
            ('Expire Date', calc['expire_date'] if has_duration else "-"),
        ]

        for label, value in part1:
            row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(row, text=label, font=self.theme.fonts.body, width=label_width, anchor='w', bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(row, text=value, font=self.theme.fonts.body_bold, anchor='e', bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        def _on_pct_edit():
            self._assessed_pct_user_edited = True

        pct_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
        pct_row.pack(fill=tk.X, padx=14, pady=2)
        tk.Label(pct_row, text='Assessed %', font=self.theme.fonts.body, width=label_width, anchor='w', bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
        tk.Label(pct_row, text='%', font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT, padx=(4, 0))
        pct_entry = self.theme.make_entry(pct_row, variable=self.custom_assessed_pct_var, width=8)
        pct_entry.pack(side=tk.RIGHT)
        if not has_duration:
            pct_entry.entry.config(state='disabled')
        else:
            pct_entry.entry.bind('<KeyRelease>', lambda _event: _on_pct_edit())
            pct_entry.entry.bind('<FocusOut>', lambda _event: self._recalculate())
            pct_entry.entry.bind('<Return>', lambda _event: self._recalculate())

        for label, value in part2:
            row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(row, text=label, font=self.theme.fonts.body, width=label_width, anchor='w', bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(row, text=value, font=self.theme.fonts.body_bold, anchor='e', bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        advance_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
        advance_row.pack(fill=tk.X, padx=14, pady=2)
        tk.Label(
            advance_row,
            text='Advance Amount',
            font=self.theme.fonts.body_bold,
            width=label_width,
            anchor='w',
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.accent,
        ).pack(side=tk.LEFT)

        advance_entry = self.theme.make_entry(advance_row, variable=self.advance_amount_var, width=12)
        advance_entry.pack(side=tk.RIGHT)
        self.advance_entry_widget = advance_entry.entry

        # Mark user edits so future recalculations don't overwrite if we decided to autofill
        advance_entry.entry.bind('<KeyRelease>', lambda _event: (self._validate_advance_amount(calc['assessed_value']), setattr(self, '_service_charge_user_edited', False), self._update_service_charge_on_advance_change()))
        advance_entry.entry.bind('<KeyRelease>', lambda _event: setattr(self, '_advance_user_edited', True))
        advance_entry.entry.bind('<FocusOut>', lambda _event: self._recalculate())
        advance_entry.entry.bind('<Return>', lambda _event: self._recalculate())

        max_allowed_label = tk.Label(
            self.summary_frame,
            text=f"Max allowed: {format_currency(calc['assessed_value'])}",
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.info,
            cursor='hand2'
        )
        max_allowed_label.pack(anchor='e', padx=14, pady=(0, 4))
        max_allowed_label.bind('<Button-1>', lambda e: self._autofill_max_advance(calc['assessed_value']))

        # Paid to Other Bank input (shown after max allowed text)
        if calc['is_other_bank_ticket'] and has_duration:
            paid_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            paid_row.pack(fill=tk.X, padx=14, pady=(0, 6))
            tk.Label(paid_row, text='Paid to Other Bank', font=self.theme.fonts.body, width=label_width, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            self.other_bank_paid_entry = self.theme.make_entry(paid_row, variable=self.other_bank_paid_var, width=12)
            self.other_bank_paid_entry.pack(side=tk.RIGHT)
            self.other_bank_paid_entry.entry.bind('<Return>', lambda _e: self._recalculate())

        if calc['is_other_bank_ticket'] and has_duration:
            rate_text = f"{calc['service_charge_rate']:.1f}%"
            sc_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            sc_row.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(sc_row, text=f"Service Charge Amount ({rate_text})", font=self.theme.fonts.body,
                     width=label_width, anchor='w', bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            if not getattr(self, '_service_charge_user_edited', False):
                self.service_charge_amount_var.set(f"{calc['service_charge_amount']:.2f}".rstrip('0').rstrip('.'))
            sc_entry = self.theme.make_entry(sc_row, variable=self.service_charge_amount_var, width=12)
            sc_entry.pack(side=tk.RIGHT)
            sc_entry.entry.bind('<KeyRelease>', lambda _e: setattr(self, '_service_charge_user_edited', True))
            sc_entry.entry.bind('<FocusOut>', lambda _e: self._recalculate())
            sc_entry.entry.bind('<Return>', lambda _e: self._recalculate())

            mode_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            mode_row.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(mode_row, text='Service Charge Mode', font=self.theme.fonts.body, width=label_width, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(mode_row, text={
                'financed': 'Add To Loan',
                'balance': 'Deduct From Balance',
            }.get(calc['service_charge_payment_mode'], 'Add To Loan'), font=self.theme.fonts.body_bold, anchor='e',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)
            
            # Customer Balance with enhanced styling
            cb_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            cb_row.pack(fill=tk.X, padx=14, pady=4)
            tk.Label(cb_row, text='Customer Balance', font=self.theme.fonts.body, width=label_width, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(cb_row, text=format_currency(calc['customer_balance_amount']), font=('Segoe UI', 13, 'bold'), anchor='e',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.success).pack(side=tk.RIGHT)

            mode_text = {
                'financed': 'Service charge is added to the loan; interest applies on advance + service charge.',
                'balance': 'Service charge is deducted from customer balance; it will not be added to interest principal.',
            }.get(calc['service_charge_payment_mode'], '')
            self.other_bank_note.config(text=mode_text)
        else:
            self.other_bank_note.config(text='')

        sep = tk.Frame(self.summary_frame, bg=self.theme.palette.accent, height=2)
        sep.pack(fill=tk.X, padx=14, pady=8)

        total_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
        total_row.pack(fill=tk.X, padx=14, pady=(0, 14))
        tk.Label(total_row, text='ADVANCE AMOUNT', font=('Segoe UI', 12, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent).pack(side=tk.LEFT)
        tk.Label(total_row, text=format_currency(calc['advance_amount']) if has_duration else "-", font=('Segoe UI', 16, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent).pack(side=tk.RIGHT)

        if calc['is_other_bank_ticket'] and has_duration:
            total2_row = tk.Frame(self.summary_frame, bg=self.theme.palette.bg_surface)
            total2_row.pack(fill=tk.X, padx=14, pady=(0, 12))
            tk.Label(total2_row, text='INTEREST PRINCIPAL', font=('Segoe UI', 12, 'bold'),
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.info).pack(side=tk.LEFT)
            tk.Label(total2_row, text=format_currency(calc['interest_principal_amount']), font=('Segoe UI', 15, 'bold'),
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.info).pack(side=tk.RIGHT)

    def _create_ticket(self):
        # Validate customer
        nic = self.nic_var.get().strip()
        name = self.cust_vars['name'].get().strip()
        phone = self.cust_vars['phone'].get().strip()
        birthday = self.cust_vars['birthday'].get().strip()
        job = self.cust_vars['job'].get().strip()
        marital_status = self.cust_vars['marital_status'].get().strip() or 'Unmarried'
        language = self.cust_vars['language'].get().strip() or 'Sinhala'
        address = self.cust_vars['address'].get().strip()

        if not nic or not name or not phone:
            messagebox.showwarning('Validation', 'Please fill in customer NIC, Name, and Phone.')
            return

        if not self.items:
            messagebox.showwarning('Validation', 'Please add at least one gold article.')
            return

        purpose_val = self.loan_vars.get('purpose', tk.StringVar()).get().strip() if hasattr(self, 'loan_vars') else ''
        if not purpose_val:
            messagebox.showwarning('Validation', 'Please enter a purpose for the loan.')
            return
        
        has_duration = bool(self.duration_var.get().strip())
        if not has_duration:
            messagebox.showwarning('Validation', 'Please select a duration for the loan.')
            return

        # Create or get customer
        if not self.customer_id:
            cid, msg = create_customer(
                nic=nic,
                name=name,
                phone=phone,
                address=address,
                birthday=birthday,
                job=job,
                marital_status=marital_status,
                language=language,
            )
            if not cid:
                messagebox.showerror('Customer', msg)
                return
            self.customer_id = cid

        calc = self._get_calculations()
        if calc['is_other_bank_ticket']:
            if calc['other_bank_paid_amount'] > (calc['advance_amount'] + 0.01):
                messagebox.showwarning('Validation', 'Paid amount to other bank cannot exceed advance amount.')
                return
            if calc['customer_balance_amount'] < -0.01:
                messagebox.showwarning('Validation', 'Customer balance is negative. Adjust paid amount or service charge mode.')
                return

        ticket_no = generate_ticket_no()

        loan_data = {
            'ticket_no': ticket_no,
            'customer_id': self.customer_id,
            'purpose': self.loan_vars.get('purpose', tk.StringVar()).get() if hasattr(self, 'loan_vars') else '',
            'advance_amount': calc['advance_amount'],
            'loan_amount': calc['loan_amount'],
            'interest_principal_amount': calc['interest_principal_amount'],
            'is_other_bank_ticket': calc['is_other_bank_ticket'],
            'other_bank_paid_amount': calc['other_bank_paid_amount'],
            'service_charge_rate': calc['service_charge_rate'],
            'service_charge_amount': calc['service_charge_amount'],
            'service_charge_payment_mode': calc['service_charge_payment_mode'],
            'customer_balance_amount': calc['customer_balance_amount'],
            'assessed_value': calc['assessed_value'],
            'market_value': calc['market_value'],
            'interest_rate': calc['interest_rate'],
            'overdue_interest_rate': calc['overdue_rate'],
            'duration_months': calc['duration_months'],
            'issue_date': datetime.now().strftime('%Y-%m-%d'),
            'expire_date': calc['expire_date'],
            'total_gold_weight': calc['total_gold_weight'],
            'total_item_weight': calc['total_item_weight'],
            'remarks': '',
            'created_by': self.user['id'],
        }

        try:
            loan_id = create_loan(loan_data, self.items)
        except sqlite3.Error as e:
            messagebox.showerror('Database Error', f'Could not create loan ticket.\n\n{e}')
            return

        ticket_no = loan_data['ticket_no']
        add_audit_log(self.user['id'], 'CREATE_LOAN', 'loan', loan_id, f'Ticket: {ticket_no}')

        # Check if custom assessed percentage was used - if so, request admin approval
        needs_approval = getattr(self, '_assessed_pct_user_edited', False)
        default_pct = calc.get('default_assessed_pct', calc['assessed_percentage'])
        requested_pct = calc['assessed_percentage']
        
        if needs_approval and abs(requested_pct - default_pct) > 0.001:
            create_approval_request(
                loan_id=loan_id,
                ticket_no=ticket_no,
                default_val=default_pct,
                requested_val=requested_pct,
                requested_by=self.user['id'],
                requested_by_name=self.user['full_name'],
            )
            add_audit_log(self.user['id'], 'APPROVAL_REQUESTED', 'loan', loan_id,
                         f'Ticket: {ticket_no}, Pct: {default_pct}% → {requested_pct}%')
            messagebox.showinfo(
                '⚠️ Approval Required',
                f'Loan ticket {ticket_no} has been created.\n\n'
                f'The assessed percentage was changed from the default {default_pct:.1f}% '
                f'to {requested_pct:.1f}%.\n\n'
                'This ticket has been sent to the Admin for approval.\n'
                'The loan is currently ACTIVE and will remain so pending review.'
            )
            
        # Clear draft after successful creation
        NEW_TICKET_DRAFT.clear()
        
        if messagebox.askyesno('Success', f'Loan ticket {ticket_no} created successfully!\n\n'
                                           f'Would you like to print the ticket?'):
            self.navigate('print_ticket', loan_id)
        else:
            self.navigate('loan_detail', loan_id)
