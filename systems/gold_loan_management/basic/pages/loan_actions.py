"""Renew and Redeem Loan Pages for Gold Loan System."""

import tkinter as tk
from datetime import datetime
from tkinter import messagebox
from database import (get_loan, renew_loan, redeem_loan,
                      get_duration_rate, add_audit_log, create_approval_request)
from utils import (format_currency, format_date, calculate_total_payable,
                   calculate_interest, get_expire_date, is_overdue)


class RenewLoanPage:
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
        self.loan = loan

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        back_btn = self.theme.make_button(hdr, text='← Back', command=lambda: self.navigate('loan_detail', self.loan_id),
                                          kind='ghost', width=8, pady=6)
        back_btn.pack(side=tk.LEFT, padx=(0, 10))
        tk.Label(hdr, text=f'🔄 Renew Loan: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        main = tk.Frame(view, bg=self.theme.palette.bg_app)
        main.pack(fill=tk.BOTH, expand=True)
        main.grid_columnconfigure(0, weight=1)
        main.grid_columnconfigure(1, weight=1)

        # Left - Current loan info
        left = tk.Frame(main, bg=self.theme.palette.bg_app)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        info_card = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        info_card.pack(fill=tk.X, pady=(0, 10))
        accrual_start = loan.get('renew_date') or loan['issue_date']
        principal_base = float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0)
        self.principal_base = principal_base
        
        # Get max_interest_months from duration rate settings
        dur_rate = get_duration_rate(loan['duration_months'], loan.get('carat', 22))
        max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
        
        payable = calculate_total_payable(principal_base, loan['interest_rate'],
                                          loan['duration_months'], loan['overdue_interest_rate'],
                          loan['expire_date'], accrual_start, max_interest_months)
        self.payable = payable

        details = [
            ('Customer', loan['customer_name']),
            ('Advance Amount', format_currency(loan.get('advance_amount') or loan['loan_amount'])),
            ('Interest Principal', format_currency(principal_base)),
            ('Current Rate', f"{loan['interest_rate']}% / month"),
            ('Duration', f"{loan['duration_months']} month(s)"),
            ('Issue Date', format_date(loan['issue_date'])),
            ('Renew Date', format_date(loan.get('renew_date') or '')),
            ('Expire Date', format_date(loan['expire_date'])),
            ('Overdue', f"{'Yes (' + str(payable['overdue_days']) + ' days)' if payable['overdue_days'] > 0 else 'No'}"),
            ('Accrued Interest', format_currency(payable['interest'])),
        ]
        if loan.get('is_other_bank_ticket'):
            details.extend([
                ('Other Bank Paid', format_currency(loan.get('other_bank_paid_amount', 0))),
                ('Service Charge', format_currency(loan.get('service_charge_amount', 0))),
                ('Customer Balance', format_currency(loan.get('customer_balance_amount', 0))),
            ])
        for lbl, val in details:
            r = tk.Frame(info_card.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=lbl, font=self.theme.fonts.body, width=16, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=val, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        self.overdue_interest_display_var = tk.StringVar(value=format_currency(payable['overdue_interest']))
        if payable['overdue_days'] > 0:
            overdue_row = tk.Frame(info_card.inner, bg=self.theme.palette.bg_surface)
            overdue_row.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(overdue_row, text='Overdue Interest', font=self.theme.fonts.body, width=16, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(overdue_row, textvariable=self.overdue_interest_display_var, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        self.total_outstanding_display_var = tk.StringVar(value=format_currency(payable['interest'] + payable['overdue_interest']))
        total_row = tk.Frame(info_card.inner, bg=self.theme.palette.bg_surface)
        total_row.pack(fill=tk.X, padx=14, pady=1)
        tk.Label(total_row, text='Total Outstanding', font=self.theme.fonts.body, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
        tk.Label(total_row, textvariable=self.total_outstanding_display_var, font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)
        tk.Frame(info_card.inner, height=10, bg=self.theme.palette.bg_surface).pack()

        # Right - Renewal form
        right = tk.Frame(main, bg=self.theme.palette.bg_app)
        right.grid(row=0, column=1, sticky='nsew')

        form_card = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        form_card.pack(fill=tk.X, pady=(0, 10))
        tk.Label(form_card.inner, text='Renewal Options', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        form = tk.Frame(form_card.inner, bg=self.theme.palette.bg_surface)
        form.pack(fill=tk.X, padx=14, pady=(0, 14))

        # Duration is fixed to current loan duration for renewal
        r1 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r1.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r1, text='Duration:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        tk.Label(r1, text=f"{loan['duration_months']} month(s)", font=self.theme.fonts.body_bold,
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Interest to pay
        r2 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r2.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r2, text='Normal Interest:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        tk.Label(r2, text=format_currency(payable['interest']), font=self.theme.fonts.body_bold,
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        self.overdue_pay_var = tk.StringVar(value=str(payable['overdue_interest']))
        if payable['overdue_days'] > 0:
            r2b = tk.Frame(form, bg=self.theme.palette.bg_surface)
            r2b.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r2b, text='Overdue Interest:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            self.theme.make_entry(r2b, variable=self.overdue_pay_var, width=14).pack(side=tk.LEFT)
        self.overdue_pay_var.trace_add('write', lambda *a: self._recalc_renewal())

        r2c = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r2c.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r2c, text='Payment Amount:', font=self.theme.fonts.body_bold, width=16, anchor='w',
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.payment_amount_var = tk.StringVar(value=str(payable['interest'] + payable['overdue_interest']))
        self.theme.make_entry(r2c, variable=self.payment_amount_var, width=14).pack(side=tk.LEFT)
        self.payment_amount_var.trace_add('write', lambda *a: self._recalc_renewal())

        # Remarks
        r3 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r3.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r3, text='Remarks:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.remarks_var = tk.StringVar()
        self.theme.make_entry(r3, variable=self.remarks_var).pack(side=tk.LEFT, fill=tk.X, expand=True)

        # New loan summary
        self.renewal_summary = tk.Frame(form_card.inner, bg=self.theme.palette.bg_surface)
        self.renewal_summary.pack(fill=tk.X, padx=14, pady=(0, 14))
        self._recalc_renewal()

        # Confirm button
        btn_frame = tk.Frame(form_card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_frame, text='✅ Confirm Renewal', command=self._do_renew,
                               kind='primary', width=20, pady=10).pack(fill=tk.X)

    def _get_new_duration_months(self):
        return int(self.loan.get('duration_months') or 1)

    def _recalc_renewal(self):
        for w in self.renewal_summary.winfo_children():
            w.destroy()

        months = self._get_new_duration_months()
        dur_rate = get_duration_rate(months)
        new_rate = dur_rate['interest_rate'] if dur_rate else 2.5
        renew_date = datetime.now().strftime('%Y-%m-%d')
        new_expire = get_expire_date(renew_date, months)
        breakdown = self._calculate_payment_breakdown()
        projected_interest = calculate_interest(breakdown['new_loan_amount'], new_rate, months)

        tk.Label(self.renewal_summary, text='── After Renewal ──', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent).pack(anchor='w', pady=(8, 4))

        for lbl, val in [('New Interest Rate', f'{new_rate}%/month'),
                         ('New Expire Date', format_date(new_expire)),
                         ('Duration', f'{months} month(s)'),
                         ('Interest Due Now', format_currency(breakdown['total_interest_due'])),
                         ('Minimum Payment', format_currency(breakdown['total_interest_due'])),
                         ('Interest Paid Now', format_currency(breakdown['interest_applied'])),
                         ('Principal Reduction', format_currency(breakdown['principal_reduction'])),
                         ('New Loan Amount', format_currency(breakdown['new_loan_amount'])),
                         ('Projected New Interest', format_currency(projected_interest))]:
            r = tk.Frame(self.renewal_summary, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, pady=1)
            tk.Label(r, text=lbl, font=self.theme.fonts.body, width=24, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=val, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        self.overdue_interest_display_var.set(format_currency(breakdown['overdue_due']))
        self.total_outstanding_display_var.set(format_currency(breakdown['total_interest_due']))

    def _calculate_payment_breakdown(self):
        normal_due = float(self.payable['interest'])
        max_overdue_due = float(self.payable['overdue_interest'])
        overdue_input_raw = self.overdue_pay_var.get() or 0.0
        try:
            overdue_input_val = float(overdue_input_raw)
            overdue_due = max(0.0, overdue_input_val)
        except ValueError:
            overdue_input_val = 0.0
            overdue_due = 0.0
        overdue_due = min(overdue_due, max_overdue_due)
        if abs(overdue_due - overdue_input_val) > 0.009:
            self.overdue_pay_var.set(str(round(overdue_due, 2)))
        try:
            payment_amount = max(0.0, float(self.payment_amount_var.get() or 0.0))
        except ValueError:
            payment_amount = 0.0

        total_interest_due = round(normal_due + overdue_due, 2)
        interest_applied = round(min(payment_amount, total_interest_due), 2)
        principal_reduction = round(max(0.0, payment_amount - interest_applied), 2)
        new_loan_amount = round(max(0.0, float(getattr(self, 'principal_base', self.loan['loan_amount'])) - principal_reduction), 2)

        return {
            'normal_due': normal_due,
            'overdue_due': overdue_due,
            'payment_amount': payment_amount,
            'total_interest_due': total_interest_due,
            'interest_applied': interest_applied,
            'principal_reduction': principal_reduction,
            'new_loan_amount': new_loan_amount,
        }

    def _do_renew(self):
        months = self._get_new_duration_months()
        dur_rate = get_duration_rate(months)
        new_rate = dur_rate['interest_rate'] if dur_rate else 2.5

        breakdown = self._calculate_payment_breakdown()
        if breakdown['payment_amount'] <= 0:
            messagebox.showwarning('Renewal', 'Payment amount must be greater than 0.')
            return
        if breakdown['payment_amount'] + 0.01 < breakdown['total_interest_due']:
            messagebox.showwarning(
                'Renewal',
                f"Minimum payment is total outstanding interest: {format_currency(breakdown['total_interest_due'])}."
            )
            return

        try:
            overdue_paid = float(self.overdue_pay_var.get())
        except ValueError:
            messagebox.showwarning('Renewal', 'Enter valid interest amounts.')
            return

        if overdue_paid > (self.payable['overdue_interest'] + 0.01):
            messagebox.showwarning('Renewal', 'Overdue interest cannot be increased. You can only reduce it.')
            return

        if breakdown['new_loan_amount'] <= 0:
            messagebox.showwarning('Renewal', 'Loan principal is fully settled. Use redemption instead of renewal.')
            return

        default_overdue = self.payable['overdue_interest']
        needs_approval = overdue_paid < (default_overdue - 0.01)

        if not messagebox.askyesno('Confirm Renewal',
                                   f'Renew loan {self.loan["ticket_no"]} for {months} month(s)?\n'
                                   f'Payment amount: {format_currency(breakdown["payment_amount"])}\n'
                                   f'Interest applied: {format_currency(breakdown["interest_applied"])}\n'
                                   f'Principal reduction: {format_currency(breakdown["principal_reduction"])}\n'
                                   f'New loan amount: {format_currency(breakdown["new_loan_amount"])}'):
            return

        if needs_approval:
            create_approval_request(
                loan_id=self.loan_id,
                ticket_no=self.loan['ticket_no'],
                default_val=default_overdue,
                requested_val=overdue_paid,
                requested_by=self.user['id'],
                requested_by_name=self.user['full_name'],
                request_type='overdue_waiver'
            )
            messagebox.showinfo('Approval Required', 'Overdue interest discount needs Admin approval.\nTicket sent for review.')

        ok, msg = renew_loan(
            self.loan_id,
            months,
            breakdown['interest_applied'],
            new_rate,
            self.loan['assessed_value'],
            self.user['id'],
            self.remarks_var.get(),
            payment_amount=breakdown['payment_amount'],
            normal_interest_due=breakdown['normal_due'],
            overdue_interest_due=breakdown['overdue_due'],
            principal_reduction=breakdown['principal_reduction'],
            new_loan_amount=breakdown['new_loan_amount'],
        )
        add_audit_log(self.user['id'], 'RENEW_LOAN', 'loan', self.loan_id, msg)
        if ok:
            if messagebox.askyesno('Success', f'{msg}\n\nWould you like to print a Cash Credit Slip for customer?'):
                self.navigate('print_ticket', {'loan_id': self.loan_id, 'doc_type': 'cash_credit'})
            else:
                self.navigate('loan_detail', self.loan_id)
        else:
            messagebox.showerror('Error', msg)


class RedeemLoanPage:
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
        self.loan = loan

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        back_btn = self.theme.make_button(hdr, text='← Back', command=lambda: self.navigate('loan_detail', self.loan_id),
                                          kind='ghost', width=8, pady=6)
        back_btn.pack(side=tk.LEFT, padx=(0, 10))
        tk.Label(hdr, text=f'✅ Redeem Loan: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Payment breakdown
        accrual_start = loan.get('renew_date') or loan['issue_date']
        principal_base = float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0)
        self.principal_base = principal_base
        
        # Get max_interest_months from duration rate settings
        dur_rate = get_duration_rate(loan['duration_months'], loan.get('carat', 22))
        max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
        
        payable = calculate_total_payable(principal_base, loan['interest_rate'],
                                          loan['duration_months'], loan['overdue_interest_rate'],
                          loan['expire_date'], accrual_start, max_interest_months)
        self.payable = payable

        main = tk.Frame(view, bg=self.theme.palette.bg_app)
        main.pack(fill=tk.BOTH, expand=True)
        main.grid_columnconfigure(0, weight=1)
        main.grid_columnconfigure(1, weight=1)

        # Left - breakdown
        left = tk.Frame(main, bg=self.theme.palette.bg_app)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        bc = self.theme.make_card(left, bg=self.theme.palette.bg_surface)
        bc.pack(fill=tk.X)
        tk.Label(bc.inner, text='💰 Payment Breakdown', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        breakdown = [
            ('Customer', loan['customer_name']),
            ('Advance Amount', format_currency(loan.get('advance_amount') or loan['loan_amount'])),
            ('Interest Principal', format_currency(payable['loan_amount'])),
            ('Interest', format_currency(payable['interest'])),
        ]
        if payable['overdue_days'] > 0:
            breakdown.extend([
                ('Overdue Days', str(payable['overdue_days'])),
                ('Overdue Interest', format_currency(payable['overdue_interest'])),
            ])
        if loan.get('is_other_bank_ticket'):
            breakdown.extend([
                ('Other Bank Paid', format_currency(loan.get('other_bank_paid_amount', 0))),
                ('Service Charge', format_currency(loan.get('service_charge_amount', 0))),
                ('Customer Balance', format_currency(loan.get('customer_balance_amount', 0))),
            ])
        for lbl, val in breakdown:
            r = tk.Frame(bc.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(r, text=lbl, font=self.theme.fonts.body, width=16, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=val, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.RIGHT)

        sep = tk.Frame(bc.inner, bg=self.theme.palette.danger, height=2)
        sep.pack(fill=tk.X, padx=14, pady=8)
        tr = tk.Frame(bc.inner, bg=self.theme.palette.bg_surface)
        tr.pack(fill=tk.X, padx=14, pady=(0, 14))
        tk.Label(tr, text='TOTAL PAYABLE', font=('Segoe UI', 14, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger).pack(side=tk.LEFT)
        tk.Label(tr, text=format_currency(payable['total']), font=('Segoe UI', 20, 'bold'),
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger).pack(side=tk.RIGHT)

        # Right - confirm
        right = tk.Frame(main, bg=self.theme.palette.bg_app)
        right.grid(row=0, column=1, sticky='nsew')

        cc = self.theme.make_card(right, bg=self.theme.palette.bg_surface)
        cc.pack(fill=tk.X)
        tk.Label(cc.inner, text='Confirm Redemption', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        form = tk.Frame(cc.inner, bg=self.theme.palette.bg_surface)
        form.pack(fill=tk.X, padx=14, pady=(0, 14))

        r1 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r1.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r1, text='Principal Amount:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.principal_val = tk.Label(r1, text=format_currency(payable['loan_amount']), font=self.theme.fonts.body,
                                      bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary)
        self.principal_val.pack(side=tk.LEFT)

        r2 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r2.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r2, text='Normal Interest:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.interest_val = tk.Label(r2, text=format_currency(payable['interest']), font=self.theme.fonts.body,
                                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary)
        self.interest_val.pack(side=tk.LEFT)

        self.overdue_pay_var = tk.StringVar(value=str(payable['overdue_interest']))
        if payable['overdue_days'] > 0:
            r2b = tk.Frame(form, bg=self.theme.palette.bg_surface)
            r2b.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r2b, text='Overdue Interest:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            self.theme.make_entry(r2b, variable=self.overdue_pay_var, width=14).pack(side=tk.LEFT)
        self.overdue_pay_var.trace_add('write', lambda *a: self._recalc_total())

        r3 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r3.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r3, text='Remarks:', font=self.theme.fonts.body_bold, width=16, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.remarks_var = tk.StringVar()
        self.theme.make_entry(r3, variable=self.remarks_var).pack(side=tk.LEFT, fill=tk.X, expand=True)

        btn_frame = tk.Frame(cc.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_frame, text='✅ Confirm Redemption & Return Gold',
                               command=self._do_redeem, kind='primary', width=30, pady=10).pack(fill=tk.X)

    def _recalc_total(self):
        try:
            overdue = float(self.overdue_pay_var.get() or 0)
            total = self.payable['loan_amount'] + self.payable['interest'] + overdue
            # update any summary label if exists? We can just leave it for confirm.
            pass
        except ValueError:
            pass

    def _do_redeem(self):
        try:
            overdue_paid = float(self.overdue_pay_var.get())
            total_paid = self.payable['loan_amount'] + self.payable['interest'] + overdue_paid
        except ValueError:
            messagebox.showwarning('Redeem', 'Enter valid overdue amount.')
            return

        default_overdue = self.payable['overdue_interest']
        needs_approval = overdue_paid < (default_overdue - 0.01)

        if not messagebox.askyesno('Confirm', f'Redeem loan {self.loan["ticket_no"]}?\n'
                                   f'Principal: {format_currency(self.payable["loan_amount"])}\n'
                                   f'Interest: {format_currency(self.payable["interest"])}\n'
                                   f'Overdue: {format_currency(overdue_paid)}\n'
                                   f'Total Received: {format_currency(total_paid)}'):
            return

        if needs_approval:
            create_approval_request(
                loan_id=self.loan_id,
                ticket_no=self.loan['ticket_no'],
                default_val=default_overdue,
                requested_val=overdue_paid,
                requested_by=self.user['id'],
                requested_by_name=self.user['full_name'],
                request_type='overdue_waiver'
            )
            messagebox.showinfo('Approval Required', 'Overdue interest discount needs Admin approval.\nTicket sent for review.')

        ok, msg = redeem_loan(self.loan_id, total_paid, self.user['id'], self.remarks_var.get())
        add_audit_log(self.user['id'], 'REDEEM_LOAN', 'loan', self.loan_id, msg)
        if ok:
            messagebox.showinfo('Success', f'{msg}\nGold articles returned to customer.')
            self.navigate('loan_detail', self.loan_id)
        else:
            messagebox.showerror('Error', msg)
