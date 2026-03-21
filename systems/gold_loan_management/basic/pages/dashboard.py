"""Dashboard Page for Gold Loan System."""

import tkinter as tk
from datetime import datetime
from utils import format_currency
from database import get_dashboard_stats, search_loans


class DashboardPage:
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
        hdr.pack(fill=tk.X, pady=(0, 16))
        tk.Label(hdr, text='Dashboard', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        tk.Label(hdr, text=f'Welcome, {self.user["full_name"]} ({self.user["role"].upper()})',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_app,
                 fg=self.theme.palette.text_muted).pack(side=tk.RIGHT)

        stats = get_dashboard_stats()

        # Stat cards row
        cards_frame = tk.Frame(view, bg=self.theme.palette.bg_app)
        cards_frame.pack(fill=tk.X, pady=(0, 12))
        for col in range(4):
            cards_frame.grid_columnconfigure(col, weight=1, uniform='stat')

        card_data = [
            ('Active Loans', str(stats['total_active']), self.theme.palette.accent, '📋'),
            ('Today Revenue', format_currency(stats['today_revenue']), self.theme.palette.success, '💰'),
            ('Overdue Loans', str(stats['overdue_count']), self.theme.palette.danger, '⚠️'),
            ('Total Customers', str(stats['total_customers']), self.theme.palette.info, '👥'),
        ]

        for i, (title, value, color, icon) in enumerate(card_data):
            card = self.theme.make_card(cards_frame, bg=self.theme.palette.bg_surface)
            card.grid(row=0, column=i, sticky='nsew', padx=(0, 10) if i < 3 else 0)

            stripe = tk.Frame(card.inner, bg=color, height=4)
            stripe.pack(fill=tk.X)
            body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
            body.pack(fill=tk.BOTH, expand=True, padx=16, pady=12)

            top_row = tk.Frame(body, bg=self.theme.palette.bg_surface)
            top_row.pack(fill=tk.X)
            tk.Label(top_row, text=icon, font=('Segoe UI', 18),
                     bg=self.theme.palette.bg_surface).pack(side=tk.LEFT)
            tk.Label(top_row, text=title, font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(8, 0))

            tk.Label(body, text=value, font=('Segoe UI', 22, 'bold'),
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(8, 0))

        # Second row stats
        cards_frame2 = tk.Frame(view, bg=self.theme.palette.bg_app)
        cards_frame2.pack(fill=tk.X, pady=(0, 16))
        for col in range(4):
            cards_frame2.grid_columnconfigure(col, weight=1, uniform='stat2')

        card_data2 = [
            ("Today's Loans", str(stats['today_loans']), self.theme.palette.accent),
            ('Active Amount', format_currency(stats['active_loan_amount']), self.theme.palette.warning),
            ('Redeemed', str(stats['total_redeemed']), self.theme.palette.success),
            ('Total Loans', str(stats['total_loans']), self.theme.palette.info),
        ]

        for i, (title, value, color) in enumerate(card_data2):
            card = self.theme.make_card(cards_frame2, bg=self.theme.palette.bg_surface)
            card.grid(row=0, column=i, sticky='nsew', padx=(0, 10) if i < 3 else 0)
            body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
            body.pack(fill=tk.BOTH, expand=True, padx=14, pady=10)
            tk.Label(body, text=title, font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w')
            tk.Label(body, text=value, font=('Segoe UI', 16, 'bold'),
                     bg=self.theme.palette.bg_surface, fg=color).pack(anchor='w', pady=(4, 0))

        # Quick actions
        actions_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        actions_card.pack(fill=tk.X, pady=(0, 16))

        tk.Label(actions_card.inner, text='Quick Actions', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=16, pady=(12, 8))

        btn_frame = tk.Frame(actions_card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=16, pady=(0, 14))

        actions = [
            ('📝 New Loan', lambda: self.navigate('new_ticket'), 'primary'),
            ('🔍 Search Loans', lambda: self.navigate('loan_list'), 'secondary'),
            ('👥 Customers', lambda: self.navigate('customers'), 'secondary'),
        ]
        if self.user['role'] == 'admin':
            actions.append(('⚙️ Settings', lambda: self.navigate('admin_settings'), 'ghost'))

        for text, cmd, kind in actions:
            btn = self.theme.make_button(btn_frame, text=text, command=cmd, kind=kind, width=16, pady=8)
            btn.pack(side=tk.LEFT, padx=(0, 10))

        # Recent loans table
        recent_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        recent_card.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        tk.Label(recent_card.inner, text='Recent Loans', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=16, pady=(12, 8))

        # Table header
        cols = ['Ticket #', 'Customer', 'Amount', 'Status', 'Issue Date', 'Expire Date']
        widths = [100, 180, 120, 90, 100, 100]

        table_frame = tk.Frame(recent_card.inner, bg=self.theme.palette.bg_surface)
        table_frame.pack(fill=tk.X, padx=16, pady=(0, 4))

        header_frame = tk.Frame(table_frame, bg=self.theme.palette.bg_surface_alt)
        header_frame.pack(fill=tk.X)
        for j, (col, w) in enumerate(zip(cols, widths)):
            tk.Label(header_frame, text=col, font=self.theme.fonts.body_bold, width=w // 8,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted,
                     anchor='w').pack(side=tk.LEFT, padx=(12 if j == 0 else 4, 4), pady=8)

        loans = search_loans(status='all')[:10]
        from utils import get_status_text, get_status_color, format_date

        for loan in loans:
            row_bg = self.theme.palette.bg_surface
            row_frame = tk.Frame(table_frame, bg=row_bg)
            row_frame.pack(fill=tk.X)
            sep = tk.Frame(table_frame, bg=self.theme.palette.border, height=1)
            sep.pack(fill=tk.X)

            vals = [
                loan['ticket_no'],
                loan['customer_name'],
                format_currency(loan['loan_amount']),
                get_status_text(loan['status'], loan['expire_date']),
                format_date(loan['issue_date']),
                format_date(loan['expire_date']),
            ]
            for j, (val, w) in enumerate(zip(vals, widths)):
                fg = self.theme.palette.text_primary
                if j == 3:
                    fg = get_status_color(loan['status'], loan['expire_date'])
                lbl = tk.Label(row_frame, text=val, font=self.theme.fonts.body, width=w // 8,
                               bg=row_bg, fg=fg, anchor='w', cursor='hand2')
                lbl.pack(side=tk.LEFT, padx=(12 if j == 0 else 4, 4), pady=6)
                lbl.bind('<Button-1>', lambda e, lid=loan['id']: self.navigate('loan_detail', lid))

        if not loans:
            tk.Label(table_frame, text='No loans yet. Create your first loan!',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(pady=20)
