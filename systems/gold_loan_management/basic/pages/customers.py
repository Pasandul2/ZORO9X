"""Customer Management Page for Gold Loan System."""

import tkinter as tk
from tkinter import messagebox, ttk
from database import search_customers, create_customer, update_customer, get_customer, search_loans
from utils import format_currency, format_date


class CustomersPage:
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
        tk.Label(hdr, text='👥 Customer Management', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        self.stats_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.stats_wrap.pack(fill=tk.X, pady=(0, 10))

        # Search & Add bar
        bar_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        bar_card.pack(fill=tk.X, pady=(0, 10))
        bar = tk.Frame(bar_card.inner, bg=self.theme.palette.bg_surface)
        bar.pack(fill=tk.X, padx=14, pady=10)

        tk.Label(bar, text='Search:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        search_entry = self.theme.make_entry(bar, variable=self.search_var, width=25)
        search_entry.pack(side=tk.LEFT, padx=(8, 12))
        self.search_var.trace_add('write', self._on_search_change)
        if hasattr(search_entry, 'entry'):
            search_entry.entry.bind('<Return>', lambda _e: self._do_search())
        self.theme.make_button(bar, text='🔍 Search', command=self._do_search,
                               kind='primary', width=10, pady=6).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(bar, text='➕ Add Customer', command=self._show_add_form,
                               kind='primary', width=14, pady=6).pack(side=tk.RIGHT)

        # Results
        self.results_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        self.results_card.pack(fill=tk.BOTH, expand=True)
        self.results_frame = self.results_card.inner
        self._search_after_id = None
        self._do_search()

    def _render_stats(self, customers, all_customers, active_loans):
        for w in self.stats_wrap.winfo_children():
            w.destroy()

        active_customer_nics = {str(loan.get('customer_nic', '')).strip() for loan in active_loans if loan.get('customer_nic')}
        stats = [
            ('Total Customers', str(len(all_customers)), self.theme.palette.accent),
            ('Matched Results', str(len(customers)), self.theme.palette.info),
            ('Birthdays Added', str(sum(1 for c in all_customers if (c.get('birthday') or '').strip())), self.theme.palette.success),
            ('Customers With Active Loans', str(sum(1 for c in all_customers if str(c.get('nic', '')).strip() in active_customer_nics)), self.theme.palette.warning),
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
        for w in self.results_frame.winfo_children():
            w.destroy()

        customers = search_customers(self.search_var.get().strip())
        all_customers = search_customers('')
        active_loans = search_loans(status='active')
        self._render_stats(customers, all_customers, active_loans)

        tk.Label(self.results_frame, text=f'Found {len(customers)} customer(s)',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 6))

        tbl = tk.Frame(self.results_frame, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        cols = ['NIC', 'Name', 'Phone', 'Birthday', 'Address', 'Actions']
        widths = [14, 16, 12, 12, 16, 14]

        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for col, w in zip(cols, widths):
            tk.Label(hdr, text=col, font=self.theme.fonts.body_bold, width=w, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=3, pady=6)

        for cust in customers:
            row = tk.Frame(tbl, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            vals = [
                cust['nic'],
                cust['name'],
                cust['phone'],
                cust.get('birthday', '') or '-',
                cust.get('address', '') or '-',
            ]
            for val, w in zip(vals, widths[:-1]):
                tk.Label(row, text=val, font=self.theme.fonts.body, width=w, anchor='w',
                         bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=3, pady=5)

            af = tk.Frame(row, bg=self.theme.palette.bg_surface)
            af.pack(side=tk.LEFT)
            view_lbl = tk.Label(af, text='👁 View', font=self.theme.fonts.small, cursor='hand2',
                                bg=self.theme.palette.bg_surface, fg=self.theme.palette.info)
            view_lbl.pack(side=tk.LEFT, padx=(0, 8))
            view_lbl.bind('<Button-1>', lambda e, c=cust: self._show_customer_details(c))
            edit_lbl = tk.Label(af, text='✏️ Edit', font=self.theme.fonts.small, cursor='hand2',
                                bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent)
            edit_lbl.pack(side=tk.LEFT, padx=(0, 8))
            edit_lbl.bind('<Button-1>', lambda e, c=cust: self._show_edit_form(c))
            loans_lbl = tk.Label(af, text='📋 Loans', font=self.theme.fonts.small, cursor='hand2',
                                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.info)
            loans_lbl.pack(side=tk.LEFT)
            loans_lbl.bind('<Button-1>', lambda e, c=cust: self._show_customer_loans(c))

        if not customers:
            tk.Label(tbl, text='No customers found.', font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(pady=30)

    def _show_add_form(self):
        self._show_form()

    def _show_edit_form(self, customer):
        self._show_form(customer)

    def _show_customer_details(self, customer):
        full = get_customer(customer['id']) or customer

        win = tk.Toplevel(self.container)
        win.title(f"Customer Details - {full.get('name', '')}")
        win.geometry('520x460')
        win.configure(bg=self.theme.palette.bg_app)
        win.grab_set()

        tk.Label(win, text='Customer Details', font=self.theme.fonts.h2,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(anchor='w', padx=20, pady=(16, 10))

        card = self.theme.make_card(win, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, padx=20, pady=(0, 14))

        rows = [
            ('NIC / ID', full.get('nic', '-')),
            ('Name', full.get('name', '-')),
            ('Phone', full.get('phone', '-')),
            ('Birthday', full.get('birthday', '-') or '-'),
            ('Job', full.get('job', '-') or '-'),
            ('Married Status', full.get('marital_status', '-') or '-'),
            ('Language', full.get('language', '-') or '-'),
            ('Address', full.get('address', '-') or '-'),
            ('Created At', full.get('created_at', '-') or '-'),
            ('Updated At', full.get('updated_at', '-') or '-'),
        ]

        for label, value in rows:
            r = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, padx=14, pady=2)
            tk.Label(r, text=f'{label}:', font=self.theme.fonts.body_bold, width=14, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            tk.Label(r, text=value, font=self.theme.fonts.body,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary, wraplength=300, justify='left').pack(side=tk.LEFT, fill=tk.X, expand=True)

        btn_row = tk.Frame(win, bg=self.theme.palette.bg_app)
        btn_row.pack(fill=tk.X, padx=20, pady=(0, 16))

        self.theme.make_button(
            btn_row,
            text='✏️ Edit',
            command=lambda: (win.destroy(), self._show_edit_form(full)),
            kind='primary',
            width=10,
            pady=6,
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(
            btn_row,
            text='📋 Loans',
            command=lambda: (win.destroy(), self._show_customer_loans(full)),
            kind='ghost',
            width=10,
            pady=6,
        ).pack(side=tk.LEFT, padx=(0, 8))

        self.theme.make_button(
            btn_row,
            text='Close',
            command=win.destroy,
            kind='ghost',
            width=8,
            pady=6,
        ).pack(side=tk.RIGHT)

    def _show_form(self, customer=None):
        win = tk.Toplevel(self.container)
        win.title('Edit Customer' if customer else 'Add Customer')
        win.geometry('500x500')
        win.configure(bg=self.theme.palette.bg_app)
        win.grab_set()

        tk.Label(win, text='Edit Customer' if customer else 'New Customer',
                 font=self.theme.fonts.h2, bg=self.theme.palette.bg_app,
                 fg=self.theme.palette.text_primary).pack(pady=(20, 16))

        form = tk.Frame(win, bg=self.theme.palette.bg_app)
        form.pack(padx=30, fill=tk.X)

        vars_ = {}
        fields = [('NIC / ID:', 'nic'), ('Name:', 'name'), ('Phone:', 'phone'), ('Job:', 'job'), ('Address:', 'address')]
        for label, key in fields:
            r = tk.Frame(form, bg=self.theme.palette.bg_app)
            r.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r, text=label, font=self.theme.fonts.body_bold, width=10, anchor='w',
                     bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            default_value = customer.get(key, '') if customer else ''
            if key == 'job' and not default_value:
                default_value = ''
            var = tk.StringVar(value=default_value)
            vars_[key] = var
            entry = self.theme.make_entry(r, variable=var, readonly=(key == 'nic' and customer is not None))
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Birthday date picker
        bday_row = tk.Frame(form, bg=self.theme.palette.bg_app)
        bday_row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(bday_row, text='Birthday:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        
        bday_container = tk.Frame(bday_row, bg=self.theme.palette.bg_app)
        bday_container.pack(side=tk.LEFT, fill=tk.X, expand=True)
        
        vars_['bday_day'] = tk.StringVar(value='')
        vars_['bday_month'] = tk.StringVar(value='')
        vars_['bday_year'] = tk.StringVar(value='')
        vars_['birthday'] = tk.StringVar(value=customer.get('birthday', '') if customer else '')
        
        # Parse existing birthday if present
        def parse_existing_birthday():
            existing = customer.get('birthday', '') if customer else ''
            if existing:
                try:
                    from datetime import datetime
                    parsed = datetime.strptime(existing, '%Y-%m-%d')
                    vars_['bday_day'].set(f'{parsed.day:02d}')
                    vars_['bday_month'].set(f'{parsed.month:02d}')
                    vars_['bday_year'].set(str(parsed.year))
                except:
                    pass
        
        day_spin = tk.Spinbox(
            bday_container,
            from_=1,
            to=31,
            textvariable=vars_['bday_day'],
            width=4,
            justify='center',
            font=self.theme.fonts.body,
        )
        day_spin.pack(side=tk.LEFT, padx=(0, 4))
        
        month_spin = tk.Spinbox(
            bday_container,
            from_=1,
            to=12,
            textvariable=vars_['bday_month'],
            width=4,
            justify='center',
            font=self.theme.fonts.body,
        )
        month_spin.pack(side=tk.LEFT, padx=(0, 4))
        
        current_year = int(__import__('datetime').datetime.now().year)
        years = [str(y) for y in range(current_year - 100, current_year + 1)]
        year_combo = ttk.Combobox(
            bday_container,
            textvariable=vars_['bday_year'],
            values=years,
            state='normal',
            width=7,
            font=self.theme.fonts.body[0:2],
        )
        year_combo.pack(side=tk.LEFT)
        
        hint = tk.Label(
            bday_container,
            text='DD / MM / YYYY',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.text_muted,
        )
        hint.pack(side=tk.LEFT, padx=(8, 0))
        
        def on_bday_parts_changed(*args):
            day = vars_['bday_day'].get().strip()
            month = vars_['bday_month'].get().strip()
            year = vars_['bday_year'].get().strip()
            if day and month and year:
                try:
                    day_int = int(day)
                    month_int = int(month)
                    year_int = int(year)
                    if 1 <= day_int <= 31 and 1 <= month_int <= 12 and 1900 <= year_int <= 9999:
                        vars_['birthday'].set(f'{year_int:04d}-{month_int:02d}-{day_int:02d}')
                    else:
                        vars_['birthday'].set('')
                except:
                    vars_['birthday'].set('')
            else:
                vars_['birthday'].set('')
        
        vars_['bday_day'].trace_add('write', on_bday_parts_changed)
        vars_['bday_month'].trace_add('write', on_bday_parts_changed)
        vars_['bday_year'].trace_add('write', on_bday_parts_changed)
        
        parse_existing_birthday()

        marital_row = tk.Frame(form, bg=self.theme.palette.bg_app)
        marital_row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(marital_row, text='Married:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_['marital_status'] = tk.StringVar(value=(customer.get('marital_status', 'Unmarried') if customer else 'Unmarried') or 'Unmarried')
        tk.Radiobutton(marital_row, text='Unmarried', value='Unmarried', variable=vars_['marital_status'],
                       bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary,
                       selectcolor=self.theme.palette.bg_app, activebackground=self.theme.palette.bg_app,
                       font=self.theme.fonts.body).pack(side=tk.LEFT, padx=(0, 8))
        tk.Radiobutton(marital_row, text='Married', value='Married', variable=vars_['marital_status'],
                       bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary,
                       selectcolor=self.theme.palette.bg_app, activebackground=self.theme.palette.bg_app,
                       font=self.theme.fonts.body).pack(side=tk.LEFT)

        lang_row = tk.Frame(form, bg=self.theme.palette.bg_app)
        lang_row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(lang_row, text='Language:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_['language'] = tk.StringVar(value=(customer.get('language', 'Sinhala') if customer else 'Sinhala') or 'Sinhala')
        for text, value in [('Sinhala', 'Sinhala'), ('Tamil', 'Tamil'), ('English', 'English')]:
            tk.Radiobutton(lang_row, text=text, value=value, variable=vars_['language'],
                           bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary,
                           selectcolor=self.theme.palette.bg_app, activebackground=self.theme.palette.bg_app,
                           font=self.theme.fonts.body).pack(side=tk.LEFT, padx=(0, 8))

        def save():
            nic = vars_['nic'].get().strip()
            name = vars_['name'].get().strip()
            phone = vars_['phone'].get().strip()
            birthday = vars_['birthday'].get().strip()
            job = vars_['job'].get().strip()
            marital_status = vars_['marital_status'].get().strip() or 'Unmarried'
            language = vars_['language'].get().strip() or 'Sinhala'
            address = vars_['address'].get().strip()
            if not nic or not name or not phone:
                messagebox.showwarning('Validation', 'NIC, Name, and Phone are required.', parent=win)
                return
            if customer:
                update_customer(customer['id'], name, phone, address, birthday, job, marital_status, language)
                messagebox.showinfo('Success', 'Customer updated.', parent=win)
            else:
                cid, msg = create_customer(nic, name, phone, address, birthday, job, marital_status, language)
                if cid:
                    messagebox.showinfo('Success', 'Customer created.', parent=win)
                else:
                    messagebox.showerror('Error', msg, parent=win)
                    return
            win.destroy()
            self._do_search()

        self.theme.make_button(form, text='Save', command=save, kind='primary',
                               width=20, pady=10).pack(pady=(16, 0), fill=tk.X)

    def _show_customer_loans(self, customer):
        loans = search_loans(customer['nic'])
        if not loans:
            messagebox.showinfo('Loans', f'No loans found for {customer["name"]}.')
            return

        win = tk.Toplevel(self.container)
        win.title(f'Loans - {customer["name"]}')
        win.geometry('600x400')
        win.configure(bg=self.theme.palette.bg_app)

        tk.Label(win, text=f'Loans for {customer["name"]}', font=self.theme.fonts.h2,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(pady=(16, 10))

        list_wrap = tk.Frame(win, bg=self.theme.palette.bg_app)
        list_wrap.pack(fill=tk.BOTH, expand=True, padx=16, pady=(0, 14))

        canvas = tk.Canvas(list_wrap, bg=self.theme.palette.bg_app, highlightthickness=0, bd=0)
        scrollbar = self.theme.make_scrollbar(list_wrap, canvas.yview)
        scroll_inner = tk.Frame(canvas, bg=self.theme.palette.bg_app)

        inner_window = canvas.create_window((0, 0), window=scroll_inner, anchor='nw')
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        scroll_inner.bind('<Configure>', lambda _e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfig(inner_window, width=e.width))

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

        canvas.bind('<Enter>', lambda _e: win.bind_all('<MouseWheel>', _on_mousewheel))
        canvas.bind('<Leave>', lambda _e: win.unbind_all('<MouseWheel>'))

        for loan in loans:
            lf = tk.Frame(scroll_inner, bg=self.theme.palette.bg_surface, highlightthickness=1,
                          highlightbackground=self.theme.palette.border)
            lf.pack(fill=tk.X, pady=4)
            from utils import get_status_text, get_status_color
            st = get_status_text(loan['status'], loan['expire_date'])
            sc = get_status_color(loan['status'], loan['expire_date'])
            tk.Label(lf, text=f"{loan['ticket_no']}  |  {format_currency(loan['loan_amount'])}  |  ",
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=10, pady=8)
            tk.Label(lf, text=st, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=sc).pack(side=tk.LEFT)
            tk.Label(lf, text=f"  |  {format_date(loan['expire_date'])}",
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
            view_btn = tk.Label(lf, text='View →', font=self.theme.fonts.body_bold, cursor='hand2',
                                bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent)
            view_btn.pack(side=tk.RIGHT, padx=10)
            view_btn.bind('<Button-1>', lambda e, lid=loan['id']: (win.destroy(), self.navigate('loan_detail', lid)))
