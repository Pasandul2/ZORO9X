"""Admin Settings Page for Gold Loan System."""

import os
import sys
from pathlib import Path
from datetime import datetime
import tkinter as tk
from tkinter import ttk, messagebox, filedialog, colorchooser
import re
import webbrowser
import win32print
import win32con
from database import (get_all_market_rates, set_market_rate, get_all_duration_rates,
                      set_duration_rate, delete_duration_rate, get_all_users,
                      create_user, update_user, get_setting, set_setting, get_duration_rate,
                      get_article_types, set_article_types, set_other_charges)
from utils import format_currency
from backup_manager import get_backup_manager, BackupManager


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
        tab_row1 = tk.Frame(view, bg=self.theme.palette.bg_app)
        tab_row1.pack(fill=tk.X, pady=(0, 5))

        tab_row2 = tk.Frame(view, bg=self.theme.palette.bg_app)
        tab_row2.pack(fill=tk.X, pady=(0, 10))

        self.tab_content = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.tab_content.pack(fill=tk.BOTH, expand=True)

        tabs = [
            ('💰 Market Rates', self._show_market_rates),
            ('📊 Duration & Interest', self._show_duration_rates),
            ('� Other Charges', self._show_other_charges),
            ('💍 Article Types', self._show_article_types),
            ('👤 User Management', self._show_users),
            ('🖨 Printer Settings', self._show_printer_settings),
            ('🏢 Company Settings', self._show_company_settings),
            (' Backup & Restore', self._show_backup_restore),
        ]
        tabs1 = tabs[:4]
        tabs2 = tabs[4:]
        for text, cmd in tabs1:
            btn = self.theme.make_button(tab_row1, text=text, command=cmd, kind='ghost', width=18, pady=8)
            btn.pack(side=tk.LEFT, padx=(0, 6))
        for text, cmd in tabs2:
            btn = self.theme.make_button(tab_row2, text=text, command=cmd, kind='ghost', width=18, pady=8)
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

    # ── Other Charges ──
    def _show_other_charges(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='Renewal & Redemption Charges', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 4))
        tk.Label(card.inner, text='Set default charges applied during renewal and redemption.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 12))

        # Get current values
        renewal_charge = get_setting('other_charges_renewal', '0')
        redeem_charge = get_setting('other_charges_redeem', '0')

        # Main container with two fields
        form = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        form.pack(fill=tk.X, padx=14, pady=(0, 14))

        # Renewal Charges
        r1 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r1.pack(fill=tk.X, pady=(0, 12))
        tk.Label(r1, text='🔄 Renewal Other Charge:', font=self.theme.fonts.body_bold, width=24, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.renewal_charge_var = tk.StringVar(value=renewal_charge)
        self.theme.make_entry(r1, variable=self.renewal_charge_var, width=16).pack(side=tk.LEFT)
        tk.Label(r1, text='Rs.', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(6, 0))

        # Redemption Charges
        r2 = tk.Frame(form, bg=self.theme.palette.bg_surface)
        r2.pack(fill=tk.X, pady=(0, 12))
        tk.Label(r2, text='💳 Redemption Other Charge:', font=self.theme.fonts.body_bold, width=24, anchor='w',
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.redeem_charge_var = tk.StringVar(value=redeem_charge)
        self.theme.make_entry(r2, variable=self.redeem_charge_var, width=16).pack(side=tk.LEFT)
        tk.Label(r2, text='Rs.', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(6, 0))

        # Save button
        btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, padx=14, pady=(0, 14))
        self.theme.make_button(btn_frame, text='💾 Save Charges', command=self._save_other_charges,
                               kind='primary', width=16, pady=10).pack(fill=tk.X)

    def _save_other_charges(self):
        try:
            renewal_charge = float(self.renewal_charge_var.get() or 0)
            redeem_charge = float(self.redeem_charge_var.get() or 0)
            set_setting('other_charges_renewal', str(renewal_charge))
            set_setting('other_charges_redeem', str(redeem_charge))
        except ValueError:
            messagebox.showwarning('Error', 'Please enter valid charge amounts.')
            return
        messagebox.showinfo('Success', 'Charges updated successfully.')

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

        logo_row = tk.Frame(form, bg=self.theme.palette.bg_surface)
        logo_row.pack(fill=tk.X, pady=(2, 10))
        tk.Label(
            logo_row,
            text='Logo:',
            font=self.theme.fonts.body_bold,
            width=14,
            anchor='w',
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(side=tk.LEFT)

        logo_path = Path(__file__).resolve().parent.parent / 'logo.png'
        if not logo_path.exists():
            logo_path = Path(__file__).resolve().parent.parent / 'pawn_ticket' / 'pms_logo.png'

        logo_preview_wrap = tk.Frame(logo_row, bg=self.theme.palette.bg_surface)
        logo_preview_wrap.pack(side=tk.LEFT, fill=tk.X, expand=True)

        if logo_path.exists():
            try:
                self.company_logo_preview_image = tk.PhotoImage(file=str(logo_path))
                max_dimension = max(self.company_logo_preview_image.width(), self.company_logo_preview_image.height())
                shrink_factor = max(1, int(max_dimension / 52))
                if shrink_factor > 1:
                    self.company_logo_preview_image = self.company_logo_preview_image.subsample(shrink_factor, shrink_factor)
                tk.Label(
                    logo_preview_wrap,
                    image=self.company_logo_preview_image,
                    bg=self.theme.palette.bg_surface,
                ).pack(anchor='w')
            except Exception:
                tk.Label(
                    logo_preview_wrap,
                    text=str(logo_path),
                    font=self.theme.fonts.small,
                    bg=self.theme.palette.bg_surface,
                    fg=self.theme.palette.text_muted,
                    anchor='w',
                ).pack(fill=tk.X)
        else:
            tk.Label(
                logo_preview_wrap,
                text='No logo found in installation folder',
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface,
                fg=self.theme.palette.text_muted,
                anchor='w',
            ).pack(fill=tk.X)

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

    # ── Printer Settings ──
    def _show_printer_settings(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='Printer Settings', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 4))
        tk.Label(card.inner, text='Configure Windows printer settings for different letter types.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 20))

        # Get list of printers
        try:
            self.available_printers = [printer[2] for printer in win32print.EnumPrinters(2)]
        except Exception:
            self.available_printers = ['Default Printer']

        # Default Printer Selection Section
        printer_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        printer_frame.pack(fill=tk.X, padx=14, pady=(0, 10))

        row1 = tk.Frame(printer_frame, bg=self.theme.palette.bg_surface)
        row1.pack(fill=tk.X, pady=(0, 8))

        tk.Label(row1, text='Default Printer:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.selected_printer_var = tk.StringVar(value=get_setting('default_printer', ''))
        printer_combo = ttk.Combobox(
            row1,
            textvariable=self.selected_printer_var,
            values=self.available_printers,
            state='readonly',
            width=40,
        )
        printer_combo.pack(side=tk.LEFT, padx=(8, 0))

        # Open Windows Printer Dialog checkbox
        row2 = tk.Frame(printer_frame, bg=self.theme.palette.bg_surface)
        row2.pack(fill=tk.X, pady=(0, 10))

        self.open_printer_dialog_var = tk.BooleanVar(value=get_setting('open_printer_dialog', 'true').lower() == 'true')
        dialog_check = tk.Checkbutton(
            row2,
            text='Open Windows Printer Dialog (uncheck for auto-print)',
            variable=self.open_printer_dialog_var,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            selectcolor=self.theme.palette.accent,
            font=self.theme.fonts.body,
        )
        dialog_check.pack(anchor='w')

        # Tabs for different letter types
        tab_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        tab_frame.pack(fill=tk.X, padx=14, pady=(0, 10))

        self.printer_settings_tabs = {}
        self.printer_settings_vars = {}

        letter_types = [
            ('pawn_ticket', '🎫 Pawn Ticket Template'),
            ('renew_ticket', '🔄 Renew Pawn Ticket'),
            ('redeem_ticket', '💰 Redeem Pawn Ticket'),
            ('letter_print', '📄 Letter Print'),
        ]

        for tab_key, tab_name in letter_types:
            btn = self.theme.make_button(
                tab_frame,
                text=tab_name,
                command=lambda key=tab_key: self._show_printer_settings_tab(key),
                kind='ghost',
                width=20,
                pady=5,
            )
            btn.pack(side=tk.LEFT, padx=(0, 6))

        self.current_printer_settings_tab = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        self.current_printer_settings_tab.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 10))

        # Show first tab by default
        self._show_printer_settings_tab('pawn_ticket')

        # Separator
        sep = tk.Frame(card.inner, bg=self.theme.palette.border, height=1)
        sep.pack(fill=tk.X, padx=14, pady=(10, 8))

        # Print Blank Ticket Template Section
        blank_ticket_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        blank_ticket_frame.pack(fill=tk.X, padx=14, pady=(0, 10))

        tk.Label(
            blank_ticket_frame,
            text='Blank Template',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', pady=(0, 8))

        tk.Label(
            blank_ticket_frame,
            text='Generate and print a blank pawn ticket template for manual filling.',
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
        ).pack(anchor='w', pady=(0, 8))

        self.theme.make_button(
            blank_ticket_frame,
            text='🖨️ Print Blank Ticket Template',
            command=self._print_blank_ticket_template,
            kind='secondary',
            width=30,
            pady=8,
        ).pack(anchor='w')

    def _show_printer_settings_tab(self, tab_key):
        """Display printer settings for a specific letter type."""
        for w in self.current_printer_settings_tab.winfo_children():
            w.destroy()

        self.current_tab_key = tab_key
        tab_names = {
            'pawn_ticket': 'Pawn Ticket Template',
            'renew_ticket': 'Renew Pawn Ticket',
            'redeem_ticket': 'Redeem Pawn Ticket',
            'letter_print': 'Letter Print',
        }

        tk.Label(
            self.current_printer_settings_tab,
            text=f'Settings: {tab_names[tab_key]}',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', pady=(0, 10))

        # Initialize variables if not exists
        if tab_key not in self.printer_settings_vars:
            self.printer_settings_vars[tab_key] = {}

        prefix = f'printer_{tab_key}_'
        vars_dict = self.printer_settings_vars[tab_key]

        # Color
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Color:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['color'] = tk.StringVar(value=get_setting(f'{prefix}color', 'Color'))
        ttk.Combobox(row, textvariable=vars_dict['color'], values=['Color', 'Monochrome', 'Grayscale'],
                     state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Paper Size
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Paper Size:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['paper_size'] = tk.StringVar(value=get_setting(f'{prefix}paper_size', 'A4'))
        ttk.Combobox(row, textvariable=vars_dict['paper_size'],
                     values=['A4', 'Letter', 'Legal', 'A5', 'A3'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Pages Per Sheet
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Pages Per Sheet:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['pages_per_sheet'] = tk.StringVar(value=get_setting(f'{prefix}pages_per_sheet', '1'))
        ttk.Combobox(row, textvariable=vars_dict['pages_per_sheet'],
                     values=['1', '2', '4', '6'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Margins
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Margins:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['margins'] = tk.StringVar(value=get_setting(f'{prefix}margins', 'Normal'))
        ttk.Combobox(row, textvariable=vars_dict['margins'],
                     values=['Normal', 'Narrow', 'Moderate', 'Wide', 'None'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Scale
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Scale:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['scale'] = tk.StringVar(value=get_setting(f'{prefix}scale', '100%'))
        ttk.Combobox(row, textvariable=vars_dict['scale'],
                     values=['75%', '80%', '90%', '100%', '110%', '125%'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Two-sided
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(row, text='Two-sided:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['two_sided'] = tk.StringVar(value=get_setting(f'{prefix}two_sided', 'Off'))
        ttk.Combobox(row, textvariable=vars_dict['two_sided'],
                     values=['Off', 'Long edge', 'Short edge'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Orientation
        row = tk.Frame(self.current_printer_settings_tab, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 12))
        tk.Label(row, text='Orientation:', font=self.theme.fonts.body_bold, width=15,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        vars_dict['orientation'] = tk.StringVar(value=get_setting(f'{prefix}orientation', 'Portrait'))
        ttk.Combobox(row, textvariable=vars_dict['orientation'],
                     values=['Portrait', 'Landscape'], state='readonly', width=20).pack(side=tk.LEFT, padx=(8, 0))

        # Save button
        self.theme.make_button(
            self.current_printer_settings_tab,
            text=f'💾 Save {tab_names[tab_key]} Settings',
            command=lambda: self._save_printer_settings_tab(tab_key),
            kind='primary',
            width=30,
            pady=8,
        ).pack(anchor='w')

    def _save_printer_settings_tab(self, tab_key):
        """Save printer settings for a specific letter type."""
        if tab_key not in self.printer_settings_vars:
            messagebox.showwarning('Printer Settings', 'Settings not loaded.')
            return

        prefix = f'printer_{tab_key}_'
        vars_dict = self.printer_settings_vars[tab_key]

        for key, var in vars_dict.items():
            set_setting(f'{prefix}{key}', var.get(), user_id=self.user['id'])

        set_setting('open_printer_dialog', str(self.open_printer_dialog_var.get()).lower(), user_id=self.user['id'])
        set_setting('default_printer', self.selected_printer_var.get(), user_id=self.user['id'])

        messagebox.showinfo('Success', 'Printer settings saved successfully.')

    def _save_selected_printer(self):
        selected_printer = (self.selected_printer_var.get() or '').strip()
        if not selected_printer:
            messagebox.showwarning('Printer Settings', 'Please select a printer first.')
            return
        
        # Save settings
        set_setting('default_printer', selected_printer, user_id=self.user['id'])
        set_setting('force_black_white', str(self.force_bw_var.get()).lower(), user_id=self.user['id'])
        
        # Set printer color mode if force black & white is enabled
        if self.force_bw_var.get():
            try:
                hPrinter = win32print.OpenPrinter(selected_printer)
                printer_info = win32print.GetPrinter(hPrinter, 2)
                if printer_info['pDevMode']:
                    printer_info['pDevMode'].dmColor = win32con.DMCOLOR_MONOCHROME
                    win32print.SetPrinter(hPrinter, 2, printer_info, 0)
                win32print.ClosePrinter(hPrinter)
            except Exception as e:
                messagebox.showwarning('Printer Settings', f'Could not set printer to black & white: {e}')
        
        messagebox.showinfo('Success', f'Default printer set to: {selected_printer}')

    def _load_pawn_ticket_template_html(self):
        template_path = self._resolve_ticket_asset_path('pawn_ticket_template.html')
        with open(template_path, 'r', encoding='utf-8') as template_file:
            return template_file.read()

    def _resolve_ticket_asset_path(self, filename):
        module_base = Path(__file__).resolve().parent.parent
        bundle_base = Path(getattr(sys, '_MEIPASS', '')) if getattr(sys, 'frozen', False) else None
        exe_base = Path(sys.executable).resolve().parent if getattr(sys, 'frozen', False) else None
        cwd_base = Path.cwd()

        candidates = [
            module_base / 'pawn_ticket' / filename,
            module_base / filename,
            cwd_base / 'pawn_ticket' / filename,
        ]

        if bundle_base:
            candidates.extend([
                bundle_base / 'pawn_ticket' / filename,
                bundle_base / filename,
            ])

        if exe_base:
            candidates.extend([
                exe_base / 'pawn_ticket' / filename,
                exe_base / filename,
            ])

        for candidate in candidates:
            if candidate.exists():
                return str(candidate)

        searched_paths = '\n'.join(str(path) for path in candidates)
        raise FileNotFoundError(
            f"Ticket template asset not found: {filename}. Searched:\n{searched_paths}"
        )

    def _build_blank_ticket_template_html(self):
        template = self._load_pawn_ticket_template_html()
        logo_path = None
        for logo_name in ('logo.png', 'pms_logo.png'):
            try:
                logo_path = Path(self._resolve_ticket_asset_path(logo_name))
                break
            except FileNotFoundError:
                continue
        logo_src = logo_path.as_uri() if logo_path and logo_path.exists() else ''
        blank_rows = (
            '<tr class="empty-space-row" style="height: 30mm; font-size: 12px;">'
            '<td></td><td></td><td></td><td></td><td></td>'
            '</tr>'
        )
        template = template.replace('{{LOGO_SRC}}', logo_src)
        template = template.replace('{{ITEM_ROWS_TOP}}', blank_rows)
        template = template.replace('{{ITEM_ROWS_BOTTOM}}', blank_rows)
        template = re.sub(r'\{\{[A-Z_]+\}\}', '', template)
        return template

    def _make_blank_template_download_path(self):
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        downloads = Path.home() / 'Downloads'
        downloads.mkdir(parents=True, exist_ok=True)
        return str(downloads / f'pawn_ticket_template_blank_{stamp}.html')

    def _print_blank_ticket_template(self):
        try:
            html_content = self._build_blank_ticket_template_html()
            html_content = html_content.replace(
                '</body>',
                '<script>window.onload=function(){window.print();};</script></body>',
                1,
            )
            file_path = self._make_blank_template_download_path()
            with open(file_path, 'w', encoding='utf-8') as output_file:
                output_file.write(html_content)
            webbrowser.open(Path(file_path).as_uri())
        except Exception as exc:
            messagebox.showerror('Template Print', f'Could not open blank template for printing:\n{exc}')

    def _save_selected_printer(self):
        selected_printer = (self.selected_printer_var.get() or '').strip()
        if not selected_printer:
            messagebox.showwarning('Printer Settings', 'Please select a printer first.')
            return
        
        # Save settings
        set_setting('default_printer', selected_printer, user_id=self.user['id'])
        set_setting('force_black_white', str(self.force_bw_var.get()).lower(), user_id=self.user['id'])
        
        # Set printer color mode if force black & white is enabled
        if self.force_bw_var.get():
            try:
                hPrinter = win32print.OpenPrinter(selected_printer)
                printer_info = win32print.GetPrinter(hPrinter, 2)
                if printer_info['pDevMode']:
                    printer_info['pDevMode'].dmColor = win32con.DMCOLOR_MONOCHROME
                    win32print.SetPrinter(hPrinter, 2, printer_info, 0)
                win32print.ClosePrinter(hPrinter)
            except Exception as e:
                messagebox.showwarning('Printer Settings', f'Could not set printer to black & white: {e}')
        
        messagebox.showinfo('Success', f'Default printer set to: {selected_printer}')

    def get_printer_settings_for_type(self, letter_type):
        """Retrieve saved printer settings for a specific letter type."""
        prefix = f'printer_{letter_type}_'
        return {
            'printer': get_setting('default_printer', ''),
            'open_dialog': get_setting('open_printer_dialog', 'true').lower() == 'true',
            'color': get_setting(f'{prefix}color', 'Color'),
            'paper_size': get_setting(f'{prefix}paper_size', 'A4'),
            'pages_per_sheet': get_setting(f'{prefix}pages_per_sheet', '1'),
            'margins': get_setting(f'{prefix}margins', 'Normal'),
            'scale': get_setting(f'{prefix}scale', '100%'),
            'two_sided': get_setting(f'{prefix}two_sided', 'Off'),
            'orientation': get_setting(f'{prefix}orientation', 'Portrait'),
        }

    # ── Backup & Restore ──
    def _show_backup_restore(self):
        self._clear_tab()
        card = self.theme.make_card(self.tab_content, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True)

        tk.Label(card.inner, text='💾 Backup & Restore', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=14, pady=(10, 4))
        tk.Label(card.inner, text='Backup your database to multiple locations and restore from previous backups.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(0, 12))

        try:
            from database import DB_FILE
            import os
            db_path = os.path.dirname(DB_FILE)
            self.backup_manager = get_backup_manager(db_path)
        except Exception as e:
            messagebox.showerror('Error', f'Failed to initialize backup manager: {e}')
            return

        # Backup Locations Section
        loc_card = self.theme.make_card(card.inner, bg=self.theme.palette.bg_surface)
        loc_card.pack(fill=tk.X, padx=14, pady=(0, 12))

        tk.Label(loc_card.inner, text='Backup Locations', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=12, pady=(8, 8))

        loc1, loc2 = self.backup_manager.get_backup_locations()

        # Location 1
        loc1_frame = tk.Frame(loc_card.inner, bg=self.theme.palette.bg_surface)
        loc1_frame.pack(fill=tk.X, padx=12, pady=(0, 8))
        tk.Label(loc1_frame, text='Location 1:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.loc1_var = tk.StringVar(value=loc1)
        loc1_entry = self.theme.make_entry(loc1_frame, variable=self.loc1_var)
        loc1_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(10, 4))
        self.theme.make_button(loc1_frame, text='🗂️ Browse', 
                              command=lambda: self._browse_folder(self.loc1_var),
                              kind='ghost', width=10, pady=6).pack(side=tk.LEFT, padx=(0, 4))

        # Location 2
        loc2_frame = tk.Frame(loc_card.inner, bg=self.theme.palette.bg_surface)
        loc2_frame.pack(fill=tk.X, padx=12, pady=(0, 12))
        tk.Label(loc2_frame, text='Location 2:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.loc2_var = tk.StringVar(value=loc2)
        loc2_entry = self.theme.make_entry(loc2_frame, variable=self.loc2_var)
        loc2_entry.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(10, 4))
        self.theme.make_button(loc2_frame, text='🗂️ Browse',
                              command=lambda: self._browse_folder(self.loc2_var),
                              kind='ghost', width=10, pady=6).pack(side=tk.LEFT, padx=(0, 4))

        # Save locations button
        self.theme.make_button(loc_card.inner, text='💾 Save Backup Locations',
                              command=self._save_backup_locations,
                              kind='primary', width=20, pady=8).pack(padx=12, pady=(0, 12))

        # Quick Backup Section
        quick_card = self.theme.make_card(card.inner, bg=self.theme.palette.bg_surface)
        quick_card.pack(fill=tk.X, padx=14, pady=(0, 12))

        tk.Label(quick_card.inner, text='Quick Backup', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=12, pady=(8, 4))
        tk.Label(quick_card.inner, text='Create a backup of your database now.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=12, pady=(0, 8))

        quick_btn_frame = tk.Frame(quick_card.inner, bg=self.theme.palette.bg_surface)
        quick_btn_frame.pack(fill=tk.X, padx=12, pady=(0, 12))
        self.theme.make_button(quick_btn_frame, text='🔒 Create Backup Now',
                              command=self._create_backup_now,
                              kind='primary', width=20, pady=8).pack(side=tk.LEFT, padx=(0, 6))

        # Restore from File Section
        restore_file_card = self.theme.make_card(card.inner, bg=self.theme.palette.bg_surface)
        restore_file_card.pack(fill=tk.X, padx=14, pady=(0, 12))

        tk.Label(restore_file_card.inner, text='Restore from File', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=12, pady=(8, 4))
        tk.Label(restore_file_card.inner, text='Restore database from a backup file on your system.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=12, pady=(0, 8))

        restore_btn_frame = tk.Frame(restore_file_card.inner, bg=self.theme.palette.bg_surface)
        restore_btn_frame.pack(fill=tk.X, padx=12, pady=(0, 12))
        self.theme.make_button(restore_btn_frame, text='📂 Browse and Restore',
                              command=self._restore_from_file,
                              kind='secondary', width=20, pady=8).pack(side=tk.LEFT, padx=(0, 6))

        # Restore from Backup Section
        restore_card = self.theme.make_card(card.inner, bg=self.theme.palette.bg_surface)
        restore_card.pack(fill=tk.BOTH, expand=True, padx=14, pady=(0, 0))

        tk.Label(restore_card.inner, text='Recent Backups (Last 20)', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', padx=12, pady=(8, 4))
        tk.Label(restore_card.inner, text='Select a backup to restore or delete.',
                 font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted).pack(anchor='w', padx=12, pady=(0, 8))

        # Backup list
        list_frame = tk.Frame(restore_card.inner, bg=self.theme.palette.bg_surface)
        list_frame.pack(fill=tk.BOTH, expand=True, padx=12, pady=(0, 12))

        # Header
        hdr_frame = tk.Frame(list_frame, bg=self.theme.palette.bg_surface_alt)
        hdr_frame.pack(fill=tk.X)
        tk.Label(hdr_frame, text='Backup Name', font=self.theme.fonts.body_bold, width=35,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)
        tk.Label(hdr_frame, text='Date', font=self.theme.fonts.body_bold, width=20,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)
        tk.Label(hdr_frame, text='Size', font=self.theme.fonts.body_bold, width=12,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)
        tk.Label(hdr_frame, text='Actions', font=self.theme.fonts.body_bold, width=30,
                 bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)

        # List of backups
        backups = self.backup_manager.get_backups(max_count=20)
        
        if not backups:
            tk.Label(list_frame, text='No backups found. Create one now.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(pady=20)
        else:
            for idx, backup in enumerate(backups):
                row = tk.Frame(list_frame, bg=self.theme.palette.bg_surface if idx % 2 == 0 else self.theme.palette.bg_surface_alt)
                row.pack(fill=tk.X)

                tk.Label(row, text=backup['name'], font=self.theme.fonts.body, width=35,
                         bg=row.cget('bg'), fg=self.theme.palette.text_primary, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)
                tk.Label(row, text=backup['date'], font=self.theme.fonts.body, width=20,
                         bg=row.cget('bg'), fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)
                tk.Label(row, text=self.backup_manager.get_backup_size_formatted(backup['size']), font=self.theme.fonts.body, width=12,
                         bg=row.cget('bg'), fg=self.theme.palette.text_muted, anchor='w').pack(side=tk.LEFT, padx=6, pady=6)

                action_frame = tk.Frame(row, bg=row.cget('bg'))
                action_frame.pack(side=tk.LEFT, padx=6, pady=6, fill=tk.X, expand=True)

                restore_btn = tk.Label(action_frame, text='↩️ Restore', font=self.theme.fonts.small, cursor='hand2',
                                       bg=row.cget('bg'), fg=self.theme.palette.success)
                restore_btn.pack(side=tk.LEFT, padx=(0, 8))
                restore_btn.bind('<Button-1>', lambda e, path=backup['path']: self._restore_backup(path))

                delete_btn = tk.Label(action_frame, text='🗑️ Delete', font=self.theme.fonts.small, cursor='hand2',
                                      bg=row.cget('bg'), fg=self.theme.palette.danger)
                delete_btn.pack(side=tk.LEFT)
                delete_btn.bind('<Button-1>', lambda e, name=backup['name']: self._delete_backup(name))

    def _browse_folder(self, var):
        """Browse for a folder"""
        folder = filedialog.askdirectory(title="Select Backup Location")
        if folder:
            var.set(folder)

    def _save_backup_locations(self):
        """Save backup locations"""
        loc1 = self.loc1_var.get().strip()
        loc2 = self.loc2_var.get().strip()

        if not loc1 or not loc2:
            messagebox.showwarning('Validation', 'Both backup locations must be specified.')
            return

        if self.backup_manager.set_backup_locations(loc1, loc2):
            messagebox.showinfo('Success', 'Backup locations saved successfully.')
            self._show_backup_restore()
        else:
            messagebox.showerror('Error', 'Failed to save backup locations.')

    def _create_backup_now(self):
        """Create a backup immediately"""
        if self.backup_manager.create_backup_and_upload():
            messagebox.showinfo('Success', 'Backup created successfully. Server upload will run now or queue when offline.')
            self._show_backup_restore()
        else:
            messagebox.showerror('Error', 'Failed to create backup.')

    def _restore_backup(self, backup_path):
        """Restore from a backup"""
        if not messagebox.askyesno('Confirm Restore',
            'This will restore your database from the selected backup.\n\n'
            'A safety backup of your current database will be created.\n\n'
            'Continue?'):
            return

        if self.backup_manager.restore_backup(backup_path):
            messagebox.showinfo('Success',
                'Database restored successfully.\n\n'
                'Please restart the application to use the restored database.')
            self._show_backup_restore()
        else:
            messagebox.showerror('Error', 'Failed to restore backup.')

    def _restore_from_file(self):
        """Browse and restore from a backup file"""
        file_path = filedialog.askopenfilename(
            title='Select Backup File to Restore',
            filetypes=[('Database Files', '*.db'), ('All Files', '*.*')],
            initialdir=os.path.expanduser('~')
        )
        
        if not file_path:
            return
        
        # Confirm restoration
        if not messagebox.askyesno('Confirm Restore',
            f'Restore from:\n{file_path}\n\n'
            'This will restore your database from the selected backup file.\n\n'
            'A safety backup of your current database will be created.\n\n'
            'Continue?'):
            return

        if self.backup_manager.restore_backup(file_path):
            messagebox.showinfo('Success',
                'Database restored successfully.\n\n'
                'Please restart the application to use the restored database.')
            self._show_backup_restore()
        else:
            messagebox.showerror('Error', 'Failed to restore backup from the selected file.')

    def _delete_backup(self, backup_name):
        """Delete a backup"""
        if not messagebox.askyesno('Delete Backup',
            f'Permanently delete backup "{backup_name}"?\n\n'
            'This action cannot be undone.'):
            return

        if self.backup_manager.delete_backup(backup_name):
            messagebox.showinfo('Success', 'Backup deleted.')
            self._show_backup_restore()
        else:
            messagebox.showerror('Error', 'Failed to delete backup.')
