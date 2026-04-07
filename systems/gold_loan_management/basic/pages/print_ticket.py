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
import re
import webbrowser
try:
    import webview
    WEBVIEW_AVAILABLE = True
except ImportError:
    WEBVIEW_AVAILABLE = False
from database import get_loan, get_loan_items, get_setting, get_loan_renewals
from utils import format_currency, format_date, get_status_text


class PrintTicketPage:
    ITEMS_PER_TICKET_PAGE = 4

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

        if self.doc_type == 'renewal_ticket' and not self.latest_renewal:
            messagebox.showwarning('Renewal Ticket', 'No renewal record found for this loan.')
            self.navigate('loan_detail', self.loan_id)
            return

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        # Header
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 10))
        back_btn = self.theme.make_button(hdr, text='← Back',
                                          command=lambda: self.navigate('loan_detail', self.loan_id),
                                          kind='ghost', width=8, pady=6)
        back_btn.pack(side=tk.LEFT, padx=(0, 10))
        title_map = {
            'cash_credit': 'Cash Credit Slip',
            'renewal_ticket': 'Renewal Ticket',
            'ticket': 'Ticket',
        }
        page_title = title_map.get(self.doc_type, 'Ticket')
        tk.Label(hdr, text=f'🖨 Print {page_title}: {loan["ticket_no"]}', font=self.theme.fonts.h1,
                 bg=self.theme.palette.bg_app, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)

        # Print options
        opt_frame = tk.Frame(view, bg=self.theme.palette.bg_app)
        opt_frame.pack(fill=tk.X, pady=(0, 10))
        self.theme.make_button(opt_frame, text='🖨 Print A4', command=lambda: self._open_preview_window(print_on_open=True),
                       kind='primary', width=14, pady=8).pack(side=tk.LEFT, padx=(0, 10))
        if self.doc_type == 'ticket':
            self.theme.make_button(opt_frame, text='🖨 Print Data Only', command=lambda: self._open_data_only_preview(print_on_open=True),
                       kind='secondary', width=18, pady=8).pack(side=tk.LEFT)

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

        if self.doc_type == 'ticket':
            web_data_btn = self.theme.make_button(
                btn_row,
                text='🌐 Web Print Data Only',
                command=self._do_print_data_only,
                kind='ghost',
                width=24,
                pady=8,
            )
            web_data_btn.pack(side=tk.LEFT, padx=(8, 0))

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
        # Windows file names cannot contain these characters.
        ticket_no = re.sub(r'[<>:"/\\|?*\x00-\x1F]', '_', str(ticket_no)).strip(' .') or 'ticket'
        stamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"pawn_ticket_{ticket_no}_{stamp}.pdf"
        return str(self._get_downloads_dir() / filename)

    def _get_edge_exe(self):
        """Locate Microsoft Edge executable on Windows systems."""
        # Try PATH first
        edge_in_path = shutil.which('msedge') or shutil.which('microsoft-edge') or shutil.which('edge')
        if edge_in_path:
            return edge_in_path

        # Try common Windows installation paths
        candidates = [
            os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            os.path.join(os.environ.get('ProgramFiles', ''), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
            os.path.join(os.environ.get('ProgramFiles(x86)', ''), 'Google', 'Chrome', 'Application', 'chrome.exe'),  # Chrome fallback
            os.path.join(os.environ.get('ProgramFiles', ''), 'Google', 'Chrome', 'Application', 'chrome.exe'),
        ]
        for cand in candidates:
            if cand and os.path.exists(cand):
                return cand
        return None

    def _generate_pdf_fallback_warning(self):
        """Generate a user-friendly error message for missing PDF generation dependencies."""
        return (
            'Microsoft Edge is required for PDF export and is not currently installed on this system.\n\n'
            'Options:\n'
            '1. Install Microsoft Edge from https://www.microsoft.com/en-us/edge/download\n'
            '2. Use "🌐 Open Web Print Preview" button and print to PDF using your browser\n\n'
            'The HTML preview is saved in your Downloads folder and can be printed manually.'
        )

    def _generate_pdf(self, html_path, pdf_path):
        """Generate PDF using Microsoft Edge headless mode."""
        edge_exe = self._get_edge_exe()
        if not edge_exe:
            # Provide helpful error message with alternatives
            raise RuntimeError(self._generate_pdf_fallback_warning())

        pdf_parent = Path(pdf_path).parent
        try:
            pdf_parent.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise RuntimeError(f'Unable to create PDF directory {pdf_parent}: {e}')

        cmd = [
            edge_exe,
            '--headless',
            '--disable-gpu',
            '--no-sandbox',
            f'--print-to-pdf={pdf_path}',
            Path(html_path).as_uri(),
        ]

        try:
            result = subprocess.run(cmd, check=False, capture_output=True, text=True, timeout=30)
        except subprocess.TimeoutExpired:
            raise RuntimeError('PDF generation timed out. Please try again.')
        except Exception as e:
            raise RuntimeError(f'Failed to start PDF generation process: {e}')

        if result.returncode != 0:
            stderr_msg = (result.stderr or '').strip() or 'Unknown error'
            stdout_msg = (result.stdout or '').strip() or ''
            error_detail = stderr_msg if stderr_msg else stdout_msg
            raise RuntimeError(f'PDF generation failed: {error_detail}')

        # Verify PDF was actually created
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f'PDF file was not generated at: {pdf_path}')

        # Verify PDF has content (not empty/zero-byte file)
        pdf_size = os.path.getsize(pdf_path)
        if pdf_size == 0:
            os.remove(pdf_path)
            raise RuntimeError('PDF generation produced an empty file. Please try again or use browser print-to-PDF.')

        return pdf_path

    def _save_pdf(self):
        """Save the current ticket as a PDF file."""
        try:
            if self.doc_type == 'ticket' and not self._confirm_multi_page_ticket():
                return

            pdf_path = self._make_pdf_path()

            if self.doc_type == 'cash_credit':
                html_content = self._build_cash_credit_html('a4', Path(pdf_path).as_uri())
            elif self.doc_type == 'renewal_ticket':
                html_content = self._build_renewal_ticket_html(Path(pdf_path).as_uri())
            else:
                html_content = self._build_pawn_ticket_html(Path(pdf_path).as_uri())

            html_path = self._write_temp_html(html_content)
            self._generate_pdf(html_path, pdf_path)

            if not os.path.exists(pdf_path):
                raise FileNotFoundError(f'PDF file disappeared after generation: {pdf_path}')

            # Try to open the PDF file
            try:
                if sys.platform == 'win32':
                    os.startfile(pdf_path)
                elif sys.platform == 'darwin':
                    subprocess.run(['open', pdf_path], check=False)
                else:  # Linux
                    subprocess.run(['xdg-open', pdf_path], check=False)
                messagebox.showinfo('PDF Saved', f'PDF saved to:\n{pdf_path}')
            except Exception as open_error:
                messagebox.showinfo('PDF Saved', f'PDF saved to:\n{pdf_path}\n\n(Could not open automatically: {open_error})')
        except Exception as exc:
            error_msg = str(exc)
            if 'Edge is required' in error_msg or 'Microsoft Edge' in error_msg:
                messagebox.showerror('PDF Export - Dependencies Required', error_msg)
            else:
                messagebox.showerror('PDF Export Error', f'Could not save PDF:\n{error_msg}')

    def _try_open_webview(self, html_path, title, print_on_open=False):
        """Try to open pywebview, returning True if successful."""
        if not WEBVIEW_AVAILABLE:
            return False

        try:
            html_uri = Path(html_path).as_uri()

            # In packaged (.exe) mode, launching sys.executable with '-c' reopens the app.
            # Run pywebview in-process instead.
            if getattr(sys, 'frozen', False):
                window = webview.create_window(title, html_uri)

                def on_start():
                    if print_on_open:
                        try:
                            window.evaluate_js('setTimeout(function(){window.print();}, 300);')
                        except Exception:
                            pass

                try:
                    webview.start(on_start)
                except KeyboardInterrupt:
                    pass
                return True

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
                "try:\n"
                "    webview.start(on_start)\n"
                "except KeyboardInterrupt:\n"
                "    pass\n"
            )
            proc = subprocess.Popen(
                [sys.executable, '-c', script],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True
            )
            proc.poll()
            if proc.returncode is None or proc.returncode == 0:
                return True

            stderr_output = proc.stderr.read() if proc.stderr else ''
            if stderr_output:
                print(f"Warning: pywebview error: {stderr_output}")
            return False
        except Exception as exc:
            print(f"Warning: pywebview open failed: {exc}")
            return False

    def _open_preview_window(self, print_on_open=False):
        try:
            if self.doc_type == 'ticket' and not self._confirm_multi_page_ticket():
                return

            if self.doc_type == 'cash_credit':
                html_content = self._build_cash_credit_html('a4', '')
            elif self.doc_type == 'renewal_ticket':
                html_content = self._build_renewal_ticket_html('')
            else:
                html_content = self._build_pawn_ticket_html('')

            html_path = self._write_temp_html(html_content)
            title = f"Print Preview - {self.loan.get('ticket_no', '')}"

            if self._try_open_webview(html_path, title, print_on_open):
                return

            webbrowser.open(Path(html_path).as_uri())
        except Exception as exc:
            messagebox.showerror('Preview Error', f'Could not open preview window:\n{exc}')

    def _build_data_only_pawn_ticket_html(self):
        html_content = self._build_pawn_ticket_html('')
        html_content = re.sub(
            r'<!-- ============ PAGE 2 — BACKSIDE ============ -->[\s\S]*?(?=</body>)',
            '',
            html_content,
            count=1,
        )
        data_only_css = (
            '\n    body.data-only * {'
            ' color: transparent !important;'
            ' text-shadow: none !important;'
            ' }\n'
            '    body.data-only, body.data-only .page, body.data-only .ticket, body.data-only .ticket * {'
            ' background: transparent !important;'
            ' }\n'
            '    body.data-only .value, body.data-only .value * {'
            ' color: #000 !important;'
            ' }\n'
            '    body.data-only .rounded-field, body.data-only .rounded-field * {'
            ' color: #000 !important;'
            ' }\n'
            '    body.data-only .grid-table tbody td, body.data-only .grid-table tbody td * {'
            ' color: #000 !important;'
            ' }\n'
            '    body.data-only .ticket-page-note {'
            ' color: #000 !important;'
            ' }\n'
            '    body.data-only .brand-banner, body.data-only .tagline, body.data-only .contact-strip {'
            ' background: transparent !important;'
            ' border-color: transparent !important;'
            ' box-shadow: none !important;'
            ' }\n'
            '    body.data-only img {'
            ' visibility: hidden !important;'
            ' }\n'
            '    body.data-only .divider {'
            ' border: none !important;'
            ' margin: 0 !important;'
            ' height: 0 !important;'
            ' }\n'
            '    body.data-only .bottom-copy {'
            ' margin-top: 5mm !important;'
            ' }\n'
            '    body.data-only .border-b, body.data-only .border-r, body.data-only .border-t,'
            ' body.data-only .ticket-body, body.data-only .grid-table th, body.data-only .grid-table td,'
            ' body.data-only .rounded-field, body.data-only .sign-line {'
            ' border: none !important;'
            ' box-shadow: none !important;'
            ' }\n'
            '    body.data-only .serial-stack, body.data-only .logo-box {'
            ' border-left: none !important;'
            ' border-right: none !important;'
            ' }\n'
            '    body.data-only .split-stack::after {'
            ' display: none !important;'
            ' }\n'
            '    body.data-only [style*="border-left"], body.data-only [style*="border-right"],'
            ' body.data-only [style*="border-top"], body.data-only [style*="border-bottom"] {'
            ' border-left: none !important;'
            ' border-right: none !important;'
            ' border-top: none !important;'
            ' border-bottom: none !important;'
            ' }\n'
            '    body.data-only .grid-table th {'
            ' background: transparent !important;'
            ' }\n'
            '    body.data-only .no-print {'
            ' display: none !important;'
            ' }\n'
        )
        html_content = html_content.replace('</style>', f'{data_only_css}</style>', 1)
        html_content = html_content.replace('<body>', '<body class="data-only">', 1)
        return html_content

    def _open_data_only_preview(self, print_on_open=False):
        if self.doc_type == 'cash_credit':
            messagebox.showwarning('Data Only Print', 'Data-only template print is available only for pawn tickets.')
            return

        try:
            if not self._confirm_multi_page_ticket():
                return

            html_content = self._build_data_only_pawn_ticket_html()
            html_path = self._write_temp_html(html_content)
            title = f"Data Only Print - {self.loan.get('ticket_no', '')}"

            if self._try_open_webview(html_path, title, print_on_open):
                return

            webbrowser.open(Path(html_path).as_uri())
        except Exception as exc:
            messagebox.showerror('Data Only Print', f'Could not open data-only print preview:\n{exc}')

    def _do_print_data_only(self):
        if self.doc_type == 'cash_credit':
            messagebox.showwarning('Data Only Print', 'Data-only template print is available only for pawn tickets.')
            return

        try:
            import webbrowser

            if not self._confirm_multi_page_ticket():
                return

            html_content = self._build_data_only_pawn_ticket_html()
            html_path = self._write_temp_html(html_content)
            webbrowser.open(Path(html_path).as_uri())
        except Exception as exc:
            messagebox.showerror('Data Only Print', f'Could not open web data-only print preview:\n{exc}')

    def _confirm_multi_page_ticket(self):
        if self.doc_type != 'ticket':
            return True

        total_items = len(self.items or [])
        if total_items <= self.ITEMS_PER_TICKET_PAGE:
            return True

        total_pages = (total_items + self.ITEMS_PER_TICKET_PAGE - 1) // self.ITEMS_PER_TICKET_PAGE
        return messagebox.askyesno(
            'Multiple Ticket Pages',
            (
                f'This ticket has {total_items} items.\n'
                f'It will print on {total_pages} ticket paper page(s) '
                f'({self.ITEMS_PER_TICKET_PAGE} items per page).\n\n'
                'Continue to preview/print?'
            ),
        )

    def _load_pawn_ticket_template(self):
        template_path = self._resolve_ticket_asset_path('pawn_ticket_template.html')
        with open(template_path, 'r', encoding='utf-8') as template_file:
            return template_file.read()

    def _load_renew_pawn_ticket_template(self):
        template_path = self._resolve_ticket_asset_path('renew_pawn_ticket_template.html')
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

    def _get_logo_src(self):
        configured_logo_path = (get_setting('company_logo_path', '') or '').strip()
        if configured_logo_path:
            logo_path = Path(configured_logo_path)
            if logo_path.exists():
                return logo_path.as_uri()

        configured_logo_url = (get_setting('company_logo_url', '') or '').strip()
        if configured_logo_url:
            if configured_logo_url.startswith(('http://', 'https://', 'file://', 'data:')):
                return configured_logo_url
            if configured_logo_url.startswith('/'):
                api_base = os.getenv('ZORO9X_PUBLIC_API_URL', '').strip()
                if not api_base:
                    server_url_file = Path(__file__).resolve().parent.parent / 'server_api_url.txt'
                    if server_url_file.exists():
                        try:
                            api_base = (server_url_file.read_text(encoding='utf-8') or '').strip()
                        except Exception:
                            api_base = ''
                if not api_base:
                    api_base = 'https://www.zoro9x.com'
                return f"{api_base.rstrip('/')}{configured_logo_url}"

        for fallback_name in ('logo.png', 'pms_logo.png'):
            try:
                fallback_logo_path = Path(self._resolve_ticket_asset_path(fallback_name))
                if fallback_logo_path.exists():
                    return fallback_logo_path.as_uri()
            except FileNotFoundError:
                continue
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

    def _extract_body_inner_html(self, full_html):
        body_start = full_html.find('<body>')
        body_end = full_html.rfind('</body>')
        if body_start == -1 or body_end == -1 or body_end <= body_start:
            return full_html
        return full_html[body_start + len('<body>'):body_end]

    def _remove_no_print_block(self, html_fragment):
        return re.sub(r'<div class="no-print">[\s\S]*?</div>', '', html_fragment, count=1)

    def _inject_ticket_page_number(self, template_html, page_number, total_pages):
        page_label = '' if total_pages <= 1 else f'Ticket Paper Page {page_number} of {total_pages}'
        return template_html.replace('{{TICKET_PAGE_INFO}}', html_escape.escape(page_label))

    def _prepare_items_with_assessed_values(self, items):
        prepared_items = [dict(item) for item in (items or [])]
        if not prepared_items:
            return prepared_items

        market_value = float(self.loan.get('market_value') or 0)
        assessed_value = float(self.loan.get('assessed_value') or 0)

        if market_value <= 0:
            for item in prepared_items:
                item['assessed_value'] = round(float(item.get('estimated_value') or 0), 2)
            return prepared_items

        ratio = assessed_value / market_value
        assessed_values = [
            round(float(item.get('estimated_value') or 0) * ratio, 2)
            for item in prepared_items
        ]

        # Keep item-level assessed values aligned with loan assessed total after rounding.
        rounding_delta = round(assessed_value - sum(assessed_values), 2)
        assessed_values[-1] = round(assessed_values[-1] + rounding_delta, 2)

        for index, item in enumerate(prepared_items):
            item['assessed_value'] = max(0.0, assessed_values[index])

        return prepared_items

    def _build_item_rows_html(self, items, include_total=False, row_font_size_px=None):
        rows = []
        max_rows = self.ITEMS_PER_TICKET_PAGE
        row_height_mm = 6
        target_rows = max_rows if include_total else (max_rows + 1)
        row_style = f"height: {row_height_mm}mm;"
        if row_font_size_px:
            row_style += f" font-size: {row_font_size_px}px !important;"
        total_weight = 0.0
        total_gold_weight = 0.0
        total_value = 0.0

        for item in items:
            total_weight += float(item.get('total_weight') or 0)
            total_gold_weight += float(item.get('gold_weight') or 0)
            total_value += float(item.get('assessed_value') or item.get('estimated_value') or 0)

        for item in items[:max_rows]:
            desc = item.get('article_type', '')
            if item.get('description'):
                desc = f"{desc} - {item['description']}"

            rows.append(
                f"<tr style=\"{row_style}\">"
                f"<td>{html_escape.escape(str(desc))}</td>"
                f"<td class=\"right\">{float(item.get('total_weight') or 0):.2f}</td>"
                f"<td class=\"right\">{float(item.get('gold_weight') or 0):.2f}</td>"
                f"<td class=\"center\">{int(item.get('carat') or 0)}K</td>"
                f"<td class=\"right\">{format_currency(item.get('assessed_value') or item.get('estimated_value') or 0)}</td>"
                "</tr>"
            )

        remaining_rows = target_rows - len(rows)
        if remaining_rows > 0:
            rows.append(
                f"<tr class=\"empty-space-row\" style=\"height: {remaining_rows * row_height_mm}mm;{' font-size: ' + str(row_font_size_px) + 'px !important;' if row_font_size_px else ''}\">"
                "<td></td><td></td><td></td><td></td><td></td>"
                "</tr>"
            )

        if include_total:
            rows.append(
                f"<tr style=\"{row_style}\">"
                "<td class=\"right bold\">එකතුව / மொத்தம் / Total</td>"
                f"<td class=\"right\">{total_weight:.2f}</td>"
                f"<td class=\"right\">{total_gold_weight:.2f}</td>"
                "<td></td>"
                f"<td class=\"right\">{format_currency(total_value)}</td>"
                "</tr>"
            )

        return ''.join(rows)

    def _build_renew_item_rows_html(self, items, max_rows=4):
        rows = []
        for item in (items or [])[:max_rows]:
            desc = item.get('article_type', '')
            if item.get('description'):
                desc = f"{desc} - {item['description']}"
            rows.append(
                '<tr>'
                f"<td>{html_escape.escape(str(desc))}</td>"
                f"<td class=\"right\">{float(item.get('gold_weight') or 0):.2f}</td>"
                f"<td class=\"right\">{format_currency(item.get('assessed_value') or item.get('estimated_value') or 0)}</td>"
                '</tr>'
            )

        for _ in range(max(0, max_rows - len(rows))):
            rows.append('<tr><td>&nbsp;</td><td></td><td></td></tr>')

        return ''.join(rows)

    def _render_single_ticket_page(self, template, items, page_number, total_pages, pdf_uri=''):
        loan = self.loan

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

        page_template = self._inject_ticket_page_number(template, page_number, total_pages)
        item_rows_top = self._build_item_rows_html(items, include_total=True, row_font_size_px=12)
        item_rows_bottom = self._build_item_rows_html(items, include_total=False, row_font_size_px=11)

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
            page_template = page_template.replace(key, value)

        return page_template

    def _build_pawn_ticket_html(self, pdf_uri=''):
        items = self._prepare_items_with_assessed_values(self.items or [])
        template = self._load_pawn_ticket_template()
        chunked_items = [
            items[i:i + self.ITEMS_PER_TICKET_PAGE]
            for i in range(0, len(items), self.ITEMS_PER_TICKET_PAGE)
        ] or [[]]

        total_pages = len(chunked_items)
        rendered_pages = [
            self._render_single_ticket_page(template, item_chunk, index + 1, total_pages, pdf_uri)
            for index, item_chunk in enumerate(chunked_items)
        ]

        if total_pages == 1:
            return rendered_pages[0]

        combined_html = rendered_pages[0]
        extra_style = (
            '\n    .ticket-template-break {'
            ' page-break-before: always;'
            ' break-before: page;'
            ' height: 0;'
            ' }\n'
            '    .page {'
            ' page-break-inside: avoid;'
            ' break-inside: avoid-page;'
            ' }\n'
        )
        combined_html = combined_html.replace('</style>', f'{extra_style}</style>', 1)

        for next_page_html in rendered_pages[1:]:
            page_body_html = self._remove_no_print_block(self._extract_body_inner_html(next_page_html))
            combined_html = combined_html.replace(
                '</body>',
                f'<div class="ticket-template-break"></div>{page_body_html}</body>',
                1,
            )

        return combined_html

    def _build_renewal_ticket_html(self, pdf_uri=''):
        if not self.latest_renewal:
            raise ValueError('No renewal record found for this loan.')

        loan = self.loan
        renewal = self.latest_renewal
        prepared_items = self._prepare_items_with_assessed_values(self.items or [])
        template = self._load_renew_pawn_ticket_template()
        amount_before_renewal = float(renewal.get('new_loan_amount') or 0) + float(renewal.get('principal_reduction') or 0)

        renew_date_raw = renewal.get('renewed_at') or ''
        renew_date = format_date(renew_date_raw)
        renew_time = ''
        if isinstance(renew_date_raw, str) and ' ' in renew_date_raw:
            renew_time = renew_date_raw.split(' ', 1)[1][:5]

        replacements = {
            '{{LOGO_SRC}}': html_escape.escape(str(self._get_logo_src())),
            '{{PDF_URI}}': html_escape.escape(str(pdf_uri)),
            '{{BRANCH}}': html_escape.escape(str(get_setting('branch_name', 'Kolonna'))),
            '{{PAWN_TICKET_NO}}': html_escape.escape(str(loan.get('ticket_no', ''))),
            '{{DATE}}': html_escape.escape(str(renew_date)),
            '{{TIME}}': html_escape.escape(str(renew_time)),
            '{{PAWNER_NAME}}': html_escape.escape(str(loan.get('customer_name', ''))),
            '{{PAWNER_ADDRESS}}': html_escape.escape(str(loan.get('customer_address', ''))),
            '{{NIC}}': html_escape.escape(str(loan.get('customer_nic', ''))),
            '{{PHONE}}': html_escape.escape(str(loan.get('customer_phone', ''))),
            '{{PREVIOUS_LOAN_AMOUNT}}': html_escape.escape(str(format_currency(amount_before_renewal))),
            '{{RENEWAL_PAYMENT_AMOUNT}}': html_escape.escape(str(format_currency(renewal.get('payment_amount', 0)))),
            '{{RENEWAL_INTEREST_PAID}}': html_escape.escape(str(format_currency(renewal.get('interest_paid', 0)))),
            '{{RENEWAL_PRINCIPAL_REDUCTION}}': html_escape.escape(str(format_currency(renewal.get('principal_reduction', 0)))),
            '{{NEW_LOAN_AMOUNT}}': html_escape.escape(str(format_currency(renewal.get('new_loan_amount', loan.get('loan_amount', 0))))),
            '{{NEW_INTEREST_RATE}}': html_escape.escape(str(f"{renewal.get('new_interest_rate', loan.get('interest_rate', 0))}%")),
            '{{NEW_EXPIRE_DATE}}': html_escape.escape(str(format_date(renewal.get('new_expire_date', '')))),
            '{{RENEWAL_REMARKS}}': html_escape.escape(str(renewal.get('remarks') or '-')),
            '{{RENEWED_BY}}': html_escape.escape(str(renewal.get('renewed_by_name') or self.user.get('full_name', ''))),
            '{{ITEM_ROWS_RENEW}}': self._build_renew_item_rows_html(prepared_items),
        }

        html_content = template
        for key, value in replacements.items():
            html_content = html_content.replace(key, value)

        return html_content

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

            if self.doc_type == 'renewal_ticket':
                html = self._build_renewal_ticket_html('')
                html_path = self._write_temp_html(html)
                webbrowser.open(Path(html_path).as_uri())
                return

            if not self._confirm_multi_page_ticket():
                return

            html = self._build_pawn_ticket_html('')
            html_path = self._write_temp_html(html)
            webbrowser.open(Path(html_path).as_uri())

        except Exception as e:
            messagebox.showerror('Print Error', f'Could not open print preview:\n{str(e)}')
