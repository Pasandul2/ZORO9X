"""Cash Management page — track daily cash flow, opening/closing balances, and owner transactions."""

import tkinter as tk
from tkinter import messagebox, ttk, filedialog
from datetime import datetime, timedelta
import csv
import io

from database import (
    get_setting,
    set_setting,
    add_cash_transaction,
    get_cash_transactions,
    get_cash_transactions_range,
    get_cash_summary,
    get_cash_balance,
    get_cash_balance_for_date,
    get_owner_transactions_summary,
)


class CashManagementPage:
    """Cash Management — 3 tabs: Day Overview, All Transactions, Owner Transactions."""

    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        pal = self.theme.palette

        view = tk.Frame(self.container, bg=pal.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # ── Header ──
        hdr = tk.Frame(view, bg=pal.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 8))
        tk.Label(hdr, text='💰 Cash Management', font=self.theme.fonts.h1,
                 bg=pal.bg_app, fg=pal.text_primary).pack(side=tk.LEFT)

        self.balance_var = tk.StringVar(value='Balance: Rs. 0.00')
        tk.Label(hdr, textvariable=self.balance_var, font=self.theme.fonts.h2,
                 bg=pal.bg_app, fg=pal.accent).pack(side=tk.RIGHT)

        # ── Date filter bar ──
        filter_bar = tk.Frame(view, bg=pal.bg_surface_alt,
                              highlightthickness=1, highlightbackground=pal.border)
        filter_bar.pack(fill=tk.X, pady=(0, 8))

        inner = tk.Frame(filter_bar, bg=pal.bg_surface_alt)
        inner.pack(fill=tk.X, padx=12, pady=8)

        tk.Label(inner, text='📅  Date:', font=self.theme.fonts.body_bold,
                 bg=pal.bg_surface_alt, fg=pal.text_primary).pack(side=tk.LEFT)

        self.date_var = tk.StringVar(value=datetime.now().strftime('%Y-%m-%d'))
        date_entry = self.theme.make_entry(inner, variable=self.date_var, width=14)
        date_entry.pack(side=tk.LEFT, padx=(6, 4))

        def _quick_date(days_offset):
            d = (datetime.now() + timedelta(days=days_offset)).strftime('%Y-%m-%d')
            self.date_var.set(d)
            self._refresh_view()

        self.theme.make_button(inner, text='Today', command=lambda: _quick_date(0),
                               kind='ghost', width=8, pady=4).pack(side=tk.LEFT, padx=2)
        self.theme.make_button(inner, text='Yesterday', command=lambda: _quick_date(-1),
                               kind='ghost', width=10, pady=4).pack(side=tk.LEFT, padx=2)
        self.theme.make_button(inner, text='↻', command=self._refresh_view,
                               kind='ghost', width=4, pady=4).pack(side=tk.LEFT, padx=2)

        # ── Action buttons ──
        action_row = tk.Frame(view, bg=pal.bg_app)
        action_row.pack(fill=tk.X, pady=(0, 8))

        self.theme.make_button(action_row, text='💰  Record Opening Balance',
                               command=self._record_opening_balance,
                               kind='primary', width=22, pady=6).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(action_row, text='🏦  Owner Adds Money',
                               command=self._owner_add_money,
                               kind='secondary', width=20, pady=6).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(action_row, text='🏦  Owner Takes Money',
                               command=self._owner_take_money,
                               kind='danger', width=20, pady=6).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(action_row, text='📤  Export Report',
                               command=self._export_full_report,
                               kind='ghost', width=16, pady=6).pack(side=tk.RIGHT, padx=(0, 6))

        # ── Notebook tabs ──
        style = ttk.Style()
        style.theme_use('default')
        style.configure('Cash.TNotebook', background=pal.bg_app, borderwidth=0)
        style.configure('Cash.TNotebook.Tab', background=pal.bg_surface_alt,
                        foreground=pal.text_muted, padding=(14, 6),
                        font=('Segoe UI', 9, 'bold'), borderwidth=0)
        style.map('Cash.TNotebook.Tab', background=[('selected', pal.bg_surface)],
                  foreground=[('selected', pal.accent)],
                  borderwidth=[('selected', 0)])

        notebook = ttk.Notebook(view, style='Cash.TNotebook')
        notebook.pack(fill=tk.BOTH, expand=True)

        tab_overview = tk.Frame(notebook, bg=pal.bg_app)
        tab_transactions = tk.Frame(notebook, bg=pal.bg_app)
        tab_owner = tk.Frame(notebook, bg=pal.bg_app)

        notebook.add(tab_overview, text='📊  Day Overview')
        notebook.add(tab_transactions, text='📋  All Transactions')
        notebook.add(tab_owner, text='👤  Owner Transactions')

        self._build_overview_tab(tab_overview)
        self._build_transactions_tab(tab_transactions)
        self._build_owner_tab(tab_owner)

        self._refresh_view()

    # ══════════════════════════════════════════════════════════════════════
    # TAB 1 — Day Overview
    # ══════════════════════════════════════════════════════════════════════

    def _build_overview_tab(self, parent):
        pal = self.theme.palette

        # Scrollable container
        canvas = tk.Canvas(parent, bg=pal.bg_app, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(parent, orient=tk.VERTICAL, command=canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.overview_inner = tk.Frame(canvas, bg=pal.bg_app)
        win = canvas.create_window((0, 0), window=self.overview_inner, anchor='nw')
        self.overview_inner.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

    def _refresh_overview(self, date_str):
        pal = self.theme.palette
        for w in self.overview_inner.winfo_children():
            w.destroy()

        summary = get_cash_summary(date_str)
        today_txns = get_cash_transactions(transaction_date=date_str, limit=100)

        # ── Summary Cards ──
        cards = tk.Frame(self.overview_inner, bg=pal.bg_app)
        cards.pack(fill=tk.X, pady=(0, 12))

        card_data = [
            ('Opening Balance', f'Rs. {summary["opening"]:,.2f}', pal.text_primary, '🏁'),
            ('Total In Today', f'Rs. {summary["total_in"]:,.2f}', '#10b981', '📈'),
            ('Total Out Today', f'Rs. {summary["total_out"]:,.2f}', '#ef4444', '📉'),
            ('Closing Balance', f'Rs. {summary["closing"]:,.2f}', pal.accent, '💰'),
        ]
        for i, (title, value, color, icon) in enumerate(card_data):
            card = self.theme.make_card(cards, bg=pal.bg_surface, border=pal.border)
            card.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
            tk.Label(card.inner, text=f'{icon}  {title}', font=self.theme.fonts.small,
                     bg=pal.bg_surface, fg=pal.text_muted).pack(anchor='w', padx=10, pady=(8, 2))
            tk.Label(card.inner, text=value, font=('Segoe UI', 18, 'bold'),
                     bg=pal.bg_surface, fg=color).pack(anchor='w', padx=10, pady=(0, 8))

        # ── Today's Transactions ──
        tk.Label(self.overview_inner, text=f'📋  Today\'s Transactions ({len(today_txns)})',
                 font=self.theme.fonts.h3, bg=pal.bg_app,
                 fg=pal.text_primary).pack(anchor='w', pady=(0, 6))

        if not today_txns:
            tk.Label(self.overview_inner, text='No transactions for this day.',
                     font=self.theme.fonts.body, bg=pal.bg_app,
                     fg=pal.text_muted).pack(anchor='w', padx=10, pady=10)
            return

        # Treeview
        tree_frame = tk.Frame(self.overview_inner, bg=pal.bg_app)
        tree_frame.pack(fill=tk.BOTH, expand=True)

        columns = ('id', 'type', 'description', 'amount', 'balance', 'by', 'time')
        tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=12)
        tree.heading('id', text='#')
        tree.heading('type', text='Type')
        tree.heading('description', text='Description')
        tree.heading('amount', text='Amount (Rs.)')
        tree.heading('balance', text='Balance (Rs.)')
        tree.heading('by', text='Created By')
        tree.heading('time', text='Time')

        tree.column('id', width=40, anchor='center')
        tree.column('type', width=140, anchor='w')
        tree.column('description', width=250, anchor='w')
        tree.column('amount', width=110, anchor='e')
        tree.column('balance', width=110, anchor='e')
        tree.column('by', width=100, anchor='w')
        tree.column('time', width=80, anchor='center')

        vbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        tree.pack(fill=tk.BOTH, expand=True)

        type_labels = {
            'opening_balance': 'Opening Balance',
            'loan_disbursement': 'Loan Disbursement',
            'loan_payment': 'Loan Payment',
            'interest_income': 'Interest Income',
            'expense': 'Expense',
            'owner_deposit': 'Owner Deposit',
            'owner_withdrawal': 'Owner Withdrawal',
            'other_in': 'Other Income',
            'other_out': 'Other Expense',
        }

        for txn in today_txns:
            ttype = type_labels.get(txn['transaction_type'], txn['transaction_type'].replace('_', ' ').title())
            tree.insert('', tk.END, values=(
                txn['id'],
                ttype,
                txn.get('description', '') or '',
                f"{txn['amount']:,.2f}",
                f"{txn['balance_after']:,.2f}",
                txn.get('created_by_name', '') or '',
                str(txn.get('created_at', ''))[-8:] if txn.get('created_at') else '',
            ))

    # ══════════════════════════════════════════════════════════════════════
    # TAB 2 — All Transactions
    # ══════════════════════════════════════════════════════════════════════

    def _build_transactions_tab(self, parent):
        pal = self.theme.palette

        # Filter row
        filter_row = tk.Frame(parent, bg=pal.bg_app)
        filter_row.pack(fill=tk.X, pady=(0, 8))

        tk.Label(filter_row, text='From:', font=self.theme.fonts.body_bold,
                 bg=pal.bg_app, fg=pal.text_primary).pack(side=tk.LEFT)
        self.txn_from_var = tk.StringVar(value=(datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d'))
        self.theme.make_entry(filter_row, variable=self.txn_from_var, width=12).pack(side=tk.LEFT, padx=(4, 8))

        tk.Label(filter_row, text='To:', font=self.theme.fonts.body_bold,
                 bg=pal.bg_app, fg=pal.text_primary).pack(side=tk.LEFT)
        self.txn_to_var = tk.StringVar(value=datetime.now().strftime('%Y-%m-%d'))
        self.theme.make_entry(filter_row, variable=self.txn_to_var, width=12).pack(side=tk.LEFT, padx=(4, 8))

        tk.Label(filter_row, text='Type:', font=self.theme.fonts.body_bold,
                 bg=pal.bg_app, fg=pal.text_primary).pack(side=tk.LEFT, padx=(8, 4))
        self.txn_type_var = tk.StringVar(value='All')
        type_values = ['All', 'opening_balance', 'loan_disbursement', 'loan_payment',
                       'interest_income', 'expense', 'owner_deposit', 'owner_withdrawal',
                       'other_in', 'other_out']
        combo = self.theme.make_combobox(filter_row, variable=self.txn_type_var, values=type_values, width=16)
        combo.pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(filter_row, 'Search', self._refresh_transactions,
                               kind='primary', width=10, pady=4).pack(side=tk.LEFT)
        self.theme.make_button(filter_row, 'Export', self._export_transactions,
                               kind='ghost', width=10, pady=4).pack(side=tk.LEFT, padx=(4, 0))

        self.txn_count_var = tk.StringVar(value='')
        tk.Label(filter_row, textvariable=self.txn_count_var, font=self.theme.fonts.small,
                 bg=pal.bg_app, fg=pal.text_muted).pack(side=tk.RIGHT)

        # Tree
        tree_frame = tk.Frame(parent, bg=pal.bg_app)
        tree_frame.pack(fill=tk.BOTH, expand=True)

        columns = ('id', 'date', 'type', 'description', 'amount', 'balance', 'by')
        self.txn_tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=16)
        self.txn_tree.heading('id', text='#')
        self.txn_tree.heading('date', text='Date')
        self.txn_tree.heading('type', text='Type')
        self.txn_tree.heading('description', text='Description')
        self.txn_tree.heading('amount', text='Amount (Rs.)')
        self.txn_tree.heading('balance', text='Balance (Rs.)')
        self.txn_tree.heading('by', text='Created By')

        self.txn_tree.column('id', width=40, anchor='center')
        self.txn_tree.column('date', width=100, anchor='center')
        self.txn_tree.column('type', width=140, anchor='w')
        self.txn_tree.column('description', width=300, anchor='w')
        self.txn_tree.column('amount', width=110, anchor='e')
        self.txn_tree.column('balance', width=110, anchor='e')
        self.txn_tree.column('by', width=100, anchor='w')

        vbar = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=self.txn_tree.yview)
        self.txn_tree.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.txn_tree.pack(fill=tk.BOTH, expand=True)

    def _refresh_transactions(self):
        for item in self.txn_tree.get_children():
            self.txn_tree.delete(item)

        from_date = self.txn_from_var.get().strip()
        to_date = self.txn_to_var.get().strip()
        ttype = self.txn_type_var.get().strip()
        if ttype == 'All':
            ttype = ''

        txns = get_cash_transactions_range(from_date, to_date, transaction_type=ttype, limit=1000)

        type_labels = {
            'opening_balance': 'Opening Balance',
            'loan_disbursement': 'Loan Disbursement',
            'loan_payment': 'Loan Payment',
            'interest_income': 'Interest Income',
            'expense': 'Expense',
            'owner_deposit': 'Owner Deposit',
            'owner_withdrawal': 'Owner Withdrawal',
            'other_in': 'Other Income',
            'other_out': 'Other Expense',
        }

        for txn in txns:
            ttype_lbl = type_labels.get(txn['transaction_type'], txn['transaction_type'].replace('_', ' ').title())
            self.txn_tree.insert('', tk.END, values=(
                txn['id'],
                txn.get('transaction_date', ''),
                ttype_lbl,
                txn.get('description', '') or '',
                f"{txn['amount']:,.2f}",
                f"{txn['balance_after']:,.2f}",
                txn.get('created_by_name', '') or '',
            ))

        self.txn_count_var.set(f'{len(txns)} transactions')

    def _export_transactions(self):
        """Export visible transactions as CSV."""
        rows = self.txn_tree.get_children()
        if not rows:
            messagebox.showinfo('Export', 'No transactions to export.')
            return
        import csv, io
        from tkinter import filedialog
        path = filedialog.asksaveasfilename(
            title='Export Transactions as CSV',
            defaultextension='.csv',
            filetypes=[('CSV Files', '*.csv')]
        )
        if not path:
            return
        try:
            with open(path, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(['ID', 'Date', 'Type', 'Description', 'Amount (Rs.)', 'Balance (Rs.)', 'Created By'])
                for row_id in rows:
                    vals = self.txn_tree.item(row_id, 'values')
                    writer.writerow(vals)
            messagebox.showinfo('Export', f'Exported {len(rows)} transactions to:\n{path}')
        except Exception as e:
            messagebox.showerror('Export Error', str(e))

    # ══════════════════════════════════════════════════════════════════════
    # TAB 3 — Owner Transactions
    # ══════════════════════════════════════════════════════════════════════

    def _build_owner_tab(self, parent):
        pal = self.theme.palette

        scroll_canvas = tk.Canvas(parent, bg=pal.bg_app, highlightthickness=0, bd=0)
        vbar = ttk.Scrollbar(parent, orient=tk.VERTICAL, command=scroll_canvas.yview)
        scroll_canvas.configure(yscrollcommand=vbar.set)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)
        scroll_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

        self.owner_inner = tk.Frame(scroll_canvas, bg=pal.bg_app)
        win = scroll_canvas.create_window((0, 0), window=self.owner_inner, anchor='nw')
        self.owner_inner.bind('<Configure>', lambda _: scroll_canvas.configure(scrollregion=scroll_canvas.bbox('all')))
        scroll_canvas.bind('<Configure>', lambda e: scroll_canvas.itemconfigure(win, width=e.width))

    def _refresh_owner(self):
        pal = self.theme.palette
        for w in self.owner_inner.winfo_children():
            w.destroy()

        date_str = self.date_var.get().strip() or datetime.now().strftime('%Y-%m-%d')
        summary = get_owner_transactions_summary(date_str=date_str)

        # Summary cards
        cards = tk.Frame(self.owner_inner, bg=pal.bg_app)
        cards.pack(fill=tk.X, pady=(0, 12))

        card_items = [
            ('🏦 Total Owner Deposits', f'Rs. {summary["total_deposits"]:,.2f}', '#10b981'),
            ('🏦 Total Owner Withdrawals', f'Rs. {summary["total_withdrawals"]:,.2f}', '#ef4444'),
            ('💰 Net Owner Balance', f'Rs. {summary["net"]:,.2f}', pal.accent),
        ]
        for i, (title, value, color) in enumerate(card_items):
            card = self.theme.make_card(cards, bg=pal.bg_surface, border=pal.border)
            card.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
            tk.Label(card.inner, text=title, font=self.theme.fonts.small,
                     bg=pal.bg_surface, fg=pal.text_muted).pack(anchor='w', padx=10, pady=(8, 2))
            tk.Label(card.inner, text=value, font=('Segoe UI', 18, 'bold'),
                     bg=pal.bg_surface, fg=color).pack(anchor='w', padx=10, pady=(0, 8))

        # Owner transactions list
        tk.Label(self.owner_inner, text='📋  Owner Transaction History',
                 font=self.theme.fonts.h3, bg=pal.bg_app,
                 fg=pal.text_primary).pack(anchor='w', pady=(0, 6))

        owner_txns = get_cash_transactions_range(
            date_str, date_str,
            transaction_type='', limit=500
        )
        owner_txns = [t for t in owner_txns if t['transaction_type'] in ('owner_deposit', 'owner_withdrawal')]

        if not owner_txns:
            tk.Label(self.owner_inner, text='No owner transactions yet.',
                     font=self.theme.fonts.body, bg=pal.bg_app,
                     fg=pal.text_muted).pack(anchor='w', padx=10, pady=10)
            return

        tree_frame = tk.Frame(self.owner_inner, bg=pal.bg_app)
        tree_frame.pack(fill=tk.BOTH, expand=True)

        columns = ('id', 'date', 'type', 'description', 'amount', 'balance', 'by')
        tree = ttk.Treeview(tree_frame, columns=columns, show='headings', height=14)
        tree.heading('id', text='#')
        tree.heading('date', text='Date')
        tree.heading('type', text='Type')
        tree.heading('description', text='Description')
        tree.heading('amount', text='Amount (Rs.)')
        tree.heading('balance', text='Balance (Rs.)')
        tree.heading('by', text='Created By')

        tree.column('id', width=40, anchor='center')
        tree.column('date', width=100, anchor='center')
        tree.column('type', width=140, anchor='w')
        tree.column('description', width=300, anchor='w')
        tree.column('amount', width=110, anchor='e')
        tree.column('balance', width=110, anchor='e')
        tree.column('by', width=100, anchor='w')

        vbar_tree = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=vbar_tree.set)
        vbar_tree.pack(side=tk.RIGHT, fill=tk.Y)
        tree.pack(fill=tk.BOTH, expand=True)

        type_labels = {'owner_deposit': '💰 Owner Deposit', 'owner_withdrawal': '🏧 Owner Withdrawal'}
        for txn in owner_txns:
            ttype = type_labels.get(txn['transaction_type'], txn['transaction_type'])
            tree.insert('', tk.END, values=(
                txn['id'],
                txn.get('transaction_date', ''),
                ttype,
                txn.get('description', '') or '',
                f"{txn['amount']:,.2f}",
                f"{txn['balance_after']:,.2f}",
                txn.get('created_by_name', '') or '',
            ))

    # ══════════════════════════════════════════════════════════════════════
    # Dialogs
    # ══════════════════════════════════════════════════════════════════════

    def _record_opening_balance(self):
        dialog = tk.Toplevel(self.container)
        dialog.title('Record Opening Balance')
        dialog.geometry('400x260')
        dialog.resizable(False, False)
        dialog.configure(bg=self.theme.palette.bg_surface)
        dialog.transient(self.container)
        dialog.grab_set()

        main = tk.Frame(dialog, bg=dialog['bg'])
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(main, text='💰  Set Opening Cash Balance', font=('Segoe UI', 12, 'bold'),
                 bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))
        tk.Label(main, text='Enter the amount of cash in the drawer to start the day.',
                 font=('Segoe UI', 9), bg=dialog['bg'],
                 fg=self.theme.palette.text_muted).pack(anchor='w', pady=(0, 10))

        tk.Label(main, text='Amount (Rs.):', font=('Segoe UI', 9, 'bold'),
                 bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(anchor='w')
        amt_var = tk.StringVar(value='0')
        entry = self.theme.make_entry(main, variable=amt_var, width=20)
        entry.pack(fill=tk.X, pady=(4, 16))

        btn_row = tk.Frame(main, bg=dialog['bg'])
        btn_row.pack(fill=tk.X)

        def save():
            try:
                amount = float(amt_var.get().strip())
                if amount < 0:
                    messagebox.showerror('Error', 'Amount cannot be negative.', parent=dialog)
                    return
            except ValueError:
                messagebox.showerror('Error', 'Invalid amount.', parent=dialog)
                return

            date_str = self.date_var.get().strip()
            add_cash_transaction(
                transaction_date=date_str,
                transaction_type='opening_balance',
                amount=amount,
                description=f'Opening cash balance for {date_str}',
                balance_after=amount,
                reference_type='cash_register',
                created_by=self.user['id'],
            )
            dialog.destroy()
            self._refresh_view()
            messagebox.showinfo('Success', f'Opening balance of Rs. {amount:,.2f} recorded for {date_str}.')

        self.theme.make_button(btn_row, 'Save', save, kind='primary', width=12).pack(side=tk.RIGHT)
        self.theme.make_button(btn_row, 'Cancel', dialog.destroy, kind='ghost', width=12).pack(side=tk.RIGHT, padx=(0, 8))

    def _owner_add_money(self):
        self._owner_money_dialog('owner_deposit', '🏦  Owner Adds Money to Business',
                                 'Enter the amount the owner is adding to the business cash.')

    def _owner_take_money(self):
        self._owner_money_dialog('owner_withdrawal', '🏦  Owner Takes Money from Business',
                                 'Enter the amount the owner is taking from the business cash.\nIs this money taken for business use or personal?')

    def _owner_money_dialog(self, ttype, title, desc):
        dialog = tk.Toplevel(self.container)
        dialog.title(title.split('  ')[-1])
        dialog.geometry('440x420')
        dialog.resizable(False, False)
        dialog.configure(bg=self.theme.palette.bg_surface)
        dialog.transient(self.container)
        dialog.grab_set()

        main = tk.Frame(dialog, bg=dialog['bg'])
        main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

        tk.Label(main, text=title, font=('Segoe UI', 12, 'bold'),
                 bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))
        tk.Label(main, text=desc, font=('Segoe UI', 9), bg=dialog['bg'],
                 fg=self.theme.palette.text_muted, wraplength=380).pack(anchor='w', pady=(0, 10))

        tk.Label(main, text='Amount (Rs.):', font=('Segoe UI', 9, 'bold'),
                 bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(anchor='w')
        amt_var = tk.StringVar(value='0')
        entry = self.theme.make_entry(main, variable=amt_var, width=20)
        entry.pack(fill=tk.X, pady=(4, 6))

        tk.Label(main, text='Description / Reason:', font=('Segoe UI', 9, 'bold'),
                 bg=dialog['bg'], fg=self.theme.palette.text_primary).pack(anchor='w')
        desc_var = tk.StringVar()
        desc_entry = self.theme.make_entry(main, variable=desc_var, width=20)
        desc_entry.pack(fill=tk.X, pady=(4, 12))

        # For withdrawals, ask if it's for business
        purpose_var = tk.StringVar(value='yes')
        if ttype == 'owner_withdrawal':
            purpose_frame = tk.Frame(main, bg=dialog['bg'])
            purpose_frame.pack(fill=tk.X, pady=(0, 10))
            tk.Label(purpose_frame, text='Is this for business use?',
                     font=('Segoe UI', 9, 'bold'), bg=dialog['bg'],
                     fg=self.theme.palette.text_primary).pack(anchor='w')
            rb_frame = tk.Frame(purpose_frame, bg=dialog['bg'])
            rb_frame.pack(anchor='w', pady=(2, 0))
            tk.Radiobutton(rb_frame, text='✅ Yes — Business expense', variable=purpose_var, value='yes',
                           bg=dialog['bg'], fg=self.theme.palette.text_primary,
                           selectcolor=dialog['bg'], font=('Segoe UI', 9)).pack(side=tk.LEFT, padx=(0, 12))
            tk.Radiobutton(rb_frame, text='❌ No — Owner personal', variable=purpose_var, value='no',
                           bg=dialog['bg'], fg=self.theme.palette.text_primary,
                           selectcolor=dialog['bg'], font=('Segoe UI', 9)).pack(side=tk.LEFT)

        btn_row = tk.Frame(main, bg=dialog['bg'])
        btn_row.pack(fill=tk.X)

        def save():
            try:
                amount = float(amt_var.get().strip())
                if amount <= 0:
                    messagebox.showerror('Error', 'Amount must be positive.', parent=dialog)
                    return
            except ValueError:
                messagebox.showerror('Error', 'Invalid amount.', parent=dialog)
                return

            date_str = self.date_var.get().strip()
            desc_text = desc_var.get().strip()

            if ttype == 'owner_withdrawal':
                purpose = purpose_var.get()
                if purpose == 'yes':
                    desc_text = f'Owner took money for business: {desc_text}' if desc_text else 'Owner took money for business use'
                else:
                    desc_text = f'Owner personal withdrawal: {desc_text}' if desc_text else 'Owner personal withdrawal'

            balance_before = get_cash_balance(as_of_date=date_str)
            if ttype == 'owner_withdrawal':
                # Check sufficient balance
                if balance_before < amount:
                    if not messagebox.askyesno('Low Balance',
                                               f'Current balance is Rs. {balance_before:,.2f}. '
                                               f'Withdrawing Rs. {amount:,.2f} may overdraw. Continue?',
                                               parent=dialog):
                        return
                balance_after = balance_before - amount
            else:
                balance_after = balance_before + amount

            add_cash_transaction(
                transaction_date=date_str,
                transaction_type=ttype,
                amount=amount,
                description=desc_text or f'Owner {"deposit" if ttype == "owner_deposit" else "withdrawal"}',
                balance_after=balance_after,
                reference_type='owner',
                created_by=self.user['id'],
            )
            dialog.destroy()
            self._refresh_view()
            verb = 'added to' if ttype == 'owner_deposit' else 'taken from'
            messagebox.showinfo('Success', f'Rs. {amount:,.2f} {verb} business cash.')

        self.theme.make_button(btn_row, 'Save', save, kind='primary', width=12).pack(side=tk.RIGHT)
        self.theme.make_button(btn_row, 'Cancel', dialog.destroy, kind='ghost', width=12).pack(side=tk.RIGHT, padx=(0, 8))

    # ══════════════════════════════════════════════════════════════════════
    # Refresh
    # ══════════════════════════════════════════════════════════════════════

    def _refresh_view(self):
        date_str = self.date_var.get().strip()
        if not date_str:
            date_str = datetime.now().strftime('%Y-%m-%d')

        # Update header balance — show only this day's closing balance (0 if no transactions today)
        balance = get_cash_balance_for_date(date_str)
        self.balance_var.set(f'Balance: Rs. {balance:,.2f}')

        self._refresh_overview(date_str)
        self._refresh_transactions()
        self._refresh_owner()

    # ══════════════════════════════════════════════════════════════════════
    # Export
    # ══════════════════════════════════════════════════════════════════════

    def _export_full_report(self):
        """Export a comprehensive report for the selected date range."""
        from_date = self.date_var.get().strip()
        to_date = from_date  # Default to same day
        # If there's a range in the All Transactions tab, use that
        try:
            txn_from = self.txn_from_var.get().strip()
            txn_to = self.txn_to_var.get().strip()
            if txn_from and txn_to:
                from_date = txn_from
                to_date = txn_to
        except AttributeError:
            pass

        path = filedialog.asksaveasfilename(
            title='Export Cash Report as CSV',
            defaultextension='.csv',
            filetypes=[('CSV Files', '*.csv')]
        )
        if not path:
            return

        try:
            txns = get_cash_transactions_range(from_date, to_date, limit=2000)
            summary = {'opening': 0, 'total_in': 0, 'total_out': 0, 'closing': 0}

            with open(path, 'w', newline='', encoding='utf-8-sig') as f:
                writer = csv.writer(f)
                writer.writerow(['💰 CASH MANAGEMENT REPORT'])
                writer.writerow([f'Period: {from_date} to {to_date}'])
                writer.writerow([f'Generated: {datetime.now().strftime("%Y-%m-%d %H:%M")}'])
                writer.writerow([])

                # Summary section
                if txns:
                    # Calculate summary
                    balance = 0
                    for t in txns:
                        if t['transaction_type'] in ('opening_balance', 'owner_deposit', 'loan_payment', 'interest_income', 'other_in'):
                            balance = float(t['balance_after'])
                        elif t['transaction_type'] in ('loan_disbursement', 'owner_withdrawal', 'expense', 'other_out'):
                            balance = float(t['balance_after'])
                    # Get summary per date
                    from database import get_cash_summary
                    dates = sorted(set(t['transaction_date'] for t in txns))
                    for d in dates:
                        s = get_cash_summary(d)
                        summary['total_in'] += s['total_in']
                        summary['total_out'] += s['total_out']
                    summary['closing'] = float(txns[0]['balance_after']) if txns else 0

                writer.writerow(['SUMMARY'])
                writer.writerow(['Total In (Rs.)', f"{summary['total_in']:,.2f}"])
                writer.writerow(['Total Out (Rs.)', f"{summary['total_out']:,.2f}"])
                writer.writerow(['Closing Balance (Rs.)', f"{summary['closing']:,.2f}"])
                writer.writerow([])

                # Transaction details
                writer.writerow(['ID', 'Date', 'Type', 'Description', 'Amount (Rs.)', 'Balance After (Rs.)', 'Created By', 'Created At'])
                type_labels = {
                    'opening_balance': 'Opening Balance',
                    'loan_disbursement': 'Loan Disbursement',
                    'loan_payment': 'Loan Payment',
                    'interest_income': 'Interest Income',
                    'expense': 'Expense',
                    'owner_deposit': 'Owner Deposit',
                    'owner_withdrawal': 'Owner Withdrawal',
                    'other_in': 'Other Income',
                    'other_out': 'Other Expense',
                }
                for t in txns:
                    writer.writerow([
                        t['id'],
                        t.get('transaction_date', ''),
                        type_labels.get(t['transaction_type'], t['transaction_type']),
                        t.get('description', '') or '',
                        f"{t['amount']:,.2f}",
                        f"{t['balance_after']:,.2f}",
                        t.get('created_by_name', '') or '',
                        t.get('created_at', '') or '',
                    ])

            messagebox.showinfo('Export Successful', f'Report exported to:\n{path}\n\n{len(txns)} transactions.')
        except Exception as e:
            messagebox.showerror('Export Error', str(e))


# ── Popup: Morning Cash Entry ─────────────────────────────────────────────

def show_morning_cash_popup(parent_window, theme, user, db_file=None):
    """Show the morning cash entry popup if enabled in settings."""
    from database import get_setting, set_setting, add_cash_transaction, get_cash_balance
    from datetime import datetime

    enabled = get_setting('cash_management_enabled', '0', db_path=db_file) == '1'
    if not enabled:
        return

    mode = get_setting('cash_management_popup_mode', 'daily', db_path=db_file)
    today = datetime.now().strftime('%Y-%m-%d')

    if mode == 'daily':
        last_date = get_setting('cash_management_last_date', '', db_path=db_file)
        if last_date == today:
            return  # Already shown today
    # For 'startup' mode, always show (no date check)

    # Check if there's already an opening_balance entry today
    from database import get_cash_transactions
    today_txns = get_cash_transactions(transaction_date=today, db_path=db_file)
    for t in today_txns:
        if t['transaction_type'] == 'opening_balance':
            # Opening balance already recorded, just mark and return
            if mode == 'daily':
                set_setting('cash_management_last_date', today, db_path=db_file)
            return

    # Show popup
    dialog = tk.Toplevel(parent_window)
    dialog.title('💰 Morning Cash – Opening Balance')
    dialog.geometry('420x240')
    dialog.resizable(False, False)
    dialog.configure(bg=theme.palette.bg_surface)
    dialog.transient(parent_window)
    dialog.grab_set()

    # Center
    dialog.update_idletasks()
    x = parent_window.winfo_rootx() + (parent_window.winfo_width() - dialog.winfo_width()) // 2
    y = parent_window.winfo_rooty() + (parent_window.winfo_height() - dialog.winfo_height()) // 2
    dialog.geometry(f'+{x}+{y}')

    main = tk.Frame(dialog, bg=dialog['bg'])
    main.pack(fill=tk.BOTH, expand=True, padx=20, pady=20)

    tk.Label(main, text='💰  Good Morning!', font=('Segoe UI', 16, 'bold'),
             bg=dialog['bg'], fg=theme.palette.accent).pack(anchor='w')
    tk.Label(main, text=f'Set the opening cash balance for {today}',
             font=('Segoe UI', 10), bg=dialog['bg'],
             fg=theme.palette.text_muted).pack(anchor='w', pady=(0, 12))

    tk.Label(main, text='Cash in Drawer (Rs.):', font=('Segoe UI', 10, 'bold'),
             bg=dialog['bg'], fg=theme.palette.text_primary).pack(anchor='w')
    amt_var = tk.StringVar(value='0')
    entry = tk.Entry(main, textvariable=amt_var, font=('Segoe UI', 12),
                     bg=theme.palette.bg_input, fg=theme.palette.text_primary,
                     relief='flat', highlightthickness=1,
                     highlightbackground=theme.palette.border,
                     highlightcolor=theme.palette.accent)
    entry.pack(fill=tk.X, ipady=6, pady=(4, 16))
    entry.focus_set()
    entry.select_range(0, tk.END)

    def save():
        try:
            amount = float(amt_var.get().strip())
            if amount < 0:
                messagebox.showerror('Error', 'Amount cannot be negative.', parent=dialog)
                return
        except ValueError:
            messagebox.showerror('Error', 'Please enter a valid number.', parent=dialog)
            return

        # Record opening balance
        add_cash_transaction(
            transaction_date=today,
            transaction_type='opening_balance',
            amount=amount,
            description=f'Opening cash balance for {today}',
            balance_after=amount,
            reference_type='cash_register',
            created_by=user['id'],
            db_path=db_file,
        )

        if mode == 'daily':
            set_setting('cash_management_last_date', today, db_path=db_file)

        dialog.destroy()

    def skip():
        if mode == 'daily':
            set_setting('cash_management_last_date', today, db_path=db_file)
        dialog.destroy()

    btn_row = tk.Frame(main, bg=dialog['bg'])
    btn_row.pack(fill=tk.X)

    theme.make_button(btn_row, 'Save', save, kind='primary', width=12, pady=6).pack(side=tk.RIGHT, padx=(4, 0))
    theme.make_button(btn_row, 'Skip', skip, kind='ghost', width=8, pady=6).pack(side=tk.RIGHT)
