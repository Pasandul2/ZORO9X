"""Loan List and Loan Detail Pages for Gold Loan System."""

import tkinter as tk
from tkinter import ttk, messagebox
from database import (search_loans, get_loan, get_loan_items, get_loan_renewals,
                      get_loan_payments, update_loan_status, get_approval_request_by_loan, get_duration_rate,
                      get_setting, list_customer_letters)
from utils import (format_currency, format_date, get_status_text, get_status_color,
                   calculate_total_payable, is_overdue)


class LoanListPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        tk.Label(hdr, text='🔍 Loan Management', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        self.stats_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.stats_wrap.pack(fill=tk.X, pady=(0, 10))

        # Search & Filter bar
        filter_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        filter_card.pack(fill=tk.X, pady=(0, 10))
        fbar = tk.Frame(filter_card.inner, bg=self.theme.palette.bg_surface)
        fbar.pack(fill=tk.X, padx=14, pady=10)

        tk.Label(fbar, text='Search:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        search_entry = self.theme.make_entry(fbar, variable=self.search_var, width=25)
        search_entry.pack(side=tk.LEFT, padx=(8, 16))
        self.search_var.trace_add('write', self._on_search_change)
        if hasattr(search_entry, 'entry'):
            search_entry.entry.bind('<Return>', lambda _e: self._do_search())

        tk.Label(fbar, text='Status:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.status_var = tk.StringVar(value='all')
        status_combo = ttk.Combobox(fbar, textvariable=self.status_var,
                                    values=['all', 'active', 'renewed', 'redeemed', 'forfeited'],
                                    state='readonly', font=self.theme.fonts.body[0:2], width=12)
        status_combo.pack(side=tk.LEFT, padx=(8, 16))
        status_combo.bind('<<ComboboxSelected>>', lambda _e: self._do_search())

        search_btn = self.theme.make_button(fbar, text='🔍 Search', command=self._do_search,
                                            kind='primary', width=10, pady=6)
        search_btn.pack(side=tk.LEFT, padx=(0, 8))

        new_btn = self.theme.make_button(fbar, text='📝 New Loan', command=lambda: self.navigate('new_ticket'),
                                         kind='primary', width=12, pady=6)
        new_btn.pack(side=tk.RIGHT)

        # Results table
        self.table_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        self.table_card.pack(fill=tk.BOTH, expand=True)
        self.table_frame = self.table_card.inner
        self._search_after_id = None
        self._do_search()

    def _render_stats(self, loans):
        for w in self.stats_wrap.winfo_children():
            w.destroy()

        shown_count = len(loans)
        active_count = sum(1 for loan in loans if loan.get('status') == 'active')
        overdue_count = sum(1 for loan in loans if loan.get('status') == 'active' and is_overdue(loan.get('expire_date', '')))
        total_amount = sum(float(loan.get('loan_amount') or 0) for loan in loans)

        stats = [
            ('Loans Shown', str(shown_count), self.theme.palette.accent),
            ('Active Loans', str(active_count), self.theme.palette.success),
            ('Overdue Active', str(overdue_count), self.theme.palette.danger),
            ('Shown Amount', format_currency(total_amount), self.theme.palette.info),
        ]

        for title, value, color in stats:
            card = self.theme.make_card(self.stats_wrap, bg=self.theme.palette.bg_surface)
            card.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 8))
            tk.Label(card.inner, text=title, font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=12, pady=(8, 2))
            tk.Label(card.inner, text=value, font=self.theme.fonts.h2,
                     bg=self.theme.palette.bg_surface, fg=color).pack(anchor='w', padx=12, pady=(0, 8))

    def _on_search_change(self, *_args):
        if self._search_after_id is not None:
            self.container.after_cancel(self._search_after_id)
        self._search_after_id = self.container.after(220, self._do_search)

    def _do_search(self):
        self._search_after_id = None
        for w in self.table_frame.winfo_children():
            w.destroy()

        loans = search_loans(self.search_var.get().strip(), self.status_var.get())
        self._render_stats(loans)

        tk.Label(self.table_frame, text=f'Results: {len(loans)} loan(s)', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 6))

        # Table
        cols = ['Ticket #', 'Customer', 'NIC', 'Amount', 'Status', 'Issue', 'Expire', 'Actions']
        col_widths = [90, 140, 100, 100, 80, 80, 80, 220]

        tbl = tk.Frame(self.table_frame, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for idx, (col, width_px) in enumerate(zip(cols, col_widths)):
            hdr.grid_columnconfigure(idx, minsize=width_px, weight=0)
            tk.Label(hdr, text=col, font=self.theme.fonts.body_bold, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).grid(
                        row=0, column=idx, sticky='w', padx=6, pady=6
                     )

        for loan in loans:
            row_bg = self.theme.palette.bg_surface
            row = tk.Frame(tbl, bg=row_bg)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            for idx, width_px in enumerate(col_widths):
                row.grid_columnconfigure(idx, minsize=width_px, weight=0)

            effective_status = 'active' if loan.get('status') == 'renewed' else loan.get('status')
            status_text = get_status_text(effective_status, loan['expire_date'])
            status_color = get_status_color(effective_status, loan['expire_date'])

            vals = [
                (loan['ticket_no'], self.theme.palette.accent),
                (loan['customer_name'], self.theme.palette.text_primary),
                (loan['customer_nic'], self.theme.palette.text_muted),
                (format_currency(loan['loan_amount']), self.theme.palette.text_primary),
                (status_text, status_color),
                (format_date(loan['issue_date']), self.theme.palette.text_muted),
                (format_date(loan['expire_date']), self.theme.palette.text_muted),
            ]

            for col_idx, (val, fg) in enumerate(vals):
                lbl = tk.Label(row, text=val, font=self.theme.fonts.body, anchor='w',
                               bg=row_bg, fg=fg, cursor='hand2')
                lbl.grid(row=0, column=col_idx, sticky='w', padx=6, pady=5)
                lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

            # Action buttons
            act_frame = tk.Frame(row, bg=row_bg, width=col_widths[7] - 12, height=28)
            act_frame.grid(row=0, column=7, sticky='ew', padx=6)
            act_frame.grid_propagate(False)
            act_frame.grid_columnconfigure(0, weight=1, uniform='loan-actions')
            act_frame.grid_columnconfigure(1, weight=1, uniform='loan-actions')
            act_frame.grid_columnconfigure(2, weight=1, uniform='loan-actions')

            def _make_action_badge(parent, text, bg_color):
                return tk.Label(
                    parent,
                    text=text,
                    font=self.theme.fonts.small,
                    bg=bg_color,
                    fg=self.theme.palette.text_inverse,
                    cursor='hand2',
                    padx=4,
                    pady=2,
                    anchor='center',
                )

            view_lbl = _make_action_badge(act_frame, '👁 View', self.theme.palette.accent)
            view_lbl.grid(row=0, column=0, sticky='ew', padx=(0, 4))
            view_lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

            if effective_status == 'active':
                ren_lbl = _make_action_badge(act_frame, '🔄 Renew', self.theme.palette.info)
                ren_lbl.grid(row=0, column=1, sticky='ew', padx=(0, 4))
                ren_lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('renew_loan', lid))

                red_lbl = _make_action_badge(act_frame, '✅ Redeem', self.theme.palette.success)
                red_lbl.grid(row=0, column=2, sticky='ew')
                red_lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('redeem_loan', lid))

        if not loans:
            tk.Label(tbl, text='No loans found.', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(pady=30)


class LoanDetailPage:
    def __init__(self, container, theme, user, navigate_fn, loan_id):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.loan_id = loan_id

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        loan = get_loan(self.loan_id)
        if not loan:
            messagebox.showerror('Error', 'Loan not found.')
            self.navigate('loan_list')
            return

        items = get_loan_items(self.loan_id)
        approval = get_approval_request_by_loan(self.loan_id)

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header with back
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        back_btn = self.theme.make_button(hdr, text='← Back', command=lambda: self.navigate('loan_list'),
                                          kind='ghost', width=8, pady=6)
        back_btn.pack(side=tk.LEFT, padx=(0, 10))
        tk.Label(hdr, text=f'Loan: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        effective_status = 'active' if loan.get('status') == 'renewed' else loan.get('status')
        status_text = get_status_text(effective_status, loan['expire_date'])
        status_color = get_status_color(effective_status, loan['expire_date'])
        tk.Label(hdr, text=status_text, font=('Segoe UI', 12, 'bold'),
                 bg=self.theme.palette.bg_app, fg=status_color).pack(side=tk.RIGHT, padx=10)

        # Layout: left = details, right = financials
        main = tk.Frame(view, bg=self.theme.palette.bg_app)
        main.pack(fill=tk.BOTH, expand=True)
        main.grid_columnconfigure(0, weight=1)
        main.grid_columnconfigure(1, weight=1)

        # Left - Customer & Items
        left = tk.Frame(main, bg=self.theme.palette.bg_app)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        # Customer card
        cc = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        cc.pack(fill=tk.X, pady=(0, 10))
        tk.Label(cc.inner, text='👤 Customer', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        default_dur_rate = get_duration_rate(loan['duration_months'], loan.get('carat') or 22)
        default_assessed_pct = float(default_dur_rate.get('assessed_percentage', 0)) if default_dur_rate else 0.0
        current_assessed_pct = (loan['assessed_value'] / loan['market_value'] * 100) if loan['market_value'] else 0.0

        try:
            default_service_charge_pct = float(get_setting('other_bank_service_charge_pct', '2.0') or 2.0)
        except ValueError:
            default_service_charge_pct = 2.0
        current_service_charge_pct = float(loan.get('service_charge_rate') or 0.0)
        advance_for_charge = float(loan.get('advance_amount') or loan.get('loan_amount') or 0.0)
        default_service_charge_amount = round(advance_for_charge * (default_service_charge_pct / 100.0), 2)
        current_service_charge_amount = float(loan.get('service_charge_amount') or 0.0)

        details_rows = [('Name', loan['customer_name']), ('NIC', loan['customer_nic']),
                        ('Phone', loan['customer_phone']), ('Birthday', loan.get('customer_birthday', '')),
                        ('Job', loan.get('customer_job', '')), ('Married Status', loan.get('customer_marital_status', '')),
                        ('Language', loan.get('customer_language', '')), ('Address', loan.get('customer_address', '')),
                        ('Purpose', loan.get('purpose', '')),
                        ('Another Bank Ticket', 'Yes' if loan.get('is_other_bank_ticket') else 'No')]

        details_grid = tk.Frame(cc.inner, bg=self.theme.palette.bg_surface)
        details_grid.pack(fill=tk.X, padx=14, pady=(0, 2))
        details_grid.grid_columnconfigure(0, minsize=120, weight=0)
        details_grid.grid_columnconfigure(1, weight=1)

        for row_idx, (lbl, val) in enumerate(details_rows):
            tk.Label(details_grid, text=f'{lbl}:', font=self.theme.fonts.body_bold, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).grid(
                row=row_idx, column=0, sticky='w', pady=1
            )
            tk.Label(details_grid, text=val or '-', font=self.theme.fonts.body, anchor='w', justify='left',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary, wraplength=240).grid(
                row=row_idx, column=1, sticky='w', padx=(8, 0), pady=1
            )
        tk.Frame(cc.inner, height=6, bg=self.theme.palette.bg_surface).pack()

        # Show loan-specific default changes right after customer details.
        changed_defaults = []
        if default_assessed_pct > 0 and abs(current_assessed_pct - default_assessed_pct) > 0.001:
            changed_defaults.append(
                ('Assessed % Change', f"Default {default_assessed_pct:.1f}% -> Used {current_assessed_pct:.1f}%")
            )
        if loan.get('is_other_bank_ticket') and abs(current_service_charge_pct - default_service_charge_pct) > 0.001:
            changed_defaults.append(
                ('Service Charge % Change', f"Default {default_service_charge_pct:.1f}% -> Used {current_service_charge_pct:.1f}%")
            )
        if loan.get('is_other_bank_ticket') and abs(current_service_charge_amount - default_service_charge_amount) > 0.009:
            changed_defaults.append(
                ('Service Charge Amount Change', f"Default {format_currency(default_service_charge_amount)} -> Used {format_currency(current_service_charge_amount)}")
            )

        if changed_defaults:
            changes_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
            changes_card.pack(fill=tk.X, pady=(0, 10))
            tk.Label(changes_card.inner, text='📝 Loan Detail Changes', font=self.theme.fonts.h3,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))
            for lbl, val in changed_defaults:
                row = tk.Frame(changes_card.inner, bg=self.theme.palette.bg_surface)
                row.pack(fill=tk.X, padx=14, pady=1)
                tk.Label(row, text=f'{lbl}:', font=self.theme.fonts.body_bold, width=22, anchor='w',
                         bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
                tk.Label(row, text=val, font=self.theme.fonts.body, anchor='w', justify='left',
                         bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary, wraplength=240).pack(side=tk.LEFT, fill=tk.X, expand=True)
            tk.Frame(changes_card.inner, height=6, bg=self.theme.palette.bg_surface).pack()

        # Items card
        ic = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        ic.pack(fill=tk.X, pady=(0, 10))
        tk.Label(ic.inner, text=f'💍 Articles ({len(items)} item(s))', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        for item in items:
            itf = tk.Frame(ic.inner, bg=self.theme.palette.bg_surface_alt)
            itf.pack(fill=tk.X, padx=14, pady=4)
            
            desc_text = f" — {item.get('description')}" if item.get('description') else ""
            deduct_wt = item['total_weight'] - item['gold_weight']
            
            # Top row: Article name with description
            tk.Label(itf, text=f"{item['article_type']} ({item['carat']}K){desc_text}",
                     font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_primary, anchor='w').pack(fill=tk.X, padx=8, pady=(6,2))
            
            # Middle row: Weights
            tk.Label(itf, text=f"Total: {item['total_weight']}g  |  Deduct: {deduct_wt:.2f}g  |  Gold: {item['gold_weight']}g",
                     font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_muted, anchor='w').pack(fill=tk.X, padx=8, pady=(0,6))
                     
        tk.Frame(ic.inner, height=4, bg=self.theme.palette.bg_surface).pack()

        # Action buttons (shown below articles)
        act_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        act_card.pack(fill=tk.X, pady=(0, 10))
        abf = tk.Frame(act_card.inner, bg=self.theme.palette.bg_surface)
        abf.pack(fill=tk.X, padx=14, pady=10)

        # Arrange buttons in a 2x3 grid for better visibility
        abf.grid_columnconfigure(0, weight=1)
        abf.grid_columnconfigure(1, weight=1)

        renew_btn = self.theme.make_button(abf, text='🔄 Renew Loan', kind='primary', width=13, pady=8,
                                           command=lambda: self.navigate('renew_loan', self.loan_id))
        renew_btn.grid(row=0, column=0, padx=(0, 4), pady=(0, 4), sticky='ew')

        redeem_btn = self.theme.make_button(abf, text='✅ Redeem Loan', kind='primary', width=13, pady=8,
                                            command=lambda: self.navigate('redeem_loan', self.loan_id))
        redeem_btn.grid(row=0, column=1, padx=(4, 0), pady=(0, 4), sticky='ew')

        history_btn = self.theme.make_button(abf, text='📜 Loan History', kind='ghost', width=13, pady=8,
                                             command=lambda: self.navigate('loan_history', self.loan_id))
        history_btn.grid(row=1, column=0, padx=(0, 4), pady=(4, 0), sticky='ew')

        print_btn = self.theme.make_button(abf, text='🖨 Print', kind='ghost', width=13, pady=8,
                                           command=lambda: self.navigate('print_ticket', self.loan_id))
        print_btn.grid(row=1, column=1, padx=(4, 0), pady=(4, 0), sticky='ew')

        letter_btn = self.theme.make_button(abf, text='✉️ Send Letter', kind='secondary', width=13, pady=8,
                                            command=lambda: self._send_letter_for_loan(loan))
        letter_btn.grid(row=2, column=0, padx=(0, 4), pady=(4, 0), sticky='ew')

        if effective_status in ('redeemed', 'forfeited'):
            renew_btn.config(state=tk.DISABLED)
            redeem_btn.config(state=tk.DISABLED)

        # Allow closing overdue active loans as forfeited directly from details.
        if self.user.get('role') == 'admin' and effective_status == 'active' and is_overdue(loan['expire_date']):
            def _mark_forfeited():
                if not messagebox.askyesno(
                    'Confirm Forfeit',
                    f"Mark loan {loan['ticket_no']} as forfeited?\n\nThis action can be reversed only by changing the status manually."
                ):
                    return
                update_loan_status(self.loan_id, 'forfeited')
                messagebox.showinfo('Loan Updated', f"Loan {loan['ticket_no']} marked as forfeited.")
                self.navigate('loan_detail', self.loan_id)

            forfeit_btn = self.theme.make_button(
                abf,
                text='⚠ Mark As Forfeited',
                kind='danger',
                width=28,
                pady=8,
                command=_mark_forfeited,
            )
            forfeit_btn.grid(row=3, column=0, columnspan=2, padx=0, pady=(8, 0), sticky='ew')

        # Letter History section (below action buttons on left side)
        letter_hist_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        letter_hist_card.pack(fill=tk.BOTH, expand=False, pady=(0, 10))
        tk.Label(letter_hist_card.inner, text='📮 Letter History for This Customer', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        # Get letters for this customer
        all_letters = list_customer_letters()
        customer_letters = [ltr for ltr in all_letters if ltr.get('customer_id') == loan.get('customer_id')]

        if customer_letters:
            letter_list_frame = tk.Frame(letter_hist_card.inner, bg=self.theme.palette.bg_surface)
            letter_list_frame.pack(fill=tk.BOTH, expand=False, padx=14, pady=(0, 10))

            for letter in customer_letters[:5]:  # Show last 5 letters
                letter_id = letter.get('id')
                letter_subject = letter.get('subject', '(No Subject)')
                letter_status = (letter.get('status') or 'draft').upper()
                letter_date = letter.get('updated_at', '-')
                if letter_date and letter_date != '-':
                    try:
                        letter_date = letter_date.split()[0]  # Extract just the date part
                    except:
                        pass
                
                # Create a clickable letter row
                letter_row = tk.Frame(letter_list_frame, bg=self.theme.palette.bg_surface_alt, padx=8, pady=6)
                letter_row.pack(fill=tk.X, pady=4)
                
                # Bind click event to navigate to letters
                def make_navigate_fn(lid):
                    return lambda event: self.navigate('letters', {
                        'letter_id': lid,
                        'customer_id': loan.get('customer_id'),
                        'customer_name': loan.get('customer_name'),
                        'ticket_no': loan.get('ticket_no'),
                    })
                
                letter_row.bind('<Button-1>', make_navigate_fn(letter_id))
                
                subject_label = tk.Label(letter_row, text=f"[{letter_date}] {letter_subject}",
                         font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface_alt,
                         fg=self.theme.palette.text_primary, anchor='w', wraplength=280, justify='left', cursor='hand2')
                subject_label.pack(fill=tk.X)
                subject_label.bind('<Button-1>', make_navigate_fn(letter_id))
                
                meta_label = tk.Label(letter_row, text=f"Status: {letter_status} | Type: {letter.get('type') or 'Letter'} | Language: {letter.get('language', 'English')}",
                         font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                         fg=self.theme.palette.text_muted, anchor='w', cursor='hand2')
                meta_label.pack(fill=tk.X)
                meta_label.bind('<Button-1>', make_navigate_fn(letter_id))
        else:
            tk.Label(letter_hist_card.inner, text='No letters found for this customer.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 10))

        # Right - Financial details
        right = tk.Frame(main, bg=self.theme.palette.bg_app)
        right.grid(row=0, column=1, sticky='nsew')

        fc = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        fc.pack(fill=tk.X, pady=(0, 10))
        tk.Label(fc.inner, text='💰 Financial Details', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        accrual_start = loan.get('renew_date') or loan['issue_date']
        principal_base = float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0)
        
        # Get max_interest_months from duration rate settings
        dur_rate = get_duration_rate(loan['duration_months'], loan.get('carat', 22))
        max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
        
        payable = calculate_total_payable(principal_base, loan['interest_rate'],
                          loan['duration_months'], loan['overdue_interest_rate'],
                          loan['expire_date'], accrual_start, max_interest_months)

        assessed_pct = (loan['assessed_value'] / loan['market_value'] * 100) if loan['market_value'] else 0
        
        fin_data = [
            ('Market Value', format_currency(loan['market_value'])),
            ('Assessed Value', format_currency(loan['assessed_value'])),
            ('Assessed %', f"{assessed_pct:.1f}%"),
            ('Advance Amount', format_currency(loan.get('advance_amount') or loan['loan_amount'])),
            ('Interest Principal', format_currency(principal_base)),
            ('Interest Rate', f"{float(loan['interest_rate']):.2f}% / month"),
            ('Duration', f"{loan['duration_months']} month(s)"),
            ('Issue Date', format_date(loan['issue_date'])),
            ('Renew Date', format_date(loan.get('renew_date') or '')),
            ('Expire Date', format_date(loan['expire_date'])),
            ('Total Weight', f"{loan['total_item_weight']} g"),
            ('Deduction Wt', f"{loan['total_item_weight'] - loan['total_gold_weight']:.2f} g"),
            ('Gold Weight', f"{loan['total_gold_weight']} g"),
            ('Accrued Interest', format_currency(payable['interest'])),
            ('Overdue Days', str(payable['overdue_days'])),
            ('Overdue Base (2.5%)', format_currency(payable.get('overdue_base_interest', 0))),
            ('Overdue Penalty (5%)', format_currency(payable.get('overdue_penalty_interest', 0))),
            ('Overdue Interest', format_currency(payable['overdue_interest'])),
            ('Total Outstanding', format_currency(payable['total'])),
        ]

        if loan.get('is_other_bank_ticket'):
            fin_data[4:4] = [
                ('Other Bank Paid', format_currency(loan.get('other_bank_paid_amount', 0))),
                ('Service Charge Rate', f"{loan.get('service_charge_rate', 0)}%"),
                ('Service Charge Amount', format_currency(loan.get('service_charge_amount', 0))),
                ('Service Charge Mode', {
                    'financed': 'Add To Loan',
                    'balance': 'Deduct From Balance',
                }.get(loan.get('service_charge_payment_mode'), 'Add To Loan')),
                ('Customer Balance', format_currency(loan.get('customer_balance_amount', 0))),
            ]

        if approval:
            status_map = {
                'pending': ('⏳ Pending Approval', self.theme.palette.accent),
                'approved': ('✅ Approved by Admin', '#10b981'),
                'declined': ('❌ Declined by Admin', '#ef4444')
            }
            app_text, app_color = status_map.get(approval['status'], ('Unknown', self.theme.palette.text_muted))
            fin_data.insert(3, ('Approval Status', app_text))
            
        for lbl, val in fin_data:
            r = tk.Frame(fc.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=lbl, font=self.theme.fonts.body, width=22, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            
            fg_color = self.theme.palette.text_primary
            if lbl == 'Approval Status' and approval:
                status_colors = {'pending': self.theme.palette.accent, 'approved': '#10b981', 'declined': '#ef4444'}
                fg_color = status_colors.get(approval['status'], fg_color)
            elif lbl == 'Assessed %' and approval and approval['status'] != 'pending': # highlight if custom
                 # check if it matches default? 
                 pass

            tk.Label(r, text=val, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=fg_color).pack(side=tk.RIGHT)

        sep = tk.Frame(fc.inner, bg=self.theme.palette.accent, height=2)
        sep.pack(fill=tk.X, padx=14, pady=6)
        tr = tk.Frame(fc.inner, bg=self.theme.palette.bg_surface)
        tr.pack(fill=tk.X, padx=14, pady=(0, 12))
        tk.Label(tr, text='TOTAL PAYABLE', font=('Segoe UI', 12, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent).pack(side=tk.LEFT)
        tk.Label(tr, text=format_currency(payable['total']), font=('Segoe UI', 16, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent).pack(side=tk.RIGHT)

    def _send_letter_for_loan(self, loan):
        """Navigate to Letters section with this customer pre-selected for letter sending."""
        # Navigate to letters page with customer info to pre-select in Send Letters tab
        self.navigate('letters', {
            'customer_id': loan.get('customer_id'),
            'customer_name': loan.get('customer_name'),
            'ticket_no': loan.get('ticket_no'),
            'loan_id': self.loan_id
        })


class LoanHistoryPage:
    def __init__(self, container, theme, user, navigate_fn, loan_id):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.loan_id = loan_id

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        loan = get_loan(self.loan_id)
        if not loan:
            messagebox.showerror('Error', 'Loan not found.')
            self.navigate('loan_list')
            return

        renewals = get_loan_renewals(self.loan_id)
        payments = get_loan_payments(self.loan_id)

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        self.theme.make_button(hdr, text='← Back', command=lambda: self.navigate('loan_detail', self.loan_id),
                               kind='ghost', width=8, pady=6).pack(side=tk.LEFT, padx=(0, 10))
        tk.Label(hdr, text=f'Loan History: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Loan summary panel
        summary_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        summary_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(summary_card.inner, text='Loan Summary', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        effective_status = 'active' if loan.get('status') == 'renewed' else loan.get('status')
        status_text = get_status_text(effective_status, loan['expire_date'])
        summary_rows = [
            ('Customer', loan['customer_name']),
            ('Ticket No', loan['ticket_no']),
            ('Loan Status', status_text),
            ('Loan Amount', format_currency(loan['loan_amount'])),
            ('Interest Rate', f"{float(loan['interest_rate']):.2f}% / month"),
            ('Issued Date', format_date(loan['issue_date'])),
            ('Expire Date', format_date(loan['expire_date'])),
            ('Created On', format_date(loan.get('created_at', ''))),
            ('Last Updated', format_date(loan.get('updated_at', ''))),
        ]
        for lbl, val in summary_rows:
            row = tk.Frame(summary_card.inner, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(row, text=lbl, font=self.theme.fonts.body, width=14, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(row, text=val or '-', font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        tk.Frame(summary_card.inner, height=8, bg=self.theme.palette.bg_surface).pack()

        # Full renewal details
        renewal_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        renewal_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(renewal_card.inner, text=f'Renewal History ({len(renewals)})', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        if renewals:
            for ren in renewals:
                block = tk.Frame(renewal_card.inner, bg=self.theme.palette.bg_surface_alt)
                block.pack(fill=tk.X, padx=14, pady=4)
                details = [
                    ('Date', format_date(ren.get('renewed_at'))),
                    ('Processed By', ren.get('renewed_by_name') or '-'),
                    ('Old Expire Date', format_date(ren.get('old_expire_date'))),
                    ('New Expire Date', format_date(ren.get('new_expire_date'))),
                    ('New Duration', f"{ren.get('new_duration_months', 0)} month(s)"),
                    ('New Interest Rate', f"{float(ren.get('new_interest_rate', 0) or 0):.2f}% / month"),
                    ('Payment Amount', format_currency(ren.get('payment_amount', ren.get('interest_paid', 0)))),
                    ('Normal Interest Due', format_currency(ren.get('normal_interest_due', 0))),
                    ('Overdue Interest Due', format_currency(ren.get('overdue_interest_due', 0))),
                    ('Interest Paid', format_currency(ren.get('interest_paid', 0))),
                    ('Principal Reduction', format_currency(ren.get('principal_reduction', 0))),
                    ('New Loan Amount', format_currency(ren.get('new_loan_amount', 0) or 0)),
                    ('New Assessed Value', format_currency(ren.get('new_assessed_value', 0) or 0)),
                    ('Remarks', ren.get('remarks') or '-'),
                ]
                for lbl, val in details:
                    row = tk.Frame(block, bg=self.theme.palette.bg_surface_alt)
                    row.pack(fill=tk.X, padx=8, pady=1)
                    tk.Label(row, text=lbl, width=16, anchor='w', font=self.theme.fonts.small,
                             bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
                    tk.Label(row, text=val, anchor='w', font=self.theme.fonts.small,
                             bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        else:
            tk.Label(renewal_card.inner, text='No renewal records found.', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 10))

        # Full payment details
        payment_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        payment_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(payment_card.inner, text=f'Payment History ({len(payments)})', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        if payments:
            for pay in payments:
                block = tk.Frame(payment_card.inner, bg=self.theme.palette.bg_surface_alt)
                block.pack(fill=tk.X, padx=14, pady=4)
                details = [
                    ('Date', format_date(pay.get('payment_date'))),
                    ('Payment Type', (pay.get('payment_type') or '-').upper()),
                    ('Amount', format_currency(pay.get('amount', 0))),
                    ('Received By', pay.get('received_by_name') or '-'),
                    ('Paid By Customer', pay.get('paid_by_customer') or '-'),
                    ('Remarks', pay.get('remarks') or '-'),
                ]
                for lbl, val in details:
                    row = tk.Frame(block, bg=self.theme.palette.bg_surface_alt)
                    row.pack(fill=tk.X, padx=8, pady=1)
                    tk.Label(row, text=lbl, width=16, anchor='w', font=self.theme.fonts.small,
                             bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
                    tk.Label(row, text=val, anchor='w', font=self.theme.fonts.small,
                             bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        else:
            tk.Label(payment_card.inner, text='No payment records found.', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 10))
