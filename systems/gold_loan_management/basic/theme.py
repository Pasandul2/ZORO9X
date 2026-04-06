"""Shared UI theme tokens and helpers for Gold Loan System."""

import tkinter as tk
import tkinter.font as tkfont
from dataclasses import dataclass
import math


@dataclass(frozen=True)
class ThemePalette:
    bg_app: str = '#eef2f7'
    bg_surface: str = '#ffffff'
    bg_surface_alt: str = '#f7f9fc'
    bg_sidebar: str = '#e9eef7'
    bg_sidebar_active: str = '#415bd8'
    bg_header: str = '#ffffff'
    border: str = '#d9e1ef'
    text_primary: str = '#1f2937'
    text_muted: str = '#64748b'
    text_inverse: str = '#ffffff'
    accent: str = '#415bd8'
    accent_hover: str = '#374fc2'
    success: str = '#14b8a6'
    warning: str = '#f97316'
    danger: str = '#ef4444'
    info: str = '#60a5fa'


@dataclass(frozen=True)
class ThemeFonts:
    family: str = 'Segoe UI'
    h1: tuple = ('Segoe UI', 20, 'bold')
    h2: tuple = ('Segoe UI', 16, 'bold')
    h3: tuple = ('Segoe UI', 13, 'bold')
    body: tuple = ('Segoe UI', 10)
    body_bold: tuple = ('Segoe UI', 10, 'bold')
    small: tuple = ('Segoe UI', 9)


class AppTheme:
    """Reusable theme object for app and installer screens."""

    def __init__(self):
        self.palette = ThemePalette()
        self.fonts = ThemeFonts()
        self.radius = 12  # Token for future custom Canvas rounded components.
        self.shadow = '#d4dce9'  # Token for layered card effects.

    def apply_window(self, root, *, min_size=(980, 640), size=(1280, 760), title='', maximize=False):
        root.configure(bg=self.palette.bg_app)
        root.geometry(f'{size[0]}x{size[1]}')
        root.minsize(min_size[0], min_size[1])
        if title:
            root.title(title)
        if maximize:
            try:
                root.state('zoomed')
            except tk.TclError:
                try:
                    root.attributes('-zoomed', True)
                except tk.TclError:
                    pass

    def make_card(self, parent, bg=None, border=None, padding=(14, 14), radius=None):
        bg_color = bg or self.palette.bg_surface
        border_color = border or self.palette.border
        card = RoundedCard(
            parent,
            bg_color=bg_color,
            border_color=border_color,
            radius=radius or self.radius,
            padding=padding,
        )
        return card

    def make_button(
        self,
        parent,
        text,
        command,
        *,
        kind='primary',
        width=14,
        pady=7,
        align='center',
    ):
        if kind == 'secondary':
            bg = '#4b5563'
            hover = '#374151'
        elif kind == 'danger':
            bg = self.palette.danger
            hover = '#dc2626'
        elif kind == 'ghost':
            bg = '#e6ebf5'
            hover = '#d9e2f2'
        else:
            bg = self.palette.accent
            hover = self.palette.accent_hover

        fg = self.palette.text_inverse if kind != 'ghost' else self.palette.text_primary

        return RoundedButton(
            parent,
            text=text,
            command=command,
            font=self.fonts.body_bold,
            bg=bg,
            fg=fg,
            hover_bg=hover,
            width=width,
            height=26 + (pady * 2),
            radius=self.radius,
            align=align,
        )

    def make_entry(self, parent, variable=None, readonly=False, masked=False, width=None, state=None):
        if state is None:
            state = 'readonly' if readonly else 'normal'
        return RoundedEntry(
            parent,
            textvariable=variable,
            readonly=(state == 'readonly' or readonly),
            masked=masked,
            state=state,
            font=self.fonts.body,
            bg=self.palette.bg_surface_alt,
            fg=self.palette.text_primary,
            border=self.palette.border,
            focus=self.palette.accent,
            radius=self.radius,
            width=width,
        )

    def make_combobox(self, parent, variable, values=(), state='readonly', width=None, command=None):
        return RoundedCombobox(
            parent,
            textvariable=variable,
            values=values,
            state=state,
            command=command,
            font=self.fonts.body,
            bg=self.palette.bg_surface_alt,
            fg=self.palette.text_primary,
            border=self.palette.border,
            focus=self.palette.accent,
            radius=self.radius,
            width=width,
        )

    def make_scrollbar(self, parent, command):
        return tk.Scrollbar(
            parent,
            orient='vertical',
            command=command,
            bg='#d9e2f2',
            activebackground='#c7d4eb',
            troughcolor='#f3f6fb',
            relief='flat',
            bd=0,
            highlightthickness=0,
        )


GOLD_THEME = AppTheme()


def _draw_rounded_rect(canvas, x1, y1, x2, y2, radius, *, fill, outline, width=1, tags='rounded'):
    radius = max(1, min(radius, int((x2 - x1) / 2), int((y2 - y1) / 2)))
    
    steps = 5
    points = []
    
    # Top-left
    cx, cy = x1 + radius, y1 + radius
    for i in range(steps + 1):
        angle = math.pi + (math.pi / 2) * (i / steps)
        points.extend([cx + radius * math.cos(angle), cy + radius * math.sin(angle)])
        
    # Top-right
    cx, cy = x2 - radius, y1 + radius
    for i in range(steps + 1):
        angle = 1.5 * math.pi + (math.pi / 2) * (i / steps)
        points.extend([cx + radius * math.cos(angle), cy + radius * math.sin(angle)])
        
    # Bottom-right
    cx, cy = x2 - radius, y2 - radius
    for i in range(steps + 1):
        angle = 0 + (math.pi / 2) * (i / steps)
        points.extend([cx + radius * math.cos(angle), cy + radius * math.sin(angle)])
        
    # Bottom-left
    cx, cy = x1 + radius, y2 - radius
    for i in range(steps + 1):
        angle = math.pi / 2 + (math.pi / 2) * (i / steps)
        points.extend([cx + radius * math.cos(angle), cy + radius * math.sin(angle)])

    return canvas.create_polygon(
        points,
        fill=fill,
        outline=outline,
        width=width,
        tags=tags,
    )


class RoundedCard(tk.Canvas):
    def __init__(self, parent, *, bg_color, border_color, radius, padding):
        super().__init__(parent, highlightthickness=0, bd=0, bg=parent['bg'])
        self._bg_color = bg_color
        self._border_color = border_color
        self._radius = radius
        self._padding = padding
        self.inner = tk.Frame(self, bg=bg_color, bd=0, highlightthickness=0)
        self._window = self.create_window(0, 0, window=self.inner, anchor='nw')
        self.bind('<Configure>', self._redraw)
        self.inner.bind('<Configure>', self._sync_height)

    def _redraw(self, event=None):
        width = max(self.winfo_width(), 2)
        height = max(self.winfo_height(), 2)
        if getattr(self, '_last_size', None) == (width, height):
            return
        self._last_size = (width, height)
        self.delete('rounded')
        _draw_rounded_rect(
            self,
            1,
            1,
            width - 1,
            height - 1,
            self._radius,
            fill=self._bg_color,
            outline=self._border_color,
            width=1,
            tags='rounded'
        )
        self.tag_lower('rounded')
        pad_x, pad_y = self._padding
        self.coords(self._window, pad_x, pad_y)
        self.itemconfig(self._window, width=max(1, width - (pad_x * 2)))

    def _sync_height(self, _event=None):
        pad_x, pad_y = self._padding
        target_height = self.inner.winfo_reqheight() + (pad_y * 2)
        if target_height > 0 and self.winfo_reqheight() != target_height:
            self.configure(height=target_height)


class RoundedButton(tk.Canvas):
    def __init__(
        self,
        parent,
        *,
        text,
        command,
        font,
        bg,
        fg,
        hover_bg,
        width,
        height,
        radius,
        align,
    ):
        self._text = text
        self._command = command
        self._font = tkfont.Font(font=font)
        self._bg = bg
        self._hover_bg = hover_bg
        self._fg = fg
        self._radius = radius
        self._align = align
        self._state = tk.NORMAL
        self._height = height
        self._width_units = width

        pixel_width = self._get_required_width()
        super().__init__(
            parent,
            width=pixel_width,
            height=height,
            highlightthickness=0,
            bd=0,
            bg=parent['bg'],
        )
        self._draw()
        self.bind('<Enter>', self._on_enter)
        self.bind('<Leave>', self._on_leave)
        self.bind('<Button-1>', self._on_click)
        self.bind('<Configure>', self._on_resize)

    def _get_required_width(self):
        by_units = self._font.measure('0') * self._width_units + 26
        by_text = self._font.measure(self._text) + 30
        return max(80, by_units, by_text)

    def _ensure_min_width(self):
        required = self._get_required_width()
        if self.winfo_reqwidth() < required:
            super().configure(width=required)

    def configure(self, **kwargs):
        if 'text' in kwargs:
            self._text = kwargs.pop('text')
        if 'command' in kwargs:
            self._command = kwargs.pop('command')
        if 'state' in kwargs:
            self._state = kwargs.pop('state')
        super().configure(**kwargs)
        self._ensure_min_width()
        self._draw()

    config = configure

    def _on_enter(self, _event):
        if self._state == tk.NORMAL:
            self._draw(hover=True)

    def _on_leave(self, _event):
        if self._state == tk.NORMAL:
            self._draw(hover=False)

    def _on_click(self, _event):
        if self._state == tk.NORMAL and callable(self._command):
            self._command()

    def _on_resize(self, _event):
        self._draw()

    def _draw(self, hover=False):
        width = max(self.winfo_width(), 2)
        height = max(self.winfo_height(), self._height)
        current_state = (width, height, hover, self._state, self._text)
        if getattr(self, '_last_render_state', None) == current_state:
            return
        self._last_render_state = current_state
        self.delete('all')
        bg = self._hover_bg if hover else self._bg
        if self._state != tk.NORMAL:
            bg = '#c7cfdd'

        _draw_rounded_rect(
            self,
            1,
            1,
            width - 1,
            height - 1,
            self._radius,
            fill=bg,
            outline=bg,
            width=1,
            tags='rounded'
        )

        text_color = self._fg if self._state == tk.NORMAL else '#6b7280'
        x = width / 2
        if self._align == 'w':
            x = 18
        self.create_text(
            x,
            height / 2,
            text=self._text,
            font=self._font,
            fill=text_color,
            anchor='w' if self._align == 'w' else 'center',
        )


class RoundedEntry(tk.Frame):
    def __init__(
        self,
        parent,
        *,
        textvariable,
        readonly,
        masked,
        state,
        font,
        bg,
        fg,
        border,
        focus,
        radius,
        width,
    ):
        super().__init__(parent, bg=parent['bg'], highlightthickness=0, bd=0)
        self._radius = radius
        self._bg = bg
        self._border = border
        self._focus = focus

        fnt = tkfont.Font(font=font)
        # Calculate requested pixel width (assuming average character width + padding)
        char_w = width if width is not None else 20
        req_width = char_w * fnt.measure('0') + 30
        
        self.canvas = tk.Canvas(self, highlightthickness=0, bd=0, bg=parent['bg'], height=36, width=req_width)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        show_char = '*' if masked else ''
        self.entry = tk.Entry(
            self,
            textvariable=textvariable,
            font=font,
            bg=bg,
            fg=fg,
            relief='flat',
            bd=0,
            insertbackground=fg,
            show=show_char,
            width=width,
        )
        if state == 'readonly' or readonly:
            self.entry.config(state='readonly', readonlybackground=bg)
        elif state == 'disabled':
            self.entry.config(state='disabled', disabledbackground=bg, disabledforeground=fg)

        self._window = self.canvas.create_window(0, 0, window=self.entry, anchor='nw')
        self.canvas.bind('<Configure>', self._redraw)
        self.entry.bind('<FocusIn>', lambda _event: self._redraw(focused=True))
        self.entry.bind('<FocusOut>', lambda _event: self._redraw(focused=False))

    def _redraw(self, event=None, focused=False):
        width = max(self.canvas.winfo_width(), 2)
        height = max(self.canvas.winfo_height(), 2)
        current_state = (width, height, focused)
        if getattr(self, '_last_render_state', None) == current_state:
            return
        self._last_render_state = current_state
        self.canvas.delete('rounded')
        border = self._focus if focused else self._border
        _draw_rounded_rect(
            self.canvas,
            1,
            1,
            width - 1,
            height - 1,
            self._radius,
            fill=self._bg,
            outline=border,
            width=1,
            tags='rounded'
        )
        self.canvas.tag_lower('rounded')
        self.canvas.coords(self._window, 12, 6)
        self.canvas.itemconfig(self._window, width=max(1, width - 24))

    def get(self):
        return self.entry.get()

    def insert(self, index, text):
        self.entry.insert(index, text)

    def delete(self, start, end=None):
        self.entry.delete(start, end)

    def config(self, **kwargs):
        self.entry.config(**kwargs)

    configure = config


class RoundedCombobox(tk.Frame):
    def __init__(
        self,
        parent,
        *,
        textvariable,
        values,
        state='readonly',
        command=None,
        font,
        bg,
        fg,
        border,
        focus,
        radius,
        width,
    ):
        super().__init__(parent, bg=parent['bg'], highlightthickness=0, bd=0)
        self.var = textvariable
        self.values = values
        self._state = state
        self.command = command
        self._radius = radius
        self._bg = bg
        self._border = border
        self._focus = focus

        fnt = tkfont.Font(font=font)
        char_w = width if width is not None else 12
        req_width = char_w * fnt.measure('0') + 40

        self.canvas = tk.Canvas(self, highlightthickness=0, bd=0, bg=parent['bg'], height=36, width=req_width)
        self.canvas.pack(fill=tk.BOTH, expand=True)

        cursor = 'hand2' if state != 'disabled' else 'arrow'
        self.lbl = tk.Label(self, textvariable=self.var, font=font, bg=bg, fg=fg, anchor='w', cursor=cursor)
        self._lbl_win = self.canvas.create_window(12, 18, window=self.lbl, anchor='w')

        self.arrow = tk.Label(self, text='▼', font=(font[0], 8), bg=bg, fg=fg, cursor=cursor)
        self._arrow_win = self.canvas.create_window(req_width - 15, 18, window=self.arrow, anchor='center')

        self.canvas.bind('<Configure>', self._redraw)
        
        for w in (self.canvas, self.lbl, self.arrow):
            w.bind('<Button-1>', self._toggle)

    def _redraw(self, event=None, focused=False):
        width = max(self.canvas.winfo_width(), 2)
        height = max(self.canvas.winfo_height(), 2)
        self.canvas.delete('rounded')
        color = self._focus if focused else self._border
        _draw_rounded_rect(self.canvas, 1, 1, width - 2, height - 2, self._radius, fill=self._bg, outline=color, width=1, tags='rounded')
        self.canvas.tag_lower('rounded')
        self.canvas.coords(self._lbl_win, 12, height // 2)
        self.canvas.coords(self._arrow_win, width - 15, height // 2)

    def _toggle(self, event):
        if self._state == 'disabled':
            return
        menu = tk.Menu(self, tearoff=0, font=self.lbl['font'], bg=self._bg, fg=self.lbl['fg'], activebackground=self._focus, activeforeground='#ffffff', bd=0, relief='flat')
        for val in self.values:
            menu.add_command(label=val, command=lambda v=val: self._select(v))
        
        x = self.winfo_rootx()
        y = self.winfo_rooty() + self.winfo_height()
        self._redraw(focused=True)
        menu.tk_popup(x, y)
        self.after(100, lambda: self._redraw(focused=False))

    def _select(self, val):
        self.var.set(val)
        self.event_generate('<<ComboboxSelected>>')
        if self.command:
            self.command(val)

    def config(self, **kwargs):
        if 'values' in kwargs:
            self.values = kwargs['values']
        if 'state' in kwargs:
            self._state = kwargs['state']
            cursor = 'hand2' if self._state != 'disabled' else 'arrow'
            self.lbl.config(cursor=cursor)
            self.arrow.config(cursor=cursor)

    configure = config
