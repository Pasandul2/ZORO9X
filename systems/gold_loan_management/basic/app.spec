# -*- mode: python ; coding: utf-8 -*-

import os

block_cipher = None

a = Analysis(
    ['gold_loan_app.py'],
    pathex=[],
    binaries=[],
    datas=(
        ([('logo.png', '.')] if os.path.exists('logo.png') else [])
        + ([('pawn_ticket/pawn_ticket_template.html', 'pawn_ticket')] if os.path.exists('pawn_ticket/pawn_ticket_template.html') else [])
        + ([('pawn_ticket/renew_pawn_ticket_template.html', 'pawn_ticket')] if os.path.exists('pawn_ticket/renew_pawn_ticket_template.html') else [])
        + ([('pawn_ticket/redeem_pawn_ticket_template.html', 'pawn_ticket')] if os.path.exists('pawn_ticket/redeem_pawn_ticket_template.html') else [])
        + ([('pawn_ticket/pms_logo.png', 'pawn_ticket')] if os.path.exists('pawn_ticket/pms_logo.png') else [])
    ),
    hiddenimports=['tkinter', 'sqlite3', 'requests', 'hashlib', 'platform', 'uuid'],
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
    name='gold_loan_app',
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
    icon='logo.png',
)
