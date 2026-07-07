# Install Cryptography Package

## For Development

To enable backup encryption in the Gold Loan Management System, you need to install the `cryptography` package.

### Windows (PowerShell or CMD):

```bash
pip install cryptography
```

### If you have multiple Python versions:

```bash
python -m pip install cryptography
```

Or use the specific Python version:

```bash
py -3.13 -m pip install cryptography
```

### Verify Installation:

```bash
python -c "import cryptography; print(cryptography.__version__)"
```

You should see a version number like: `43.0.0`

## For Production (Installer)

The cryptography package is already included in `requirements.txt`. When you rebuild the installer, it will be automatically included:

```bash
cd C:\ZORO9X\systems\gold_loan_management\basic
.\BUILD.bat
```

## After Installation

1. Restart the Gold Loan Management desktop application
2. The warning "cryptography package not available" should disappear
3. Backup encryption will be automatically enabled
4. You can verify in Admin Settings → Backup & Sync → Encryption status should show "Enabled"

## Troubleshooting

**If pip is not recognized:**
```bash
python -m ensurepip --upgrade
python -m pip install --upgrade pip
python -m pip install cryptography
```

**If you get permission errors:**
```bash
pip install --user cryptography
```

**If you get SSL/TLS errors:**
```bash
pip install --trusted-host pypi.org --trusted-host files.pythonhosted.org cryptography
```

**If installation fails due to missing build tools:**

On Windows, you may need to install Microsoft C++ Build Tools:
- Download from: https://visualstudio.microsoft.com/visual-cpp-build-tools/
- Install "Desktop development with C++" workload
- Restart your computer
- Try `pip install cryptography` again

## What Encryption Provides

With cryptography installed, the system will:
- ✅ Encrypt all backups with AES-256-CBC before upload
- ✅ Use PBKDF2 key derivation from your API key
- ✅ Ensure only you can decrypt your backups
- ✅ Protect your data during transmission and storage
- ✅ Comply with security best practices

## Without Encryption

If you don't install cryptography:
- ⚠️ Backups will still work and upload to server
- ⚠️ Backups will NOT be encrypted
- ⚠️ You'll see the warning message
- ⚠️ Security is reduced

**Recommendation:** Always install cryptography for maximum security.
