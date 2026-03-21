# -*- mode: python ; coding: utf-8 -*-

import os

block_cipher = None

dist_app_exe = os.path.join(os.getcwd(), 'dist', 'gold_loan_app.exe')

a = Analysis(
    ['installer.py'],
    pathex=[],
    binaries=[(dist_app_exe, '.')] if os.path.exists(dist_app_exe) else [],
    datas=[('README.md', '.')] if os.path.exists('README.md') else [],
    hiddenimports=['tkinter', 'sqlite3', 'subprocess', 'json', 'shutil'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='gold_loan_installer',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
