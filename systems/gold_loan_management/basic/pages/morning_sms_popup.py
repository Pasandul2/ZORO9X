"""Morning SMS Popup — shown once per day on first launch.
Lists pending monthly loan reminders and birthday wishes.
User can check/uncheck each, then Send Selected or Skip.
Failed sends are logged via log_sms_message (status='failed') → visible in SMS Center > Failed tab.
"""

import tkinter as tk
from tkinter import ttk, messagebox
from datetime import datetime
import threading

from database import (
    get_setting,
    set_setting,
    get_due_reminder_loans,
    get_due_birthday_customers,
    mark_reminder_sent,
    mark_birthday_wish_sent,
    get_wished_customer_ids_this_year,
    list_sms_templates,
    log_sms_message,
)
from sms_service import build_sms_context, render_template, send_sms


def _should_show_today(db_path=None):
    today = datetime.now().strftime('%Y-%m-%d')
    last = get_setting('sms_morning_popup_last_date', '', db_path=db_path)
    return last != today


def _mark_shown_today(db_path=None):
    today = datetime.now().strftime('%Y-%m-%d')
    set_setting('sms_morning_popup_last_date', today, db_path=db_path)


def show_morning_sms_popup(root, theme, user, db_path=None):
    """Entry point — call from gold_loan_app after morning cash popup."""
    if not _should_show_today(db_path):
        return

    sms_enabled = get_setting('sms_enabled', '0', db_path=db_path) == '1'
    if not sms_enabled:
        _mark_shown_today(db_path)
        return

    reminders = get_due_reminder_loans(db_path=db_path)
    birthdays = get_due_birthday_customers(db_path=db_path)

    if not reminders and not birthdays:
        _mark_shown_today(db_path)
        return

    _mark_shown_today(db_path)
    _MorningSmsPopup(root, theme, user, reminders, birthdays, db_path)


def show_sms_reminders_popup(root, theme, user, db_path=None):
    """Open the popup on demand (no daily guard) — called from SMS Center button."""
    reminders = get_due_reminder_loans(db_path=db_path)
    birthdays = get_due_birthday_customers(db_path=db_path)

    if not reminders and not birthdays:
        from tkinter import messagebox
        messagebox.showinfo('All Clear', 'No pending reminders or birthday wishes for today.')
        return

    _MorningSmsPopup(root, theme, user, reminders, birthdays, db_path)


class _MorningSmsPopup:
    def __init__(self, root, theme, user, reminders, birthdays, db_path):
        self.root = root
        self.theme = theme
        self.user = user
        self.reminders = reminders
        self.birthdays = birthdays
        self.db_path = db_path
        self.pal = theme.palette

        # Load templates once
        templates = {t['category']: t['body'] for t in list_sms_templates(db_path=db_path)}
        self.reminder_tpl = templates.get(
            'auto_reminder',
            'Dear {{customer_name}},\n\nThis is a reminder that your gold loan {{ticket_no}} is due for renewal.\n\nExpiry: {{expire_date}}\nAmount: Rs. {{loan_amount}}\n\nPlease visit us soon.\n{{company_name}}'
        )
        self.birthday_tpl = templates.get(
            'birthday',
            'Dear {{customer_name}},\n\nWishing you a very Happy Birthday! 🎂🎉\n\nWarm wishes,\n{{company_name}}'
        )

        self._build()

    def _build(self):
        dlg = tk.Toplevel(self.root)
        dlg.title('📨 Morning SMS — Reminders & Birthday Wishes')
        dlg.configure(bg=self.pal.bg_app)
        dlg.geometry('780x560')
        dlg.resizable(True, True)
        dlg.transient(self.root)
        dlg.grab_set()
        self.dlg = dlg

        # Center on screen
        dlg.update_idletasks()
        w, h = 780, 560
        x = (dlg.winfo_screenwidth() - w) // 2
        y = (dlg.winfo_screenheight() - h) // 2
        dlg.geometry(f'{w}x{h}+{x}+{y}')

        # Header
        hdr = tk.Frame(dlg, bg=self.pal.accent, height=56)
        hdr.pack(fill=tk.X)
        hdr.pack_propagate(False)
        tk.Label(hdr, text='📨  Morning SMS — Reminders & Birthday Wishes',
                 font=('Segoe UI', 14, 'bold'), bg=self.pal.accent, fg='white').pack(
            side=tk.LEFT, padx=18, pady=14)

        today_str = datetime.now().strftime('%Y-%m-%d')
        tk.Label(hdr, text=today_str, font=('Segoe UI', 10),
                 bg=self.pal.accent, fg='#dbeafe').pack(side=tk.RIGHT, padx=18)

        # Notebook
        nb = ttk.Notebook(dlg)
        nb.pack(fill=tk.BOTH, expand=True, padx=12, pady=(10, 6))

        # ── Reminder tab ──
        self.reminder_checks = {}
        rem_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(rem_frame, text=f'⏰  Loan Reminders ({len(self.reminders)})')
        self._build_list_tab(
            rem_frame,
            self.reminders,
            self.reminder_checks,
            cols=('ticket_no', 'customer_name', 'customer_phone', 'loan_amount', 'expire_date', 'reminder_month'),
            headings=('Ticket', 'Customer', 'Phone', 'Amount', 'Expire', 'Due Month'),
            widths=(90, 160, 110, 90, 100, 90),
            row_key='id',
        )

        # ── Birthday tab ──
        self.birthday_checks = {}
        bday_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(bday_frame, text=f'🎂  Birthdays Today ({len(self.birthdays)})')
        self._build_list_tab(
            bday_frame,
            self.birthdays,
            self.birthday_checks,
            cols=('name', 'phone', 'birthday', 'nic'),
            headings=('Name', 'Phone', 'Birthday', 'NIC'),
            widths=(180, 120, 100, 140),
            row_key='id',
        )

        # Status bar
        self.status_var = tk.StringVar(value='')
        tk.Label(dlg, textvariable=self.status_var, font=('Segoe UI', 9),
                 bg=self.pal.bg_app, fg=self.pal.text_muted).pack(anchor='w', padx=14)

        # Buttons
        btn_row = tk.Frame(dlg, bg=self.pal.bg_app)
        btn_row.pack(fill=tk.X, padx=12, pady=(0, 12))

        self.send_btn = self.theme.make_button(btn_row, text='📤  Send Selected',
                                               command=self._send_selected,
                                               kind='primary', width=18, pady=6)
        self.send_btn.pack(side=tk.RIGHT, padx=(6, 0))

        self.theme.make_button(btn_row, text='Skip for Today',
                               command=dlg.destroy,
                               kind='ghost', width=14, pady=6).pack(side=tk.RIGHT)

    def _build_list_tab(self, parent, rows, checks, cols, headings, widths, row_key):
        pal = self.pal

        if not rows:
            tk.Label(parent, text='✅  Nothing to send today.',
                     font=('Segoe UI', 11), bg=pal.bg_app,
                     fg=pal.text_muted).pack(pady=40)
            return

        # Select-all row
        top = tk.Frame(parent, bg=pal.bg_app)
        top.pack(fill=tk.X, padx=12, pady=(8, 4))
        select_all_var = tk.BooleanVar(value=True)

        # Tree
        tree_frame = tk.Frame(parent, bg=pal.bg_app)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 8))

        all_cols = ('_check',) + cols
        tree = ttk.Treeview(tree_frame, columns=all_cols, show='headings', height=12)
        tree.heading('_check', text='✓')
        tree.column('_check', width=32, anchor='center', stretch=False)
        for col, hd, wd in zip(cols, headings, widths):
            tree.heading(col, text=hd)
            tree.column(col, width=wd, anchor='w')

        vsb = ttk.Scrollbar(tree_frame, orient=tk.VERTICAL, command=tree.yview)
        tree.configure(yscrollcommand=vsb.set)
        vsb.pack(side=tk.RIGHT, fill=tk.Y)
        tree.pack(fill=tk.BOTH, expand=True)

        # Populate rows — iid is always a string, checks keyed by same string
        for row in rows:
            key = str(row[row_key])   # string key everywhere
            var = tk.BooleanVar(value=True)
            checks[key] = {'var': var, 'row': row}
            values = ('✓',) + tuple(str(row.get(c, '') or '') for c in cols)
            tree.insert('', tk.END, iid=key, values=values)

        def _set_row(key, value):
            checks[key]['var'].set(value)
            tree.set(key, '_check', '✓' if value else '')

        # Toggle on row click
        def _on_click(event):
            iid = tree.identify_row(event.y)
            if iid and iid in checks:
                new_val = not checks[iid]['var'].get()
                _set_row(iid, new_val)
            return 'break'   # prevent default selection highlight stealing focus

        tree.bind('<Button-1>', _on_click)

        # Select-all checkbox — defined after tree so _set_row is in scope
        def _on_toggle_all():
            val = select_all_var.get()
            for k in checks:
                _set_row(k, val)

        tk.Checkbutton(top, text='Select / Deselect All', variable=select_all_var,
                       command=_on_toggle_all,
                       bg=pal.bg_app, fg=pal.text_primary,
                       selectcolor=pal.bg_app, font=('Segoe UI', 9, 'bold'),
                       activebackground=pal.bg_app).pack(side=tk.LEFT)

    def _toggle_all(self, checks, value):
        # Updates var only — tree visual is handled by per-tab _set_row via _on_toggle_all
        for key, item in checks.items():
            item['var'].set(value)

    def _send_selected(self):
        rem_selected = [v['row'] for v in self.reminder_checks.values() if v['var'].get()]
        bday_selected = [v['row'] for v in self.birthday_checks.values() if v['var'].get()]

        if not rem_selected and not bday_selected:
            messagebox.showwarning('Nothing Selected', 'Please select at least one message to send.', parent=self.dlg)
            return

        self.send_btn.config(state='disabled')
        self.status_var.set('Sending…')

        def _do_send():
            sent_ok = 0
            sent_fail = 0
            today_str = datetime.now().strftime('%Y-%m-%d')

            # Reminders
            for loan in rem_selected:
                recipient = loan.get('customer_phone', '')
                if not recipient:
                    # Log as failed — no phone
                    log_sms_message(
                        recipient='', message=self.reminder_tpl,
                        category='auto_reminder', status='failed',
                        customer_id=loan.get('customer_id'),
                        loan_id=loan.get('id'),
                        sent_by=self.user.get('id'),
                        db_path=self.db_path,
                    )
                    sent_fail += 1
                    continue

                customer = {
                    'id': loan.get('customer_id'),
                    'name': loan.get('customer_name', ''),
                    'nic': loan.get('customer_nic', ''),
                    'phone': recipient,
                }
                ctx = build_sms_context(customer=customer, loan=loan)
                msg = render_template(self.reminder_tpl, ctx)
                ok, _, __ = send_sms(
                    recipient, msg,
                    customer=customer, loan=loan,
                    category='auto_reminder',
                    sent_by=self.user.get('id'),
                    db_path=self.db_path,
                )
                if ok:
                    mark_reminder_sent(loan['id'], loan['reminder_month'], db_path=self.db_path)
                    sent_ok += 1
                else:
                    sent_fail += 1

            # Birthdays
            for cust in bday_selected:
                recipient = cust.get('phone', '')
                if not recipient:
                    log_sms_message(
                        recipient='', message=self.birthday_tpl,
                        category='birthday', status='failed',
                        customer_id=cust.get('id'),
                        sent_by=self.user.get('id'),
                        db_path=self.db_path,
                    )
                    sent_fail += 1
                    continue

                ctx = build_sms_context(customer=cust)
                msg = render_template(self.birthday_tpl, ctx)
                ok, _, __ = send_sms(
                    recipient, msg,
                    customer=cust,
                    category='birthday',
                    sent_by=self.user.get('id'),
                    db_path=self.db_path,
                )
                if ok:
                    mark_birthday_wish_sent(cust['id'], db_path=self.db_path)
                    sent_ok += 1
                else:
                    sent_fail += 1

            def _done():
                parts = []
                if sent_ok:
                    parts.append(f'{sent_ok} sent')
                if sent_fail:
                    parts.append(f'{sent_fail} failed (see SMS Center > Failed tab)')
                self.status_var.set('  •  '.join(parts))
                self.send_btn.config(state='normal')
                if sent_fail == 0:
                    self.dlg.after(1500, self.dlg.destroy)

            self.dlg.after(0, _done)

        threading.Thread(target=_do_send, daemon=True).start()
