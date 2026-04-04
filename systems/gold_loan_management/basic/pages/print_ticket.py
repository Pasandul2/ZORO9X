"""Print Ticket Page for Gold Loan System."""

import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import tkinter as tk
from datetime import datetime
from tkinter import messagebox
import html as html_escape
import webview
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
        self.theme.make_button(opt_frame, text='🖨 Print A4', command=lambda: self._open_preview_window(print_on_open=True),
                       kind='primary', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 10))

        # HTML preview info
        preview_card = self.theme.make_card(view, bg='#ffffff', padding=(6, 6))
        preview_card.pack(fill=tk.BOTH, expand=True)
        preview_card.configure(height=980)
        self.preview_frame = preview_card.inner

        info = tk.Label(
            self.preview_frame,
            text='Preview opens in a separate window for full fidelity rendering.',
            font=self.theme.fonts.body,
            bg='#ffffff',
            fg=self.theme.palette.text_muted,
        )
        info.pack(anchor='w', padx=12, pady=(12, 6))

        btn_row = tk.Frame(self.preview_frame, bg='#ffffff')
        btn_row.pack(anchor='w', padx=12, pady=(0, 6))

        open_btn = self.theme.make_button(
            btn_row,
            text='🪟 Open Preview Window',
            command=self._open_preview_window,
            kind='secondary',
            width=22,
            pady=8,
        )
        open_btn.pack(side=tk.LEFT, padx=(0, 8))

        web_btn = self.theme.make_button(
            btn_row,
            text='🌐 Open Web Print Preview',
            command=lambda: self._do_print('a4'),
            kind='ghost',
            width=24,
            pady=8,
        )
        web_btn.pack(side=tk.LEFT)

        save_btn = self.theme.make_button(
            btn_row,
            text='💾 Save as PDF',
            command=self._save_pdf,
            kind='secondary',
            width=16,
            pady=8,
        )
        save_btn.pack(side=tk.LEFT, padx=(8, 0))

        # Preview opens on demand.

    def _build_cash_credit_html(self, format_type='a4', pdf_uri=''):
        loan = self.loan
        ren = self.latest_renewal or {}
        company = get_setting('company_name', 'Gold Loan Center')
        phone = get_setting('company_phone', '')
        address = get_setting('company_address', '')

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
</body></html>'''

        return html

    def _write_temp_html(self, html_content):
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        tmp.write(html_content)
        tmp.close()
        return tmp.name

    def _get_downloads_dir(self):
        downloads = Path.home() / 'Downloads'
        downloads.mkdir(parents=True, exist_ok=True)
        return downloads

    def _make_pdf_path(self):
        ticket_no = self.loan.get('ticket_no', 'ticket') if self.loan else 'ticket'
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"pawn_ticket_{ticket_no}_{stamp}.pdf"
        return str(self._get_downloads_dir() / filename)

    def _get_edge_exe(self):
        edge_in_path = shutil.which('msedge')
        if edge_in_path:
            return edge_in_path

        candidates = [
            os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            os.path.join(os.environ.get('ProgramFiles', ''), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
        ]
        for cand in candidates:
            if cand and os.path.exists(cand):
                return cand
        return None

    def _generate_pdf(self, html_path, pdf_path):
        edge_exe = self._get_edge_exe()
        if not edge_exe:
            raise RuntimeError('Microsoft Edge not found for PDF export.')

        cmd = [
            edge_exe,
            '--headless',
            '--disable-gpu',
            f'--print-to-pdf={pdf_path}',
            Path(html_path).as_uri(),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        return pdf_path

    def _save_pdf(self):
        try:
            pdf_path = self._make_pdf_path()

            if self.doc_type == 'cash_credit':
                html_content = self._build_cash_credit_html('a4', Path(pdf_path).as_uri())
            else:
                html_content = self._build_pawn_ticket_html(Path(pdf_path).as_uri())

            html_path = self._write_temp_html(html_content)
            self._generate_pdf(html_path, pdf_path)

            os.startfile(pdf_path)
        except Exception as exc:
            messagebox.showerror('PDF Export', f'Could not save PDF:\n{exc}')

    def _open_preview_window(self, print_on_open=False):
        try:
            if self.doc_type == 'cash_credit':
                html_content = self._build_cash_credit_html('a4', '')
            else:
                html_content = self._build_pawn_ticket_html('')

            html_path = self._write_temp_html(html_content)
            title = f"Print Preview - {self.loan.get('ticket_no', '')}"

            script = (
                "import pathlib, webview\n"
                f"window = webview.create_window({title!r}, pathlib.Path({html_path!r}).as_uri())\n"
                f"print_on_open = {print_on_open!r}\n"
                "def on_start():\n"
                "    if print_on_open:\n"
                "        try:\n"
                "            window.evaluate_js('setTimeout(function(){window.print();}, 300);')\n"
                "        except Exception:\n"
                "            pass\n"
                "webview.start(on_start)\n"
            )
            subprocess.Popen([sys.executable, '-c', script])
        except Exception as exc:
            messagebox.showerror('Preview Error', f'Could not open preview window:\n{exc}')

    def _load_pawn_ticket_template(self):
        template_path = os.path.normpath(
            os.path.join(os.path.dirname(__file__), '..', 'pawn_ticket', 'pawn_ticket_template.html')
        )
        with open(template_path, 'r', encoding='utf-8') as template_file:
            return template_file.read()

    def _get_logo_src(self):
        logo_path = Path(__file__).resolve().parent.parent / 'logo.png'
        if not logo_path.exists():
            logo_path = Path(__file__).resolve().parent.parent / 'pawn_ticket' / 'pms_logo.png'
        if logo_path.exists():
            return logo_path.as_uri()
        return ''

    def _format_issue_time(self, loan):
        created_at = loan.get('created_at') or ''
        if not created_at:
            return ''
        if isinstance(created_at, str) and ' ' in created_at:
            time_part = created_at.split(' ', 1)[1]
            try:
                dt = datetime.strptime(created_at, '%Y-%m-%d %H:%M:%S')
                return dt.strftime('%H:%M')
            except ValueError:
                return time_part[:5]
        return ''

    def _build_item_rows_html(self, items, include_total=False):
        rows = []
        total_weight = 0.0
        total_gold_weight = 0.0
        total_value = 0.0

        for item in items:
            desc = item.get('article_type', '')
            if item.get('description'):
                desc = f"{desc} - {item['description']}"
            total_weight += float(item.get('total_weight') or 0)
            total_gold_weight += float(item.get('gold_weight') or 0)
            total_value += float(item.get('estimated_value') or 0)

            rows.append(
                "<tr>"
                f"<td>{html_escape.escape(str(desc))}</td>"
                f"<td class=\"right\">{float(item.get('total_weight') or 0):.2f}</td>"
                f"<td class=\"right\">{float(item.get('gold_weight') or 0):.2f}</td>"
                f"<td class=\"center\">{int(item.get('carat') or 0)}K</td>"
                f"<td class=\"center\">{int(item.get('carat') or 0)}</td>"
                f"<td class=\"right\">{format_currency(item.get('estimated_value') or 0)}</td>"
                "</tr>"
            )

        if not rows:
            rows.append(
                "<tr style=\"height: 25mm;\">"
                "<td></td><td class=\"right\"></td><td class=\"right\"></td>"
                "<td class=\"center\"></td><td class=\"center\"></td><td class=\"right\"></td>"
                "</tr>"
            )

        if include_total:
            rows.append(
                "<tr>"
                "<td class=\"right bold\">එකතුව / මொத்தம் / Total</td>"
                f"<td class=\"right\">{total_weight:.2f}</td>"
                f"<td class=\"right\">{total_gold_weight:.2f}</td>"
                "<td></td><td></td>"
                f"<td class=\"right\">{format_currency(total_value)}</td>"
                "</tr>"
            )

        return ''.join(rows)

    def _build_pawn_ticket_html(self, pdf_uri=''):
        loan = self.loan
        items = self.items
        template = self._load_pawn_ticket_template()

        branch = get_setting('branch_name', 'Kolonna')
        logo_src = self._get_logo_src()
        serial_no = loan.get('ticket_no', '')
        ticket_no = loan.get('ticket_no', '')
        date_str = format_date(loan.get('issue_date', ''))
        time_str = self._format_issue_time(loan)
        pawner_name = loan.get('customer_name', '')
        pawner_address = loan.get('customer_address', '')
        nic = loan.get('customer_nic', '')
        phone = loan.get('customer_phone', '')
        interest_rate = f"{loan.get('interest_rate', '')}%"
        market_value = format_currency(loan.get('market_value', 0))
        assessed_value = format_currency(loan.get('assessed_value', 0))
        amount_advanced = format_currency(loan.get('advance_amount') or loan.get('loan_amount') or 0)
        purpose = loan.get('purpose', '')
        period = f"{loan.get('duration_months', '')} month(s)"
        redemption_date = format_date(loan.get('expire_date', ''))

        item_rows_top = self._build_item_rows_html(items, include_total=True)
        item_rows_bottom = self._build_item_rows_html(items, include_total=False)

        replacements = {
            '{{LOGO_SRC}}': html_escape.escape(str(logo_src)),
            '{{PDF_URI}}': html_escape.escape(str(pdf_uri)),
            '{{SERIAL_NO}}': html_escape.escape(str(serial_no)),
            '{{BRANCH}}': html_escape.escape(str(branch)),
            '{{PAWN_TICKET_NO}}': html_escape.escape(str(ticket_no)),
            '{{DATE}}': html_escape.escape(str(date_str)),
            '{{TIME}}': html_escape.escape(str(time_str)),
            '{{PAWNER_NAME}}': html_escape.escape(str(pawner_name)),
            '{{PAWNER_ADDRESS}}': html_escape.escape(str(pawner_address)),
            '{{INTEREST_RATE}}': html_escape.escape(str(interest_rate)),
            '{{MARKET_VALUE}}': html_escape.escape(str(market_value)),
            '{{ASSESSED_VALUE}}': html_escape.escape(str(assessed_value)),
            '{{AMOUNT_ADVANCED}}': html_escape.escape(str(amount_advanced)),
            '{{NIC}}': html_escape.escape(str(nic)),
            '{{PHONE}}': html_escape.escape(str(phone)),
            '{{ITEM_ROWS_TOP}}': item_rows_top,
            '{{PURPOSE}}': html_escape.escape(str(purpose)),
            '{{PERIOD}}': html_escape.escape(str(period)),
            '{{REDEMPTION_DATE}}': html_escape.escape(str(redemption_date)),
            '{{CASH_VOUCHER_NO}}': html_escape.escape(str(ticket_no)),
            '{{CASH_RECEIVED_BY}}': html_escape.escape(str(self.user.get('full_name', ''))),
            '{{PAWNING_ADVANCE}}': html_escape.escape(str(amount_advanced)),
            '{{ITEM_ROWS_BOTTOM}}': item_rows_bottom,
        }

        for key, value in replacements.items():
            template = template.replace(key, value)

        return template

    def _do_print(self, format_type):
        """Print using system print dialog."""
        try:
            import webbrowser

            loan = self.loan
            items = self.items
            company = get_setting('company_name', 'Gold Loan Center')
            phone = get_setting('company_phone', '')
            address = get_setting('company_address', '')

            if self.doc_type == 'cash_credit':
                html = self._build_cash_credit_html('a4', '')
                html_path = self._write_temp_html(html)
                webbrowser.open(Path(html_path).as_uri())
                return

            html = self._build_pawn_ticket_html('')
            html_path = self._write_temp_html(html)
            webbrowser.open(Path(html_path).as_uri())

        except Exception as e:
            messagebox.showerror('Print Error', f'Could not open print preview:\n{str(e)}')
