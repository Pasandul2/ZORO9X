"""Admin Settings Page for Gold Loan System."""

import tkinter as tk
from tkinter import ttk, messagebox
from database import (get_all_market_rates, set_market_rate, get_all_duration_rates,
                      set_duration_rate, delete_duration_rate, get_all_users,
                      create_user, update_user, get_setting, set_setting, get_duration_rate,
                      get_article_types, set_article_types)
from utils import format_currency


class AdminSettingsPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        if self.user['role'] != 'admin':
            tk.Label(self.container, text='⛔ Access Denied - Admin Only',
                     font=self.theme.fonts.h1, bg=self.theme.palette.bg_app,
                     fg=self.theme.palette.danger).pack(pady=40)
            return

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        tk.Label(hdr, text='⚙️ Admin Settings', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Tabs
        tab_frame = tk.Frame(view, bg=self.theme.palette.bg_app)
        tab_frame.pack(fill=tk.X, pady=(0, 10))

        self.tab_content = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.tab_content.pack(fill=tk.BOTH, expand=True)

        tabs = [
            ('💰 Market Rates', self._show_market_rates),
            ('📊 Duration & Interest', self._show_duration_rates),
            ('💍 Article Types', self._show_article_types),
            ('👤 User Management', self._show_users),
            ('🏢 Company Settings', self._show_company_settings),
        ]
        for text, cmd in tabs:
            btn = self.theme.make_button(tab_frame, text=text, command=cmd, kind='ghost', width=18, pady=8)
            btn.pack(side=tk.LEFT, padx=(0, 6))

        self._show_market_rates()

    def _clear_tab(self):
        for w in self.tab_content.winfo_children():
            w.destroy()

    # ── Market Rates ──
    def _show_market_rates(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='Gold Market Rates (Rs. per 8 grams / 1 poun)', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        tk.Label(card.inner, text='Set the current market rate per 8 grams (1 poun) for each carat level.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 12))

        rates = get_all_market_rates()
        all_durs = get_all_duration_rates(carat=22)
        durs = sorted(list(set(d['duration_months'] for d in all_durs)))

        self.rate_vars = {}

        # Horizontally scrollable container to handle many durations (columns)
        container = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        container.pack(fill=tk.X, padx=14, pady=(0, 14))

        canvas = tk.Canvas(container, bg=self.theme.palette.bg_surface, highlightthickness=0)
        xbar = ttk.Scrollbar(container, orient=tk.HORIZONTAL, command=canvas.xview)
        canvas.configure(xscrollcommand=xbar.set)

        xbar.pack(side=tk.BOTTOM, fill=tk.X)
        canvas.pack(side=tk.TOP, fill=tk.BOTH, expand=True)

        grid = tk.Frame(canvas, bg=self.theme.palette.bg_surface)
        canvas.create_window((0, 0), window=grid, anchor='nw')

        def on_configure(event):
            canvas.configure(scrollregion=canvas.bbox("all"))
            canvas.config(height=grid.winfo_reqheight())
        grid.bind("<Configure>", on_configure)

        # Header
        headers = ['Carat', 'Rate/8g (Rs.)'] + [f'{m}m Assessed' for m in durs]
        for i, h in enumerate(headers):
            tk.Label(grid, text=h, font=self.theme.fonts.body_bold, width=12,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted,
                     anchor='w').grid(row=0, column=i, padx=3, pady=4, sticky='w')

        for idx, rate in enumerate(rates):
            carat = rate['carat']
            tk.Label(grid, text=f'{carat}K', font=self.theme.fonts.body_bold, width=12,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                     anchor='w').grid(row=idx + 1, column=0, padx=3, pady=3, sticky='w')

            var = tk.StringVar(value=str(rate['rate_per_gram']))
            self.rate_vars[carat] = var
            entry = self.theme.make_entry(grid, variable=var, width=12)
            entry.grid(row=idx + 1, column=1, padx=3, pady=3, sticky='w')
            
            for col, m in enumerate(durs, start=2):
                dur_rate = get_duration_rate(m, carat)
                if dur_rate:
                    av = rate['rate_per_gram'] * (dur_rate['assessed_percentage'] / 100)
                    tk.Label(grid, text=f"{av:,.0f}", font=self.theme.fonts.body_bold, width=12,
                             bg=self.theme.palette.bg_surface, fg=self.theme.palette.info,
                             anchor='w').grid(row=idx + 1, column=col, padx=3, pady=3, sticky='w')

        btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_frame, text='💾 Save All Rates', command=self._save_rates,
                               kind='primary', width=18, pady=8).pack(side=tk.LEFT)

    def _save_rates(self):
        for carat, var in self.rate_vars.items():
            try:
                rate = float(var.get())
                set_market_rate(carat, rate, self.user['id'])
            except ValueError:
                messagebox.showwarning('Error', f'Invalid rate for {carat}K.')
                return
                
        messagebox.showinfo('Success', 'Market rates updated successfully.')
        self._show_market_rates()

    # ── Duration Rates ──
    def _show_duration_rates(self, selected_carat="All Carats"):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='Duration-based Assessed Value & Interest Rates', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 4))
        tk.Label(card.inner, text='Configure assessed value percentage and interest rates for each loan duration.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 12))

        # Carat Selector
        sel_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        sel_frame.pack(fill=tk.X, padx=14, pady=(0, 10))
        tk.Label(sel_frame, text='Target Carat:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        carats = [16, 17, 18, 19, 20, 21, 22, 23, 24]
        carat_options = ["All Carats"] + [f"{c}K" for c in carats]
        self.duration_carat_var = tk.StringVar(value=selected_carat)
        cb = self.theme.make_combobox(
            sel_frame, 
            variable=self.duration_carat_var, 
            values=carat_options, 
            width=14, 
            command=lambda val: self._show_duration_rates(val)
        )
        cb.pack(side=tk.LEFT, padx=(8, 0))

        query_carat = 22 if selected_carat == "All Carats" else int(selected_carat.replace('K', ''))
        rates = get_all_duration_rates(query_carat)
        self.dur_widgets = []

        grid = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        grid.pack(fill=tk.X, padx=14, pady=(0, 10))

        headers = ['Duration', 'Assessed %', 'Interest %/month', 'Overdue %/month', 'Max Months Cap', 'Action']
        for i, h in enumerate(headers):
            tk.Label(grid, text=h, font=self.theme.fonts.body_bold, width=12,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted,
                     anchor='w').grid(row=0, column=i, padx=3, pady=4, sticky='w')

        for idx, rate in enumerate(rates):
            row = idx + 1
            tk.Label(grid, text=f"{rate['duration_months']} month(s)", font=self.theme.fonts.body,
                     width=12, bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary,
                     anchor='w').grid(row=row, column=0, padx=3, pady=3, sticky='w')

            vars_ = {}
            for col, key in [(1, 'assessed_percentage'), (2, 'interest_rate'), (3, 'overdue_interest_rate'), (4, 'max_interest_months')]:
                var = tk.StringVar(value=str(rate[key]) if key in rate else ('3' if key == 'max_interest_months' else ''))
                vars_[key] = var
                self.theme.make_entry(grid, variable=var, width=10).grid(row=row, column=col, padx=3, pady=3, sticky='w')

            self.dur_widgets.append((rate['duration_months'], vars_))

            del_lbl = tk.Label(grid, text='🗑️', font=self.theme.fonts.body, cursor='hand2',
                               bg=self.theme.palette.bg_surface, fg=self.theme.palette.danger)
            del_lbl.grid(row=row, column=5, padx=3, pady=3)
            del_lbl.bind('<Button-1>', lambda e, m=rate['duration_months']: self._delete_duration(m))

        # Add new
        add_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        add_frame.pack(fill=tk.X, padx=14, pady=(8, 4))
        tk.Label(add_frame, text='Add Duration:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.new_dur_var = tk.StringVar()
        self.theme.make_entry(add_frame, variable=self.new_dur_var, width=8).pack(side=tk.LEFT, padx=(8, 4))
        tk.Label(add_frame, text='month(s)', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 8))
        self.new_pct_var = tk.StringVar(value='85')
        self.theme.make_entry(add_frame, variable=self.new_pct_var, width=8).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(add_frame, text='%', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 8))
        self.new_int_var = tk.StringVar(value='2.5')
        self.theme.make_entry(add_frame, variable=self.new_int_var, width=8).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(add_frame, text='%int', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 8))
        self.new_over_var = tk.StringVar(value='5.0')
        self.theme.make_entry(add_frame, variable=self.new_over_var, width=8).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(add_frame, text='%overdue', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 8))
        self.new_max_int_var = tk.StringVar(value='3')
        self.theme.make_entry(add_frame, variable=self.new_max_int_var, width=8).pack(side=tk.LEFT, padx=(0, 4))
        tk.Label(add_frame, text='max months', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)

        btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=(8, 14))
        self.theme.make_button(btn_frame, text='💾 Save All', command=self._save_durations,
                               kind='primary', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 8))
        self.theme.make_button(btn_frame, text='➕ Add Duration', command=self._add_duration,
                               kind='ghost', width=14, pady=8).pack(side=tk.LEFT)

    def _save_durations(self):
        selected = self.duration_carat_var.get()
        target_carats = [16, 17, 18, 19, 20, 21, 22, 23, 24] if selected == "All Carats" else [int(selected.replace('K', ''))]
        for months, vars_ in self.dur_widgets:
            try:
                pct = float(vars_['assessed_percentage'].get())
                ir = float(vars_['interest_rate'].get())
                od = float(vars_['overdue_interest_rate'].get())
                max_int_months = int(vars_['max_interest_months'].get()) if 'max_interest_months' in vars_ else 3
                for ct in target_carats:
                    set_duration_rate(months, ct, pct, ir, od, max_int_months)
            except ValueError:
                messagebox.showwarning('Error', f'Invalid values for {months} month(s).')
                return
        messagebox.showinfo('Success', 'Duration rates updated.')

    def _add_duration(self):
        try:
            months = int(self.new_dur_var.get())
            pct = float(self.new_pct_var.get())
            ir = float(self.new_int_var.get())
            od = float(self.new_over_var.get())
            max_int_months = int(self.new_max_int_var.get())
        except ValueError:
            messagebox.showwarning('Error', 'Please enter valid values.')
            return
            
        selected = self.duration_carat_var.get()
        target_carats = [16, 17, 18, 19, 20, 21, 22, 23, 24] if selected == "All Carats" else [int(selected.replace('K', ''))]
        for ct in target_carats:
            set_duration_rate(months, ct, pct, ir, od, max_int_months)
            
        messagebox.showinfo('Success', f'{months} month duration added.')
        self._show_duration_rates(selected)

    def _delete_duration(self, months):
        if messagebox.askyesno('Delete', f'Remove {months} month duration?'):
            selected = self.duration_carat_var.get()
            target_carats = [16, 17, 18, 19, 20, 21, 22, 23, 24] if selected == "All Carats" else [int(selected.replace('K', ''))]
            for ct in target_carats:
                delete_duration_rate(months, ct)
            self._show_duration_rates(selected)

    # ── Article Types ──
    def _show_article_types(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='Gold Article Types', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 4))
        tk.Label(card.inner, text='Manage article types used in new loan ticket entry.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 10))

        self.article_types = get_article_types()

        body = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        body.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 10))

        list_wrap = tk.Frame(body, bg=self.theme.palette.bg_surface)
        list_wrap.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=(0, 10))

        self.article_types_list = tk.Listbox(
            list_wrap,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground='white',
            activestyle='none',
            height=14,
        )
        self.article_types_list.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.article_types_list.bind('<<ListboxSelect>>', self._on_article_type_select)

        ybar = ttk.Scrollbar(list_wrap, orient=tk.VERTICAL, command=self.article_types_list.yview)
        ybar.pack(side=tk.RIGHT, fill=tk.Y)
        self.article_types_list.configure(yscrollcommand=ybar.set)

        controls = tk.Frame(body, bg=self.theme.palette.bg_surface)
        controls.pack(side=tk.LEFT, fill=tk.Y)

        tk.Label(controls, text='Type Name', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 6))
        self.article_type_name_var = tk.StringVar()
        self.theme.make_entry(controls, variable=self.article_type_name_var, width=24).pack(anchor='w', pady=(0, 10))

        self.theme.make_button(controls, text='➕ Add', command=self._add_article_type,
                               kind='ghost', width=18, pady=6).pack(anchor='w', pady=(0, 6))
        self.theme.make_button(controls, text='✏️ Update Selected', command=self._edit_article_type,
                               kind='ghost', width=18, pady=6).pack(anchor='w', pady=(0, 6))
        self.theme.make_button(controls, text='🗑️ Delete Selected', command=self._delete_article_type,
                               kind='danger', width=18, pady=6).pack(anchor='w', pady=(0, 6))

        btn_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_row.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_row, text='💾 Save Article Types', command=self._save_article_types,
                               kind='primary', width=20, pady=8).pack(side=tk.LEFT)

        self._refresh_article_type_listbox()

    def _refresh_article_type_listbox(self):
        self.article_types_list.delete(0, tk.END)
        for item in self.article_types:
            self.article_types_list.insert(tk.END, item)

    def _on_article_type_select(self, _event=None):
        sel = self.article_types_list.curselection()
        if not sel:
            return
        self.article_type_name_var.set(self.article_types[sel[0]])

    def _add_article_type(self):
        name = self.article_type_name_var.get().strip()
        if not name:
            messagebox.showwarning('Article Types', 'Enter a type name.')
            return

        if any(name.lower() == t.lower() for t in self.article_types):
            messagebox.showwarning('Article Types', 'Type already exists.')
            return

        self.article_types.append(name)
        self.article_type_name_var.set('')
        self._refresh_article_type_listbox()

    def _edit_article_type(self):
        sel = self.article_types_list.curselection()
        if not sel:
            messagebox.showwarning('Article Types', 'Select an item to edit.')
            return

        name = self.article_type_name_var.get().strip()
        if not name:
            messagebox.showwarning('Article Types', 'Enter a new type name.')
            return

        idx = sel[0]
        if any(i != idx and name.lower() == t.lower() for i, t in enumerate(self.article_types)):
            messagebox.showwarning('Article Types', 'Type already exists.')
            return

        self.article_types[idx] = name
        self._refresh_article_type_listbox()
        self.article_types_list.selection_set(idx)

    def _delete_article_type(self):
        sel = self.article_types_list.curselection()
        if not sel:
            messagebox.showwarning('Article Types', 'Select an item to delete.')
            return

        if len(self.article_types) <= 1:
            messagebox.showwarning('Article Types', 'At least one type is required.')
            return

        idx = sel[0]
        item = self.article_types[idx]
        if not messagebox.askyesno('Delete Type', f'Delete article type "{item}"?'):
            return

        self.article_types.pop(idx)
        self.article_type_name_var.set('')
        self._refresh_article_type_listbox()

    def _save_article_types(self):
        ok, msg = set_article_types(self.article_types, self.user['id'])
        if ok:
            messagebox.showinfo('Success', msg)
            self._show_article_types()
        else:
            messagebox.showwarning('Article Types', msg)

    # ── User Management ──
    def _show_users(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        hdr_f = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        hdr_f.pack(fill=tk.X, padx=14, pady=(10, 8))
        tk.Label(hdr_f, text='User Management', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_button(hdr_f, text='➕ Add User', command=self._add_user_form,
                               kind='primary', width=12, pady=6).pack(side=tk.RIGHT)

        users = get_all_users()
        tbl = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        tbl.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 14))

        cols = ['ID', 'Username', 'Full Name', 'Role', 'Status', 'Actions']
        p_widths = [50, 140, 200, 100, 100, 120]  # Pixel widths for strict alignment
        hdr = tk.Frame(tbl, bg=self.theme.palette.bg_surface_alt)
        hdr.pack(fill=tk.X)
        for col, w in zip(cols, p_widths):
            f = tk.Frame(hdr, bg=self.theme.palette.bg_surface_alt, width=w, height=30)
            f.pack_propagate(False)
            f.pack(side=tk.LEFT, padx=3, pady=5)
            tk.Label(f, text=col, font=self.theme.fonts.body_bold, anchor='w',
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, fill=tk.BOTH)

        for u in users:
            row = tk.Frame(tbl, bg=self.theme.palette.bg_surface)
            row.pack(fill=tk.X)
            tk.Frame(tbl, bg=self.theme.palette.border, height=1).pack(fill=tk.X)

            status = 'Active' if u['is_active'] else 'Inactive'
            st_color = self.theme.palette.success if u['is_active'] else self.theme.palette.danger
            vals = [str(u['id']), u['username'], u['full_name'], u['role'].upper(), status]
            colors = [self.theme.palette.text_muted, self.theme.palette.text_primary,
                      self.theme.palette.text_primary, self.theme.palette.accent, st_color]

            for val, w, fg in zip(vals, p_widths[:-1], colors):
                f = tk.Frame(row, bg=self.theme.palette.bg_surface, width=w, height=30)
                f.pack_propagate(False)
                f.pack(side=tk.LEFT, padx=3, pady=4)
                tk.Label(f, text=val, font=self.theme.fonts.body, anchor='w',
                         bg=self.theme.palette.bg_surface, fg=fg).pack(side=tk.LEFT, fill=tk.BOTH)

            act_f = tk.Frame(row, bg=self.theme.palette.bg_surface, width=p_widths[-1], height=30)
            act_f.pack_propagate(False)
            act_f.pack(side=tk.LEFT, padx=3, pady=4)
            edit_lbl = tk.Label(act_f, text='✏️ Edit', font=self.theme.fonts.small, cursor='hand2',
                                bg=self.theme.palette.bg_surface, fg=self.theme.palette.accent)
            edit_lbl.pack(side=tk.LEFT)
            edit_lbl.bind('<Button-1>', lambda e, uid=u: self._edit_user_form(uid))

    def _add_user_form(self):
        self._user_form()

    def _edit_user_form(self, user_data):
        self._user_form(user_data)

    def _user_form(self, user_data=None):
        win = tk.Toplevel(self.container)
        win.title('Edit User' if user_data else 'Add User')
        win.geometry('420x420')
        win.configure(bg=self.theme.palette.bg_app)
        win.grab_set()

        tk.Label(win, text='Edit User' if user_data else 'New User',
                 font=self.theme.fonts.h2, bg=self.theme.palette.bg_app,
                 fg=self.theme.palette.text_primary).pack(pady=(20, 16))

        form = tk.Frame(win, bg=self.theme.palette.bg_app)
        form.pack(padx=30, fill=tk.X)

        username_var = tk.StringVar(value=user_data['username'] if user_data else '')
        fullname_var = tk.StringVar(value=user_data['full_name'] if user_data else '')
        password_var = tk.StringVar()
        role_var = tk.StringVar(value=user_data['role'] if user_data else 'cashier')
        active_var = tk.BooleanVar(value=user_data['is_active'] if user_data else True)

        for label, var, readonly in [
            ('Username:', username_var, user_data is not None),
            ('Full Name:', fullname_var, False),
            ('Password:', password_var, False),
        ]:
            r = tk.Frame(form, bg=self.theme.palette.bg_app)
            r.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r, text=label, font=self.theme.fonts.body_bold, width=10, anchor='w',
                     bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            masked = label == 'Password:'
            self.theme.make_entry(r, variable=var, readonly=readonly, masked=masked).pack(side=tk.LEFT, fill=tk.X, expand=True)

        # Role
        r = tk.Frame(form, bg=self.theme.palette.bg_app)
        r.pack(fill=tk.X, pady=(0, 8))
        tk.Label(r, text='Role:', font=self.theme.fonts.body_bold, width=10, anchor='w',
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_combobox(
            r,
            variable=role_var,
            values=['admin', 'cashier'],
            width=14
        ).pack(side=tk.LEFT)

        # Active
        tk.Checkbutton(form, text='Active', variable=active_var,
                       bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary,
                       font=self.theme.fonts.body).pack(anchor='w', pady=(0, 8))

        if user_data:
            tk.Label(form, text='Leave password blank to keep current.',
                     font=self.theme.fonts.small, bg=self.theme.palette.bg_app,
                     fg=self.theme.palette.text_muted).pack(anchor='w')

        def save():
            uname = username_var.get().strip()
            fname = fullname_var.get().strip()
            pwd = password_var.get().strip()
            role = role_var.get()
            active = 1 if active_var.get() else 0

            if not uname or not fname:
                messagebox.showwarning('Validation', 'Username and Full Name required.', parent=win)
                return

            if user_data:
                update_user(user_data['id'], fname, role, active, pwd if pwd else None)
                messagebox.showinfo('Success', 'User updated.', parent=win)
            else:
                if not pwd:
                    messagebox.showwarning('Validation', 'Password required for new user.', parent=win)
                    return
                ok, msg = create_user(uname, pwd, fname, role)
                if ok:
                    messagebox.showinfo('Success', msg, parent=win)
                else:
                    messagebox.showerror('Error', msg, parent=win)
                    return

            win.destroy()
            self._show_users()

        self.theme.make_button(form, text='Save', command=save, kind='primary',
                               width=20, pady=10).pack(pady=(16, 0), fill=tk.X)

    # ── Company Settings ──
    def _show_company_settings(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.X)

        tk.Label(card.inner, text='Company Settings', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 8))

        form = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        form.pack(fill=tk.X, padx=14, pady=(0, 14))

        settings = [
            ('Company Name:', 'company_name'),
            ('Phone:', 'company_phone'),
            ('Address:', 'company_address'),
            ('Ticket Prefix:', 'ticket_prefix'),
            ('Other Bank Service Charge %:', 'other_bank_service_charge_pct'),
        ]
        self._locked_company_keys = {'company_name', 'company_phone', 'company_address'}

        self.setting_vars = {}
        for label, key in settings:
            r = tk.Frame(form, bg=self.theme.palette.bg_surface)
            r.pack(fill=tk.X, pady=(0, 8))
            tk.Label(r, text=label, font=self.theme.fonts.body_bold, width=14, anchor='w',
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
            var = tk.StringVar(value=get_setting(key))
            self.setting_vars[key] = var
            self.theme.make_entry(r, variable=var, readonly=(key in self._locked_company_keys)).pack(side=tk.LEFT, fill=tk.X, expand=True)

        tk.Label(
            form,
            text='Company Name, Phone, and Address are managed by your web subscription profile.',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
            anchor='w',
        ).pack(fill=tk.X, pady=(0, 6))

        self.theme.make_button(form, text='💾 Save Settings', command=self._save_company_settings,
                               kind='primary', width=18, pady=8).pack(pady=(8, 0))

    def _save_company_settings(self):
        try:
            sc = float(self.setting_vars.get('other_bank_service_charge_pct', tk.StringVar(value='0')).get().strip() or '0')
            if sc < 0:
                raise ValueError
        except ValueError:
            messagebox.showwarning('Validation', 'Other Bank Service Charge % must be a valid non-negative number.')
            return

        locked_keys = getattr(self, '_locked_company_keys', set())
        for key, var in self.setting_vars.items():
            if key in locked_keys:
                continue
            set_setting(key, var.get().strip(), user_id=self.user['id'])
        messagebox.showinfo('Success', 'Company settings saved.')
