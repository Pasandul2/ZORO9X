@echo off
echo Building Restaurant Management System...
echo.

REM Install dependencies
pip install -r requirements.txt

REM Compile with PyInstaller (with encryption)
pyinstaller --key="ZORO9X_SECURE_KEY_1766751237957" build.spec

echo.
echo Build complete! Executable is in the dist folder.
pause
