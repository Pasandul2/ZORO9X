"""Loan List and Loan Detail Pages for Gold Loan System."""

import tkinter as tk
from tkinter import ttk, messagebox
from database import (search_loans, get_loan, get_loan_items, get_loan_renewals,
                      get_loan_payments, update_loan_status, get_approval_request_by_loan, get_duration_rate)
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

        tk.Label(fbar, text='Status:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.status_var = tk.StringVar(value='all')
        status_combo = ttk.Combobox(fbar, textvariable=self.status_var,
                                    values=['all', 'active', 'renewed', 'redeemed', 'forfeited'],
                                    state='readonly', font=self.theme.fonts.body[0:2], width=12)
        status_combo.pack(side=tk.LEFT, padx=(8, 16))

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
        self._do_search()

    def _do_search(self):
        for w in self.table_frame.winfo_children():
            w.destroy()

        loans = search_loans(self.search_var.get().strip(), self.status_var.get())

        tk.Label(self.table_frame, text=f'Results: {len(loans)} loan(s)', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 6))

        # Table
        cols = ['Ticket #', 'Customer', 'NIC', 'Amount', 'Status', 'Issue', 'Expire', 'Actions']
        widths = [10, 16, 14, 12, 10, 10, 10, 14]

        tbl = tk.Frame(self.table_frame, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for col, w in zip(cols, widths):
            tk.Label(hdr, text=col, font=self.theme.fonts.body_bold, width=w, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=3, pady=6)

        for loan in loans:
            row_bg = self.theme.palette.bg_surface
            row = tk.Frame(tbl, bg=row_bg)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            status_text = get_status_text(loan['status'], loan['expire_date'])
            status_color = get_status_color(loan['status'], loan['expire_date'])

            vals = [
                (loan['ticket_no'], self.theme.palette.accent),
                (loan['customer_name'], self.theme.palette.text_primary),
                (loan['customer_nic'], self.theme.palette.text_muted),
                (format_currency(loan['loan_amount']), self.theme.palette.text_primary),
                (status_text, status_color),
                (format_date(loan['issue_date']), self.theme.palette.text_muted),
                (format_date(loan['expire_date']), self.theme.palette.text_muted),
            ]

            for (val, fg), w in zip(vals, widths[:-1]):
                lbl = tk.Label(row, text=val, font=self.theme.fonts.body, width=w, anchor='w',
                               bg=row_bg, fg=fg, cursor='hand2')
                lbl.pack(side=tk.LEFT, padx=3, pady=5)
                lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

            # Action buttons
            act_frame = tk.Frame(row, bg=row_bg)
            act_frame.pack(side=tk.LEFT, padx=3)
            view_lbl = tk.Label(act_frame, text='👁 View', font=self.theme.fonts.small,
                                bg=row_bg, fg=self.theme.palette.accent, cursor='hand2')
            view_lbl.pack(side=tk.LEFT, padx=(0, 6))
            view_lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

            if loan['status'] == 'active':
                ren_lbl = tk.Label(act_frame, text='🔄', font=self.theme.fonts.small,
                                   bg=row_bg, fg=self.theme.palette.info, cursor='hand2')
                ren_lbl.pack(side=tk.LEFT, padx=(0, 4))
                ren_lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('renew_loan', lid))

                red_lbl = tk.Label(act_frame, text='✅', font=self.theme.fonts.small,
                                   bg=row_bg, fg=self.theme.palette.success, cursor='hand2')
                red_lbl.pack(side=tk.LEFT)
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

        status_text = get_status_text(loan['status'], loan['expire_date'])
        status_color = get_status_color(loan['status'], loan['expire_date'])
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
        for lbl, val in [('Name', loan['customer_name']), ('NIC', loan['customer_nic']),
                         ('Phone', loan['customer_phone']), ('Address', loan.get('customer_address', ''))]:
            r = tk.Frame(cc.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=f'{lbl}:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=val or '-', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        tk.Frame(cc.inner, height=6, bg=self.theme.palette.bg_surface).pack()

        # Items card
        ic = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        ic.pack(fill=tk.X, pady=(0, 10))
        tk.Label(ic.inner, text=f'💍 Articles ({len(items)} item(s))', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        for item in items:
            itf = tk.Frame(ic.inner, bg=self.theme.palette.bg_surface_alt)
            itf.pack(fill=tk.X, padx=14, pady=4)
            
            market_val = loan.get('market_value', 1) or 1
            item_loan_amt = (item.get('estimated_value', 0) / market_val) * loan.get('loan_amount', 0)
            
            desc_text = f" — {item.get('description')}" if item.get('description') else ""
            deduct_wt = item['total_weight'] - item['gold_weight']
            
            # Top row: Article name with description
            tk.Label(itf, text=f"{item['article_type']} ({item['carat']}K){desc_text}",
                     font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_primary, anchor='w').pack(fill=tk.X, padx=8, pady=(6,2))
            
            # Middle row: Weights
            tk.Label(itf, text=f"Total: {item['total_weight']}g  |  Deduct: {deduct_wt:.2f}g  |  Gold: {item['gold_weight']}g",
                     font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_muted, anchor='w').pack(fill=tk.X, padx=8, pady=(0,2))
            
            # Bottom row: Loan amount
            tk.Label(itf, text=f"Loan Amount: {format_currency(item_loan_amt)}",
                     font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.accent, anchor='w').pack(fill=tk.X, padx=8, pady=(0,6))
                     
        tk.Frame(ic.inner, height=4, bg=self.theme.palette.bg_surface).pack()

        # Action buttons (shown below articles)
        act_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        act_card.pack(fill=tk.X, pady=(0, 10))
        abf = tk.Frame(act_card.inner, bg=self.theme.palette.bg_surface)
        abf.pack(fill=tk.X, padx=14, pady=10)

        renew_btn = self.theme.make_button(abf, text='🔄 Renew Loan', kind='primary', width=13, pady=8,
                                           command=lambda: self.navigate('renew_loan', self.loan_id))
        renew_btn.pack(side=tk.LEFT, padx=(0, 8))

        redeem_btn = self.theme.make_button(abf, text='✅ Redeem Loan', kind='primary', width=13, pady=8,
                                            command=lambda: self.navigate('redeem_loan', self.loan_id))
        redeem_btn.pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(abf, text='📜 Loan History', kind='ghost', width=13, pady=8,
                               command=lambda: self.navigate('loan_history', self.loan_id)).pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(abf, text='🖨 Print', kind='ghost', width=10, pady=8,
                               command=lambda: self.navigate('print_ticket', self.loan_id)).pack(side=tk.LEFT)

        if loan['status'] != 'active':
            renew_btn.config(state=tk.DISABLED)
            redeem_btn.config(state=tk.DISABLED)

        # Right - Financial details
        right = tk.Frame(main, bg=self.theme.palette.bg_app)
        right.grid(row=0, column=1, sticky='nsew')

        fc = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        fc.pack(fill=tk.X, pady=(0, 10))
        tk.Label(fc.inner, text='💰 Financial Details', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 6))

        accrual_start = loan.get('renew_date') or loan['issue_date']
        
        # Get max_interest_months from duration rate settings
        dur_rate = get_duration_rate(loan['duration_months'], loan.get('carat', 22))
        max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
        
        payable = calculate_total_payable(loan['loan_amount'], loan['interest_rate'],
                          loan['duration_months'], loan['overdue_interest_rate'],
                          loan['expire_date'], accrual_start, max_interest_months)

        assessed_pct = (loan['assessed_value'] / loan['market_value'] * 100) if loan['market_value'] else 0
        
        fin_data = [
            ('Market Value', format_currency(loan['market_value'])),
            ('Assessed Value', format_currency(loan['assessed_value'])),
            ('Assessed %', f"{assessed_pct:.1f}%"),
            ('Loan Amount', format_currency(loan['loan_amount'])),
            ('Interest Rate', f"{loan['interest_rate']}% / month"),
            ('Duration', f"{loan['duration_months']} month(s)"),
            ('Issue Date', format_date(loan['issue_date'])),
            ('Renew Date', format_date(loan.get('renew_date') or '')),
            ('Expire Date', format_date(loan['expire_date'])),
            ('Total Weight', f"{loan['total_item_weight']} g"),
            ('Deduction Wt', f"{loan['total_item_weight'] - loan['total_gold_weight']:.2f} g"),
            ('Gold Weight', f"{loan['total_gold_weight']} g"),
            ('Accrued Interest', format_currency(payable['interest'])),
            ('Overdue Interest', format_currency(payable['overdue_interest'])),
            ('Total Outstanding', format_currency(payable['total'])),
        ]

        if approval:
            status_map = {
                'pending': ('⏳ Pending Approval', self.theme.palette.accent),
                'approved': ('✅ Approved by Admin', '#10b981'),
                'declined': ('❌ Declined by Admin', '#ef4444')
            }
            app_text, app_color = status_map.get(approval['status'], ('Unknown', self.theme.palette.text_muted))
            fin_data.insert(3, ('Approval Status', app_text))
            
        fin_data.extend([
            ('─' * 30, ''),
            ('Interest', format_currency(payable['interest'])),
            ('Overdue Days', str(payable['overdue_days'])),
            ('Overdue Interest', format_currency(payable['overdue_interest'])),
        ])
        for lbl, val in fin_data:
            r = tk.Frame(fc.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=lbl, font=self.theme.fonts.body, width=18, anchor='w',
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

        status_text = get_status_text(loan['status'], loan['expire_date'])
        summary_rows = [
            ('Customer', loan['customer_name']),
            ('Ticket No', loan['ticket_no']),
            ('Loan Status', status_text),
            ('Loan Amount', format_currency(loan['loan_amount'])),
            ('Interest Rate', f"{loan['interest_rate']}% / month"),
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
                    ('New Interest Rate', f"{ren.get('new_interest_rate', 0)}% / month"),
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
