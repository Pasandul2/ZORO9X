"""Print Ticket Page for Gold Loan System."""

import tkinter as tk
from tkinter import messagebox
from database import get_loan, get_loan_items, get_setting, get_loan_renewals
from utils import format_currency, format_date, get_status_text


class PrintTicketPage:
    def __init__(self, container, theme, user, navigate_fn, loan_id):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        if isinstance(loan_id, dict):
            self.loan_id = loan_id.get('loan_id')
            self.doc_type = loan_id.get('doc_type', 'ticket')
        else:
            self.loan_id = loan_id
            self.doc_type = 'ticket'

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        loan = get_loan(self.loan_id)
        if not loan:
            messagebox.showerror('Error', 'Loan not found.')
            self.navigate('loan_list')
            return
        self.loan = loan
        self.items = get_loan_items(self.loan_id)
        renewals = get_loan_renewals(self.loan_id)
        self.latest_renewal = renewals[0] if renewals else None

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 10))
        back_btn = self.theme.make_button(hdr, text='← Back',
                                          command=lambda: self.navigate('loan_detail', self.loan_id),
                                          kind='ghost', width=8, pady=6)
        back_btn.pack(side=tk.LEFT, padx=(0, 10))
        page_title = 'Cash Credit Slip' if self.doc_type == 'cash_credit' else 'Ticket'
        tk.Label(hdr, text=f'🖨 Print {page_title}: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Print options
        opt_frame = tk.Frame(view, bg=self.theme.palette.bg_app)
        opt_frame.pack(fill=tk.X, pady=(0, 10))
        self.theme.make_button(opt_frame, text='🖨 Print A4', command=lambda: self._do_print('a4'),
                               kind='primary', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 10))

        # Preview
        preview_card = self.theme.make_card(view, bg='#ffffff', padding=(6, 6))
        preview_card.pack(fill=tk.BOTH, expand=True)
        preview_card.configure(height=980)
        self.preview_frame = preview_card.inner
        self._render_preview('a4')

    def _create_scrollable_preview_host(self):
        host = tk.Frame(self.preview_frame, bg='#ffffff')
        host.pack(fill=tk.BOTH, expand=True)
        host.configure(height=920)
        host.pack_propagate(False)

        canvas = tk.Canvas(host, bg='#ffffff', highlightthickness=0, bd=0)
        canvas.configure(height=900)
        vbar = self.theme.make_scrollbar(host, canvas.yview)
        canvas.configure(yscrollcommand=vbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        vbar.pack(side=tk.RIGHT, fill=tk.Y)

        content = tk.Frame(canvas, bg='#ffffff')
        win = canvas.create_window((0, 0), window=content, anchor='nw')

        content.bind('<Configure>', lambda _e: canvas.configure(scrollregion=canvas.bbox('all')))
        canvas.bind('<Configure>', lambda e: canvas.itemconfigure(win, width=e.width))

        def _on_mousewheel(event):
            canvas.yview_scroll(int(-1 * (event.delta / 120)), 'units')

        canvas.bind('<Enter>', lambda _e: self.container.bind_all('<MouseWheel>', _on_mousewheel))
        canvas.bind('<Leave>', lambda _e: self.container.unbind_all('<MouseWheel>'))
        canvas.yview_moveto(0)
        return content

    def _render_preview(self, format_type='a4'):
        if self.doc_type == 'cash_credit':
            self._render_cash_credit_preview(format_type)
            return

        for w in self.preview_frame.winfo_children():
            w.destroy()

        content_host = self._create_scrollable_preview_host()

        loan = self.loan
        items = self.items
        company = get_setting('company_name', 'Gold Loan Center')
        phone = get_setting('company_phone', '')
        address = get_setting('company_address', '')

        bg = '#ffffff'
        fg = '#1f2937'
        muted = '#64748b'
        accent = '#415bd8'

        if format_type == 'receipt':
            max_w = 380
        else:
            current_w = self.preview_frame.winfo_width() or self.container.winfo_width() or 980
            avail_w = max(500, current_w - 180)
            max_w = min(620, avail_w)

        container = tk.Frame(content_host, bg=bg, width=max_w)
        container.pack(anchor='n', padx=10, pady=(2, 8))
        container.configure(width=max_w)

        # Header
        tk.Label(container, text=company, font=('Segoe UI', 16 if format_type == 'a4' else 10, 'bold'),
             bg=bg, fg=fg).pack(pady=(2, 2))
        if address:
            tk.Label(container, text=address, font=('Segoe UI', 8), bg=bg, fg=muted,
                     wraplength=max_w - 40).pack()
        if phone:
            tk.Label(container, text=f'Tel: {phone}', font=('Segoe UI', 8), bg=bg, fg=muted).pack()

        tk.Frame(container, bg='#000000', height=2).pack(fill=tk.X, padx=10, pady=8)

        tk.Label(container, text='GOLD LOAN TICKET', font=('Segoe UI', 13 if format_type == 'a4' else 9, 'bold'),
                 bg=bg, fg=accent).pack()

        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=6)

        # Ticket details
        details = [
            ('Ticket No', loan['ticket_no']),
            ('Date', format_date(loan['issue_date'])),
            ('Expire', format_date(loan['expire_date'])),
            ('Customer', loan['customer_name']),
            ('NIC', loan['customer_nic']),
            ('Phone', loan['customer_phone']),
        ]

        font_size = 10 if format_type == 'a4' else 7
        for lbl, val in details:
            r = tk.Frame(container, bg=bg)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=f'{lbl}:', font=('Segoe UI', font_size, 'bold'), width=10, anchor='w',
                     bg=bg, fg=muted).pack(side=tk.LEFT)
            tk.Label(r, text=str(val), font=('Segoe UI', font_size), bg=bg, fg=fg).pack(side=tk.LEFT)

        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=6)

        # Articles (match system print preview table layout)
        tk.Label(container, text='Articles', font=('Segoe UI', font_size + 1, 'bold'),
                 bg=bg, fg=fg).pack(anchor='w', padx=14)

        table = tk.Frame(container, bg=bg)
        table.pack(fill=tk.X, padx=14, pady=(2, 4))
        table.columnconfigure(0, weight=3)
        table.columnconfigure(1, weight=1)
        table.columnconfigure(2, weight=2)
        table.columnconfigure(3, weight=2)
        table.columnconfigure(4, weight=2)

        headers = ['Type', 'Carat', 'Gold Wt', 'Total Wt', 'Value']
        for ci, head in enumerate(headers):
            tk.Label(
                table,
                text=head,
                font=('Segoe UI', max(8, font_size - 1), 'bold'),
                bg=bg,
                fg=fg,
                anchor='w' if ci < 4 else 'e'
            ).grid(row=0, column=ci, sticky='ew', padx=(0, 6), pady=(0, 2))

        tk.Frame(container, bg='#d4d4d4', height=1).pack(fill=tk.X, padx=14, pady=(0, 2))

        for ri, item in enumerate(items, start=1):
            tk.Label(table, text=item['article_type'], font=('Segoe UI', max(8, font_size - 1)),
                     bg=bg, fg=fg, anchor='w').grid(row=ri, column=0, sticky='ew', padx=(0, 6), pady=1)
            tk.Label(table, text=f"{item['carat']}K", font=('Segoe UI', max(8, font_size - 1)),
                     bg=bg, fg=fg, anchor='w').grid(row=ri, column=1, sticky='ew', padx=(0, 6), pady=1)
            tk.Label(table, text=f"{item['gold_weight']}g", font=('Segoe UI', max(8, font_size - 1)),
                     bg=bg, fg=fg, anchor='w').grid(row=ri, column=2, sticky='ew', padx=(0, 6), pady=1)
            tk.Label(table, text=f"{item['total_weight']}g", font=('Segoe UI', max(8, font_size - 1)),
                     bg=bg, fg=fg, anchor='w').grid(row=ri, column=3, sticky='ew', padx=(0, 6), pady=1)
            tk.Label(table, text=format_currency(item['estimated_value']), font=('Segoe UI', max(8, font_size - 1)),
                     bg=bg, fg=fg, anchor='e').grid(row=ri, column=4, sticky='ew', pady=1)

        tk.Frame(container, bg='#d4d4d4', height=1).pack(fill=tk.X, padx=14, pady=(4, 6))

        # Summary
        summary = [
            ('Total Gold Weight', f"{loan['total_gold_weight']}g"),
            ('Market Value', format_currency(loan['market_value'])),
            ('Assessed Value', format_currency(loan['assessed_value'])),
            ('Interest Rate', f"{loan['interest_rate']}%/month"),
            ('Duration', f"{loan['duration_months']} month(s)"),
        ]
        for lbl, val in summary:
            r = tk.Frame(container, bg=bg)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=lbl, font=('Segoe UI', font_size), bg=bg, fg=muted, anchor='w').pack(side=tk.LEFT)
            tk.Label(r, text=val, font=('Segoe UI', font_size, 'bold'), bg=bg, fg=fg).pack(side=tk.RIGHT)

        tk.Frame(container, bg='#000000', height=2).pack(fill=tk.X, padx=10, pady=6)

        # Loan amount
        r = tk.Frame(container, bg=bg)
        r.pack(fill=tk.X, padx=14, pady=4)
        tk.Label(r, text='LOAN AMOUNT', font=('Segoe UI', font_size + 2, 'bold'),
                 bg=bg, fg=accent).pack(side=tk.LEFT)
        tk.Label(r, text=format_currency(loan['loan_amount']),
                 font=('Segoe UI', font_size + 4, 'bold'), bg=bg, fg=accent).pack(side=tk.RIGHT)

        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=6)

        # Footer
        if loan.get('purpose'):
            r = tk.Frame(container, bg=bg)
            r.pack(fill=tk.X, padx=14, pady=(0, 2))
            tk.Label(r, text='Purpose:', font=('Segoe UI', max(7, font_size - 1)),
                     bg=bg, fg=muted).pack(side=tk.LEFT)
            tk.Label(r, text=loan['purpose'], font=('Segoe UI', max(7, font_size - 1)),
                     bg=bg, fg=fg).pack(side=tk.RIGHT)

        tk.Label(
            container,
            text='Terms: Gold articles held as collateral. Interest charged monthly. Articles forfeited if not redeemed/renewed by expiry.',
            font=('Segoe UI', max(6, font_size - 3)),
            bg=bg,
            fg=muted,
            wraplength=max_w - 40,
            justify='left',
        ).pack(padx=14, pady=(4, 2), anchor='w')

        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=8)

        # Signatures
        if format_type == 'a4':
            sig_frame = tk.Frame(container, bg=bg)
            sig_frame.pack(fill=tk.X, padx=14, pady=(20, 10))
            for label in ['Customer Signature', 'Cashier Signature', 'Manager Signature']:
                sf = tk.Frame(sig_frame, bg=bg)
                sf.pack(side=tk.LEFT, expand=True)
                tk.Frame(sf, bg='#999999', height=1, width=120).pack(pady=(20, 4))
                tk.Label(sf, text=label.split(' ')[0], font=('Segoe UI', 7), bg=bg, fg=fg).pack()

        tk.Label(container, text='Thank you for choosing our services.',
                 font=('Segoe UI', font_size - 1, 'italic'), bg=bg, fg=muted).pack(pady=(8, 12))

    def _render_cash_credit_preview(self, format_type='a4'):
        for w in self.preview_frame.winfo_children():
            w.destroy()

        content_host = self._create_scrollable_preview_host()

        loan = self.loan
        ren = self.latest_renewal or {}
        company = get_setting('company_name', 'Gold Loan Center')
        phone = get_setting('company_phone', '')
        address = get_setting('company_address', '')

        bg = '#ffffff'
        fg = '#1f2937'
        muted = '#64748b'
        accent = '#415bd8'

        if format_type == 'receipt':
            max_w = 380
        else:
            current_w = self.preview_frame.winfo_width() or self.container.winfo_width() or 980
            avail_w = max(500, current_w - 180)
            max_w = min(620, avail_w)

        container = tk.Frame(content_host, bg=bg, width=max_w)
        container.pack(anchor='n', padx=10, pady=(2, 8))
        container.configure(width=max_w)

        tk.Label(container, text=company, font=('Segoe UI', 16 if format_type == 'a4' else 10, 'bold'),
             bg=bg, fg=fg).pack(pady=(2, 2))
        if address:
            tk.Label(container, text=address, font=('Segoe UI', 8), bg=bg, fg=muted,
                     wraplength=max_w - 40).pack()
        if phone:
            tk.Label(container, text=f'Tel: {phone}', font=('Segoe UI', 8), bg=bg, fg=muted).pack()

        tk.Frame(container, bg='#000000', height=2).pack(fill=tk.X, padx=10, pady=8)
        tk.Label(container, text='CASH CREDIT SLIP', font=('Segoe UI', 13 if format_type == 'a4' else 9, 'bold'),
                 bg=bg, fg=accent).pack()
        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=6)

        details = [
            ('Ticket No', loan['ticket_no']),
            ('Customer', loan['customer_name']),
            ('Renew Date', format_date(ren.get('renewed_at') or loan.get('renew_date') or '')),
            ('Received Amount', format_currency(ren.get('payment_amount', 0))),
            ('Interest Settled', format_currency(ren.get('interest_paid', 0))),
            ('Principal Reduced', format_currency(ren.get('principal_reduction', 0))),
            ('Balance Loan Amount', format_currency(loan['loan_amount'])),
        ]

        font_size = 10 if format_type == 'a4' else 7
        for lbl, val in details:
            r = tk.Frame(container, bg=bg)
            r.pack(fill=tk.X, padx=14, pady=1)
            tk.Label(r, text=f'{lbl}:', font=('Segoe UI', font_size, 'bold'), width=16, anchor='w',
                     bg=bg, fg=muted).pack(side=tk.LEFT)
            tk.Label(r, text=str(val), font=('Segoe UI', font_size, 'bold'), bg=bg, fg=fg).pack(side=tk.RIGHT)

        tk.Frame(container, bg='#cccccc', height=1).pack(fill=tk.X, padx=10, pady=10)
        tk.Label(container, text='Received By: ____________________', font=('Segoe UI', font_size), bg=bg, fg=fg).pack(anchor='w', padx=14)
        tk.Label(container, text='Customer Signature: ____________________', font=('Segoe UI', font_size), bg=bg, fg=fg).pack(anchor='w', padx=14, pady=(8, 0))
        tk.Label(container, text='Thank you for your payment.', font=('Segoe UI', font_size - 1, 'italic'), bg=bg, fg=muted).pack(pady=(10, 8))

    def _do_print(self, format_type):
        """Print using system print dialog."""
        try:
            import tempfile
            import webbrowser

            loan = self.loan
            items = self.items
            company = get_setting('company_name', 'Gold Loan Center')
            phone = get_setting('company_phone', '')
            address = get_setting('company_address', '')

            if self.doc_type == 'cash_credit':
                ren = self.latest_renewal or {}
                html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Cash Credit Slip - {loan['ticket_no']}</title>
<style>
@page {{ size: {'210mm 297mm' if format_type == 'a4' else '80mm auto'}; margin: 10mm; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: {'11pt' if format_type == 'a4' else '8pt'}; color: #333; max-width: {'210mm' if format_type == 'a4' else '80mm'}; margin: 0 auto; }}
.header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 10px; }}
.title {{ text-align: center; font-size: {'14pt' if format_type == 'a4' else '10pt'}; font-weight: bold; color: #415bd8; margin: 10px 0; }}
.row {{ display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px dotted #ddd; }}
.label {{ color: #666; }}
.value {{ font-weight: 700; }}
@media print {{ body {{ margin: 0; }} }}
</style>
</head><body>
<div class="header"><h2 style="margin:0">{company}</h2><div>{address}</div><div>Tel: {phone}</div></div>
<div class="title">CASH CREDIT SLIP</div>
<div class="row"><span class="label">Ticket No</span><span class="value">{loan['ticket_no']}</span></div>
<div class="row"><span class="label">Customer</span><span class="value">{loan['customer_name']}</span></div>
<div class="row"><span class="label">Renew Date</span><span class="value">{format_date(ren.get('renewed_at') or loan.get('renew_date') or '')}</span></div>
<div class="row"><span class="label">Received Amount</span><span class="value">{format_currency(ren.get('payment_amount', 0))}</span></div>
<div class="row"><span class="label">Interest Settled</span><span class="value">{format_currency(ren.get('interest_paid', 0))}</span></div>
<div class="row"><span class="label">Principal Reduced</span><span class="value">{format_currency(ren.get('principal_reduction', 0))}</span></div>
<div class="row"><span class="label">Balance Loan Amount</span><span class="value">{format_currency(loan['loan_amount'])}</span></div>
<div style="margin-top:24px">Received By: ____________________</div>
<div style="margin-top:12px">Customer Signature: ____________________</div>
<p style="text-align:center;font-style:italic;color:#999;font-size:8pt;margin-top:18px">Thank you for your payment.</p>
<script>window.onload=function(){{window.print();}}</script>
</body></html>'''

                tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
                tmp.write(html)
                tmp.close()
                webbrowser.open('file://' + tmp.name)
                messagebox.showinfo('Print', 'Windows print preview opened for A4 printing.')
                return

            page_width = '210mm' if format_type == 'a4' else '80mm'
            page_height = '297mm' if format_type == 'a4' else 'auto'

            items_html = ''
            for item in items:
                items_html += f'''<tr>
                    <td>{item['article_type']}</td>
                    <td>{item['carat']}K</td>
                    <td>{item['gold_weight']}g</td>
                    <td>{item['total_weight']}g</td>
                    <td style="text-align:right">{format_currency(item['estimated_value'])}</td>
                </tr>'''

            html = f'''<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>Loan Ticket - {loan['ticket_no']}</title>
<style>
@page {{ size: {page_width} {page_height}; margin: 10mm; }}
body {{ font-family: 'Segoe UI', Arial, sans-serif; font-size: {'11pt' if format_type == 'a4' else '8pt'}; color: #333; max-width: {page_width}; margin: 0 auto; }}
.header {{ text-align: center; border-bottom: 2px solid #333; padding-bottom: 8px; margin-bottom: 10px; }}
.header h1 {{ margin: 0; font-size: {'18pt' if format_type == 'a4' else '12pt'}; }}
.header p {{ margin: 2px 0; color: #666; font-size: {'9pt' if format_type == 'a4' else '7pt'}; }}
.title {{ text-align: center; font-size: {'14pt' if format_type == 'a4' else '10pt'}; font-weight: bold; color: #415bd8; margin: 10px 0; }}
table {{ width: 100%; border-collapse: collapse; margin: 8px 0; }}
th, td {{ padding: 4px 8px; text-align: left; border-bottom: 1px solid #ddd; font-size: {'10pt' if format_type == 'a4' else '7pt'}; }}
th {{ background: #f5f5f5; font-weight: bold; }}
.detail-row {{ display: flex; justify-content: space-between; padding: 2px 0; }}
.detail-label {{ color: #666; }}
.total-row {{ font-size: {'16pt' if format_type == 'a4' else '11pt'}; font-weight: bold; color: #415bd8; padding: 10px 0; border-top: 2px solid #415bd8; display: flex; justify-content: space-between; }}
.footer {{ font-size: {'8pt' if format_type == 'a4' else '6pt'}; color: #999; margin-top: 10px; }}
.signatures {{ display: flex; justify-content: space-around; margin-top: 40px; }}
.sig-box {{ text-align: center; }}
.sig-line {{ border-top: 1px solid #999; width: 120px; margin: 0 auto 4px; }}
@media print {{ body {{ margin: 0; }} }}
</style>
</head><body>
<div class="header">
    <h1>{company}</h1>
    <p>{address}</p>
    <p>Tel: {phone}</p>
</div>
<div class="title">GOLD LOAN TICKET</div>
<div class="detail-row"><span class="detail-label">Ticket No:</span><span><b>{loan['ticket_no']}</b></span></div>
<div class="detail-row"><span class="detail-label">Date:</span><span>{format_date(loan['issue_date'])}</span></div>
<div class="detail-row"><span class="detail-label">Expire:</span><span>{format_date(loan['expire_date'])}</span></div>
<div class="detail-row"><span class="detail-label">Customer:</span><span>{loan['customer_name']}</span></div>
<div class="detail-row"><span class="detail-label">NIC:</span><span>{loan['customer_nic']}</span></div>
<div class="detail-row"><span class="detail-label">Phone:</span><span>{loan['customer_phone']}</span></div>
<h3>Articles</h3>
<table><thead><tr><th>Type</th><th>Carat</th><th>Gold Wt</th><th>Total Wt</th><th style="text-align:right">Value</th></tr></thead>
<tbody>{items_html}</tbody></table>
<div class="detail-row"><span class="detail-label">Total Gold Weight:</span><span>{loan['total_gold_weight']}g</span></div>
<div class="detail-row"><span class="detail-label">Market Value:</span><span>{format_currency(loan['market_value'])}</span></div>
<div class="detail-row"><span class="detail-label">Assessed Value:</span><span>{format_currency(loan['assessed_value'])}</span></div>
<div class="detail-row"><span class="detail-label">Interest Rate:</span><span>{loan['interest_rate']}%/month</span></div>
<div class="detail-row"><span class="detail-label">Duration:</span><span>{loan['duration_months']} month(s)</span></div>
{f'<div class="detail-row"><span class="detail-label">Purpose:</span><span>{loan.get("purpose","")}</span></div>' if loan.get('purpose') else ''}
<div class="total-row"><span>LOAN AMOUNT</span><span>{format_currency(loan['loan_amount'])}</span></div>
<div class="footer">
<p>Terms: Gold articles held as collateral. Interest charged monthly. Articles forfeited if not redeemed/renewed by expiry.</p>
</div>
{'<div class="signatures"><div class="sig-box"><div class="sig-line"></div>Customer</div><div class="sig-box"><div class="sig-line"></div>Cashier</div><div class="sig-box"><div class="sig-line"></div>Manager</div></div>' if format_type == 'a4' else ''}
<p style="text-align:center;font-style:italic;color:#999;font-size:8pt">Thank you for choosing our services.</p>
<script>window.onload=function(){{window.print();}}</script>
</body></html>'''

            tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
            tmp.write(html)
            tmp.close()
            webbrowser.open('file://' + tmp.name)
            messagebox.showinfo('Print', 'Windows print preview opened for A4 printing.')

        except Exception as e:
            messagebox.showerror('Print Error', f'Could not open print preview:\n{str(e)}')
