@echo off
cd /d "%~dp0"
echo Building Gold Loan System...
echo.

REM Install Python dependencies
pip install -r "%~dp0requirements.txt"

REM Install PyInstaller if not present
pip install pyinstaller

REM Build application executable first
python -m PyInstaller --noconfirm --clean "%~dp0app.spec"

if %errorlevel% neq 0 (
  echo.
  echo App build failed.
  exit /b 1
)

REM Build installer executable that bundles app executable
python -m PyInstaller --noconfirm --clean "%~dp0installer.spec"

if %errorlevel% neq 0 (
  echo.
  echo Installer build failed.
  exit /b 1
)

echo.
echo Build complete!
echo App: dist\gold_loan_app.exe
echo Share this with users: dist\gold_loan_installer.exe
exit /b 0
