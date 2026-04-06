"""Letters page with template management and rich text editing."""

import html
import json
import os
import tempfile
import tkinter as tk
import tkinter.font as tkfont
import webbrowser
from datetime import datetime, timedelta
from tkinter import colorchooser, filedialog, messagebox, simpledialog, ttk

try:
    from PIL import Image, ImageTk
except Exception:
    Image = None
    ImageTk = None

from database import (
    get_connection,
    get_duration_rate,
    get_setting,
    set_setting,
    get_loan,
    get_customer_letter,
    get_letter_template,
    list_customer_letters,
    list_letter_templates,
    save_customer_letter,
    save_letter_template,
    search_overdue_loans_for_letters,
    delete_letter_template,
)
from utils import calculate_total_payable, format_currency, format_date


FONT_FAMILIES = [
    'Segoe UI',
    'Nirmala UI',
    'Iskoola Pota',
    'Noto Sans Sinhala',
    'Noto Sans Tamil',
    'Arial',
    'Times New Roman',
]
FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 22, 28]
PLACEHOLDERS = [
    '{{customer_name}}', '{{customer_nic}}', '{{customer_phone}}', '{{customer_address}}',
    '{{customer_dob}}', '{{customer_job}}', '{{customer_marital_status}}', '{{customer_language}}',
    '{{ticket_no}}', '{{loan_amount}}', '{{market_value}}', '{{assessed_value}}',
    '{{assessed_percent}}', '{{interest_principal}}', '{{interest_rate}}', '{{duration}}',
    '{{issue_date}}', '{{renew_date}}', '{{expire_date}}', '{{date}}', '{{time}}', '{{overdue_days}}',
    '{{accrued_interest}}', '{{overdue_base}}', '{{overdue_penalty}}', '{{overdue_interest}}',
    '{{total_outstanding}}', '{{total_payable}}', '{{article_description}}', '{{article_weight}}', '{{article_purity}}',
    '{{total_weight}}', '{{deduction_weight}}', '{{gold_weight}}',
]

DEFAULT_LETTER_TYPES = [
    'overdue_notice',
    'before_forfeit_notice',
    'payment_reminder',
    'custom_notice',
]

OVERDUE_STAGE_OPTIONS = [
    'All Overdue',
    'Before Forfeited (60+ Days)',
    'Overdue 1+ Month',
    'Overdue 2+ Months',
    'Overdue 3+ Months',
    'Due In Next 7 Days',
]

CUSTOMER_FIELD_TOKENS = [
    '{{customer_name}}',
    '{{customer_nic}}',
    '{{customer_phone}}',
    '{{customer_address}}',
    '{{customer_dob}}',
    '{{customer_job}}',
    '{{customer_marital_status}}',
    '{{customer_language}}',
]

LOAN_FIELD_TOKENS = [
    '{{ticket_no}}',
    '{{loan_amount}}',
    '{{market_value}}',
    '{{assessed_value}}',
    '{{assessed_percent}}',
    '{{interest_principal}}',
    '{{interest_rate}}',
    '{{duration}}',
    '{{issue_date}}',
    '{{renew_date}}',
    '{{expire_date}}',
    '{{date}}',
    '{{time}}',
    '{{overdue_days}}',
    '{{accrued_interest}}',
    '{{overdue_base}}',
    '{{overdue_penalty}}',
    '{{overdue_interest}}',
    '{{total_outstanding}}',
    '{{total_payable}}',
]

ARTICLE_FIELD_TOKENS = [
    '{{article_description}}',
    '{{article_weight}}',
    '{{article_purity}}',
    '{{total_weight}}',
    '{{deduction_weight}}',
    '{{gold_weight}}',
]

LETTER_SIZE_OPTIONS = ['A4', 'A5', '1/2 A4', '1/3 A4']
LETTER_SIZE_EDITOR_DIMENSIONS = {
    'A4': (96, 28),
    'A5': (72, 20),
    '1/2 A4': (96, 14),
    '1/3 A4': (96, 10),
}
LETTER_SIZE_PAGE_MAP = {
    'A4': 'A4',
    'A5': 'A5',
    '1/2 A4': '210mm 148.5mm',
    '1/3 A4': '210mm 99mm',
}


class ResizableImageEmbed:
    def __init__(self, parent, image_path, bg, enable_resize=True):
        self.parent = parent
        self.image_path = image_path
        self.bg = bg
        self.enable_resize = enable_resize
        self.original = tk.PhotoImage(file=image_path)
        self.original_pil = None
        if Image is not None and ImageTk is not None:
            try:
                self.original_pil = Image.open(image_path)
            except Exception:
                self.original_pil = None

        self.display = self.original
        self.current_width = self.display.width()
        self._drag_start_x = None
        self._drag_start_width = None
        self._resizing = False

        self.frame = tk.Frame(parent, bg=bg, bd=1, relief='solid')
        self.canvas = tk.Canvas(self.frame, bg=bg, highlightthickness=0, bd=0)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        self._render()

        if self.enable_resize:
            self.canvas.bind('<ButtonPress-1>', self._start_resize)
            self.canvas.bind('<B1-Motion>', self._resize_drag)
            self.canvas.bind('<ButtonRelease-1>', self._end_resize)
            self.canvas.bind('<Motion>', self._update_cursor)
            self.canvas.bind('<MouseWheel>', self._wheel_resize)
            self.canvas.bind('<Button-4>', lambda _e: self._resize_step(20))
            self.canvas.bind('<Button-5>', lambda _e: self._resize_step(-20))

    def _scaled_image(self, target_width):
        target_width = max(40, target_width)
        original_width = self.original.width()
        if target_width == original_width:
            self.current_width = original_width
            return self.original

        if self.original_pil is not None and ImageTk is not None:
            ow, oh = self.original_pil.size
            ratio = target_width / float(max(1, ow))
            nh = max(20, int(oh * ratio))
            resized = self.original_pil.resize((int(target_width), nh), Image.Resampling.LANCZOS)
            img = ImageTk.PhotoImage(resized)
            self.current_width = img.width()
            return img

        if target_width > original_width:
            factor = max(1, int(round(target_width / float(original_width))))
            img = self.original.zoom(factor, factor)
        else:
            ratio = original_width / float(target_width)
            factor = max(1, int(round(ratio)))
            img = self.original.subsample(factor, factor)

        self.current_width = img.width()
        return img

    def _render(self):
        self.display = self._scaled_image(self.current_width)
        w = self.display.width()
        h = self.display.height()
        self.canvas.configure(width=w, height=h)
        self.frame.configure(width=w + 2, height=h + 2)
        self.canvas.delete('all')
        self.canvas.create_image(0, 0, anchor='nw', image=self.display, tags='img')
        self.canvas.image_ref = self.display
        if self.enable_resize:
            self.canvas.create_rectangle(w - 20, h - 20, w - 2, h - 2, fill='#415bd8', outline='#1d4ed8', tags='resize_handle')

    def _is_on_handle(self, x, y):
        w = self.canvas.winfo_width()
        h = self.canvas.winfo_height()
        return x >= (w - 22) and y >= (h - 22)

    def _update_cursor(self, event):
        if self.enable_resize:
            self.canvas.configure(cursor='size_nw_se' if self._is_on_handle(event.x, event.y) else 'arrow')

    def _start_resize(self, event):
        if not self._is_on_handle(event.x, event.y):
            self._resizing = False
            return
        self._resizing = True
        self._drag_start_x = event.x_root
        self._drag_start_width = self.current_width

    def _resize_drag(self, event):
        if not self._resizing or self._drag_start_x is None:
            return
        delta = event.x_root - self._drag_start_x
        self.current_width = max(40, self._drag_start_width + delta)
        self._render()

    def _end_resize(self, _event):
        self._resizing = False
        self._drag_start_x = None
        self._drag_start_width = None

    def _resize_step(self, delta):
        self.current_width = max(40, self.current_width + delta)
        self._render()

    def _wheel_resize(self, event):
        step = 20 if event.delta > 0 else -20
        self._resize_step(step)


class RichTextEditor:
    def __init__(self, parent, theme, *, height=14):
        self.parent = parent
        self.theme = theme
        self.frame = tk.Frame(parent, bg=theme.palette.bg_surface)

        self.font_family_var = tk.StringVar(value='Segoe UI')
        self.font_size_var = tk.IntVar(value=11)
        self._last_selection = None
        self._image_refs = []

        self._build_toolbar()
        self._build_text(height)

    def _build_toolbar(self):
        bar = tk.Frame(self.frame, bg=self.theme.palette.bg_surface)
        bar.pack(fill=tk.X, pady=(0, 6))

        fam_box = ttk.Combobox(
            bar,
            textvariable=self.font_family_var,
            values=FONT_FAMILIES,
            state='readonly',
            width=18,
        )
        fam_box.pack(side=tk.LEFT, padx=(0, 6))
        fam_box.bind('<<ComboboxSelected>>', lambda _e: self._apply_selected_font())

        size_box = ttk.Combobox(
            bar,
            textvariable=self.font_size_var,
            values=FONT_SIZES,
            state='readonly',
            width=5,
        )
        size_box.pack(side=tk.LEFT, padx=(0, 8))
        size_box.bind('<<ComboboxSelected>>', lambda _e: self._apply_selected_font())

        controls = [
            ('B', self.toggle_bold),
            ('I', self.toggle_italic),
            ('U', self.toggle_underline),
            ('L', lambda: self.set_alignment('left')),
            ('C', lambda: self.set_alignment('center')),
            ('R', lambda: self.set_alignment('right')),
            ('•', self.insert_bullet),
            ('Color', self.pick_color),
        ]
        for text, cmd in controls:
            self.theme.make_button(
                bar,
                text=text,
                command=cmd,
                kind='ghost',
                width=6 if text != 'Color' else 8,
                pady=4,
            ).pack(side=tk.LEFT, padx=(0, 4))

    def _build_text(self, height):
        host = tk.Frame(self.frame, bg=self.theme.palette.bg_surface)
        host.pack(fill=tk.BOTH, expand=True)

        self.text = tk.Text(
            host,
            wrap='word',
            undo=True,
            height=height,
            relief='flat',
            bd=1,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            insertbackground=self.theme.palette.text_primary,
            padx=10,
            pady=10,
        )
        ys = tk.Scrollbar(host, orient='vertical', command=self.text.yview)
        self.text.configure(yscrollcommand=ys.set)

        self.text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        ys.pack(side=tk.RIGHT, fill=tk.Y)

        self.text.bind('<ButtonRelease-1>', lambda _e: self._remember_selection())
        self.text.bind('<KeyRelease>', lambda _e: self._remember_selection())
        self.text.bind('<<Selection>>', lambda _e: self._remember_selection())

        self._apply_global_font()

    def _remember_selection(self):
        if self.text.tag_ranges('sel'):
            self._last_selection = (self.text.index('sel.first'), self.text.index('sel.last'))
        else:
            self._last_selection = None

    def _apply_global_font(self):
        family = self.font_family_var.get() or 'Segoe UI'
        size = int(self.font_size_var.get() or 11)
        self.text.configure(font=(family, size))
        self.text.tag_configure('rt_bold', font=(family, size, 'bold'))
        self.text.tag_configure('rt_italic', font=(family, size, 'italic'))
        self.text.tag_configure('rt_underline', font=(family, size, 'underline'))
        self.text.tag_configure('rt_align_left', justify='left')
        self.text.tag_configure('rt_align_center', justify='center')
        self.text.tag_configure('rt_align_right', justify='right')

    def _apply_selected_font(self):
        start, end = self._selection_bounds(prefer_last=True)
        if not start or not end:
            return

        family = self.font_family_var.get() or 'Segoe UI'
        size = int(self.font_size_var.get() or 11)
        tag = f"rt_font_{family.replace(' ', '_')}_{size}"
        self.text.tag_configure(tag, font=(family, size))
        self.text.tag_add(tag, start, end)

    def _remove_prefixed_tags(self, start, end, prefix):
        for tag_name in self.text.tag_names():
            if str(tag_name).startswith(prefix):
                self.text.tag_remove(tag_name, start, end)

    def _toggle_font_style(self, style):
        start, end = self._selection_bounds(prefer_last=True)
        if not start or not end:
            return

        family = self.font_family_var.get() or 'Segoe UI'
        size = int(self.font_size_var.get() or 11)
        style_code = {'bold': 'b', 'italic': 'i', 'underline': 'u'}.get(style, style)
        prefix = f'rt_style_{style_code}_'
        tag = f"{prefix}{family.replace(' ', '_')}_{size}"

        has_tag = bool(self.text.tag_nextrange(tag, start, end))
        self._remove_prefixed_tags(start, end, prefix)
        if has_tag:
            return

        self.text.tag_configure(tag, font=tkfont.Font(family=family, size=size, weight='bold' if style == 'bold' else 'normal', slant='italic' if style == 'italic' else 'roman', underline=1 if style == 'underline' else 0))
        self.text.tag_add(tag, start, end)

    def _selection_bounds(self, prefer_last=False):
        if self.text.tag_ranges('sel'):
            return self.text.index('sel.first'), self.text.index('sel.last')
        if prefer_last and self._last_selection:
            try:
                return self._last_selection
            except Exception:
                pass
        idx = self.text.index('insert')
        return idx, f'{idx} +1c'

    def _toggle_tag(self, tag_name):
        start, end = self._selection_bounds(prefer_last=True)
        if not start or not end:
            return
        has_tag = bool(self.text.tag_nextrange(tag_name, start, end))
        if has_tag:
            self.text.tag_remove(tag_name, start, end)
        else:
            self.text.tag_add(tag_name, start, end)

    def toggle_bold(self):
        self._toggle_font_style('bold')

    def toggle_italic(self):
        self._toggle_font_style('italic')

    def toggle_underline(self):
        self._toggle_font_style('underline')

    def set_alignment(self, mode):
        align_tags = ['rt_align_left', 'rt_align_center', 'rt_align_right']
        active = f'rt_align_{mode}'

        if self.text.tag_ranges('sel'):
            start = self.text.index('sel.first linestart')
            end = self.text.index('sel.last lineend')
        else:
            start = self.text.index('insert linestart')
            end = self.text.index('insert lineend')

        for t in align_tags:
            self.text.tag_remove(t, start, end)
        self.text.tag_add(active, start, end)

    def pick_color(self):
        chosen = colorchooser.askcolor(title='Choose text color')[1]
        if not chosen:
            return
        tag = f"rt_color_{chosen.replace('#', '').lower()}"
        self.text.tag_configure(tag, foreground=chosen)
        start, end = self._selection_bounds(prefer_last=True)
        if not start or not end:
            return
        self.text.tag_add(tag, start, end)

    def insert_bullet(self):
        line_start = self.text.index('insert linestart')
        self.text.insert(line_start, '• ')

    def insert_image(self, image_path, index='insert', width=None, enable_resize=True):
        if not image_path:
            return
        try:
            widget = ResizableImageEmbed(self.text, image_path, self.theme.palette.bg_surface_alt, enable_resize=enable_resize)
        except Exception:
            messagebox.showwarning('Letters', 'Unsupported image format. Use PNG/GIF supported by Tk.')
            return

        if width:
            try:
                widget.current_width = max(40, int(width))
                widget._render()
            except Exception:
                pass

        self._image_refs.append(widget)
        self.text.insert(index, '\n')
        self.text.window_create(index, window=widget.frame)
        self.text.insert(index, '\n')

    def clear(self):
        self.text.delete('1.0', tk.END)
        self._image_refs = []

    def set_plain_text(self, value):
        self.clear()
        self.text.insert('1.0', value or '')

    def get_plain_text(self):
        return self.text.get('1.0', 'end-1c')

    def get_serialized(self):
        data = {
            'text': self.get_plain_text(),
            'font_family': self.font_family_var.get(),
            'font_size': int(self.font_size_var.get() or 11),
            'tags': [],
            'images': [],
        }
        for tag in self.text.tag_names():
            if not str(tag).startswith('rt_'):
                continue
            ranges = self.text.tag_ranges(tag)
            for i in range(0, len(ranges), 2):
                data['tags'].append({
                    'tag': str(tag),
                    'start': str(ranges[i]),
                    'end': str(ranges[i + 1]),
                })

        for widget in self._image_refs:
            if not widget.frame.winfo_exists():
                continue
            try:
                idx = self.text.index(widget.frame)
            except Exception:
                continue
            data['images'].append({
                'index': idx,
                'path': widget.image_path,
                'width': widget.current_width,
            })
        return json.dumps(data, ensure_ascii=False)

    def load_serialized(self, payload):
        self.clear()
        if not payload:
            return
        try:
            parsed = json.loads(payload)
            text = parsed.get('text', '')
            self.font_family_var.set(parsed.get('font_family', 'Segoe UI'))
            self.font_size_var.set(int(parsed.get('font_size', 11)))
            self._apply_global_font()
            self.text.insert('1.0', text)
            for item in parsed.get('tags', []):
                tag = item.get('tag', '')
                start = item.get('start', '')
                end = item.get('end', '')
                if not tag.startswith('rt_'):
                    continue
                if tag.startswith('rt_color_'):
                    code = '#' + tag.replace('rt_color_', '')
                    self.text.tag_configure(tag, foreground=code)
                try:
                    self.text.tag_add(tag, start, end)
                except tk.TclError:
                    continue

            for img in sorted(parsed.get('images', []), key=lambda x: x.get('index', '1.0')):
                path = img.get('path', '')
                index = img.get('index', 'insert')
                width = img.get('width')
                if path and os.path.exists(path):
                    self.insert_image(path, index=index, width=width, enable_resize=True)
        except Exception:
            self.text.insert('1.0', payload)


class LettersPage:
    def __init__(self, container, theme, user, navigate_fn, customer_id=None, customer_name=None, ticket_no=None, loan_id=None, letter_id=None):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

        # Customer pre-selection parameters (from loan details)
        self.preload_customer_id = customer_id
        self.preload_customer_name = customer_name
        self.preload_ticket_no = ticket_no
        self.preload_loan_id = loan_id
        
        # Letter pre-selection parameters (from loan details letter history)
        self.preload_letter_id = letter_id

        self.selected_overdue = None
        self.selected_template_id = None
        self.current_letter_id = None

        self.overdue_search_var = tk.StringVar()
        self.overdue_stage_var = tk.StringVar(value='All Overdue')
        self.language_filter_var = tk.StringVar(value='All')
        self.compose_language_var = tk.StringVar(value='English')
        self.compose_type_var = tk.StringVar(value='overdue_notice')
        self.letter_size_var = tk.StringVar(value='A4')
        self.template_choice_var = tk.StringVar()
        self.subject_var = tk.StringVar()
        self.customer_field_var = tk.StringVar(value=CUSTOMER_FIELD_TOKENS[0])
        self.loan_field_var = tk.StringVar(value=LOAN_FIELD_TOKENS[0])
        self.article_field_var = tk.StringVar(value=ARTICLE_FIELD_TOKENS[0])
        self.editor_image_path_var = tk.StringVar()
        self.letter_head_image_var = tk.StringVar()
        self.logo_image_var = tk.StringVar()
        self.letter_head_width_var = tk.StringVar(value='100')
        self.logo_width_var = tk.StringVar(value='22')

        self.tpl_name_var = tk.StringVar()
        self.tpl_lang_var = tk.StringVar(value='English')
        self.tpl_category_var = tk.StringVar(value='overdue_notice')
        self.tpl_subject_var = tk.StringVar()
        self.tpl_editing_id = None
        self.new_type_var = tk.StringVar()
        self._letter_types = []

        self.history_search_var = tk.StringVar()

        # Send Letters tab variables
        self.send_search_var = tk.StringVar()
        self.send_stage_var = tk.StringVar(value='All')
        self.send_type_var = tk.StringVar(value='overdue_notice')
        self.send_template_var = tk.StringVar()
        self.send_selected_customers = []
        self.send_preview_customer = None
        self.send_preview_text = tk.StringVar(value='Select a customer to preview letter.')
        self.send_status_sent = []
        self.send_status_not_sent = []
        self.send_status_suggestions = []

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

        self._load_letter_asset_settings()

        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True, padx=8, pady=8)

        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(0, 10))
        tk.Label(
            hdr,
            text='✉️ Letters Center',
            font=self.theme.fonts.h1,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.text_primary,
        ).pack(side=tk.LEFT)

        self.theme.make_button(
            hdr,
            text='Refresh',
            command=self._reload_all,
            kind='ghost',
            width=10,
            pady=6,
        ).pack(side=tk.RIGHT)

        self.stats_host = tk.Frame(view, bg=self.theme.palette.bg_app)
        self.stats_host.pack(fill=tk.X)
        self._render_stats(self.stats_host)

        tab_style = ttk.Style()
        tab_style.configure(
            'Letters.TNotebook',
            background=self.theme.palette.bg_app,
            borderwidth=0,
            tabmargins=(0, 0, 0, 0),
        )
        tab_style.configure(
            'Letters.TNotebook.Tab',
            padding=(14, 8),
            background=self.theme.palette.bg_surface_alt,
            foreground=self.theme.palette.text_primary,
            font=self.theme.fonts.body,
            borderwidth=1,
            relief='solid',
        )
        tab_style.map(
            'Letters.TNotebook.Tab',
            background=[
                ('selected', self.theme.palette.bg_surface),
                ('active', self.theme.palette.bg_surface),
                ('!selected', self.theme.palette.bg_surface_alt),
            ],
            foreground=[
                ('selected', self.theme.palette.text_primary),
                ('active', self.theme.palette.text_primary),
                ('!selected', self.theme.palette.text_muted),
            ],
        )

        self.tabs = ttk.Notebook(view, style='Letters.TNotebook')
        self.tabs.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

        self.send_letters_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)
        self.reports_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)
        self.compose_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)
        self.templates_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)
        self.types_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)
        self.history_tab = tk.Frame(self.tabs, bg=self.theme.palette.bg_app)

        self.tabs.add(self.send_letters_tab, text='Send Letters')
        self.tabs.add(self.reports_tab, text='Send Letters Reports')
        self.tabs.add(self.compose_tab, text='Create New Template')
        self.tabs.add(self.templates_tab, text='Templates')
        self.tabs.add(self.types_tab, text='Letter Types')
        self.tabs.add(self.history_tab, text='Letter History')

        self._load_letter_types()
        self._render_send_letters_tab()
        self._render_reports_tab()
        self._render_compose_tab()
        self._render_templates_tab()
        self._render_types_tab()
        self._render_history_tab()

        self._reload_all()

        # If letter was pre-selected from loan details, auto-select in Letter History tab
        if self.preload_letter_id:
            self.tabs.select(self.history_tab)
            self._auto_select_letter_in_history()
        # If customer was pre-selected from loan details, auto-select in Send Letters tab
        elif self.preload_customer_id:
            self.tabs.select(self.send_letters_tab)
            self._auto_select_customer_in_send_letters()

    def _auto_select_customer_in_send_letters(self):
        """Auto-select a customer in the Send Letters tab based on preload parameters."""
        if not hasattr(self, 'send_customer_listbox') or not self.preload_customer_id:
            return

        # Find the customer in the loaded list
        matched_index = -1
        for i, row in enumerate(getattr(self, '_send_customer_rows', [])):
            if row.get('customer_id') == self.preload_customer_id:
                matched_index = i
                break
            if self.preload_ticket_no and (row.get('ticket_no') or '').strip() == self.preload_ticket_no:
                matched_index = i
                break

        if matched_index >= 0:
            # Select the customer
            self.send_customer_listbox.selection_clear(0, tk.END)
            self.send_customer_listbox.selection_set(matched_index)
            self.send_customer_listbox.see(matched_index)
            # Trigger the selection handler to load preview
            self._on_send_customer_selected()

            # Update the meta info to show it was loaded from loan details
            if hasattr(self, 'send_preview_meta_var'):
                display_name = self.preload_customer_name or '-'
                display_ticket = self.preload_ticket_no or '-'
                self.send_preview_meta_var.set(
                    f'✓ Loaded from Loan Details: {display_ticket} | {display_name}. Select template and send letters.'
                )
        else:
            # Customer not found in current list
            messagebox.showwarning('Send Letters', 
                f'Could not find the selected customer in the current list.\nCustomer: {self.preload_customer_name or "-"}\nTicket: {self.preload_ticket_no or "-"}')

    def _auto_select_letter_in_history(self):
        """Auto-select and preview a letter in the Letter History tab based on preload parameters."""
        if not hasattr(self, 'history_listbox') or not self.preload_letter_id:
            return

        # Find the letter in the loaded list
        matched_index = -1
        for i, row in enumerate(getattr(self, '_history_rows', [])):
            if row.get('id') == self.preload_letter_id:
                matched_index = i
                break

        if matched_index >= 0:
            # Select the letter
            self.history_listbox.selection_clear(0, tk.END)
            self.history_listbox.selection_set(matched_index)
            self.history_listbox.see(matched_index)
            # Trigger the selection handler to load preview
            self._on_history_letter_selected()
        else:
            # Letter not found in current list
            messagebox.showwarning('Letter History', 
                f'Could not find the selected letter in the current list.\nLetter ID: {self.preload_letter_id}')

    def _on_history_letter_selected(self, event=None):
        """Handle selection of a letter in the history list to show preview."""
        if not hasattr(self, 'history_listbox') or not self.history_listbox.curselection():
            return
        
        idx = self.history_listbox.curselection()[0]
        if idx < 0 or idx >= len(getattr(self, '_history_rows', [])):
            return

        row = self._history_rows[idx]
        letter_id = row.get('id')
        
        # Get full letter details
        letter = get_customer_letter(letter_id)
        if not letter:
            return

        # Extract body and subject
        body = self._extract_plain_text(letter.get('body_json', ''))
        subject = letter.get('subject', '(No Subject)')
        status = (letter.get('status') or 'draft').upper()
        customer_name = letter.get('customer_name', '-')
        ticket_no = letter.get('ticket_no', '-')
        language = letter.get('language', 'English')
        date_sent = letter.get('updated_at', '-')

        # Replace tokens if loan data is available
        tokens = {}
        if letter.get('loan_id'):
            loan = get_loan(letter.get('loan_id'))
            if loan:
                tokens = self._build_tokens({'id': loan['id']})
                subject = self._replace_tokens(subject, tokens)
                body = self._replace_tokens(body, tokens)

        # Format preview text
        preview_text = f"{subject}\n\n{body}"
        
        # Update preview widgets
        self.history_preview_text_widget.configure(state='normal')
        self.history_preview_text_widget.delete('1.0', tk.END)
        self.history_preview_text_widget.insert('1.0', preview_text)
        self.history_preview_text_widget.configure(state='disabled')
        
        # Update meta info
        self.history_preview_meta_var.set(
            f"Status: {status} | Customer: {customer_name} | Ticket: {ticket_no} | Language: {language} | Date: {date_sent}"
        )
        
        # Auto-adjust height
        self._auto_adjust_history_preview_height()

    def _auto_adjust_history_preview_height(self):
        """Auto-adjust text widget height to fit all content without scrollbars."""
        if not hasattr(self, 'history_preview_text_widget'):
            return
        
        # Get total number of lines in the text widget
        end_index = self.history_preview_text_widget.index(tk.END)
        line_count = int(end_index.split('.')[0])
        
        # Add some padding (3 extra lines for safety and visual breathing room)
        target_height = max(line_count + 3, 15)
        
        # Configure the text widget height
        self.history_preview_text_widget.configure(height=target_height)
        
        # Update the window to ensure proper layout
        self.history_preview_text_widget.update_idletasks()

    def _render_stats(self, parent):
        for w in parent.winfo_children():
            w.destroy()

        card = self.theme.make_card(parent, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.X)

        row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X)

        overdue = search_overdue_loans_for_letters()
        templates = list_letter_templates()
        history = list_customer_letters()

        metrics = [
            ('Overdue Customers', str(len(overdue)), self.theme.palette.warning),
            ('Templates', str(len(templates)), self.theme.palette.accent),
            ('Letters Drafted', str(sum(1 for x in history if x.get('status') == 'draft')), self.theme.palette.info),
            ('Letters Sent', str(sum(1 for x in history if x.get('status') == 'sent')), self.theme.palette.success),
        ]

        for title, value, color in metrics:
            box = tk.Frame(row, bg=self.theme.palette.bg_surface_alt, padx=12, pady=10)
            box.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
            tk.Label(
                box,
                text=title,
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_muted,
            ).pack(anchor='w')
            tk.Label(
                box,
                text=value,
                font=('Segoe UI', 18, 'bold'),
                bg=self.theme.palette.bg_surface_alt,
                fg=color,
            ).pack(anchor='w')

    def _render_compose_tab(self):
        self._render_editor_panel(self.compose_tab)

    def _render_send_letters_tab(self):
        panel = tk.Frame(self.send_letters_tab, bg=self.theme.palette.bg_app)
        panel.pack(fill=tk.BOTH, expand=True, pady=(8, 0))
        panel.grid_columnconfigure(0, weight=3)
        panel.grid_columnconfigure(1, weight=2)
        panel.grid_rowconfigure(0, weight=1)

        # Left panel: Customer selection
        left_panel = tk.Frame(panel, bg=self.theme.palette.bg_app)
        left_panel.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        # Filters
        filter_card = self.theme.make_card(left_panel, bg=self.theme.palette.bg_surface)
        filter_card.pack(fill=tk.X, pady=(0, 8))

        tk.Label(filter_card.inner, text='Customer Filters', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        filter_row1 = tk.Frame(filter_card.inner, bg=self.theme.palette.bg_surface)
        filter_row1.pack(fill=tk.X, pady=(0, 4))
        tk.Label(filter_row1, text='Search:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(filter_row1, variable=self.send_search_var).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 0))
        self.send_search_var.trace_add('write', lambda *_a: self._load_send_customers())

        filter_row2 = tk.Frame(filter_card.inner, bg=self.theme.palette.bg_surface)
        filter_row2.pack(fill=tk.X, pady=(0, 4))
        tk.Label(filter_row2, text='Status:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        stage_combo = ttk.Combobox(filter_row2, textvariable=self.send_stage_var,
                                   values=['All', 'Before 7 Days Overdue', 'Overdue', 'After 1 Month Overdue', 'After 2 Months Overdue', 'After 3 Months Overdue', 'Forfeited'],
                                   state='readonly', width=20)
        stage_combo.pack(side=tk.LEFT, padx=(8, 0))
        stage_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_send_customers())

        # Letter Setup
        setup_card = self.theme.make_card(left_panel, bg=self.theme.palette.bg_surface)
        setup_card.pack(fill=tk.X, pady=(0, 8))
        tk.Label(setup_card.inner, text='Letter Setup', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        setup_row1 = tk.Frame(setup_card.inner, bg=self.theme.palette.bg_surface)
        setup_row1.pack(fill=tk.X, pady=(0, 6))
        tk.Label(setup_row1, text='Letter Type:', font=self.theme.fonts.body_bold,
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.send_type_combo = ttk.Combobox(setup_row1, textvariable=self.send_type_var, state='disabled', width=22)
        self.send_type_combo.pack(side=tk.LEFT, padx=(8, 0), fill=tk.X, expand=True)
        self.send_type_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_send_templates())

        setup_row2 = tk.Frame(setup_card.inner, bg=self.theme.palette.bg_surface)
        setup_row2.pack(fill=tk.X)
        tk.Label(setup_row2, text='Template:', font=self.theme.fonts.body_bold,
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.send_template_combo = ttk.Combobox(setup_row2, textvariable=self.send_template_var, state='disabled', width=40)
        self.send_template_combo.pack(side=tk.LEFT, padx=(8, 0), fill=tk.X, expand=True)
        self.send_template_combo.bind('<<ComboboxSelected>>', lambda _e: self._preview_send_letter())

        action_row = tk.Frame(setup_card.inner, bg=self.theme.palette.bg_surface)
        action_row.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(action_row, text='Select All', command=self._select_all_send_customers, kind='ghost', width=10, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(action_row, text='Clear Selection', command=self._clear_send_selection, kind='ghost', width=12, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(action_row, text='Preview', command=self._preview_send_letter, kind='secondary', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(action_row, text='Print', command=self._print_send_letters, kind='primary', width=10, pady=5).pack(side=tk.RIGHT)

        # Customer list
        list_card = self.theme.make_card(left_panel, bg=self.theme.palette.bg_surface)
        list_card.pack(fill=tk.BOTH, expand=False, pady=(8, 0))

        tk.Label(list_card.inner, text='Select Customers', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        list_host = tk.Frame(list_card.inner, bg=self.theme.palette.bg_surface)
        list_host.pack(fill=tk.BOTH, expand=False)

        self.send_customer_listbox = tk.Listbox(
            list_host,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
            selectmode=tk.MULTIPLE,
            width=56,
            height=10,
        )
        send_list_sc = tk.Scrollbar(list_host, orient='vertical', command=self.send_customer_listbox.yview)
        self.send_customer_listbox.configure(yscrollcommand=send_list_sc.set)
        self.send_customer_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=False)
        send_list_sc.pack(side=tk.RIGHT, fill=tk.Y)
        self.send_customer_listbox.bind('<<ListboxSelect>>', self._on_send_customer_selected)

        # Right panel: Preview and Status
        right_panel = tk.Frame(panel, bg=self.theme.palette.bg_app)
        right_panel.grid(row=0, column=1, sticky='nsew', padx=(6, 0))

        preview_controls = self.theme.make_card(right_panel, bg=self.theme.palette.bg_surface)
        preview_controls.pack(fill=tk.X, pady=(0, 8))
        tk.Label(preview_controls.inner, text='Selected Customer Preview', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 4))
        self.send_preview_meta_var = tk.StringVar(value='Select one or more customers to preview the letter.')
        tk.Label(preview_controls.inner, textvariable=self.send_preview_meta_var,
                 font=self.theme.fonts.small, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted, justify='left', anchor='w').pack(fill=tk.X)

        # Preview
        preview_card = self.theme.make_card(right_panel, bg=self.theme.palette.bg_surface)
        preview_card.pack(fill=tk.BOTH, expand=True, pady=(0, 8))

        tk.Label(preview_card.inner, text='Letter Preview', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        preview_host = tk.Frame(preview_card.inner, bg=self.theme.palette.bg_surface)
        preview_host.pack(fill=tk.BOTH, expand=True)

        self.send_preview_text_widget = tk.Text(
            preview_host,
            wrap='word',
            relief='flat',
            bd=1,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            padx=10,
            pady=10,
            state='disabled',
            height=1,
        )
        self.send_preview_text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        # Bind the text widget to auto-adjust height when content changes
        self.send_preview_text_widget.bind('<<Change>>', self._auto_adjust_preview_height)



        self._load_send_templates()
        self._update_send_letter_controls_state()
        self._load_send_customers()

    def _render_reports_tab(self):
        panel = tk.Frame(self.reports_tab, bg=self.theme.palette.bg_app)
        panel.pack(fill=tk.BOTH, expand=True, pady=(8, 0))
        panel.grid_columnconfigure(0, weight=1)
        panel.grid_rowconfigure(0, weight=0)
        panel.grid_rowconfigure(1, weight=1)
        panel.grid_rowconfigure(2, weight=1)

        # Stats section
        stats_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        stats_card.grid(row=0, column=0, sticky='ew', padx=0, pady=(0, 8))
        
        tk.Label(stats_card.inner, text='📊 Send Letters Statistics', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))
        
        self.reports_stats_frame = tk.Frame(stats_card.inner, bg=self.theme.palette.bg_surface)
        self.reports_stats_frame.pack(fill=tk.X)

        breakdown_title = tk.Label(
            stats_card.inner,
            text='Report Breakdown',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        )
        breakdown_title.pack(anchor='w', pady=(10, 6))

        breakdown_host = tk.Frame(stats_card.inner, bg=self.theme.palette.bg_surface)
        breakdown_host.pack(fill=tk.BOTH, expand=True)
        self.reports_breakdown_listbox = tk.Listbox(
            breakdown_host,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.bg_surface_alt,
            selectforeground=self.theme.palette.text_primary,
            height=5,
        )
        breakdown_sc = tk.Scrollbar(breakdown_host, orient='vertical', command=self.reports_breakdown_listbox.yview)
        self.reports_breakdown_listbox.configure(yscrollcommand=breakdown_sc.set)
        self.reports_breakdown_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        breakdown_sc.pack(side=tk.RIGHT, fill=tk.Y)
        self._load_reports_stats()

        # Sent letters history section
        history_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        history_card.grid(row=1, column=0, sticky='nsew', padx=0, pady=(0, 8))

        tk.Label(history_card.inner, text='📬 Sent Letters History', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        history_host = tk.Frame(history_card.inner, bg=self.theme.palette.bg_surface)
        history_host.pack(fill=tk.BOTH, expand=True)

        self.reports_history_listbox = tk.Listbox(
            history_host,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
            height=12,
        )
        history_sc = tk.Scrollbar(history_host, orient='vertical', command=self.reports_history_listbox.yview)
        self.reports_history_listbox.configure(yscrollcommand=history_sc.set)
        self.reports_history_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        history_sc.pack(side=tk.RIGHT, fill=tk.Y)
        self.reports_history_listbox.bind('<<ListboxSelect>>', self._on_reports_letter_selected)

        tk.Label(
            history_card.inner,
            text='Selected Letter Preview',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', pady=(8, 6))

        preview_host = tk.Frame(history_card.inner, bg=self.theme.palette.bg_surface)
        preview_host.pack(fill=tk.BOTH, expand=False)
        self.reports_history_preview_text = tk.Text(
            preview_host,
            wrap='word',
            relief='flat',
            bd=1,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            padx=10,
            pady=10,
            state='disabled',
            height=7,
        )
        preview_sc = tk.Scrollbar(preview_host, orient='vertical', command=self.reports_history_preview_text.yview)
        self.reports_history_preview_text.configure(yscrollcommand=preview_sc.set)
        self.reports_history_preview_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        preview_sc.pack(side=tk.RIGHT, fill=tk.Y)

        # Next customers section
        next_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        next_card.grid(row=2, column=0, sticky='nsew', padx=0, pady=0)

        tk.Label(next_card.inner, text='👥 Next Customers to Send Letters', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        next_host = tk.Frame(next_card.inner, bg=self.theme.palette.bg_surface)
        next_host.pack(fill=tk.BOTH, expand=True)

        self.reports_next_listbox = tk.Listbox(
            next_host,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
            height=12,
        )
        next_sc = tk.Scrollbar(next_host, orient='vertical', command=self.reports_next_listbox.yview)
        self.reports_next_listbox.configure(yscrollcommand=next_sc.set)
        self.reports_next_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        next_sc.pack(side=tk.RIGHT, fill=tk.Y)
        self.reports_next_listbox.bind('<ButtonRelease-1>', self._on_reports_next_customer_selected)

        action_area = tk.Frame(next_card.inner, bg=self.theme.palette.bg_surface)
        action_area.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(action_area, text='Refresh Reports', command=self._refresh_reports,
                               kind='ghost', width=14, pady=5).pack(side=tk.LEFT)

        self._load_reports_data()

    def _load_reports_stats(self):
        """Load and display send letters statistics with breakdown reports."""
        for w in self.reports_stats_frame.winfo_children():
            w.destroy()

        history = list_customer_letters()
        overdue = search_overdue_loans_for_letters()
        sent_letters = [x for x in history if x.get('status') in ('sent', 'printed')]
        printed_letters = [x for x in history if x.get('status') == 'printed']
        drafted_letters = [x for x in history if x.get('status') == 'draft']
        now = datetime.now()
        recent_week = []
        for row in history:
            updated = (row.get('updated_at') or '').strip()
            if not updated:
                continue
            try:
                dt_val = datetime.strptime(updated[:19], '%Y-%m-%d %H:%M:%S')
            except Exception:
                continue
            if (now - dt_val).days <= 7:
                recent_week.append(row)

        metrics = [
            ('Sent / Printed', str(len(sent_letters)), self.theme.palette.success),
            ('Printed Only', str(len(printed_letters)), self.theme.palette.info),
            ('Letters Drafted', str(len(drafted_letters)), self.theme.palette.warning),
            ('Last 7 Days', str(len(recent_week)), self.theme.palette.accent),
        ]

        for title, value, color in metrics:
            box = tk.Frame(self.reports_stats_frame, bg=self.theme.palette.bg_surface_alt, padx=12, pady=10)
            box.pack(side=tk.LEFT, fill=tk.X, expand=True, padx=4)
            tk.Label(
                box,
                text=title,
                font=self.theme.fonts.small,
                bg=self.theme.palette.bg_surface_alt,
                fg=self.theme.palette.text_muted,
            ).pack(anchor='w')
            tk.Label(
                box,
                text=value,
                font=('Segoe UI', 16, 'bold'),
                bg=self.theme.palette.bg_surface_alt,
                fg=color,
            ).pack(anchor='w')

        if hasattr(self, 'reports_breakdown_listbox'):
            self.reports_breakdown_listbox.delete(0, tk.END)
            status_counts = {}
            language_counts = {}
            for row in history:
                st = (row.get('status') or 'unknown').lower()
                status_counts[st] = status_counts.get(st, 0) + 1
                lang = (row.get('language') or 'Unknown').strip() or 'Unknown'
                language_counts[lang] = language_counts.get(lang, 0) + 1

            self.reports_breakdown_listbox.insert(tk.END, f'Overdue customers pending letters: {len(overdue)}')
            self.reports_breakdown_listbox.insert(tk.END, f'Total templates available: {len(list_letter_templates())}')

            if status_counts:
                status_line = ', '.join(f'{k}:{v}' for k, v in sorted(status_counts.items(), key=lambda item: item[0]))
                self.reports_breakdown_listbox.insert(tk.END, f'Status breakdown -> {status_line}')
            else:
                self.reports_breakdown_listbox.insert(tk.END, 'Status breakdown -> no letter records found')

            if language_counts:
                top_languages = sorted(language_counts.items(), key=lambda item: item[1], reverse=True)
                lang_line = ', '.join(f'{k}:{v}' for k, v in top_languages[:3])
                self.reports_breakdown_listbox.insert(tk.END, f'Top languages -> {lang_line}')
            else:
                self.reports_breakdown_listbox.insert(tk.END, 'Top languages -> no data')

    def _load_reports_data(self):
        """Load data for sent letters history and next customers."""
        self._load_reports_history()
        self._load_next_customers()

    def _load_reports_history(self):
        """Load and display sent letters history."""
        if not hasattr(self, 'reports_history_listbox'):
            return

        history = list_customer_letters()
        sent_letters = [x for x in history if x.get('status') in ('sent', 'printed')]
        
        self.reports_history_listbox.delete(0, tk.END)
        self._reports_history_rows = sent_letters

        for letter in sent_letters:
            customer_name = letter.get('customer_name', 'Unknown')
            subject = letter.get('subject', '(No Subject)')
            updated_at = letter.get('updated_at', '')
            ticket_no = letter.get('ticket_no', '-')
            status = (letter.get('status') or 'sent').upper()
            
            # Format date if available
            if updated_at:
                try:
                    date_obj = updated_at.split(' ')[0] if ' ' in updated_at else updated_at
                    display_date = date_obj
                except Exception:
                    display_date = updated_at
            else:
                display_date = '-'
            
            display_text = f"[{display_date}] [{status}] {ticket_no} | {customer_name} | {subject[:40]}"
            self.reports_history_listbox.insert(tk.END, display_text)

        if hasattr(self, 'reports_history_preview_text'):
            self.reports_history_preview_text.configure(state='normal')
            self.reports_history_preview_text.delete('1.0', tk.END)
            self.reports_history_preview_text.insert('1.0', 'Select a history record to view letter content preview.')
            self.reports_history_preview_text.configure(state='disabled')

    def _load_next_customers(self):
        """Load and display next customers who need to receive letters."""
        if not hasattr(self, 'reports_next_listbox'):
            return

        # Get all overdue loans
        overdue_loans = search_overdue_loans_for_letters()
        history = list_customer_letters()
        sent_customer_ids = {x.get('customer_id'): True for x in history if x.get('status') == 'sent'}

        # Filter to show customers who haven't received a sent letter yet
        next_customers = [
            loan for loan in overdue_loans
            if loan.get('customer_id') not in sent_customer_ids
        ]

        self.reports_next_listbox.delete(0, tk.END)
        self._reports_next_customers = next_customers

        for loan in next_customers[:50]:  # Show top 50
            ticket_no = loan.get('ticket_no', '-')
            customer_name = loan.get('customer_name', 'Unknown')
            expire_date = loan.get('expire_date', '-')
            
            # Calculate days overdue
            if expire_date and expire_date != '-':
                try:
                    from datetime import datetime
                    expire = datetime.strptime(expire_date, '%Y-%m-%d')
                    today = datetime.now()
                    days_overdue = (today - expire).days
                    days_text = f"{days_overdue}d overdue"
                except Exception:
                    days_text = "? days"
            else:
                days_text = "? days"
            
            display_text = f"{ticket_no} | {customer_name} | {days_text}"
            self.reports_next_listbox.insert(tk.END, display_text)

    def _on_reports_letter_selected(self, _event=None):
        """Handle selection of a letter in the history list."""
        if not self.reports_history_listbox.curselection():
            return
        idx = self.reports_history_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._reports_history_rows):
            return

        row = self._reports_history_rows[idx]
        subject = row.get('subject', '(No Subject)')
        body = row.get('body_text') or self._extract_plain_text(row.get('body_json', ''))
        status = (row.get('status') or 'sent').upper()
        ticket = row.get('ticket_no') or '-'
        customer = row.get('customer_name') or '-'
        updated = row.get('updated_at') or '-'

        preview_text = (
            f'Status: {status}\n'
            f'Ticket: {ticket}\n'
            f'Customer: {customer}\n'
            f'Updated: {updated}\n'
            f'Subject: {subject}\n\n'
            f'{body}'
        )

        if hasattr(self, 'reports_history_preview_text'):
            self.reports_history_preview_text.configure(state='normal')
            self.reports_history_preview_text.delete('1.0', tk.END)
            self.reports_history_preview_text.insert('1.0', preview_text)
            self.reports_history_preview_text.configure(state='disabled')

    def _on_reports_next_customer_selected(self, _event=None):
        """Open Send Letters tab and auto-select the chosen next customer."""
        if not hasattr(self, 'reports_next_listbox'):
            return

        idx = None
        if _event is not None:
            clicked_idx = self.reports_next_listbox.nearest(_event.y)
            bbox = self.reports_next_listbox.bbox(clicked_idx)
            if not bbox:
                return
            x, y, w, h = bbox
            in_row = (y <= _event.y <= y + h) and (x <= _event.x <= x + w)
            if not in_row:
                return
            idx = clicked_idx
            self.reports_next_listbox.selection_clear(0, tk.END)
            self.reports_next_listbox.selection_set(idx)
        elif self.reports_next_listbox.curselection():
            idx = self.reports_next_listbox.curselection()[0]
        else:
            return

        if idx < 0 or idx >= len(getattr(self, '_reports_next_customers', [])):
            return

        target = self._reports_next_customers[idx]
        target_loan_id = target.get('id')
        target_ticket = (target.get('ticket_no') or '').strip()
        target_name = (target.get('customer_name') or '').strip()

        self.tabs.select(self.send_letters_tab)
        if hasattr(self, 'send_stage_var'):
            self.send_stage_var.set('Overdue')
        if hasattr(self, 'send_search_var') and target_ticket:
            self.send_search_var.set(target_ticket)

        self._load_send_customers()

        matched_index = -1
        for i, row in enumerate(getattr(self, '_send_customer_rows', [])):
            if row.get('id') == target_loan_id:
                matched_index = i
                break
            if target_ticket and (row.get('ticket_no') or '').strip() == target_ticket:
                matched_index = i
                break

        if matched_index == -1:
            messagebox.showwarning('Send Letters', 'Selected customer could not be auto-selected in Send Letters list.')
            return

        self.send_customer_listbox.selection_clear(0, tk.END)
        self.send_customer_listbox.selection_set(matched_index)
        self.send_customer_listbox.see(matched_index)
        self._on_send_customer_selected()

        if hasattr(self, 'send_preview_meta_var'):
            self.send_preview_meta_var.set(
                f'Loaded from reports: {target_ticket or "-"} | {target_name or "-"}. Choose template and continue.'
            )

    def _refresh_reports(self):
        """Refresh the reports data."""
        self._load_reports_stats()
        self._load_reports_data()
        messagebox.showinfo('Reports', 'Reports refreshed successfully.')

    def _render_overdue_panel(self, parent):
        card = self.theme.make_card(parent, bg=self.theme.palette.bg_surface)
        card.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        tk.Label(
            card.inner,
            text='Customers With Overdue Loans',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
        ).pack(anchor='w', pady=(0, 8))

        filter_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        filter_row.pack(fill=tk.X, pady=(0, 8))

        self.theme.make_entry(filter_row, variable=self.overdue_search_var).pack(side=tk.LEFT, fill=tk.X, expand=True)
        self.overdue_search_var.trace_add('write', lambda *_a: self._load_overdue_list())

        lang_combo = ttk.Combobox(
            filter_row,
            textvariable=self.language_filter_var,
            values=['All', 'Sinhala', 'Tamil', 'English'],
            state='readonly',
            width=10,
        )
        lang_combo.pack(side=tk.LEFT, padx=(8, 0))
        lang_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_overdue_list())

        stage_combo = ttk.Combobox(
            filter_row,
            textvariable=self.overdue_stage_var,
            values=OVERDUE_STAGE_OPTIONS,
            state='readonly',
            width=23,
        )
        stage_combo.pack(side=tk.LEFT, padx=(8, 0))
        stage_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_overdue_list())

        list_host = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        list_host.pack(fill=tk.BOTH, expand=True)

        self.overdue_listbox = tk.Listbox(
            list_host,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
        )
        over_sc = tk.Scrollbar(list_host, orient='vertical', command=self.overdue_listbox.yview)
        self.overdue_listbox.configure(yscrollcommand=over_sc.set)
        self.overdue_listbox.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        over_sc.pack(side=tk.RIGHT, fill=tk.Y)
        self.overdue_listbox.bind('<<ListboxSelect>>', self._on_overdue_selected)

        info_card = tk.Frame(card.inner, bg=self.theme.palette.bg_surface_alt, padx=10, pady=8)
        info_card.pack(fill=tk.X, pady=(8, 0))

        self.loan_info_var = tk.StringVar(value='Select an overdue loan to auto-fill letter data.')
        tk.Label(
            info_card,
            textvariable=self.loan_info_var,
            justify='left',
            anchor='w',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_muted,
        ).pack(fill=tk.X)

    def _render_editor_panel(self, parent):
        card = self.theme.make_card(parent, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

        top = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        top.pack(fill=tk.X, pady=(0, 8))

        tk.Label(top, text='Language', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        lang_combo = ttk.Combobox(
            top,
            textvariable=self.compose_language_var,
            values=['Sinhala', 'Tamil', 'English'],
            state='readonly',
            width=10,
        )
        lang_combo.pack(side=tk.LEFT, padx=(6, 12))
        lang_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_template_choices())

        tk.Label(top, text='Type', font=self.theme.fonts.body_bold,
             bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT, padx=(0, 6))
        self.type_combo = ttk.Combobox(top, textvariable=self.compose_type_var, state='readonly', width=20)
        self.type_combo.pack(side=tk.LEFT, padx=(0, 12))
        self.type_combo.bind('<<ComboboxSelected>>', lambda _e: self._load_template_choices())

        tk.Label(top, text='Template', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.template_combo = ttk.Combobox(top, textvariable=self.template_choice_var, state='readonly', width=28)
        self.template_combo.pack(side=tk.LEFT, padx=(6, 8), fill=tk.X, expand=True)

        self.theme.make_button(top, text='Load', command=self._apply_selected_template, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(top, text='Print', command=self._print_current_letter, kind='secondary', width=8, pady=5).pack(side=tk.LEFT)

        sub_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        sub_row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(sub_row, text='Subject:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary, width=8, anchor='w').pack(side=tk.LEFT)
        self.theme.make_entry(sub_row, variable=self.subject_var).pack(side=tk.LEFT, fill=tk.X, expand=True)

        token_wrap = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        token_wrap.pack(fill=tk.X, pady=(0, 8))
        tk.Label(token_wrap, text='Insert Fields:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT, padx=(0, 6))

        cust_fields = ttk.Combobox(token_wrap, textvariable=self.customer_field_var,
                                   values=CUSTOMER_FIELD_TOKENS, state='readonly', width=22)
        cust_fields.pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(
            token_wrap,
            text='Insert Customer Field',
            command=lambda: self._insert_field_token(self.customer_field_var.get()),
            kind='ghost',
            width=16,
            pady=3,
        ).pack(side=tk.LEFT, padx=(0, 8))

        loan_fields = ttk.Combobox(token_wrap, textvariable=self.loan_field_var,
                                   values=LOAN_FIELD_TOKENS, state='readonly', width=22)
        loan_fields.pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(
            token_wrap,
            text='Insert Loan Field',
            command=lambda: self._insert_field_token(self.loan_field_var.get()),
            kind='ghost',
            width=14,
            pady=3,
        ).pack(side=tk.LEFT, padx=(0, 8))

        article_fields = ttk.Combobox(token_wrap, textvariable=self.article_field_var,
                                      values=ARTICLE_FIELD_TOKENS, state='readonly', width=20)
        article_fields.pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(
            token_wrap,
            text='Insert Article',
            command=lambda: self._insert_field_token(self.article_field_var.get()),
            kind='ghost',
            width=12,
            pady=3,
        ).pack(side=tk.LEFT)

        img_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        img_row.pack(fill=tk.X, pady=(0, 8))
        tk.Label(img_row, text='Images:', font=self.theme.fonts.small,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_muted).pack(side=tk.LEFT)
        self.theme.make_button(
            img_row,
            text='Browse Image',
            command=self._browse_and_insert_editor_image,
            kind='ghost',
            width=12,
            pady=3,
        ).pack(side=tk.LEFT, padx=(8, 6))

        self.editor = RichTextEditor(card.inner, self.theme, height=16)
        self.editor.frame.pack(fill=tk.BOTH, expand=True)
        default_w, default_h = LETTER_SIZE_EDITOR_DIMENSIONS.get('A4', (96, 28))
        self.editor.text.configure(width=default_w, height=default_h)

        bottom_actions = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        bottom_actions.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(
            bottom_actions,
            text='Save Draft',
            command=self._save_letter_draft,
            kind='primary',
            width=11,
            pady=5,
        ).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(
            bottom_actions,
            text='Save As Template',
            command=self._save_as_template_from_compose,
            kind='ghost',
            width=15,
            pady=5,
        ).pack(side=tk.LEFT)

    def _render_templates_tab(self):
        panel = tk.Frame(self.templates_tab, bg=self.theme.palette.bg_app)
        panel.pack(fill=tk.BOTH, expand=True, pady=(8, 0))
        panel.grid_columnconfigure(0, weight=2)
        panel.grid_columnconfigure(1, weight=3)

        left_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        left_card.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        tk.Label(left_card.inner, text='Template Library', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        self.template_listbox = tk.Listbox(
            left_card.inner,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
        )
        self.template_listbox.pack(fill=tk.BOTH, expand=True)
        self.template_listbox.bind('<<ListboxSelect>>', self._on_template_selected)

        list_btns = tk.Frame(left_card.inner, bg=self.theme.palette.bg_surface)
        list_btns.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(list_btns, text='New', command=self._new_template, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(list_btns, text='Edit', command=self._edit_selected_template, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(list_btns, text='Delete', command=self._delete_current_template, kind='danger', width=8, pady=5).pack(side=tk.LEFT)

        right_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        right_card.grid(row=0, column=1, sticky='nsew', padx=(6, 0))

        tk.Label(right_card.inner, text='Template Viewer', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        self.template_view_meta_var = tk.StringVar(value='Select a template from the library to preview.')
        tk.Label(
            right_card.inner,
            textvariable=self.template_view_meta_var,
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted,
            justify='left',
            anchor='w',
        ).pack(fill=tk.X, pady=(0, 8))

        viewer_host = tk.Frame(right_card.inner, bg=self.theme.palette.bg_surface)
        viewer_host.pack(fill=tk.BOTH, expand=True)

        self.template_view_text = tk.Text(
            viewer_host,
            wrap='word',
            relief='flat',
            bd=1,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            padx=10,
            pady=10,
            state='disabled',
            height=18,
        )
        self.template_view_scroll = tk.Scrollbar(viewer_host, orient='vertical', command=self.template_view_text.yview)
        self.template_view_text.configure(yscrollcommand=self.template_view_scroll.set)

        self.template_view_text.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.template_view_scroll.pack(side=tk.RIGHT, fill=tk.Y)

        self.template_view_text.bind('<MouseWheel>', self._on_template_viewer_wheel)
        self.template_view_text.bind('<Button-4>', self._on_template_viewer_wheel_up)
        self.template_view_text.bind('<Button-5>', self._on_template_viewer_wheel_down)
        self.template_view_images = []

    def _auto_size_template_viewer(self):
        if not hasattr(self, 'template_view_text'):
            return
        try:
            line_count = int(float(self.template_view_text.index('end-1c').split('.')[0]))
        except Exception:
            line_count = 18

        target = max(10, min(34, line_count + 2))
        self.template_view_text.configure(height=target)

    def _render_types_tab(self):
        card = self.theme.make_card(self.types_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

        tk.Label(card.inner, text='Letter Types Management', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        top = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        top.pack(fill=tk.X, pady=(0, 8))
        tk.Label(top, text='New Letter Type:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(top, variable=self.new_type_var, width=30).pack(side=tk.LEFT, padx=(8, 8))
        self.theme.make_button(top, text='Add Type', command=self._add_letter_type, kind='primary', width=10, pady=5).pack(side=tk.LEFT)

        self.letter_types_listbox = tk.Listbox(
            card.inner,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
        )
        self.letter_types_listbox.pack(fill=tk.BOTH, expand=True)

        btns = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btns.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(btns, text='Delete Selected', command=self._delete_selected_letter_type,
                               kind='danger', width=14, pady=6).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(btns, text='Refresh Types', command=self._refresh_type_controls,
                               kind='ghost', width=12, pady=6).pack(side=tk.LEFT)

    def _render_history_tab(self):
        panel = tk.Frame(self.history_tab, bg=self.theme.palette.bg_app)
        panel.pack(fill=tk.BOTH, expand=True, pady=(8, 0))
        panel.grid_columnconfigure(0, weight=1)
        panel.grid_columnconfigure(1, weight=1)
        panel.grid_rowconfigure(0, weight=1)

        # Left panel: Letter list
        left_panel = tk.Frame(panel, bg=self.theme.palette.bg_app)
        left_panel.grid(row=0, column=0, sticky='nsew', padx=(0, 6))

        list_card = self.theme.make_card(left_panel, bg=self.theme.palette.bg_surface)
        list_card.pack(fill=tk.BOTH, expand=True)

        row = tk.Frame(list_card.inner, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))

        tk.Label(row, text='Search Letters:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(row, variable=self.history_search_var).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 0))
        self.history_search_var.trace_add('write', lambda *_a: self._load_history())

        self.history_listbox = tk.Listbox(
            list_card.inner,
            activestyle='none',
            relief='flat',
            bd=0,
            highlightthickness=1,
            highlightbackground=self.theme.palette.border,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            selectbackground=self.theme.palette.accent,
            selectforeground=self.theme.palette.text_inverse,
        )
        self.history_listbox.pack(fill=tk.BOTH, expand=True)
        self.history_listbox.bind('<<ListboxSelect>>', self._on_history_letter_selected)

        hbtn = tk.Frame(list_card.inner, bg=self.theme.palette.bg_surface)
        hbtn.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(hbtn, text='Open', command=self._open_selected_history, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(hbtn, text='Print', command=self._print_selected_history, kind='secondary', width=8, pady=5).pack(side=tk.LEFT)

        # Right panel: Letter preview
        right_panel = tk.Frame(panel, bg=self.theme.palette.bg_app)
        right_panel.grid(row=0, column=1, sticky='nsew', padx=(6, 0))

        preview_card = self.theme.make_card(right_panel, bg=self.theme.palette.bg_surface)
        preview_card.pack(fill=tk.BOTH, expand=True)

        tk.Label(preview_card.inner, text='Letter Preview', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        self.history_preview_meta_var = tk.StringVar(value='Select a letter from the list to preview.')
        tk.Label(preview_card.inner, textvariable=self.history_preview_meta_var,
                 font=self.theme.fonts.small, bg=self.theme.palette.bg_surface,
                 fg=self.theme.palette.text_muted, justify='left', anchor='w', wraplength=400).pack(fill=tk.X, pady=(0, 8))

        preview_host = tk.Frame(preview_card.inner, bg=self.theme.palette.bg_surface)
        preview_host.pack(fill=tk.BOTH, expand=True)

        self.history_preview_text_widget = tk.Text(
            preview_host,
            wrap='word',
            relief='flat',
            bd=1,
            bg=self.theme.palette.bg_surface_alt,
            fg=self.theme.palette.text_primary,
            padx=10,
            pady=10,
            state='disabled',
            height=1,
        )
        self.history_preview_text_widget.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)

    def _on_template_viewer_wheel(self, event):
        direction = -1 if event.delta > 0 else 1
        self.template_view_text.yview_scroll(direction, 'units')
        return 'break'

    def _on_template_viewer_wheel_up(self, _event):
        self.template_view_text.yview_scroll(-1, 'units')
        return 'break'

    def _on_template_viewer_wheel_down(self, _event):
        self.template_view_text.yview_scroll(1, 'units')
        return 'break'

    def _reload_all(self):
        self._refresh_type_controls()
        self._render_stats(self.stats_host)
        self._load_template_choices()
        self._load_template_library()
        self._load_history()
        if hasattr(self, 'send_customer_listbox'):
            self._load_send_customers()
        if hasattr(self, 'reports_history_listbox'):
            self._load_reports_data()
            self._load_reports_stats()

    def _load_letter_types(self):
        raw = (get_setting('letter_categories', '') or '').strip()
        if raw:
            types = [x.strip() for x in raw.split('|') if x.strip()]
        else:
            types = list(DEFAULT_LETTER_TYPES)
        self._letter_types = types
        if not self.compose_type_var.get() and self._letter_types:
            self.compose_type_var.set(self._letter_types[0])

    def _save_letter_types(self):
        cleaned = []
        seen = set()
        for item in self._letter_types:
            val = str(item).strip()
            if not val:
                continue
            key = val.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(val)
        self._letter_types = cleaned or list(DEFAULT_LETTER_TYPES)
        set_setting('letter_categories', '|'.join(self._letter_types), 'Letter template categories', self.user.get('id'))

    def _refresh_type_controls(self):
        self._load_letter_types()
        if hasattr(self, 'type_combo'):
            self.type_combo.configure(values=self._letter_types)
            if self.compose_type_var.get() not in self._letter_types and self._letter_types:
                self.compose_type_var.set(self._letter_types[0])
        if hasattr(self, 'send_type_combo'):
            self.send_type_combo.configure(values=self._letter_types)
            if self.send_type_var.get() not in self._letter_types and self._letter_types:
                self.send_type_var.set(self._letter_types[0])
        if hasattr(self, 'letter_types_listbox'):
            self.letter_types_listbox.delete(0, tk.END)
            for item in self._letter_types:
                self.letter_types_listbox.insert(tk.END, item)

    def _add_letter_type(self):
        value = (self.new_type_var.get() or '').strip()
        if not value:
            messagebox.showwarning('Letter Types', 'Enter a letter type name first.')
            return
        if value.lower() in {x.lower() for x in self._letter_types}:
            messagebox.showwarning('Letter Types', 'This letter type already exists.')
            return
        self._letter_types.append(value)
        self._save_letter_types()
        self.new_type_var.set('')
        self._refresh_type_controls()

    def _delete_selected_letter_type(self):
        if not hasattr(self, 'letter_types_listbox') or not self.letter_types_listbox.curselection():
            messagebox.showwarning('Letter Types', 'Select a letter type first.')
            return
        idx = self.letter_types_listbox.curselection()[0]
        value = self._letter_types[idx]
        if value.lower() in {'overdue_notice'}:
            messagebox.showwarning('Letter Types', 'Default type overdue_notice cannot be deleted.')
            return
        if not messagebox.askyesno('Letter Types', f'Delete letter type "{value}"?'):
            return
        self._letter_types.pop(idx)
        self._save_letter_types()
        self._refresh_type_controls()

    def _insert_field_token(self, token):
        if token:
            self.editor.text.insert('insert', token)

    def _print_html_file(self, html_file_path, letter_type='letter_print'):
        """Print HTML file based on admin printer settings. If dialog is disabled, auto-print silently."""
        try:
            # Read the HTML file
            with open(html_file_path, 'r', encoding='utf-8') as f:
                html_content = f.read()

            # Check if admin panel has unchecked 'open_printer_dialog'
            open_dialog = get_setting('open_printer_dialog', 'true').lower() == 'true'

            if not open_dialog:
                # Add auto-print JavaScript to HTML
                html_content = html_content.replace(
                    '</body>',
                    '<script>window.onload=function(){window.print(); setTimeout(function(){window.close();}, 500);};</script></body>',
                    1,
                )
                # Write modified HTML back
                with open(html_file_path, 'w', encoding='utf-8') as f:
                    f.write(html_content)

            # Open in browser (will auto-print if dialog disabled)
            webbrowser.open('file://' + os.path.abspath(html_file_path))
            return True
        except Exception as e:
            messagebox.showerror('Print Error', f'Error printing: {str(e)}')
            return False

    def _load_send_templates(self):
        if not hasattr(self, 'send_template_combo'):
            return

        if not self.send_selected_customers:
            self._send_template_rows = []
            self.send_template_combo.configure(values=[])
            self.send_template_var.set('')
            return

        letter_type = self.send_type_var.get().strip() or (self._letter_types[0] if self._letter_types else 'overdue_notice')
        templates = list_letter_templates(category=letter_type)
        self._send_template_rows = templates
        choices = [f"#{tpl['id']} - {tpl['name']} [{tpl.get('language', 'English')}]" for tpl in templates]
        self.send_template_combo.configure(values=choices)

        current = self.send_template_var.get().strip()
        if choices and current not in choices:
            self.send_template_var.set(choices[0])
        elif not choices:
            self.send_template_var.set('')

    def _update_send_letter_controls_state(self):
        has_selection = bool(self.send_selected_customers)
        if hasattr(self, 'send_type_combo'):
            self.send_type_combo.configure(state='readonly' if has_selection else 'disabled')
        if hasattr(self, 'send_template_combo'):
            self.send_template_combo.configure(state='readonly' if has_selection else 'disabled')
        if hasattr(self, 'send_preview_meta_var'):
            if has_selection:
                self.send_preview_meta_var.set(f'{len(self.send_selected_customers)} customer(s) selected. Choose letter type and template, then preview or print.')
            else:
                self.send_preview_meta_var.set('Select one or more customers to unlock letter type and template selection.')
        if not has_selection and hasattr(self, 'send_preview_text_widget'):
            self.send_preview_text_widget.configure(state='normal')
            self.send_preview_text_widget.delete('1.0', tk.END)
            self.send_preview_text_widget.insert('1.0', 'Select a customer to preview letter.')
            self.send_preview_text_widget.configure(state='disabled')
        if not has_selection:
            self.send_selected_customers = []
            if hasattr(self, 'send_sent_listbox'):
                self.send_sent_listbox.delete(0, tk.END)
            if hasattr(self, 'send_not_sent_listbox'):
                self.send_not_sent_listbox.delete(0, tk.END)
            if hasattr(self, 'send_suggestions_listbox'):
                self.send_suggestions_listbox.delete(0, tk.END)

    def _browse_and_insert_editor_image(self):
        path = filedialog.askopenfilename(
            title='Select image',
            filetypes=[('Image Files', '*.png;*.gif'), ('All Files', '*.*')],
        )
        if path:
            self.editor_image_path_var.set(path)
            self.editor.insert_image(path)

    def _pick_image_path(self, target_var):
        path = filedialog.askopenfilename(
            title='Select image',
            filetypes=[('Image Files', '*.png;*.jpg;*.jpeg;*.webp;*.gif'), ('All Files', '*.*')],
        )
        if path:
            target_var.set(path)

    def _open_new_template_from_compose(self):
        self.tabs.select(self.compose_tab)
        self._new_template()

    def _save_as_template_from_compose(self):
        subject = self.subject_var.get().strip()
        body_text = self.editor.get_plain_text().strip()
        if not subject:
            messagebox.showwarning('Templates', 'Subject is required to save template.')
            return
        if not body_text:
            messagebox.showwarning('Templates', 'Body is required to save template.')
            return

        current_name = ''
        if self.selected_template_id:
            existing = get_letter_template(self.selected_template_id)
            if existing:
                current_name = existing.get('name', '')

        default_name = current_name or subject
        name = simpledialog.askstring('Save Template', 'Template name:', initialvalue=default_name)
        if not name or not name.strip():
            return

        payload = self.editor.get_serialized()
        self.selected_template_id = save_letter_template(
            name=name.strip(),
            language=self.compose_language_var.get().strip() or 'English',
            category=self.compose_type_var.get().strip() or 'overdue_notice',
            subject=subject,
            body_json=payload,
            user_id=self.user.get('id'),
            template_id=self.selected_template_id,
        )
        self.tpl_editing_id = self.selected_template_id
        messagebox.showinfo('Templates', 'Template saved successfully.')
        self._load_template_library()
        self._load_template_choices()

    def _edit_selected_template(self):
        if not self.template_listbox.curselection():
            messagebox.showwarning('Templates', 'Select a template first.')
            return
        idx = self.template_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._template_rows):
            return

        tpl = self._template_rows[idx]
        self.selected_template_id = tpl['id']
        self.tpl_editing_id = tpl['id']
        self.compose_language_var.set(tpl.get('language', 'English'))
        self.compose_type_var.set(tpl.get('category', self.compose_type_var.get() or 'overdue_notice'))
        self.subject_var.set(tpl.get('subject', ''))
        self.editor.load_serialized(tpl.get('body_json', ''))
        self.tabs.select(self.compose_tab)
        self._load_template_choices()

    def _fetch_target_loans(self, query='', language='', stage='All Overdue'):
        conn = get_connection()
        sql = '''
            SELECT l.id, l.ticket_no, l.loan_amount, l.interest_rate, l.overdue_interest_rate,
                   l.duration_months, l.issue_date, l.renew_date, l.expire_date, l.status,
                   c.id AS customer_id, c.name AS customer_name, c.nic AS customer_nic,
                   c.phone AS customer_phone, c.address AS customer_address,
                   COALESCE(NULLIF(c.language, ''), 'Sinhala') AS customer_language
            FROM loans l
            JOIN customers c ON l.customer_id = c.id
            WHERE l.status='active'
        '''
        params = []

        if stage == 'Due In Next 7 Days':
            sql += " AND date(l.expire_date) >= date('now') AND date(l.expire_date) <= date('now', '+7 day')"
        elif stage == 'Before Forfeited (60+ Days)':
            sql += " AND date(l.expire_date) < date('now', '-60 day')"
        elif stage == 'Overdue 1+ Month':
            sql += " AND date(l.expire_date) < date('now', '-30 day')"
        elif stage == 'Overdue 2+ Months':
            sql += " AND date(l.expire_date) < date('now', '-60 day')"
        elif stage == 'Overdue 3+ Months':
            sql += " AND date(l.expire_date) < date('now', '-90 day')"
        else:
            sql += " AND date(l.expire_date) < date('now')"

        if query:
            sql += " AND (l.ticket_no LIKE ? OR c.name LIKE ? OR c.nic LIKE ? OR c.phone LIKE ?)"
            q = f"%{query}%"
            params.extend([q, q, q, q])
        if language:
            sql += " AND COALESCE(NULLIF(c.language, ''), 'Sinhala') = ?"
            params.append(language)

        sql += " ORDER BY l.expire_date ASC"
        rows = conn.execute(sql, params).fetchall()
        conn.close()
        return [dict(r) for r in rows]

    def _load_overdue_list(self):
        query = self.overdue_search_var.get().strip()
        lang = self.language_filter_var.get().strip()
        stage = self.overdue_stage_var.get().strip() or 'All Overdue'
        if lang == 'All':
            lang = ''
        self._overdue_rows = self._fetch_target_loans(query=query, language=lang, stage=stage)

        self.overdue_listbox.delete(0, tk.END)
        for row in self._overdue_rows:
            loan = get_loan(row['id'])
            if not loan:
                continue
            accrual_start = loan.get('renew_date') or loan.get('issue_date')
            dur = get_duration_rate(loan.get('duration_months', 1), 22)
            max_months = dur.get('max_interest_months', 3) if dur else 3
            payable = calculate_total_payable(
                float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0),
                loan['interest_rate'],
                loan['duration_months'],
                loan['overdue_interest_rate'],
                loan['expire_date'],
                accrual_start,
                max_months,
            )
            display = (
                f"{row['ticket_no']} | {row['customer_name']} | "
                f"{payable['overdue_days']}d | {format_currency(payable['total'])}"
            )
            self.overdue_listbox.insert(tk.END, display)

    def _on_overdue_selected(self, _event=None):
        if not self.overdue_listbox.curselection():
            return
        idx = self.overdue_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._overdue_rows):
            return

        self.selected_overdue = self._overdue_rows[idx]
        lang = self.selected_overdue.get('customer_language') or 'Sinhala'
        if lang not in ('Sinhala', 'Tamil', 'English'):
            lang = 'English'
        self.compose_language_var.set(lang)
        self._load_template_choices()

        tokens = self._build_tokens(self.selected_overdue)
        if hasattr(self, 'loan_info_var'):
            self.loan_info_var.set(
                f"Customer: {tokens['customer_name']} ({tokens['customer_nic']})\n"
                f"Ticket: {tokens['ticket_no']} | Overdue: {tokens['overdue_days']} day(s)\n"
                f"Total Due: {tokens['total_due']} | Expire: {tokens['expire_date']}"
            )

    def _load_template_choices(self):
        lang = self.compose_language_var.get().strip() or 'English'
        category = (self.compose_type_var.get() or '').strip()
        templates = list_letter_templates(language=lang, category=category)
        self._template_choice_rows = templates
        choices = [f"#{t['id']} - {t['name']}" for t in templates]
        self.template_combo.configure(values=choices)
        if choices:
            self.template_choice_var.set(choices[0])
        else:
            self.template_choice_var.set('')

    def _apply_selected_template(self):
        chosen = self.template_choice_var.get().strip()
        if not chosen.startswith('#'):
            messagebox.showwarning('Letters', 'Select a template first.')
            return

        try:
            template_id = int(chosen.split(' ')[0].replace('#', '').strip())
        except Exception:
            messagebox.showwarning('Letters', 'Invalid template selection.')
            return

        tpl = get_letter_template(template_id)
        if not tpl:
            messagebox.showerror('Letters', 'Template not found.')
            return

        tokens = self._build_tokens(self.selected_overdue) if self.selected_overdue else {}
        self.selected_template_id = template_id

        self.subject_var.set(self._replace_tokens(tpl.get('subject', ''), tokens))

        body_text = self._extract_plain_text(tpl.get('body_json', ''))
        rendered = self._replace_tokens(body_text, tokens)
        self.editor.set_plain_text(rendered)
        self.current_letter_id = None

    def _build_tokens(self, row):
        loan = get_loan(row['id']) if row else None
        if not loan:
            return {key.strip('{}'): '' for key in PLACEHOLDERS}

        accrual_start = loan.get('renew_date') or loan.get('issue_date')
        dur = get_duration_rate(loan.get('duration_months', 1), 22)
        max_months = dur.get('max_interest_months', 3) if dur else 3
        payable = calculate_total_payable(
            float(loan.get('interest_principal_amount') or loan.get('loan_amount') or 0),
            loan['interest_rate'],
            loan['duration_months'],
            loan['overdue_interest_rate'],
            loan['expire_date'],
            accrual_start,
            max_months,
        )

        # Get customer details
        conn = get_connection()
        customer = None
        if loan.get('customer_id'):
            customer = conn.execute('SELECT * FROM customers WHERE id=?', (loan['customer_id'],)).fetchone()
            customer = dict(customer) if customer else None
        conn.close()

        return {
            # Customer fields
            'customer_name': loan.get('customer_name', ''),
            'customer_nic': loan.get('customer_nic', ''),
            'customer_phone': loan.get('customer_phone', ''),
            'customer_address': loan.get('customer_address', ''),
            'customer_dob': format_date(customer.get('date_of_birth', '')) if customer else '',
            'customer_job': customer.get('occupation', '') if customer else '',
            'customer_marital_status': customer.get('marital_status', '') if customer else '',
            'customer_language': customer.get('language', 'Sinhala') if customer else 'Sinhala',
            # Loan fields
            'ticket_no': loan.get('ticket_no', ''),
            'loan_amount': format_currency(loan.get('loan_amount', 0)),
            'market_value': format_currency(loan.get('market_value', 0)),
            'assessed_value': format_currency(loan.get('assessed_value', 0)),
            'assessed_percent': f"{loan.get('assessed_percentage', 0):.1f}%",
            'interest_principal': format_currency(loan.get('interest_principal_amount', 0)),
            'interest_rate': f"{loan.get('interest_rate', 0)}% / month",
            'duration': f"{loan.get('duration_months', 0)} month(s)",
            'issue_date': format_date(loan.get('issue_date', '')),
            'renew_date': format_date(loan.get('renew_date', '')),
            'expire_date': format_date(loan.get('expire_date', '')),
            'date': datetime.now().strftime('%Y-%m-%d'),
            'time': datetime.now().strftime('%H:%M'),
            'overdue_days': str(payable.get('overdue_days', 0)),
            'accrued_interest': format_currency(payable.get('interest', 0)),
            'interest_due': format_currency(payable.get('interest', 0)),
            'overdue_base': format_currency(payable.get('overdue_base_interest', 0)),
            'overdue_penalty': format_currency(payable.get('overdue_penalty', 0)),
            'overdue_interest': format_currency(payable.get('overdue_interest', 0)),
            'total_outstanding': format_currency(payable.get('total', 0)),
            'total_payable': format_currency(payable.get('total', 0)),
            'total_due': format_currency(payable.get('total', 0)),
            # Article fields
            'article_description': loan.get('article_description', ''),
            'article_weight': f"{loan.get('article_weight', 0):.3f} g",
            'article_purity': f"{loan.get('article_purity', 0):.2f}%",
            'total_weight': f"{loan.get('total_weight', 0):.3f} g",
            'deduction_weight': f"{loan.get('deduction_weight', 0):.3f} g",
            'gold_weight': f"{loan.get('gold_weight', 0):.3f} g",
        }

    def _replace_tokens(self, text, tokens):
        output = text or ''
        for key, value in tokens.items():
            output = output.replace('{{' + key + '}}', str(value))
        return output

    def _load_letter_asset_settings(self):
        self.letter_head_image_var.set(get_setting('letters_letterhead_image', '') or '')
        self.logo_image_var.set(get_setting('letters_logo_image', '') or '')
        self.letter_head_width_var.set(get_setting('letters_letterhead_width', '100') or '100')
        self.logo_width_var.set(get_setting('letters_logo_width', '22') or '22')

    def _save_letter_asset_settings(self):
        set_setting('letters_letterhead_image', self.letter_head_image_var.get().strip(), 'Letters letterhead image path', self.user.get('id'))
        set_setting('letters_logo_image', self.logo_image_var.get().strip(), 'Letters logo image path', self.user.get('id'))
        set_setting('letters_letterhead_width', self.letter_head_width_var.get().strip() or '100', 'Letters letterhead width percent', self.user.get('id'))
        set_setting('letters_logo_width', self.logo_width_var.get().strip() or '22', 'Letters logo width percent', self.user.get('id'))

    def _safe_width_percent(self, value, default_value):
        try:
            width = float(str(value).strip())
            width = min(100.0, max(5.0, width))
            return f'{width:g}'
        except Exception:
            return str(default_value)

    def _normalize_image_src(self, path_value):
        raw = (path_value or '').strip()
        if not raw:
            return ''
        lowered = raw.lower()
        if lowered.startswith('http://') or lowered.startswith('https://') or lowered.startswith('file://'):
            return raw
        abs_path = os.path.abspath(raw).replace('\\', '/')
        return f'file:///{abs_path}'

    def _extract_plain_text(self, body_json):
        if not body_json:
            return ''
        try:
            parsed = json.loads(body_json)
            return parsed.get('text', '')
        except Exception:
            return str(body_json)

    def _save_letter_with_status(self, status):
        if not self.subject_var.get().strip():
            messagebox.showwarning('Letters', 'Subject is required.')
            return

        payload = self.editor.get_serialized()
        body_text = self.editor.get_plain_text().strip()
        if not body_text:
            messagebox.showwarning('Letters', 'Letter body is required.')
            return

        tokens = self._build_tokens(self.selected_overdue) if self.selected_overdue else {}
        merged_subject = self._replace_tokens(self.subject_var.get().strip(), tokens)
        merged_body = self._replace_tokens(body_text, tokens)

        save_payload = payload
        if status in ('printed', 'sent'):
            save_payload = json.dumps({'text': merged_body, 'tags': []}, ensure_ascii=False)

        self._save_letter_asset_settings()

        self.current_letter_id = save_customer_letter(
            loan_id=self.selected_overdue.get('id') if self.selected_overdue else None,
            customer_id=self.selected_overdue.get('customer_id') if self.selected_overdue else None,
            template_id=self.selected_template_id,
            language=self.compose_language_var.get().strip() or 'English',
            subject=merged_subject,
            body_json=save_payload,
            body_text=merged_body,
            status=status,
            created_by=self.user.get('id'),
            letter_id=self.current_letter_id,
        )
        messagebox.showinfo('Letters', f'Letter saved as {status}.')
        self._load_history()

    def _save_letter_draft(self):
        self._save_letter_with_status('draft')

    def _print_current_letter(self):
        if not self.subject_var.get().strip() or not self.editor.get_plain_text().strip():
            messagebox.showwarning('Letters', 'Compose letter content before printing.')
            return

        tokens = self._build_tokens(self.selected_overdue) if self.selected_overdue else {}
        subject = self.subject_var.get().strip()
        body = self.editor.get_plain_text()
        if tokens:
            subject = self._replace_tokens(subject, tokens)
            body = self._replace_tokens(body, tokens)

        self._save_letter_asset_settings()

        html_content = self._build_letter_html(
            subject=subject,
            body=body,
            language=self.compose_language_var.get().strip() or 'English',
        )

        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        tmp.write(html_content)
        tmp.close()

        # Use printer settings from admin panel
        if self._print_html_file(tmp.name, letter_type='letter_print'):
            messagebox.showinfo('Print Success', 'Letter printed successfully.')
            self._save_letter_with_status('printed')
        else:
            messagebox.showerror('Print Failed', 'Failed to print letter.')

    def _build_letter_html(self, subject, body, language):
        company = html.escape(get_setting('company_name', 'Gold Loan Center'))
        phone = html.escape(get_setting('company_phone', ''))
        address = html.escape(get_setting('company_address', ''))
        safe_subject = html.escape(subject)
        safe_body = html.escape(body).replace('\n', '<br>')
        safe_language = html.escape(language)
        selected_size = self.letter_size_var.get().strip() or 'A4'
        page_size_css = LETTER_SIZE_PAGE_MAP.get(selected_size, 'A4')

        logo_path = (self.logo_image_var.get() or '').strip() or (get_setting('letters_logo_image', '') or '').strip()
        if not logo_path:
            default_logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'logo.png'))
            if not os.path.exists(default_logo_path):
                default_logo_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'pawn_ticket', 'pms_logo.png'))
            if os.path.exists(default_logo_path):
                logo_path = default_logo_path
        logo_src = self._normalize_image_src(logo_path)
        if logo_src:
            logo_tag = f'<img src="{html.escape(logo_src)}" alt="PMS Logo" class="brand-logo" />'
        else:
            logo_tag = '<div class="brand-logo brand-logo-fallback">PMS</div>'

        address_line = address or 'අළුත් වත්ත, නව නගරය, කොලොන්න.'
        contact_line = phone or '076 761 22 08 / 071 039 30 24'
        branch = html.escape(get_setting('branch_name', 'Kolonna'))
        ticket_no = '-'
        if self.selected_overdue and self.selected_overdue.get('id'):
            loan = get_loan(self.selected_overdue.get('id'))
            if loan:
                ticket_no = html.escape(str(loan.get('ticket_no') or '-'))
        now = datetime.now()
        print_date = now.strftime('%Y-%m-%d')
        print_time = now.strftime('%H:%M')

        return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>{safe_subject}</title>
<style>
@page {{ size: {page_size_css}; margin: 16mm; }}

* {{ box-sizing: border-box; }}
body {{ font-family: "Trebuchet MS", "Segoe UI", Tahoma, sans-serif; color: #1f2937; margin: 0; background: #fff; }}
.sheet {{ border: 1px solid #d9e1ef; border-radius: 14px; padding: 14px; background: #ffffff; }}
.row {{ display: flex; width: 100%; }}
.col {{ flex: 1; min-width: 0; }}
.border-r {{ border-right: 1px solid #c4cad6; }}
.border-b {{ border-bottom: 1px solid #c4cad6; }}
.p-2 {{ padding: 2.2mm; }}
.center {{ text-align: center; }}
.bold {{ font-weight: 700; }}
.sm {{ font-size: 11px; }}
.field-label {{ font-size: 9px; font-weight: 700; margin-bottom: 0.8mm; color: #202938; }}
.value {{ min-height: 6mm; font-size: 12px; background: #fff; }}
.brand-banner {{
    display: flex;
    align-items: center;
    gap: 2.2mm;
    padding: 1.4mm 1.8mm;
    border-radius: 9px;
    background: linear-gradient(125deg, #f5f8fc 0%, #ebeff6 55%, #f7f8fa 100%);
    border: 1px solid #d6dbe6;
}}
.brand-logo {{
    width: 23mm;
    height: 23mm;
    object-fit: contain;
    background: #fff;
    border: 1px solid #d2d7e1;
    border-radius: 6px;
    padding: 0.8mm;
}}
.brand-logo-fallback {{
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    color: #0f4ea0;
}}
.brand-copy .si {{ font-size: 12px; font-weight: 800; color: #dc1f24; line-height: 1.08; }}
.brand-copy .en {{ font-size: 12px; font-weight: 800; color: #0f4ea0; line-height: 1.08; margin-top: 0.3mm; }}
.tagline {{
    display: inline-block;
    margin-top: 0.5mm;
    border-radius: 999px;
    padding: 0.7mm 2.3mm;
    font-size: 8px;
    font-weight: 700;
    line-height: 1.15;
    white-space: nowrap;
    color: #fff;
    background: linear-gradient(90deg, #ea1e25 0%, #ff4b3a 100%);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
}}
.reg {{ font-size: 12px; color: #334155; margin-top: 0.5mm; }}
.address-lines {{ font-size: 12px; color: #334155; margin-top: 0.4mm; }}
.subject {{ font-size: 18px; font-weight: 700; color: #1d4ed8; margin: 14px 0 6px; }}
.meta {{ font-size: 12px; color: #64748b; margin-bottom: 8px; }}
.body {{ font-size: 14px; line-height: 1.65; white-space: normal; }}
.footer {{ margin-top: 20px; font-size: 12px; color: #64748b; }}
@media print {{
    body {{
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
    }}
    .sheet {{ border: none; }}
}}
</style>
</head><body>
<div class="sheet">
    <div class="head">
        <div class="page">
            <div class="ticket">
                <div class="row border-b">
        <div class="col p-2">
          <div class="brand-banner" style="margin-top: 2mm;">
                        {logo_tag}
            <div class="brand-copy">
              <div class="si">PMS රන් ණය මධ්‍යස්ථානය</div>
              <div class="en">PMS Gold Loan Center</div>
              <div class="tagline">බලයලත් උකස්කරුවෝ / Authorised Pawnbroker / அங்கீகரிக்கப்பட்ட அடகு வியாபாரி</div>
              <div class="reg" style="font-size: 12px; background: #f0f0f0; padding: 2px;">ලි.ප. අංකය / Reg. No / பதிவு எண் : ර|කො|02488</div>
                            <div class="address-lines">
                                <div>{address_line} | {contact_line}</div>
                            </div>
            </div>
          </div>
        </div>

                <div class="col p-2" style="max-width: 56mm;">
                    <div class="field-label">ශාඛාව / கிளை / Branch</div>
                    <div class="value">{branch}</div>
                    <div class="field-label" style="margin-top: 2mm;">ටිකට් අංකය / சீட்டு எண் / Ticket No.</div>
                    <div class="value">{ticket_no}</div>
                    <div class="field-label" style="margin-top: 2mm;">දිනය / தேதி / Date</div>
                    <div class="value">{print_date} {print_time}</div>
        </div>

            </div>
        </div>
  </div>

  <div class="body">{safe_body}</div>

</div>
<script>window.onload=function(){{window.print();}};</script>
</body></html>'''

    def _load_template_library(self):
        self._template_rows = list_letter_templates()
        self.template_listbox.delete(0, tk.END)
        for tpl in self._template_rows:
            self.template_listbox.insert(
                tk.END,
                f"#{tpl['id']} [{tpl['language']}] {tpl['name']}"
            )

    def _on_template_selected(self, _event=None):
        if not self.template_listbox.curselection():
            return
        idx = self.template_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._template_rows):
            return
        tpl = self._template_rows[idx]
        self.tpl_editing_id = tpl['id']
        payload = tpl.get('body_json', '')
        preview_body = self._extract_plain_text(payload)
        self.template_view_meta_var.set(
            f"Name: {tpl.get('name', '')} | Language: {tpl.get('language', 'English')} | Type: {tpl.get('category', '')}\n"
            f"Subject: {tpl.get('subject', '')}"
        )
        self.template_view_text.configure(state='normal')
        self.template_view_text.delete('1.0', tk.END)
        self.template_view_text.insert('1.0', preview_body)

        self.template_view_images = []
        try:
            parsed = json.loads(payload or '{}')
            images = sorted(parsed.get('images', []), key=lambda x: x.get('index', '1.0'))
            for item in images:
                path = item.get('path', '')
                idx = item.get('index', 'insert')
                width = item.get('width')
                if not path or not os.path.exists(path):
                    continue
                try:
                    widget = ResizableImageEmbed(self.template_view_text, path, self.theme.palette.bg_surface_alt, enable_resize=False)
                    if width:
                        widget.current_width = max(40, int(width))
                        widget._render()
                    self.template_view_images.append(widget)
                    self.template_view_text.window_create(idx, window=widget.frame)
                except Exception:
                    continue
        except Exception:
            pass

        self._auto_size_template_viewer()
        self.template_view_text.configure(state='disabled')

    def _new_template(self):
        self.tpl_editing_id = None
        self.selected_template_id = None
        self.subject_var.set('')
        self.editor.clear()
        self.tabs.select(self.compose_tab)

    def _delete_current_template(self):
        if not self.tpl_editing_id:
            messagebox.showwarning('Templates', 'Select a template first.')
            return
        if not messagebox.askyesno('Delete Template', 'Are you sure you want to delete this template?'):
            return
        delete_letter_template(self.tpl_editing_id)
        self.tpl_editing_id = None
        self.selected_template_id = None
        if hasattr(self, 'template_view_meta_var'):
            self.template_view_meta_var.set('Select a template from the library to preview.')
        if hasattr(self, 'template_view_text'):
            self.template_view_text.configure(state='normal')
            self.template_view_text.delete('1.0', tk.END)
            self.template_view_text.configure(state='disabled')
        self._load_template_library()
        self._load_template_choices()

    def _load_history(self):
        query = self.history_search_var.get().strip()
        self._history_rows = list_customer_letters(query=query)
        self.history_listbox.delete(0, tk.END)
        for row in self._history_rows:
            self.history_listbox.insert(
                tk.END,
                f"#{row['id']} [{row.get('status', 'draft').upper()}] "
                f"{row.get('ticket_no') or '-'} | {row.get('customer_name') or '-'} | {row.get('subject') or ''}"
            )

    def _open_selected_history(self):
        if not self.history_listbox.curselection():
            messagebox.showwarning('Letters', 'Select a history record first.')
            return
        idx = self.history_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._history_rows):
            return
        row = get_customer_letter(self._history_rows[idx]['id'])
        if not row:
            return

        self.current_letter_id = row['id']
        self.subject_var.set(row.get('subject', ''))
        self.compose_language_var.set(row.get('language', 'English'))
        self.editor.load_serialized(row.get('body_json', ''))

        if row.get('loan_id'):
            loan = get_loan(row['loan_id'])
            if loan:
                self.selected_overdue = {
                    'id': loan['id'],
                    'customer_id': loan['customer_id'],
                    'customer_language': loan.get('customer_language') or 'English',
                }
                tokens = self._build_tokens(self.selected_overdue)
                if hasattr(self, 'loan_info_var'):
                    self.loan_info_var.set(
                        f"Customer: {tokens['customer_name']} ({tokens['customer_nic']})\n"
                        f"Ticket: {tokens['ticket_no']} | Overdue: {tokens['overdue_days']} day(s)\n"
                        f"Total Due: {tokens['total_due']} | Expire: {tokens['expire_date']}"
                    )
                self._load_template_choices()

        messagebox.showinfo('Letters', 'Loaded selected letter into compose editor.')

    def _print_selected_history(self):
        if not self.history_listbox.curselection():
            messagebox.showwarning('Letters', 'Select a history record first.')
            return
        idx = self.history_listbox.curselection()[0]
        if idx < 0 or idx >= len(self._history_rows):
            return
        row = get_customer_letter(self._history_rows[idx]['id'])
        if not row:
            return

        tokens = {}
        if row.get('loan_id'):
            loan = get_loan(row.get('loan_id'))
            if loan:
                tokens = self._build_tokens({'id': loan['id']})

        body = self._extract_plain_text(row.get('body_json', ''))
        subject = row.get('subject', '')
        if tokens:
            subject = self._replace_tokens(subject, tokens)
            body = self._replace_tokens(body, tokens)

        html_content = self._build_letter_html(
            subject=subject,
            body=body,
            language=row.get('language', 'English'),
        )
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        tmp.write(html_content)
        tmp.close()

        # Use printer settings from admin panel
        if self._print_html_file(tmp.name, letter_type='letter_print'):
            messagebox.showinfo('Print Success', 'Letter printed successfully.')
        else:
            messagebox.showerror('Print Failed', 'Failed to print letter.')

    def _load_send_customers(self):
        query = self.send_search_var.get().strip()
        stage = self.send_stage_var.get().strip()

        if stage == 'All':
            stage = ''

        # Map stage to query conditions
        stage_condition = ''
        if stage == 'Before 7 Days Overdue':
            stage_condition = "AND date(l.expire_date) >= date('now') AND date(l.expire_date) <= date('now', '+7 day')"
        elif stage == 'Overdue':
            stage_condition = "AND date(l.expire_date) < date('now')"
        elif stage == 'After 1 Month Overdue':
            stage_condition = "AND date(l.expire_date) < date('now', '-30 day')"
        elif stage == 'After 2 Months Overdue':
            stage_condition = "AND date(l.expire_date) < date('now', '-60 day')"
        elif stage == 'After 3 Months Overdue':
            stage_condition = "AND date(l.expire_date) < date('now', '-90 day')"
        elif stage == 'Forfeited':
            stage_condition = "AND date(l.expire_date) < date('now', '-60 day')"  # Assuming forfeited after 60 days

        conn = get_connection()
        sql = f'''
            SELECT l.id, l.ticket_no, l.loan_amount, l.interest_rate, l.overdue_interest_rate,
                   l.duration_months, l.issue_date, l.renew_date, l.expire_date, l.status,
                   c.id AS customer_id, c.name AS customer_name, c.nic AS customer_nic,
                   c.phone AS customer_phone, c.address AS customer_address,
                   COALESCE(NULLIF(c.language, ''), 'Sinhala') AS customer_language
            FROM loans l
            JOIN customers c ON l.customer_id = c.id
            WHERE l.status='active' {stage_condition}
        '''
        params = []

        if query:
            sql += " AND (l.ticket_no LIKE ? OR c.name LIKE ? OR c.nic LIKE ? OR c.phone LIKE ?)"
            q = f"%{query}%"
            params.extend([q, q, q, q])

        sql += " ORDER BY l.expire_date ASC"
        rows = conn.execute(sql, params).fetchall()
        conn.close()
        self._send_customer_rows = [dict(r) for r in rows]

        self.send_customer_listbox.delete(0, tk.END)
        for row in self._send_customer_rows:
            loan = get_loan(row['id'])
            if not loan:
                continue
            display = f"{row['ticket_no']} | {row['customer_name']:<22.22} | {format_currency(loan.get('loan_amount', 0))}"
            self.send_customer_listbox.insert(tk.END, display)

        self.send_customer_listbox.configure(width=64)
        self.send_customer_listbox.selection_clear(0, tk.END)
        self.send_selected_customers = []
        self._update_send_letter_controls_state()
        self._load_send_templates()

    def _on_send_customer_selected(self, event=None):
        selected_indices = self.send_customer_listbox.curselection()
        self.send_selected_customers = [self._send_customer_rows[i] for i in selected_indices if i < len(self._send_customer_rows)]
        self._update_send_letter_controls_state()
        if self.send_selected_customers:
            self._load_send_templates()
            self._preview_send_letter()

    def _select_all_send_customers(self):
        self.send_customer_listbox.selection_set(0, tk.END)
        self._on_send_customer_selected()

    def _clear_send_selection(self):
        self.send_customer_listbox.selection_clear(0, tk.END)
        self.send_selected_customers = []
        self._update_send_letter_controls_state()

    def _preview_send_letter(self):
        if not self.send_selected_customers:
            messagebox.showwarning('Send Letters', 'Please select at least one customer.')
            return

        if self.send_type_combo.cget('state') == 'disabled' or self.send_template_combo.cget('state') == 'disabled':
            messagebox.showwarning('Send Letters', 'Select customers first to unlock letter setup.')
            return

        customer = self.send_selected_customers[0]
        letter_type = self.send_type_var.get().strip()
        chosen_template = self.send_template_var.get().strip()
        if not chosen_template:
            self.send_preview_text_widget.configure(state='normal')
            self.send_preview_text_widget.delete('1.0', tk.END)
            self.send_preview_text_widget.insert('1.0', 'Select a template for the chosen letter type.')
            self.send_preview_text_widget.configure(state='disabled')
            self._auto_adjust_preview_height()
            return

        try:
            template_id = int(chosen_template.split(' ')[0].replace('#', '').strip())
        except Exception:
            messagebox.showwarning('Send Letters', 'Invalid template selection.')
            return

        template = get_letter_template(template_id)
        if not template:
            messagebox.showwarning('Send Letters', 'Selected template not found.')
            return

        tokens = self._build_tokens(customer)
        subject = self._replace_tokens(template.get('subject', ''), tokens)
        body_text = self._extract_plain_text(template.get('body_json', ''))
        body = self._replace_tokens(body_text, tokens)

        preview_text = f"Subject: {subject}\n\n{body}"
        self.send_preview_text_widget.configure(state='normal')
        self.send_preview_text_widget.delete('1.0', tk.END)
        self.send_preview_text_widget.insert('1.0', preview_text)
        self.send_preview_text_widget.configure(state='disabled')
        self._auto_adjust_preview_height()
        self.send_preview_meta_var.set(
            f"Selected: {customer.get('ticket_no', '-')} | {customer.get('customer_name', '-')} | {letter_type} | {template.get('language', 'English')}"
        )

    def _auto_adjust_preview_height(self):
        """Auto-adjust text widget height to fit all content without scrollbars."""
        if not hasattr(self, 'send_preview_text_widget'):
            return
        
        # Get total number of lines in the text widget
        end_index = self.send_preview_text_widget.index(tk.END)
        line_count = int(end_index.split('.')[0])
        
        # Add some padding (3 extra lines for safety and visual breathing room)
        target_height = max(line_count + 3, 15)
        
        # Configure the text widget height
        self.send_preview_text_widget.configure(height=target_height)
        
        # Update the window to ensure proper layout
        self.send_preview_text_widget.update_idletasks()

    def _print_send_letters(self):
        if not self.send_selected_customers:
            messagebox.showwarning('Send Letters', 'Please select at least one customer.')
            return

        letter_type = self.send_type_var.get().strip()
        if not letter_type:
            messagebox.showwarning('Send Letters', 'Select a letter type before printing.')
            return
        chosen_template = self.send_template_var.get().strip()
        if not chosen_template:
            messagebox.showwarning('Send Letters', 'Select a template before printing.')
            return

        try:
            template_id = int(chosen_template.split(' ')[0].replace('#', '').strip())
        except Exception:
            messagebox.showwarning('Send Letters', 'Invalid template selection.')
            return

        template = get_letter_template(template_id)
        if not template:
            messagebox.showwarning('Send Letters', 'Selected template not found.')
            return

        success_count = 0
        for customer in self.send_selected_customers:
            tokens = self._build_tokens(customer)
            subject = self._replace_tokens(template.get('subject', ''), tokens)
            body_text = self._extract_plain_text(template.get('body_json', ''))
            body = self._replace_tokens(body_text, tokens)

            html_content = self._build_letter_html(
                subject=subject,
                body=body,
                language=template.get('language', 'English'),
            )
            tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
            tmp.write(html_content)
            tmp.close()

            # Use printer settings from admin panel
            if self._print_html_file(tmp.name, letter_type=letter_type):
                success_count += 1

            save_customer_letter(
                loan_id=customer.get('id'),
                customer_id=customer.get('customer_id'),
                template_id=template['id'],
                language=template.get('language', 'English'),
                subject=subject,
                body_json=json.dumps({'text': body}, ensure_ascii=False),
                body_text=body,
                status='printed',
                created_by=self.user.get('id'),
            )

        messagebox.showinfo('Print Complete', f'Successfully printed {success_count} of {len(self.send_selected_customers)} letters.')
