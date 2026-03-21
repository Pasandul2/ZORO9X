"""Customer Management Page for Gold Loan System."""

import tkinter as tk
from tkinter import messagebox
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

        # Search & Add bar
        bar_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        bar_card.pack(fill=tk.X, pady=(0, 10))
        bar = tk.Frame(bar_card.inner, bg=self.theme.palette.bg_surface)
        bar.pack(fill=tk.X, padx=14, pady=10)

        tk.Label(bar, text='Search:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.search_var = tk.StringVar()
        self.theme.make_entry(bar, variable=self.search_var, width=25).pack(side=tk.LEFT, padx=(8, 12))
        self.theme.make_button(bar, text='🔍 Search', command=self._do_search,
                               kind='primary', width=10, pady=6).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(bar, text='➕ Add Customer', command=self._show_add_form,
                               kind='primary', width=14, pady=6).pack(side=tk.RIGHT)

        # Results
        self.results_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        self.results_card.pack(fill=tk.BOTH, expand=True)
        self.results_frame = self.results_card.inner
        self._do_search()

    def _do_search(self):
        for w in self.results_frame.winfo_children():
            w.destroy()

        customers = search_customers(self.search_var.get().strip())
        tk.Label(self.results_frame, text=f'Found {len(customers)} customer(s)',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 6))

        tbl = tk.Frame(self.results_frame, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        cols = ['NIC', 'Name', 'Phone', 'Address', 'Actions']
        widths = [14, 18, 14, 20, 14]

        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for col, w in zip(cols, widths):
            tk.Label(hdr, text=col, font=self.theme.fonts.body_bold, width=w, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=3, pady=6)

        for cust in customers:
            row = tk.Frame(tbl, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            vals = [cust['nic'], cust['name'], cust['phone'], cust.get('address', '') or '-']
            for val, w in zip(vals, widths[:-1]):
                tk.Label(row, text=val, font=self.theme.fonts.body, width=w, anchor='w',
                         bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=3, pady=5)

            af = tk.Frame(row, bg=self.theme.palette.bg_surface)
            af.pack(side=tk.LEFT)
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

    def _show_form(self, customer=None):
        win = tk.Toplevel(self.container)
        win.title('Edit Customer' if customer else 'Add Customer')
        win.geometry('420x350')
        win.configure(bg=self.theme.palette.bg_app)
        win.grab_set()

        tk.Label(win, text='Edit Customer' if customer else 'New Customer',
                 font=self.theme.fonts.h2, bg=self.theme.palette.bg_app,
                 fg=self.theme.palette.text_primary).pack(pady=(20, 16))

        form = tk.Frame(win, bg=self.theme.palette.bg_app)
        form.pack(padx=30, fill=tk.X)

        vars_ = {}
        fields = [('NIC / ID:', 'nic'), ('Name:', 'name'), ('Phone:', 'phone'), ('Address:', 'address')]
        for label, key in fields:
            r = tk.Frame(form, bg=self.theme.palette.bg_app)
            r.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r, text=label, font=self.theme.fonts.body_bold, width=10, anchor='w',
                     bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            var = tk.StringVar(value=customer.get(key, '') if customer else '')
            vars_[key] = var
            entry = self.theme.make_entry(r, variable=var, readonly=(key == 'nic' and customer is not None))
            entry.pack(side=tk.LEFT, fill=tk.X, expand=True)

        def save():
            nic = vars_['nic'].get().strip()
            name = vars_['name'].get().strip()
            phone = vars_['phone'].get().strip()
            address = vars_['address'].get().strip()
            if not nic or not name or not phone:
                messagebox.showwarning('Validation', 'NIC, Name, and Phone are required.', parent=win)
                return
            if customer:
                update_customer(customer['id'], name, phone, address)
                messagebox.showinfo('Success', 'Customer updated.', parent=win)
            else:
                cid, msg = create_customer(nic, name, phone, address)
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

        for loan in loans:
            lf = tk.Frame(win, bg=self.theme.palette.bg_surface, highlightthickness=1,
                          highlightbackground=self.theme.palette.border)
            lf.pack(fill=tk.X, padx=16, pady=4)
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
