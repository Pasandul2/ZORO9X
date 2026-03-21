"""Reports Page for Gold Loan System."""

import tkinter as tk
from tkinter import ttk, messagebox
from database import search_loans, get_dashboard_stats, get_connection
from utils import format_currency, format_date, get_status_text, get_status_color


class ReportsPage:
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

        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        tk.Label(hdr, text='📊 Reports', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Report type tabs
        tab_frame = tk.Frame(view, bg=self.theme.palette.bg_app)
        tab_frame.pack(fill=tk.X, pady=(0, 10))

        reports = [
            ('📋 Overdue Loans', self._show_overdue),
            ('💰 Active Portfolio', self._show_active),
            ('✅ Redeemed', self._show_redeemed),
            ('📊 Summary', self._show_summary),
        ]
        for text, cmd in reports:
            btn = self.theme.make_button(tab_frame, text=text, command=cmd, kind='ghost', width=16, pady=8)
            btn.pack(side=tk.LEFT, padx=(0, 6))

        self.report_content = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.report_content.pack(fill=tk.BOTH, expand=True)
        self._show_summary()

    def _clear(self):
        for w in self.report_content.winfo_children():
            w.destroy()

    def _show_overdue(self):
        self._clear()
        from datetime import datetime
        today = datetime.now().strftime('%Y-%m-%d')

        conn = get_connection()
        rows = conn.execute('''SELECT l.*, c.name as customer_name, c.nic as customer_nic, c.phone as customer_phone
            FROM loans l JOIN customers c ON l.customer_id=c.id
            WHERE l.status='active' AND l.expire_date < ? ORDER BY l.expire_date''', (today,)).fetchall()
        conn.close()
        loans = [dict(r) for r in rows]

        card = self.theme.make_card(self.report_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text=f'⚠️ Overdue Loans ({len(loans)})', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger).pack(anchor='w', padx=14, pady=(10, 8))

        total_amount = sum(l['loan_amount'] for l in loans)
        tk.Label(card.inner, text=f'Total Overdue Amount: {format_currency(total_amount)}',
                 font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.danger).pack(anchor='w', padx=14, pady=(0, 8))

        self._render_loan_table(card.inner, loans)

    def _show_active(self):
        self._clear()
        loans = search_loans(status='active')

        card = self.theme.make_card(self.report_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        total = sum(l['loan_amount'] for l in loans)
        tk.Label(card.inner, text=f'📋 Active Portfolio ({len(loans)} loans — {format_currency(total)})',
                 font=self.theme.fonts.h3, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        self._render_loan_table(card.inner, loans)

    def _show_redeemed(self):
        self._clear()
        loans = search_loans(status='redeemed')

        card = self.theme.make_card(self.report_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        total = sum(l['loan_amount'] for l in loans)
        tk.Label(card.inner, text=f'✅ Redeemed Loans ({len(loans)} — {format_currency(total)})',
                 font=self.theme.fonts.h3, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.success).pack(anchor='w', padx=14, pady=(10, 8))

        self._render_loan_table(card.inner, loans)

    def _show_summary(self):
        self._clear()
        stats = get_dashboard_stats()

        card = self.theme.make_card(self.report_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.X)

        tk.Label(card.inner, text='📊 System Summary', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        summary_data = [
            ('Total Loans', str(stats['total_loans']), self.theme.palette.text_primary),
            ('Active Loans', str(stats['total_active']), self.theme.palette.accent),
            ('Redeemed Loans', str(stats['total_redeemed']), self.theme.palette.success),
            ('Overdue Loans', str(stats['overdue_count']), self.theme.palette.danger),
            ('Total Customers', str(stats['total_customers']), self.theme.palette.info),
            ('Active Loan Amount', format_currency(stats['active_loan_amount']), self.theme.palette.warning),
            ("Today's Revenue", format_currency(stats['today_revenue']), self.theme.palette.success),
            ("Today's Loans", str(stats['today_loans']), self.theme.palette.accent),
        ]

        for label, value, color in summary_data:
            r = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=3)
            tk.Label(r, text=label, font=self.theme.fonts.body, width=20, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=value, font=('Segoe UI', 14, 'bold'),
                     bg=self.theme.palette.bg_surface, fg=color).pack(side=tk.RIGHT)
        tk.Frame(card.inner, height=14, bg=self.theme.palette.bg_surface).pack()

    def _render_loan_table(self, parent, loans):
        tbl = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        cols = ['Ticket', 'Customer', 'Amount', 'Status', 'Issue', 'Expire']
        widths = [10, 18, 12, 10, 10, 10]

        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for col, w in zip(cols, widths):
            tk.Label(hdr, text=col, font=self.theme.fonts.body_bold, width=w, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=3, pady=5)

        for loan in loans[:50]:
            row = tk.Frame(tbl, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            st = get_status_text(loan['status'], loan['expire_date'])
            sc = get_status_color(loan['status'], loan['expire_date'])

            vals = [
                (loan['ticket_no'], self.theme.palette.accent),
                (loan.get('customer_name', ''), self.theme.palette.text_primary),
                (format_currency(loan['loan_amount']), self.theme.palette.text_primary),
                (st, sc),
                (format_date(loan['issue_date']), self.theme.palette.text_muted),
                (format_date(loan['expire_date']), self.theme.palette.text_muted),
            ]
            for (val, fg), w in zip(vals, widths):
                lbl = tk.Label(row, text=val, font=self.theme.fonts.body, width=w, anchor='w',
                               bg=self.theme.palette.bg_surface, fg=fg, cursor='hand2')
                lbl.pack(side=tk.LEFT, padx=3, pady=4)
                lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

        if not loans:
            tk.Label(tbl, text='No loans found.', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(pady=20)
