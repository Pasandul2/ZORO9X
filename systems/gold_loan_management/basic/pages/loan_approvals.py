"""Loan Approval Requests Page — for Admin review of custom assessed % loans."""

import tkinter as tk
from tkinter import messagebox
from database import (get_all_approval_requests, get_pending_approval_requests,
                      review_approval_request, get_loan, get_loan_items, add_audit_log)
from utils import format_currency, format_date


STATUS_COLORS = {
    'pending':  '#f59e0b',
    'approved': '#10b981',
    'declined': '#ef4444',
}

STATUS_ICONS = {
    'pending':  '⏳',
    'approved': '✅',
    'declined': '❌',
}

REQUEST_TYPE_META = {
    'assessed_pct': {
        'title': '🔐 Assessed % Adjustment',
        'color': '#2563eb',
    },
    'overdue_waiver': {
        'title': '💸 Overdue Interest Waiver',
        'color': '#d97706',
    },
}


class LoanApprovalsPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self._show_all = False
        self._type_filter = 'all'

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 12))
        tk.Label(hdr, text='🔐 Assessed % Approval Requests', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Toggle pending / all
        self._toggle_var = tk.BooleanVar(value=False)
        toggle_btn = self.theme.make_button(hdr, text='Show All History',
                                            command=self._toggle_view, kind='ghost', width=16, pady=6)
        toggle_btn.pack(side=tk.RIGHT)

        self.type_filter_btn = self.theme.make_button(
            hdr,
            text='Type: All',
            command=self._cycle_type_filter,
            kind='ghost',
            width=16,
            pady=6,
        )
        self.type_filter_btn.pack(side=tk.RIGHT, padx=(0, 8))

        # Stats bar
        pending_requests = get_pending_approval_requests()
        stats_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        stats_card.pack(fill=tk.X, pady=(0, 10))
        sf = tk.Frame(stats_card.inner, bg=self.theme.palette.bg_surface)
        sf.pack(fill=tk.X, padx=14, pady=10)
        tk.Label(sf, text=f'⏳ Pending Approvals: {len(pending_requests)}',
                 font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=STATUS_COLORS['pending']).pack(side=tk.LEFT, padx=(0, 20))
        tk.Label(sf, text='Requests where cashier/admin changed the default assessed percentage during loan creation.',
                 font=self.theme.fonts.small, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted, wraplength=640, justify='left').pack(side=tk.LEFT)

        # Request list
        self.list_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        self.list_card.pack(fill=tk.BOTH, expand=True)
        self.list_frame = self.list_card.inner
        self._load_requests()

    def _toggle_view(self):
        self._show_all = not self._show_all
        self._load_requests()

    def _cycle_type_filter(self):
        order = ['all', 'assessed_pct', 'overdue_waiver']
        labels = {
            'all': 'Type: All',
            'assessed_pct': 'Type: Assessed',
            'overdue_waiver': 'Type: Overdue',
        }
        idx = order.index(self._type_filter)
        self._type_filter = order[(idx + 1) % len(order)]
        self.type_filter_btn.config(text=labels[self._type_filter])
        self._load_requests()

    def _load_requests(self):
        for w in self.list_frame.winfo_children():
            w.destroy()

        if self._show_all:
            requests = get_all_approval_requests()
            tk.Label(self.list_frame, text='All Requests (history)',
                     font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 4))
        else:
            requests = get_pending_approval_requests()
            tk.Label(self.list_frame, text='Pending Requests',
                     font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(anchor='w', padx=14, pady=(10, 4))

        if self._type_filter != 'all':
            requests = [r for r in requests if r.get('request_type', 'assessed_pct') == self._type_filter]

        if not requests:
            tk.Label(self.list_frame,
                     text='✅ No requests found.' if self._show_all else '✅ No pending approval requests.',
                     font=self.theme.fonts.body, bg=self.theme.palette.bg_surface,
                     fg=self.theme.palette.text_muted).pack(pady=40)
            return

        for req in requests:
            self._render_request_card(req)

    def _render_request_card(self, req):
        status = req['status']
        color = STATUS_COLORS.get(status, self.theme.palette.text_muted)
        icon  = STATUS_ICONS.get(status, '•')
        request_type = req.get('request_type', 'assessed_pct')
        type_meta = REQUEST_TYPE_META.get(request_type, REQUEST_TYPE_META['assessed_pct'])
        type_color = type_meta['color']

        card = self.theme.make_card(self.list_frame, bg=self.theme.palette.bg_surface_alt)
        card.configure(highlightthickness=1, highlightbackground=type_color)
        card.pack(fill=tk.X, padx=14, pady=5)
        inner = card.inner

        # Top row: status badge + ticket
        top = tk.Frame(inner, bg=self.theme.palette.bg_surface_alt)
        top.pack(fill=tk.X, padx=10, pady=(8, 4))

        tk.Label(top, text=f'{icon} {status.upper()}',
                 font=('Segoe UI', 10, 'bold'), bg=self.theme.palette.bg_surface_alt,
                 fg=color).pack(side=tk.LEFT, padx=(0, 12))
        tk.Label(top, text=f'Ticket: {req["ticket_no"]}',
                 font=self.theme.fonts.body_bold, bg=self.theme.palette.bg_surface_alt,
                 fg=self.theme.palette.accent).pack(side=tk.LEFT)
        tk.Label(top, text=f'Requested: {req["created_at"][:16]}',
                 font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                 fg=self.theme.palette.text_muted).pack(side=tk.RIGHT)

        # Middle: details
        mid = tk.Frame(inner, bg=self.theme.palette.bg_surface_alt)
        mid.pack(fill=tk.X, padx=10, pady=2)

        if request_type == 'overdue_waiver':
            type_title = type_meta['title']
            default_lbl = "Default Overdue"
            requested_lbl = "Requested Overdue"
            default_val = format_currency(req['default_assessed_pct'])
            requested_val = format_currency(req['requested_assessed_pct'])
        else:
            type_title = type_meta['title']
            default_lbl = "Default %"
            requested_lbl = "Requested %"
            default_val = f"{req['default_assessed_pct']:.1f}%"
            requested_val = f"{req['requested_assessed_pct']:.1f}%"

        tk.Label(top, text=f'({type_title})', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface_alt, fg=type_color).pack(side=tk.LEFT, padx=10)

        details = [
            ('Customer',     req.get('customer_name', '-')),
            ('NIC',          req.get('customer_nic', '-')),
            ('Requested By', req.get('requested_by_name', '-')),
            (default_lbl,    default_val),
            (requested_lbl,  requested_val),
            ('Loan Amount',  format_currency(req.get('loan_amount', 0))),
        ]
        
        if request_type == 'assessed_pct':
            details.append(('Market Value', format_currency(req.get('market_value', 0))))
            details.append(('Assessed Val', format_currency(req.get('assessed_value', 0))))

        col = 0
        for lbl, val in details:
            cell = tk.Frame(mid, bg=self.theme.palette.bg_surface_alt)
            cell.grid(row=0, column=col, sticky='w', padx=(0, 16))
            tk.Label(cell, text=lbl + ':', font=self.theme.fonts.small,
                     bg=self.theme.palette.bg_surface_alt, fg=self.theme.palette.text_muted).pack(anchor='w')
            
            fg = self.theme.palette.text_primary
            if lbl == requested_lbl:
                diff = req['requested_assessed_pct'] - req['default_assessed_pct']
                # for overdue waiver, lower is "approved"/green for the customer but "declined"/red for business?
                # Usually we use green for the requested change being better for the customer.
                if request_type == 'overdue_waiver':
                    fg = STATUS_COLORS['approved'] if diff < 0 else STATUS_COLORS['declined']
                else:
                    fg = STATUS_COLORS['approved'] if diff > 0 else STATUS_COLORS['declined']
            
            tk.Label(cell, text=val, font=self.theme.fonts.body_bold,
                     bg=self.theme.palette.bg_surface_alt, fg=fg).pack(anchor='w')
            col += 1

        # Review note (if reviewed)
        if req.get('review_note') or (status != 'pending' and req.get('reviewed_by_name')):
            rn = tk.Frame(inner, bg=self.theme.palette.bg_surface_alt)
            rn.pack(fill=tk.X, padx=10, pady=(4, 0))
            revby = req.get('reviewed_by_name', '')
            rev_at = (req.get('reviewed_at') or '')[:16]
            tk.Label(rn, text=f'Reviewed by {revby} on {rev_at}. Note: {req.get("review_note", "")}',
                     font=self.theme.fonts.small, bg=self.theme.palette.bg_surface_alt,
                     fg=self.theme.palette.text_muted, wraplength=800, justify='left').pack(anchor='w')

        # Action buttons for pending
        if status == 'pending':
            btn_row = tk.Frame(inner, bg=self.theme.palette.bg_surface_alt)
            btn_row.pack(fill=tk.X, padx=10, pady=(6, 8))

            view_btn = self.theme.make_button(btn_row, text='👁 View Loan',
                                              command=lambda lid=req['loan_id']: self.navigate('loan_detail', lid),
                                              kind='ghost', width=12, pady=6)
            view_btn.pack(side=tk.LEFT, padx=(0, 8))

            approve_btn = self.theme.make_button(btn_row, text='✅ Approve',
                                                  command=lambda r=req: self._review(r, 'approved'),
                                                  kind='primary', width=12, pady=6)
            approve_btn.pack(side=tk.LEFT, padx=(0, 8))

            decline_btn = self.theme.make_button(btn_row, text='❌ Decline',
                                                  command=lambda r=req: self._review(r, 'declined'),
                                                  kind='danger', width=12, pady=6)
            decline_btn.pack(side=tk.LEFT)
        else:
            view_btn = self.theme.make_button(inner, text='👁 View Loan',
                                              command=lambda lid=req['loan_id']: self.navigate('loan_detail', lid),
                                              kind='ghost', width=12, pady=4)
            view_btn.pack(anchor='w', padx=10, pady=(0, 8))

    def _review(self, req, decision):
        review_approval_request(
            req_id=req['id'],
            status=decision,
            reviewed_by=self.user['id'],
            reviewed_by_name=self.user['full_name'],
            review_note='',
        )
        add_audit_log(self.user['id'], f'APPROVAL_{decision.upper()}', 'loan_approval_request',
                      req['id'], f'Ticket: {req["ticket_no"]}.')

        result_msg = ('✅ Approved!' if decision == 'approved' else '❌ Declined.')
        messagebox.showinfo('Done', f'{result_msg}\n\nTicket: {req["ticket_no"]}')
        self._load_requests()
