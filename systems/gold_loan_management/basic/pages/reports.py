"""Comprehensive admin reports page for Gold Loan System."""

import csv
import tkinter as tk
import tkinter.font as tkfont
from datetime import datetime, timedelta
from pathlib import Path
from tkinter import filedialog, messagebox

from database import get_connection, get_dashboard_stats, get_duration_rate
from utils import format_currency, format_date, get_status_text
from utils import calculate_total_payable


class ReportsPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self._export_columns = []
        self._export_rows = []
        self._report_title = 'report'
        self._active_report_handler = None
        today = datetime.now().date()
        self._date_to_var = tk.StringVar(value=today.strftime('%Y-%m-%d'))
        self._date_from_var = tk.StringVar(value=(today - timedelta(days=90)).strftime('%Y-%m-%d'))
        self._gold_inventory_scope_var = tk.StringVar(value='active')

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

        filter_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        filter_wrap.pack(fill=tk.X, pady=(0, 6))
        filter_card = self.theme.make_card(filter_wrap, bg=self.theme.palette.bg_surface)
        filter_card.pack(fill=tk.X)

        filters = tk.Frame(filter_card.inner, bg=self.theme.palette.bg_surface)
        filters.pack(fill=tk.X, padx=12, pady=8)

        tk.Label(filters, text='From:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(filters, variable=self._date_from_var, width=12).pack(side=tk.LEFT, padx=(6, 10))
        tk.Label(filters, text='To:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(filters, variable=self._date_to_var, width=12).pack(side=tk.LEFT, padx=(6, 10))
        tk.Label(filters, text='Format: YYYY-MM-DD', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 12))

        self.theme.make_button(
            filters,
            text='Apply Range',
            command=self._refresh_active_report,
            kind='primary',
            width=12,
            pady=6,
        ).pack(side=tk.LEFT)
        self.theme.make_button(
            filters,
            text='Reset 90D',
            command=self._reset_date_range,
            kind='ghost',
            width=12,
            pady=6,
        ).pack(side=tk.LEFT, padx=(8, 0))
        self.theme.make_button(
            filters,
            text='Today',
            command=self._set_today_range,
            kind='ghost',
            width=10,
            pady=6,
        ).pack(side=tk.LEFT, padx=(8, 0))

        export_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        export_wrap.pack(fill=tk.X, pady=(0, 6))
        self.theme.make_button(
            export_wrap,
            text='📤 Export CSV',
            command=self._export_csv,
            kind='secondary',
            width=14,
            pady=6,
        ).pack(side=tk.RIGHT)
        self.theme.make_button(
            export_wrap,
            text='📊 Export Excel',
            command=self._export_excel,
            kind='ghost',
            width=14,
            pady=6,
        ).pack(side=tk.RIGHT, padx=(0, 8))

        btn_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        btn_wrap.pack(fill=tk.X, pady=(0, 10))

        reports = [
            ('Analytics Dashboard', lambda: self._set_active_report(self._show_analytics)),
            ('System Summary', lambda: self._set_active_report(self._show_summary)),
            ('Loan Ledger', lambda: self._set_active_report(self._show_loan_ledger)),
            ('Overdue Analysis', lambda: self._set_active_report(self._show_overdue)),
            ('Renewal Report', lambda: self._set_active_report(self._show_renewals)),
            ('Payment Report', lambda: self._set_active_report(self._show_payments)),
            ('Interest Report', lambda: self._set_active_report(self._show_interest_report)),
            ('Customer Report', lambda: self._set_active_report(self._show_customers)),
            ('Gold Inventory', lambda: self._set_active_report(self._show_gold_inventory)),
            ('Operations', lambda: self._set_active_report(self._show_operations)),
        ]
        for idx, (label, command) in enumerate(reports):
            btn = self.theme.make_button(btn_wrap, text=label, command=command, kind='ghost', width=16, pady=7)
            btn.grid(row=idx // 4, column=idx % 4, padx=(0, 6), pady=(0, 6), sticky='w')

        self.report_content = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.report_content.pack(fill=tk.BOTH, expand=True)
        self._set_active_report(self._show_analytics)

    def _set_active_report(self, handler):
        self._active_report_handler = handler
        handler()

    def _reset_date_range(self):
        today = datetime.now().date()
        self._date_to_var.set(today.strftime('%Y-%m-%d'))
        self._date_from_var.set((today - timedelta(days=90)).strftime('%Y-%m-%d'))
        self._refresh_active_report()

    def _set_today_range(self):
        today = datetime.now().date().strftime('%Y-%m-%d')
        self._date_from_var.set(today)
        self._date_to_var.set(today)
        self._refresh_active_report()

    def _get_date_range(self, show_error=True):
        raw_from = (self._date_from_var.get() or '').strip()
        raw_to = (self._date_to_var.get() or '').strip()
        try:
            date_from = datetime.strptime(raw_from, '%Y-%m-%d').date()
            date_to = datetime.strptime(raw_to, '%Y-%m-%d').date()
        except ValueError:
            if show_error:
                messagebox.showwarning('Date Range', 'Enter valid dates in YYYY-MM-DD format.')
            return None, None

        if date_from > date_to:
            if show_error:
                messagebox.showwarning('Date Range', 'From date must be before or equal to To date.')
            return None, None

        return date_from.strftime('%Y-%m-%d'), date_to.strftime('%Y-%m-%d')

    def _refresh_active_report(self):
        if not self._active_report_handler:
            return
        date_from, date_to = self._get_date_range(show_error=True)
        if not date_from or not date_to:
            return
        self._active_report_handler()

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
        self._report_title = title
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

        # Keep latest table dataset available for exports.
        self._export_columns = [c[0] for c in columns]
        self._export_rows = [list(r) for r in rows]

    def _render_bar_chart(self, parent, title, data_pairs, color):
        card = tk.Frame(
            parent,
            bg=self.theme.palette.bg_surface_alt,
            highlightbackground=self.theme.palette.border,
            highlightthickness=1,
        )
        card.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=4, pady=4)

        tk.Label(
            card,
            text=title,
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=10, pady=(8, 4))

        if not data_pairs:
            tk.Label(
                card,
                text='No data for selected filters.',
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_muted,
            ).pack(padx=10, pady=(4, 10), anchor='w')
            return

        canvas = tk.Canvas(card, bg=self.theme.palette.bg_surface_alt, highlightthickness=0, height=220)
        canvas.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0, 8))

        max_val = max(float(v) for _, v in data_pairs) or 1.0
        pad_left = 40
        pad_right = 14
        pad_top = 10
        pad_bottom = 45

        width = 520
        height = 220
        n = len(data_pairs)
        gap = 12
        usable_w = max(1, width - pad_left - pad_right)
        bar_w = max(16, int((usable_w - gap * (n - 1)) / max(1, n)))
        chart_h = max(1, height - pad_top - pad_bottom)

        for idx, (name, raw_value) in enumerate(data_pairs):
            value = float(raw_value)
            x1 = pad_left + idx * (bar_w + gap)
            x2 = x1 + bar_w
            bar_h = int((value / max_val) * chart_h)
            y2 = height - pad_bottom
            y1 = y2 - bar_h

            canvas.create_rectangle(x1, y1, x2, y2, fill=color, outline='')
            canvas.create_text((x1 + x2) / 2, y1 - 8, text=f"{int(value) if value.is_integer() else value:.0f}",
                               font=('Segoe UI', 8), fill=self.theme.palette.text_muted)
            short_name = str(name)
            if len(short_name) > 11:
                short_name = short_name[:10] + '…'
            canvas.create_text((x1 + x2) / 2, y2 + 14, text=short_name,
                               font=('Segoe UI', 8), fill=self.theme.palette.text_primary)

    def _export_csv(self):
        if not self._export_columns or not self._export_rows:
            messagebox.showinfo('Export CSV', 'No table data available to export in this report view.')
            return

        filename = f"{self._report_title.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"
        path = filedialog.asksaveasfilename(
            title='Export Report as CSV',
            initialfile=filename,
            defaultextension='.csv',
            filetypes=[('CSV files', '*.csv')],
        )
        if not path:
            return

        with open(path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            writer.writerow(self._export_columns)
            writer.writerows(self._export_rows)

        messagebox.showinfo('Export CSV', f'Report exported successfully:\n{path}')

    def _export_excel(self):
        if not self._export_columns or not self._export_rows:
            messagebox.showinfo('Export Excel', 'No table data available to export in this report view.')
            return

        try:
            from openpyxl import Workbook
        except Exception:
            messagebox.showwarning(
                'Export Excel',
                'Excel export requires openpyxl.\nInstall with: pip install openpyxl\n\nUsing CSV export instead.'
            )
            self._export_csv()
            return

        filename = f"{self._report_title.lower().replace(' ', '_')}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx"
        path = filedialog.asksaveasfilename(
            title='Export Report as Excel',
            initialfile=filename,
            defaultextension='.xlsx',
            filetypes=[('Excel Workbook', '*.xlsx')],
        )
        if not path:
            return

        wb = Workbook()
        ws = wb.active
        ws.title = 'Report'
        ws.append(self._export_columns)
        for row in self._export_rows:
            ws.append(row)
        wb.save(path)

        messagebox.showinfo('Export Excel', f'Report exported successfully:\n{path}')

    def _show_analytics(self):
        self._clear()

        card = self._make_card('Analytics Dashboard')

        controls = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        controls.pack(fill=tk.X, padx=14, pady=(0, 8))

        period_var = tk.StringVar(value='90d')
        status_var = tk.StringVar(value='all')
        min_amount_var = tk.StringVar(value='0')

        tk.Label(controls, text='Period:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        period_combo = tk.OptionMenu(controls, period_var, '7d', '30d', '90d', '365d', 'all')
        period_combo.configure(bg=self.theme.palette.bg_surface_alt, relief='flat', highlightthickness=0)
        period_combo.pack(side=tk.LEFT, padx=(6, 12))

        tk.Label(controls, text='Status:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        status_combo = tk.OptionMenu(controls, status_var, 'all', 'active', 'redeemed', 'forfeited')
        status_combo.configure(bg=self.theme.palette.bg_surface_alt, relief='flat', highlightthickness=0)
        status_combo.pack(side=tk.LEFT, padx=(6, 12))

        tk.Label(controls, text='Min Amount:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(controls, variable=min_amount_var, width=10).pack(side=tk.LEFT, padx=(6, 12))

        content = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        content.pack(fill=tk.BOTH, expand=True)

        def refresh_dashboard():
            for w in content.winfo_children():
                w.destroy()

            date_from, date_to = self._get_date_range(show_error=False)
            if not date_from or not date_to:
                date_to = datetime.now().strftime('%Y-%m-%d')
                date_from = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')

            rows = self._query(
                '''SELECT l.ticket_no, c.name AS customer_name, l.loan_amount, l.status,
                          l.issue_date, l.expire_date, l.duration_months, l.interest_rate
                   FROM loans l
                   JOIN customers c ON l.customer_id=c.id
                   WHERE date(l.issue_date) BETWEEN ? AND ?
                   ORDER BY l.id DESC'''
                     ,
                (date_from, date_to),
            )

            now = datetime.now().date()
            period_days = {
                '7d': 7,
                '30d': 30,
                '90d': 90,
                '365d': 365,
                'all': None,
            }.get(period_var.get(), 90)

            filtered = []
            try:
                min_amount = float(min_amount_var.get() or 0)
            except ValueError:
                min_amount = 0

            for r in rows:
                issue_raw = (r.get('issue_date') or '')[:10]
                try:
                    issue_dt = datetime.strptime(issue_raw, '%Y-%m-%d').date()
                except ValueError:
                    issue_dt = now

                if period_days is not None and (now - issue_dt).days > period_days:
                    continue
                if status_var.get() != 'all' and (r.get('status') or '') != status_var.get():
                    continue
                if float(r.get('loan_amount') or 0) < min_amount:
                    continue
                filtered.append(r)

            total_issued = sum(float(r.get('loan_amount') or 0) for r in filtered)
            active_count = sum(1 for r in filtered if r.get('status') == 'active')
            redeemed_count = sum(1 for r in filtered if r.get('status') == 'redeemed')
            forfeited_count = sum(1 for r in filtered if r.get('status') == 'forfeited')
            avg_ticket = (total_issued / len(filtered)) if filtered else 0

            self._render_kpis(
                content,
                [
                    ('Filtered Loans', str(len(filtered)), self.theme.palette.text_primary),
                    ('Total Issued', format_currency(total_issued), self.theme.palette.accent),
                    ('Average Ticket', format_currency(avg_ticket), self.theme.palette.info),
                    ('Active', str(active_count), self.theme.palette.success),
                    ('Redeemed', str(redeemed_count), self.theme.palette.warning),
                    ('Forfeited', str(forfeited_count), self.theme.palette.danger),
                ],
                columns=3,
            )

            charts_row = tk.Frame(content, bg=self.theme.palette.bg_surface)
            charts_row.pack(fill=tk.X, padx=10, pady=(0, 8))

            status_chart = [
                ('Active', active_count),
                ('Redeemed', redeemed_count),
                ('Forfeited', forfeited_count),
            ]
            self._render_bar_chart(charts_row, 'Status Distribution', status_chart, self.theme.palette.accent)

            month_map = {}
            for r in filtered:
                issue_raw = (r.get('issue_date') or '')[:10]
                key = issue_raw[:7] if len(issue_raw) >= 7 else issue_raw
                if not key:
                    continue
                month_map[key] = month_map.get(key, 0) + 1
            month_pairs = sorted(month_map.items())[-6:]
            self._render_bar_chart(charts_row, 'Loan Issuance Trend (Monthly)', month_pairs, self.theme.palette.success)

            suggestion_card = tk.Frame(
                content,
                bg=self.theme.palette.bg_surface_alt,
                highlightbackground=self.theme.palette.border,
                highlightthickness=1,
            )
            suggestion_card.pack(fill=tk.X, padx=14, pady=(0, 8))
            tk.Label(
                suggestion_card,
                text='Suggestions & Insights',
                font=self.theme.fonts.body_bold,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_primary,
            ).pack(anchor='w', padx=10, pady=(8, 6))

            insights = []
            if len(filtered) == 0:
                insights.append('No records match current filters. Widen period or reduce minimum amount.')
            if forfeited_count > 0:
                insights.append('Forfeited loans detected. Review recovery workflow and customer reminders.')
            if active_count > redeemed_count and active_count > 10:
                insights.append('Active loans are high relative to redemptions. Consider targeted renewal/redeem campaigns.')
            if avg_ticket > 250000:
                insights.append('Average ticket size is high. Monitor concentration risk and overdue exposure carefully.')
            if not insights:
                insights.append('Portfolio mix looks balanced for current filters. Keep tracking overdue and forfeited trends weekly.')

            for item in insights:
                tk.Label(
                    suggestion_card,
                    text=f'• {item}',
                    font=self.theme.fonts.body,
                    bg=self.theme.palette.bg_surface_alt,
                    fg=self.theme.palette.text_primary,
                    wraplength=980,
                    justify='left',
                ).pack(anchor='w', padx=10, pady=(0, 4))

            columns = [
                ('Ticket', 10),
                ('Customer', 16),
                ('Amount', 11),
                ('Status', 10),
                ('Issue', 10),
                ('Expire', 10),
                ('Duration', 8),
                ('Rate%', 8),
            ]
            table_rows = [
                [
                    r.get('ticket_no', '-'),
                    r.get('customer_name', '-'),
                    format_currency(r.get('loan_amount', 0)),
                    get_status_text(r.get('status', 'active'), r.get('expire_date', '')),
                    format_date(r.get('issue_date', '')),
                    format_date(r.get('expire_date', '')),
                    str(r.get('duration_months', '-')),
                    f"{float(r.get('interest_rate') or 0):.2f}",
                ]
                for r in filtered
            ]
            self._render_table(content, columns, table_rows, ticket_col=0)

        self.theme.make_button(
            controls,
            text='Apply Filters',
            command=refresh_dashboard,
            kind='primary',
            width=12,
            pady=6,
        ).pack(side=tk.LEFT)
        self.theme.make_button(
            controls,
            text='Reset',
            command=lambda: (period_var.set('90d'), status_var.set('all'), min_amount_var.set('0'), refresh_dashboard()),
            kind='ghost',
            width=10,
            pady=6,
        ).pack(side=tk.LEFT, padx=(8, 0))

        refresh_dashboard()

    def _open_ticket(self, ticket_no):
        row = self._query('SELECT id FROM loans WHERE ticket_no=?', (ticket_no,))
        if row:
            self.navigate('loan_detail', row[0]['id'])

    def _show_summary(self):
        self._clear()
        date_from, date_to = self._get_date_range(show_error=False)
        if not date_from or not date_to:
            date_to = datetime.now().strftime('%Y-%m-%d')
            date_from = (datetime.now() - timedelta(days=90)).strftime('%Y-%m-%d')

        total_loans = self._scalar(
            "SELECT COUNT(*) FROM loans WHERE date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        total_active = self._scalar(
            "SELECT COUNT(*) FROM loans WHERE status='active' AND date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        total_redeemed = self._scalar(
            "SELECT COUNT(*) FROM loans WHERE status='redeemed' AND date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        overdue_count = self._scalar(
            "SELECT COUNT(*) FROM loans WHERE status='active' AND expire_date < ? AND date(created_at) BETWEEN ? AND ?",
            (date_to, date_from, date_to),
        )
        total_customers = self._scalar(
            "SELECT COUNT(*) FROM customers WHERE date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        active_loan_amount = self._scalar(
            "SELECT COALESCE(SUM(loan_amount),0) FROM loans WHERE status='active' AND date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        today_loans = self._scalar(
            "SELECT COUNT(*) FROM loans WHERE date(created_at)=?",
            (date_to,),
        )
        today_revenue = self._scalar(
            "SELECT COALESCE(SUM(amount),0) FROM loan_payments WHERE date(payment_date)=?",
            (date_to,),
        )

        total_payments = self._scalar(
            'SELECT COALESCE(SUM(amount), 0) FROM loan_payments WHERE date(payment_date) BETWEEN ? AND ?',
            (date_from, date_to),
        )
        total_interest_collected = self._scalar(
            '''SELECT COALESCE(SUM(CASE
                    WHEN lp.payment_type='interest' THEN lp.amount
                    WHEN lp.payment_type='penalty' THEN lp.amount
                    WHEN lp.payment_type='redemption' THEN
                        CASE
                            WHEN (COALESCE(lp.interest_amount,0) + COALESCE(lp.overdue_interest_amount,0)) > 0
                                THEN COALESCE(lp.interest_amount,0) + COALESCE(lp.overdue_interest_amount,0)
                            ELSE MAX(
                                0,
                                COALESCE(lp.amount,0)
                                - COALESCE(NULLIF(lp.principal_amount,0), COALESCE(l.interest_principal_amount, l.loan_amount, 0))
                                - COALESCE(lp.other_charges_amount,0)
                            )
                        END
                    ELSE 0 END), 0)
               FROM loan_payments lp
               JOIN loans l ON l.id=lp.loan_id
               WHERE date(lp.payment_date) BETWEEN ? AND ?''',
            (date_from, date_to),
        )

        active_interest_rows = self._query(
            '''SELECT id, loan_amount, interest_principal_amount, interest_rate,
                      overdue_interest_rate, duration_months, issue_date,
                      renew_date, expire_date
               FROM loans
               WHERE status='active' AND date(created_at) BETWEEN ? AND ?''',
            (date_from, date_to),
        )
        active_collections = self._query(
            '''SELECT loan_id,
                      COALESCE(SUM(CASE
                        WHEN payment_type='interest' THEN amount
                        WHEN payment_type='penalty' THEN amount
                        ELSE 0 END), 0) AS collected_interest
               FROM loan_payments
               WHERE date(payment_date) <= ?
               GROUP BY loan_id''',
            (date_to,),
        )
        collected_by_loan = {
            int(r.get('loan_id')): float(r.get('collected_interest') or 0)
            for r in active_collections
            if r.get('loan_id') is not None
        }

        total_current_active_interest_non_collected = 0.0
        for loan in active_interest_rows:
            principal_base = float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0)
            dur_rate = get_duration_rate(loan.get('duration_months') or 1)
            max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
            payable = self._calculate_total_payable_as_of(
                date_to,
                principal_base,
                loan.get('interest_rate') or 0,
                loan.get('duration_months') or 1,
                loan.get('overdue_interest_rate') or 0,
                loan.get('expire_date') or '',
                loan.get('renew_date') or loan.get('issue_date') or '',
                max_interest_months,
            )
            accrued_interest = float(payable.get('interest') or 0) + float(payable.get('overdue_interest') or 0)
            collected_interest = float(collected_by_loan.get(int(loan.get('id') or 0), 0))
            total_current_active_interest_non_collected += max(0.0, accrued_interest - collected_interest)
        total_renewals = self._scalar(
            'SELECT COUNT(*) FROM loan_renewals WHERE date(renewed_at) BETWEEN ? AND ?',
            (date_from, date_to),
        )
        total_renewal_collections = self._scalar(
            'SELECT COALESCE(SUM(payment_amount), 0) FROM loan_renewals WHERE date(renewed_at) BETWEEN ? AND ?',
            (date_from, date_to),
        )
        total_principal_reduction = self._scalar(
            'SELECT COALESCE(SUM(principal_reduction), 0) FROM loan_renewals WHERE date(renewed_at) BETWEEN ? AND ?',
            (date_from, date_to),
        )
        pending_approvals = self._scalar(
            "SELECT COUNT(*) FROM loan_approval_requests WHERE status='pending' AND date(created_at) BETWEEN ? AND ?",
            (date_from, date_to),
        )
        letters_created = self._scalar(
            'SELECT COUNT(*) FROM customer_letters WHERE date(created_at) BETWEEN ? AND ?',
            (date_from, date_to),
        )
        active_items = self._scalar(
            """SELECT COUNT(*) FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               WHERE l.status='active' AND date(l.created_at) BETWEEN ? AND ?""",
            (date_from, date_to),
        )
        active_gold_weight = self._scalar(
            """SELECT COALESCE(SUM(li.gold_weight),0) FROM loan_items li
               JOIN loans l ON li.loan_id=l.id
               WHERE l.status='active' AND date(l.created_at) BETWEEN ? AND ?""",
            (date_from, date_to),
        )

        card = self._make_card('System Summary Report')
        self._render_kpis(
            card.inner,
            [
                ('Total Loans', str(total_loans), self.theme.palette.text_primary),
                ('Active Loans', str(total_active), self.theme.palette.accent),
                ('Redeemed Loans', str(total_redeemed), self.theme.palette.success),
                ('Overdue Loans', str(overdue_count), self.theme.palette.danger),
                ('Total Customers', str(total_customers), self.theme.palette.info),
                ('Active Portfolio', format_currency(active_loan_amount), self.theme.palette.warning),
                ('Today Revenue', format_currency(today_revenue), self.theme.palette.success),
                ('Today Loans', str(today_loans), self.theme.palette.accent),
                ('Total Payments Collected', format_currency(total_payments), self.theme.palette.success),
                ('Total Interest Collected', format_currency(total_interest_collected), self.theme.palette.success),
                ('Current Active Interests', format_currency(total_current_active_interest_non_collected), self.theme.palette.warning),
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

        self._export_columns = ['Metric', 'Value']
        self._export_rows = [
            ['From', date_from],
            ['To', date_to],
            ['Total Loans', str(total_loans)],
            ['Active Loans', str(total_active)],
            ['Redeemed Loans', str(total_redeemed)],
            ['Overdue Loans', str(overdue_count)],
            ['Total Customers', str(total_customers)],
            ['Active Portfolio', format_currency(active_loan_amount)],
            ['Today Revenue', format_currency(today_revenue)],
            ['Today Loans', str(today_loans)],
            ['Total Payments Collected', format_currency(total_payments)],
            ['Total Interest Collected', format_currency(total_interest_collected)],
            ['Current Active Interests (Non-Collected)', format_currency(total_current_active_interest_non_collected)],
            ['Total Renewals', str(total_renewals)],
            ['Renewal Collections', format_currency(total_renewal_collections)],
            ['Principal Reduction', format_currency(total_principal_reduction)],
            ['Pending Approvals', str(pending_approvals)],
            ['Letters Generated', str(letters_created)],
            ['Active Gold Items', str(active_items)],
            ['Active Gold Weight (g)', f'{float(active_gold_weight):.3f}'],
        ]

    def _show_loan_ledger(self):
        self._clear()
        date_from, date_to = self._get_date_range(show_error=False)
        loans = self._query(
            '''SELECT l.id, l.ticket_no, c.name AS customer_name, l.loan_amount,
                      l.assessed_value, l.market_value, l.interest_rate,
                      l.overdue_interest_rate, l.duration_months, l.issue_date,
                      l.renew_date, l.expire_date, l.status, l.total_gold_weight,
                      l.total_item_weight
               FROM loans l
               JOIN customers c ON l.customer_id=c.id
               WHERE date(l.issue_date) BETWEEN ? AND ?
               ORDER BY l.id DESC''',
            (date_from, date_to),
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
        date_from, date_to = self._get_date_range(show_error=False)
        rows = self._query(
            '''SELECT l.id, l.ticket_no, c.name AS customer_name, c.phone,
                      l.loan_amount, l.expire_date, l.interest_rate,
                      l.overdue_interest_rate, l.renew_date
               FROM loans l
               JOIN customers c ON l.customer_id=c.id
               WHERE l.status='active' AND l.expire_date < ?
                 AND date(l.expire_date) BETWEEN ? AND ?
               ORDER BY l.expire_date ASC''',
            (date_to, date_from, date_to),
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
        date_from, date_to = self._get_date_range(show_error=False)
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
               WHERE date(lr.renewed_at) BETWEEN ? AND ?
               ORDER BY lr.id DESC'''
            ,(date_from, date_to),
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
        date_from, date_to = self._get_date_range(show_error=False)
        rows = self._query(
            '''SELECT lp.payment_date, l.ticket_no, c.name AS customer_name,
                      lp.payment_type, lp.amount, u.full_name AS received_by_name,
                      lp.remarks
               FROM loan_payments lp
               JOIN loans l ON lp.loan_id=l.id
               JOIN customers c ON l.customer_id=c.id
               LEFT JOIN users u ON lp.received_by=u.id
               WHERE date(lp.payment_date) BETWEEN ? AND ?
               ORDER BY lp.id DESC'''
            ,(date_from, date_to),
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

    def _show_interest_report(self):
        self._clear()
        date_from, date_to = self._get_date_range(show_error=False)

        loans = self._query(
            '''SELECT l.id, l.ticket_no, l.customer_id, c.name AS customer_name,
                      l.status, l.loan_amount, l.interest_principal_amount,
                      l.interest_rate, l.overdue_interest_rate, l.duration_months,
                      l.issue_date, l.renew_date, l.expire_date,
                      COALESCE(SUM(CASE
                        WHEN date(lp.payment_date) BETWEEN ? AND ? AND lp.payment_type='interest' THEN lp.amount
                        WHEN date(lp.payment_date) BETWEEN ? AND ? AND lp.payment_type='penalty' THEN lp.amount
                        WHEN date(lp.payment_date) BETWEEN ? AND ? AND lp.payment_type='redemption' THEN
                            CASE
                                WHEN (COALESCE(lp.interest_amount,0) + COALESCE(lp.overdue_interest_amount,0)) > 0
                                    THEN COALESCE(lp.interest_amount,0) + COALESCE(lp.overdue_interest_amount,0)
                                ELSE MAX(
                                    0,
                                    COALESCE(lp.amount,0)
                                    - COALESCE(NULLIF(lp.principal_amount,0), COALESCE(l.interest_principal_amount, l.loan_amount, 0))
                                    - COALESCE(lp.other_charges_amount,0)
                                )
                            END
                        ELSE 0 END), 0) AS collected_interest
               FROM loans l
               JOIN customers c ON l.customer_id=c.id
               LEFT JOIN loan_payments lp ON lp.loan_id=l.id
                    WHERE date(l.issue_date) <= ?
                      AND (
                          date(l.issue_date) BETWEEN ? AND ?
                          OR EXISTS (
                                SELECT 1 FROM loan_payments lp2
                                WHERE lp2.loan_id=l.id AND date(lp2.payment_date) BETWEEN ? AND ?
                          )
                          OR l.status='active'
                      )
               GROUP BY l.id
               ORDER BY l.id DESC''',
                (date_from, date_to, date_from, date_to, date_from, date_to, date_to, date_from, date_to, date_from, date_to),
        )

        total_collected_interest = 0.0
        total_current_interest = 0.0
        detail_rows = []

        for loan in loans:
            principal_base = float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0)
            collected_interest = float(loan.get('collected_interest') or 0)

            current_interest = 0.0
            overdue_interest = 0.0
            if loan.get('status') == 'active':
                accrual_start = loan.get('renew_date') or loan.get('issue_date')
                dur_rate = get_duration_rate(loan.get('duration_months') or 1)
                max_interest_months = dur_rate.get('max_interest_months', 3) if dur_rate else 3
                payable = self._calculate_total_payable_as_of(
                    date_to,
                    principal_base,
                    loan.get('interest_rate') or 0,
                    loan.get('duration_months') or 1,
                    loan.get('overdue_interest_rate') or 0,
                    loan.get('expire_date') or '',
                    accrual_start,
                    max_interest_months,
                )
                current_interest = float(payable.get('interest') or 0)
                overdue_interest = float(payable.get('overdue_interest') or 0)

            current_total = current_interest + overdue_interest
            all_interest = collected_interest + current_total

            total_collected_interest += collected_interest
            total_current_interest += current_total

            detail_rows.append([
                loan.get('ticket_no') or '-',
                loan.get('customer_name') or '-',
                get_status_text(loan.get('status') or 'active', loan.get('expire_date') or ''),
                format_currency(principal_base),
                format_currency(collected_interest),
                format_currency(current_interest),
                format_currency(overdue_interest),
                format_currency(all_interest),
                format_date(loan.get('issue_date') or ''),
                format_date(loan.get('expire_date') or ''),
            ])

        total_all_interest = total_collected_interest + total_current_interest

        card = self._make_card('Interest Report')
        self._render_kpis(
            card.inner,
            [
                ('Loans (Filtered)', str(len(loans)), self.theme.palette.text_primary),
                ('Collected Interest', format_currency(total_collected_interest), self.theme.palette.success),
                (f'Current Interest (As Of {date_to})', format_currency(total_current_interest), self.theme.palette.warning),
                ('All Interest', format_currency(total_all_interest), self.theme.palette.accent),
            ],
            columns=4,
        )

        columns = [
            ('Ticket', 10),
            ('Customer', 15),
            ('Status', 12),
            ('Principal', 11),
            ('Collected Int', 12),
            ('Current Int', 12),
            ('Overdue Int', 12),
            ('All Int', 11),
            ('Issue', 10),
            ('Expire', 10),
        ]
        self._render_table(card.inner, columns, detail_rows, ticket_col=0)

    def _calculate_total_payable_as_of(self, as_of_date_str, loan_amount, interest_rate, duration_months, overdue_rate, expire_date_str, issue_date_str, max_interest_months=3):
        """Calculate payable snapshot as of a specific date (YYYY-MM-DD)."""
        try:
            issue = datetime.strptime(str(issue_date_str).split(' ')[0], '%Y-%m-%d')
            expire = datetime.strptime(str(expire_date_str).split(' ')[0], '%Y-%m-%d')
            as_of = datetime.strptime(str(as_of_date_str).split(' ')[0], '%Y-%m-%d')

            total_days = max(0, (as_of - issue).days)
            overdue_days = max(0, (as_of - expire).days)

            daily_rate = float(interest_rate) / 30.0
            overdue_daily_rate = float(overdue_rate) / 30.0

            if overdue_days <= 0:
                interest = round(float(loan_amount) * (daily_rate / 100.0) * total_days, 2)
                overdue_base_interest = 0.0
                overdue_penalty_interest = 0.0
                overdue_interest = 0.0
            else:
                days_until_expire = max(0, (expire - issue).days)
                interest = round(float(loan_amount) * (daily_rate / 100.0) * min(total_days, days_until_expire), 2)
                overdue_base_interest = round(float(loan_amount) * (daily_rate / 100.0) * overdue_days, 2)
                overdue_penalty_interest = round(float(loan_amount) * (overdue_daily_rate / 100.0) * overdue_days, 2)
                overdue_interest = round(overdue_base_interest + overdue_penalty_interest, 2)

            total = float(loan_amount) + interest + overdue_interest
            return {
                'loan_amount': float(loan_amount),
                'interest': interest,
                'overdue_days': overdue_days,
                'overdue_base_interest': overdue_base_interest,
                'overdue_penalty_interest': overdue_penalty_interest,
                'overdue_interest': overdue_interest,
                'total': round(total, 2),
                'days_passed': total_days,
                'overdue_months': round(overdue_days / 30.0, 2) if overdue_days > 0 else 0,
                'effective_overdue_months': 1 if overdue_days > 0 else 0,
            }
        except Exception:
            return {
                'loan_amount': float(loan_amount),
                'interest': 0,
                'overdue_days': 0,
                'overdue_base_interest': 0,
                'overdue_penalty_interest': 0,
                'overdue_interest': 0,
                'total': float(loan_amount),
                'days_passed': 0,
            }

    def _show_customers(self):
        self._clear()
        date_from, date_to = self._get_date_range(show_error=False)
        rows = self._query(
            '''SELECT c.id, c.name, c.nic, c.phone, c.job,
                      COUNT(l.id) AS total_loans,
                      SUM(CASE WHEN l.status='active' THEN 1 ELSE 0 END) AS active_loans,
                      SUM(CASE WHEN l.status='redeemed' THEN 1 ELSE 0 END) AS redeemed_loans,
                      COALESCE(SUM(l.loan_amount),0) AS total_borrowed,
                      COALESCE(SUM(CASE WHEN l.status='active' THEN l.loan_amount ELSE 0 END),0) AS active_exposure,
                      MAX(l.issue_date) AS last_loan_date
               FROM customers c
                             LEFT JOIN loans l ON c.id=l.customer_id AND date(l.issue_date) BETWEEN ? AND ?
               GROUP BY c.id
               ORDER BY active_exposure DESC, total_borrowed DESC'''
                        ,(date_from, date_to),
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
        date_from, date_to = self._get_date_range(show_error=False)

        scope = (self._gold_inventory_scope_var.get() or 'active').strip().lower()
        status_filter_sql = "AND l.status='active'" if scope == 'active' else ''

        summary_sql = f'''SELECT li.article_type, COUNT(*) AS item_count,
                COALESCE(SUM(li.quantity),0) AS total_qty,
                COALESCE(SUM(li.total_weight),0) AS total_item_weight,
                COALESCE(SUM(li.gold_weight),0) AS total_gold_weight,
                COALESCE(SUM(li.estimated_value),0) AS total_est_value,
                ROUND(AVG(li.carat), 2) AS avg_carat
            FROM loan_items li
            JOIN loans l ON li.loan_id=l.id
            WHERE date(l.issue_date) BETWEEN ? AND ?
            {status_filter_sql}
            GROUP BY li.article_type
            ORDER BY total_gold_weight DESC'''

        active_items = self._query(summary_sql, (date_from, date_to))

        detail_sql = f'''SELECT l.ticket_no, c.name AS customer_name, li.article_type,
            li.description, li.quantity, li.total_weight,
            li.gold_weight, li.carat, li.estimated_value,
            l.status AS loan_status, l.issue_date, l.updated_at,
            l.advance_amount, l.loan_amount,
            (SELECT MAX(lp.payment_date)
             FROM loan_payments lp
             WHERE lp.loan_id=l.id AND lp.payment_type='redemption') AS redeem_date
            FROM loan_items li
            JOIN loans l ON li.loan_id=l.id
            JOIN customers c ON l.customer_id=c.id
            WHERE date(l.issue_date) BETWEEN ? AND ?
            {status_filter_sql}
            ORDER BY li.id DESC'''

        item_details = self._query(detail_sql, (date_from, date_to))

        total_items = sum(int(r['item_count'] or 0) for r in active_items)
        total_gold_weight = sum(float(r['total_gold_weight'] or 0) for r in active_items)
        total_item_weight = sum(float(r['total_item_weight'] or 0) for r in active_items)
        total_est_value = sum(float(r['total_est_value'] or 0) for r in active_items)

        def _is_redeemed_in_range(row):
            loan_status = (row.get('loan_status') or '').lower()
            redeem_day = str(row.get('redeem_date') or '')[:10]
            return loan_status == 'redeemed' and bool(redeem_day) and date_from <= redeem_day <= date_to

        def _is_active_in_range(row):
            loan_status = (row.get('loan_status') or '').lower()
            redeem_day = str(row.get('redeem_date') or '')[:10]
            if loan_status == 'active':
                return True
            if loan_status == 'redeemed':
                return (not redeem_day) or (redeem_day > date_to)
            return False

        active_item_weight = sum(
            float(r.get('total_weight') or 0)
            for r in item_details
            if _is_active_in_range(r)
        )
        redeemed_item_weight = sum(
            float(r.get('total_weight') or 0)
            for r in item_details
            if _is_redeemed_in_range(r)
        )
        active_gold_weight = sum(
            float(r.get('gold_weight') or 0)
            for r in item_details
            if _is_active_in_range(r)
        )

        card = self._make_card('Gold Inventory and Article Report')

        filter_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        filter_row.pack(fill=tk.X, padx=14, pady=(0, 8))
        tk.Label(
            filter_row,
            text='Inventory Scope:',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(side=tk.LEFT)
        scope_combo = tk.OptionMenu(
            filter_row,
            self._gold_inventory_scope_var,
            'active',
            'all',
            command=lambda _v: self._show_gold_inventory(),
        )
        scope_combo.config(width=14)
        scope_combo.pack(side=tk.LEFT, padx=(8, 8))
        scope_label = 'Active Items Only' if scope == 'active' else 'All Items (Active + Redeemed + Others)'
        tk.Label(
            filter_row,
            text=scope_label,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
        ).pack(side=tk.LEFT)

        item_entry_title = 'Active Item Entries' if scope == 'active' else 'All Item Entries'
        kpi_items = [
            (item_entry_title, str(total_items), self.theme.palette.text_primary),
            ('Total Gold Weight (g)', f'{total_gold_weight:.3f}', self.theme.palette.warning),
            ('Total Item Weight (g)', f'{total_item_weight:.3f}', self.theme.palette.info),
            ('Total Estimated Value', format_currency(total_est_value), self.theme.palette.accent),
        ]
        if scope == 'all':
            kpi_items.append(('Active Item Weight (g)', f'{active_item_weight:.3f}', self.theme.palette.info))
            kpi_items.append(('Active Gold Weight (g)', f'{active_gold_weight:.3f}', self.theme.palette.success))
            kpi_items.append(('Redeemed Item Weight (g)', f'{redeemed_item_weight:.3f}', self.theme.palette.warning))

        self._render_kpis(
            card.inner,
            kpi_items,
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
            text='Item Details' if scope == 'all' else 'Active Item Details',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', padx=14, pady=(10, 6))

        detail_columns = [
            ('Ticket', 10),
            ('Customer', 12),
            ('Type', 10),
            ('Description', 16),
        ]
        if scope == 'all':
            detail_columns.extend([
                ('Issue Date', 10),
                ('Range Status', 18),
                ('Current Status', 11),
                ('Redeem Date', 11),
            ])
        else:
            detail_columns.append(('Current Status', 11))
        detail_columns.extend([
            ('Qty', 6),
            ('Item(g)', 9),
            ('Gold(g)', 9),
            ('Carat', 7),
            ('Advanced', 11),
            ('Est Value', 11),
        ])
        detail_rows = []
        for r in item_details:
            row_values = [
                r['ticket_no'],
                r['customer_name'] or '-',
                r['article_type'] or '-',
                r['description'] or '-',
            ]

            if scope == 'all':
                issue_day = str(r.get('issue_date') or '')[:10]
                status_day = str(r.get('redeem_date') or r.get('updated_at') or '')[:10]
                loan_status = (r.get('loan_status') or '').lower()
                redeem_date = str(r.get('redeem_date') or '')[:10]

                if loan_status == 'redeemed':
                    if status_day and status_day < date_from:
                        day_status = f"Redeemed before range ({status_day})"
                    elif status_day and date_from <= status_day <= date_to:
                        day_status = f"Redeemed"
                    elif status_day and status_day > date_to:
                        day_status = 'Active'
                    else:
                        day_status = 'Redeemed'
                elif loan_status == 'active':
                    day_status = 'Active'
                else:
                    day_status = f"{(r.get('loan_status') or '-').upper()}"

                row_values.extend([
                    format_date(issue_day) if issue_day else '-',
                    day_status,
                    (r.get('loan_status') or '-').upper(),
                    format_date(redeem_date) if redeem_date else '-',
                ])
            else:
                row_values.append((r.get('loan_status') or '-').upper())

            row_values.extend([
                str(r['quantity'] or 0),
                f"{float(r['total_weight'] or 0):.3f}",
                f"{float(r['gold_weight'] or 0):.3f}",
                str(r['carat'] or '-'),
                format_currency(r.get('advance_amount') if r.get('advance_amount') is not None else r.get('loan_amount', 0)),
                format_currency(r['estimated_value']),
            ])
            detail_rows.append(row_values)
        self._render_table(card.inner, detail_columns, detail_rows, ticket_col=0)

    def _show_operations(self):
        self._clear()
        date_from, date_to = self._get_date_range(show_error=False)

        approvals = self._query(
            '''SELECT status, COUNT(*) AS count
               FROM loan_approval_requests
                    WHERE date(created_at) BETWEEN ? AND ?
               GROUP BY status'''
                ,(date_from, date_to),
        )
        letters = self._query(
            '''SELECT status, COUNT(*) AS count
               FROM customer_letters
                    WHERE date(created_at) BETWEEN ? AND ?
               GROUP BY status'''
                ,(date_from, date_to),
        )
        audits = self._query(
            '''SELECT a.created_at, u.full_name AS user_name, a.action,
                      a.entity_type, a.entity_id
               FROM audit_log a
               LEFT JOIN users u ON a.user_id=u.id
                    WHERE date(a.created_at) BETWEEN ? AND ?
               ORDER BY a.id DESC'''
                ,(date_from, date_to),
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
