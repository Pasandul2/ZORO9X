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

TYPE_BUCKET_META = {
    'assessed': {
        'title': '🔐 Assessed Value Change',
        'color': '#2563eb',
    },
    'overdue': {
        'title': '💸 Overdue Value Change',
        'color': '#d97706',
    },
    'other': {
        'title': '🧾 Other Charges Change',
        'color': '#0f766e',
    },
}


class LoanApprovalsPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self._status_tab = 'pending'
        self._type_filter = 'all'
        self._tab_buttons = {}
        self._stats_labels = {}
        self._status_tabs_row = None
        self._type_tabs_row = None

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

        # Status tabs
        tabs_wrap = tk.Frame(view, bg=self.theme.palette.bg_app)
        tabs_wrap.pack(fill=tk.X, pady=(0, 8))
        tabs_card = self.theme.make_card(tabs_wrap, bg=self.theme.palette.bg_surface)
        tabs_card.pack(fill=tk.X)

        self._status_tabs_row = tk.Frame(tabs_card.inner, bg=self.theme.palette.bg_surface)
        self._status_tabs_row.pack(fill=tk.X, padx=10, pady=(8, 4))

        self._type_tabs_row = tk.Frame(tabs_card.inner, bg=self.theme.palette.bg_surface)
        self._type_tabs_row.pack(fill=tk.X, padx=10, pady=(0, 8))

        self._render_status_tabs()
        self._render_type_tabs()

        # Stats bar
        stats_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        stats_card.pack(fill=tk.X, pady=(0, 10))
        sf = tk.Frame(stats_card.inner, bg=self.theme.palette.bg_surface)
        sf.pack(fill=tk.X, padx=14, pady=10)
        self._stats_labels['pending'] = tk.Label(
            sf,
            text='⏳ Pending: 0',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=STATUS_COLORS['pending'],
        )
        self._stats_labels['pending'].pack(side=tk.LEFT, padx=(0, 20))
        self._stats_labels['approved'] = tk.Label(
            sf,
            text='✅ Approved: 0',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=STATUS_COLORS['approved'],
        )
        self._stats_labels['approved'].pack(side=tk.LEFT, padx=(0, 20))
        self._stats_labels['declined'] = tk.Label(
            sf,
            text='❌ Declined: 0',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=STATUS_COLORS['declined'],
        )
        self._stats_labels['declined'].pack(side=tk.LEFT, padx=(0, 20))
        self._stats_labels['all'] = tk.Label(
            sf,
            text='📚 Total: 0',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.accent,
        )
        self._stats_labels['all'].pack(side=tk.LEFT, padx=(0, 20))
        tk.Label(
            sf,
            text='Requests where cashier/admin changed defaults during loan creation/processing.',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
            wraplength=520,
            justify='left',
        ).pack(side=tk.LEFT)

        # Request list
        self.list_card = self.theme.make_card(view, bg=self.theme.palette.bg_surface)
        self.list_card.pack(fill=tk.BOTH, expand=True)
        self.list_frame = self.list_card.inner
        self._load_requests()

    def _set_status_tab(self, status_key):
        self._status_tab = status_key
        self._render_status_tabs()
        self._load_requests()

    def _set_type_filter(self, type_key):
        self._type_filter = type_key
        self._render_type_tabs()
        self._load_requests()

    def _render_status_tabs(self):
        if not self._status_tabs_row:
            return

        for w in self._status_tabs_row.winfo_children():
            w.destroy()

        tab_defs = [
            ('pending', '⏳ Pending'),
            ('approved', '✅ Approved'),
            ('declined', '❌ Declined'),
            ('all', '📚 All'),
        ]
        for idx, (key, label) in enumerate(tab_defs):
            btn = self.theme.make_button(
                self._status_tabs_row,
                text=label,
                command=lambda k=key: self._set_status_tab(k),
                kind='primary' if key == self._status_tab else 'ghost',
                width=16,
                pady=6,
            )
            btn.pack(side=tk.LEFT, padx=(0, 8) if idx < len(tab_defs) - 1 else 0)

    def _render_type_tabs(self):
        if not self._type_tabs_row:
            return

        for w in self._type_tabs_row.winfo_children():
            w.destroy()

        type_defs = [
            ('all', 'Type: All'),
            ('assessed', 'Assessed'),
            ('overdue', 'Overdue'),
            ('other', 'Other Charges'),
        ]
        for idx, (key, label) in enumerate(type_defs):
            btn = self.theme.make_button(
                self._type_tabs_row,
                text=label,
                command=lambda k=key: self._set_type_filter(k),
                kind='secondary' if key == self._type_filter else 'ghost',
                width=16,
                pady=6,
            )
            btn.pack(side=tk.LEFT, padx=(0, 8) if idx < len(type_defs) - 1 else 0)

    def _infer_type_bucket(self, req):
        request_type = (req.get('request_type') or 'assessed_pct').strip().lower()
        note = (req.get('review_note') or '').strip().lower()

        if request_type == 'assessed_pct':
            return 'assessed'
        if request_type == 'overdue_waiver':
            return 'overdue'

        has_other = ('other charge' in note) or ('other charges' in note)
        has_overdue = ('overdue' in note) or ('penalty' in note)

        if has_other:
            return 'other'
        if has_overdue:
            return 'overdue'

        if request_type in ('renewal_charges_override', 'redemption_charges_override'):
            return 'other'

        return 'assessed'

    def _load_requests(self):
        for w in self.list_frame.winfo_children():
            w.destroy()

        all_requests = get_all_approval_requests()
        pending_count = sum(1 for r in all_requests if r.get('status') == 'pending')
        approved_count = sum(1 for r in all_requests if r.get('status') == 'approved')
        declined_count = sum(1 for r in all_requests if r.get('status') == 'declined')

        self._stats_labels['pending'].configure(text=f'⏳ Pending: {pending_count}')
        self._stats_labels['approved'].configure(text=f'✅ Approved: {approved_count}')
        self._stats_labels['declined'].configure(text=f'❌ Declined: {declined_count}')
        self._stats_labels['all'].configure(text=f'📚 Total: {len(all_requests)}')

        if self._status_tab == 'all':
            requests = all_requests
            section_title = 'All Requests'
        else:
            requests = [r for r in all_requests if r.get('status') == self._status_tab]
            section_title = f"{self._status_tab.title()} Requests"

        tk.Label(
            self.list_frame,
            text=section_title,
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
        ).pack(anchor='w', padx=14, pady=(10, 4))

        if self._type_filter != 'all':
            requests = [r for r in requests if self._infer_type_bucket(r) == self._type_filter]

        if not requests:
            tk.Label(self.list_frame,
                     text='✅ No requests found for this tab/filter.',
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
        type_bucket = self._infer_type_bucket(req)
        type_meta = TYPE_BUCKET_META.get(type_bucket, TYPE_BUCKET_META['assessed'])
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

        if type_bucket == 'assessed':
            type_title = type_meta['title']
            default_lbl = "Default %"
            requested_lbl = "Requested %"
            default_val = f"{req['default_assessed_pct']:.1f}%"
            requested_val = f"{req['requested_assessed_pct']:.1f}%"
        elif type_bucket == 'overdue':
            type_title = type_meta['title']
            default_lbl = "Default Overdue"
            requested_lbl = "Requested Overdue"
            default_val = format_currency(req['default_assessed_pct'])
            requested_val = format_currency(req['requested_assessed_pct'])
        else:
            type_title = type_meta['title']
            default_lbl = "Default Charges"
            requested_lbl = "Requested Charges"
            default_val = format_currency(req['default_assessed_pct'])
            requested_val = format_currency(req['requested_assessed_pct'])

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
        
        if type_bucket == 'assessed':
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
                if type_bucket in ('overdue', 'other'):
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
