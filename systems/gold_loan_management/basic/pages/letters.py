"""Letters page with template management and rich text editing."""

import html
import json
import os
import tempfile
import tkinter as tk
import webbrowser
from datetime import datetime, timedelta
from tkinter import colorchooser, messagebox, ttk

from database import (
    get_duration_rate,
    get_setting,
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
    '{{ticket_no}}', '{{loan_amount}}', '{{interest_due}}', '{{overdue_days}}',
    '{{overdue_interest}}', '{{total_due}}', '{{issue_date}}', '{{expire_date}}',
    '{{today}}', '{{followup_date}}', '{{company_name}}', '{{company_phone}}',
]


class RichTextEditor:
    def __init__(self, parent, theme, *, height=14):
        self.parent = parent
        self.theme = theme
        self.frame = tk.Frame(parent, bg=theme.palette.bg_surface)

        self.font_family_var = tk.StringVar(value='Segoe UI')
        self.font_size_var = tk.IntVar(value=11)

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
        fam_box.bind('<<ComboboxSelected>>', lambda _e: self._apply_global_font())

        size_box = ttk.Combobox(
            bar,
            textvariable=self.font_size_var,
            values=FONT_SIZES,
            state='readonly',
            width=5,
        )
        size_box.pack(side=tk.LEFT, padx=(0, 8))
        size_box.bind('<<ComboboxSelected>>', lambda _e: self._apply_global_font())

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

        self._apply_global_font()

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

    def _selection_bounds(self):
        if self.text.tag_ranges('sel'):
            return self.text.index('sel.first'), self.text.index('sel.last')
        idx = self.text.index('insert')
        return idx, f'{idx} +1c'

    def _toggle_tag(self, tag_name):
        start, end = self._selection_bounds()
        if self.text.tag_ranges('sel'):
            has_tag = bool(self.text.tag_nextrange(tag_name, start, end))
            if has_tag:
                self.text.tag_remove(tag_name, start, end)
            else:
                self.text.tag_add(tag_name, start, end)

    def toggle_bold(self):
        self._toggle_tag('rt_bold')

    def toggle_italic(self):
        self._toggle_tag('rt_italic')

    def toggle_underline(self):
        self._toggle_tag('rt_underline')

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
        start, end = self._selection_bounds()
        if self.text.tag_ranges('sel'):
            self.text.tag_add(tag, start, end)

    def insert_bullet(self):
        line_start = self.text.index('insert linestart')
        self.text.insert(line_start, '• ')

    def clear(self):
        self.text.delete('1.0', tk.END)

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
        except Exception:
            self.text.insert('1.0', payload)


class LettersPage:
    def __init__(self, container, theme, user, navigate_fn):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn

        self.selected_overdue = None
        self.selected_template_id = None
        self.current_letter_id = None

        self.overdue_search_var = tk.StringVar()
        self.language_filter_var = tk.StringVar(value='All')
        self.compose_language_var = tk.StringVar(value='English')
        self.template_choice_var = tk.StringVar()
        self.subject_var = tk.StringVar()

        self.tpl_name_var = tk.StringVar()
        self.tpl_lang_var = tk.StringVar(value='English')
        self.tpl_category_var = tk.StringVar(value='overdue_notice')
        self.tpl_subject_var = tk.StringVar()
        self.tpl_editing_id = None

        self.history_search_var = tk.StringVar()

    def render(self):
        for w in self.container.winfo_children():
            w.destroy()

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

        tabs = ttk.Notebook(view)
        tabs.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

        self.compose_tab = tk.Frame(tabs, bg=self.theme.palette.bg_app)
        self.templates_tab = tk.Frame(tabs, bg=self.theme.palette.bg_app)
        self.history_tab = tk.Frame(tabs, bg=self.theme.palette.bg_app)

        tabs.add(self.compose_tab, text='Compose Letters')
        tabs.add(self.templates_tab, text='Templates')
        tabs.add(self.history_tab, text='Letter History')

        self._render_compose_tab()
        self._render_templates_tab()
        self._render_history_tab()

        self._reload_all()

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
        split = tk.Frame(self.compose_tab, bg=self.theme.palette.bg_app)
        split.pack(fill=tk.BOTH, expand=True, pady=(8, 0))
        split.grid_columnconfigure(0, weight=2)
        split.grid_columnconfigure(1, weight=3)

        self._render_overdue_panel(split)
        self._render_editor_panel(split)

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
        card.grid(row=0, column=1, sticky='nsew', padx=(6, 0))

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

        tk.Label(top, text='Template', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.template_combo = ttk.Combobox(top, textvariable=self.template_choice_var, state='readonly', width=28)
        self.template_combo.pack(side=tk.LEFT, padx=(6, 8), fill=tk.X, expand=True)

        self.theme.make_button(top, text='Load', command=self._apply_selected_template, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(top, text='Save Draft', command=self._save_letter_draft, kind='primary', width=11, pady=5).pack(side=tk.LEFT, padx=(0, 4))
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
        for token in PLACEHOLDERS[:8]:
            self.theme.make_button(
                token_wrap,
                text=token.replace('{', '').replace('}', ''),
                command=lambda t=token: self.editor.text.insert('insert', t),
                kind='ghost',
                width=10,
                pady=3,
            ).pack(side=tk.LEFT, padx=(0, 3))

        self.editor = RichTextEditor(card.inner, self.theme, height=16)
        self.editor.frame.pack(fill=tk.BOTH, expand=True)

        action_row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        action_row.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(
            action_row,
            text='Mark As Printed',
            command=lambda: self._save_letter_with_status('printed'),
            kind='ghost',
            width=14,
            pady=6,
        ).pack(side=tk.LEFT, padx=(0, 6))
        self.theme.make_button(
            action_row,
            text='Mark As Sent',
            command=lambda: self._save_letter_with_status('sent'),
            kind='primary',
            width=12,
            pady=6,
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
        self.theme.make_button(list_btns, text='Delete', command=self._delete_current_template, kind='danger', width=8, pady=5).pack(side=tk.LEFT)

        right_card = self.theme.make_card(panel, bg=self.theme.palette.bg_surface)
        right_card.grid(row=0, column=1, sticky='nsew', padx=(6, 0))

        tk.Label(right_card.inner, text='Template Editor', font=self.theme.fonts.h3,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(anchor='w', pady=(0, 8))

        f1 = tk.Frame(right_card.inner, bg=self.theme.palette.bg_surface)
        f1.pack(fill=tk.X, pady=(0, 6))
        tk.Label(f1, text='Name:', width=9, anchor='w', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(f1, variable=self.tpl_name_var).pack(side=tk.LEFT, fill=tk.X, expand=True)

        f2 = tk.Frame(right_card.inner, bg=self.theme.palette.bg_surface)
        f2.pack(fill=tk.X, pady=(0, 6))
        tk.Label(f2, text='Language:', width=9, anchor='w', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        ttk.Combobox(f2, textvariable=self.tpl_lang_var, state='readonly', values=['Sinhala', 'Tamil', 'English'], width=10).pack(side=tk.LEFT, padx=(0, 8))
        tk.Label(f2, text='Category:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(f2, variable=self.tpl_category_var, width=16).pack(side=tk.LEFT, padx=(6, 0))

        f3 = tk.Frame(right_card.inner, bg=self.theme.palette.bg_surface)
        f3.pack(fill=tk.X, pady=(0, 8))
        tk.Label(f3, text='Subject:', width=9, anchor='w', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(f3, variable=self.tpl_subject_var).pack(side=tk.LEFT, fill=tk.X, expand=True)

        self.template_editor = RichTextEditor(right_card.inner, self.theme, height=14)
        self.template_editor.frame.pack(fill=tk.BOTH, expand=True)

        btns = tk.Frame(right_card.inner, bg=self.theme.palette.bg_surface)
        btns.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(btns, text='Save Template', command=self._save_template, kind='primary', width=14, pady=6).pack(side=tk.LEFT)

    def _render_history_tab(self):
        card = self.theme.make_card(self.history_tab, bg=self.theme.palette.bg_surface)
        card.pack(fill=tk.BOTH, expand=True, pady=(8, 0))

        row = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        row.pack(fill=tk.X, pady=(0, 8))

        tk.Label(row, text='Search Letters:', font=self.theme.fonts.body_bold,
                 bg=self.theme.palette.bg_surface, fg=self.theme.palette.text_primary).pack(side=tk.LEFT)
        self.theme.make_entry(row, variable=self.history_search_var).pack(side=tk.LEFT, fill=tk.X, expand=True, padx=(8, 0))
        self.history_search_var.trace_add('write', lambda *_a: self._load_history())

        self.history_listbox = tk.Listbox(
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
        self.history_listbox.pack(fill=tk.BOTH, expand=True)

        hbtn = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        hbtn.pack(fill=tk.X, pady=(8, 0))
        self.theme.make_button(hbtn, text='Open', command=self._open_selected_history, kind='ghost', width=8, pady=5).pack(side=tk.LEFT, padx=(0, 4))
        self.theme.make_button(hbtn, text='Print', command=self._print_selected_history, kind='secondary', width=8, pady=5).pack(side=tk.LEFT)

    def _reload_all(self):
        self._render_stats(self.stats_host)
        self._load_overdue_list()
        self._load_template_choices()
        self._load_template_library()
        self._load_history()

    def _load_overdue_list(self):
        query = self.overdue_search_var.get().strip()
        lang = self.language_filter_var.get().strip()
        if lang == 'All':
            lang = ''
        self._overdue_rows = search_overdue_loans_for_letters(query=query, language=lang)

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
        self.loan_info_var.set(
            f"Customer: {tokens['customer_name']} ({tokens['customer_nic']})\n"
            f"Ticket: {tokens['ticket_no']} | Overdue: {tokens['overdue_days']} day(s)\n"
            f"Total Due: {tokens['total_due']} | Expire: {tokens['expire_date']}"
        )

    def _load_template_choices(self):
        lang = self.compose_language_var.get().strip() or 'English'
        templates = list_letter_templates(language=lang)
        self._template_choice_rows = templates
        choices = [f"#{t['id']} - {t['name']}" for t in templates]
        self.template_combo.configure(values=choices)
        if choices:
            self.template_choice_var.set(choices[0])
        else:
            self.template_choice_var.set('')

    def _apply_selected_template(self):
        if not self.selected_overdue:
            messagebox.showwarning('Letters', 'Select an overdue customer first.')
            return
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

        tokens = self._build_tokens(self.selected_overdue)
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

        company_name = get_setting('company_name', 'Gold Loan Center')
        company_phone = get_setting('company_phone', '')

        followup = datetime.now() + timedelta(days=7)

        return {
            'customer_name': loan.get('customer_name', ''),
            'customer_nic': loan.get('customer_nic', ''),
            'customer_phone': loan.get('customer_phone', ''),
            'customer_address': loan.get('customer_address', ''),
            'ticket_no': loan.get('ticket_no', ''),
            'loan_amount': format_currency(loan.get('loan_amount', 0)),
            'interest_due': format_currency(payable.get('interest', 0)),
            'overdue_days': str(payable.get('overdue_days', 0)),
            'overdue_interest': format_currency(payable.get('overdue_interest', 0)),
            'total_due': format_currency(payable.get('total', 0)),
            'issue_date': format_date(loan.get('issue_date', '')),
            'expire_date': format_date(loan.get('expire_date', '')),
            'today': datetime.now().strftime('%Y-%m-%d'),
            'followup_date': followup.strftime('%Y-%m-%d'),
            'company_name': company_name,
            'company_phone': company_phone,
        }

    def _replace_tokens(self, text, tokens):
        output = text or ''
        for key, value in tokens.items():
            output = output.replace('{{' + key + '}}', str(value))
        return output

    def _extract_plain_text(self, body_json):
        if not body_json:
            return ''
        try:
            parsed = json.loads(body_json)
            return parsed.get('text', '')
        except Exception:
            return str(body_json)

    def _save_letter_with_status(self, status):
        if not self.selected_overdue:
            messagebox.showwarning('Letters', 'Select an overdue customer first.')
            return
        if not self.subject_var.get().strip():
            messagebox.showwarning('Letters', 'Subject is required.')
            return

        payload = self.editor.get_serialized()
        body_text = self.editor.get_plain_text().strip()
        if not body_text:
            messagebox.showwarning('Letters', 'Letter body is required.')
            return

        self.current_letter_id = save_customer_letter(
            loan_id=self.selected_overdue.get('id'),
            customer_id=self.selected_overdue.get('customer_id'),
            template_id=self.selected_template_id,
            language=self.compose_language_var.get().strip() or 'English',
            subject=self.subject_var.get().strip(),
            body_json=payload,
            body_text=body_text,
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

        html_content = self._build_letter_html(
            subject=self.subject_var.get().strip(),
            body=self.editor.get_plain_text(),
            language=self.compose_language_var.get().strip() or 'English',
        )

        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        tmp.write(html_content)
        tmp.close()
        webbrowser.open('file://' + os.path.abspath(tmp.name))

        if not self.current_letter_id:
            self._save_letter_with_status('printed')
        else:
            self._save_letter_with_status('printed')

    def _build_letter_html(self, subject, body, language):
        company = html.escape(get_setting('company_name', 'Gold Loan Center'))
        phone = html.escape(get_setting('company_phone', ''))
        address = html.escape(get_setting('company_address', ''))
        safe_subject = html.escape(subject)
        safe_body = html.escape(body).replace('\n', '<br>')
        safe_language = html.escape(language)

        return f'''<!DOCTYPE html>
<html><head><meta charset="utf-8">
<title>{safe_subject}</title>
<style>
@page {{ size: A4; margin: 16mm; }}
body {{ font-family: "Nirmala UI", "Segoe UI", Arial, sans-serif; color: #1f2937; margin: 0; }}
.sheet {{ border: 1px solid #d9e1ef; border-radius: 14px; padding: 24px; background: #ffffff; }}
.head {{ border-bottom: 2px solid #415bd8; margin-bottom: 16px; padding-bottom: 10px; }}
.company {{ font-size: 20px; font-weight: 700; color: #0f172a; }}
.meta {{ font-size: 12px; color: #64748b; margin-top: 4px; }}
.subject {{ font-size: 18px; font-weight: 700; color: #1d4ed8; margin: 14px 0 6px; }}
.body {{ font-size: 14px; line-height: 1.65; white-space: normal; }}
.footer {{ margin-top: 20px; font-size: 12px; color: #64748b; }}
@media print {{ .sheet {{ border: none; }} }}
</style>
</head><body>
<div class="sheet">
  <div class="head">
    <div class="company">{company}</div>
    <div class="meta">{address}</div>
    <div class="meta">{phone}</div>
    <div class="meta">Language: {safe_language} | Date: {datetime.now().strftime('%Y-%m-%d')}</div>
  </div>
  <div class="subject">{safe_subject}</div>
  <div class="body">{safe_body}</div>
  <div class="footer">This letter is system generated from Letters Center.</div>
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
        self.tpl_name_var.set(tpl.get('name', ''))
        self.tpl_lang_var.set(tpl.get('language', 'English'))
        self.tpl_category_var.set(tpl.get('category', 'overdue_notice'))
        self.tpl_subject_var.set(tpl.get('subject', ''))
        self.template_editor.load_serialized(tpl.get('body_json', ''))

    def _new_template(self):
        self.tpl_editing_id = None
        self.tpl_name_var.set('')
        self.tpl_lang_var.set('English')
        self.tpl_category_var.set('overdue_notice')
        self.tpl_subject_var.set('')
        self.template_editor.clear()

    def _save_template(self):
        name = self.tpl_name_var.get().strip()
        subject = self.tpl_subject_var.get().strip()
        if not name:
            messagebox.showwarning('Templates', 'Template name is required.')
            return
        if not subject:
            messagebox.showwarning('Templates', 'Template subject is required.')
            return

        payload = self.template_editor.get_serialized()
        text = self.template_editor.get_plain_text().strip()
        if not text:
            messagebox.showwarning('Templates', 'Template body is required.')
            return

        self.tpl_editing_id = save_letter_template(
            name=name,
            language=self.tpl_lang_var.get().strip() or 'English',
            category=self.tpl_category_var.get().strip() or 'overdue_notice',
            subject=subject,
            body_json=payload,
            user_id=self.user.get('id'),
            template_id=self.tpl_editing_id,
        )
        messagebox.showinfo('Templates', 'Template saved successfully.')
        self._load_template_library()
        self._load_template_choices()

    def _delete_current_template(self):
        if not self.tpl_editing_id:
            messagebox.showwarning('Templates', 'Select a template first.')
            return
        if not messagebox.askyesno('Delete Template', 'Are you sure you want to delete this template?'):
            return
        delete_letter_template(self.tpl_editing_id)
        self._new_template()
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
        body = self._extract_plain_text(row.get('body_json', ''))
        html_content = self._build_letter_html(
            subject=row.get('subject', ''),
            body=body,
            language=row.get('language', 'English'),
        )
        tmp = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False, encoding='utf-8')
        tmp.write(html_content)
        tmp.close()
        webbrowser.open('file://' + os.path.abspath(tmp.name))
