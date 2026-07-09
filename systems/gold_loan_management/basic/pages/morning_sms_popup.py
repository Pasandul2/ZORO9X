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
    save_sms_template,
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
        dlg.geometry('900x700')
        dlg.resizable(True, True)
        dlg.transient(self.root)
        dlg.grab_set()
        self.dlg = dlg

        # Center on screen
        dlg.update_idletasks()
        w, h = 900, 700
        x = (dlg.winfo_screenwidth() - w) // 2
        y = (dlg.winfo_screenheight() - h) // 2
        dlg.geometry(f'{w}x{h}+{x}+{y}')

        # Header - Fixed at top
        hdr = tk.Frame(dlg, bg=self.pal.accent, height=56)
        hdr.pack(fill=tk.X, side=tk.TOP)
        hdr.pack_propagate(False)
        tk.Label(hdr, text='📨  Morning SMS — Reminders & Birthday Wishes',
                 font=('Segoe UI', 14, 'bold'), bg=self.pal.accent, fg='white').pack(
            side=tk.LEFT, padx=18, pady=14)

        today_str = datetime.now().strftime('%Y-%m-%d')
        tk.Label(hdr, text=today_str, font=('Segoe UI', 10),
                 bg=self.pal.accent, fg='#dbeafe').pack(side=tk.RIGHT, padx=18)

        # Main scrollable container
        main_container = tk.Frame(dlg, bg=self.pal.bg_app)
        main_container.pack(fill=tk.BOTH, expand=True, side=tk.TOP)

        # Canvas for scrolling
        canvas = tk.Canvas(main_container, bg=self.pal.bg_app, highlightthickness=0)
        scrollbar = ttk.Scrollbar(main_container, orient=tk.VERTICAL, command=canvas.yview)
        
        # Scrollable frame
        scrollable_frame = tk.Frame(canvas, bg=self.pal.bg_app)
        
        # Create window in canvas
        canvas_window = canvas.create_window((0, 0), window=scrollable_frame, anchor='nw')
        
        # Configure canvas scrolling
        def _configure_scroll_region(event=None):
            canvas.configure(scrollregion=canvas.bbox('all'))
        
        def _configure_canvas_width(event):
            canvas.itemconfig(canvas_window, width=event.width)
        
        scrollable_frame.bind('<Configure>', _configure_scroll_region)
        canvas.bind('<Configure>', _configure_canvas_width)
        canvas.configure(yscrollcommand=scrollbar.set)
        
        # Pack scrollbar and canvas
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        
        # Bind mousewheel scrolling
        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1*(event.delta/120)), "units")
        
        def _bind_mousewheel(event=None):
            canvas.bind_all("<MouseWheel>", _on_mousewheel)
        
        def _unbind_mousewheel(event=None):
            canvas.unbind_all("<MouseWheel>")
        
        canvas.bind('<Enter>', _bind_mousewheel)
        canvas.bind('<Leave>', _unbind_mousewheel)
        
        # When dialog closes, unbind mousewheel
        def _on_close():
            canvas.unbind_all("<MouseWheel>")
            dlg.destroy()
        
        dlg.protocol("WM_DELETE_WINDOW", _on_close)

        # Notebook inside scrollable frame
        nb = ttk.Notebook(scrollable_frame)
        nb.pack(fill=tk.BOTH, expand=True, padx=12, pady=(10, 6))

        # ── Reminder tab ──
        self.reminder_checks = {}
        self.reminder_custom_numbers = []
        rem_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(rem_frame, text=f'⏰  Loan Reminders ({len(self.reminders)})')
        self._build_list_tab(
            rem_frame,
            self.reminders,
            self.reminder_checks,
            self.reminder_custom_numbers,
            cols=('ticket_no', 'customer_name', 'customer_phone', 'loan_amount', 'expire_date', 'reminder_month'),
            headings=('Ticket', 'Customer', 'Phone', 'Amount', 'Expire', 'Due Month'),
            widths=(70, 130, 95, 75, 85, 80),
            row_key='id',
        )

        # ── Birthday tab ──
        self.birthday_checks = {}
        self.birthday_custom_numbers = []
        bday_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(bday_frame, text=f'🎂  Birthdays Today ({len(self.birthdays)})')
        self._build_list_tab(
            bday_frame,
            self.birthdays,
            self.birthday_checks,
            self.birthday_custom_numbers,
            cols=('name', 'phone', 'birthday', 'nic'),
            headings=('Name', 'Phone', 'Birthday', 'NIC'),
            widths=(150, 100, 85, 120),
            row_key='id',
        )

        # ── Preview Reminder SMS tab ──
        preview_rem_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(preview_rem_frame, text='👁️  Preview Reminder SMS')
        self._build_preview_tab(preview_rem_frame, 'reminder')

        # ── Preview Birthday SMS tab ──
        preview_bday_frame = tk.Frame(nb, bg=self.pal.bg_app)
        nb.add(preview_bday_frame, text='�️  Preview Birthday SMS')
        self._build_preview_tab(preview_bday_frame, 'birthday')

        # Status bar
        self.status_var = tk.StringVar(value='')
        tk.Label(scrollable_frame, textvariable=self.status_var, font=('Segoe UI', 9),
                 bg=self.pal.bg_app, fg=self.pal.text_muted).pack(anchor='w', padx=14, pady=(4, 0))

        # Buttons - Inside scrollable frame with extra padding at bottom
        btn_row = tk.Frame(scrollable_frame, bg=self.pal.bg_app)
        btn_row.pack(fill=tk.X, padx=12, pady=(8, 20))

        self.send_btn = self.theme.make_button(btn_row, text='📤  Send Selected',
                                               command=self._send_selected,
                                               kind='primary', width=18, pady=6)
        self.send_btn.pack(side=tk.RIGHT, padx=(6, 0))

        self.theme.make_button(btn_row, text='Skip for Today',
                               command=_on_close,
                               kind='ghost', width=14, pady=6).pack(side=tk.RIGHT)
        
        # Force update to ensure scroll region is calculated
        scrollable_frame.update_idletasks()
        canvas.configure(scrollregion=canvas.bbox('all'))

    def _build_list_tab(self, parent, rows, checks, custom_numbers, cols, headings, widths, row_key):
        pal = self.pal

        if not rows:
            tk.Label(parent, text='✅  Nothing to send today.',
                     font=('Segoe UI', 11), bg=pal.bg_app,
                     fg=pal.text_muted).pack(pady=40)
            # Still show custom number input even if no rows
            self._add_custom_number_input(parent, custom_numbers, checks)
            return

        # Select-all row
        top = tk.Frame(parent, bg=pal.bg_app)
        top.pack(fill=tk.X, padx=12, pady=(8, 4))
        select_all_var = tk.BooleanVar(value=True)

        # Tree
        tree_frame = tk.Frame(parent, bg=pal.bg_app)
        tree_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 8))

        all_cols = ('_check',) + cols
        tree = ttk.Treeview(tree_frame, columns=all_cols, show='headings', height=6)
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

        # Add custom number input at the bottom
        self._add_custom_number_input(parent, custom_numbers, checks)

    def _add_custom_number_input(self, parent, custom_numbers, checks):
        """Add custom phone number input field and list display."""
        pal = self.pal
        
        # Container for custom numbers
        custom_frame = tk.Frame(parent, bg=pal.bg_surface,
                               highlightthickness=1, highlightbackground=pal.border)
        custom_frame.pack(fill=tk.X, padx=12, pady=(4, 8))
        
        # Header
        hdr = tk.Frame(custom_frame, bg=pal.bg_surface)
        hdr.pack(fill=tk.X, padx=10, pady=(8, 4))
        tk.Label(hdr, text='📞 Custom Numbers', font=('Segoe UI', 9, 'bold'),
                 bg=pal.bg_surface, fg=pal.text_primary).pack(side=tk.LEFT)
        
        # Input row
        input_row = tk.Frame(custom_frame, bg=pal.bg_surface)
        input_row.pack(fill=tk.X, padx=10, pady=(0, 6))
        
        tk.Label(input_row, text='Phone:', font=('Segoe UI', 9),
                 bg=pal.bg_surface, fg=pal.text_muted).pack(side=tk.LEFT, padx=(0, 6))
        
        number_var = tk.StringVar()
        number_entry = tk.Entry(input_row, textvariable=number_var,
                               font=('Segoe UI', 9), relief='solid', bd=1)
        number_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(0, 6))
        
        # Display list frame
        list_frame = tk.Frame(custom_frame, bg=pal.bg_surface)
        list_frame.pack(fill=tk.X, padx=10, pady=(0, 8))
        
        def _refresh_list():
            """Refresh the display of custom numbers."""
            for widget in list_frame.winfo_children():
                widget.destroy()
            
            if not custom_numbers:
                tk.Label(list_frame, text='No custom numbers added',
                        font=('Segoe UI', 8), bg=pal.bg_surface,
                        fg=pal.text_muted).pack(anchor='w')
                return
            
            for num in custom_numbers:
                num_frame = tk.Frame(list_frame, bg=pal.bg_surface_alt)
                num_frame.pack(fill=tk.X, pady=1)
                
                tk.Label(num_frame, text=f'  📱 {num}',
                        font=('Segoe UI', 9), bg=pal.bg_surface_alt,
                        fg=pal.text_primary).pack(side=tk.LEFT, padx=4, pady=2)
                
                def _remove(n=num):
                    if n in custom_numbers:
                        custom_numbers.remove(n)
                        # Remove from checks dict
                        key = f'custom_{n}'
                        if key in checks:
                            del checks[key]
                        _refresh_list()
                
                remove_btn = tk.Label(num_frame, text='✕', font=('Segoe UI', 10, 'bold'),
                                     bg=pal.bg_surface_alt, fg=pal.danger,
                                     cursor='hand2')
                remove_btn.pack(side=tk.RIGHT, padx=4)
                remove_btn.bind('<Button-1>', lambda e, fn=_remove: fn())
        
        def _add_number():
            num = number_var.get().strip()
            if not num:
                return
            
            # Basic validation
            if len(num) < 7:
                messagebox.showwarning('Invalid Number',
                                     'Phone number must be at least 7 digits.',
                                     parent=self.dlg)
                return
            
            if num in custom_numbers:
                messagebox.showinfo('Duplicate',
                                  'This number is already in the list.',
                                  parent=self.dlg)
                return
            
            custom_numbers.append(num)
            # Add to checks with custom key
            key = f'custom_{num}'
            var = tk.BooleanVar(value=True)
            checks[key] = {'var': var, 'row': {'phone': num, 'is_custom': True}}
            
            number_var.set('')
            _refresh_list()
        
        number_entry.bind('<Return>', lambda e: _add_number())
        
        self.theme.make_button(input_row, text='➕ Add', command=_add_number,
                              kind='ghost', width=8, pady=4).pack(side=tk.LEFT)
        
        # Initial list display
        _refresh_list()

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
            sent_rem_ids = set()
            sent_bday_ids = set()

            # Reminders
            for loan in rem_selected:
                recipient = loan.get('customer_phone') or loan.get('phone', '')
                is_custom = loan.get('is_custom', False)
                
                if not recipient:
                    # Log as failed — no phone
                    log_sms_message(
                        recipient='', message=self.reminder_tpl,
                        category='auto_reminder', status='failed',
                        customer_id=loan.get('customer_id') if not is_custom else None,
                        loan_id=loan.get('id') if not is_custom else None,
                        sent_by=self.user.get('id'),
                        db_path=self.db_path,
                    )
                    sent_fail += 1
                    continue

                if is_custom:
                    # For custom numbers, use generic context
                    ctx = build_sms_context()
                    ctx['customer_name'] = 'Valued Customer'
                    ctx['customer_phone'] = recipient
                else:
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
                    customer=None if is_custom else customer,
                    loan=None if is_custom else loan,
                    category='auto_reminder',
                    sent_by=self.user.get('id'),
                    db_path=self.db_path,
                )
                if ok:
                    if not is_custom:
                        mark_reminder_sent(loan['id'], loan['reminder_month'], db_path=self.db_path)
                        sent_rem_ids.add(str(loan['id']))
                    else:
                        sent_rem_ids.add(f'custom_{recipient}')
                    sent_ok += 1
                else:
                    sent_fail += 1

            # Birthdays
            for cust in bday_selected:
                recipient = cust.get('phone', '')
                is_custom = cust.get('is_custom', False)
                
                if not recipient:
                    log_sms_message(
                        recipient='', message=self.birthday_tpl,
                        category='birthday', status='failed',
                        customer_id=cust.get('id') if not is_custom else None,
                        sent_by=self.user.get('id'),
                        db_path=self.db_path,
                    )
                    sent_fail += 1
                    continue

                if is_custom:
                    # For custom numbers, use generic context
                    ctx = build_sms_context()
                    ctx['customer_name'] = 'Valued Customer'
                    ctx['customer_phone'] = recipient
                else:
                    ctx = build_sms_context(customer=cust)
                
                msg = render_template(self.birthday_tpl, ctx)
                ok, _, __ = send_sms(
                    recipient, msg,
                    customer=None if is_custom else cust,
                    category='birthday',
                    sent_by=self.user.get('id'),
                    db_path=self.db_path,
                )
                if ok:
                    if not is_custom:
                        mark_birthday_wish_sent(cust['id'], db_path=self.db_path)
                        sent_bday_ids.add(str(cust['id']))
                    else:
                        sent_bday_ids.add(f'custom_{recipient}')
                    sent_ok += 1
                else:
                    sent_fail += 1

            def _done():
                # Remove successfully sent rows from the check dicts and trees
                for key in list(sent_rem_ids):
                    self.reminder_checks.pop(key, None)
                for key in list(sent_bday_ids):
                    self.birthday_checks.pop(key, None)
                self._refresh_reminder_list()
                self._refresh_birthday_list()

                parts = []
                if sent_ok:
                    parts.append(f'{sent_ok} sent ✅')
                if sent_fail:
                    parts.append(f'{sent_fail} failed ❌ (see SMS Center > Failed tab)')
                self.status_var.set('  •  '.join(parts))
                self.send_btn.config(state='normal')
                if sent_fail == 0:
                    self.dlg.after(1500, self.dlg.destroy)

            self.dlg.after(0, _done)

        threading.Thread(target=_do_send, daemon=True).start()

    def _refresh_reminder_list(self):
        """Remove successfully sent rows from the reminder tree."""
        try:
            nb = self.dlg.nametowidget(self.dlg.winfo_children()[1].winfo_children()[0].winfo_name())
        except Exception:
            pass  # tree refresh is best-effort; checks dict is already cleaned

        # Walk all treeview widgets inside the dialog and remove sent iids
        def _remove_from_trees(widget):
            if isinstance(widget, ttk.Treeview):
                for iid in list(widget.get_children()):
                    if iid not in self.reminder_checks and iid not in self.birthday_checks:
                        try:
                            widget.delete(iid)
                        except Exception:
                            pass
            for child in widget.winfo_children():
                _remove_from_trees(child)

        _remove_from_trees(self.dlg)

    def _refresh_birthday_list(self):
        """Birthday list shares the same tree-walk refresh — no-op here."""
        pass  # _refresh_reminder_list handles both trees already

    def _build_preview_tab(self, parent, sms_type):
        """Build preview/edit tab for reminder or birthday SMS templates."""
        pal = self.pal
        
        # Main container
        main = tk.Frame(parent, bg=pal.bg_app)
        main.pack(fill=tk.BOTH, expand=True, padx=14, pady=14)
        main.grid_columnconfigure(0, weight=3)
        main.grid_columnconfigure(1, weight=1)
        main.grid_rowconfigure(0, weight=1)
        
        # Left: Editor
        left = tk.Frame(main, bg=pal.bg_surface)
        left.grid(row=0, column=0, sticky='nsew', padx=(0, 8))
        
        # Header
        icon = '⏰' if sms_type == 'reminder' else '🎂'
        title = 'Reminder SMS Template' if sms_type == 'reminder' else 'Birthday SMS Template'
        tk.Label(left, text=f'{icon}  {title}', font=('Segoe UI', 12, 'bold'),
                 bg=pal.bg_surface, fg=pal.text_primary).pack(anchor='w', padx=12, pady=(12, 4))
        
        tk.Label(left, text='Edit template with placeholders and save to update',
                 font=('Segoe UI', 9), bg=pal.bg_surface, fg=pal.text_muted).pack(anchor='w', padx=12)
        
        # Template editor
        editor_frame = tk.Frame(left, bg=pal.bg_surface)
        editor_frame.pack(fill=tk.X, padx=12, pady=(8, 4))
        
        tk.Label(editor_frame, text='Template:', font=('Segoe UI', 9, 'bold'),
                 bg=pal.bg_surface, fg=pal.text_primary).pack(anchor='w')
        
        text = tk.Text(
            editor_frame, height=8, wrap='word',
            bg='#ffffff', fg=pal.text_primary,
            insertbackground=pal.text_primary,
            relief='solid', bd=1, padx=10, pady=8,
            font=('Segoe UI', 10),
        )
        text.pack(fill=tk.X, pady=(4, 0))
        
        # Load current template
        if sms_type == 'reminder':
            text.insert('1.0', self.reminder_tpl)
        else:
            text.insert('1.0', self.birthday_tpl)
        
        # Character counter
        char_var = tk.StringVar(value='0 chars')
        def _update_counter(*_):
            content = text.get('1.0', 'end-1c')
            length = len(content)
            sms_parts = max(1, (length + 159) // 160)
            char_var.set(f'{length} chars  •  ~{sms_parts} SMS part{"s" if sms_parts > 1 else ""}')
        
        text.bind('<KeyRelease>', _update_counter)
        _update_counter()
        
        tk.Label(editor_frame, textvariable=char_var, font=('Segoe UI', 8),
                 bg=pal.bg_surface, fg=pal.text_muted, anchor='e').pack(anchor='e', pady=(2, 0))
        
        # Preview section
        preview_frame = tk.Frame(left, bg=pal.bg_surface)
        preview_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(12, 4))
        
        tk.Label(preview_frame, text='Preview (with sample data):', font=('Segoe UI', 9, 'bold'),
                 bg=pal.bg_surface, fg=pal.text_primary).pack(anchor='w')
        
        preview_text = tk.Text(
            preview_frame, height=8, wrap='word',
            bg='#f8fafc', fg=pal.text_primary,
            relief='solid', bd=1, padx=10, pady=8,
            font=('Segoe UI', 10),
            state='disabled',
        )
        preview_text.pack(fill=tk.BOTH, expand=True, pady=(4, 0))
        
        # Buttons - Save first, then Preview
        btn_frame = tk.Frame(left, bg=pal.bg_surface)
        btn_frame.pack(fill=tk.X, padx=12, pady=(8, 12))
        
        def _preview():
            tpl = text.get('1.0', 'end-1c')
            # Build sample context
            if sms_type == 'reminder':
                sample_ctx = {
                    'customer_name': 'John Doe',
                    'customer_nic': '123456789V',
                    'customer_phone': '0771234567',
                    'ticket_no': 'GL-2024-001',
                    'loan_amount': '50,000.00',
                    'expire_date': '2026-10-09',
                    'issue_date': '2026-07-09',
                    'renew_date': '',
                    'interest_rate': '2.5',
                    'duration': '3',
                    'total_payable': '53,750.00',
                    'total_interest': '3,750.00',
                    'company_name': get_setting('company_name', 'Gold Loan Company', self.db_path),
                    'company_phone': get_setting('company_phone', '0112345678', self.db_path),
                    'company_address': get_setting('company_address', '123 Main St', self.db_path),
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'time': datetime.now().strftime('%H:%M:%S'),
                }
            else:
                sample_ctx = {
                    'customer_name': 'Jane Smith',
                    'customer_nic': '987654321V',
                    'customer_phone': '0779876543',
                    'birthday_date': datetime.now().strftime('%Y-%m-%d'),
                    'company_name': get_setting('company_name', 'Gold Loan Company', self.db_path),
                    'company_phone': get_setting('company_phone', '0112345678', self.db_path),
                    'company_address': get_setting('company_address', '123 Main St', self.db_path),
                    'date': datetime.now().strftime('%Y-%m-%d'),
                    'time': datetime.now().strftime('%H:%M:%S'),
                }
            
            rendered = render_template(tpl, sample_ctx)
            preview_text.config(state='normal')
            preview_text.delete('1.0', tk.END)
            preview_text.insert('1.0', rendered)
            preview_text.config(state='disabled')
        
        def _save():
            tpl = text.get('1.0', 'end-1c')
            category = 'auto_reminder' if sms_type == 'reminder' else 'birthday'
            title = 'Reminder SMS' if sms_type == 'reminder' else 'Birthday Wishes'
            
            try:
                save_sms_template(category=category, title=title, body=tpl, db_path=self.db_path)
                if sms_type == 'reminder':
                    self.reminder_tpl = tpl
                else:
                    self.birthday_tpl = tpl
                
                # Auto-refresh preview after saving
                _preview()
                
                messagebox.showinfo('Template Saved', f'{title} template updated successfully!\n\nPreview has been refreshed.', parent=self.dlg)
            except Exception as e:
                messagebox.showerror('Save Error', f'Failed to save template: {str(e)}', parent=self.dlg)
        
        self.theme.make_button(btn_frame, text='💾  Save Template', command=_save,
                              kind='primary', width=14, pady=6).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(btn_frame, text='👁️  Preview', command=_preview,
                              kind='ghost', width=12, pady=6).pack(side=tk.LEFT)
        
        # Right: Placeholders
        right = tk.Frame(main, bg=pal.bg_surface)
        right.grid(row=0, column=1, sticky='nsew')
        
        tk.Label(right, text='📋  Placeholders', font=('Segoe UI', 10, 'bold'),
                 bg=pal.bg_surface, fg=pal.text_primary).pack(anchor='w', padx=10, pady=(12, 2))
        tk.Label(right, text='Click to insert', font=('Segoe UI', 8),
                 bg=pal.bg_surface, fg=pal.text_muted).pack(anchor='w', padx=10, pady=(0, 8))
        
        # Placeholder list with scroll
        ph_frame = tk.Frame(right, bg=pal.bg_surface)
        ph_frame.pack(fill=tk.BOTH, expand=True, padx=4, pady=(0, 4))
        
        canvas = tk.Canvas(ph_frame, bg=pal.bg_surface, highlightthickness=0, bd=0)
        scrollbar = ttk.Scrollbar(ph_frame, orient=tk.VERTICAL, command=canvas.yview)
        inner = tk.Frame(canvas, bg=pal.bg_surface)
        canvas.configure(yscrollcommand=scrollbar.set)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        win = canvas.create_window((0, 0), window=inner, anchor='nw')
        inner.bind('<Configure>', lambda _: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))
        
        # Define placeholders based on type - ALL PLACEHOLDERS
        placeholders = [
            ('👤 Customer Name', '{{customer_name}}'),
            ('🆔 Customer NIC', '{{customer_nic}}'),
            ('📞 Customer Phone', '{{customer_phone}}'),
            ('🎫 Ticket No', '{{ticket_no}}'),
            ('💰 Loan Amount', '{{loan_amount}}'),
            ('📊 Market Value', '{{market_value}}'),
            ('📋 Assessed Value', '{{assessed_value}}'),
            ('📈 Interest Rate', '{{interest_rate}}'),
            ('⏱ Duration', '{{duration}}'),
            ('📅 Issue Date', '{{issue_date}}'),
            ('🔄 Renew Date', '{{renew_date}}'),
            ('⏳ Expire Date', '{{expire_date}}'),
            ('📌 Loan Status', '{{loan_status}}'),
            ('💵 Total Payable', '{{total_payable}}'),
            ('📊 Total Interest', '{{total_interest}}'),
            ('🎂 Birthday Date', '{{birthday_date}}'),
            ('🏢 Company Name', '{{company_name}}'),
            ('📞 Company Phone', '{{company_phone}}'),
            ('📍 Company Address', '{{company_address}}'),
            ('📆 Current Date', '{{date}}'),
            ('🕐 Current Time', '{{time}}'),
            ('💬 Message', '{{message}}'),
            ('💰 Payment Amount', '{{payment_amount}}'),
            ('🆕 New Loan Amount', '{{new_loan_amount}}'),
            ('📉 Normal Interest Due', '{{normal_interest_due}}'),
            ('⚠️ Overdue Interest Due', '{{overdue_interest_due}}'),
            ('🔽 Principal Reduction', '{{principal_reduction}}'),
            ('🆕 New Interest Rate', '{{new_interest_rate}}'),
            ('🆕 New Assessed Value', '{{new_assessed_value}}'),
            ('💹 Interest Principal Amt', '{{interest_principal_amount}}'),
            ('📊 Overdue Interest Rate', '{{overdue_interest_rate}}'),
            ('💸 OD Interest Amount', '{{od_interest}}'),
            ('🔧 Service Charge Rate', '{{service_charge_rate}}'),
            ('🔧 Service Charge Amount', '{{service_charge_amount}}'),
            ('💵 Advance Amount', '{{advance_amount}}'),
            ('⚖️ Customer Balance', '{{customer_balance_amount}}'),
            ('🏅 Total Gold Weight', '{{total_gold_weight}}'),
            ('📦 Total Item Weight', '{{total_item_weight}}'),
        ]
        
        for label, placeholder in placeholders:
            btn = tk.Label(
                inner, text=f'  {label}', font=('Segoe UI', 9),
                bg=pal.bg_surface, fg='#6366f1',
                anchor='w', cursor='hand2', pady=3,
            )
            btn.pack(fill=tk.X, padx=6)
            btn.bind('<Enter>', lambda e, b=btn: b.configure(bg='#e0e7ff'))
            btn.bind('<Leave>', lambda e, b=btn: b.configure(bg=pal.bg_surface))
            btn.bind('<Button-1>', lambda e, p=placeholder: self._insert_placeholder(text, p))
        
        # Auto-preview on load
        _preview()
    
    def _insert_placeholder(self, text_widget, placeholder):
        """Insert placeholder at cursor position."""
        if text_widget:
            text_widget.insert(tk.INSERT, placeholder)
            text_widget.focus_set()
