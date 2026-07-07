"""Backup & Sync Settings Page for Gold Loan System."""

import tkinter as tk
from tkinter import messagebox, filedialog
from pathlib import Path
from datetime import datetime
import threading


class BackupSettingsPage:
    def __init__(self, container, theme, user, navigate_fn, backup_manager):
        self.container = container
        self.theme = theme
        self.user = user
        self.navigate = navigate_fn
        self.backup_manager = backup_manager
        self.sync_in_progress = False
        
    def show(self):
        """Show backup settings page"""
        for widget in self.container.winfo_children():
            widget.destroy()
        
        view = tk.Frame(self.container, bg=self.theme.palette.bg_app)
        view.pack(fill=tk.BOTH, expand=True)
        
        # Header (reduced padding to save space)
        hdr = tk.Frame(view, bg=self.theme.palette.bg_app)
        hdr.pack(fill=tk.X, pady=(5, 10), padx=20)
        
        tk.Label(
            hdr,
            text='Backup & Cloud Sync',
            font=self.theme.fonts.h1,
            bg=self.theme.palette.bg_app,
            fg=self.theme.palette.text_primary
        ).pack(side=tk.LEFT)
        
        # Back button
        self.theme.make_button(
            hdr,
            text='← Back to Admin',
            command=lambda: self.navigate('admin_settings'),
            kind='ghost',
            width=15
        ).pack(side=tk.RIGHT)
        
        # Main content with scrollbar - INCREASED HEIGHT
        main_canvas = tk.Canvas(view, bg=self.theme.palette.bg_app, highlightthickness=0, height=700)
        scrollbar = tk.Scrollbar(view, orient='vertical', command=main_canvas.yview)
        scrollable = tk.Frame(main_canvas, bg=self.theme.palette.bg_app)
        
        # Configure scrolling
        def on_configure(event):
            main_canvas.configure(scrollregion=main_canvas.bbox('all'))
        
        def on_mousewheel(event):
            # Check if canvas still exists before scrolling
            try:
                if main_canvas.winfo_exists():
                    main_canvas.yview_scroll(int(-1 * (event.delta / 120)), "units")
            except:
                pass
        
        scrollable.bind('<Configure>', on_configure)
        
        # Bind mousewheel only to the canvas frame, not globally
        main_canvas.bind("<Enter>", lambda e: main_canvas.bind_all("<MouseWheel>", on_mousewheel))
        main_canvas.bind("<Leave>", lambda e: main_canvas.unbind_all("<MouseWheel>"))
        
        main_canvas.create_window((0, 0), window=scrollable, anchor='nw', width=view.winfo_width())
        main_canvas.configure(yscrollcommand=scrollbar.set)
        
        main_canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, pady=0)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # Sync Status Card - reduced padding
        self._create_sync_status_card(scrollable)
        
        # Settings Card
        self._create_settings_card(scrollable)
        
        # Local Backups Card
        self._create_local_backups_card(scrollable)
        
        # Server Backups Card
        self._create_server_backups_card(scrollable)
        
        # Queue Status Card
        self._create_queue_card(scrollable)
        
        # Update canvas window width on resize
        def on_frame_configure(event):
            canvas_id = main_canvas.find_withtag('all')
            if canvas_id:
                main_canvas.itemconfig(canvas_id[0], width=event.width)
        
        view.bind('<Configure>', on_frame_configure)
        
        # Cleanup when leaving the page
        def cleanup():
            try:
                main_canvas.unbind_all("<MouseWheel>")
            except:
                pass
        
        view.bind('<Destroy>', lambda e: cleanup())
    
    def _create_sync_status_card(self, parent):
        """Create sync status card"""
        card = self.theme.make_card(parent)
        card.pack(fill=tk.X, padx=20, pady=(0, 10))
        
        # Title
        tk.Label(
            card.inner,
            text='Sync Status',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))
        
        # Status grid
        status_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        status_frame.pack(fill=tk.X, pady=10)
        
        # Last sync time
        last_sync = self.backup_manager.get_last_sync_time()
        if last_sync != 'Never':
            try:
                dt = datetime.fromisoformat(last_sync)
                last_sync = dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
        
        self._create_status_row(status_frame, 'Last Sync:', last_sync, 0)
        
        # Auto-sync status
        auto_sync = 'Enabled' if self.backup_manager.get_sync_setting('auto_sync_enabled', True) else 'Disabled'
        self._create_status_row(status_frame, 'Auto-Sync:', auto_sync, 1)
        
        # Encryption status
        encryption = 'Enabled' if self.backup_manager.get_sync_setting('encrypt_backups', True) else 'Disabled'
        self._create_status_row(status_frame, 'Encryption:', encryption, 2)
        
        # Action buttons
        btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        btn_frame.pack(fill=tk.X, pady=(10, 0))
        
        self.theme.make_button(
            btn_frame,
            text='Sync Now',
            command=self._sync_now,
            kind='primary',
            width=15
        ).pack(side=tk.LEFT, padx=(0, 10))
        
        self.theme.make_button(
            btn_frame,
            text='Create Backup',
            command=self._create_manual_backup,
            kind='primary',
            width=15
        ).pack(side=tk.LEFT)
    
    def _create_status_row(self, parent, label, value, row):
        """Create a status row"""
        tk.Label(
            parent,
            text=label,
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).grid(row=row, column=0, sticky='w', padx=(0, 20), pady=5)
        
        tk.Label(
            parent,
            text=value,
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).grid(row=row, column=1, sticky='w', pady=5)
    
    def _create_settings_card(self, parent):
        """Create settings card"""
        card = self.theme.make_card(parent)
        card.pack(fill=tk.X, padx=20, pady=(0, 10))
        
        # Title
        tk.Label(
            card.inner,
            text='Settings',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))
        
        # Auto-sync toggle
        auto_sync_var = tk.BooleanVar(value=self.backup_manager.get_sync_setting('auto_sync_enabled', True))
        
        auto_sync_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        auto_sync_frame.pack(fill=tk.X, pady=5)
        
        tk.Checkbutton(
            auto_sync_frame,
            text='Enable Automatic Cloud Sync',
            variable=auto_sync_var,
            command=lambda: self._toggle_auto_sync(auto_sync_var.get()),
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            selectcolor=self.theme.palette.bg_app,
            activebackground=self.theme.palette.bg_surface,
            activeforeground=self.theme.palette.text_primary
        ).pack(anchor='w')
        
        tk.Label(
            auto_sync_frame,
            text='Automatically upload backups to server after creation',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(anchor='w', padx=(25, 0))
        
        # Encryption toggle
        encrypt_var = tk.BooleanVar(value=self.backup_manager.get_sync_setting('encrypt_backups', True))
        
        encrypt_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        encrypt_frame.pack(fill=tk.X, pady=(15, 5))
        
        tk.Checkbutton(
            encrypt_frame,
            text='Enable Backup Encryption',
            variable=encrypt_var,
            command=lambda: self._toggle_encryption(encrypt_var.get()),
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary,
            selectcolor=self.theme.palette.bg_app,
            activebackground=self.theme.palette.bg_surface,
            activeforeground=self.theme.palette.text_primary
        ).pack(anchor='w')
        
        tk.Label(
            encrypt_frame,
            text='Encrypt backups before uploading to server (recommended)',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(anchor='w', padx=(25, 0))
        
        # Backup locations
        locations_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        locations_frame.pack(fill=tk.X, pady=(15, 0))
        
        tk.Label(
            locations_frame,
            text='Local Backup Locations:',
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 5))
        
        loc1, loc2 = self.backup_manager.get_backup_locations()
        
        tk.Label(
            locations_frame,
            text=f'Location 1: {loc1}',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(anchor='w', padx=(10, 0))
        
        tk.Label(
            locations_frame,
            text=f'Location 2: {loc2}',
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(anchor='w', padx=(10, 0))
    
    def _create_local_backups_card(self, parent):
        """Create local backups list card"""
        card = self.theme.make_card(parent)
        card.pack(fill=tk.X, padx=20, pady=(0, 10))
        
        # Title
        tk.Label(
            card.inner,
            text='Local Backups',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))
        
        backups = self.backup_manager.get_backups(10)
        
        if not backups:
            tk.Label(
                card.inner,
                text='No local backups found',
                font=self.theme.fonts.body,
                bg=self.theme.palette.bg_surface,
                fg=self.theme.palette.text_muted
            ).pack(pady=20)
        else:
            for backup in backups:
                self._create_backup_row(card.inner, backup, is_local=True)
    
    def _create_server_backups_card(self, parent):
        """Create server backups list card"""
        card = self.theme.make_card(parent)
        card.pack(fill=tk.X, padx=20, pady=(0, 10))
        
        # Title
        tk.Label(
            card.inner,
            text='Server Backups',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))
        
        # Refresh button
        refresh_btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        refresh_btn_frame.pack(fill=tk.X, pady=(0, 10))
        
        self.theme.make_button(
            refresh_btn_frame,
            text='Refresh',
            command=lambda: self._refresh_server_backups(card.inner),
            kind='ghost',
            width=12
        ).pack(side=tk.RIGHT)
        
        # List container
        self.server_list_container = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
        self.server_list_container.pack(fill=tk.X)
        
        self._load_server_backups(self.server_list_container)
    
    def _load_server_backups(self, container):
        """Load and display server backups"""
        for widget in container.winfo_children():
            widget.destroy()
        
        tk.Label(
            container,
            text='Loading...',
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(pady=10)
        
        def load_backups_thread():
            backups = self.backup_manager.get_server_backups()
            self.container.after(0, lambda: self._display_server_backups(container, backups))
        
        thread = threading.Thread(target=load_backups_thread, daemon=True)
        thread.start()
    
    def _display_server_backups(self, container, backups):
        """Display server backups"""
        for widget in container.winfo_children():
            widget.destroy()
        
        if not backups:
            tk.Label(
                container,
                text='No server backups found',
                font=self.theme.fonts.body,
                bg=self.theme.palette.bg_surface,
                fg=self.theme.palette.text_muted
            ).pack(pady=20)
        else:
            for backup in backups[:10]:
                self._create_backup_row(container, backup, is_local=False)
    
    def _refresh_server_backups(self, card_inner):
        """Refresh server backups list"""
        self._load_server_backups(self.server_list_container)
    
    def _create_backup_row(self, parent, backup, is_local=True):
        """Create a backup row"""
        row = tk.Frame(parent, bg=self.theme.palette.bg_surface, relief=tk.RIDGE, bd=1)
        row.pack(fill=tk.X, pady=2)
        
        info_frame = tk.Frame(row, bg=self.theme.palette.bg_surface)
        info_frame.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=10, pady=8)
        
        # Name
        name = backup.get('name', backup.get('backup_name', 'Unknown'))
        tk.Label(
            info_frame,
            text=name,
            font=self.theme.fonts.body_bold,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w')
        
        # Details
        if is_local:
            size = self.backup_manager.get_backup_size_formatted(backup.get('size', 0))
            date = backup.get('date', 'Unknown')
            details = f"{size} • {date}"
        else:
            size_bytes = backup.get('file_size', 0)
            size = self.backup_manager.get_backup_size_formatted(size_bytes)
            uploaded = backup.get('uploaded_at', '')
            try:
                dt = datetime.fromisoformat(uploaded.replace('Z', '+00:00'))
                uploaded = dt.strftime('%Y-%m-%d %H:%M:%S')
            except Exception:
                pass
            source = backup.get('source', 'unknown')
            details = f"{size} • {uploaded} • {source}"
        
        tk.Label(
            info_frame,
            text=details,
            font=self.theme.fonts.small,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        ).pack(anchor='w')
        
        # Action buttons
        btn_frame = tk.Frame(row, bg=self.theme.palette.bg_surface)
        btn_frame.pack(side=tk.RIGHT, padx=10)
        
        if is_local:
            self.theme.make_button(
                btn_frame,
                text='Restore',
                command=lambda: self._restore_backup(backup['path']),
                kind='ghost',
                width=10,
                pady=4
            ).pack()
        else:
            self.theme.make_button(
                btn_frame,
                text='Download',
                command=lambda: self._download_server_backup(backup['id']),
                kind='primary',
                width=12,
                pady=4
            ).pack()
    
    def _create_queue_card(self, parent):
        """Create upload queue status card"""
        card = self.theme.make_card(parent)
        card.pack(fill=tk.X, padx=20, pady=(0, 10))
        
        # Title
        tk.Label(
            card.inner,
            text='Upload Queue',
            font=self.theme.fonts.h3,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_primary
        ).pack(anchor='w', pady=(0, 10))
        
        queue_status = self.backup_manager.get_queue_status()
        total = queue_status.get('total', 0)
        
        status_label = tk.Label(
            card.inner,
            text=f'{total} backup(s) queued for upload',
            font=self.theme.fonts.body,
            bg=self.theme.palette.bg_surface,
            fg=self.theme.palette.text_muted
        )
        status_label.pack(pady=10)
        
        if total > 0:
            btn_frame = tk.Frame(card.inner, bg=self.theme.palette.bg_surface)
            btn_frame.pack(pady=(0, 10))
            
            self.theme.make_button(
                btn_frame,
                text='Process Queue',
                command=self._process_queue,
                kind='primary',
                width=15
            ).pack(side=tk.LEFT, padx=5)
            
            self.theme.make_button(
                btn_frame,
                text='Reset & Retry',
                command=self._reset_and_retry_queue,
                kind='secondary',
                width=15
            ).pack(side=tk.LEFT, padx=5)
            
            self.theme.make_button(
                btn_frame,
                text='Clear Old Items',
                command=self._clear_old_queue,
                kind='ghost',
                width=15
            ).pack(side=tk.LEFT, padx=5)
    
    def _toggle_auto_sync(self, enabled):
        """Toggle auto-sync setting"""
        self.backup_manager.set_sync_setting('auto_sync_enabled', enabled)
        status = 'enabled' if enabled else 'disabled'
        messagebox.showinfo('Success', f'Auto-sync {status}')
    
    def _toggle_encryption(self, enabled):
        """Toggle encryption setting"""
        self.backup_manager.set_sync_setting('encrypt_backups', enabled)
        status = 'enabled' if enabled else 'disabled'
        messagebox.showinfo('Success', f'Backup encryption {status}')
    
    def _sync_now(self):
        """Manually trigger sync"""
        if self.sync_in_progress:
            messagebox.showwarning('In Progress', 'Sync already in progress')
            return
        
        self.sync_in_progress = True
        
        def sync_thread():
            try:
                count, errors = self.backup_manager.sync_pending_uploads()
                self.container.after(0, lambda: self._sync_complete(count, errors))
            except Exception as e:
                self.container.after(0, lambda: self._sync_error(str(e)))
        
        thread = threading.Thread(target=sync_thread, daemon=True)
        thread.start()
        
        messagebox.showinfo('Syncing', 'Syncing backups to server...')
    
    def _sync_complete(self, count, errors):
        """Handle sync completion"""
        self.sync_in_progress = False
        
        if count > 0 and not errors:
            messagebox.showinfo('Success', f'Successfully synced {count} backup(s) to server!')
        elif count > 0 and errors:
            error_text = '\n'.join(errors[:5])  # Show first 5 errors
            if len(errors) > 5:
                error_text += f'\n... and {len(errors) - 5} more errors'
            messagebox.showwarning('Partial Success', 
                f'Synced {count} backup(s) successfully.\n\nErrors:\n{error_text}')
        elif errors:
            error_text = '\n'.join(errors[:5])  # Show first 5 errors
            if len(errors) > 5:
                error_text += f'\n... and {len(errors) - 5} more errors'
            messagebox.showerror('Sync Failed', 
                f'Failed to sync backups.\n\nErrors:\n{error_text}')
        else:
            messagebox.showinfo('No Backups', 'No backups in queue to sync')
        
        self.show()  # Refresh page
    
    def _sync_error(self, error):
        """Handle sync error"""
        self.sync_in_progress = False
        messagebox.showerror('Error', f'Sync failed with exception:\n{error}')
    
    def _create_manual_backup(self):
        """Create manual backup"""
        try:
            if self.backup_manager.create_backup_and_upload():
                messagebox.showinfo('Success', 'Backup created and queued for upload')
                self.show()  # Refresh page
            else:
                messagebox.showerror('Error', 'Failed to create backup')
        except Exception as e:
            messagebox.showerror('Error', f'Backup failed: {str(e)}')
    
    def _restore_backup(self, backup_path):
        """Restore from backup"""
        if not messagebox.askyesno('Confirm', 'Restore from this backup? Current data will be backed up first.'):
            return
        
        try:
            if self.backup_manager.restore_backup(backup_path):
                messagebox.showinfo('Success', 'Backup restored successfully. Please restart the application.')
            else:
                messagebox.showerror('Error', 'Failed to restore backup')
        except Exception as e:
            messagebox.showerror('Error', f'Restore failed: {str(e)}')
    
    def _download_server_backup(self, backup_id):
        """Download backup from server"""
        try:
            messagebox.showinfo('Downloading', 'Downloading backup from server...')
            
            def download_thread():
                path = self.backup_manager.download_server_backup(backup_id)
                self.container.after(0, lambda: self._download_complete(path))
            
            thread = threading.Thread(target=download_thread, daemon=True)
            thread.start()
            
        except Exception as e:
            messagebox.showerror('Error', f'Download failed: {str(e)}')
    
    def _download_complete(self, path):
        """Handle download completion"""
        if path:
            messagebox.showinfo('Success', f'Backup downloaded to:\n{path}')
            self.show()  # Refresh page
        else:
            messagebox.showerror('Error', 'Failed to download backup')
    
    def _process_queue(self):
        """Process upload queue"""
        self._sync_now()
    
    def _reset_and_retry_queue(self):
        """Reset retry counts and process queue"""
        if not messagebox.askyesno('Confirm', 'Reset retry counts for all queued backups and try uploading again?'):
            return
        
        if self.sync_in_progress:
            messagebox.showwarning('In Progress', 'Sync already in progress')
            return
        
        try:
            # Reset retry counts
            reset_count = self.backup_manager.reset_queue_retry_counts()
            
            if reset_count == 0:
                messagebox.showinfo('No Items', 'No queue items to reset')
                return
            
            messagebox.showinfo('Reset', f'Reset {reset_count} queue item(s). Starting upload...')
            
            # Start sync in background
            self.sync_in_progress = True
            
            def sync_thread():
                try:
                    count, errors = self.backup_manager.sync_pending_uploads()
                    self.container.after(0, lambda: self._sync_complete(count, errors))
                except Exception as e:
                    self.container.after(0, lambda: self._sync_error(str(e)))
            
            thread = threading.Thread(target=sync_thread, daemon=True)
            thread.start()
            
        except Exception as e:
            messagebox.showerror('Error', f'Reset failed: {str(e)}')
    
    def _clear_old_queue(self):
        """Clear old queue items"""
        try:
            cleared = self.backup_manager.clear_old_queue_items(30)
            messagebox.showinfo('Success', f'Cleared {cleared} old queue item(s)')
            self.show()  # Refresh page
        except Exception as e:
            messagebox.showerror('Error', f'Failed to clear queue: {str(e)}')
