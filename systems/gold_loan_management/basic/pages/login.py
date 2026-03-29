"""Login Page for Gold Loan System."""

import tkinter as tk
from tkinter import messagebox
import traceback


class LoginPage:
    def __init__(self, parent, theme, on_login_success):
        self.parent = parent
        self.theme = theme
        self.on_login_success = on_login_success
        self.frame = tk.Frame(parent, bg=self.theme.palette.bg_app)
        self._startup_focus_active = True
        self._startup_focus_job_ids = []
        self._build()

    def _build(self):
        for w in self.frame.winfo_children():
            w.destroy()

        center = tk.Frame(self.frame, bg=self.theme.palette.bg_app)
        center.place(relx=0.5, rely=0.45, anchor='center')

        # Logo area
        logo_frame = tk.Frame(center, bg=self.theme.palette.bg_app)
        logo_frame.pack(pady=(0, 10))

        tk.Label(logo_frame, text='🏦', font=('Segoe UI', 48),
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.accent).pack()

        tk.Label(center, text='Gold Loan System', font=('Segoe UI', 24, 'bold'),
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(pady=(0, 4))

        tk.Label(center, text='Sign in to continue', font=self.theme.fonts.body,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_muted).pack(pady=(0, 30))

        # Login card
        card = self.theme.make_card(center, bg=self.theme.palette.bg_surface, padding=(30, 30))
        card.pack(ipadx=40)

        inner = card.inner

        # Username
        tk.Label(inner, text='Username', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(10, 4))
        self.username_var = tk.StringVar()
        self.user_entry = self.theme.make_entry(inner, variable=self.username_var)
        self.user_entry.pack(fill=tk.X, pady=(0, 12))

        # Password
        tk.Label(inner, text='Password', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))
        self.password_var = tk.StringVar()
        self.pass_entry = self.theme.make_entry(inner, variable=self.password_var, masked=True)
        self.pass_entry.pack(fill=tk.X, pady=(0, 20))

        # Login button
        login_btn = self.theme.make_button(inner, text='Sign In', command=self._do_login, kind='primary', width=30, pady=10)
        login_btn.pack(fill=tk.X, pady=(0, 10))

        quick_admin_btn = self.theme.make_button(
            inner,
            text='Quick Admin Login (Temp)',
            command=self._quick_admin_login,
            kind='ghost',
            width=30,
            pady=8,
        )
        quick_admin_btn.pack(fill=tk.X, pady=(0, 10))

        # Default credentials hint
        tk.Label(inner, text='Default: admin / admin123', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(pady=(0, 10))

        # Keyboard flow: Enter on username moves to password; Enter on password logs in.
        self.user_entry.entry.bind('<Return>', lambda _event: self._move_focus_to_password())
        self.pass_entry.entry.bind('<Return>', lambda _event: self._do_login())
        self.pass_entry.entry.bind('<FocusIn>', lambda _event: self._disable_startup_autofocus())

        # Once user interacts, stop any remaining startup autofocus retries.
        self.user_entry.entry.bind('<Button-1>', lambda _event: self._disable_startup_autofocus())
        self.pass_entry.entry.bind('<Button-1>', lambda _event: self._disable_startup_autofocus())
        self.user_entry.entry.bind('<KeyPress>', lambda _event: self._disable_startup_autofocus())
        self.pass_entry.entry.bind('<KeyPress>', lambda _event: self._disable_startup_autofocus())

    def _focus_username_entry(self):
        if hasattr(self, 'user_entry') and self.user_entry.winfo_exists():
            self.user_entry.entry.focus_set()
            self.user_entry.entry.icursor(tk.END)

    def _try_focus_username_entry(self, force=False):
        if not self._startup_focus_active:
            return
        if not hasattr(self, 'user_entry') or not self.user_entry.winfo_exists():
            return
        if not self.frame.winfo_ismapped():
            return

        entry_widget = self.user_entry.entry
        if force:
            entry_widget.focus_force()
        else:
            entry_widget.focus_set()
        entry_widget.icursor(tk.END)

    def _disable_startup_autofocus(self):
        if not self._startup_focus_active:
            return
        self._startup_focus_active = False
        for job_id in self._startup_focus_job_ids:
            try:
                self.frame.after_cancel(job_id)
            except Exception:
                pass
        self._startup_focus_job_ids.clear()

    def _move_focus_to_password(self):
        self._disable_startup_autofocus()
        self.pass_entry.entry.focus_set()
        self.pass_entry.entry.icursor(tk.END)

    def _schedule_initial_focus(self):
        self._startup_focus_job_ids.clear()
        self._startup_focus_job_ids.append(self.frame.after(50, self._try_focus_username_entry))
        self._startup_focus_job_ids.append(self.frame.after(150, lambda: self._try_focus_username_entry(force=True)))

    def _quick_admin_login(self):
        self._disable_startup_autofocus()
        self.username_var.set('admin')
        self.password_var.set('admin123')
        self._do_login()

    def _do_login(self):
        try:
            from database import authenticate_user
            username = self.username_var.get().strip()
            password = self.password_var.get().strip()

            if not username or not password:
                messagebox.showwarning('Login', 'Please enter username and password.')
                return

            user = authenticate_user(username, password)
            if user:
                self.on_login_success(user)
            else:
                messagebox.showerror('Login Failed', 'Invalid username or password.')
        except Exception as error:
            traceback.print_exc()
            messagebox.showerror(
                'Login Error',
                f'An unexpected error occurred while signing in.\n\n{error}'
            )

    def show(self):
        self.frame.pack(fill=tk.BOTH, expand=True)
        self.frame.bind('<Map>', lambda _event: self._schedule_initial_focus(), add='+')

        # Kick off initial autofocus sequence.
        self._schedule_initial_focus()

    def hide(self):
        self.frame.pack_forget()
