"""Comprehensive admin reports page for Gold Loan System."""

import tkinter as tk
import tkinter.font as tkfont
from datetime import datetime

from database import get_connection, get_dashboard_stats
from utils import format_currency, format_date, get_status_text


class ReportsPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        if self.user.get('role') != 'admin':
            self._render_access_denied()
            return

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        header = tk.Frame(view, bg=self.theme.palette.bg_app)
        header.pack(fill=tk.X, pady=(0, 12))
        tk.Label(
            header,
            text='Admin Reports',
            font=self.theme.fonts.h1,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.text_primary,
        ).pack(side=tk.LEFT)

        tk.Label(
            header,
            text=f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.text_muted,
        ).pack(side=tk.RIGHT)

        btn_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        btn_wrap.pack(fill=tk.X, pady=(0, 10))

        reports = [
            ('System Summary', self._show_summary),
            ('Loan Ledger', self._show_loan_ledger),
            ('Overdue Analysis', self._show_overdue),
            ('Renewal Report', self._show_renewals),
            ('Payment Report', self._show_payments),
            ('Customer Report', self._show_customers),
            ('Gold Inventory', self._show_gold_inventory),
            ('Operations', self._show_operations),
        ]
        for idx, (label, command) in enumerate(reports):
            btn = self.theme.make_button(btn_wrap, text=label, command=command, kind='ghost', width=16, pady=7)
            btn.grid(row=idx // 4, column=idx % 4, padx=(0, 6), pady=(0, 6), sticky='w')

        self.report_content = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.report_content.pack(fill=tk.BOTH, expand=True)
        self._show_summary()

    def _render_access_denied(self):
        tk.Label(
            self.container,
            text='Access Denied - Admin Only',
            font=self.theme.fonts.h2,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.danger,
        ).pack(pady=40)

    def _clear(self):
        for w in self.report_content.winfo_children():
            w.destroy()

    def _query(self, sql, params=()):
        conn = get_connection()
        rows = conn.execute(sql, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def _scalar(self, sql, params=(), default=0):
        conn = get_connection()
        row = conn.execute(sql, params).fetchone()
        conn.close()
        if not row:
            return default
        try:
            return row[0]
        except Exception:
            return default

    def _make_card(self, title):
        card = self.theme.make_card(self.report_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)
        tk.Label(
            card.inner,
            text=title,
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=14, pady=(10, 8))
        return card

    def _render_kpis(self, parent, items, columns=4):
        grid = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        grid.pack(fill=tk.X, padx=14, pady=(0, 10))

        for i in range(columns):
            grid.columnconfigure(i, weight=1)

        for idx, (label, value, color) in enumerate(items):
            row = idx // columns
            col = idx % columns
            box = tk.Frame(
                grid,
                bg=self.theme.palette.bg_surface_alt,
                highlightbackground=self.theme.palette.border,
                highlightthickness=1,
                bd=0,
            )
            box.grid(row=row, column=col, padx=4, pady=4, sticky='nsew')

            tk.Label(
                box,
                text=label,
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_muted,
            ).pack(anchor='w', padx=10, pady=(8, 2))

            tk.Label(
                box,
                text=value,
                font=self.theme.fonts.body_bold,
                bg=self.theme.palette.bg_surface_alt,
                fg=color,
            ).pack(anchor='w', padx=10, pady=(0, 8))

    def _render_table(self, parent, columns, rows, ticket_col=None, max_rows=180):
        wrap = tk.Frame(parent, bg=self.theme.palette.bg_surface)
        wrap.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        body_font = tkfont.Font(font=self.theme.fonts.body)
        header_font = tkfont.Font(font=self.theme.fonts.body_bold)

        shown_rows = rows[:max_rows]

        # One shared pixel-based column layout keeps headers and row cells perfectly aligned.
        px_widths = []
        for col_idx, (title, width_chars) in enumerate(columns):
            by_chars = body_font.measure('0') * int(width_chars) + 20
            by_header = header_font.measure(str(title)) + 20
            by_content = 0
            for row_data in shown_rows[:200]:
                raw_val = '' if col_idx >= len(row_data) else row_data[col_idx]
                text_val = str(raw_val)
                if len(text_val) > 200:
                    text_val = text_val[:200]
                by_content = max(by_content, body_font.measure(text_val) + 20)
            px_widths.append(max(72, by_chars, by_header, by_content))

        table_canvas = tk.Canvas(wrap, bg=self.theme.palette.bg_surface, highlightthickness=0, bd=0)
        table_canvas.pack(fill=tk.X, expand=False)

        xbar = tk.Scrollbar(wrap, orient=tk.HORIZONTAL, command=table_canvas.xview)
        xbar.pack(fill=tk.X)
        table_canvas.configure(xscrollcommand=xbar.set)

        grid = tk.Frame(table_canvas, bg=self.theme.palette.bg_surface)
        grid_window = table_canvas.create_window((0, 0), window=grid, anchor='nw')

        def _sync_table_size(_event=None):
            table_canvas.configure(scrollregion=table_canvas.bbox('all'))
            req_h = max(1, grid.winfo_reqheight())
            if int(float(table_canvas.cget('height'))) != req_h:
                table_canvas.configure(height=req_h)

        def _sync_window_width(_event):
            # Keep grid at content width so extra viewport area uses canvas bg (white surface).
            table_canvas.itemconfigure(grid_window, width=max(1, grid.winfo_reqwidth()))

        grid.bind('<Configure>', _sync_table_size)
        table_canvas.bind('<Configure>', _sync_window_width)

        for idx, px in enumerate(px_widths):
            grid.grid_columnconfigure(idx, minsize=px, weight=0)

        for idx, (title, _) in enumerate(columns):
            tk.Label(
                grid,
                text=title,
                font=self.theme.fonts.body_bold,
                anchor='w',
                padx=6,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_muted,
            ).grid(row=0, column=idx, sticky='nsew', padx=(0, 1), pady=(0, 1))

        for r_idx, row_data in enumerate(shown_rows, start=1):
            row_bg = self.theme.palette.bg_surface if r_idx % 2 == 1 else self.theme.palette.bg_surface_alt

            for c_idx, _ in enumerate(columns):
                value = '' if c_idx >= len(row_data) else row_data[c_idx]
                is_ticket = ticket_col is not None and c_idx == ticket_col
                text_color = self.theme.palette.accent if is_ticket else self.theme.palette.text_primary
                label = tk.Label(
                    grid,
                    text=value,
                    font=self.theme.fonts.body,
                    anchor='w',
                    padx=6,
                    bg=row_bg,
                    fg=text_color,
                    cursor='hand2' if is_ticket else 'arrow',
                )
                label.grid(row=r_idx, column=c_idx, sticky='nsew', padx=(0, 1), pady=(0, 1))

                if is_ticket:
                    ticket_no = str(value)
                    label.bind('<Button-1>', lambda _e, t=ticket_no: self._open_ticket(t))

        if not rows:
            tk.Label(
                wrap,
                text='No records found for this report.',
                font=self.theme.fonts.body,
                bg=self.theme.palette.bg_surface,
                fg=self.theme.palette.text_muted,
            ).pack(pady=20)
            return

        if len(rows) > max_rows:
            tk.Label(
                wrap,
                text=f'Showing first {max_rows} rows of {len(rows)} records.',
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface,
                fg=self.theme.palette.warning,
            ).pack(anchor='e', pady=(6, 0))

    def _open_ticket(self, ticket_no):
        row = self._query('SELECT id FROM loans WHERE ticket_no=?', (ticket_no,))
        if row:
            self.navigate('loan_detail', row[0]['id'])

    def _show_summary(self):
        self._clear()
        stats = get_dashboard_stats()

        total_payments = self._scalar('SELECT COALESCE(SUM(amount), 0) FROM loan_payments')
        total_renewals = self._scalar('SELECT COUNT(*) FROM loan_renewals')
        total_renewal_collections = self._scalar('SELECT COALESCE(SUM(payment_amount), 0) FROM loan_renewals')
        total_principal_reduction = self._scalar('SELECT COALESCE(SUM(principal_reduction), 0) FROM loan_renewals')
        pending_approvals = self._scalar("SELECT COUNT(*) FROM loan_approval_requests WHERE status='pending'")
        letters_created = self._scalar('SELECT COUNT(*) FROM customer_letters')
        active_items = self._scalar(
            """SELECT COUNT(*) FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               WHERE l.status='active'"""
        )
        active_gold_weight = self._scalar(
            """SELECT COALESCE(SUM(li.gold_weight),0) FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               WHERE l.status='active'"""
        )

        card = self._make_card('System Summary Report')
        self._render_kpis(
            card.inner,
            [
                ('Total Loans', str(stats['total_loans']), self.theme.palette.text_primary),
                ('Active Loans', str(stats['total_active']), self.theme.palette.accent),
                ('Redeemed Loans', str(stats['total_redeemed']), self.theme.palette.success),
                ('Overdue Loans', str(stats['overdue_count']), self.theme.palette.danger),
                ('Total Customers', str(stats['total_customers']), self.theme.palette.info),
                ('Active Portfolio', format_currency(stats['active_loan_amount']), self.theme.palette.warning),
                ('Today Revenue', format_currency(stats['today_revenue']), self.theme.palette.success),
                ('Today Loans', str(stats['today_loans']), self.theme.palette.accent),
                ('Total Payments Collected', format_currency(total_payments), self.theme.palette.success),
                ('Total Renewals', str(total_renewals), self.theme.palette.info),
                ('Renewal Collections', format_currency(total_renewal_collections), self.theme.palette.warning),
                ('Principal Reduction', format_currency(total_principal_reduction), self.theme.palette.accent),
                ('Pending Approvals', str(pending_approvals), self.theme.palette.danger),
                ('Letters Generated', str(letters_created), self.theme.palette.info),
                ('Active Gold Items', str(active_items), self.theme.palette.text_primary),
                ('Active Gold Weight (g)', f'{float(active_gold_weight):.3f}', self.theme.palette.warning),
            ],
            columns=4,
        )

    def _show_loan_ledger(self):
        self._clear()
        loans = self._query(
            '''SELECT l.id, l.ticket_no, c.name AS customer_name, l.loan_amount,
                      l.assessed_value, l.market_value, l.interest_rate,
                      l.overdue_interest_rate, l.duration_months, l.issue_date,
                      l.renew_date, l.expire_date, l.status, l.total_gold_weight,
                      l.total_item_weight
               FROM loans l
               JOIN customers c ON l.customer_id=c.id
               ORDER BY l.id DESC'''
        )

        total_issued = sum(float(r['loan_amount'] or 0) for r in loans)
        avg_ticket = (total_issued / len(loans)) if loans else 0
        active_exposure = sum(float(r['loan_amount'] or 0) for r in loans if r['status'] == 'active')

        card = self._make_card('Loan Ledger Report')
        self._render_kpis(
            card.inner,
            [
                ('Total Loan Records', str(len(loans)), self.theme.palette.text_primary),
                ('Total Principal Issued', format_currency(total_issued), self.theme.palette.accent),
                ('Average Ticket Size', format_currency(avg_ticket), self.theme.palette.info),
                ('Active Principal Exposure', format_currency(active_exposure), self.theme.palette.warning),
            ],
            columns=4,
        )

        columns = [
            ('Ticket', 10),
            ('Customer', 15),
            ('Amount', 10),
            ('Status', 10),
            ('Rate%', 8),
            ('OD%', 8),
            ('Issue', 10),
            ('Renew', 10),
            ('Expire', 10),
            ('Gold(g)', 9),
        ]
        rows = []
        for r in loans:
            status_text = get_status_text(r['status'], r['expire_date'])
            rows.append([
                r['ticket_no'],
                r['customer_name'],
                format_currency(r['loan_amount']),
                status_text,
                f"{float(r['interest_rate'] or 0):.2f}",
                f"{float(r['overdue_interest_rate'] or 0):.2f}",
                format_date(r['issue_date']),
                format_date(r['renew_date']) if r['renew_date'] else '-',
                format_date(r['expire_date']),
                f"{float(r['total_gold_weight'] or 0):.3f}",
            ])
        self._render_table(card.inner, columns, rows, ticket_col=0)

    def _show_overdue(self):
        self._clear()
        today = datetime.now().strftime('%Y-%m-%d')
        rows = self._query(
            '''SELECT l.id, l.ticket_no, c.name AS customer_name, c.phone,
                      l.loan_amount, l.expire_date, l.interest_rate,
                      l.overdue_interest_rate, l.renew_date
               FROM loans l
               JOIN customers c ON l.customer_id=c.id
               WHERE l.status='active' AND l.expire_date < ?
               ORDER BY l.expire_date ASC''',
            (today,),
        )

        total_principal = sum(float(r['loan_amount'] or 0) for r in rows)
        days = [max(0, (datetime.now().date() - datetime.strptime(r['expire_date'][:10], '%Y-%m-%d').date()).days) for r in rows]
        avg_overdue = (sum(days) / len(days)) if days else 0
        max_overdue = max(days) if days else 0

        card = self._make_card('Overdue Loan Analysis Report')
        self._render_kpis(
            card.inner,
            [
                ('Overdue Accounts', str(len(rows)), self.theme.palette.danger),
                ('Overdue Principal', format_currency(total_principal), self.theme.palette.warning),
                ('Avg Overdue Days', f'{avg_overdue:.1f}', self.theme.palette.info),
                ('Max Overdue Days', str(max_overdue), self.theme.palette.danger),
            ],
            columns=4,
        )

        columns = [
            ('Ticket', 10),
            ('Customer', 16),
            ('Phone', 12),
            ('Principal', 11),
            ('Expire', 10),
            ('Days', 7),
            ('Rate%', 8),
            ('OD%', 8),
            ('Status', 10),
        ]
        table_rows = []
        for r, overdue_days in zip(rows, days):
            status_text = get_status_text('active', r['expire_date'])
            table_rows.append([
                r['ticket_no'],
                r['customer_name'],
                r['phone'] or '-',
                format_currency(r['loan_amount']),
                format_date(r['expire_date']),
                str(overdue_days),
                f"{float(r['interest_rate'] or 0):.2f}",
                f"{float(r['overdue_interest_rate'] or 0):.2f}",
                status_text,
            ])
        self._render_table(card.inner, columns, table_rows, ticket_col=0)

    def _show_renewals(self):
        self._clear()
        rows = self._query(
            '''SELECT lr.renewed_at, l.ticket_no, c.name AS customer_name,
                      lr.old_expire_date, lr.new_expire_date, lr.new_duration_months,
                      lr.payment_amount, lr.interest_paid, lr.normal_interest_due,
                      lr.overdue_interest_due, lr.principal_reduction,
                      lr.new_loan_amount, u.full_name AS renewed_by_name
               FROM loan_renewals lr
               JOIN loans l ON lr.loan_id=l.id
               JOIN customers c ON l.customer_id=c.id
               LEFT JOIN users u ON lr.renewed_by=u.id
               ORDER BY lr.id DESC'''
        )

        total_payment = sum(float(r['payment_amount'] or 0) for r in rows)
        total_interest_paid = sum(float(r['interest_paid'] or 0) for r in rows)
        total_normal_due = sum(float(r['normal_interest_due'] or 0) for r in rows)
        total_overdue_due = sum(float(r['overdue_interest_due'] or 0) for r in rows)
        total_principal_red = sum(float(r['principal_reduction'] or 0) for r in rows)

        card = self._make_card('Loan Renewal Report')
        self._render_kpis(
            card.inner,
            [
                ('Renewal Transactions', str(len(rows)), self.theme.palette.info),
                ('Renewal Payments', format_currency(total_payment), self.theme.palette.success),
                ('Interest Paid', format_currency(total_interest_paid), self.theme.palette.accent),
                ('Normal Interest Due', format_currency(total_normal_due), self.theme.palette.warning),
                ('Overdue Interest Due', format_currency(total_overdue_due), self.theme.palette.danger),
                ('Principal Reduction', format_currency(total_principal_red), self.theme.palette.accent),
            ],
            columns=3,
        )

        columns = [
            ('Date', 10),
            ('Ticket', 10),
            ('Customer', 14),
            ('Old Exp', 10),
            ('New Exp', 10),
            ('Months', 7),
            ('Paid', 10),
            ('Int Paid', 10),
            ('OD Due', 10),
            ('By', 12),
        ]
        table_rows = []
        for r in rows:
            table_rows.append([
                format_date(r['renewed_at']),
                r['ticket_no'],
                r['customer_name'],
                format_date(r['old_expire_date']),
                format_date(r['new_expire_date']),
                str(r['new_duration_months']),
                format_currency(r['payment_amount']),
                format_currency(r['interest_paid']),
                format_currency(r['overdue_interest_due']),
                r['renewed_by_name'] or '-',
            ])
        self._render_table(card.inner, columns, table_rows, ticket_col=1)

    def _show_payments(self):
        self._clear()
        rows = self._query(
            '''SELECT lp.payment_date, l.ticket_no, c.name AS customer_name,
                      lp.payment_type, lp.amount, u.full_name AS received_by_name,
                      lp.remarks
               FROM loan_payments lp
               JOIN loans l ON lp.loan_id=l.id
               JOIN customers c ON l.customer_id=c.id
               LEFT JOIN users u ON lp.received_by=u.id
               ORDER BY lp.id DESC'''
        )

        totals = {'interest': 0.0, 'redemption': 0.0, 'partial': 0.0, 'penalty': 0.0}
        for r in rows:
            ptype = (r['payment_type'] or '').lower()
            if ptype in totals:
                totals[ptype] += float(r['amount'] or 0)

        total_collected = sum(float(r['amount'] or 0) for r in rows)
        avg_collection = (total_collected / len(rows)) if rows else 0

        card = self._make_card('Payment Collection Report')
        self._render_kpis(
            card.inner,
            [
                ('Payment Entries', str(len(rows)), self.theme.palette.text_primary),
                ('Total Collected', format_currency(total_collected), self.theme.palette.success),
                ('Average Payment', format_currency(avg_collection), self.theme.palette.info),
                ('Interest Collections', format_currency(totals['interest']), self.theme.palette.accent),
                ('Redemption Collections', format_currency(totals['redemption']), self.theme.palette.success),
                ('Partial Payments', format_currency(totals['partial']), self.theme.palette.warning),
                ('Penalty Collections', format_currency(totals['penalty']), self.theme.palette.danger),
            ],
            columns=4,
        )

        columns = [
            ('Date', 10),
            ('Ticket', 10),
            ('Customer', 14),
            ('Type', 10),
            ('Amount', 11),
            ('Received By', 13),
            ('Remarks', 22),
        ]
        table_rows = []
        for r in rows:
            table_rows.append([
                format_date(r['payment_date']),
                r['ticket_no'],
                r['customer_name'],
                (r['payment_type'] or '').upper(),
                format_currency(r['amount']),
                r['received_by_name'] or '-',
                r['remarks'] or '-',
            ])
        self._render_table(card.inner, columns, table_rows, ticket_col=1)

    def _show_customers(self):
        self._clear()
        rows = self._query(
            '''SELECT c.id, c.name, c.nic, c.phone, c.job,
                      COUNT(l.id) AS total_loans,
                      SUM(CASE WHEN l.status='active' THEN 1 ELSE 0 END) AS active_loans,
                      SUM(CASE WHEN l.status='redeemed' THEN 1 ELSE 0 END) AS redeemed_loans,
                      COALESCE(SUM(l.loan_amount),0) AS total_borrowed,
                      COALESCE(SUM(CASE WHEN l.status='active' THEN l.loan_amount ELSE 0 END),0) AS active_exposure,
                      MAX(l.issue_date) AS last_loan_date
               FROM customers c
               LEFT JOIN loans l ON c.id=l.customer_id
               GROUP BY c.id
               ORDER BY active_exposure DESC, total_borrowed DESC'''
        )

        total_customers = len(rows)
        active_borrowers = sum(1 for r in rows if int(r['active_loans'] or 0) > 0)
        total_exposure = sum(float(r['active_exposure'] or 0) for r in rows)
        top_exposure = float(rows[0]['active_exposure']) if rows else 0

        card = self._make_card('Customer Portfolio Report')
        self._render_kpis(
            card.inner,
            [
                ('Total Customers', str(total_customers), self.theme.palette.info),
                ('Active Borrowers', str(active_borrowers), self.theme.palette.accent),
                ('Total Active Exposure', format_currency(total_exposure), self.theme.palette.warning),
                ('Top Customer Exposure', format_currency(top_exposure), self.theme.palette.danger),
            ],
            columns=4,
        )

        columns = [
            ('Customer', 15),
            ('NIC', 13),
            ('Phone', 12),
            ('Job', 12),
            ('Loans', 7),
            ('Active', 7),
            ('Redeemed', 9),
            ('Borrowed', 11),
            ('Exposure', 11),
            ('Last Loan', 10),
        ]
        table_rows = []
        for r in rows:
            table_rows.append([
                r['name'] or '-',
                r['nic'] or '-',
                r['phone'] or '-',
                r['job'] or '-',
                str(r['total_loans'] or 0),
                str(r['active_loans'] or 0),
                str(r['redeemed_loans'] or 0),
                format_currency(r['total_borrowed']),
                format_currency(r['active_exposure']),
                format_date(r['last_loan_date']) if r['last_loan_date'] else '-',
            ])
        self._render_table(card.inner, columns, table_rows)

    def _show_gold_inventory(self):
        self._clear()

        active_items = self._query(
            '''SELECT li.article_type, COUNT(*) AS item_count,
                      COALESCE(SUM(li.quantity),0) AS total_qty,
                      COALESCE(SUM(li.total_weight),0) AS total_item_weight,
                      COALESCE(SUM(li.gold_weight),0) AS total_gold_weight,
                      COALESCE(SUM(li.estimated_value),0) AS total_est_value,
                      ROUND(AVG(li.carat), 2) AS avg_carat
               FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               WHERE l.status='active'
               GROUP BY li.article_type
               ORDER BY total_gold_weight DESC'''
        )

        item_details = self._query(
            '''SELECT l.ticket_no, c.name AS customer_name, li.article_type,
                      li.description, li.quantity, li.total_weight,
                      li.gold_weight, li.carat, li.estimated_value
               FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               JOIN customers c ON l.customer_id=c.id
               WHERE l.status='active'
               ORDER BY li.id DESC'''
        )

        total_items = sum(int(r['item_count'] or 0) for r in active_items)
        total_gold_weight = sum(float(r['total_gold_weight'] or 0) for r in active_items)
        total_item_weight = sum(float(r['total_item_weight'] or 0) for r in active_items)
        total_est_value = sum(float(r['total_est_value'] or 0) for r in active_items)

        card = self._make_card('Gold Inventory and Article Report')
        self._render_kpis(
            card.inner,
            [
                ('Active Item Entries', str(total_items), self.theme.palette.text_primary),
                ('Total Gold Weight (g)', f'{total_gold_weight:.3f}', self.theme.palette.warning),
                ('Total Item Weight (g)', f'{total_item_weight:.3f}', self.theme.palette.info),
                ('Total Estimated Value', format_currency(total_est_value), self.theme.palette.accent),
            ],
            columns=4,
        )

        tk.Label(
            card.inner,
            text='Article Type Summary',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=14, pady=(4, 6))

        summary_columns = [
            ('Article', 14),
            ('Items', 7),
            ('Qty', 7),
            ('Item Wt(g)', 10),
            ('Gold Wt(g)', 10),
            ('Avg Carat', 9),
            ('Est Value', 12),
        ]
        summary_rows = []
        for r in active_items:
            summary_rows.append([
                r['article_type'] or '-',
                str(r['item_count'] or 0),
                str(r['total_qty'] or 0),
                f"{float(r['total_item_weight'] or 0):.3f}",
                f"{float(r['total_gold_weight'] or 0):.3f}",
                f"{float(r['avg_carat'] or 0):.2f}",
                format_currency(r['total_est_value']),
            ])
        self._render_table(card.inner, summary_columns, summary_rows, max_rows=80)

        tk.Label(
            card.inner,
            text='Active Item Details',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=14, pady=(10, 6))

        detail_columns = [
            ('Ticket', 10),
            ('Customer', 12),
            ('Type', 10),
            ('Description', 16),
            ('Qty', 6),
            ('Gold(g)', 9),
            ('Carat', 7),
            ('Est Value', 11),
        ]
        detail_rows = []
        for r in item_details:
            detail_rows.append([
                r['ticket_no'],
                r['customer_name'] or '-',
                r['article_type'] or '-',
                r['description'] or '-',
                str(r['quantity'] or 0),
                f"{float(r['gold_weight'] or 0):.3f}",
                str(r['carat'] or '-'),
                format_currency(r['estimated_value']),
            ])
        self._render_table(card.inner, detail_columns, detail_rows, ticket_col=0)

    def _show_operations(self):
        self._clear()

        approvals = self._query(
            '''SELECT status, COUNT(*) AS count
               FROM loan_approval_requests
               GROUP BY status'''
        )
        letters = self._query(
            '''SELECT status, COUNT(*) AS count
               FROM customer_letters
               GROUP BY status'''
        )
        audits = self._query(
            '''SELECT a.created_at, u.full_name AS user_name, a.action,
                      a.entity_type, a.entity_id
               FROM audit_log a
               LEFT JOIN users u ON a.user_id=u.id
               ORDER BY a.id DESC'''
        )

        approval_map = {r['status']: int(r['count'] or 0) for r in approvals}
        letter_map = {r['status']: int(r['count'] or 0) for r in letters}

        card = self._make_card('Operations and Compliance Report')
        self._render_kpis(
            card.inner,
            [
                ('Approvals Pending', str(approval_map.get('pending', 0)), self.theme.palette.danger),
                ('Approvals Approved', str(approval_map.get('approved', 0)), self.theme.palette.success),
                ('Approvals Declined', str(approval_map.get('declined', 0)), self.theme.palette.warning),
                ('Letters Draft', str(letter_map.get('draft', 0)), self.theme.palette.info),
                ('Letters Printed', str(letter_map.get('printed', 0)), self.theme.palette.accent),
                ('Letters Sent', str(letter_map.get('sent', 0)), self.theme.palette.success),
                ('Audit Events', str(len(audits)), self.theme.palette.text_primary),
            ],
            columns=4,
        )

        tk.Label(
            card.inner,
            text='Recent Audit Activity',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=14, pady=(8, 6))

        columns = [
            ('Date', 10),
            ('User', 14),
            ('Action', 20),
            ('Entity', 12),
            ('Entity ID', 10),
        ]
        rows = []
        for r in audits:
            rows.append([
                format_date(r['created_at']),
                r['user_name'] or '-',
                r['action'] or '-',
                r['entity_type'] or '-',
                str(r['entity_id'] or '-'),
            ])
        self._render_table(card.inner, columns, rows, max_rows=120)
