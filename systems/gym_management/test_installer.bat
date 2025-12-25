@echo off
title Gym Management System - Test Installer
color 0A
echo.
echo ================================================
echo    Test Gym Management System
echo    Installation Wizard
echo ================================================
echo.
echo Checking Python installation...
echo.

python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python is not installed!
    echo.
    echo Please install Python 3.8 or higher from:
    echo https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo Python found! Starting installation wizard...
echo.
cd basic
python installer.py
pause
